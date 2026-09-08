# Gates: consultation attachment workflow

Observed: the attachment overlay exposes both actions as one accessibility button, uses a paperclip for camera, overlaps the composer, and has no picker failure handling. Preserve compact composition, text drafts, and explicit send.

- [x] A1: Library/camera selection is single-flight. Cancellation and failures preserve the existing attachment and text; stale results after draft reset or unmount cannot attach. Camera permission and picker failures have actionable copy; native library selection does not request full-library permission unnecessarily.
  CHECK: npx jest tests/consultAttachments.test.ts tests/consultExitGuard.test.ts --runInBand
  EXPECT: Test Suites: 2 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.821 s, estimated 2 s | Ran all test suites matching /tests\/consultAttachments.test.ts|tests\/consultExitGuard.test.ts/i.

- [x] A2: The menu uses v2 tokens, separate accessible actions, a real camera icon, a measured anchor above the composer, 44pt touch targets, and reduced-motion-aware transitions. Modified code passes type, lint and copy checks.
  CHECK: npx tsc --noEmit && npx eslint src/features/consultation/hooks/useConsultAttachments.ts src/features/consultation/hooks/useConsultScreen.ts src/features/consultation/components/ConsultAttachMenu.tsx src/features/consultation/components/ConsultComposer.tsx src/features/consultation/views/ConsultScreen.tsx && npm run audit:ux-copy
  EXPECT: 한국어 문구
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=S2 NAV-002 src/i18n/locales/ko/common.json:1773 카카오톡 앱이 설치되어 있는지 확인 후 다시 시도해 주세요. | S1 MED-002 src/i18n/locales/ko/common.json:1885 하루 소금 섭취는 5g 이하를 권장해요. 찌개나 국물은 남기는 습관이 콩팥을 지켜줘요.

- [ ] A3: Simulator shows two separately actionable menu options above the composer with keyboard open and closed. Dismiss/cancel preserve the owned test draft, and native photo picker opens. An owned test photo can be attached and removed without sending a message.
  EVIDENCE: PARTIAL: iPhone 17 Pro / iOS 26.5 TEST showed the menu above the full multiline field, separate close/library/camera accessibility buttons, working menu dismissal, and the native photo picker. consult-attachment-menu-keyboard.png captures the keyboard-open state. An owned repository app icon was added as test media. The native picker exposes no actionable AX elements; coordinate selection failed with -10005:noWindowsAvailable even after a fresh CUA session, and Escape/Tab did not dismiss it. Actual selection-return, cancel-return and remove remain unverified on device. No image/question was sent. The Simulator is currently on its iOS Home screen after an interruption check; the app and picker need manual resumption to continue this device path. Unit behavior is covered by A1, not substituted for this gate.
