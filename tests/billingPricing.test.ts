/**
 * 가격 환산 — **마케팅 숫자가 거짓말할 수 없게** 하는 검사.
 *
 * "하루 216원" 은 화면에 크게 나가는 문구다. 그런데 이런 숫자는 틀려도 아무것도 안
 * 깨진다 — 그냥 조용히 틀린 값이 보인다. 그래서 재는 것이 둘이다:
 *
 *   1. **계산이 맞는가** — 실제 가격표(9,900/월 · 79,000/년)로 검산한다.
 *   2. **모를 때 안 그리는가** — 주기를 모르거나 가격이 0 이면 `null` 이어야 한다.
 *      여기서 0 이나 "-" 를 돌려주면 화면이 그것을 사실처럼 그린다.
 */
import {
  cheapestPerDay,
  formatLikePrice,
  perDayPrice,
} from "@/src/features/billing/pricing"
import type { OfferingPackage } from "@/src/features/billing/purchases/purchasesClient"
import en from "@/src/i18n/locales/en/billing.json"
import ko from "@/src/i18n/locales/ko/billing.json"

function pkg(over: Partial<OfferingPackage>): OfferingPackage {
  return {
    id: "p",
    lookupKey: "$rc_monthly",
    priceString: "₩9,900",
    price: 9_900,
    currencyCode: "KRW",
    productId: "prod",
    title: "월간",
    description: "",
    introOffer: null,
    raw: {} as OfferingPackage["raw"],
    ...over,
  }
}

describe("실제 가격표로 검산", () => {
  test("월 9,900원 → 하루 330원", () => {
    expect(perDayPrice(pkg({}))).toBe("₩330")
  })

  test("연 79,000원 → 하루 216원", () => {
    expect(
      perDayPrice(
        pkg({ lookupKey: "$rc_annual", priceString: "₩79,000", price: 79_000 }),
      ),
    ).toBe("₩216")
  })
})

describe("가장 싼 일 가격 — 후킹이 쓰는 값", () => {
  const monthly = pkg({})
  const annual = pkg({
    id: "a",
    lookupKey: "$rc_annual",
    priceString: "₩79,000",
    price: 79_000,
  })

  test("연간이 더 싸므로 연간을 고른다", () => {
    const best = cheapestPerDay([monthly, annual])
    expect(best?.text).toBe("₩216")
    expect(best?.pkg.id).toBe("a")
  })

  test("순서가 바뀌어도 같은 답", () => {
    expect(cheapestPerDay([annual, monthly])?.text).toBe("₩216")
  })

  test("월간만 있으면 월간으로 답한다", () => {
    expect(cheapestPerDay([monthly])?.text).toBe("₩330")
  })
})

describe("모를 때는 안 그린다 — null 이 계약이다", () => {
  test("상품이 없으면 null", () => {
    expect(cheapestPerDay([])).toBeNull()
  })

  test("모르는 주기는 환산하지 않는다", () => {
    expect(perDayPrice(pkg({ lookupKey: "$rc_lifetime" }))).toBeNull()
    expect(cheapestPerDay([pkg({ lookupKey: "$rc_custom" })])).toBeNull()
  })

  test("가격이 0 이거나 음수면 null — 무료로 오해될 값을 만들지 않는다", () => {
    expect(perDayPrice(pkg({ price: 0 }))).toBeNull()
    expect(perDayPrice(pkg({ price: -1 }))).toBeNull()
  })

  test("가격이 유한하지 않으면 null", () => {
    expect(perDayPrice(pkg({ price: Number.NaN }))).toBeNull()
    expect(perDayPrice(pkg({ price: Number.POSITIVE_INFINITY }))).toBeNull()
  })

  test("아는 주기와 모르는 주기가 섞이면 **아는 것만** 본다", () => {
    const known = pkg({
      id: "k",
      lookupKey: "$rc_annual",
      priceString: "₩79,000",
      price: 79_000,
    })
    const unknown = pkg({ id: "u", lookupKey: "$rc_weird", price: 1 })
    expect(cheapestPerDay([unknown, known])?.pkg.id).toBe("k")
  })
})

