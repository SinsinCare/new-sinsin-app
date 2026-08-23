/**
 * **피드가 세우는 면(面)은 언제나 하나다.** (2026-08-20)
 *
 * ─── 왜 함수로 떼어 놨나 ────────────────────────────────────────────────────
 * FlashList v2 는 빈 컴포넌트와 꼬리를 **형제로** 낸다 — `renderEmpty` 만
 * `data.length` 로 걸리고 `renderFooter` 에는 아무 조건도 없다(`useSecondaryProps`).
 * 그래서 두 자리의 조건을 따로 쓰면 전면 오류와 꼬리의 실패 행이 **같이** 선다.
 * 실측 경로: 차단한 사람의 글이 1페이지를 통째로 채우면 보이는 목록이 비고 →
 * 화면이 스스로 2페이지를 당기고(backfill) → 그것이 실패하면 화면 가운데에
 * "다시 불러오기"(1페이지부터)가, 그 바로 아래에 "다시"(다음 페이지)가 함께 섰다.
 * 두 버튼이 서로 다른 일을 하는데 같은 실패를 말한다.
 *
 * ─── 두 가지를 못 박는다 ────────────────────────────────────────────────────
 * 1. **무엇으로 "비었다" 를 재는가.** 전면 오류는 차단 필터로 접힌 목록이 아니라
 *    **원본 목록**(`postCount`)으로 잰다. 받아 둔 글이 있으면 실패는 꼬리의 사건이지
 *    화면 전체의 사건이 아니다. 검색 화면은 처음부터 원본(`search.posts.length`)으로
 *    쟀고, 그래서 이 결함이 없었다.
 * 2. **꼬리가 말할 것이 있으면 빈 자리는 침묵한다.** 그리고 전면 오류가 서면 꼬리가
 *    침묵한다. 우선순위를 한 곳에 적어 두면 "둘 다 서는" 조합을 만들 수 없다
 *    (그 불변식은 `tests/communityFeedSurfaces.test.ts` 가 전 조합으로 확인한다).
 * 3. **침묵은 스스로 나을 수 있을 때만 정직하다.** 아무 면도 안 세우는 갈래는 하나뿐이고
 *    (자동 backfill 을 기다리는 동안), 그 이펙트는 `!isError` 를 요구한다. 그래서 조회가
 *    실패한 채 보이는 목록이 비면 침묵이 아니라 오류를 세운다 — 그러지 않으면 문구도
 *    버튼도 없는 빈 화면이 남는다(아래 `empty` 의 마지막 갈래 · 2026-08-21).
 *
 * ─── 꼬리는 이제 **넷이 아니라 다섯** 가지를 말한다 (2026-08-21) ─────────────
 * 오는 중 · 실패 · 취소로 끊김 · **정말 끝** · 침묵. 다섯 번째(`"end"`)를 여기 넣은
 * 이유는 나머지 넷과 **같은 자리를 두고 다투기 때문**이다. 화면에서 `!hasNextPage`
 * 를 따로 보면 실패 행 아래에 "이게 전부예요" 가 나란히 서는 조합이 즉시 생긴다
 * (다음 장이 실패하면 `hasNextPage` 는 그대로지만, 커서가 소진된 채 실패한 재조회는
 * 그렇지 않다). 한 곳에서 고르면 그 조합을 만들 수 없다.
 *
 * ─── 이 파일을 쓰는 화면 ────────────────────────────────────────────────────
 * 피드(`FreePostTab`)와 검색(`CommunitySearchScreen`) **둘 다** 여기를 지난다.
 * 검색 화면은 한동안 같은 조건을 JSX 안에 손으로 두 벌 적고 있었고, 그래서 꼬리의
 * 실패 행과 "검색 결과가 없어요" 가 **같이 서는** 조합이 넷 있었다(빈 결과 + 다음 장
 * 실패 + 커서 소진). 새 목록 화면도 조건을 다시 적지 말고 이 함수를 부를 것.
 */

/** 빈 자리(`ListEmptyComponent`)가 말하는 것. */
export type FeedEmptySurface =
  /** 조회가 실패했고 자리에 세울 정직한 목록이 없다 — 전면 오류. */
  | "error"
  /** 자동 backfill 예산을 다 썼는데 보일 글이 없다 — 다음 장은 사용자가 고른다. */
  | "loadMore"
  /** 더 받을 것이 없고 정말 비었다 — "아직 글이 없어요". */
  | "empty"
  | null

