# Gates: Account and premium refinement

OWNS: src/features/settings/views/MyPageScreen.tsx, src/features/settings/components/AccountHealthSummary.tsx, src/features/settings/components/AccountMembershipCard.tsx, src/features/settings/components/AccountOverviewActions.tsx, src/features/billing/components/Paywall*.tsx, src/features/billing/hooks/usePaywallController.ts, src/features/billing/paywallPresentation.ts, src/i18n/locales/{ko,en}/{settings,billing}.json, tests/billingRestore.test.ts, tests/billingPresentation.test.ts, tests/billingController.test.ts, docs/design/account-paywall-refinement-2026-09-06/**

Scope: Restore a compact but richer account overview and redesign the live-offering paywall without changing entitlement or purchase contracts.

- [x] G1: Billing pricing, restoration and asynchronous paywall behavior pass focused regressions.
  CHECK: npx jest --runInBand tests/billingPricing.test.ts tests/billingRestore.test.ts tests/billingPaywall.test.ts tests/billingPresentation.test.ts tests/billingController.test.ts && node -e "console.log('ACCOUNT_BILLING_TESTS_OK')"
  EXPECT: ACCOUNT_BILLING_TESTS_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.753 s, estimated 1 s | Ran all test suites matching /tests\/billingPricing.test.ts|tests\/billingRestore.test.ts|tests\/billingPaywall.test.ts|tests\/billingPresentation.test.ts|tests\/billingController.test.ts/i.

- [x] G2: Type checking and owned-file lint complete.
  CHECK: npx tsc --noEmit && npx eslint src/features/settings/views/MyPageScreen.tsx src/features/settings/components/AccountHealthSummary.tsx src/features/settings/components/AccountMembershipCard.tsx src/features/settings/components/AccountOverviewActions.tsx src/features/billing/components/PaywallSheet.tsx src/features/billing/components/PaywallPlanOption.tsx src/features/billing/hooks/usePaywallController.ts src/features/billing/paywallPresentation.ts tests/billingPresentation.test.ts tests/billingController.test.ts && node -e "console.log('ACCOUNT_PAYWALL_STATIC_OK')"
  EXPECT: ACCOUNT_PAYWALL_STATIC_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=ACCOUNT_PAYWALL_STATIC_OK

- [x] G3: Native light/dark account, health-details/settings returns and paywall plan-selection/close remain coherent and readable; large-text paywall scroll retains purchase controls.
  EVIDENCE: Native iPhone 17 Pro iOS 26.5 interactions and before/after captures documented in REVIEW.md; light/dark, accessibility-medium plan access, price update, health-details/settings returns and close verified.

- [x] G4: Mobbin comparison and final copy/pricing/unknown-state review are documented with before/after screenshots.
  EVIDENCE: REVIEW.md documents inspected Mobbin screenshots, final information hierarchy, prices from live TEST offerings, copy review and the boundary between unit tests and native evidence.
