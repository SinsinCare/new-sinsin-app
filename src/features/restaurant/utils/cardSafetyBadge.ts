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
 * ## 영양 참고 요약 — 두 조각, 한 규칙
 *
 * 아래 두 조각은 사진 아래 영양 참고 요약에 쓴다. 제목 옆 작은 영양소 배지는
 * `cardConcernNutrients` 로 별도 구성하며, 근거가 있는 영양소를 모두 표시한다.
 *
 * | `level` | 1번 배지 | 2번 배지 | 왜 |
 * |---|---|---|---|
 * | `SAFE` | `안전` | (없음) | 경고할 것도, 단서를 달 것도 없다 |
 * | `CAUTION`/`RESTRICTED` + 안전 메뉴 있음 | `주의`/`제한` | `안전 메뉴 N개` | **갈 이유**를 말한다. 제한 가게에도 먹을 수 있는 메뉴가 있다는 사실이 이 화면에서 가장 쓸모 있는 정보다 |
 * | `CAUTION`/`RESTRICTED` + 안전 메뉴 0개 | `주의`/`제한` | `나트륨 기준` | 줄 수 있는 행동이 없으면 **이유**라도 말한다. 어느 영양소가 판정을 끌었는지가 그것이다 |
 * | `UNKNOWN` | (없음) | (없음) | 미판정을 배지로 그리지 않는다 |
 * | `profileMissing` | (없음) | (없음) | 아래 항목 참고 |
 *
 * 두 배지 모두 **서버가 준 수·등급을 그대로 읽은 것**이고 새 임상 규칙을 만들지 않는다.
 * `safeMenuCount` 는 `foodVerdict(menu, effectiveLimits(user))` 의 집계이므로 `안전`
 * 배지와 정확히 같은 수준의 근거를 갖는다.
 *
 * ## 되돌리지 말 것
 *
 * - `profileMissing` 이면 **아무 배지도 없다.** 프로필이 없으면 서버의 한도표는 `UNKNOWN`
 *   단계 기본값이고, 그 값으로 나온 판정을 배지로 그리면 환자는 자기 기준으로 계산된
 *   결과라고 읽는다. 배지 대신 화면이 프로필 유도를 띄운다.
 * - `UNKNOWN` 을 회색 `정보 없음` 으로도 채우지 않는다. 카드에서는 배지 자리가 비어 있는
 *   것이 정직하다 — `SafetyBadge` 의 `showUnknown` 기본값이 `false` 인 이유와 같다.
 * - `hasSafeMenu` 가 아니라 `safeMenuCount > 0` 을 본다. 두 값은 서버에서 같은 뜻이지만,
 *   화면에 **수를 적는** 배지의 근거는 그 수 자신이어야 한다. 불리언을 근거로 "N개" 를
 *   쓰면 언젠가 `hasSafeMenu: true, safeMenuCount: 0` 에서 `안전 메뉴 0개` 가 나온다.
 */

import type { RestaurantSafetyDto, SafetyDriver, SafetyLevel } from "../types"

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

/**
 * 카드 두 번째 배지의 내용. `kind` 로 갈라 두어 화면이 문자열을 조립하지 않는다
 * (하드코딩 한국어 금지 — 문구는 i18n 키로만 나간다).
 */
export type CardSafetyNote =
  /** `안전 메뉴 {{count}}개` */
  | { kind: "SAFE_MENU_COUNT"; count: number }
  /** `{{driver}} 기준` */
  | { kind: "DRIVER"; driver: SafetyDriver }

export interface CardSafetyBadges {
  /** 등급 배지. `null` 이면 그리지 않는다(`UNKNOWN` 또는 프로필 없음). */
  level: SafetyLevel | null
  /** 보조 배지. `null` 이면 그리지 않는다. */
  note: CardSafetyNote | null
}

const NONE: CardSafetyBadges = { level: null, note: null }

/**
 * `주의`·`제한` 을 가장 많이 끌어낸 영양소.
 *
 * 동수면 `DRIVERS` 순서(나트륨 → 칼륨 → 인 → 단백질)로 정한다. 임의로 흔들리면 같은
 * 가게가 새로 고칠 때마다 다른 이유를 말하고, 사용자는 둘 중 무엇도 신뢰하지 않는다.
 * 그 순서는 CKD 식이에서 흔히 먼저 조절하는 순서이기도 하다.
 */
export function dominantDriver(
  driverCounts: Partial<Record<SafetyDriver, number>>,
): SafetyDriver | null {
  let best: SafetyDriver | null = null
  let bestCount = 0
  for (const driver of DRIVERS) {
    // 키가 없는 영양소는 `undefined` 다 — 0 으로 접어 비교한다.
    const count = driverCounts[driver] ?? 0
    if (count > bestCount) {
      best = driver
      bestCount = count
    }
  }
  return best
}

