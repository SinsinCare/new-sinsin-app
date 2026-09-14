/**
 * 목록 카드의 배지를 `safety` 에서 **유도**한다. `nutritionBadges` 를 대체한 것이다.
 *
 * ## 왜 서버에 `nutritionBadges` 를 만들지 않았나
 *
 * 카드가 `card.nutritionBadges.slice(...)` 로 죽었고, 가장 쉬운 수리는 서버에 그 필드를
 * 추가하는 것이었다. **하지 않았다.** 그 필드의 원본이 될 값은 정적
 * `restaurant.nutrition_tags`(`저염`·`저단백` …)인데,
 *
 * - 그 CSV 는 수집 시각에 메뉴 평균으로 계산된 라벨이고 **환자별 기준을 모른다.**
 *   5단계·투석 환자와 1단계 환자가 같은 `저단백` 배지를 본다.
 * - `mealrec` 은 같은 문자열들을 `nonclinicalTags()` 로 걸러 낸다 — 검수 전 임상 주장을
 *   노출하지 않기 위한 장치다(`BUILD_CONTRACT §-1.1`). 배지로 내보내면 그 장치를
 *   우회하는 두 번째 경로가 생긴다.
 * - 응답 계층에서 "평균 단백질 18g 미만이면 저단백" 같은 규칙을 재현하면, 아무도 검증하지
 *   않은 임상 주장이 하나 더 태어난다.
 *
 * 그래서 서버는 원본을 `legacyNutritionTags` 라는 이름으로만 내려보내고(디버깅용),
 * 배지는 **요청 시각에 그 사용자 기준으로 계산된** `safety` 에서 앱이 만든다.
 * 백엔드 `mapService` 헤더가 같은 문장을 적어 두었다: "배지 문구는 `safety.driverCounts`
 * 로 앱이 만든다."
 *
 * ## 되돌리지 말 것
 *
 * - `profileMissing` 이면 **아무 배지도 없다.** 프로필이 없으면 서버의 한도표는 `UNKNOWN`
 *   단계 기본값이고, 그 값으로 나온 판정을 배지로 그리면 환자는 자기 기준으로 계산된
 *   결과라고 읽는다. 배지 대신 화면이 프로필 유도를 띄운다.
 * - `UNKNOWN` 을 회색 `정보 없음` 으로도 채우지 않는다. 카드에서는 배지 자리가 비어 있는
 *   것이 정직하다 — `SafetyBadge` 의 `showUnknown` 기본값이 `false` 인 이유와 같다.
 *
 * ## 여기 없는 것
 *
 * 사진 아래 영양 참고 요약(등급 배지 + `안전 메뉴 N개`/`나트륨 기준` 보조 배지 —
 * `cardSafetyBadges`·`dominantDriver`·`cardSafetyNoteKey`)과 전국 확장을 위한 판정 상태
 * (`cardSafetyState`·`showsAnalysisPendingChip`)가 있었다. 카드가 제목 옆 영양소 배지
 * (`cardConcernNutrients`)만 그리게 바뀐 뒤 부르는 화면이 하나도 없어 지웠다 — 테스트만
 * 초록인 판정 규칙은 제품을 지키지 않는다. 전국 확장에서 "분석 전" 칩이 필요해지면
 * 그때의 데이터 형편에 맞춰 다시 쓴다.
 */

import type { RestaurantSafetyDto, SafetyDriver } from "../types"

/** 판정을 주도한 영양소 4종. `driverCounts` 의 키 후보이자 우선순위 순서다. */
const DRIVERS: readonly SafetyDriver[] = [
  "sodium",
  "potassium",
  "phosphorus",
  "protein",
]

/** All evidenced menu concerns, even when safe menus make the restaurant rollup SAFE. */
export function cardConcernNutrients(
  safety: RestaurantSafetyDto | null | undefined,
): SafetyDriver[] {
  if (!safety || safety.profileMissing || safety.level === "UNKNOWN") return []
  const counts = safety.concernCounts ?? safety.driverCounts
  return DRIVERS.filter((nutrient) => {
    const count = counts[nutrient]
    return typeof count === "number" && Number.isFinite(count) && count > 0
  })
}
