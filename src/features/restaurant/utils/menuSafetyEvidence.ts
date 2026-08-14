/**
 * 메뉴 안전도의 **근거**를 문장으로 만들 수 있는 모양으로 정리한다.
 *
 * ## 왜 필요한가
 *
 * 화면은 `제한` 배지 + `나트륨` + `추정` 세 조각만 보여 주고 있었다. 신장 환자가
 * 그 세 조각으로 할 수 있는 판단이 없다 — "얼마나 넘는지" 를 모르면 반만 먹을지,
 * 다른 메뉴를 고를지 정할 수 없다. 그래서 **서버가 이미 보내 준 값**으로
 * `나트륨 1,300mg · 한 끼 기준의 186%` 를 만든다.
 *
 * ## 없는 숫자를 만들지 않는다 (되돌리지 말 것)
 *
 * 여기 나오는 숫자는 전부 응답에 있는 값이다. `amount` 는 `menu.{sodium|potassium|
 * phosphorus|protein}`, 비율은 `menu.safetyRatio` 다. **한도(mg) 자체는 응답에 없다** —
 * `amount / safetyRatio` 로 역산하면 사용자 한도를 화면에 쓸 수 있지만, 그건 반올림된
 * 두 값의 나눗셈이라 프로필 화면의 목표량과 어긋난 숫자를 "당신의 기준" 이라고
 * 말하게 된다. 그래서 배수/백분율만 말한다.
 *
 * ## `safetyRatio` 는 하루가 아니라 **한 끼** 기준이다
 *
 * 서버의 `foodVerdict` 는 `mealBoundary = 하루 한도 × MEAL_FRACTION(0.35)` 로 나눈다
 * (`sinsin-be-bun/src/domains/reports/meal/verdict.ts`). 그래서 비율 1.0 은 하루치를
 * 넘긴 게 아니라 **한 끼 몫**을 넘긴 것이다. 앱 문구가 `내 하루 기준을 넘어요` 라고
 * 말하고 있었는데, 그건 실제보다 약 3배 심각하게 들리는 거짓말이다. 이 파일과 i18n
 * 문구는 전부 `한 끼 기준` 으로 맞춰져 있다 — 되돌리지 말 것.
 */

import type { MenuItemDto, SafetyDriver } from "../types"

/** 영양소 → 값을 읽을 응답 키와 단위. 서버 키에는 단위 접미사가 없다. */
const NUTRIENT_FIELD = {
  sodium: { field: "sodium", unit: "mg" },
  potassium: { field: "potassium", unit: "mg" },
  phosphorus: { field: "phosphorus", unit: "mg" },
  protein: { field: "protein", unit: "g" },
} as const satisfies Record<
  SafetyDriver,
  { field: keyof MenuItemDto; unit: "mg" | "g" }
>

/**
 * 크기는 **백분율 하나로만** 말한다. (2026-08-13, 배수 표기 폐지 — 되돌리지 말 것)
 *
 * 원래는 1.15 를 경계로 그 아래는 `114%`, 위는 `2.1배` 로 갈랐다. 경계를 둔 이유
 * 자체는 옳았다 — `1.02배` 를 소수 한 자리로 반올림하면 `1.0배` 가 되어 "딱 기준"
 * 처럼 읽힌다. 그런데 그 결과 **같은 목록 안에서 행마다 단위가 달라졌다**:
 * 800mg 행은 `114%`, 1500mg 행은 `2.1배`. 두 행을 비교하려면 머릿속에서 단위를
 * 환산해야 하고, 사용자가 실제로 "표기가 이상하다" 고 보고했다.
 *
 * 백분율로 통일하면 원래 걱정도 함께 해소된다 — `102%` 는 정보를 잃지 않는다.
 * 100% 미만(`64%`)도 자연스럽다("0.6배" 는 아니다). 식품 영양성분 표시가 쓰는
 * 단위이기도 하다. 배수가 더 체감된다는 이유로 경계를 되살리면 비교 불가능한
 * 목록이 그대로 돌아온다.
 */
export type MenuSafetyMagnitude =
  /** `64%` · `114%` · `214%`. `value` 는 정수 백분율이다. */
  { kind: "percent"; value: number }

export interface MenuSafetyEvidence {
  driver: SafetyDriver
  /** 응답에 있는 그대로의 값(반올림만). mg 또는 g. */
  amount: number
  unit: "mg" | "g"
  magnitude: MenuSafetyMagnitude
}

/**
 * 메뉴 한 건의 근거. 만들 수 없으면 `null` 이고, 그때 화면은 예전처럼 등급 문장만 쓴다.
 *
 * `null` 이 되는 경우: 판정이 `UNKNOWN`(기준 대비를 말할 수 없다) · 주도 영양소가 없다 ·
 * 비율이 없거나 0 이하다 · 그 영양소 값이 응답에 없다. 넷 다 "서버가 말하지 않은 것" 이므로
 * 앱이 채워 넣지 않는다.
 */
export function menuSafetyEvidence(
  menu: MenuItemDto,
): MenuSafetyEvidence | null {
  if (menu.safetyLevel === "UNKNOWN") return null

  const driver = menu.safetyDriver
  const ratio = menu.safetyRatio
  if (driver === null || ratio === null || !(ratio > 0)) return null

  const spec = NUTRIENT_FIELD[driver]
  const raw = menu[spec.field]
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return null

  return {
    driver,
    amount: Math.round(raw),
    unit: spec.unit,
    magnitude: { kind: "percent", value: Math.round(ratio * 100) },
  }
}

/**
 * 목록 전체의 신뢰도가 한 가지인가, 섞여 있는가.
 *
 * ## 매 행에 `추정` 을 붙이지 않기 위한 값이다
 *
 * 오늘 DB 의 메뉴 2013건은 **전부 `ESTIMATED`** 다. 그런 상태에서 행마다 `추정` 을
 * 붙이면 다섯 줄에 같은 단어가 다섯 번 찍혀 정보가 아니라 잡음이 된다. 그래서
 * 전부 같으면 목록 위에 **한 번만** 말하고, 섞여 있을 때만 행마다 표기한다 —
 * 표기가 필요한 순간은 값이 행마다 다를 때뿐이다.
 *
 * 상수로 `추정` 을 박지 않는 이유는 검수 데이터가 들어오는 날 문구가 저절로 바뀌어야
 * 하기 때문이다(프로토타입은 `'추정 기반'` 을 박아 두고 검수된 값에도 그렇게 말했다).
 */
export type MenuConfidenceMode = "ALL_ESTIMATED" | "ALL_VERIFIED" | "MIXED"

export function menuConfidenceMode(
  menus: readonly MenuItemDto[],
): MenuConfidenceMode | null {
  if (menus.length === 0) return null
  const verified = menus.filter((menu) => menu.confidence === "VERIFIED").length
  if (verified === 0) return "ALL_ESTIMATED"
  if (verified === menus.length) return "ALL_VERIFIED"
  return "MIXED"
}
