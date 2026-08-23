/**
 * **추천 작성자(`비슷한 단계의 이웃`)의 데이터 배선** — 리디자인 E1 · D24 · D25.
 * 서비스: `communityPostService.getSuggestedAuthors`
 * 훅/변이: `hooks/useSuggestedAuthors.ts`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 어떻게 보나
 *
 * 전송 계층(`api`)만 막고 **그 위는 전부 진짜로 돈다.** 서비스의 매퍼도, 변이의 낙관
 * 델타·순번 중재도 이 파일 안에서 실제로 실행된다. 배선을 테스트에 한 벌 더 적으면
 * 원본이 바뀌어도 초록으로 남기 때문이다(`communityAuthorFollow.test.ts` 와 같은 처방).
 * 변이는 훅이 쓰는 **같은 옵션 객체**를 진짜 `MutationObserver` 에 얹는다.
 *
 * ■ 이 파일이 지키는 것 (전부 변이 테스트로 검산했다)
 *
 *  1. **빈 배열은 오류가 아니다.** 서버가 200 + `[]` 를 주면 그대로 `[]` 다(라우트 머리말) —
 *     삼켜서 오류로 만들지도, 오류를 `[]` 로 삼키지도 않는다.
 *  2. **모르는 것을 지어내지 않는다.** 오늘의 서버는 `latestPostTitle` 을 안 보낸다 →
 *     `null`. 빈 문자열·공백도 `null` 로 접는다(빈 줄은 "제목 없음"이 아니라 "못 그림"이다).
 *  3. **`signal` 이 실제로 전달된다.** 없으면 화면을 떠나도 요청이 끝까지 간다.
 *  4. **낙관 팔로우는 행을 안 옮긴다** — 순서도 길이도 그대로, 바뀌는 칸은 하나뿐.
 *  5. **응답이 뒤바뀌어 와도** 캐시는 가장 나중에 시작한 토글의 서버 확정값으로 끝난다.
 *  6. **실패는 화면에 닿고**, 내 뒤에 확정값이 떨어졌으면 되돌리지 않는다.
 *  7. **레인은 프로필 화면과 공유한다** — 두 화면에서 같은 사람을 만지는 일이 겹친다.
 *  8. **정산도 화면 경계를 넘는다** — 프로필에서 누른 팔로우/언팔로우가 이 목록의 그 행
 *     까지 찍는다(행은 그 자리에 남는다). 안 닿던 때는 뒤로 나온 사용자가 5분 동안
 *     서버와 다른 라벨을 봤다.
 */
/* eslint-disable import/first -- 전송 계층을 모듈 로드 **전에** 막아야 한다. */

/*
  서비스 모듈은 로드 순간 `EXPO_PUBLIC_BACKEND_URL` 을 요구하는 `apiClient` 를 끌고 온다.
  진짜 네트워크를 쓸 일은 없으므로 로드만 되게 세운다(`communityAuthorFollow.test.ts`).
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

/* 실패가 화면에 닿았는지만 본다. 문구·그릇·계측은 `communityErrorAnalytics` 몫. */
jest.mock("../src/features/recipe/utils/communityError", () => ({
  presentCommunityError: jest.fn(),
}))

import { MutationObserver, QueryClient } from "@tanstack/react-query"

import { api } from "@/src/services/core/apiClient"
import { communityPostService } from "@/src/features/recipe/services/communityPostService"
import {
  SUGGESTED_AUTHORS_KEY,
  SUGGESTED_AUTHORS_LIMIT,
  suggestedAuthorFollowMutationOptions,
} from "@/src/features/recipe/hooks/useSuggestedAuthors"
import {
  authorFollowMutationOptions,
  communityAuthorKey,
} from "@/src/features/recipe/hooks/useCommunityAuthor"
import { presentCommunityError } from "@/src/features/recipe/utils/communityError"
import type { CommunitySuggestedAuthor } from "@/src/features/recipe/types"

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  jest.clearAllMocks()
})

/* ══ 1 · 서비스 — `GET /community/authors/suggested` ═══════════════════════ */

