/**
 * **목록 화면이 아무 말도 하지 않는 순간이 있는가.** (2026-08-21)
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 두 가지를 잰다
 *
 * ── S2. 검색 화면이 **두 면을 동시에** 세우던 조합 ──────────────────────────
 * 피드는 `communityFeedSurfaces` 한 함수가 빈 자리와 꼬리를 정해서 둘이 같이 설 수
 * 없다. 그런데 검색 화면(`CommunitySearchScreen`)은 같은 조건을 JSX 안에 **손으로 두
 * 벌** 적고 있었고, 그래서 넷이 겹쳤다 — 보이는 결과 0 · 다음 커서 없음 · 다음 장
 * 실패. 화면 가운데에 "검색 결과가 없어요" 가, 그 아래 꼬리에 "다시"(다음 페이지)가
 * 나란히 섰다. 서로 다른 일을 하는 두 버튼이 같은 실패를 말하고, 이 화면에는 그
 * 둘 말고 아무것도 없다.
 *
 * 닿는 경로: 2페이지가 실패해 꼬리가 서 있는 상태에서 결과의 작성자를 차단한다 →
 * `useBlockedUsers` 가 검색 키를 `active` 로 재조회하고(`invalidateFeedCaches`) →
 * 서버가 이미 거른 결과에는 커서도 줄도 없다 → 두 면이 동시에.
 *
 * ── S3. **아무 면도 안 서는** 조합 ────────────────────────────────────────
 * 그 함수 자신도 구멍이 하나 있었다. 조회가 실패한 채(`isError`) 보이는 목록이 0인데
 * 원본에는 글이 남아 있고 backfill 예산도 남아 있으면, 세 판정이 전부 `null` 이었다:
 * 빈 자리도 꼬리도 침묵. 그런데 그 침묵의 근거인 "곧 자동으로 한 장 더 당긴다" 는
 * **거짓**이다 — 그 이펙트는 `!isError` 를 요구한다. 정산 무효화는
 * `refetchType:"none"` 이고 `onEndReached` 는 그릴 줄이 없어 발화하지 않는다.
 * 남는 것은 문구도 버튼도 없는 빈 화면이다(피드는 머리 레일만, 검색은 통째로 백지).
 *
 * ■ 어떻게 재는가
 *
 * 판정은 순수 함수라 그대로 부른다. **침묵이 정직한 조건을 이 파일 안에 따로 적고**
 * (`silenceIsHonest` — 화면의 backfill 이펙트 조건을 그대로 옮긴 것), 전 조합에서
 * 침묵이 그 조건 밖으로 새지 않는지 센다. 화면 배선은 **주석을 걷어낸 소스**로 본다
 * (이 저장소에는 RN 렌더러가 없다).
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  communityFeedSurfaces,
  type CommunityFeedFacts,
} from "@/src/features/recipe/utils/communityFeedSurfaces"

const ROOT = join(__dirname, "..")

/** 주석은 걷어낸다 — 머리말에 적힌 옛 식이 검사를 통과시키면 안 된다. */
function sourceOf(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*$/gmu, "")
}

const FEED = "src/features/recipe/components/FreePostTab.tsx"
const SEARCH = "src/features/recipe/views/CommunitySearchScreen.tsx"

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

/* ══════════════════════ S3 — 침묵이 정직한 조건 ══════════════════════ */

/**
 * **빈 목록을 스스로 메우는 이펙트가 지금 돌 수 있는가.**
 *
 * 두 화면의 조건을 글자 그대로 옮겼다 — `FreePostTab` 의 backfill `useEffect` 와
 * `CommunitySearchScreen` 의 같은 이펙트(검색에는 `isPlaceholderData` 가 없다).
 * 여기 `!isError` 가 있다는 것이 S3 의 핵심이다: 실패한 채로는 자동 복구가 없다.
 */
function autoBackfillCanRun(f: CommunityFeedFacts): boolean {
  return (
    !f.showSkeleton &&
    !f.isError &&
    !f.isPlaceholderData &&
    f.visibleCount === 0 &&
    f.hasNextPage &&
    !f.isFetchingNextPage &&
    !f.isFetchNextPageError &&
    f.canAutoBackfill
  )
}

/**
 * 아무 면도 안 세운 채 화면이 비어 있어도 괜찮은가. 넷 중 하나여야 한다:
 *  1. 스켈레톤이 서 있다(머리가 이미 말하고 있다),
 *  2. 그릴 줄이 있다(사용자가 읽을 것이 있고, `onEndReached` 도 열려 있다),
 *  3. 필터를 갈아타는 중이다 — 새 키의 첫 장이 날아가 있다(`keepPreviousData`),
 *  4. 자동 backfill 이 **실제로** 돈다.
 * 그 밖의 침묵은 전부 "고장난 화면을 정상처럼 보이게 하는" 침묵이다.
 */
