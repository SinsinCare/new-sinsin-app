# 바텀시트 계보 통합

작성 2026-08-17 · 전 시트 감사(29 에이전트, 확정 17건) + iOS/안드로이드 실측 기준
정본: Figma `Design system_Mobile` node `91-8619` → `src/design-system-v2/V2BottomSheet`

---

## 0. 왜 손댔나

같은 "바텀시트"가 **세 가지 다른 구현**으로 존재했고, 셋의 손맛이 전부 달랐다.

| 계열 | 기반 | 소비처 | 드래그 (실측) |
| --- | --- | --- | --- |
| A `AppBottomSheet` | `@tamagui/sheet` | 8 (+고아 4) | 250pt 끌면 닫힘. **30pt 플릭은 무시** |
| B `V2BottomSheet` | RN `Modal` + 자작 `Animated` | 10 | **없음 — 핸들이 장식** (237pt 끌어도 미동) |
| C 독립 | 제각각 | 5 (+고아 2) | 제각각 |

여기에 지도 시트만 `@gorhom/bottom-sheet` 를 쓰고 있었다 — 즉 **네 번째 계보**.

## 1. 결정: Tamagui 전면 이행은 하지 않는다

한때 "Tamagui 로 통일하자"를 검토했고, 근거를 재 본 결과 **반대**로 결론했다.

1. 이 앱의 디자인 정본은 Figma → `design-system-v2` 다. 같은 날 작성된
   `2026-08-17-design-consistency-plan.md` 가 마지막 단계로 **"tamagui 임포트 금지를 lint 로 고정"**
   을 명시한다. Tamagui 로 가는 것은 접기로 한 계보를 다시 세우는 일이다.
2. 사용량이 이미 반대다 — v2 168 파일 / tamagui 87 파일, 7월 이후 작업은 151 / 85.
3. 설치된 것은 `2.0.0-rc.6` — **정식 릴리스가 아니다**(9개 패키지 전부).
4. **최적화 컴파일러가 안 켜져 있다**(babel/metro 설정 없음). 장점은 안 쓰고 런타임 비용만 낸다.
5. 결정적으로, 이번에 잡은 결함은 전부 **제스처·스냅 수학**이지 스타일링이 아니었다.
   오히려 Tamagui Sheet 가 이 저장소에서 낸 사고가 기록돼 있다 —
   프레임이 최대 스냅으로 눕어 CTA 가 화면 밖으로 나간 건(1.1.28 수정),
   껍데기를 ScrollView 로 바꿨다가 **시트 12개가 백지**가 된 건(2026-08-02 QA).

## 2. 결정: `V2BottomSheet` 를 정본으로, 역학은 gorhom 이 맡는다

겉모습(핸들 → Title/SubTitle → children → 푸터)과 **공개 props 는 그대로** 두고 내부만 교체했다.
소비처 10곳은 코드 변경이 없다.

**껍데기는 `AppModal` 을 유지한다.** gorhom `BottomSheetModal` 로 가면 표현이
네이티브 모달 → React 트리 포털로 바뀌는데, 이 앱에는 iOS 모달 전환 충돌 때문에 만든
전역 직렬화 게이트가 있고 화면들이 그 스택 의미에 기댄다. 그래서
`AppModal → GestureHandlerRootView → gorhom BottomSheet(비모달)` 구조다.
(모달 안에서 RNGH 가 살려면 루트가 모달 **안쪽**이어야 한다.)

**팬은 핸들만 잡는다**(`enableContentPanningGesture={false}`). 소비처 다수가 자기 `ScrollView` 를
children 으로 넘기는데, 스냅이 하나뿐인 시트에서 콘텐츠 팬은 그 스크롤과 다투기만 한다.
대신 핸들 블록을 44pt 로 키웠다.

### 이 교체로 함께 죽은 확정 결함 4건