describe("스토어 표기를 그대로 따른다", () => {
  test("통화 기호와 위치를 유지한다 — 같은 화면에 두 표기가 생기면 안 된다", () => {
    expect(formatLikePrice("₩9,900", 330)).toBe("₩330")
    expect(formatLikePrice("9,900원", 330)).toBe("330원")
  })

  test("**소수가 있는 통화는 자릿수를 지킨다** — 반올림하면 '하루 $0' 이 된다", () => {
    /*
      이건 가정이 아니라 실측이다. RevenueCat Test Store 의 기본 가격이 USD 라
      ($9.99/월 · $79.99/년), 정수 반올림이던 시절에는 테스트 빌드에서 곧바로
      "하루 $0" 이 보였다. 0원이라고 말하는 화면은 틀린 게 아니라 거짓 광고다.

      더 나빴던 것은 그 동작이 **이 파일에 정답으로 박혀 있었다**는 점이다
      (`toBe("$0")`). 버그를 오라클에 새기면 통과할수록 틀린 화면이 굳는다.
    */
    expect(formatLikePrice("$9.99", 9.99 / 30)).toBe("$0.33")
    expect(formatLikePrice("$79.99", 79.99 / 365)).toBe("$0.22")
    expect(formatLikePrice("US$ 9.99", 0.9)).toBe("US$ 0.90")
    expect(formatLikePrice("€9,99", 0.33)).toBe("€0.33")
  })

  test("소수가 없는 통화는 정수로 남는다 — 없던 소수를 만들지 않는다", () => {
    expect(formatLikePrice("₩79,000", 79_000 / 365)).toBe("₩216")
    expect(formatLikePrice("￥1,200", 40)).toBe("￥40")
  })

  test("자릿수 구분을 다시 넣는다", () => {
    expect(formatLikePrice("₩9,900", 6_583)).toBe("₩6,583")
  })

  test("숫자가 없는 템플릿이면 숫자만 돌려준다 — 빈 문자열보다 낫다", () => {
    expect(formatLikePrice("무료", 330)).toBe("330")
  })
})

/*
  ── 문구 계약 ────────────────────────────────────────────────────────────

  i18n 키가 빠지면 화면에 `plan.currentLabel` 같은 **raw key 가 그대로 보인다.**
  타입 체크는 ko 카탈로그만 보므로 en 이 빠진 것은 못 잡는다 — 그래서 두 언어를 다 센다.

  보간 키(`{{price}}`·`{{date}}`)도 확인한다. 빠지면 문구는 나오는데 숫자가 사라져
  "하루 으로 무제한" 같은 문장이 된다 — 오류가 아니라 그냥 이상한 화면이다.
*/
describe("구독 카드 문구가 두 언어에 다 있다", () => {
  const CATALOGS = [["ko", ko] as const, ["en", en] as const]

  test.each(CATALOGS)("%s 에 카드 문구가 전부 있다", (_lang, catalog) => {
    for (const value of [
      catalog.plan.currentLabel,
      catalog.plan.manage,
      catalog.plan.upgradeCta,
      catalog.plan.renewsOn,
      catalog.plan.activeUntil,
      catalog.plan.perDayHook,
    ]) {
      expect(typeof value).toBe("string")
      expect(value.length).toBeGreaterThan(0)
    }
  })

  test.each(CATALOGS)("%s 에 플랜 이름 세 개가 다 있다", (_lang, catalog) => {
    expect(Object.keys(catalog.plan.name).sort()).toEqual([
      "care_plus",
      "free",
      "premium",
    ])
  })

  test.each(CATALOGS)("%s 에 상태 배지가 있다", (_lang, catalog) => {
    expect(Object.keys(catalog.plan.badge).sort()).toEqual([
      "active",
      "cancelled",
    ])
  })

  test.each(CATALOGS)("%s 의 보간 키가 살아 있다", (_lang, catalog) => {
    // 빠지면 "하루 으로 무제한" 이 된다 — 오류는 안 나고 화면만 이상해진다.
    expect(catalog.plan.perDayHook).toContain("{{price}}")
    expect(catalog.plan.renewsOn).toContain("{{date}}")
    expect(catalog.plan.activeUntil).toContain("{{date}}")
    expect(catalog.paywall.perDay).toContain("{{price}}")
  })

  test.each(CATALOGS)(
    "%s 후킹 문구에 가격을 **박아 두지 않았다**",
    (_lang, catalog) => {
      /*
      "하루 216원" 을 문구에 적으면 스토어 가격이 바뀌는 날 조용히 거짓말이 된다.
      숫자는 언제나 `pricing.ts` 가 계산해서 넣는다.
    */
      expect(catalog.plan.perDayHook).not.toMatch(/\d/u)
    },
  )
})
