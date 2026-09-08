import { perDayPrice } from "./pricing"
import type { OfferingPackage } from "./purchases/purchasesClient"

/** Compare the same currency and valid prices only. Unknown savings stay unknown. */
export function annualSavings(
  annual: OfferingPackage,
  monthly: OfferingPackage | null,
): number | null {
  if (
    annual.lookupKey !== "$rc_annual" ||
    !monthly ||
    annual.currencyCode !== monthly.currencyCode ||
    !Number.isFinite(annual.price) ||
    !Number.isFinite(monthly.price) ||
    annual.price <= 0 ||
    monthly.price <= 0
  )
    return null
  const percent = Math.round((1 - annual.price / (monthly.price * 12)) * 100)
  return percent > 0 && percent < 100 ? percent : null
}

/** Match the paywall's default selection so the teaser and first price agree. */
export function accountDailyPrice(packages: readonly OfferingPackage[]) {
  const pkg =
    packages.find((item) => item.lookupKey === "$rc_annual") ??
    packages.find((item) => item.lookupKey === "$rc_monthly")
  if (!pkg) return null
  const text = perDayPrice(pkg)
  return text ? { text, pkg } : null
}