/** 꼬리(`ListFooterComponent`)가 말하는 것. */
export type FeedTailSurface =
  /** 다음 페이지가 오는 중(점 로더 · 링 스피너 금지). */
  | "loading"
  /** 다음 페이지가 실패했다 — 재시도는 **다음 페이지**를 다시 받는다. */
  | "error"
  /** 취소로 아무 것도 못 받고 끝났다(`isTailStalled`) — 다시 고를 자리. */
  | "loadMore"
  /**
   * **정말로 더 받을 것이 없다**(`!hasNextPage`) — 목록의 끝을 조용히 표시한다.
   * 위 셋 중 어느 것도 아닐 때만이다. 자세한 이유는 아래 `tail` 계산의 주석.
   */
  | "end"
  | null

export interface CommunityFeedFacts {
  /** 첫 조회 중이라 머리에 스켈레톤이 서 있는가. */
  showSkeleton: boolean
  /** 목록 쿼리가 실패 상태인가(다음 페이지 실패도 여기를 켠다). */
  isError: boolean
  /** **원본** 목록의 길이(차단 필터 전). 전면 오류는 이것으로 잰다(머리말 1). */
  postCount: number
  /** 지금 보이는 목록의 길이(차단 필터 후). */
  visibleCount: number
  /** 이전 필터 조합의 목록이 자리를 지키는 중인가(`keepPreviousData`). */
  isPlaceholderData: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  /** 훅이 기억한 다음-페이지 실패(옵저버 플래그가 아니다 · `useInfiniteTail`). */
  isFetchNextPageError: boolean
  /** 훅이 기억한 "아무 일도 없이 끝난" 다음 장(취소). */
  isTailStalled: boolean
  /** 빈 목록 자동 backfill 예산이 남았는가. */
  canAutoBackfill: boolean
}

export interface CommunityFeedSurfaces {
  /** 전면 오류가 화면을 차지하는 중 — 목록 데이터도 비운다. */
  failed: boolean
  empty: FeedEmptySurface
  tail: FeedTailSurface
}

/**
 * 세 가지 판정을 **한 곳에서** 한다 — 전면 오류인가, 빈 자리는 무엇을 말하는가,
 * 꼬리는 무엇을 말하는가. 어떤 입력에도 `empty` 와 `tail` 이 동시에 서지 않는다.
 */
