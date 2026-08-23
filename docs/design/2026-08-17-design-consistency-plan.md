# 전 탭 디자인 일관화 — 우선순위 작업 목록

작성 2026-08-17 · 기준 커밋 시점의 `app/` + `src/` 실측(437개 `.tsx`)
정본: **Figma `Design system_Mobile`** → 코드 포팅본 `src/design-system-v2`

---

## 0-A. 진행 현황 (2026-08-17 저녁 갱신)

| 웨이브 | 상태 | 한 줄 |
|---|---|---|
| 1-0 색 9건 정정 | ✅ | 다크 본문 2.17:1 → 5.78:1 |
| **1-1 surface 파생** | ✅ | 팔레트 21키가 v2 시맨틱에서 나온다. 화면 파일 0줄 수정 |
| **1-2 TYPE 정렬** | ✅ | 자간 11/11 음수 → 0, 크기 전부 v2 스케일 위로 |
| **1-2+ 서체 통일** | ✅ | **새로 찾은 결함** — §0-B |
| **1-3 tokens/themes 정렬** | ✅ | tamagui 브랜드가 `#EE6145` 였다 — §0-B |
| 2-1 SurfacePressable | ✅ | 1-1 로 자동 해결(값이 v2 에서 온다) |
| 2-2 BottomActionBar | ✅ | `V2BottomCTA` 껍데기. 키보드 대응이 덤으로 붙었다 |
| 2-5 FilterChip | ✅ | 5테마 × 20팔레트 삭제 → `V2Chip` |
| 2-6 Toast | ✅ | `V2Toast` 신설, `CopyToast` 흡수, 주의(caution) 변형 추가 |
| 2-3 recordSurface / 2-4 recordSheetControls | ⬜ | 큰 파일. 색은 이미 v2 에서 오고 **구조**가 남았다 |
| 3-1 recipe 라우트 분리 | ✅ | 869줄 → 13줄. 본문은 `views/RecipeHomeScreen` |
| 3-2 V2Screen 통일 | ⬜ | 홈·통계의 `ThemedView` 이중 소스 문제부터(§0-B) |
| 4 화면별 잔여 hex | 🟡 | lint 가 577곳을 세고 있다(§0-C) |
| 5 계보 폐기 고정 | ✅ | lint 래칫 + 회귀 테스트 |

**검증**: iOS(iPhone 17) · Android(sinsin36) 둘 다 **실제 Cloud Run 테스트 백엔드**에
붙여 5개 탭 × 라이트/다크 캡처 비교. `tsc` 0, `eslint` 0 error, 회귀 테스트 통과.

---

## 0-B. 계획에 없던 것 — 실측으로 새로 나온 결함 셋

### ① 앱의 절반이 Pretendard 가 아니었다 ★가장 큰 불일치

Pretendard 는 굵기별 **파일 4개**로 로드된다(`Pretendard-Regular/Medium/SemiBold/Bold`).
그래서 RN 에서는 `fontFamily` 로 face 를 골라야 하고, **`fontWeight` 만 준 스타일은
OS 기본 서체**(iOS Apple SD Gothic Neo / Android Roboto)로 그려진다.

실측:

| 영역 | `fontFamily` 지정 파일 | `fontWeight` 쓰는 파일 |
|---|---:|---:|
| `features/home` | **0** | 34 |
| `features/health` | **0** | 10 |
| `shared` | **0** | 9 |
| `features/restaurant` | (v2 `typography` 토큰이 face 를 들고 있음) | 6 |

즉 **탭을 옮기면 서체가 바뀌고 있었다.** 색·간격보다 먼저 눈에 띄는 불일치인데
계획서 §2-3 의 "타이포도 어긋난다" 는 자간까지만 보고 있었다.

스타일 641곳을 고치는 대신 **`src/shared/components/AppText`** 한 곳에서 흡수했다 —
`fontWeight` 를 Pretendard face 로 바꾸고 `fontWeight` 는 뗀다(합성 볼드 방지).
`react-native` 대신 여기서 `Text`/`TextInput` 을 가져오도록 **74개 파일의 임포트만** 옮겼다.
회귀는 `tests/typefaceLineage.test.ts` 가 막는다.

### ② `useV2Theme` 가 앱의 테마 토글을 안 봤다

`useAppColorScheme`(설정의 system/light/dark 토글 + OS)과 달리
`useV2Theme` 는 RN 의 `useColorScheme` 만 봤다. 그래서 **앱 안에서 다크로 고정하면
식당 탭(v2 55개 파일)만 라이트로 남았다.** 한 줄 고침.

남은 RN-스킴 직독자는 셋이다 — `hooks/use-theme-color.ts`,
`app/(tabs)/_layout.tsx:47`, `shared/components/LoadingScreen.tsx:53`.
그중 `use-theme-color` 경로가 §3-2 의 진짜 과제다: 홈 루트는 `ThemedView` →
RN 스킴이고 그 자식 `RecordView` 는 themeStore 라, **콜드스타트와 토글 직후
한 화면에 두 모드가 뜬다**(`Appearance.setColorScheme` 이 change 이벤트를 안 쏜다).
전 앱 `ThemedView` 30개 중 실제로 색을 결정하는 건 `app/(tabs)/home.tsx` 와
`app/statistics.tsx` 둘뿐 — 나머지는 `style` 로 덮여 무해하다.

### ③ tamagui 화면의 브랜드가 다른 주황이었다