function silenceIsHonest(f: CommunityFeedFacts): boolean {
  if (f.showSkeleton) return true
  if (f.visibleCount > 0) return true
  if (f.isPlaceholderData && !f.isError) return true
  return autoBackfillCanRun(f)
}

const FLAGS = [
  "showSkeleton",
  "isError",
  "isPlaceholderData",
  "hasNextPage",
  "isFetchingNextPage",
  "isFetchNextPageError",
  "isTailStalled",
  "canAutoBackfill",
] as const

/** 8개 불리언 × (원본 0·20) × (보이는 0·20). 보이는 것이 원본보다 많을 수는 없다. */
function* everyFacts(): Generator<CommunityFeedFacts> {
  for (let mask = 0; mask < 1 << FLAGS.length; mask += 1) {
    for (const postCount of [0, 20]) {
      for (const visibleCount of [0, 20]) {
        if (visibleCount > postCount) continue
        const combination = Object.fromEntries(
          FLAGS.map((flag, index) => [flag, Boolean(mask & (1 << index))]),
        ) as Record<(typeof FLAGS)[number], boolean>
        yield { ...combination, postCount, visibleCount }
      }
    }
  }
}

describe("S3 — 아무 면도 안 세우는 침묵은 스스로 나을 수 있을 때뿐이다", () => {
  it("실측된 그 입력: 조회 실패 + 전부 차단 + 예산 남음 → 오류를 말한다", () => {
    /*
      20개 중 19개가 차단한 사람 글이라 예산은 안 깎였고(보이는 목록이 0이 된 적이
      없다), 오프라인 복귀로 재검증이 실패했고(데이터는 유지), 남은 한 글을 열었더니
      404 라 계보에서 빠졌다 — `postCount 19 / visibleCount 0`.
    */
    expect(
      communityFeedSurfaces(
        facts({
          isError: true,
          postCount: 19,
          visibleCount: 0,
          hasNextPage: true,
          canAutoBackfill: true,
        }),
      ),
    ).toEqual({ failed: false, empty: "error", tail: null })
  })

  it("전 조합 — 침묵이 정직하지 않은 입력은 하나도 없다", () => {
    const silentAndStuck = [...everyFacts()].filter((input) => {
      const { failed, empty, tail } = communityFeedSurfaces(input)
      if (failed || empty !== null || tail !== null) return false
      return !silenceIsHonest(input)
    })
    expect(silentAndStuck).toEqual([])
  })

  it("전 조합 — 두 면이 동시에 서는 입력도 여전히 하나도 없다", () => {
    const both = [...everyFacts()].filter((input) => {
      const { empty, tail } = communityFeedSurfaces(input)
      return empty !== null && tail !== null
    })
    expect(both).toEqual([])
  })

  it("보이는 줄이 있으면 배경 실패로 목록을 지우지 않는다 (바뀌면 안 되는 쪽)", () => {
    // 새 갈래가 `visibleCount === 0` 을 안 보면 여기가 무너진다 — 20줄이 서 있는
    // 화면이 배경 재조회 한 번 실패에 오류 문구로 덮인다.
    expect(communityFeedSurfaces(facts({ isError: true }))).toEqual({
      failed: false,
      empty: null,
      tail: null,
    })
  })

  it("꼬리가 말할 것이 있으면 새 갈래는 침묵한다 — 두 재시도가 겹치지 않는다", () => {
    expect(
      communityFeedSurfaces(
        facts({ isError: true, visibleCount: 0, isFetchNextPageError: true }),
      ),
    ).toEqual({ failed: false, empty: null, tail: "error" })
    expect(
      communityFeedSurfaces(
        facts({ isError: true, visibleCount: 0, isFetchingNextPage: true }),
      ),
    ).toEqual({ failed: false, empty: null, tail: "loading" })
  })

  it("실패가 아니면 예산이 남은 빈 목록은 여전히 침묵한다(곧 스스로 당긴다)", () => {
    expect(communityFeedSurfaces(facts({ visibleCount: 0 }))).toEqual({
      failed: false,
      empty: null,
      tail: null,
    })
  })
})

/* ══════════════════════ S2 — 검색 화면의 배선 ══════════════════════ */