| 결함 | 전 | 후 |
| --- | --- | --- |
| 핸들에 팬 제스처가 없다 | 237pt 끌어도 미동 | **드래그로 닫힘** (iOS·안드 실측) |
| 키보드 리프트가 `maxHeight` 에 먹혀 CTA 가 키보드 뒤로 | 신고 시트 제출 불가 | `keyboardBehavior="interactive"` |
| children 이 넘치면 잘림(스크롤 없음) | 검진 회차 목록 잘림 | 콘텐츠 높이로 자람 + 상한 클램프 |
| 닫는 220ms 동안 투명 스크림이 터치를 먹음 | 닫고 바로 누르면 무시 | gorhom 백드롭이 상태를 따라감 |

### 검증 (양쪽 시뮬레이터, 손가락 입력)

- SortSheet: 렌더 / **핸들 드래그로 닫힘** / 옵션 선택 / CTA 적용 — iOS·Android
- FilterSheet: 렌더 / 내부 스크롤 유지 / 푸터 고정 — iOS
- 회귀: 시트 관련 테스트 29 스위트 505건 통과, 타입·린트 클린

### 기록 시트 — 키패드를 실제로 띄워서 확인 (2026-08-17)

iPhone 17 Pro 시뮬 + 안드로이드 에뮬(API 36), 손가락 속도 제스처(`touch_path`·`input swipe`).
목 인증으로 홈까지 들어가서 혈압 시트와 물 시트를 열고 **키패드를 실제로 올려** 쟀다.

| 확인 | iOS | Android |
| --- | --- | --- |
| 콘텐츠 높이로 서고 전부 보인다 | ✅ | ✅ |
| 키패드가 뜨면 시트가 그만큼 올라가 **CTA 가 키패드 위** | ✅ | ✅ (아래 수정 후) |
| 값 → 판정 배지·구간 바가 그 자리에서 응답 | ✅ 130/85 → `높음` | ✅ 130/85 → `높음` |
| 키패드 내리면 콘텐츠 높이로 **되돌아온다** | ✅ (아래 수정 후) | ✅ |
| 손잡이 플릭(≈2,000pt/s)으로 닫힘 | ✅ | ✅ |
| 물 시트: 총량 직접 입력 + CTA 생존 | ✅ | ✅ |

**손으로 재서야 나온 결함 2건.** 둘 다 마우스로는 안 보이고, 타입·린트·테스트도 통과한다.

1. **키패드를 내려도 시트가 안 내려왔다**(iOS). 올라간 자리에 그대로 남아 CTA 아래로 빈 흰 띠
   330pt 가 생겼다. gorhom 의 `keyboardBlurBehavior="restore"` 는 저장된 스냅 인덱스로
   돌아가는데, 콘텐츠 높이로 사는 시트에서는 그 계산이 임시 위치를 못 벗어난다. →
   `V2BottomSheet` 가 `keyboardDidHide` 에서 `snapToIndex(0)` 으로 **직접 되돌린다**
   (닫히는 중이면 건드리지 않는다 — 저장 CTA 가 키보드를 내리고 곧바로 닫기 때문).
2. **안드로이드에서 키패드가 CTA·판정·구간 바를 통째로 덮었다.** 원인은
   `android_keyboardInputMode="adjustResize"`: 매니페스트의 MainActivity 는 adjustResize 지만
   이 시트는 네이티브 `Modal`(AppModal) 안에 살고 **모달은 자기 윈도우라 그 리사이즈를 안
   물려받는다.** 그런데 gorhom 은 adjustResize 면 "OS 가 창을 줄여 줄 것"이라 보고 키보드
   높이를 0 으로 만들고 아무것도 하지 않는다. → **`adjustPan`** 으로 바꿔 gorhom 이 iOS 와
   같은 경로로 시트를 직접 밀어 올리게 했다.