`themes.ts` 의 `$primary` 는 `primary7 #EE6145`, 나머지 앱은 `#FE7139`.
상담·홈 통계처럼 tamagui 로 그린 화면만 브랜드가 달랐다. §2-3 표에 "브랜드
오렌지만 세 계보가 일치한다" 고 적혀 있었는데 **tamagui 테마 층은 안 보고 있었다.**
`success` 도 `sub7`(주황)을 가리키고 있어서 "성공"이 주황으로 그려졌다.

---

## 0-D. **"컴포넌트가 있다" ≠ "화면이 쓴다"** — 채택 실태 전수 조사 (2026-08-18)

§1 의 인덱스는 *컴포넌트가 코드에 있는가* 만 봤다. **화면이 실제로 쓰는가**를 따로 세어 보니
31개 중 **온전히 채택된 것은 3개뿐**이다.

| 상태 | 개수 | 컴포넌트 |
|---|---:|---|
| ✅ adopted | 3 | V2BottomSheet · V2Skeleton · V2Toast |
| 🟡 partial | 21 | V2ScreenHeader · V2Icon · V2TextField · V2Chip · V2Card · V2ListRow · V2Badge · V2Divider · V2ProgressBar · V2Modal · V2Option · V2SearchField · V2SegmentControl · V2Tab · V2Switch · V2Checkbox · V2IconButton · V2BottomCTA · V2EmptyState · V2ErrorState · V2LoadingState |
| ❌ unused | 7 | **V2TabBar** · V2Screen · V2Bubble · Grid List · Board Row · Post · Menu |

### 0-D-1. 하단 탭 바 — 고침 ✅

사용자가 지목한 자리다. `app/(tabs)/_layout.tsx` 가 react-navigation 기본 바를
`screenOptions` 로 흉내 내고 있었고 `V2TabBar` 는 쇼케이스에서만 렌더됐다.

| 항목 | 예전 | 지금(= Figma 61:5948) |
|---|---|---|
| 상단 모서리 | 각짐 | **라운드 24** |
| 상단 경계 | `borderTopWidth: 0` | `line.alternative` 1px |
| 아이콘 | 22 | 24 |
| 라벨 | 11.5 / LH 16 / 자간 −0.23 / `fontWeight:600` | `caption.small` 11 / LH 14 / 자간 0 / Medium **face** |
| 색 | 레거시 `tokens.color.text*` | `label.neutral` / `label.alternative` |
| 다크 판정 | RN `useColorScheme`(앱 토글 무시) | `useV2Theme` |
| 알림 점 | 없음 | 아이콘 우상단 5×5 (`redDot`) |
| 바 높이 상수 | 49(자체) | 52 (`bottomSafeArea.TAB_BAR_HEIGHT`, v2 치수 합) |

탭 아이콘 5종은 `icons/registry.ts` 에 `tabHome/tabCommunity/tabRecipe/tabRestaurant/tabAll`
로 들여왔다(기존 `assets/icons` 글리프 — Figma 의 `Tab Bar Icons` 레이어는 미확보).

### 0-D-1-a. 아이콘 — Figma 내보내기로 교체 (2026-08-18)

`Tab Bar / Tab Item` 내보내기 10장(5종 × Selected 2)을 받아 넣었다. 앱이 쓰던 **외곽선**
글리프가 아니라 **채움** 글리프다. 두 변형은 **path 가 완전히 같고 fill 만 다르며**(md5 일치),
그 두 색이 시맨틱 토큰과 정확히 맞아떨어진다:

| Selected | 내보내기 값 | 토큰 | 검산 |
|---|---|---|---|
| False | `#37383C @0.16` | `label.disable` | `0x29/255 = 0.161` |
| True | `#2E2F33 @0.70` | `label.neutral` | `0xb3/255 = 0.702` |

그래서 **글리프는 한 벌만 들이고 박힌 fill 을 `currentColor` 로 바꿨다.** 라이트에서는
Figma 와 같은 값이 나오고, 다크에서는 같은 토큰의 다크 값이 따라온다(내보내기 색을 그대로
박으면 다크에서 어두운 글자가 어두운 바 위에 얹혀 사라진다).

> 비선택 아이콘은 흰 면 위 **1.3:1** 로 라벨(2.9:1)보다 훨씬 옅다. 내보내기가 그렇게
> 정해져 있어 그대로 따랐다 — 안 고른 탭 넷이 흐린 것이 의도인지는 확인이 필요하다.

> 디자인의 탭 라벨은 `홈 / 상담 / 레시피 / 식당 / 전체` 인데 앱은 `홈 / 커뮤니티 / 레시피 /
> 식당 / 내 정보` 다. 라벨·내비게이션은 제품 결정이라 **바꾸지 않았다**(상담은 현재 탭이
> 아니라 전역 플로팅 필이다).

### 0-D-1-b. 바는 화면 **위에 뜬다** — 그래야 깎인 모서리에 화면이 보인다

상단 라운드 24 는 그 뒤로 **화면이 비쳐야** 뜻이 있다. 흐름에 두면 화면이 바 위에서
끝나 버려 모서리 뒤가 비고, 그 자리를 무슨 색으로 칠하든 가짜 조각이 된다
(react-navigation 기본값은 흰색이라 다크에서 흰 조각 두 개가 남았다).
그래서 `tabBarStyle: { position: "absolute" }` + 바를 absolute 컨테이너에 얹었다.

딸려 온 것 둘:

1. **식당 시트가 바 뒤로 내려갔다.** 접힘 높이(핸들+sticky 블록)를 바닥에서 재는데
   컨테이너가 바 뒤까지 늘어났기 때문. gorhom 의 `bottomInset` 에 `TAB_BAR_HEIGHT` 를
   더해 시트 전체를 띄웠다 — 스냅 비율은 안 건드린다(`tests/restaurantSheetDetent` 14 pass).