describe("S2 — 검색 화면도 같은 함수를 지난다", () => {
  const source = sourceOf(SEARCH)

  it("`communityFeedSurfaces` 를 부른다 — 원본과 보이는 목록을 둘 다 넘긴다", () => {
    expect(source).toContain("communityFeedSurfaces({")
    expect(source).toContain("postCount: search.posts.length")
    expect(source).toContain("visibleCount: visibleResults.length")
  })

  it("세 자리 모두 그 판정을 그리기만 한다", () => {
    // 전면 오류 · 빈 자리 · 꼬리.
    expect(source).toContain("searchFailed ? (")
    expect(source).toContain('emptySurface === "error" ? (')
    expect(source).toContain('emptySurface === "loadMore" ? (')
    expect(source).toContain('emptySurface === "empty" ? (')
    expect(source).toContain('tailSurface === "loading" ? (')
    expect(source).toContain('tailSurface === "error" ? (')
    expect(source).toContain('tailSurface === "loadMore" ? (')
  })

  it("손으로 적은 옛 조건이 한 줄도 남아 있지 않다", () => {
    /*
      두 자리의 조건을 다시 적는 순간 그 화면만 다른 판정을 하게 된다 —
      겹치던 넷은 정확히 그렇게 생겼다.
    */
    expect(source).not.toMatch(/!search\.canAutoBackfill/u)
    expect(source).not.toMatch(/!search\.hasNextPage\s*&&/u)
    expect(source).not.toMatch(/search\.isFetchingNextPage\s*\?/u)
    expect(source).not.toMatch(/search\.isFetchNextPageError\s*\?/u)
    expect(source).not.toMatch(/search\.isError\s*&&\s*search\.posts\.length/u)
  })

  it("피드도 같은 함수를 같은 인자로 부른다 — 두 화면이 갈라지지 않는다", () => {
    const feed = sourceOf(FEED)
    expect(feed).toContain("communityFeedSurfaces({")
    expect(feed).toContain("postCount: posts.length")
    expect(feed).toContain("visibleCount: visiblePosts.length")
  })
})

/* ══════════════════════ 겹치던 넷을 그대로 다시 돌린다 ══════════════════════ */

describe("S2 — 겹치던 넷이 이제 하나만 세운다", () => {
  /**
   * 옛 검색 화면의 두 조건을 **글자 그대로** 옮겨 둔다(옛 규칙 보존 — 무엇이
   * 바뀌었는지 나란히 보기 위해서다). `ListEmptyComponent` 는 FlashList 가
   * `data.length === 0` 일 때만 내고, `ListFooterComponent` 에는 아무 조건도 없다.
   */
  function legacyEmptySlot(f: CommunityFeedFacts): string | null {
    if (f.visibleCount !== 0) return null
    if (
      f.hasNextPage &&
      !f.canAutoBackfill &&
      !f.isFetchingNextPage &&
      !f.isFetchNextPageError
    ) {
      return "loadMore"
    }
    if (!f.hasNextPage && !f.isFetchingNextPage) return "noResults"
    return null
  }

  function legacyTailSlot(f: CommunityFeedFacts): string | null {
    if (f.isFetchingNextPage) return "loading"
    if (f.isFetchNextPageError) return "error"
    if (f.isTailStalled && f.hasNextPage && f.visibleCount > 0)
      return "loadMore"
    return null
  }

  /** 검색에는 스켈레톤·placeholder 축이 없다 — 결과 자리에 들어온 뒤의 조합만 센다. */
  const searchFacts = [...everyFacts()].filter(
    (f) => !f.showSkeleton && !f.isPlaceholderData && !f.isError,
  )

  it("옛 조건으로는 두 면이 같이 서는 입력이 넷 있었다 (반례)", () => {
    const overlaps = searchFacts.filter(
      (f) => legacyEmptySlot(f) !== null && legacyTailSlot(f) !== null,
    )
    /*
      옛 두 조건이 읽는 축은 여섯이다(원본 길이는 안 읽는다) — 그 여섯으로 접으면
      겹치는 조합은 정확히 **넷**이다: 보이는 결과 0 · 다음 커서 없음 · 다음 장 실패,
      그 위에서 예산·정체 두 축이 자유롭다.
    */
    const distinct = new Set(
      overlaps.map((f) =>
        JSON.stringify([
          f.visibleCount,
          f.hasNextPage,
          f.canAutoBackfill,
          f.isFetchingNextPage,
          f.isFetchNextPageError,
          f.isTailStalled,
        ]),
      ),
    )
    expect(distinct.size).toBe(4)
    for (const f of overlaps) {
      expect(f.visibleCount).toBe(0)
      expect(f.hasNextPage).toBe(false)
      expect(f.isFetchNextPageError).toBe(true)
      expect(f.isFetchingNextPage).toBe(false)
      expect(legacyEmptySlot(f)).toBe("noResults")
      expect(legacyTailSlot(f)).toBe("error")
    }
  })

  it("지금 규칙으로는 그 넷이 전부 **꼬리 하나**만 세운다", () => {
    const overlaps = searchFacts.filter(
      (f) => legacyEmptySlot(f) !== null && legacyTailSlot(f) !== null,
    )
    for (const f of overlaps) {
      expect(communityFeedSurfaces(f)).toEqual({
        failed: false,
        empty: null,
        tail: "error",
      })
    }
  })
})
