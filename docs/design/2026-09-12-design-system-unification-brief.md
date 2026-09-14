# 디자인 시스템 통일 브리프 — 2026-09-12 (스토어 심사 릴리스용)

대상: 신장 건강 정보 수정(완료)·진단 시기 피커 · 1:1 문의 목록/작성 · 레시피 작성/보기/리뷰 쓰기 · 식당 리뷰 쓰기.
정본은 **홈 건강기록 6페이지 시스템**(`src/features/home/components/record/pages/*`)과 `src/design-system-v2` 다.
참고 화면: `src/features/settings/views/KidneyProfileEditScreen.tsx`(오늘 재설계, 폼 페이지의 모범),
`WeightRecordPage.tsx` / `BloodPressureRecordPage.tsx` / `EdemaRecordPage.tsx`, 근거 문서
`docs/design/health-record-refresh-2026-09-05/REVIEW.md` §공통 디자인, 계획 `docs/design/2026-08-17-design-consistency-plan.md`.

## 키트 (이것만 쓴다)
- 폼/작성 페이지 뼈대: `RecordPageShell`(큰 제목 26/34 · 안내문 · 하단 고정 CTA · 키보드 도킹 · 키보드 내리기 버튼). `navigationTitle` 은 상위 화면 이름, `title` 은 페이지 제목, `intro` 는 한 줄 안내.
- 숫자: `RecordNumberField`(라벨·단위 상시 표시, `paired` 로 두 칸). 텍스트: 같은 면(`FIELD.radius` 16, `s.surfaceSunken`, 포커스 `s.brand` 테두리, 오류 `s.danger`)의 RN `TextInput`(`@/src/design-system-v2/primitives/NativeText` 의 `TextInput`), 예시는 KidneyProfileEditScreen 의 `otherField`.
- 고르기: `RecordChoices`(단일) · `RecordMultiChoices`(복수). 선택은 **중성 바탕 + 진한 테두리**, 오렌지 틴트 바탕 금지.
- 오류/안내: `RecordFieldHint`. 섹션 라벨 `FORM.label`, 힌트 `FORM.hint`, 본문 `FORM.body`, 칩 글자 `FORM.option`. 간격은 `S[n]`·`FORM.sectionGap`·`FORM.labelGap`, 좌우 `PAGE_X`.
- 목록/읽기 페이지: `V2ScreenHeader`(separator, safeAreaTop) + `V2ListRow`/`V2Divider`/`V2EmptyState`/`V2ErrorState`, 상태 배지는 `V2Chip` 또는 `V2Badge`(색은 주의/제한/높음만, 정상·완료는 그레이스케일 — 색 예산 규칙).
- 시트: `V2BottomSheet`(둘 이하 선택은 `showConfirm`, 셋 이상은 `showActionSheet` — `src/lib/dialog.ts`).
- 색: `useSurface()`(페이지) 또는 `useV2Theme().colors`(v2 컴포넌트) 만. **`primitives.*`·hex 리터럴·`theme/tokens`·`ThemedText/ThemedView`·`useSettingsColors`·`ScreenHeader`(구)·`V2BottomCTA`·`KeyboardAvoidingView` 금지.** 서체는 `AppText`/`V2Text`(fontWeight 단독 금지).
- 터치: 시트 안(gorhom)에서는 RNGH `Pressable`. 그 밖은 RN `Pressable` 가능. 헤더 버튼 터치 영역 ≥ 44(`tests/headerTouchTarget`).

## 지켜야 하는 것
- 동작·API·분석 이벤트·i18n 키 사용처는 그대로. 새 문구는 `ko`·`en` 둘 다 추가(`tests/i18nKeyExistence`). 문구는 `docs/ux-writing-guide.md` 톤(해요체, 원인·해결 한 문장).
- 화면 파일에 치수를 다시 적지 않는다 — `recordPageSpec` 상수만.
- 각 잎은 **소스 계약 테스트**(`tests/<leaf>Design.test.ts`, `tests/kidneyProfileEditDesign.test.ts` 와 같은 꼴: 키트 사용 + 금지 import 부재 + 동작 규칙 잔존)를 추가한다.
- 검증 명령: `npx prettier --write <파일>`, `npx tsc --noEmit -p tsconfig.json`, `npx jest --config jest.config.ts tests/surfaceLadderGuard.test.ts tests/headerTouchTarget.test.ts tests/i18nKeyExistence.test.ts tests/typefaceLineage.test.ts <자기 테스트>`.
- 자기 OWNS 밖 파일은 건드리지 않는다. git commit·EAS·배포·시뮬레이터 조작 금지(통합 단계에서 한다).