2. **손가락 탭이 사라졌다.** 바가 지도·시트의 팬 제스처 **위에** 얹히면서, RN 의 터치
   응답자 체계로 만든 `Pressable` 은 손가락이 4pt만 움직여도 밑의 팬에게 터치를 빼앗겼다.
   **마우스로는 이동량이 0 이라 항상 통과해서 안 보이는 종류의 결함이다.**
   `V2TabBar` 의 `Pressable` 을 `react-native-gesture-handler` 것으로 바꿔 같은 체계에서
   중재시켰다(`RestaurantCard` 와 같은 이유). 흔든 탭 · 속도 있는 플릭 둘 다 실기 검증.

### 0-D-2. 아이콘 — 세트가 **다섯 벌**이다 (가장 넓은 잔여 불일치)

v2 registry 61 · `shared/Icon` 67 · **Ionicons 240곳/97파일** · lucide 3 · MaterialIcons 1.
`V2Icon` 은 48파일뿐이고 **home·settings·consultation·auth·onboarding·community·stats-report 는 0건**.

같은 뜻인데 모양이 다른 쌍이 실제로 있다:
- **검색**: `magnifyingglass.svg`(채움, viewBox 21×22) vs `icon-search.svg`(stroke 2, 24×24)
- **닫기 X**: `x.svg`(stroke 1.8, 대각 16pt) vs `icon-close.svg`(stroke 2, 대각 11pt) — **1.45배 차이**
- 호출 크기가 사다리(16/20/24/28/32/40)를 벗어난다: 닫기만 11·12·13·14·15·16·17·18·22·24·26pt

### 0-D-3. 화면 헤더 — 손으로 만든 것 16곳

높이가 **44 / 48 / 52 / 56 / 미지정** 다섯 가지, 제목이 **15 / 16 / 17 / 22px** 네 가지,
정렬이 좌 12곳 · **가운데 4곳**(ChatHeader · community-library · OnboardingHeader · PhotoViewer).
뒤로가기 글리프도 갈린다 — 정본은 OS 분기(iOS 셰브론 / 안드 화살표)인데 실제는 양 OS 다 Ionicons 셰브론.
safe-area 도 정본은 헤더가 갖는데 화면 40곳이 `paddingTop: insets.top` 을 직접 계산한다.

### 0-D-4. 화면 골격 `V2Screen` — 앱 전체 1곳(`+not-found`)

좌우 기본 패딩이 정본 24 vs 앱 표준 `LAYOUT.screenX = 20` 으로 **4pt 어긋나 있다**.
그대로 갈아 끼우면 전 화면 본문 시작선이 4pt 밀리므로, **둘 중 무엇이 정본인지 먼저 정해야 한다.**

---

## 0-C. 남은 것의 크기 (lint 가 세어 준다)

`eslint.config.js` 에 래칫을 넣었다 — 이미 정리된 구역(`design-system-v2/components`,
`features/restaurant`, `theme/surface.ts`)은 **error**, 나머지는 **warn**.

```
$ npx eslint src app
✖ 664 problems (0 errors, 664 warnings)
   80  tamagui 직접 임포트
  577  리터럴 hex
```

이 숫자가 곧 §4·§5 의 잔량이다. 구역이 비는 대로 `files` 목록에 옮겨 error 로 못 박는다.

---

## 0. 한 줄 결론

탭 간 디자인이 다른 건 "색을 조금씩 다르게 쓴 것"이 아니라 **탭마다 다른 UI 계보를 쓰고 있어서**다.
식당 탭만 v2로 이행이 끝났고(59개 중 55개), 나머지 탭은 레거시 3계보가 섞여 있다.
따라서 화면을 하나씩 예쁘게 고치는 게 아니라, **계보를 접는 순서**로 작업한다.

---

## 1. Figma 정본 인덱스 (2026-08-17 확보)

파일: `Q3y0QyN5alY662w2qqmmcD` — 링크는 `.../Design-system_Mobile?node-id=<id>`

| node-id | Figma 프레임 | 코드 대응 | 상태 |
|---|---|---|---|
| `21-21105` | Button | `V2Button` | ✅ |
| `31-30` | Text Field | `V2TextField` | ✅ |
| `35-554` | asset (아이콘 100여 종) | `design-system-v2/icons` | ✅ |
| `47-1371` | System (상태바·키보드) | — | 참고용 |
| `50-481` | Top Navigation / -round | `V2ScreenHeader` | ✅ |
| `61-5948` | Tab Bar | `V2TabBar` | ✅ |
| `89-7358` | Bottom CTA | `V2BottomCTA` | ✅ |
| `91-8619` | Bottom Sheet | `V2BottomSheet` | ✅ |
| `91-10971` | List Row | `V2ListRow` | ✅ |
| `93-12541` | Badge | `V2Badge` | ✅ |
| `94-13137` | Checkbox | `V2Checkbox` | ✅ |
| `94-13313` | Switch | `V2Switch` | ✅ |
| `103-798` | **Grid List** | — | ❌ 코드에 없음 |
| `121-6812` | Option | `V2Option` | ✅ |
| `128-7869` | Progress Bar | `V2ProgressBar` | ✅ |
| `184-183` | Icon Button | `V2IconButton` | ✅ |
| `189-2144` | Border | `V2Divider` | ✅ |
| `217-2542` | Dialog | `V2Modal` | ✅ |
| `227-5473` | Segmented Control | `V2SegmentControl` | ✅ |
| `228-5665` | Tab | `V2Tab` | ✅ |
| `252-2137` | Search Field | `V2SearchField` | ✅ |
| `320-914` | **Board Row** (접히는 FAQ 행) | — | ❌ 코드에 없음 |
| `320-1072` | **Post** (h1~h4·문단·목록 본문 스타일) | — | ❌ 코드에 없음 |
| `571-2336` | **Menu** (오버레이 액션 메뉴) | — | ❌ 코드에 없음 |
| `571-2529` | **Toast** | `src/shared/components/Toast.tsx` | ⚠️ **레거시 위치** |
| `784-1560` | chip | `V2Chip` | ✅ |

