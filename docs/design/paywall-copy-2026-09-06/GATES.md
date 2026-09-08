# Gates: Paywall message and subscription action

Scope: Replace literal daily-cost wording with benefit-led Korean copy, clarify plan prices and actual subscription CTA, and carry the same message into the account entry card. Preserve product prices, entitlement policy, legal copy and purchase behavior.

- [x] C1: Updated screen components typecheck, lint and existing billing tests pass; Korean copy audit reviewed.
  EVIDENCE: TypeScript and owned ESLint exit 0; Jest 6 suites / 55 tests passed; Korean audit reviewed (12 unrelated candidates).
- [ ] C2: Native account entry, annual/monthly headline and CTA, close, dark mode and accessibility-medium layouts inspected; baseline preferences restored.
  EVIDENCE: Final light account and annual paywall inspected and captured. CUA interrupted the monthly action twice because the user was operating Simulator. Further navigation, mode and font changes were stopped; monthly/dark/accessibility-medium re-verification remains incomplete. No preference changes performed this turn.
- [x] C3: Mobbin references, implemented copy and actual validation evidence recorded.
  EVIDENCE: REVIEW.md, account-light.png, paywall-annual-light.png.