describe("communityPostService.getSuggestedAuthors", () => {
  const respond = (result: unknown) => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: { result } })
  }

  it("서버 경로·기본 파라미터·취소 손잡이를 그대로 넘긴다", async () => {
    respond([])
    const controller = new AbortController()
    await communityPostService.getSuggestedAuthors({
      limit: 10,
      signal: controller.signal,
    })

    const [path, config] = (api.get as jest.Mock).mock.calls[0]
    expect(path).toBe("/community/authors/suggested")
    expect(config.params).toEqual({ limit: 10 })
    /*
      `signal` 이 없으면 `cancelQueries` 는 프라미스만 떼어 놓고 요청은 끝까지 간다 —
      느린 회선에서 사용자가 낸 데이터 요금 그대로다(`getPosts` 의 머리말).
    */
    expect(config.signal).toBe(controller.signal)
  })

  it("limit 을 안 주면 파라미터 자체를 안 보낸다 — 서버 기본값이 정본이다", async () => {
    respond([])
    await communityPostService.getSuggestedAuthors()
    expect((api.get as jest.Mock).mock.calls[0][1].params).toEqual({})
  })

  it("추천할 사람이 없으면 빈 배열이다 — 오류가 아니다(200 + [])", async () => {
    respond([])
    await expect(communityPostService.getSuggestedAuthors()).resolves.toEqual(
      [],
    )
  })

  it("`result` 도 `data` 도 없으면 빈 배열로 읽는다", async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: {} })
    await expect(communityPostService.getSuggestedAuthors()).resolves.toEqual(
      [],
    )
  })

  it("옛 봉투(`data`)도 같은 매퍼로 읽는다", async () => {
    ;(api.get as jest.Mock).mockResolvedValue({
      data: { data: [{ id: 3, nickName: "이웃" }] },
    })
    const [author] = await communityPostService.getSuggestedAuthors()
    expect(author.id).toBe(3)
    expect(author.nickName).toBe("이웃")
  })

  it("오류를 빈 배열로 삼키지 않는다 — 섹션이 '접기' 와 '실패' 를 구분해야 한다", async () => {
    ;(api.get as jest.Mock).mockRejectedValue(new Error("boom"))
    await expect(communityPostService.getSuggestedAuthors()).rejects.toThrow(
      "boom",
    )
  })

  it("서버가 안 보낸 칸을 지어내지 않는다 — 오늘의 응답 다섯 칸 그대로", async () => {
    // 서버 `SuggestedAuthorPayload` 는 id·nickName·profileImageUrl·isFollowing·badges 다.
    respond([
      {
        id: "12",
        nickName: "저염식이웃",
        profileImageUrl: "https://cdn.test/a.jpg?sig=1",
        isFollowing: true,
        badges: ["CKD 3단계", "식단 인증"],
      },
    ])
    const [author] = await communityPostService.getSuggestedAuthors()

    expect(author).toEqual<CommunitySuggestedAuthor>({
      id: 12,
      nickName: "저염식이웃",
      profileImageUrl: "https://cdn.test/a.jpg?sig=1",
      isFollowing: true,
      badges: ["CKD 3단계", "식단 인증"],
      // **오늘의 서버는 이 칸이 없다.** 여기서 무언가로 채우면 그게 조용한 폴백이다.
      latestPostTitle: null,
    })
    // 문자열 id 도 숫자로 정규화한다 — 팔로우 PUT 의 경로가 숫자를 쓴다.
    expect(typeof author.id).toBe("number")
  })

  it("빈 제목·공백 제목은 `null` 로 접는다 — 빈 줄은 '제목 없음' 이 아니다", async () => {
    respond([
      { id: 1, nickName: "가", latestPostTitle: "" },
      { id: 2, nickName: "나", latestPostTitle: "   " },
      { id: 3, nickName: "다", latestPostTitle: "  칼륨 낮춘 반찬  " },
    ])
    const authors = await communityPostService.getSuggestedAuthors()
    expect(authors.map((a) => a.latestPostTitle)).toEqual([
      null,
      null,
      "칼륨 낮춘 반찬",
    ])
  })

  it("서버가 제목을 싣기 시작하면 앱은 한 줄도 안 고치고 받는다", async () => {
    respond([
      {
        id: 9,
        nickName: "이웃",
        latestPostTitle: "오늘 저녁, 칼륨 낮춘 반찬 세 가지",
      },
    ])
    const [author] = await communityPostService.getSuggestedAuthors()
    expect(author.latestPostTitle).toBe("오늘 저녁, 칼륨 낮춘 반찬 세 가지")
  })

  it("배지가 없으면 빈 배열 · 팔로우 여부가 없으면 false 다", async () => {
    respond([{ id: 4, nickName: "이웃" }])
    const [author] = await communityPostService.getSuggestedAuthors()
    expect(author.badges).toEqual([])
    expect(author.isFollowing).toBe(false)
    expect(author.profileImageUrl).toBeNull()
  })

  it("훅이 서버 상한(20) 안의 값을 요청한다", () => {
    // 화면은 2행뿐이지만 차단·제목 게이트가 앞에서 몇을 접는다(훅 머리말).
    expect(SUGGESTED_AUTHORS_LIMIT).toBe(10)
    expect(SUGGESTED_AUTHORS_LIMIT).toBeLessThanOrEqual(20)
    expect(SUGGESTED_AUTHORS_LIMIT).toBeGreaterThan(2)
  })
})