**여기서 나온 사실 셋**

1. **21/26은 이미 코드에 있다.** 컴포넌트를 새로 만드는 일이 아니라 화면을 그 컴포넌트로 옮기는 일이다.
2. **Toast만 계보가 어긋나 있다.** Figma에 정식 스펙(성공/주의/오류/기본 4종 × 2폭)이 있는데
   코드에는 `src/shared/components/Toast.tsx`(레거시)와
   `src/features/consultation/components/CopyToast.tsx`(44줄 일회성 복제)가 따로 산다. → Wave 2에 추가.
3. **Grid List / Board Row / Post / Menu 는 코드에 없다.** 지금 각 화면이 손으로 만들어 쓰고 있을 가능성이 크다
   (예: 상담 FAQ = Board Row, 공지·약관 본문 = Post, 레시피 격자 = Grid List).

**코드에는 있는데 위 목록에 없는 v2 컴포넌트** (다른 페이지에 있을 수 있음, 링크 미확보):
`V2Card` `V2Bubble` `V2Screen` `V2EmptyState` `V2ErrorState` `V2LoadingState` `V2Skeleton` `V2DotLoader` `V2DialogHost`

---

## 1-B. 파운데이션 대조 결과 (`node-id=20-2` — Style Guide 페이지)

`20-2` 한 페이지에 **Text Styles**(`21:41`)와 **Color Styles**(Base `21:21106` / Semantic `21:21965`)가 같이 있다.
Figma 값을 전부 뽑아 `design-system-v2/tokens` 와 기계 대조했다.

| 대상 | 항목 수 | 불일치 |
|---|---:|---:|
| 원시 팔레트 (Base) | 110 | **4** |
| 시맨틱 (Light+Dark) | 39 | **5** |
| 텍스트 스타일 | 28 | **0** |

**타이포는 완전 일치다.** face·fontSize·lineHeight(=size×배수 반올림)·letterSpacing 전부 Figma와 같다.
`typography.ts` 는 손댈 것이 없다.

### 1-B-1. 고쳐야 할 색 (`tokens/colors.ts`)

★ = 다크 모드에서 **실제로 읽히지 않는 텍스트**를 만드는 값. 드리프트가 아니라 버그다.

| 토큰 | 모드 | Figma (정본) | 코드 (현재) | 성격 |
|---|---|---|---|---|
| `label.neutral` | Dark | `#c2c4c8bd` | `#65676abd` | ★ 본문 |
| `label.alternative` | Dark | `#aeb0b682` | `#65676a82` | ★ 보조 |
| `label.assistive` | Dark | `#6b7684` | `#65676a6b` | ★ 캡션 |
| `background.dim` | Dark | `#17171933` | `#1717198f` | 딤이 과함 |
| `label.neutral` | Light | `#2e2f33b3` | `#2e2f33b2` | 알파 1/255 |
| `opacityWhite.700` / `opacityBlack.700` | — | `…b3` | `…b2` | 알파 1/255 |
| `opacityWhite.900` / `opacityBlack.900` | — | `…e6` | `…e5` | 알파 1/255 |

★ 셋은 같은 실수다 — **다크용 밝은 회색이 들어가야 할 자리에 라이트용 어두운 회색이 들어갔다.**
`label.neutral` 다크를 배경 `#1f1f21` 위에 합성하면 현재 ≈`#535456`(명암비 2.0:1),
Figma 값이면 ≈`#989a9c`(≈5.4:1)다. `useV2Theme()` 는 OS 다크모드에서 `semanticDark` 를 그대로 돌려주고
**식당 탭 55개 파일이 이미 v2를 쓰므로 이건 지금 재현되는 증상이다.**

알파 1/255 건들은 반올림 방향 실수다(70% → 178.5, 90% → 229.5에서 내림). 눈에는 안 보이지만 정본과 맞춘다.

### 1-B-2. 결정이 필요한 것

**`primary.primaryWeak`** — Figma는 라이트·다크 **둘 다 `#fff1eb`** (불투명 연주황).
코드는 라이트 `#fff4f099`(알파), 다크 `#282828`(어두운 회색)로 전혀 다르다.
Figma 값을 그대로 넣으면 다크 모드에서 거의 흰 면이 된다 — 스펙이 다크를 안 나눈 것으로 보인다.
**지어내지 않는다.** 디자이너 확인 전까지 코드 값을 유지하고 주석으로 표시한다.

### 1-B-3. Figma에 없는 코드 전용 키

| 키 | 값 | 판단 |
|---|---|---|
| `background.floated` | `#ffffff` | 시트·플로팅 레이어용. Figma 미정의 → 유지하되 출처 주석 |
| `static.whiteWeak` | `#ffffff00` | 완전 투명. 유지 |
| `caption.xSmall/small/medium` | 10/11/14px | Figma 텍스트 스타일에 없음 → **정본화 요청 대상** |
| `body.mediumWeak` | Regular 17/26 | Figma는 같은 값을 `Body/Medium` 으로 부른다 → **이름만 다름**, 값은 일치 |

### 1-B-4. Figma 쪽 오타 (수정 요청)

