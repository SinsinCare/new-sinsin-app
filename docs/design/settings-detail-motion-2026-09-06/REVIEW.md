# Settings details and swelling disclosure — 2026-09-06

## Reference decisions

Mobbin screens actually reviewed in this task:
- [GoodRx membership](https://mobbin.com/screens/861fcb60-41c2-4ef7-934d-ba8d35fa0d33): compact current-plan metadata, grouped billing and management rows.
- [Wolt membership](https://mobbin.com/screens/84d78750-3352-4fc8-b0c9-0f945552d611): status before management action, benefits below the plan information.
- [Kit membership](https://mobbin.com/screens/83ee5b3d-d542-4a95-bb45-55464cc16020): billing facts separated from the membership headline. Trial claims were not borrowed.
- [Toss settings](https://mobbin.com/screens/aa5f853e-b80b-457b-8bfe-15eae0b191a0), [security/general settings](https://mobbin.com/screens/01b538a7-41b2-4a7a-a85d-abd8af9f931d): small section labels, compact rows, restrained secondary text and clear groups. These are settings references, not an exact profile-editor clone.

## Changes

- **Swelling:** measured 260 ms height transition and 140/200 ms fade, Reanimated UI thread, OS Reduce Motion support. Hidden details remain mounted to preserve each area draft, cannot be tapped or traversed with accessibility. The none selection is reversible, retaining the active area, severity and pitting; only successful NONE save clears observations. History and the fixed save action remain outside the disclosure.
- **Subscription:** fixed header and one safe-area inset; current plan, available features/remaining quota, management/upgrade, then restoration. Values come from server capabilities, including recorded zero. Missing data stays unknown. Care Plus retains its plan name; dates support server and ISO formats. Restore/management share a synchronous operation lock; failures, empty restore, cancellation, late account responses and unmount have separate outcomes. No actual purchase or restore was executed in QA.
- **Profile:** plain detail surface, 72 pt avatar, 13 pt group labels, 15 pt rows, aligned trailing values, wrapping gender controls.
- **Name/nickname/phone/password:** shared 20 pt title and form spacing; readable descriptions; growing input containers. A dedicated keyboard-dismiss/save row replaces the overlapping global keyboard toolbar. The password form also resizes around the keyboard; the final confirmation field scrolls into view.
- **Notifications:** shared fixed header, semantic switches/surfaces, compact section labels and readable help. Consent behavior is preserved.
- **App info/legal/withdrawal:** shared header and semantic text contrast. App info uses the current app icon, aligned support metadata and a compact company footer. Legal content moved to a feature view; both legal strings are byte-identical to HEAD. Withdrawal reasons have visible radio controls and accessible selected states; only Other reveals the retained optional text field. All existing steps and destructive confirmations remain.
- **Shared detail header:** theme-aware status bar is reapplied on focus and keyboard transitions; this resolves the clock becoming unreadable after a keyboard round trip. Native-stack statusBarStyle was tested and removed because this app uses imperative status-bar management.

## Validation

- Behavioral suite: 41/41 (swelling draft restoration, quota/date presentation, async restore/manage, settings preferences/notifications/i18n).
- Record layout/contrast/spec: 3 suites passed; surface token guard: 16/16 after replacing the obsolete settings hex allowlist with an empty allowlist.
- TypeScript, owned ESLint and `git diff --check`: passed. Final runnable gates were re-executed in `gate-final.log`; lint output is empty in `lint.log`.
- The broad historical `lightContrastAudit` has five pre-existing source-layout expectations pointing to restaurant/community/My Info structures changed in earlier work. They do not report a new contrast failure in these detail screens. The old count of eight bed screens is also outdated; current count was already seven before the profile was flattened. These unrelated expectations were not weakened.
- UX copy audit: 14 candidates, mostly pre-existing legal/source literals and shared copy; no new billing/settings copy candidate.

## Native evidence (iPhone 17 Pro / iOS 26.5, local TEST, Metro 8085)

- `swelling-toggle.mp4`: collapse, expansion, and repeated reversal; extracted transition frames inspected. `swelling-restored.png`: ankle/slight/pitting choice restored. Collapsed descendants absent from AX; test draft discarded without saving.
- `subscription-light.png`: live free entitlement, daily 1 and monthly 10 remaining, CTA/restore layout.
- `profile-light.png`, `name-keyboard.png`, `nickname-keyboard.png`, `phone-keypad.png`, `password-keyboard.png`: profile and four nested edit forms. Keyboard dismissal works without saving; confirmation field scrolls above the keyboard.
- `notifications-light.png`, `app-info-light.png`, `terms-light.png`: notification hierarchy, support metadata and legal navigation inspected; preferences and legal content were not changed.
- `withdrawal-light.png`, `withdrawal-terms-light.png`: radio selection, Other field disclosure and next-step navigation checked. Agreement remained unchecked; final withdrawal was never pressed.
- `subscription-large-text.png`, `name-large-keyboard.png`: accessibility-medium text inspected after native restart, including wrapped benefit/restore copy, field labels, keyboard dismiss and save. Text size restored to the original large setting.
- `subscription-dark.png`, `privacy-dark.png`: dark surfaces, text and status bar inspected. App theme restored to the original Light setting; `subscription-light.png` refreshed after restoration. Simulator is left on Subscription Management.
- Video inspection establishes a smooth visible transition and repeated toggle behavior, not measured frame-rate performance or an automated mid-transition reversal benchmark. Reduce Motion follows the OS policy in code; its native setting was not changed for QA.

Paid, renewal and error branches are unit-tested/modelled; no paid-account or store transaction is claimed as native-verified. No health/profile/notification/withdrawal mutation was submitted.