**남은 것 하나(의도한 동작).** 물 시트에서 키패드를 올리면 콘텐츠+키패드가 화면보다 커서
시트가 상한(위쪽 끝)에 붙고 **손잡이가 화면 밖으로 나간다.** 값·CTA·✕ 는 모두 살아 있으므로
막히는 곳은 없다 — 키패드를 내리면 손잡이가 돌아온다.

**시뮬레이터에서 소프트 키패드를 먼저 켜야 한다.** 기본 상태로는 안 뜨고, 그 화면을 보고
"키보드 대응이 안 된다"고 읽으면 안 된다(입력은 포커스를 받았고 키패드만 없는 상태다).
Android `adb shell settings put secure show_ime_with_hard_keyboard 1` **+ 에뮬 재부팅**,
iOS 는 Simulator 메뉴 `I/O › Keyboard › Connect Hardware Keyboard` 를 **끈다**.

---

## 3. 진행 결과

### 3-1. 고아 5개 삭제 — 완료

import 0곳을 실측하고 지웠다. `ProvenanceSheet` 는 **고아가 아니었다**
(`app/recipe/[id]/index.tsx:482` 에서 실사용 — 감사가 틀렸고, 배럴을 제외한 grep 이 가렸다).

- `recipe/components/CategoryFilterSheet.tsx`
- `recipe/components/WriteTypeSheet.tsx`
- `recipe/components/CuratedRecipeDetailSheet.tsx`
- `consultation/components/FaqDetailSheet.tsx` (family C 중 유일한 Tamagui 잔재)
- `shared/components/BottomSheetPicker.tsx` (+ 색 파일, 배럴 export, 테스트)

`CuratedRecipeDetailSheet` 가 `dragHandleOnly` 의 유일한 소비처였으므로
**`HandleOnlyBottomSheet` 140줄도 함께 제거**했다 — 감사가 그 안에서만 결함 3건을 찾았던
자리다(최소 이동 없는 속도-only 닫힘, `activeOffsetY` 없음, 창 크기 변화 시 자기 붕괴).
`AppBottomSheet` 407줄 → **192줄**.

### 3-2. family A 이행 — 8/8 완료

| 시트 | 상태 | 함께 죽은 결함 |
| --- | --- | --- |
| `ProvenanceSheet` | ✅ | 52% 고정 스냅 밖으로 설명이 밀리던 것 |
| `FeatureIntroSheet` | ✅ | — |
| `PostCategorySheet` | ✅ | **최대 스냅 프레임 때문에 마지막 카테고리 행에 닿을 수 없던 것** |
| `RecipeFilterSheet` | ✅ | 스냅 함정 우회용 `disableDrag` 제거 → 아래로 쓸어 닫기 복귀 |
| `MonthCalendarSheet` | ✅ | **6주 달의 마지막 주 행이 잘리던 것**(SE 계열) |
| `MealSheet` | ✅ | **`오늘은 건너뛰기` 가 화면 밖으로 밀리던 것** (실기기에서 높이 정합 확인) |
| `RecordSheetShell`(5개 시트) | ✅ | 고정 스냅(56~74%) 폐지 · 키보드 리프트 자작 코드 제거 |
| `WaterSheet` | ✅ | 82% 스냅 폐지 · 총량 입력 키패드가 CTA 를 덮던 구조 제거 |

`MealPhotoConfirmSheet` 는 `RecordSheetShell` 을 통해 그리므로 그쪽에 딸린다 — 사진 비율마다
스냅 %를 되짚던 `SHEET_CHROME`(257pt) 산수가 함께 사라졌다.

**이 2개는 기계적 이행이 아니었다.** 기록 시트의 키보드 대응(`useSheetKeyboardLift`)은
*"키보드가 뜨면 스냅을 90% 로 키우고, body `flex:1` 안에서 ScrollView 를 눌러 CTA 를 키보드
위로 밀어 올린다"* 는 **고정 높이 프레임 전제** 위에 서 있었다. 콘텐츠 높이로 자라는 시트에서는
그 전제가 통째로 사라지므로 훅을 지우고 **키보드 회피를 gorhom 에 넘겼다** —
`keyboardBehavior="interactive"`(iOS 는 시트를 키보드 높이만큼 밀어 올리고,
안드로이드는 `android_keyboardInputMode="adjustResize"` 로 창이 줄면서 같은 결과).
남은 것은 키패드 탈출구(v 버튼) 하나이고, 그건 여전히 시트 **안**에 있다 — 루트의
`KeyboardStickyView` 는 시트 위로 못 올라오기 때문이다(RecordSheetShell 머리말).

