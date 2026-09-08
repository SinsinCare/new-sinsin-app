/**
 * 홈 식단 목록에서 **지금 보이는 줄**. 시안(2026-09-04): 세 줄까지 보이고, 넘치면
 * "더 보기"로 펼친다 — 펼친 뒤에는 "접기"로 되돌린다.
 *
 * 순수 함수로 뺀 이유는 목록 컴포넌트가 RN 렌더 테스트 없이도 이 규칙을 증명하기
 * 위해서다(`tests/mealRecordListVisible.test.ts`).
 */
export const MEAL_LIST_COLLAPSED_COUNT = 3

export function visibleMealEntries<T>(
  entries: readonly T[],
  expanded: boolean,
): { visible: T[]; canToggle: boolean } {
  const canToggle = entries.length > MEAL_LIST_COLLAPSED_COUNT
  const visible =
    canToggle && !expanded
      ? entries.slice(0, MEAL_LIST_COLLAPSED_COUNT)
      : [...entries]
  return { visible, canToggle }
}
