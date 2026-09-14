/**
 * 안전도 배지의 색·라벨 결정. `SafetyLevel` → `{ labelKey, bg, fg }` 한 곳.
 *
 * ## 왜 DESIGN_SPEC 의 hex 를 그대로 쓰지 않았나
 *
 * 스펙에 적힌 `#FEE2E2/#DC2626`(제한), `#FEF3C7/#B45309`(주의), `#D1FAE5/#059669`(안전)은
 * **목업 이미지에서 눈으로 뽑은 값**이다. 그걸 코드에 박으면 다크모드에서 그대로 남아
 * 검은 배경에 파스텔 배지가 뜨고, 브랜드 톤이 바뀔 때 따라오지 않는다.
 * 그래서 v2 시맨틱 토큰 중 **가장 가까운 것**으로 치환했다. 어떤 토큰을 골랐는지 아래에 남긴다.
 *
 * | 등급 | 목업 관측값 | 고른 토큰 | 라이트 실측값 | 왜 이걸 골랐나 |
 * |---|---|---|---|---|
 * | 제한 | `#DC2626` on `#FEE2E2` | `status.negative` / `accentForeground.redWeak` | `#ff4242` / `#ff636329` | 전경은 채도 높은 적색이 필요해 `status.negative`(경고 정본), 배경은 같은 계열의 알파 배경이 `redWeak` 뿐이다. `accentForeground.red`(#ff6363)는 흰 배경에서 대비가 모자란다. |
 * | 주의 | `#B45309` on `#FEF3C7` | `accentForeground.orange` / `accentForeground.orangeWeak` | `#9c5800` / `#ff920029` | `#B45309`(amber-700) 에 가장 가까운 토큰이 `#9c5800` 이다. `status.cautionary`(#ffa938)를 전경으로 쓰면 흰 배경에서 읽히지 않는다 — 그건 **면**에 쓰는 색이다. |
 * | 안전 | `#059669` on `#D1FAE5` | `accentForeground.green` / `accentForeground.greenWeak` | `#02a262` / `#02a26229` | `#059669` 와 `#02a262` 는 육안으로 구분되지 않는다. `status.positive`(#03b26c)보다 이쪽이 어둡고 흰 배경에서 더 안전한 대비를 준다. |
 * | 정보 없음 | 배지 없음 | `fill.normal` / `label.neutral` | `#70737c14` / `#2e2f33b2` | 중립 회색. **초록으로 승격하지 않는다.** |
 *
 * ## 되돌리지 말 것
 *
 * `UNKNOWN` 은 기본적으로 **배지를 그리지 않는다**(`safetyBadge()` 가 `null`). 미판정을
 * `안전` 으로 표시하는 방향의 오류가 신장 환자에게 가장 위험하다. 자리를 비우면 안 되는
 * 문맥(메뉴 행처럼 배지 열이 정렬돼야 하는 곳)에서는 `safetyBadgeOrUnknown()` 으로
 * `정보 없음` 회색 배지를 명시적으로 요청한다 — 기본값이 되지 않게 함수를 따로 뒀다.
 */

import type { SemanticColors } from "@/src/design-system-v2"

import type { SafetyLevel } from "../types"

export interface SafetyBadgeStyle {
  level: SafetyLevel
  /** `restaurant.safety.<level>` */
  labelKey: string
  bg: string
  fg: string
}

function styleFor(
  level: SafetyLevel,
  colors: SemanticColors,
): SafetyBadgeStyle {
  switch (level) {
    case "RESTRICTED":
      return {
        level,
        labelKey: "restaurant.safety.RESTRICTED",
        bg: colors.accentForeground.redWeak,
        fg: colors.status.negative,
      }
    case "CAUTION":
      return {
        level,
        labelKey: "restaurant.safety.CAUTION",
        bg: colors.accentForeground.orangeWeak,
        fg: colors.accentForeground.orange,
      }
    case "SAFE":
      return {
        level,
        labelKey: "restaurant.safety.SAFE",
        // 안전은 그레이스케일 — 색은 주의·제한처럼 눈이 가야 할 곳에만 쓴다(제품 결정 2026-09-11).
        bg: colors.fill.normal,
        fg: colors.label.neutral,
      }
    case "UNKNOWN":
    default:
      return {
        level: "UNKNOWN",
        labelKey: "restaurant.safety.UNKNOWN",
        bg: colors.fill.normal,
        fg: colors.label.neutral,
      }
  }
}

/**
 * 배지 스타일. `UNKNOWN` 이면 `null` — 호출부는 배지를 아예 그리지 않는다.
 * 색만으로 뜻을 전하지 않기 위해 `labelKey` 를 항상 함께 그려야 한다(접근성 요건).
 */
export function safetyBadge(
  level: SafetyLevel,
  colors: SemanticColors,
): SafetyBadgeStyle | null {
  if (level === "UNKNOWN") return null
  return styleFor(level, colors)
}

/**
 * `UNKNOWN` 도 `정보 없음` 회색 배지로 받는다. 메뉴 목록처럼 배지 열이 세로로
 * 정렬돼야 해서 자리를 비울 수 없는 곳에서만 쓴다.
 */
export function safetyBadgeOrUnknown(
  level: SafetyLevel,
  colors: SemanticColors,
): SafetyBadgeStyle {
  return styleFor(level, colors)
}

/*
  ## `safetyMarkerColor()` 는 없다 (일부러 지웠다)
  등급별 마커 링 색을 돌려주던 함수가 여기 있었지만 호출부가 하나도 없었다. 목업
  (-2/-5/-7)의 마커는 등급과 무관하게 전부 같은 브랜드 주황 링이고, 그게 맞다 — 지도에
  빨강·노랑·초록 점을 흩뿌리면 "어느 색이 가도 되는 곳인가" 를 색만으로 판단하게 되는데
  그 판단은 식당 단위로 성립하지 않는다(한 식당에 제한 메뉴와 안전 메뉴가 함께 있다).
  마커의 등급은 스크린리더 라벨로만 나간다(`map/mapBridge.ts` 의 `MapStrings`).
  쓰이지 않는 함수를 남겨 두면 브릿지 계약이 있지도 않은 동작을 약속하게 된다.

  `safetyDriverLabelKey()` / `safetyAccessibilityKeys()` 도 같은 이유로 지웠다 — 근거
  영양소 키는 화면(`SafetyBadge`·`RestaurantCard`)이 `restaurant.safety.driver.<driver>` 를
  직접 조립하고 있었고, 두 헬퍼는 테스트만 부르고 있었다.
*/
