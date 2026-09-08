# Account tab and settings refresh

Scope: compact account overview, discoverable settings entry, grouped settings with summarized preferences, and reliable return paths. Preserve health values, privacy/notification consent, billing and account actions.

- [x] A1: Account and settings routes preserve every existing destination, clearly distinguish profile editing and app settings, and return to the originating screen.
  EVIDENCE: Source route audit and Simulator account/settings/profile/privacy/back checks documented in REVIEW.md; all existing destination paths retained and legal links now target their documents.

- [x] A2: Preference selection, async locks, cancel/back behavior and notification consent remain correct; no preference is written merely by opening or closing a selector.
  CHECK: npx jest --runInBand tests/settingsPreferences.test.ts tests/settingsNotifications.test.ts tests/settingsI18n.test.ts tests/tabReset.test.ts
  EXPECT: 40 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.9 s, estimated 1 s | Ran all test suites matching /tests\/settingsPreferences.test.ts|tests\/settingsNotifications.test.ts|tests\/settingsI18n.test.ts|tests\/tabReset.test.ts/i.

- [x] A3: Typecheck, changed-file lint, focused regression checks and copy audit pass.
  CHECK: npx tsc --noEmit && npx eslint 'app/(settings)/_layout.tsx' src/features/settings/views/MyPageScreen.tsx src/features/settings/views/SettingsScreen.tsx src/features/settings/components/Account*.tsx src/features/settings/hooks/useSettingsScreen.ts src/features/settings/hooks/useHealthSummaryShare.ts src/hooks/useNotifications.ts tests/settingsNotifications.test.ts tests/settingsPreferences.test.ts && npm run audit:ux-copy > /tmp/account-copy-final.log && printf 'ACCOUNT_STATIC_OK\n'
  EXPECT: ACCOUNT_STATIC_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=ACCOUNT_STATIC_OK

- [x] A4: Mobbin references and design decisions documented; native account -> settings -> child -> back, selectors, light/dark layout, scroll and cancel flows inspected with screenshots. No account deletion, logout, purchase or notification consent is submitted during QA.
  EVIDENCE: Mobbin screen/flow references and inspected native captures in REVIEW.md. Profile, privacy, selection cancel, theme, account return, scroll and logout-cancel exercised; no destructive or consent submission. Platform and font-scale limits stated explicitly.