/* ══ 2 · 팔로우 토글 — 낙관 갱신과 순번 중재 ══════════════════════════════ */

const author = (
  id: number,
  overrides: Partial<CommunitySuggestedAuthor> = {},
): CommunitySuggestedAuthor => ({
  id,
  nickName: `이웃${id}`,
  profileImageUrl: null,
  isFollowing: false,
  badges: [],
  latestPostTitle: `${id}번째 이웃의 최근 글`,
  ...overrides,
})

type Settle = {
  resolve: (value: { following: boolean; followerCount: number }) => void
  reject: (reason: unknown) => void
}

function harness(seed: CommunitySuggestedAuthor[] = [author(1), author(2)]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(SUGGESTED_AUTHORS_KEY, seed)

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

  const observer = () =>
    new MutationObserver(queryClient, {
      ...suggestedAuthorFollowMutationOptions(queryClient),
      retry: false,
    })

  const cached = () =>
    queryClient.getQueryData<CommunitySuggestedAuthor[]>(SUGGESTED_AUTHORS_KEY)!

  return { queryClient, observer, settle, cached }
}

describe("추천 행의 팔로우 토글", () => {
  const profileSeed = (
    id: number,
    isFollowing: boolean,
    followerCount: number,
  ) => ({
    id,
    nickName: `이웃${id}`,
    profileImageUrl: null,
    postCount: 3,
    followerCount,
    followingCount: 0,
    isFollowing,
    isMine: false,
    badges: [],
  })

  /** 프로필 화면의 팔로우 토글 하나. 훅이 쓰는 **같은 옵션 객체**를 얹는다. */
  const fromProfile = (queryClient: QueryClient, authorId: number) =>
    new MutationObserver(queryClient, {
      ...authorFollowMutationOptions(queryClient, authorId),
      retry: false,
    })

  it("레인이 **화면 경계를 넘는다** — 프로필의 확정값이 피드의 되돌리기를 막는다", async () => {
    /*
      `expect(authorFollowLane(7)).toBe(...)` 같은 줄은 아무것도 증명하지 않는다 —
      그 헬퍼의 값을 그 헬퍼로 확인하는 꼴이고, 배선이 다른 레인으로 갈아타도 초록이다.
      그래서 **두 배선을 겹쳐서 실제로 돌린다.** 등록부가 두 벌이면 피드의 실패가
      프로필의 확정값을 못 보고 자기 델타를 되돌려, 화면이 서버와 갈라진다.

      두 탭이 **같은 방향**인 것은 의도다. 프로필의 확정은 이제 추천 목록의 그 행까지
      찍으므로(`patchSuggestedAuthorFollow`), 방향이 반대면 피드의 되돌리기 값(`!false`)
      이 프로필의 확정값과 **우연히 같아져** 이 단언이 아무것도 가르지 못한다. 같은
      방향이면 되돌리기는 `팔로잉`, 확정은 `팔로우` 라 눈으로 갈린다. 실제로도 겹치는
      조작이다 — 행이 느리게 응답하는 동안 프로필을 열면 거기도 아직 `팔로잉` 이라
      한 번 더 누르게 된다(서버 PUT 은 멱등이다).
    */
    const { queryClient, observer, settle, cached } = harness([
      author(5, { isFollowing: true }),
    ])
    queryClient.setQueryData(communityAuthorKey(5), profileSeed(5, true, 11))

    // 1) 피드 행에서 언팔로우.
    const fromFeed = observer()
      .mutate({ authorId: 5, following: false })
      .catch(() => {})
    await tick()
    expect(cached()[0].isFollowing).toBe(false)

    // 2) 그 위에 뜬 프로필에서도 언팔로우 — **같은 사람**이다.
    const profileTap = fromProfile(queryClient, 5)
      .mutate(false)
      .catch(() => {})
    await tick()

    // 3) 프로필 쪽이 먼저 확정되고, 뒤늦게 피드 쪽 요청이 실패한다.
    settle[1].resolve({ following: false, followerCount: 10 })
    await profileTap
    settle[0].reject(new Error("late failure"))
    await fromFeed
    await tick()

    /*
      되돌리지 않는다. 레인이 하나라 피드의 실패가 "내 뒤에 확정값이 있다" 를 본다 —
      되돌렸다면 서버가 모르는 값(`팔로잉`)을 다시 써 넣는 셈이 된다.
    */
    expect(cached()[0].isFollowing).toBe(false)
    // 실패는 그래도 화면에 닿는다 — 조용히 삼키면 안 눌린 것처럼 보인다.
    expect(presentCommunityError).toHaveBeenCalledTimes(1)
  })

  it("프로필에서 누른 언팔로우가 **추천 행까지 정산한다** — 자리는 그대로", async () => {
    /*
      실제로 났던 일: 피드의 `비슷한 단계의 이웃` 행을 눌러 프로필로 들어가 언팔로우하고
      뒤로 나오면, 그 행은 여전히 `팔로잉` 이었다. `FreePostTab` 은 언마운트되지 않아서
      추천 쿼리가 다시 돌지 않고 `staleTime` 은 5분이다 — 그동안 화면이 서버와 다른
      말을 한다. 반대 방향(추천 행 → 프로필)은 원래부터 무효화로 덮여 있었다.
    */
    const { queryClient, settle, cached } = harness([
      author(1),
      author(5, { isFollowing: true }),
      author(2),
    ])
    const before = cached()
    queryClient.setQueryData(communityAuthorKey(5), profileSeed(5, true, 10))

    const done = fromProfile(queryClient, 5)
      .mutate(false)
      .catch(() => {})
    await tick()
    settle[0].resolve({ following: false, followerCount: 9 })
    await done
    await tick()

    // 핵심: 프로필에서 누른 값이 피드에 살아 있는 행에 닿았다.
    expect(cached()[1].isFollowing).toBe(false)
    /*
      그러나 **행을 옮기거나 빼지 않는다**(D25). 무효화로 목록을 다시 굴렸다면 서버는
      "아직 팔로우하지 않은 사람" 만 주므로 구성이 통째로 바뀐다 — 사용자가 방금 만진
      행이 자리를 옮기거나 사라진다.
    */
    expect(cached().map((a) => a.id)).toEqual([1, 5, 2])
    expect(cached()).toHaveLength(before.length)
    // 나머지 칸은 손대지 않는다 — 특히 이 섹션의 존재 이유인 최근 글 제목.
    expect(cached()[1].latestPostTitle).toBe(before[1].latestPostTitle)
    expect(cached()[1].nickName).toBe(before[1].nickName)
    // 남의 행은 건드리지 않는다.
    expect(cached()[0]).toEqual(before[0])
    expect(cached()[2]).toEqual(before[2])
    // 프로필 캐시는 원래대로 서버 절대값으로 마무리한다.
    expect(queryClient.getQueryData(communityAuthorKey(5))).toMatchObject({
      isFollowing: false,
      followerCount: 9,
    })
  })

  it("추천 목록에 **없는 사람**을 팔로우해도 목록의 신선도를 밀지 않는다", async () => {
    /*
      프로필 화면은 추천 후보가 아닌 사람도 팔로우한다(검색·댓글·상세에서 들어온다).
      그때마다 목록에 `setQueryData` 가 닿으면 `dataUpdatedAt` 이 **지금**으로 찍혀
      "서버와 방금 맞췄다" 는 선언이 되고, `staleTime`(5분) 창이 통째로 밀린다 —
      아무것도 안 바뀌었는데 목록만 더 묵는다(`communityFeedCache` 머리말과 같은 뿌리).
    */
    const { queryClient, settle, cached } = harness()
    const seed = cached()
    // "한참 전에 받아 온 목록" 으로 시각을 못 박는다.
    queryClient.setQueryData(SUGGESTED_AUTHORS_KEY, seed, { updatedAt: 1 })
    queryClient.setQueryData(communityAuthorKey(99), profileSeed(99, false, 4))

    const done = fromProfile(queryClient, 99)
      .mutate(true)
      .catch(() => {})
    await tick()
    settle[0].resolve({ following: true, followerCount: 5 })
    await done
    await tick()

    expect(
      queryClient.getQueryState(SUGGESTED_AUTHORS_KEY)?.dataUpdatedAt,
    ).toBe(1)
    // 배열도 그대로다 — 참조가 바뀌면 섹션이 아무 이유 없이 다시 그린다.
    expect(cached()).toBe(seed)
  })

  it("추천 목록이 아직 없으면 캐시를 **만들어 두지 않는다**", async () => {
    /*
      피드에 한 번도 안 들어간 세션에서도 프로필 팔로우는 일어난다. 여기서 없는 키에
      데이터를 써 두면, 나중에 섹션이 붙는 순간 그 유령을 서버 응답인 양 그린다.
    */
    const { queryClient, settle } = harness()
    queryClient.removeQueries({ queryKey: SUGGESTED_AUTHORS_KEY })
    queryClient.setQueryData(communityAuthorKey(7), profileSeed(7, false, 2))

    const done = fromProfile(queryClient, 7)
      .mutate(true)
      .catch(() => {})
    await tick()
    settle[0].resolve({ following: true, followerCount: 3 })
    await done
    await tick()

    expect(queryClient.getQueryData(SUGGESTED_AUTHORS_KEY)).toBeUndefined()
  })

  it("낙관 갱신이 **행을 옮기지 않는다** — 자리·순서·길이 그대로, 칸 하나만", async () => {
    const { observer, settle, cached } = harness()
    const before = cached()

    const done = observer()
      .mutate({ authorId: 2, following: true })
      .catch(() => {})
    await tick()

    const after = cached()
    // 자리(인덱스)가 그대로다 — 손가락 밑에서 재배치되면 방금 무엇을 눌렀는지 잃는다.
    expect(after.map((a) => a.id)).toEqual([1, 2])
    expect(after).toHaveLength(before.length)
    expect(after[1].isFollowing).toBe(true)
    // 나머지 칸은 손대지 않는다 — 특히 이 섹션의 존재 이유인 최근 글 제목.
    expect(after[1].latestPostTitle).toBe(before[1].latestPostTitle)
    expect(after[1].nickName).toBe(before[1].nickName)
    // 남의 행은 건드리지 않는다.
    expect(after[0]).toEqual(before[0])

    settle[0].resolve({ following: true, followerCount: 11 })
    await done
    expect(cached().map((a) => a.id)).toEqual([1, 2])
    expect(cached()[1].isFollowing).toBe(true)
  })

  it("실패하면 그 자리에서 원래 값으로 돌아오고 화면에 닿는다", async () => {
    const { observer, settle, cached } = harness()

    const done = observer()
      .mutate({ authorId: 1, following: true })
      .catch(() => {})
    await tick()
    expect(cached()[0].isFollowing).toBe(true)

    settle[0].reject(new Error("network"))
    await done
    await tick()

    expect(cached()[0].isFollowing).toBe(false)
    expect(cached().map((a) => a.id)).toEqual([1, 2])
    // 실패가 조용하면 버튼이 안 눌린 것처럼 보인다.
    expect(presentCommunityError).toHaveBeenCalledTimes(1)
  })

  it("응답이 뒤바뀌어 와도 **가장 나중에 시작한 토글**의 확정값으로 끝난다", async () => {
    const { observer, settle, cached } = harness([author(5)])

    const first = observer()
      .mutate({ authorId: 5, following: true })
      .catch(() => {})
    await tick()
    const second = observer()
      .mutate({ authorId: 5, following: false })
      .catch(() => {})
    await tick()
    expect(cached()[0].isFollowing).toBe(false)

    // B(두 번째)가 먼저 도착하고 A(첫 번째)가 뒤늦게 도착한다.
    settle[1].resolve({ following: false, followerCount: 10 })
    await second
    settle[0].resolve({ following: true, followerCount: 11 })
    await first
    await tick()

    // 서버의 최종 진실은 마지막에 보낸 값(false)이다 — 도착 순서가 아니다.
    expect(cached()[0].isFollowing).toBe(false)
  })

  it("내 뒤에 확정값이 떨어졌으면 실패 되돌리기를 하지 않는다", async () => {
    const { observer, settle, cached } = harness([author(5)])

    const first = observer()
      .mutate({ authorId: 5, following: true })
      .catch(() => {})
    await tick()
    const second = observer()
      .mutate({ authorId: 5, following: false })
      .catch(() => {})
    await tick()

    // 나중 토글이 먼저 확정된다.
    settle[1].resolve({ following: false, followerCount: 10 })
    await second
    // 그 뒤 먼저 시작한 토글이 실패한다 — 되돌리면 서버가 모르는 값이 된다.
    settle[0].reject(new Error("late failure"))
    await first
    await tick()

    expect(cached()[0].isFollowing).toBe(false)
  })

  it("성공하면 프로필·팔로워 목록에 낡음 표시를 남긴다 — 델타를 두 벌 만들지 않는다", async () => {
    const { queryClient, observer, settle } = harness()
    const invalidate = jest.spyOn(queryClient, "invalidateQueries")

    const done = observer()
      .mutate({ authorId: 2, following: true })
      .catch(() => {})
    await tick()
    settle[0].resolve({ following: true, followerCount: 4 })
    await done
    await tick()

    const keys = invalidate.mock.calls.map((call) =>
      JSON.stringify(call[0]?.queryKey),
    )
    expect(keys).toContain(JSON.stringify(["community-author", 2]))
    expect(keys).toContain(JSON.stringify(["community-follow-list"]))
  })

  it("추천 캐시가 없으면 확정 판정을 부르지 않는다 — 남의 델타를 가두지 않는다", async () => {
    const { queryClient, observer, settle } = harness()
    // 섹션이 언마운트되어 목록 캐시가 사라진 상황.
    queryClient.removeQueries({ queryKey: SUGGESTED_AUTHORS_KEY })
    const invalidate = jest.spyOn(queryClient, "invalidateQueries")

    const done = observer()
      .mutate({ authorId: 2, following: true })
      .catch(() => {})
    await tick()
    settle[0].resolve({ following: true, followerCount: 4 })
    await done
    await tick()

    expect(queryClient.getQueryData(SUGGESTED_AUTHORS_KEY)).toBeUndefined()
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("절대 상태를 보낸다 — 서버에 가는 것은 '뒤집어라' 가 아니라 '이 값이다'", async () => {
    const { observer, settle } = harness()
    const done = observer()
      .mutate({ authorId: 2, following: true })
      .catch(() => {})
    await tick()

    expect(api.put).toHaveBeenCalledWith("/community/authors/2/follow", {
      following: true,
    })
    settle[0].resolve({ following: true, followerCount: 1 })
    await done
  })
})