/**
 * 카드 배지 두 칸을 고른다. 순수 함수 — 화면에서 조건을 다시 쓰지 않게 하기 위한 것이다.
 *
 * `safety` 가 `null`/`undefined` 인 경우도 받는다. `저장한 곳` 목록(`BookmarkCardDto`)이
 * 실제로 그렇고, 그때는 배지가 없다. 호출부에서 옵셔널 체이닝을 흩뿌리지 않게 여기서 받는다.
 */
export function cardSafetyBadges(
  safety: RestaurantSafetyDto | null | undefined,
): CardSafetyBadges {
  if (!safety) return NONE
  // 프로필이 없으면 판정 자체를 노출하지 않는다(헤더 참고).
  if (safety.profileMissing) return NONE
  if (safety.level === "UNKNOWN") return NONE

  if (safety.level === "SAFE") return { level: "SAFE", note: null }

  // `CAUTION` / `RESTRICTED` — 갈 이유가 있으면 그것을, 없으면 이유를 말한다.
  if (safety.safeMenuCount > 0) {
    return {
      level: safety.level,
      note: { kind: "SAFE_MENU_COUNT", count: safety.safeMenuCount },
    }
  }
  const driver = dominantDriver(safety.driverCounts)
  return {
    level: safety.level,
    note: driver ? { kind: "DRIVER", driver } : null,
  }
}

/** 보조 배지의 i18n 키. 문구는 `common.json` 의 `restaurant.safety` 아래에 있다. */
export function cardSafetyNoteKey(note: CardSafetyNote): string {
  return note.kind === "SAFE_MENU_COUNT"
    ? "restaurant.safety.safeMenuCountBadge"
    : "restaurant.safety.driverBadge"
}

/* ── 판정 상태 (전국 확장의 전제) ──────────────────────────────────────── */

/**
 * 카드가 안전도에 대해 **어떤 상태**인가. 배지 슬롯(`cardSafetyBadges`)과 달리
 * "왜 배지가 없는가" 를 구분한다.
 *
 * ## 왜 지금 필요한가
 *
 * 오늘 데이터는 강남 376곳이고 **전부 메뉴 영양이 있다**(실측: 메뉴 2,013건 중 나트륨
 * 값이 있는 것 2,013건, 376곳 100% 커버). 그래서 "배지가 없다" 는 사실상 프로필 없음
 * 하나였고, 빈 자리로 두는 것이 정직했다.
 *
 * 장소 데이터를 전국으로 넓히면 그 전제가 뒤집힌다. 우리가 아직 메뉴를 모르는 가게가
 * **대다수**가 되고, 그때 빈 배지 자리는 정직한 것이 아니라 **아무 말도 하지 않는 것**이
 * 된다 — 사용자는 "이 앱이 확인한 곳" 과 "그냥 지도에 있는 곳" 을 구별할 수 없다.
 * 그 구별이 이 제품의 전부다.
 *
 * 그래서 `UNKNOWN` 을 둘로 가른다:
 *
 *  - `ANALYSIS_PENDING` — **메뉴를 아직 모른다**(`menuCount === 0`). 우리가 할 일이 남은
 *    상태이고, 사용자에게 줄 행동(메뉴 정보 제보)이 있다. 회색으로 **말한다.**
 *  - `UNJUDGED` — 메뉴는 아는데 판정이 안 선다(영양값 결측). 사용자가 할 수 있는 일이
 *    없으므로 종전대로 **비워 둔다**(헤더 §되돌리지 말 것).
 *
 * `SAFE` 로 승격하지 않는다는 규칙은 두 경우 모두 그대로다.
 */
export type CardSafetyState =
  | "JUDGED"
  | "PROFILE_MISSING"
  | "ANALYSIS_PENDING"
  | "UNJUDGED"

export function cardSafetyState(
  safety: RestaurantSafetyDto | null | undefined,
): CardSafetyState {
  // `safety` 자체가 없는 목록(저장한 곳)은 서버가 판정을 계산해 주지 않는 화면이다.
  // 그건 "분석 전" 이 아니라 "이 화면이 안 물어봤다" 이므로 제보를 권하지 않는다.
  if (!safety) return "UNJUDGED"
  if (safety.profileMissing) return "PROFILE_MISSING"
  if (safety.level !== "UNKNOWN") return "JUDGED"
  return safety.menuCount === 0 ? "ANALYSIS_PENDING" : "UNJUDGED"
}

/** `ANALYSIS_PENDING` 일 때만 회색 칩을 그린다. 화면이 조건을 다시 쓰지 않게 한다. */
export function showsAnalysisPendingChip(
  safety: RestaurantSafetyDto | null | undefined,
): boolean {
  return cardSafetyState(safety) === "ANALYSIS_PENDING"
}