- `label/nomal` → `normal` (코드는 이미 정정해 씀)
- `red/10` → `red/red 900` (값 `#3b0101` 은 코드와 일치)

---

## 2. 실측 현황

### 2-1. 영역별 정합도

| 영역 | 파일 | LOC | 인라인 hex | tamagui | 레거시 토큰 | useSurface | v2 사용 파일 |
|---|---:|---:|---:|---:|---:|---:|---:|
| **식당** | 59 | 16,329 | 26 | 0 | 0 | 0 | **55** |
| 레시피 | 64 | 14,057 | 132 | 23 | 37 | 126 | 18 |
| 홈 | 44 | 12,230 | 32 | 23 | 27 | 69 | 6 |
| 전체(설정) | 23 | 8,286 | 30 | 1 | 19 | 26 | 6 |
| 건강검진 | 11 | 5,143 | 170 | 0 | 9 | 0 | 7 |
| 상담 | 19 | 2,978 | 30 | 16 | 12 | 4 | 1 |
| 커뮤니티(= recipe 하위) | — | — | — | — | — | — | 0 |

앱 전체: 인라인 hex **494곳 / 고유값 171개**.

### 2-2. 계보가 넷이다

| 계보 | 진입점 | 사용 파일 수 |
|---|---|---:|
| ① **v2 (정본)** | `src/design-system-v2` | 151 |
| ② surface | `src/theme/surface.ts` · `useSurface` · `SurfacePressable` | 78 |
| ③ tamagui + 레거시 토큰 | `tamagui` · `src/theme/tokens.ts` | 87 / 92 |
| ④ 인라인 리터럴 | 파일 안의 hex 문자열 | 171개 고유값 |

④ 안에는 **tailwind slate 팔레트가 통째로 새어 들어온 파일이 하나 있다**
(`src/features/health/views/HealthDashboardScreen.tsx` — `#64748b` `#94a3b8` `#e2e8f0` `#f8fafc`).

### 2-3. 같은 역할, 다른 값

이게 눈에 보이는 불일치의 정체다.

| 역할 | v2 (정본) | surface(②) | tamagui(③) |
|---|---|---|---|
| 화면 바닥 | `background.default` `#ffffff` | `canvas` `#FFFFFF` | `appBg` `#FAFAFA` |
| 구분선 | `line.normal` `#70737c38` (≈`#d3d5d9`) | `border` `#E1E2E4` | `borderLight` `#EAEAF0` |
| 본문 잉크 | `label.normal` `#2a2a37` | `textStrong` `#17181C` | `ink` `#0D0D0D` |
| 위험 | `status.negative` `#ff4242` | `danger` `#C81E12` | `restrictionText` `#E74E4E` / `danger` `#F82F08` |
| 주의 | `status.cautionary` `#ffa938` | `caution` `#B45309` | — |

브랜드 오렌지 `#FE7139` 만 세 계보가 일치한다. 나머지 회색·상태색은 전부 어긋나 있다.

**타이포도 어긋난다.** v2는 `letterSpacing: 0` + Pretendard face로 weight를 표현하고,
레거시 `TYPE`은 전부 `letterSpacing: -0.02em` 대의 음수값을 갖는다. 같은 15px 텍스트가 탭마다 다른 폭으로 그려진다.

### 2-4. 구조도 어긋난다

각 탭이 화면 골격을 제각각 만든다 — `V2Screen` 을 쓰는 탭이 하나도 없다.

| 탭 | 라우트 LOC | 골격 |
|---|---:|---|
| 홈 | 69 | `ThemedView` |
| 커뮤니티 | 187 | 생 `View` + `insets.top` |
| 레시피 | **876** | `YStack` + `insets.top` (라우트가 렌더 트리를 다 들고 있음) |
| 식당 | 82 | feature 화면에 위임 (**정답 형태**) |
| 전체 | 1 | feature 화면에 위임 (**정답 형태**) |

`docs/mobile-frontend-architecture.md` 는 라우트 100줄 초과 시 feature 화면으로 빼라고 못 박는데,
`app/(tabs)/recipe.tsx` 가 정확한 반례다.

---

## 3. 전략 — 레버리지 순으로 접는다

494곳을 눈으로 훑어 고치는 건 하지 않는다. 팔레트가 **토큰 파일에 집중돼 있다는 점**을 쓴다
(`#E1E2E4` 2파일, `#EAEAF0` 1파일, `#C81E12` 1파일). 즉 정의부 한 곳을 바꾸면 78개 파일의 색이 한 번에 움직인다.

작업 순서의 원칙:

1. **색 정의부를 v2에 붙인다** (전 화면 동시 이동, 파일 수정 최소)
2. **팬인이 큰 공용 부품**을 v2 컴포넌트로 (`SurfacePressable` 20, `BottomActionBar` 10)
3. **탭 골격**을 `V2Screen` 으로 통일 (헤더·세이프에어리어·바닥 여백)
4. **화면 단위**로 잔여 인라인 hex 제거
5. **계보 폐기** — tamagui/레거시 토큰 임포트 금지를 lint로 고정

각 웨이브 끝마다 5개 탭을 라이트/다크로 캡처해 비교한다.

---

## 4. 우선순위 작업 목록

> 각 항목: `파일` — 규모 · 위반 · 작업 · 검증
> 위에서부터 하나씩 순서대로 진행한다.

### Wave 0 — 정본 확정 (선행, 코드 변경 거의 없음)

**0-1. Figma ↔ `design-system-v2/tokens` 드리프트 확인** — ✅ **완료** (§1-B)
원시 110 / 시맨틱 39 / 텍스트 28 전부 기계 대조. 타이포 0건, 색 9건 불일치.
근거 문서(`project/design-system-v2/design-system-base/*.md`)는 레포에 없다 —
`colors.ts` 머리말의 그 경로를 §1·§1-B의 node-id 인덱스로 갱신할 것.

