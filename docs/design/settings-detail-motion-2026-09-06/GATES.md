# Gates: Settings details and swelling disclosure

OWNS: app/(settings)/_layout.tsx, src/features/settings/components/SettingsFormActions.tsx, tests/surfaceLadderGuard.test.ts, src/features/settings/components/SettingsDetailHeader.tsx, src/features/home/components/record/pages/EdemaRecordPage.tsx, src/features/home/hooks/useEdemaRecordForm.ts, src/design-system-v2/components/V2Disclosure.tsx, src/design-system-v2/components/index.ts, src/features/billing/views/SubscriptionScreen.tsx, src/features/billing/hooks/useSubscriptionScreen.ts, src/features/billing/subscriptionPresentation.ts, src/features/settings/components/SettingsTextField.tsx, src/features/settings/components/settingsDetailSpec.ts, src/features/settings/hooks/useSettingsColors.ts, src/features/settings/views/**, app/(settings)/app-info.tsx, app/(settings)/legal-document.tsx, src/i18n/locales/{ko,en}/billing.json, tests/healthRecordForms.test.ts, tests/billingRestore.test.ts, tests/subscription*.test.ts, docs/design/settings-detail-motion-2026-09-06/**

Scope: Reversible, measured swelling disclosure; compact and consistent settings detail hierarchy beginning with subscription, profile editors, notification settings, app/legal and withdrawal paths. Preserve domain mutations and legal text.

- [x] S1: Swelling form preserves draft area details when toggling none; billing display and action edge cases pass.
  CHECK: npx jest --runInBand tests/healthRecordForms.test.ts tests/subscriptionPresentation.test.ts tests/subscriptionScreen.test.ts tests/billingRestore.test.ts tests/settingsI18n.test.ts tests/settingsNotifications.test.ts tests/settingsPreferences.test.ts && node -e "console.log('SETTINGS_BEHAVIOR_OK')"
  EXPECT: SETTINGS_BEHAVIOR_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        1.102 s | Ran all test suites matching /tests\/healthRecordForms.test.ts|tests\/subscriptionPresentation.test.ts|tests\/subscriptionScreen.test.ts|tests\/billingRestore.test.ts|tests\/settingsI18n.test.ts|tests\/settingsNotific
- [x] S2: Changed TypeScript code typechecks; owned lint and copy audit reviewed.
  CHECK: npx tsc --noEmit && node -e "console.log('SETTINGS_TYPES_OK')"
  EXPECT: SETTINGS_TYPES_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=SETTINGS_TYPES_OK
- [x] S3: Native swelling hide/show/reversal, settings subscription and direct detail navigation visually inspected with screenshots; layout and accessibility concerns resolved.
  EVIDENCE: iPhone 17 Pro/iOS 26.5 local TEST; swelling-toggle.mp4 and swelling-restored.png verify repeated hide/show with retained ankle/severity/pitting and hidden AX descendants. Subscription, profile editors, notifications, app info, legal and withdrawal navigation inspected in screenshots listed in REVIEW.md. Large-text keyboard/footer and dark subscription/legal inspected. Original large text and Light theme restored; no data/store/deletion submitted.
- [x] S4: Reference and final per-surface changes documented with exact verification limits.
  EVIDENCE: REVIEW.md includes five viewed Mobbin references, final per-surface changes, native evidence, paid/store/Reduce Motion/performance verification limits, and the five unrelated historical lightContrastAudit expectations. All runnable gates reverified in gate-final.log; owned ESLint and git diff --check exited zero.
