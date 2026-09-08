# Filtered review recovery

- [x] E1: Type, lint, formatting and copy audit pass.
  CHECK: npx tsc --noEmit && npx eslint src/features/restaurant/components/detail/ReviewTab.tsx && npx prettier --check src/features/restaurant/components/detail/ReviewTab.tsx src/i18n/locales/ko/common.json src/i18n/locales/en/common.json && npm run audit:ux-copy && git diff --check
  EXPECT: /All matched files use Prettier code style!/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=8030ff6970d9/24 entries; output=S2 NAV-002 src/i18n/locales/ko/common.json:1830 카카오톡 앱이 설치되어 있는지 확인 후 다시 시도해 주세요. | S1 MED-002 src/i18n/locales/ko/common.json:1942 하루 소금 섭취는 5g 이하를 권장해요. 찌개나 국물은 남기는 습관이 콩팥을 지켜줘요.
- [x] E2: Selecting a menu and nonmatching keyword shows filtered-empty copy; reset restores both All selections and existing reviews without changing sort.

  EVIDENCE: Simulator iPhone 17 Pro iOS 26.5: pasta + value-for-money filter reproduced 0 matching reviews. Updated localized filtered-empty title/body and Show all reviews action appeared. Changed sort to highest rating, applied, then pressed Show all reviews. Screenshot/AX confirmed both menu and keyword All chips selected, existing reviews restored, and highest-rating sort retained (5-star rows before 4-star). No review or report was submitted. Copy audit exited zero with existing unrelated warnings; it does not establish a globally clean copy audit.
