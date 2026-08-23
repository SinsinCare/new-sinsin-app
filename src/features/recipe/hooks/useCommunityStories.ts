import { useMemo, useRef, useSyncExternalStore } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { presentError } from "@/src/lib/errorMessage"
import { communityStoryService } from "../services/communityStoryService"
import type {
  CommunityStory,
  CreateCommunityStoryInput,
  StorySort,
} from "../types/story"

export const STORIES_KEY = ["community-stories"] as const
const storiesKey = (sort: StorySort) => [...STORIES_KEY, sort]

/* ─────────────────────── 뷰어가 보는 순서 ───────────────────────
 *
 * 추천 정렬은 서버가 `ORDER BY random()` 으로 **매 조회 새로 섞는다**
 * (`sinsin-be-bun` community/repository). 그래서 레일과 뷰어가 같은 캐시 키를 나눠
 * 쓰는 지금, 목록이 한 번 다시 오면 **같은 자리에 다른 사람의 스토리**가 온다.
 *
 * 예전에는 레일이 **자리 번호**(`/stories?index=2`)를 넘겼다. 60초(staleTime)가 지난
 * 레일에서 세 번째 타일을 누르면 뷰어가 2번 자리에 서고, 마운트와 함께 나간 재조회가
 * 새 셔플을 들고 도착해 그 자리에는 전혀 다른 사람이 앉는다. 이제 레일은 **id** 를
 * 넘기고(`?storyId=`), 뷰어는 아래 두 가지로 그 사람 앞에 선 채로 남는다:
 *
 *  1. `resolveStoryIndex` — id 로 자리를 찾는다. 사라졌으면 맨 앞(0).
 *  2. `stableStoryOrder` — 뷰어가 **한 번 본 순서를 그대로 유지**한다. 재조회가 새
 *     셔플을 들고 와도 이미 화면에 있던 스토리는 자리를 지키고, 새로 생긴 것만 뒤에
 *     붙고, 사라진 것(만료·삭제·차단)만 빠진다.
 *
 * 레일은 이것을 쓰지 않는다 — 레일은 **매번 새로 섞여 보이는 것이 기능**이다.
 */

/**
 * 이미 보고 있던 순서(`previousIds`)를 유지한 채 새 목록을 앉힌다.
 *
 * - 전에 있던 id 는 **그 순서 그대로** 앞에 온다(목록에서 빠진 것은 자연히 제외).
 * - 처음 보는 스토리는 서버 순서대로 **뒤에** 붙는다 — 페이징 중인 손가락 앞쪽을
 *   건드리지 않는다.
 */
export function stableStoryOrder(
  previousIds: readonly string[],
  stories: readonly CommunityStory[],
): CommunityStory[] {
  const byId = new Map(stories.map((story) => [story.id, story]))
  const ordered: CommunityStory[] = []
  const placed = new Set<string>()
  for (const id of previousIds) {
    const story = byId.get(id)
    if (story === undefined || placed.has(id)) continue
    ordered.push(story)
    placed.add(id)
  }
  for (const story of stories) {
    if (placed.has(story.id)) continue
    ordered.push(story)
    placed.add(story.id)
  }
  return ordered
}

/** 뷰어가 쓰는 `stableStoryOrder` — 본 순서를 기억한다. */
export function useStableStoryOrder(
  stories: readonly CommunityStory[],
): CommunityStory[] {
  const seenOrderRef = useRef<readonly string[]>([])
  return useMemo(() => {
    const ordered = stableStoryOrder(seenOrderRef.current, stories)
    seenOrderRef.current = ordered.map((story) => story.id)
    return ordered
  }, [stories])
}

/**
 * 열려는 스토리의 **자리**. 자리 번호가 아니라 id 로 찾는다.
 *
 * 못 찾으면 0 — 그 스토리가 만료·삭제·차단으로 사라진 경우다. 목록의 맨 앞은
 * "아무거나" 가 아니라 **뷰어가 늘 여는 자리**라 사용자가 위치를 오해하지 않는다.
 */
export function resolveStoryIndex(
  stories: readonly CommunityStory[],
  storyId: string | undefined,
): number {
  if (!storyId) return 0
  const index = stories.findIndex((story) => story.id === storyId)
  return index >= 0 ? index : 0
}

/* ─────────────────────── 만료 카운트다운 ───────────────────────
 *
 * 뷰어의 "N시간 후 사라져요" 는 `Date.now()` 를 **렌더 때 한 번** 읽고 끝이었다.
 * 스토리를 40분 보고 있어도 문구는 처음 값에 멈춰 있었고, 0 이하로 내려가도
 * "곧 사라져요" 인 채 그 스토리가 화면에 남았다 — 좋아요를 누르면 서버가
 * `COMMUNITY_ERROR_012`(이미 만료) 로 거절하고 낙관 갱신이 조용히 되돌아간다.
 *
 * 그래서 시계를 하나 둔다. **구독자가 있을 때만 돈다** — 뷰어를 닫으면 멈춘다.
 */

/** 문구가 분 단위라 눈금도 분이면 충분하다. */
const STORY_TICK_MS = 60_000