**0-2. `CLAUDE.md` 의 디자인 시스템 항목이 틀렸다**
"Design System (`src/theme/`)" 로 적혀 있어 새 작업이 계속 레거시 계보로 유입된다.
탭 목록도 실제(`home / community / recipe / restaurant / all`)와 다르다. → 정본을 v2로 고쳐 쓴다.

---

### Wave 1 — 색 정의부를 v2에 접속 ★최고 레버리지

**1-0. `tokens/colors.ts` — Figma와 어긋난 9개 값 정정** ★ 선행 필수 — ✅ **적용됨 (2026-08-17)**

재대조 결과 **원시 110개 0건 불일치 / 시맨틱 39개 중 1건**(의도적으로 남긴 `primary.primaryWeak`)만 남았다.
`tsc --noEmit` 0, `eslint` 0. 토큰 참조 테스트 5개 파일 중 48 pass / 2 fail —
그 2건은 `react-native/index.js` 의 Flow 구문을 bun 이 못 읽는 **기존 환경 결함**으로,
변경 전 상태에서도 똑같이 실패한다(stash 후 재실행으로 확인).

다크 배경 `#1f1f21` 위 합성값과 WCAG 명암비:

| 역할 | 이전 | 비 | 수정 후 | 비 |
|---|---|---:|---|---:|
| `label.neutral` (본문) | `#535457` | 2.17:1 | `#98999d` | **5.78:1** (AA) |
| `label.alternative` (보조) | `#434446` | 1.69:1 | `#68696d` | 3.00:1 |
| `label.assistive` (캡션) | `#3c3d40` | 1.52:1 | `#6b7684` | 3.57:1 |

본문은 AA를 넘겼다. 보조·캡션은 3:1 대(대형 텍스트 AA)로, **Figma가 정한 값이 그렇다.**
작은 캡션에 쓰면 여전히 빠듯하므로 화면 작업 때 크기를 함께 볼 것.

> 아직 못 한 검증: **시뮬레이터 실화면 캡처.** 부팅된 기기를 다른 세션 둘(Metro 8087·8089)이
> 쓰고 있어 dev client 를 가져오면 그쪽 화면이 바뀐다. 기기가 비는 대로 식당 탭 라이트/다크를 캡처한다.

---

*(원래 계획)*
아래 Wave 1-1이 `surface.ts` 를 v2 시맨틱에서 파생시키므로, **정본이 먼저 옳아야 한다.**
지금 고치지 않으면 다크 모드 저대비 텍스트가 78개 파일로 확산된다.
- 고칠 값: §1-B-1 표 7행 (다크 label 3종 ★ + `background.dim` + 알파 1/255 4건)
- 손대지 않을 값: `primary.primaryWeak` (§1-B-2 — 디자이너 확인 대기, 주석만 추가)
- 검증: 식당 탭을 **다크 모드**로 캡처해 본문/보조/캡션 3단 위계가 읽히는지 확인.
  같은 화면 라이트 캡처와 나란히 두어 위계가 뒤집히지 않았는지 본다.

**1-1. `src/theme/surface.ts` — `LIGHT` / `DARK` 를 v2 시맨틱에서 파생**
- 규모: 정의부 40줄. **영향 78개 파일.**
- 위반: `canvas`~`caution` 21개 키가 v2와 무관하게 손으로 정해진 값.
- 작업: `SurfacePalette` 인터페이스는 **그대로 두고** 값만 `semanticLight`/`semanticDark` 에서 끌어온다.
  매핑 초안 — `canvas←background.default`, `surface←fill.normal`, `surfacePressed←fill.pressed`,
  `card←background.floated`, `border←line.normal`, `hairline←line.alternative`,
  `textStrong←label.normal`, `text←label.neutral`, `textMuted←label.alternative`,
  `placeholder←label.assistive`, `brand←primary.primary`, `danger←status.negative`,
  `caution←status.cautionary`.
- 주의: `surfaceBrand` `recordedTint` `ctaOff*` 은 v2에 대응 키가 없다. **지어내지 말고**
  primary/fill 조합으로 유도하거나, 유도가 안 되면 리터럴로 남기고 주석에 이유를 적는다.
- 검증: 홈·커뮤니티·레시피 라이트/다크 캡처. 78개 파일 중 **한 줄도 수정하지 않고** 색이 이동해야 한다.

**1-2. `src/theme/surface.ts` — `TYPE` 을 v2 typography에 정렬**
- 위반: 음수 `letterSpacing` 12종. v2는 전부 0.
- `typography.ts` 자체는 Figma와 완전히 일치하므로(§1-B) **레거시 `TYPE` 쪽만 옮기면 된다.**
- 작업: `TYPE` 각 키를 `typography.*` 로 재정의. **`singleLineInputText()` 는 손대지 않는다**
  (단일행 `TextInput` 의 `lineHeight` 제거 규칙 — 그 주석은 유지).
- 검증: 입력창 상하 여백이 틀어지지 않았는지 설정·가입 화면에서 확인.

**1-3. `src/theme/tokens.ts` — 회색/상태색을 v2로 정렬**
- 영향 92개 파일 + tamagui 테마.
- 작업: `appBg` `borderLight` `ink` `restrictionText` `danger` 등을 v2 시맨틱 값으로 교체.
  **`sub6` 계열 브랜드색은 이미 일치하므로 건드리지 않는다.**
