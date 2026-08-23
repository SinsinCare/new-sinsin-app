/**
 * **피드가 세우는 면은 하나다**(`communityFeedSurfaces`).
 *
 * FlashList v2 는 빈 컴포넌트와 꼬리를 **형제로** 낸다 — `renderEmpty` 만
 * `data.length` 로 걸리고 `renderFooter` 에는 아무 조건도 없다(`useSecondaryProps`
 * 실측). 그래서 두 자리의 조건을 따로 쓰면 화면 가운데의 전면 오류("다시 불러오기" =
 * 1페이지부터)와 꼬리의 실패 행("다시" = 다음 페이지)이 **같이 선다.**
 *
 * 실측 경로: 차단한 사람의 글이 1페이지를 통째로 채우면 → 보이는 목록이 비고 →
 * 화면이 스스로 2페이지를 당기고(backfill) → 그것이 실패한다. 이때 전면 오류를
 * **차단 필터로 접힌 목록**으로 판정하면 "받아 둔 글이 20개인데 전면 오류" 가 된다.
 * 검색 화면은 처음부터 원본(`search.posts.length`)으로 쟀고 그래서 이 결함이 없었다.
 *
 * 아래는 상태를 하나씩 세우고 무엇이 서는지 못 박은 표이고, 마지막 것은 **입력 전
 * 조합**에서 두 면이 같이 서지 않는다는 것을 센다.
 */
import {
  communityFeedSurfaces,
  type CommunityFeedFacts,
} from "@/src/features/recipe/utils/communityFeedSurfaces"

/** 아무 일도 없는 목록(첫 장을 받아 20개를 그리고 있다). */
const facts = (over: Partial<CommunityFeedFacts> = {}): CommunityFeedFacts => ({
  showSkeleton: false,
  isError: false,
  postCount: 20,
  visibleCount: 20,
  isPlaceholderData: false,
  hasNextPage: true,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
  isTailStalled: false,
  canAutoBackfill: true,
  ...over,
})

describe("빈 목록(차단 필터가 첫 장을 통째로 접었다)", () => {
  it("예산이 남았으면 아무 것도 말하지 않는다 — 곧 스스로 한 장 더 당긴다", () => {
    expect(communityFeedSurfaces(facts({ visibleCount: 0 }))).toEqual({
      failed: false,
      empty: null,
      tail: null,
    })
  })

  it("그 다음 장이 실패하면 **꼬리만** 말한다 — 전면 오류가 같이 서지 않는다", () => {
    /*
      받아 둔 글은 20개다(전부 차단된 사람 것이라 안 보일 뿐). 여기서 전면 오류를
      세우면 "다시 불러오기"(1페이지부터)와 "다시"(다음 페이지)가 같이 서서, 서로
      다른 일을 하는 두 버튼이 같은 실패를 말한다.
    */
    expect(
      communityFeedSurfaces(
        facts({
          visibleCount: 0,
          isError: true,
          isFetchNextPageError: true,
        }),
      ),
    ).toEqual({ failed: false, empty: null, tail: "error" })
  })

  it("받아 둔 글이 정말 하나도 없으면 전면 오류 하나다 — 꼬리는 침묵한다", () => {
    // 서버가 빈 장에 커서를 달아 준 경우: 원본도 0이라 자리에 세울 목록이 없다.
    expect(
      communityFeedSurfaces(
        facts({
          postCount: 0,
          visibleCount: 0,
          isError: true,
          isFetchNextPageError: true,
        }),
      ),
    ).toEqual({ failed: true, empty: "error", tail: null })
  })

  it("자동 backfill 예산을 다 쓰면 빈 자리가 '더 보기' 를 세운다", () => {
    expect(
      communityFeedSurfaces(
        facts({ visibleCount: 0, postCount: 40, canAutoBackfill: false }),
      ),
    ).toEqual({ failed: false, empty: "loadMore", tail: null })
  })

  it("예산을 다 쓴 자리에서 다음 장이 실패하면 꼬리만 말한다 — '더 보기' 둘이 겹치지 않는다", () => {
    expect(
      communityFeedSurfaces(
        facts({
          visibleCount: 0,
          postCount: 40,
          canAutoBackfill: false,
          isError: true,
          isFetchNextPageError: true,
        }),
      ),
    ).toEqual({ failed: false, empty: null, tail: "error" })
  })

  it("더 받을 것이 없으면 그제서야 '아직 글이 없어요'", () => {
    expect(
      communityFeedSurfaces(
        facts({ postCount: 0, visibleCount: 0, hasNextPage: false }),
      ),
    ).toEqual({ failed: false, empty: "empty", tail: null })
  })
})

