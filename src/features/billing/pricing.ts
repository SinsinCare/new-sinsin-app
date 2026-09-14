/**
 * 가격 환산 — **"하루 000원꼴"** 을 만드는 곳.
 *
 * ## 왜 계산하는가
 *
 * 마케팅 문구가 "하루 216원" 인데 스토어 가격이 바뀌면 그 숫자는 **거짓말이 된다.**
 * 그것도 조용히 — 아무도 안 깨지고 화면만 틀린 값을 보여 준다. 페이월의 할인율("-33%")을
 * 상수로 안 적은 것과 같은 이유다(`PaywallSheet` 머리말 §2).
 *
 * 그래서 일 환산은 **항상 스토어가 준 `price` 에서 나온다.** 숫자를 앱에 박지 않는다.
 *
 * ## 왜 `priceString` 을 갈아 끼우는가
 *
 * `Intl.NumberFormat` 으로 새로 만들면 통화 기호 위치·소수 자릿수가 스토어 표기와 달라져
 * **같은 화면에 두 가지 표기**가 생긴다(`₩9,900` 옆에 `KRW 330`). 스토어 문자열의 숫자
 * 부분만 바꾸면 그 문제가 없다.
 *
 * ## 기간을 며칠로 볼 것인가
 *
 * 월 30일·연 365일이다. 실제 달은 28~31일이라 "정확한" 값은 없고, **소비자에게 익숙한
 * 어림수**가 맞다. 중요한 것은 이 값이 한 곳에만 있다는 것이다 — 화면마다 다른 나눗셈을
 * 하면 같은 상품이 화면마다 다른 일 가격으로 보인다.
 */

import type { OfferingPackage } from "./purchases/purchasesClient"

/** RC 표준 키 → 하루 수. 여기 없는 주기는 일 환산을 안 한다(모르면 안 그린다). */
const DAYS_IN_PERIOD: Readonly<Record<string, number>> = {
  $rc_monthly: 30,
  $rc_annual: 365,
  $rc_two_month: 60,
  $rc_three_month: 90,
  $rc_six_month: 182,
  $rc_weekly: 7,
}

/**
 * 템플릿이 쓰는 소수 자릿수. `"$9.99"` → 2, `"₩9,900"` → 0.
 *
 * 마지막 점 뒤가 1~2자리일 때만 소수로 본다. `"9,900"` 의 쉼표나 `"1.234.567"`(유럽식
 * 자릿수 구분)을 소수로 오해하지 않기 위해서다.
 */
function decimalPlaces(numeric: string): number {
  const match = /[.,](\d{1,2})$/u.exec(numeric)
  return match?.[1]?.length ?? 0
}

/**
 * 스토어 가격 문자열의 **숫자 부분만** 갈아 끼운다.
 *
 * 통화 기호·자릿수 구분·기호 위치를 스토어 표기 그대로 유지하는 것이 목적이다.
 * 템플릿에 숫자가 없으면(있을 수 없지만) 숫자만 돌려준다 — 빈 문자열보다는 낫다.
 *
 * ## 소수 자릿수를 템플릿에서 가져오는 이유
 *
 * 처음에는 무조건 정수로 반올림했다. 원화(₩9,900 → ₩330)는 맞지만 **소수가 있는 통화는
 * 통째로 무너진다**: `$9.99 / 30 = 0.333` → 반올림 → **"하루 $0"**.
 *
 * 0원이라고 말하는 화면은 틀린 정도가 아니라 **거짓 광고**다. 그리고 이건 가정이 아니라
 * 지금 실제로 나가는 값이었다 — RevenueCat Test Store 의 기본 가격이 USD($9.99/$79.99)라,
 * 테스트 빌드를 켜면 곧바로 "하루 $0" 이 보였을 것이다(2026-08-26 실측).
 *
 * 더 나빴던 것은 **이 동작이 테스트에 정답으로 박혀 있었다**는 점이다
 * (`expect(formatLikePrice("$9.99", 0.33)).toBe("$0")`). 버그를 오라클에 새기면
 * 테스트가 통과할수록 틀린 화면이 굳는다.
 */
export function formatLikePrice(template: string, value: number): string {
  const numeric = /[\d.,]+/u.exec(template)?.[0] ?? ""
  const places = decimalPlaces(numeric)
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  })
  const replaced = template.replace(/[\d.,]+/u, formatted)
  return replaced === template ? formatted : replaced
}

/**
 * 하루 얼마꼴인가. 계산할 수 없으면 **null** 이다.
 *
 * null 을 0 이나 "-" 로 바꾸지 않는다 — 모르는 값을 그럴듯하게 그리면 사용자가 그것을
 * 사실로 읽는다. 부르는 쪽이 그 줄을 통째로 안 그려야 한다.
 */
export function perDayPrice(pkg: OfferingPackage): string | null {
  const days = DAYS_IN_PERIOD[pkg.lookupKey]
  if (days === undefined || !Number.isFinite(pkg.price) || pkg.price <= 0)
    return null
  return formatLikePrice(pkg.priceString, pkg.price / days)
}

export interface CheapestPerDay {
  readonly text: string
  readonly pkg: OfferingPackage
}

/**
 * **가장 싼 일 가격.** 마케팅 후킹이 쓰는 값이다("하루 216원이면 무제한").
 *
 * 가장 싼 것을 고르는 이유: 후킹은 "이 정도면 부담 없다"를 말하는 자리이고, 그 문장에
 * 월간 요금(330원)을 넣으면 연간(216원)이 있는데도 더 비싸 보인다. 실제로 결제 화면에서
 * 둘 다 보여 주므로 과장이 아니다.
 *
 * 상품을 못 가져왔거나(오프라인·미설정) 주기를 모르면 **null** 이다 —
 * 그때 화면은 가격 줄을 빼고 CTA 만 그린다.
 */
export function cheapestPerDay(
  packages: readonly OfferingPackage[],
): CheapestPerDay | null {
  let best: { perDay: number; pkg: OfferingPackage } | null = null
  for (const pkg of packages) {
    const days = DAYS_IN_PERIOD[pkg.lookupKey]
    if (days === undefined || !Number.isFinite(pkg.price) || pkg.price <= 0)
      continue
    const perDay = pkg.price / days
    if (best === null || perDay < best.perDay) best = { perDay, pkg }
  }
  if (best === null) return null
  const text = formatLikePrice(best.pkg.priceString, best.perDay)
  return { text, pkg: best.pkg }
}
