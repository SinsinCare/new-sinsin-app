/**
 * **스토리 뷰어가 연 사람 앞에 서 있는가, 그리고 남은 시간을 진짜로 세는가.**
 *
 * 감사에서 나온 두 가지를 못 박는다.
 *
 * ── R1. 자리 번호로 열면 남의 스토리가 열린다 ──────────────────────────────
 * 추천 정렬은 서버가 `ORDER BY random()` 으로 **매 조회 새로 섞는다**. 레일과 뷰어는
 * 같은 캐시 키(`["community-stories","recommended"]`, staleTime 60초)를 나눠 쓰고,
 * 뷰어는 새 옵저버로 마운트한다 — 60초가 지난 레일에서 세 번째 타일을 누르면 뷰어는
 * 2번 자리에 서고, 마운트와 함께 나간 재조회가 **다른 셔플**을 들고 도착한다.
 * 그래서 (1) 레일은 id 를 넘기고, (2) 뷰어는 `resolveStoryIndex` 로 자리를 찾고,
 * (3) `stableStoryOrder` 로 **한 번 본 순서를 유지**한다.
 *
 * ── R3. 카운트다운이 얼어 있었고 만료된 스토리가 안 사라졌다 ────────────────
 * `formatRemaining` 이 렌더 때 `Date.now()` 를 한 번 읽고 끝이라, 40분을 봐도 문구는
 * "1시간 남음" 에 멈춰 있었다. 0 이하로 내려가도 "곧 사라져요" 인 채 그 스토리가
 * 화면에 남았고, 좋아요는 `COMMUNITY_ERROR_012` 로 조용히 되돌아갔다.
 *
 * ## 어떻게 재는가
 *
 * 순수 함수와 시계는 **진짜로 돌린다**(가짜 타이머). 상태를 가진
 * `useStableStoryOrder` 는 훅 4개만 갈아 끼워 **훅 본문 자체**를 돌린다
 * (`tests/helpers/hookHarness.ts` 머리말 — 이 저장소에는 RN 렌더러가 없다).
 * 화면 파일(`app/stories.tsx` · `StoryRail.tsx`)은 그릴 방법이 없으므로
 * **주석을 걷어낸 소스**의 배선을 본다(`communityHonestStates.test.ts` 와 같은 처방).
 */
/* eslint-disable import/first */
jest.mock("../src/services/core/apiClient", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}))

// 훅 4개(useState/useRef/useCallback/useMemo)만 갈아 끼워 훅 본문을 돌린다.
jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/hookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
  }
})

import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  isStoryExpired,
  resolveStoryIndex,
  stableStoryOrder,
  storyMinuteEpoch,
  storyMinutesLeft,
  subscribeToStoryTick,
  useStableStoryOrder,
} from "@/src/features/recipe/hooks/useCommunityStories"
import type { CommunityStory } from "@/src/features/recipe/types/story"
import {
  renderHookSync,
  useState as harnessUseState,
} from "./helpers/hookHarness"

const ROOT = join(__dirname, "..")
const readRaw = (path: string) => readFileSync(join(ROOT, path), "utf-8")