- 검증: `src/theme/themes.ts` 를 경유하는 tamagui 화면(홈 통계·상담) 캡처.

---

### Wave 2 — 팬인 큰 공용 부품

| # | 파일 | LOC | 팬인 | 작업 |
|---|---|---:|---:|---|
| 2-1 | `src/shared/components/SurfacePressable.tsx` | — | **20** | v2 인터랙션(pressed fill)로 내부 교체. API 유지 |
| 2-2 | `src/shared/components/BottomActionBar.tsx` | 89 | **10** | `V2BottomCTA` 로 내부 교체 |
| 2-3 | `src/features/home/components/record/recordSurface.tsx` | 311 | 홈 전역 | 홈 전용 팔레트 — v2 파생으로 |
| 2-4 | `src/features/home/components/record/sheets/recordSheetControls.tsx` | 1,096 | 6 | 시트 컨트롤 전부. `V2TextField`/`V2SegmentControl`/`V2Chip` 로 |
| 2-5 | `src/features/recipe/components/FilterChip.tsx` | 123 | 3 | hex 21개(파일당 최다). `V2Chip` 으로 대체 후 삭제 |
| 2-6 | `src/shared/components/Toast.tsx` + `features/consultation/components/CopyToast.tsx` | 44 | — | Figma `571-2529` 스펙(성공/주의/오류/기본)대로 `V2Toast` 신설, 둘 다 흡수 |

---

### Wave 3 — 탭 골격 통일

**3-1. `app/(tabs)/recipe.tsx` (876줄) 을 feature 화면으로 분리**
가장 큰 구조 위반. 렌더 트리를 `src/features/recipe/views/RecipeHomeScreen.tsx` 로 옮기고
라우트는 식당 탭처럼 100줄 이하로. **분리와 v2 적용을 한 커밋에 섞지 않는다** — 먼저 옮기고, 그다음 스타일.

**3-2. 5개 탭 골격을 `V2Screen` 으로**
`home.tsx`(ThemedView) · `community.tsx`(생 View+insets) · `recipe.tsx` · `restaurant`(위임) · `all`(위임).
세이프에어리어·탭바 바닥 여백·헤더 높이를 한 군데서 정한다.

---

### Wave 4 — 화면 단위 (탭 순서 = 사용자 노출 빈도)

#### 4-A. 홈 탭

| 파일 | LOC | hex | tam | leg | surf |
|---|---:|---:|---:|---:|---:|
| `features/home/components/FoodAnalysisResult.tsx` | 1,243 | 6 | 1 | 1 | 0 |
| `features/home/components/record/RecordView.tsx` | 1,175 | 0 | 0 | 1 | 2 |
| `features/home/components/statistics/MonthCalendarSheet.tsx` | 407 | 0 | 0 | 1 | 3 |
| `features/home/components/statistics/NutrientBarSection.tsx` | 401 | 0 | 1 | 1 | 0 |
| `features/home/components/statistics/StatisticsView.tsx` | 398 | 3 | 1 | 0 | 0 |
| `features/home/components/record/MealTimeline.tsx` | 384 | 2 | 0 | 1 | 15 |
| `features/home/components/record/sheets/BloodGlucoseSheet.tsx` | 338 | 0 | 0 | 1 | 2 |
| `features/home/components/record/sheets/BloodPressureSheet.tsx` | 334 | 0 | 0 | 1 | 2 |
| `features/home/components/ShareCard.tsx` | 329 | 0 | 1 | 1 | 0 |
| `features/home/components/statistics/GlucoseTrendSection.tsx` | 327 | 1 | 0 | 2 | 5 |
| `features/home/components/record/sheets/MealSheet.tsx` | 327 | 0 | 0 | 1 | 4 |
| `features/home/components/FoodNutrientDonuts.tsx` | 234 | 6 | 1 | 1 | 0 |
| `features/home/components/record/CharacterSection.tsx` | 229 | 3 | 0 | 0 | 0 |
| `features/home/components/record/ThreeDaysCalendar.tsx` | 188 | 5 | 1 | 1 | 0 |
| (이하 tamagui 잔존 소형 12개) | | | | | |

주의: 오늘기록 타일의 3D 아이콘은 유지(타임라인은 플랫이 정본). 시트 높이는 `snapPoints` 로 잡는다 — `flex` 로 CTA를 밀어올리지 않는다.

#### 4-B. 커뮤니티 탭 (코드는 `features/recipe` 에 산다)

| 파일 | LOC | hex | surf |
|---|---:|---:|---:|
| `features/recipe/components/FreePostTab.tsx` | 730 | 11 | 9 |
| `features/recipe/components/FreePostEditor.tsx` | 664 | 5 | 7 |
| `features/recipe/components/VoteSheet.tsx` | 427 | 6 | 7 |
| `features/recipe/components/PollCard.tsx` | 350 | 7 | 7 |
| `features/recipe/components/PostListItem.tsx` | 284 | 0 | 5 |
| `features/recipe/components/StoryRail.tsx` | 263 | 3 | 9 |
| `features/recipe/components/MentionSuggestions.tsx` | 162 | 2 | 5 |
| `features/recipe/components/PopularPostCard.tsx` | 151 | 0 | 5 |
| `features/recipe/components/PostCategorySheet.tsx` | 148 | 2 | 5 |
| `app/post/[id].tsx` | 1,569 | 8 | 9 |
| `app/(write)/story/new.tsx` | 607 | 7 | 7 |
| `app/(write)/free/[id].tsx` | 549 | 4 | 7 |

#### 4-C. 레시피 탭