export function communityFeedSurfaces(
  facts: CommunityFeedFacts,
): CommunityFeedSurfaces {
  const {
    showSkeleton,
    isError,
    postCount,
    visibleCount,
    isPlaceholderData,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isTailStalled,
    canAutoBackfill,
  } = facts

  // 스켈레톤이 자리를 잡는 동안은 아무 것도 말하지 않는다(머리가 이미 말하고 있다).
  if (showSkeleton) return { failed: false, empty: null, tail: null }

  /*
    조회가 실패했고 자리에 세울 정직한 목록이 없다:
      - **받아 둔 글이 하나도 없거나**(차단 필터로 접힌 목록이 아니라 원본으로 잰다),
      - `keepPreviousData` 가 잡아 둔 것이 **이전 필터 조합**의 목록일 때(placeholder).
    이때 빈 문구를 그리면 실패가 정상처럼 읽힌다 — 오류를 그린다. 그리고 오류가 서면
    꼬리는 침묵한다: 같은 실패를 두 버튼이 다르게 말하지 않는다(머리말).
  */
  const failed = isError && (postCount === 0 || isPlaceholderData)
  if (failed) return { failed, empty: "error", tail: null }

  /*
    꼬리는 네 가지를 말한다 — 오는 중이거나, 실패했거나, **취소로 아무 것도 못 받고
    끝났거나**, **정말 끝났거나**. 넷 다 아니면 침묵한다(그때 비로소 빈 자리가 말할 수 있다).
    정체("더 보기")는 보이는 줄이 있을 때만이다 — 목록이 비어 있을 때는 아래 빈 자리의
    backfill 예산 쪽이 맡는다(빈 화면에 꼬리만 떠 있으면 무엇의 "더 보기" 인지 모른다).
    끝 표시도 같은 이유로 보이는 줄이 있을 때만이다.
  */
  const tail: FeedTailSurface = isFetchingNextPage
    ? "loading"
    : isFetchNextPageError
      ? "error"
      : isTailStalled && hasNextPage && visibleCount > 0
        ? "loadMore"
        : /*
            ─── **끝났다는 말도 상태다** (2026-08-21) ────────────────────────────
            여기까지 침묵이던 자리다. 그래서 사용자가 목록 끝까지 내려오면 화면은
            "다 봤다" 와 "더 못 불러왔다" 를 **똑같이** 보여 줬다 — 로더도 실패 행도
            없이 그냥 마지막 카드에서 끝난다. 둘은 다음에 할 일이 정반대인데
            (기다린다 / 다시 시도한다) 화면이 같으니 사용자는 한참 더 당겨 본다.

            위 셋 중 하나라도 걸리면 여기는 오지 않는다 — 오는 중이거나, 실패했거나,
            취소로 끊긴 목록에 "이게 전부예요" 는 거짓말이다.

            두 조건을 더 건다:
             - `visibleCount > 0`: 그릴 줄이 하나도 없으면 이것은 **빈 목록**이지
               "끝" 이 아니다. 그 자리는 아래 `empty` 가 맡는다("아직 글이 없어요").
               (FlashList 는 두 자리를 형제로 내므로 여기서 자리를 비켜 주지 않으면
               빈 화면에 끝 표시만 덩그러니 선다.)
             - `!isPlaceholderData`: 필터를 갈아타는 중 화면에 서 있는 것은 **이전
               조합**의 목록이다. 그 목록의 끝은 지금 고른 조합의 끝이 아니다.
          */
          !hasNextPage && visibleCount > 0 && !isPlaceholderData
          ? "end"
          : null

  /*
    빈 자리는 **꼬리가 침묵할 때만** 말한다. 그래서 "아직 글이 없어요" 가 실패 행과
    나란히 서지 않는다. 그 안에서는:
      - 예산을 다 썼는데 다음 커서가 살아 있으면 → 다음 장을 받을지 사용자가 고른다,
      - 더 받을 것이 없으면 → 정말 비었다,
      - 예산이 남아 있으면 → 곧 자동으로 한 장 더 당긴다(그동안은 침묵).

    ─── 마지막 갈래의 침묵은 **조회가 살아 있을 때만** 정직하다 (2026-08-21) ───
    "곧 자동으로 한 장 더 당긴다" 는 화면의 backfill 이펙트가 실제로 돌 수 있을 때
    참이다. 그 이펙트는 **`!isError` 를 요구한다**(`FreePostTab` · `CommunitySearchScreen`).
    그래서 조회가 실패한 채로 보이는 목록이 비면 아무 일도 일어나지 않는다:
    빈 자리도 꼬리도 침묵하고, 정산 무효화는 `refetchType:"none"` 이라 재조회도 없고,
    `onEndReached` 는 그릴 줄이 없어 발화하지 않는다 — **아무 문구도, 아무 버튼도
    없는 빈 화면**이 남는다(피드는 머리 레일만, 검색 화면은 통째로 백지).

    실측 경로: 20개 중 19개가 차단한 사람 글이라 예산은 안 깎였고(보이는 목록이 0이
    된 적이 없다) → 오프라인으로 탭에 복귀해 재검증이 실패하고(`isError`, 데이터는 유지)
    → 남은 한 글을 열었더니 404 라 계보에서 지워진다 → `postCount 19 / visibleCount 0`.

    여기서는 **원본이 아니라 보이는 목록**으로 잰다. 전면 오류(`failed`)와 다른
    판정이다: 전면 오류는 "받아 둔 목록이 있으면 실패는 꼬리의 사건" 이라 원본으로
    재지만, 이 자리는 애초에 **그릴 줄이 하나도 없을 때만** 그려지는 자리다
    (FlashList 는 `data.length === 0` 일 때만 `ListEmptyComponent` 를 낸다).
    목록이 비어 있는데 낫게 할 방법이 없으면, 그 사실을 말하는 것이 유일한 정직이다.
  */
  const empty: FeedEmptySurface =
    tail !== null
      ? null
      : hasNextPage && !canAutoBackfill
        ? "loadMore"
        : !hasNextPage
          ? "empty"
          : isError && visibleCount === 0
            ? "error"
            : null

  return { failed, empty, tail }
}