/** 주석을 걷어낸다 — 머리말이 계약을 대신 만족시키지 않게. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}
const read = (path: string) => stripComments(readRaw(path))

const STORY_VIEWER = "app/stories.tsx"
const STORY_RAIL = "src/features/recipe/components/StoryRail.tsx"

const MINUTE = 60_000
const T0 = Date.UTC(2026, 7, 20, 9, 0, 0)

function story(id: string, overrides: Partial<CommunityStory> = {}) {
  return {
    id,
    authorId: Number(id.charCodeAt(0)),
    authorName: `작성자${id}`,
    imageUri: `https://example.test/${id}.jpg`,
    caption: null,
    likes: 0,
    liked: false,
    views: 0,
    isMine: false,
    createdAt: new Date(T0),
    expiresAt: new Date(T0 + 24 * 60 * MINUTE),
    ...overrides,
  } satisfies CommunityStory
}

const ids = (list: readonly CommunityStory[]) => list.map((item) => item.id)

describe("여는 자리는 id 로 찾는다 (R1)", () => {
  const list = [story("a"), story("b"), story("c")]

  it("id 가 있으면 그 자리다", () => {
    expect(resolveStoryIndex(list, "c")).toBe(2)
  })

  it("사라진 id 는 맨 앞으로 접는다 — 자리 번호를 지어내지 않는다", () => {
    expect(resolveStoryIndex(list, "zzz")).toBe(0)
  })

  it("id 를 안 받았으면 맨 앞", () => {
    expect(resolveStoryIndex(list, undefined)).toBe(0)
  })

  it("자리 번호를 그대로 쓰면 셔플 뒤에 다른 사람이 앉는다(반례)", () => {
    // 레일이 넘기던 `index=2`. 서버가 다시 섞어 주면 그 자리는 남의 것이다.
    const reshuffled = [story("c"), story("b"), story("a")]
    expect(reshuffled[2].id).not.toBe("c")
    // id 로 찾으면 셔플과 무관하게 같은 사람 앞이다.
    expect(resolveStoryIndex(reshuffled, "c")).toBe(0)
  })
})

describe("보던 순서는 손가락 아래에서 바뀌지 않는다 (R1)", () => {
  it("처음에는 서버 순서 그대로", () => {
    expect(
      ids(stableStoryOrder([], [story("a"), story("b"), story("c")])),
    ).toEqual(["a", "b", "c"])
  })

  it("새 셔플이 와도 이미 본 것은 자리를 지킨다", () => {
    const next = stableStoryOrder(
      ["a", "b", "c"],
      [story("c"), story("a"), story("b")],
    )
    expect(ids(next)).toEqual(["a", "b", "c"])
  })

  it("새로 올라온 스토리는 **뒤**에 붙는다 — 앞을 밀지 않는다", () => {
    const next = stableStoryOrder(
      ["a", "b"],
      [story("new"), story("b"), story("a")],
    )
    expect(ids(next)).toEqual(["a", "b", "new"])
  })

  it("사라진 스토리(만료·삭제·차단)는 빠진다", () => {
    const next = stableStoryOrder(["a", "b", "c"], [story("a"), story("c")])
    expect(ids(next)).toEqual(["a", "c"])
  })

  it("내용은 새것으로 갈아 끼운다 — 순서만 유지한다", () => {
    const next = stableStoryOrder(
      ["a"],
      [story("a", { likes: 7, liked: true })],
    )
    expect(next[0].likes).toBe(7)
    expect(next[0].liked).toBe(true)
  })

  it("훅이 그 순서를 기억한다 — 다시 그려도 앞이 안 밀린다", () => {
    let setStories: (next: CommunityStory[]) => void = () => {}
    const hook = renderHookSync(() => {
      const [stories, setter] = harnessUseState<CommunityStory[]>([
        story("a"),
        story("b"),
        story("c"),
      ])
      setStories = setter
      return useStableStoryOrder(stories)
    })

    expect(ids(hook.result())).toEqual(["a", "b", "c"])

    // 재조회가 새 셔플 + 새 스토리를 들고 도착했다.
    setStories([story("c"), story("new"), story("a"), story("b")])
    expect(ids(hook.result())).toEqual(["a", "b", "c", "new"])

    // 그다음 셔플도 마찬가지 — 기억이 누적된다.
    setStories([story("new"), story("b"), story("c"), story("a")])
    expect(ids(hook.result())).toEqual(["a", "b", "c", "new"])
  })
})

describe("만료 시계 (R3)", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(T0)
  })
  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("구독하면 분마다 깨우고, 다 끊으면 타이머도 선다", () => {
    const tick = jest.fn()
    const unsubscribe = subscribeToStoryTick(tick)
    expect(jest.getTimerCount()).toBe(1)

    jest.advanceTimersByTime(MINUTE)
    expect(tick).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(2 * MINUTE)
    expect(tick).toHaveBeenCalledTimes(3)

    unsubscribe()
    expect(jest.getTimerCount()).toBe(0)
    jest.advanceTimersByTime(10 * MINUTE)
    expect(tick).toHaveBeenCalledTimes(3)
  })

  it("구독자가 여럿이어도 타이머는 하나다", () => {
    const a = jest.fn()
    const b = jest.fn()
    const offA = subscribeToStoryTick(a)
    const offB = subscribeToStoryTick(b)
    expect(jest.getTimerCount()).toBe(1)

    jest.advanceTimersByTime(MINUTE)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)

    offA()
    // 한 명 남았으면 계속 돈다 — 남은 화면의 카운트다운이 멈추면 안 된다.
    expect(jest.getTimerCount()).toBe(1)
    jest.advanceTimersByTime(MINUTE)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(2)

    offB()
    expect(jest.getTimerCount()).toBe(0)
  })

  it("스냅숏은 분이 지나야 바뀐다 — 같은 분 안에서는 헛렌더가 없다", () => {
    const first = storyMinuteEpoch()
    jest.setSystemTime(T0 + 30_000)
    expect(storyMinuteEpoch()).toBe(first)
    jest.setSystemTime(T0 + MINUTE)
    expect(storyMinuteEpoch()).toBe(first + 1)
  })
})

describe("남은 시간과 만료 판정 (R3)", () => {
  it("시간이 흐르면 남은 분이 줄어든다 — 얼어 있지 않다", () => {
    const expiresAt = new Date(T0 + 60 * MINUTE)
    expect(storyMinutesLeft(expiresAt, T0)).toBe(60)
    expect(storyMinutesLeft(expiresAt, T0 + 40 * MINUTE)).toBe(20)
    expect(storyMinutesLeft(expiresAt, T0 + 59 * MINUTE)).toBe(1)
  })

  it("1분도 안 남았으면 0 — '곧 사라져요' 의 자리다", () => {
    const expiresAt = new Date(T0 + 30_000)
    expect(storyMinutesLeft(expiresAt, T0)).toBe(0)
    expect(isStoryExpired(story("a", { expiresAt }), T0)).toBe(false)
  })

  it("지나면 만료다 — 화면에서 내린다", () => {
    const expiresAt = new Date(T0 - MINUTE)
    expect(storyMinutesLeft(expiresAt, T0)).toBe(-1)
    expect(isStoryExpired(story("a", { expiresAt }), T0)).toBe(true)
  })

  it("한참 지난 것도 여전히 만료다(음수 전부)", () => {
    const expiresAt = new Date(T0 - 5 * 60 * MINUTE)
    expect(isStoryExpired(story("a", { expiresAt }), T0)).toBe(true)
  })
})

describe("레일 → 뷰어 배선 (R1)", () => {
  it("레일은 **id** 를 넘긴다", () => {
    const source = read(STORY_RAIL)
    expect(source).toContain("/stories?storyId=")
    expect(source).toContain("encodeURIComponent(story.id)")
  })

  it("자리 번호를 넘기던 옛 배선이 남아 있지 않다", () => {
    const source = read(STORY_RAIL)
    expect(source).not.toMatch(/\/stories\?index=/u)
    // 자리 번호 자체를 안 쓴다 — map 의 index 인자가 사라졌다.
    expect(source).not.toMatch(/stories\.map\(\(story,\s*index\)/u)
  })

  it("뷰어는 id 파라미터를 받아 자리를 **찾는다**", () => {
    const source = read(STORY_VIEWER)
    expect(source).toContain("storyId")
    expect(source).toContain(
      "resolveStoryIndex(visibleStories, params.storyId)",
    )
    expect(source).not.toMatch(/Number\(params\.index\)/u)
  })

  it("뷰어는 보던 순서를 유지한 목록을 그린다", () => {
    const source = read(STORY_VIEWER)
    expect(source).toContain("useStableStoryOrder(liveStories)")
    expect(source).toContain("data={visibleStories}")
    expect(source).toContain(
      "initialScrollIndex={Math.min(initialIndex, visibleStories.length - 1)}",
    )
  })
})

describe("뷰어의 카운트다운·만료·차단 배선 (R2·R3)", () => {
  const source = read(STORY_VIEWER)

  it("`지금` 을 분마다 다시 읽는다 — 렌더 때 한 번 읽던 자리", () => {
    expect(source).toContain("useStoryNow()")
    expect(source).toContain("storyMinutesLeft(expiresAt, now)")
    // 렌더 중 직접 시계를 읽으면 다시 얼어붙는다.
    expect(source).not.toMatch(/expiresAt\.getTime\(\)\s*-\s*Date\.now\(\)/u)
  })

  it("만료된 스토리는 목록에서 내린다", () => {
    expect(source).toContain("!isStoryExpired(story, now)")
  })

  /*
    이 검사는 **옛 축을 못 박고 있었다.** 원래 세 줄은
    `blockedNickNames` · `!blockedNickNames.includes(story.authorName)` 를 요구했는데,
    그건 "차단을 닉네임 라벨로 판정한다" 는 뜻이다. 라벨은 개명으로 낡고, 비어 버린
    닉네임을 가져간 제3자가 차단을 물려받는다 — 서버는 alembic 088 에서 이미 사람 id
    축으로 옮겼고(`user_block.blocked_user_id`), 앱도 옮겼다. 그대로 두면 이 검사가
    그 결함을 되돌리라고 요구하게 되므로 축을 따라 갱신한다.

    바뀌지 않은 것은 **탈퇴 면제**다(`isWithdrawnAuthor(story)`) — 그 줄은 그대로 둔다.
    판정 자체의 전후 비교는 `tests/blockedAuthorAxis.test.ts` 가 표로 잰다.
  */
  it("차단한 사람의 스토리는 피드와 **같은 규칙**으로 접는다", () => {
    expect(source).toContain("blockedAuthors")
    expect(source).toContain("isWithdrawnAuthor(story)")
    expect(source).toContain("!isAuthorBlocked(blockedAuthors, story)")
    // 라벨 축이 한 줄이라도 남으면 이 화면에서만 승계 결함이 되살아난다.
    expect(source).not.toMatch(/blockedNickNames/u)
  })

  it("빈 상태는 걸러낸 뒤의 목록으로 판정한다", () => {
    // `stories.length === 0` 으로 두면 전부 만료·차단인데도 검은 화면만 남는다.
    expect(source).toContain("visibleStories.length === 0 ?")
  })

  it("실패·로딩 갈래는 여전히 원본 목록을 본다(정직한 상태 규칙 유지)", () => {
    expect(source).toContain("isLoading && stories.length === 0")
    expect(source).toContain("isError && stories.length === 0")
  })
})
