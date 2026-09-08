# Gates: consultation draft and generation continuity

Observed: a multi-line unsent question disappeared after native back and reopening consultation. The current request is also cancelled on route unmount. Protect these transitions explicitly without claiming background generation.

- [x] E1: Back/navigation, new chat, different history selection, and suggested-question replacement share one guard. Cancel keeps draft and request intact; confirm stops only a still-active generation and runs the intended action once. Late dialog replies after unmount do nothing; a history overlay closes first.
  CHECK: npx jest tests/consultExitGuard.test.ts tests/consultSession.test.ts --runInBand
  EXPECT: Test Suites: 2 passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.818 s, estimated 2 s | Ran all test suites matching /tests\/consultExitGuard.test.ts|tests\/consultSession.test.ts/i.

- [x] E2: Consultation changes pass type, lint, and Korean copy checks; keyboard follow honors reduced motion.
  CHECK: npx tsc --noEmit && npx eslint src/features/consultation/hooks/useConsultExitGuard.ts src/features/consultation/hooks/useConsultScreen.ts && npm run audit:ux-copy
  EXPECT: 한국어 문구
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=S2 NAV-002 src/i18n/locales/ko/common.json:1773 카카오톡 앱이 설치되어 있는지 확인 후 다시 시도해 주세요. | S1 MED-002 src/i18n/locales/ko/common.json:1885 하루 소금 섭취는 5g 이하를 권장해요. 찌개나 국물은 남기는 습관이 콩팥을 지켜줘요.

- [x] E3: Simulator validates a long draft, keep-writing, new-chat discard, and navigation discard. Long Korean button labels fit and dialogs close without a leftover overlay. A real generating request can be kept or stopped through the same transition.
  EVIDENCE: iPhone 17 Pro / iOS 26.5 TEST: reproduced unguarded loss of a multiline owned draft before the fix; final code preserved the exact draft and restored the visible keyboard after cancelling a different-history selection. New-chat discard cleared the draft. Header-back discard returned home; reopening showed the initial composer with disabled send and no leftover modal. Actual recipe request continued to completion after keep-responding; a second live regeneration stopped and returned home after confirmation, and reopening preserved the previous completed answer. Long Korean labels fit vertically in consult-draft-exit.png and consult-generating-exit.png; restored editor and keyboard in consult-draft-restored-keyboard.png. Physical continuous drag remains outside this gate.
