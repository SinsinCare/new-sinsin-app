/**
 * 작성자 팔로우 토글의 **순서 중재와 실패 알림**.
 *
 * 여기서 도는 것은 화면의 배선 그 자체다 — `authorFollowMutationOptions` 를 그대로
 * 진짜 `MutationObserver` 에 얹고, 서버 응답 시각만 손으로 정한다. 배선을 테스트에서
 * 한 벌 더 적으면 원본이 바뀌어도 이 파일은 계속 초록이라(이 저장소에서 이미 네 번
 * 나온 유형), 훅이 쓰는 것과 **같은 객체**를 쓴다.
 *
 * 고정하는 사실 넷:
 *  1. 응답이 뒤바뀌어 와도 캐시는 **가장 나중에 시작한 토글**의 서버 확정값으로 끝난다.
 *  2. 내 뒤에 확정값이 떨어졌으면 실패 되돌리기를 하지 않는다(서버가 모르는 값이 된다).
 *  3. 실패는 **반드시 화면에 닿는다**(`presentCommunityError`) — 401 이 설명 없이
 *     로그인 화면으로 튕기던 자리다.
 *  4. 성공하면 팔로워 목록 캐시를 무효화한다.
 */
/* eslint-disable import/first */
/*
  서비스 계층은 모듈 로드 시 `EXPO_PUBLIC_BACKEND_URL` 을 요구하는 `apiClient` 를
  끌고 온다. 여기서 진짜 네트워크를 쓸 일은 없으므로 로드만 되게 세운다
  (`communityFeedCache.test.ts` 와 같은 처방). **서비스 자체는 진짜로 돈다** —
  `setAuthorFollowing` 의 응답 파싱까지 이 테스트 안에 있다.
*/
jest.mock("../src/services/core/apiClient", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}))

/* 실패가 화면에 닿았는지만 본다. 그 문구·그릇·계측은 `communityErrorAnalytics` 몫. */
jest.mock("../src/features/recipe/utils/communityError", () => ({
  presentCommunityError: jest.fn(),
}))

import { MutationObserver, QueryClient } from "@tanstack/react-query"

import { api } from "@/src/services/core/apiClient"
import {
  authorFollowLane,
  authorFollowMutationOptions,
  communityAuthorKey,
} from "@/src/features/recipe/hooks/useCommunityAuthor"
import { presentCommunityError } from "@/src/features/recipe/utils/communityError"
import type { CommunityAuthorProfile } from "@/src/features/recipe/types"

const AUTHOR_ID = 7

const profile = (
  overrides: Partial<CommunityAuthorProfile> = {},
): CommunityAuthorProfile => ({
  id: AUTHOR_ID,
  nickName: "신신이웃",
  profileImageUrl: null,
  postCount: 30,
  followerCount: 10,
  followingCount: 3,
  isFollowing: false,
  isMine: false,
  badges: [],
  ...overrides,
})

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

/** 서버 응답의 마개. `settle[i]` 가 i 번째 PUT 이다. */
type Settle = {
  resolve: (value: { following: boolean; followerCount: number }) => void
  reject: (reason: unknown) => void
}

function harness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(communityAuthorKey(AUTHOR_ID), profile())

  const settle: Settle[] = []
  ;(api.put as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        settle.push({
          resolve: (result) => resolve({ data: { result } }),
          reject,
        })
      }),
  )

  const observer = new MutationObserver(queryClient, {
    ...authorFollowMutationOptions(queryClient, AUTHOR_ID),
    retry: false,
  })

  const cached = () =>
    queryClient.getQueryData<CommunityAuthorProfile>(
      communityAuthorKey(AUTHOR_ID),
    )!

  return { queryClient, observer, settle, cached }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("작성자 팔로우 토글", () => {
  it("레인 이름이 글 토글과 섞이지 않는다", () => {
    // 등록부의 레인 키는 `${kind}:${id}` 다 — 두 번째 칸을 통째로 쓴다.
    expect(authorFollowLane(AUTHOR_ID)).toBe(`author-follow:${AUTHOR_ID}`)
    expect(authorFollowLane(AUTHOR_ID)).not.toBe(String(AUTHOR_ID))
  })

  it("한 번 누르면 낙관 반영 뒤 서버 절대값으로 마무리하고 팔로워 목록을 무효화한다", async () => {
    const { queryClient, observer, settle, cached } = harness()
    const invalidate = jest.spyOn(queryClient, "invalidateQueries")

    const done = observer.mutate(true).catch(() => {})
    await tick()
    // 낙관 델타 — 누른 순간 눌린 것처럼 보인다.
    expect(cached()).toMatchObject({ isFollowing: true, followerCount: 11 })

    // 서버는 다른 기기의 팔로우까지 합쳐 12 를 준다. 절대값이 이긴다.
    settle[0].resolve({ following: true, followerCount: 12 })
    await done

    expect(cached()).toMatchObject({ isFollowing: true, followerCount: 12 })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["community-follow-list"],
    })
  })

  it("응답이 뒤바뀌어 와도 마지막 토글의 확정값이 남는다", async () => {
    const { observer, settle, cached } = harness()

    // 팔로우 → 언팔로우 연타. 서버의 최종 진실은 `{false, 10}`.
    const first = observer.mutate(true).catch(() => {})
    const second = observer.mutate(false).catch(() => {})
    await tick()
    expect(settle).toHaveLength(2)

    // 응답은 2번이 먼저, 1번이 나중에 도착한다.
    settle[1].resolve({ following: false, followerCount: 10 })
    await tick()
    settle[0].resolve({ following: true, followerCount: 11 })
    await Promise.all([first, second])

    // 나중에 도착한 **옛 응답**이 새 응답을 덮지 않는다.
    expect(cached()).toMatchObject({ isFollowing: false, followerCount: 10 })
  })

  it("확정값이 지나간 뒤의 실패는 되돌리지 않는다", async () => {
    const { observer, settle, cached } = harness()

    const first = observer.mutate(true).catch(() => {})
    const second = observer.mutate(false).catch(() => {})
    await tick()

    // 나중 토글이 먼저 확정된다 — 이 시점에 1번의 델타는 캐시에서 지워졌다.
    settle[1].resolve({ following: false, followerCount: 10 })
    await tick()
    // 그 뒤 옛 요청이 실패한다. 여기서 한 번 더 빼면 서버가 모르는 9 가 된다.
    settle[0].reject(new Error("network down"))
    await Promise.all([first, second])

    expect(cached()).toMatchObject({ isFollowing: false, followerCount: 10 })
  })

  it("혼자 실패하면 정확히 원상으로 돌아온다", async () => {
    const { observer, settle, cached } = harness()

    const done = observer.mutate(true).catch(() => {})
    await tick()
    expect(cached()).toMatchObject({ isFollowing: true, followerCount: 11 })

    settle[0].reject(new Error("network down"))
    await done

    expect(cached()).toMatchObject({ isFollowing: false, followerCount: 10 })
  })

  it("실패를 화면에 알린다", async () => {
    const { observer, settle } = harness()
    const failure = new Error("network down")

    const done = observer.mutate(true).catch(() => {})
    await tick()
    settle[0].reject(failure)
    await done

    expect(presentCommunityError).toHaveBeenCalledWith(failure, {
      scope: "community-author-follow",
    })
  })
})
