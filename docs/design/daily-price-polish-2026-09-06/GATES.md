# Gates: Daily value and account detail polish

OWNS: src/features/billing/hooks/useAccountDailyPrice.ts, src/features/billing/paywallPresentation.ts, src/features/billing/components/PaywallPlanOption.tsx, src/features/billing/components/PaywallSheet.tsx, src/features/settings/components/AccountMembershipCard.tsx, src/features/settings/components/AccountHealthSummary.tsx, src/features/settings/views/MyPageScreen.tsx, src/i18n/locales/{ko,en}/billing.json, tests/billingPresentation.test.ts, tests/billingDailyPrice.test.ts, docs/design/daily-price-polish-2026-09-06/**

Scope: Emphasize actual per-day equivalent pricing with its billing basis; refine account hierarchy without changing navigation or purchase contracts.

- [x] P1: Price selection, supported offerings, stale-account guards, and existing purchase behavior pass.
  CHECK: npx jest --runInBand tests/billingPricing.test.ts tests/billingPresentation.test.ts tests/billingDailyPrice.test.ts tests/billingController.test.ts tests/billingRestore.test.ts tests/billingPaywall.test.ts && node -e "console.log('DAILY_PRICE_TESTS_OK')"
  EXPECT: DAILY_PRICE_TESTS_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        2.107 s | Ran all test suites matching /tests\/billingPricing.test.ts|tests\/billingPresentation.test.ts|tests\/billingDailyPrice.test.ts|tests\/billingController.test.ts|tests\/billingRestore.test.ts|tests\/billingPaywall.test

- [x] P2: Owned changes typecheck and lint.
  CHECK: npx tsc --noEmit && npx eslint src/features/billing/hooks/useAccountDailyPrice.ts src/features/billing/paywallPresentation.ts src/features/billing/components/PaywallPlanOption.tsx src/features/billing/components/PaywallSheet.tsx src/features/settings/components/AccountMembershipCard.tsx src/features/settings/components/AccountHealthSummary.tsx src/features/settings/views/MyPageScreen.tsx tests/billingPresentation.test.ts tests/billingDailyPrice.test.ts && node -e "console.log('DAILY_PRICE_STATIC_OK')"
  EXPECT: DAILY_PRICE_STATIC_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=DAILY_PRICE_STATIC_OK

- [x] P3: Native account/paywall daily price and total charge stay aligned across plan selections, light/dark and larger text. References and captures recorded.
  EVIDENCE: REVIEW.md and eight native screenshots; annual US$79.99 / 365 = US$0.22, monthly US$9.99 / 30 = US$0.33; selection updates header, basis, total charge; light/dark and accessibility-medium inspected; no purchase or restore performed.