describe("목록이 있는 채로 꼬리에서 벌어지는 일", () => {
  it("다음 장이 오는 중이면 꼬리는 로더다", () => {
    expect(communityFeedSurfaces(facts({ isFetchingNextPage: true }))).toEqual({
      failed: false,
      empty: null,
      tail: "loading",
    })
  })

  it("다음 장이 실패하면 꼬리에 실패 행 — 멀쩡한 목록을 전면 오류로 지우지 않는다", () => {
    expect(
      communityFeedSurfaces(
        facts({ isError: true, isFetchNextPageError: true }),
      ),
    ).toEqual({ failed: false, empty: null, tail: "error" })
  })

  it("취소로 아무 것도 못 받고 끝났으면 꼬리에 '더 보기'", () => {
    expect(communityFeedSurfaces(facts({ isTailStalled: true }))).toEqual({
      failed: false,
      empty: null,
      tail: "loadMore",
    })
  })

  it("배경 재조회가 실패해도 받아 둔 목록은 지우지 않는다", () => {
    // 목록이 살아 있는데 화면을 비우면 그게 더 큰 거짓말이다.
    expect(communityFeedSurfaces(facts({ isError: true }))).toEqual({
      failed: false,
      empty: null,
      tail: null,
    })
  })
})

describe("**목록이 정말 끝났다** — 다섯 번째 꼬리 (2026-08-21)", () => {
  it("더 받을 것이 없고 보이는 줄이 있으면 꼬리가 끝을 말한다", () => {
    /*
      여기까지 침묵이던 자리다. 침묵은 "다 봤다" 와 "더 못 불러왔다" 를 **같은 화면**
      으로 만든다 — 다음에 할 일이 정반대인데(그만 본다 / 다시 시도한다).
    */
    expect(communityFeedSurfaces(facts({ hasNextPage: false }))).toEqual({
      failed: false,
      empty: null,
      tail: "end",
    })
  })

  it("다음 장이 오는 중이면 끝이 아니라 로더다", () => {
    expect(
      communityFeedSurfaces(
        facts({ hasNextPage: false, isFetchingNextPage: true }),
      ),
    ).toEqual({ failed: false, empty: null, tail: "loading" })
  })

  it("다음 장이 실패했으면 끝이 아니라 실패 행이다 — 끝났다고 말하면 거짓말이다", () => {
    expect(
      communityFeedSurfaces(
        facts({
          hasNextPage: false,
          isError: true,
          isFetchNextPageError: true,
        }),
      ),
    ).toEqual({ failed: false, empty: null, tail: "error" })
  })

  it("커서가 없는 채로 취소되어 끝났으면 그것은 끝이다 — '더 보기' 는 갈 데가 없다", () => {
    // 정체("더 보기")는 `hasNextPage` 를 요구한다. 커서가 없으면 누를 곳이 없으므로 끝이다.
    expect(
      communityFeedSurfaces(facts({ hasNextPage: false, isTailStalled: true })),
    ).toEqual({ failed: false, empty: null, tail: "end" })
  })

  it("보이는 줄이 없으면 끝이 아니라 **빈 목록**이다", () => {
    // 빈 화면에 끝 표시만 덩그러니 서면 무엇이 끝났다는 말인지 알 수 없다.
    expect(
      communityFeedSurfaces(
        facts({ hasNextPage: false, postCount: 0, visibleCount: 0 }),
      ),
    ).toEqual({ failed: false, empty: "empty", tail: null })
  })

  it("필터를 갈아타는 중이면 꼬리는 말하지 않는다 — 화면의 목록은 **이전 조합**의 것이다", () => {
    /*
      `empty` 가 `"empty"` 인 것은 이 변경 **이전과 같다**(커서가 없으면 빈 자리가
      그렇게 말해 왔다). 그 자리는 FlashList 가 `data.length === 0` 일 때만 내므로
      줄이 20개인 지금 화면에는 그려지지 않는다. 여기서 못 박는 것은 **꼬리가
      침묵한다**는 것이다 — 옛 조합의 끝을 지금 조합의 끝이라고 말하지 않는다.
    */
    expect(
      communityFeedSurfaces(
        facts({ hasNextPage: false, isPlaceholderData: true }),
      ),
    ).toEqual({ failed: false, empty: "empty", tail: null })
  })

  it("스켈레톤이 서 있는 동안에는 끝을 말하지 않는다", () => {
    expect(
      communityFeedSurfaces(facts({ hasNextPage: false, showSkeleton: true })),
    ).toEqual({ failed: false, empty: null, tail: null })
  })
})