| 파일 | LOC | hex | tam |
|---|---:|---:|---:|
| `features/recipe/components/write/RecipeWriteForm.tsx` | 625 | 0 | 0 |
| `features/recipe/components/CuratedRecipeDetailSheet.tsx` | 586 | **16** | 1 |
| `features/recipe/components/RecipeEditor.tsx` | 554 | **11** | 1 |
| `features/recipe/components/detail/ReviewComposer.tsx` | 416 | 0 | 1 |
| `features/recipe/components/write/StepEditor.tsx` | 394 | 0 | 0 |
| `features/recipe/components/write/NutritionPreviewCard.tsx` | 294 | 0 | 0 |
| `features/recipe/components/list/RecipeFilterSheet.tsx` | 253 | 2 | 1 |
| `features/recipe/components/CategoryFilterSheet.tsx` | 235 | 3 | 1 |
| `features/recipe/components/CuratedRecipeCard.tsx` | 185 | 9 | 1 |
| (write/ 하위 소형 6개 + detail/ 소형 3개) | | | |

주의: 레시피 사진은 `thumb`/`detail` 변형을 가리킨다(2048 원본 금지). 수정·삭제 노출은 서버 `isMine` 으로만 판정.

#### 4-D. 전체(설정) 탭

| 파일 | LOC | hex | leg | surf |
|---|---:|---:|---:|---:|
| `features/settings/views/KidneyProfileEditScreen.tsx` | 882 | 7 | 2 | 0 |
| `features/settings/views/NotificationSettingsScreen.tsx` | 679 | 3 | 1 | 0 |
| `features/settings/views/MyPageScreen.tsx` | 614 | 0 | 0 | 3 |
| `features/settings/views/ProfileEditScreen.tsx` | 606 | 0 | 2 | 6 |
| `features/settings/views/MedicalReferenceScreen.tsx` | 564 | 0 | 0 | 3 |
| `features/settings/components/KidneyProfileCard.tsx` | 434 | 0 | 0 | 3 |
| `features/settings/views/SettingsScreen.tsx` | 388 | 0 | 1 | 0 |
| `app/(settings)/*.tsx` 39개 | 1,321 | 24 | 3 | 0 |

#### 4-E. 건강검진 — **hex 밀도 최악(파일당 평균 15개)**

| 파일 | LOC | hex |
|---|---:|---:|
| `features/health/views/HealthDashboardScreen.tsx` | — | tailwind slate 팔레트 통째 유입. **우선 처리** |
| `features/health/views/HealthDataEntryScreen.tsx` | 368 | 14 |
| `features/health/views/NhisAuthScreen.tsx` | 296 | 13 |
| `features/health/views/NhisConfirmScreen.tsx` | 261 | 4 |

#### 4-F. 상담 — tamagui 잔존이 가장 짙다(19개 중 16개)

| 파일 | LOC | hex |
|---|---:|---:|
| `features/consultation/components/ChatHistorySheet.tsx` | 691 | 3 |
| `features/consultation/components/ChatMessageBubble.tsx` | 472 | 11 |
| `features/consultation/components/ChatHistoryCard.tsx` | 224 | 3 |
| `app/consult.tsx` | 1,135 | 9 |
| (소형 tamagui 컴포넌트 13개 — 일괄) | | |

주의: 채팅 버블은 v2 전환 대상이지만 **채팅 리스트 자체의 스택은 바꾸지 않는다**(FlashList 전환 금지 대상).

---

### Wave 5 — 계보 폐기 고정

- `src/theme/surface.ts` · `tokens.ts` 를 v2 재수출 셸로 축소하거나 제거
- ESLint `no-restricted-imports` 로 `tamagui` 직접 임포트 금지
- 인라인 hex 리터럴 lint 규칙 (토큰 파일만 예외)
- `app/v2-showcase.tsx` 를 전 컴포넌트 커버리지로 갱신

---

## 5. 하지 않을 것

- **브랜드 오렌지 `#FE7139` 변경** — 세 계보가 이미 일치한다
- **안전 배지를 주황으로** — 이 앱에서 주황은 제한·주의 신호와 겹친다
- **다색 팔레트 도입** — 1 프라이머리 + 그레이스케일 + 시맨틱 최소
- **gorhom 시트 / 채팅 리스트 / 페이저 스택 교체** — 디자인 일관화 범위 밖
- **`singleLineInputText()` 규칙 완화** — 입력창 세로 정렬이 즉시 깨진다
- **494곳 hex 일괄 치환 스크립트** — 의미를 모른 채 바꾸면 상태색과 장식색이 뒤섞인다

---

## 6. 열린 항목 — 디자이너 확인이 필요한 것

1. **`primary.primaryWeak` 의 다크 값** (§1-B-2) — Figma가 라이트·다크를 안 나눴다. 다크 전용 값이 필요하다
2. **`caption.xSmall/small/medium` (10/11/14px)** — 코드에만 있다. Figma 텍스트 스타일로 정본화할지, 코드에서 없앨지
3. **`surfaceBrand` / `recordedTint` / `ctaOffBg`** (Wave 1-1) — v2에 대응 키가 없다
4. **Grid List / Board Row / Post / Menu** (§1) — Figma에만 있다. v2 컴포넌트로 만들지, 화면별 구현으로 둘지
5. **다크 모드 지원 범위** — 현재 설정/홈만 제대로 대응. 전 탭으로 넓힐지
6. **Figma 오타 수정** (§1-B-4) — `label/nomal`, `red/10`

### 확인 대기 중 진행 가능한 것

1~6이 막고 있는 것은 없다. Wave 1-0(색 9건 정정) → 1-1(surface 파생) → 1-2(TYPE 정렬) 은
위 항목과 무관하게 바로 진행할 수 있다.