**여기서 배운 함정: 시트 안의 입력은 `V2SheetTextInput` 이어야 한다.** gorhom 은
`useAnimatedKeyboard` 에서 keyboardDidShow 를 받을 때 **어떤 입력이 포커스를 가졌는지
(`target`)** 가 비어 있으면 그 이벤트를 캐시만 하고 빠져나간다. 그리고 그 `target` 은
`BottomSheetTextInput` 의 `onFocus` 만이 채운다. 즉 평범한 RN `TextInput` 을 쓰면 키보드는
뜨고 시트는 제자리에 남는다 — **경고 한 줄 없이** 예전 결함이 그대로 돌아온다. 그래서
`recordSheetControls`(큰 숫자 입력·혈압 필드)와 `BloodPressureSheet` 의 입력 5개를 모두
`V2SheetTextInput` 으로 바꿨다.

### 3-3. `AppBottomSheet` 삭제 + lint 고정 — 완료

`@tamagui/sheet` 소비처가 0 이 되어 지웠다.

- `src/shared/components/AppBottomSheet.tsx`(192줄) 삭제 — family A 계보의 끝.
- `src/shared/utils/appBottomSheet.ts` 와 `tests/appBottomSheet.test.ts` 삭제
  (스냅 정렬·팔레트 헬퍼가 전부 Tamagui 전용이었다).
- `app/_layout.tsx` 의 `setupGestureHandler({ Gesture, GestureDetector })` 제거 —
  Tamagui Sheet 만을 위한 부팅 코드였다.
- `AppBottomSheetScrollView` → **`V2SheetScrollView`**(`design-system-v2`)로 분리.
  옮기면서 **바닥 여백을 뺐다**: `V2BottomSheet` 가 이미 콘텐츠 바닥에 safe-area + 20 을
  주는데 여기서 safe-area + 16 을 또 더해, 필터 시트는 스크롤 끝에 빈 50pt 가 생기고
  (그 아래 적용 버튼이 따로 있다) 카테고리 시트는 마지막 행 밑이 두 배로 벌어져 있었다.
- `eslint.config.js` 에 `no-restricted-imports` 로 `@tamagui/sheet`(및 하위 경로) 봉인.

계획서(디자인 Wave 5)는 `tamagui` **전체** 임포트 금지를 말하지만 지금 소비처가 87 파일이라
그건 이 작업의 범위가 아니다. 시트만 먼저 못 박았다.

### 3-4. 소비처 개별 결함 (기반과 무관, 각각 독립)

| 시트 | 결함 |
| --- | --- |
| `BloodGlucoseSheet` | 칩 탭이 입력 중인 값을 덮어써 CTA 가 화면에 없는 숫자를 저장 |
| `WaterSheet` | 총량 편집 중에는 컵 버튼·되돌리기가 조용히 버려짐 |
| `ReviewReportSheet` | 사유 미선택 시 `신고` 가 눌리는 것처럼 보이나 무반응 |
| `RecipeFilterSheet` | 시트는 다중 선택인데 나머지 화면은 단일 선택 |
| `FilterSheet` | 어느 칩으로 열든 항상 `지역` 에서 시작(탭한 섹션으로 스크롤 안 함) |
| `ChatHistorySheet` | 행 안의 `…` 가 38pt, 바깥 행 press 가 가로챔 |
| `VoteSheet` | 확정 CTA 34pt / X 로 닫으면 초안 전체 소실 |