describe("자리에 세울 정직한 목록이 없을 때", () => {
  it("필터를 갈아타는 중의 실패는 전면 오류다 — 옛 조합의 목록이 정상처럼 서 있다", () => {
    expect(
      communityFeedSurfaces(facts({ isError: true, isPlaceholderData: true })),
    ).toEqual({ failed: true, empty: "error", tail: null })
  })

  it("전면 오류가 서면 꼬리는 무엇을 알고 있든 침묵한다", () => {
    expect(
      communityFeedSurfaces(
        facts({
          postCount: 0,
          visibleCount: 0,
          isError: true,
          isFetchingNextPage: true,
          isFetchNextPageError: true,
          isTailStalled: true,
        }),
      ),
    ).toEqual({ failed: true, empty: "error", tail: null })
  })

  it("스켈레톤이 자리를 잡는 동안에는 아무 것도 말하지 않는다", () => {
    expect(
      communityFeedSurfaces(
        facts({
          showSkeleton: true,
          postCount: 0,
          visibleCount: 0,
          isError: true,
          isFetchNextPageError: true,
          isTailStalled: true,
          canAutoBackfill: false,
        }),
      ),
    ).toEqual({ failed: false, empty: null, tail: null })
  })
})

describe("전 조합 — 두 면이 동시에 서는 입력은 없다", () => {
  const flags = [
    "showSkeleton",
    "isError",
    "isPlaceholderData",
    "hasNextPage",
    "isFetchingNextPage",
    "isFetchNextPageError",
    "isTailStalled",
    "canAutoBackfill",
  ] as const

  /** 8개 불리언 × (원본 0·20) × (보이는 0·20) 을 전부 센다. */
  function* everyFacts(): Generator<CommunityFeedFacts> {
    for (let mask = 0; mask < 1 << flags.length; mask += 1) {
      for (const postCount of [0, 20]) {
        for (const visibleCount of [0, 20]) {
          if (visibleCount > postCount) continue
          const combination = Object.fromEntries(
            flags.map((flag, index) => [flag, Boolean(mask & (1 << index))]),
          ) as Record<(typeof flags)[number], boolean>
          yield { ...combination, postCount, visibleCount }
        }
      }
    }
  }

  it("빈 자리와 꼬리가 함께 말하는 조합은 하나도 없다", () => {
    const both = [...everyFacts()].filter((input) => {
      const { empty, tail } = communityFeedSurfaces(input)
      return empty !== null && tail !== null
    })
    expect(both).toEqual([])
  })

  it("전면 오류일 때는 언제나 빈 자리 하나뿐이다", () => {
    const wrong = [...everyFacts()].filter((input) => {
      const { failed, empty, tail } = communityFeedSurfaces(input)
      return failed && (empty !== "error" || tail !== null)
    })
    expect(wrong).toEqual([])
  })

  it("받아 둔 글이 있으면(원본 기준) 전면 오류를 세우지 않는다 — 필터 전환 중만 예외다", () => {
    const wrong = [...everyFacts()].filter((input) => {
      const { failed } = communityFeedSurfaces(input)
      return failed && input.postCount > 0 && !input.isPlaceholderData
    })
    expect(wrong).toEqual([])
  })

  it("끝을 말하는 조합은 **전부** 다음 커서가 없고 보이는 줄이 있다", () => {
    const wrong = [...everyFacts()].filter((input) => {
      const { tail } = communityFeedSurfaces(input)
      return (
        tail === "end" &&
        (input.hasNextPage ||
          input.visibleCount === 0 ||
          input.isPlaceholderData ||
          input.showSkeleton ||
          input.isFetchingNextPage ||
          input.isFetchNextPageError)
      )
    })
    expect(wrong).toEqual([])
  })

  it("**끝난 목록은 반드시 끝이라고 말한다** — 조용히 끝나는 조합이 하나도 없다", () => {
    /*
      이 기능이 고치려던 결함 자체다. 위 규칙(`끝일 때만 end`)만 있으면 구현이
      `"end"` 를 아무 데서도 안 내도 초록이다 — 그래서 반대 방향도 센다.
    */
    const silent = [...everyFacts()].filter((input) => {
      const { failed, empty, tail } = communityFeedSurfaces(input)
      const nothingElseToSay =
        !input.showSkeleton &&
        !failed &&
        !input.isFetchingNextPage &&
        !input.isFetchNextPageError &&
        !input.hasNextPage &&
        !input.isPlaceholderData &&
        input.visibleCount > 0
      return nothingElseToSay && (tail !== "end" || empty !== null)
    })
    expect(silent).toEqual([])
  })
})