const tickListeners = new Set<() => void>()
let tickTimer: ReturnType<typeof setInterval> | null = null

/** 분마다 깨우는 구독. 반환값을 부르면 구독이 끊기고, 마지막이면 타이머도 선다. */
export function subscribeToStoryTick(onTick: () => void): () => void {
  tickListeners.add(onTick)
  if (tickTimer === null) {
    tickTimer = setInterval(() => {
      for (const listener of [...tickListeners]) listener()
    }, STORY_TICK_MS)
  }
  return () => {
    tickListeners.delete(onTick)
    if (tickListeners.size === 0 && tickTimer !== null) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }
}

/** 지금이 몇 분째인가. 같은 분 안에서는 값이 같아 헛렌더가 없다. */
export function storyMinuteEpoch(): number {
  return Math.floor(Date.now() / STORY_TICK_MS)
}

/** 분마다 갱신되는 "지금"(ms). 카운트다운과 만료 판정이 **같은 값**을 본다. */
export function useStoryNow(): number {
  return (
    useSyncExternalStore(subscribeToStoryTick, storyMinuteEpoch) * STORY_TICK_MS
  )
}

/** 남은 시간(분). 음수면 이미 만료됐다. */
export function storyMinutesLeft(expiresAt: Date, now: number): number {
  return Math.floor((expiresAt.getTime() - now) / STORY_TICK_MS)
}

/**
 * 서버가 지우기 전에도 화면에서 내린다 — 만료된 스토리는 좋아요도 조회도 거절당한다.
 * 눈금이 분이라 마지막 1분은 `곧 사라져요` 로 남는다(있는 문구로 정직하게 말한다).
 */
export function isStoryExpired(story: CommunityStory, now: number): boolean {
  return storyMinutesLeft(story.expiresAt, now) < 0
}

export function useCommunityStories(sort: StorySort = "recommended") {
  const queryClient = useQueryClient()
  const queryKey = storiesKey(sort)

  /*
    `isError`·`error` 를 내보내지 않던 것이 레일과 뷰어가 **모든 실패를 "아직 스토리가
    없어요" 로 말하던** 뿌리다. 훅이 실패를 안 주면 화면은 빈 배열만 보고, 빈 배열은
    "없다" 로 읽힌다 — 비행기 모드에서 레일은 "첫 스토리를 올려 보세요" CTA 를 띄우고
    바로 아래 피드는 정직하게 오류를 그린다. 같은 화면에서 한쪽이 거짓말을 한다.
  */
  const {
    data: stories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => communityStoryService.getStories(sort),
    // 추천은 매번 새로 섞여 나오므로 오래 들고 있지 않는다.
    staleTime: 60_000,
  })

  const createStoryMutation = useMutation({
    mutationFn: (input: CreateCommunityStoryInput) =>
      communityStoryService.createStory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
    },
  })

  const deleteStoryMutation = useMutation({
    mutationFn: (storyId: string) => communityStoryService.deleteStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
    },
    /*
      삭제 실패를 아무도 받지 않고 있었다. 사용자는 확인까지 누른 뒤 스토리가 그대로
      남아 있는 것을 보고 버튼이 죽었다고 판단한다. 여기 오는 대부분은
      `COMMUNITY_ERROR_012`(올린 지 24시간이 지나 이미 만료) — "사라졌어요" 한 줄이면
      납득되는 실패인데, 그 문장이 한 번도 화면에 닿은 적이 없었다.
    */
    onError: (error) => {
      presentError(error, { scope: "community-story-delete" })
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
    },
  })

  const toggleLikeMutation = useMutation({
    mutationFn: (storyId: string) => communityStoryService.toggleLike(storyId),
    onMutate: async (storyId) => {
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData<CommunityStory[]>(queryKey)
      queryClient.setQueryData<CommunityStory[]>(queryKey, (old) =>
        (old ?? []).map((story) =>
          story.id === storyId
            ? {
                ...story,
                liked: !story.liked,
                likes: story.liked ? story.likes - 1 : story.likes + 1,
              }
            : story,
        ),
      )
      return { prev }
    },
    onError: (_err, _storyId, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev)
    },
    /*
      **하트 하나가 페이저를 다시 섞으면 안 된다.** 기본 무효화(`refetchType: "active"`)
      는 화면에 붙어 있는 목록을 즉시 다시 받는데, 추천 정렬은 서버가 매번 새로 섞어
      준다(`ORDER BY random()`) — 좋아요를 누른 사람은 손가락 아래에서 스토리가 바뀌는
      것을 본다. 확정 상태는 위 낙관 갱신이 이미 반영했으니 **낡음 표시만** 하고,
      다음 자연 재검증(레일 재진입·당김)이 마저 맞춘다. 피드 계보의
      `invalidateFeedCaches` 기본값과 같은 규칙이다.
    */
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: STORIES_KEY,
        refetchType: "none",
      })
    },
  })

  return {
    stories,
    isLoading,
    isError,
    error,
    refetch,
    createStoryAsync: createStoryMutation.mutateAsync,
    isCreating: createStoryMutation.isPending,
    deleteStory: deleteStoryMutation.mutate,
    toggleLike: toggleLikeMutation.mutate,
  }
}
