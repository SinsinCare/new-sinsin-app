/**
 * 목록 화면 수준의 순수 판단. 카드 하나가 아니라 "목록 전체" 에 대한 것들.
 */

export type ResultCountKind =
  /** 서버가 전체 개수를 줬다 — 그대로 말한다("검색 결과 32개"). */
  | "exact"
  /** 전체 개수를 모르고 더 남았다 — 받은 만큼만 **최소치**로 말한다("20개 이상"). */
  | "atLeast"
  /** 전체 개수를 모르지만 더 없다 — 받은 게 전부이므로 그대로 말한다. */
  | "exhausted"

export interface ResultCount {
  kind: ResultCountKind
  count: number
}

/**
 * 계약 §6.1 "결과 수를 먼저 보여준다(32개)".
 *
 * 그런데 계약 §3.1 의 `RecipeListResponse` 에는 전체 개수가 없다(키셋 페이지네이션).
 * 서버가 `totalCount` 를 주면 그걸 쓰고, 안 주면 **받은 개수를 전체인 척 말하지 않는다** —
 * 32건 중 20건만 받은 상태에서 "20개" 라고 쓰면 사용자는 12건을 못 보고 나간다.
 * 이 경우 "20개 이상" 으로 내려간다. 서버가 totalCount 를 실으면 이 분기는 저절로 죽는다.
 */
export function resolveResultCount(
  totalCount: number | null | undefined,
  loadedCount: number,
  hasMore: boolean,
): ResultCount {
  if (totalCount != null && Number.isFinite(totalCount) && totalCount >= 0) {
    return { kind: "exact", count: Math.trunc(totalCount) }
  }
  return { kind: hasMore ? "atLeast" : "exhausted", count: loadedCount }
}

/** 방향을 방향으로 인정하는 최소 이동량. 손가락이 떠는 정도로 버튼이 접히면 안 된다. */
export const FAB_SCROLL_DIRECTION_THRESHOLD = 24

/** 이 위치보다 위에서는 항상 펼친다 — 목록 맨 위에서 작성 버튼을 숨길 이유가 없다. */
export const FAB_ALWAYS_EXPANDED_OFFSET = 8

/**
 * 작성 플로팅을 접을지 정한다(계약 §6.1 "스크롤 내리면 축소").
 * 방향이 바뀔 때만 상태를 바꾸고, 임계값 안의 흔들림은 **현재 상태를 유지**한다 —
 * 매 프레임 토글되면 버튼이 떨면서 오히려 카드를 더 가린다.
 */
export function nextFabCollapsed(input: {
  collapsed: boolean
  offsetY: number
  lastOffsetY: number
}): boolean {
  if (input.offsetY <= FAB_ALWAYS_EXPANDED_OFFSET) return false
  const delta = input.offsetY - input.lastOffsetY
  if (delta > FAB_SCROLL_DIRECTION_THRESHOLD) return true
  if (delta < -FAB_SCROLL_DIRECTION_THRESHOLD) return false
  return input.collapsed
}

/**
 * 자동완성 패널을 띄울 조건. "입력했는데 아래가 안 바뀐다"(시안의 `Typing`/`Typed` 가
 * 같은 화면이었던 결함)를 막는 지점이라 조건을 한곳에 모아 테스트한다.
 *
 * - 포커스가 없으면 안 띄운다(스크롤 중에 패널이 튀어나오면 목록을 가린다).
 * - 확정된 검색어와 초안이 같으면 안 띄운다 — 결과를 보고 있는데 그 위에 같은 말을
 *   다시 제안하면 무엇을 눌러야 하는지 알 수 없다.
 */
export function shouldShowSuggestions(input: {
  isFocused: boolean
  draft: string
  committedQuery: string
}): boolean {
  const draft = input.draft.trim()
  if (!input.isFocused) return false
  if (draft.length < 1) return false
  return draft !== input.committedQuery.trim()
}
