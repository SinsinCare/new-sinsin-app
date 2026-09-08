import {
  annualSavings,
  accountDailyPrice,
} from "../src/features/billing/paywallPresentation"
import type { OfferingPackage } from "../src/features/billing/purchases/purchasesClient"
function pkg(
  price: number,
  extra: Partial<OfferingPackage> = {},
): OfferingPackage {
  return {
    id: "test",
    lookupKey: "$rc_annual",
    price,
    priceString: `$${price}`,
    currencyCode: "USD",
    title: "",
    description: "",
    productId: "test",
    introOffer: null,
    raw: {} as OfferingPackage["raw"],
    ...extra,
  }
}
const monthly = pkg(9.99, { lookupKey: "$rc_monthly" })
test("annual savings compare actual prices", () => {
  expect(annualSavings(pkg(79.99), monthly)).toBe(33)
  expect(annualSavings(pkg(120), monthly)).toBeNull()
})
test("missing comparison, mixed currencies and invalid prices cannot advertise a discount", () => {
  expect(annualSavings(pkg(79.99), null)).toBeNull()
  expect(annualSavings(pkg(79.99, { currencyCode: "KRW" }), monthly)).toBeNull()
  for (const price of [0, -1, NaN, Infinity]) {
    expect(annualSavings(pkg(price), monthly)).toBeNull()
    expect(annualSavings(pkg(79.99), pkg(price))).toBeNull()
  }
  expect(annualSavings(monthly, monthly)).toBeNull()
})

describe("account daily quote matches the paywall", () => {
  test("annual is the default even if another duration has a lower daily rate", () => {
    const annual = pkg(79.99)
    const cheapMonthly = pkg(1, { lookupKey: "$rc_monthly" })
    const unsupported = pkg(0.1, { lookupKey: "$rc_weekly" })
    expect(accountDailyPrice([unsupported, cheapMonthly, annual])).toEqual({
      text: "$0.22",
      pkg: annual,
    })
  })
  test("monthly fallback uses 30 days, unsupported and invalid prices stay unknown", () => {
    expect(accountDailyPrice([monthly])).toEqual({
      text: "$0.33",
      pkg: monthly,
    })
    expect(accountDailyPrice([pkg(1, { lookupKey: "$rc_weekly" })])).toBeNull()
    expect(accountDailyPrice([pkg(NaN), monthly])).toBeNull()
    expect(accountDailyPrice([])).toBeNull()
  })
})
