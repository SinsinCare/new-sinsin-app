# Photo filters and phone copy — 2026-09-08

## Native photo audit

iPhone 17 Pro / iOS 26.5 Simulator, existing local restaurant detail:

- Representative category has 3 photos; third opens at 3/3, previous moves to 2/3.
- Review category has 27 photos; second opens at 2/27, next moves to 3/27.
- Returning from the review viewer retains the selected review category (AX selected, 27).
- Selected All after the audit. No photo uploads or review writes.
- No photo code changes were necessary for the exercised sequence.
- Swiping, zoom, image request failures, Android, and all individual images were not verified.

## Phone copy correction

DetailInfoRows previously ignored Clipboard's boolean return and did not catch rejection.
It now uses the same guarded copy hook as addresses: confirmed success only,
localized failure, in-flight duplicate suppression, and no late toast after unmount.
Added Korean and English phone-specific failure copy.

Verification:

- Native detail home: tapping the phone copy button displays `전화번호를 복사했어요`.
- No phone call was made. Clipboard paste/content was not inspected.
- `npx jest tests/restaurantAddressCopy.test.ts --runInBand`: 5 passed,
  covering address/phone values, pending duplicate taps, false/rejection retry,
  and late completion after unmount. Failure cases are mocked, not OS-level proof.
- `npx tsc --noEmit`: passed.
- Scoped ESLint: passed.
- `npm run audit:ux-copy`: exit 0; existing unrelated findings remain.
- `git diff --check`: passed.

The overall map and all-pages audit remains in progress.
