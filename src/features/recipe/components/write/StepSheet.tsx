/**
 * 조리 순서 바텀시트. 폼의 `StepSummaryField` 를 누르면 열린다.
 *
 * ## 시트를 되살린 조건
 * 이 화면에는 원래 같은 시트가 있었고, 한 번 걷어냈다가(폼 인라인 = `StepEditor`)
 * 시안대로 다시 올린다. 걷어냈던 이유는 시트 자체가 아니라 **접힘 요약이 비어
 * 있었다**는 것이었다("조리 순서가 입력되었습니다"). 그래서 되살리는 조건은 하나다 —
 * 접힌 칸이 단계 수와 첫 단계 본문을 나른다(`StepSummaryField` 머리말).
 * 그 조건이 깨지면 이 시트도 같이 걷어내야 한다. 순서를 뒤집지 말 것.
 *
 * ## 이 컴포넌트는 상태를 갖지 않는다
 * `steps` 는 폼이 들고 있고 여기서는 콜백만 올린다. 시트가 자기 사본을 들고 있다가
 * `확인` 에서 넘기는 설계도 가능하지만, 그러면 시트를 스크림 탭·아래로 쓸기로 닫았을
 * 때 방금 적은 것이 조용히 사라진다("취소" 라고 쓰인 곳이 없는데 취소된다).
 * 지금은 닫는 방법이 셋(확인·스크림·쓸기)인데 셋 다 같은 결과다.
 * 예외는 드래그 중의 임시 좌표뿐 — 그건 폼이 알 필요가 없다.
 *
 * ## 스냅 포인트를 주지 않는다
 * `V2BottomSheet` 는 `enableDynamicSizing` + `maxDynamicContentSize` 로 자란다.
 * 고정 스냅을 얹으면 프레임이 최대 스냅 높이로 눕고 CTA 가 화면 밖으로 나간 사고가
 * 있었다(`docs/design/bottom-sheet-consolidation.md`). 목록이 화면을 다 먹지 않게 하는
 * 일은 스냅이 아니라 **안쪽 스크롤의 `maxHeight`** 가 한다.
 *
 * ## 목록 상한은 키패드 높이에서 거꾸로 나온다
 * 예전에는 상한이 화면의 42% **로 고정**이었고, 머리말은 "800pt 기기에서 336 — 위
 * 상수들과 합쳐 약 550 이라 키패드(≈336)가 떠도 시트가 화면을 넘지 않는다" 고 적었다.
 * 그 산수가 틀렸다(숫자는 셋 다 예전 머리말이 스스로 적어 둔 것이다). 550 은 **키패드를
 * 더하기 전** 시트 높이라, 키패드가 뜨면 550 + 336 = 886 으로 800 을 86 넘긴다.
 * 아래 `sheetChromeFor` 로 다시 세도 336 + 203 = 539 라 결론은 같다 — 800 에서 남는 자리는
 * 261 인데 그 머리말이 가정한 키패드조차 336 이었다.
 * `keyboardBehavior="interactive"` 의 gorhom 은 시트를 키패드
 * 높이만큼 올리다가 화면 위 끝에서 멈추므로(그 위로는 못 간다) 넘친 몫은 전부 **아래**
 * 로 간다 — 즉 푸터의 `확인` 이 화면 밖으로 밀린다. 42% 를 얼마로 낮춰도 기기·언어마다
 * 다른 키패드 높이를 상수 하나로 맞출 수는 없어서, 비율 대신 **실제 키패드 높이(K)** 에서
 * 거꾸로 잡는다:
 *
 *     maxHeight = max(하한, round(min(
 *       H × 0.42,
 *       H − K − CHROME(글자배율) − insets.bottom − insets.top − SHEET_TOP_GAP,
 *     )))
 *
 * `CHROME` 의 각 항이 어디서 온 값인지는 `sheetChromeFor` 주석에 적어 두었다. 그 합은
 * 더 이상 상수가 아니다 — 글자에서 나온 항은 OS 글자 배율을 탄다(같은 주석).
 * 뒤의 두 항(`insets.top` · `SHEET_TOP_GAP`)은 아래가 아니라 **위**를 지키는 몫이다.
 *
 * K 는 `useKeyboardState`(react-native-keyboard-controller)로 받는다. 같은 계보의
 * 선례가 `RecordSheetShell` 이다 — 그 시트도 `V2BottomSheet`(=네이티브 모달 안의
 * gorhom) 안에서 이 훅을 쓰고 있어서, 이 껍데기에서 훅이 도는 것이 이미 검증돼 있다.
 * **`useKeyboardHandler` 는 쓰지 않는다.** 그 훅은 마운트에서 `useResizeMode()` 로
 * `KeyboardController.setInputMode(ADJUST_RESIZE)` 를 부르는데, 안드로이드에서
 * `adjustResize` 는 gorhom 이 "OS 가 창을 줄여 줄 것" 이라 믿고 **아무것도 하지 않게**
 * 만드는 값이다(`V2BottomSheet` 이 굳이 `android_keyboardInputMode="adjustPan"` 을
 * 박아 둔 이유). 높이만 알면 되는 자리에서 전역 입력 모드를 건드릴 이유가 없다.
 *
 * ## 머리를 상태바 밑으로 넣지 않는다
 * 위 식에서 `insets.top` 과 `SHEET_TOP_GAP` 을 빼는 이유. 목록이 상한에 닿으면 시트 총
 * 높이는 `목록 + CHROME + insets.bottom` 인데, 위쪽 몫을 안 빼면 그 값이 정확히 `H − K`
 * 가 된다. gorhom 은 키패드가 뜨면 시트를
 * `max(0, 컨테이너 − (시트 높이 + 키패드))` 자리로 올리므로
 * (`@gorhom/bottom-sheet` `BottomSheet.tsx` 의 `extendedPositionWithKeyboard`)
 * 그 자리가 **0** 이다 — 시트가 화면 꼭대기에 눕고 44pt 핸들 블록이 통째로 상태바 자리에
 * 들어간다. 넘치지도 잘리지도 않는데 **닫을 방법만 사라지는** 종류의 고장이다:
 * 이 시트는 `enableContentPanningGesture={false}` 라 핸들이 유일한 닫기 그립이다.
 *
 * `V2BottomSheet` 자신의 `maxDynamicContentSize`(= `H − insets.top`)는 여기서 도움이 안
 * 된다. 그건 콘텐츠 높이의 상한인데 `H − K` 는 키패드가 떠 있는 한 늘 그보다 작아서 한
 * 번도 걸리지 않는다. 위쪽을 지키는 일은 **키패드 높이를 아는 쪽**, 즉 이 파일이 해야 한다.
 *
 * ## 입력은 반드시 `V2SheetTextInput`
 * 평범한 `TextInput` 이면 gorhom 이 포커스를 모르고 키보드 이벤트를 버려서, 키패드가
 * 뜨는데 시트는 제자리에 남아 CTA 를 그대로 덮는다. 경고도 없이 조용히 그렇게 된다.
 *
 * ## 드래그 재정렬
 * 자리 판정(`resolveDropIndex`)과 실제 이동(`moveItem`)은 `writeFormState.ts` 의 순수
 * 함수를 **그대로 쓴다.** 이 레포에는 렌더 테스트가 없어서(`jest` 가 node 환경),
 * 판정을 여기 새로 짜면 기존 재정렬 테스트가 아무것도 지키지 않는 껍데기가 된다.
 *
 * 지워진 인라인 편집기(`StepEditor`)보다 활성 임계값이 크다(5 → 12). 그쪽은 화면 스크롤과
 * 다투지만 여기서는 **목록 자신의 스크롤**과 다투는데, 그 스크롤은 시트 높이의 절반
 * 안에서 도는 짧은 것이라 손가락이 조금만 미끄러져도 스크롤이 먼저 붙는다.
 * 시트 자체와는 다투지 않는다 — `V2BottomSheet` 는 `enableContentPanningGesture=false`
 * 라 본문에서 시작한 세로 팬을 시트가 가져가지 않는다.
 *
 * ## 알려진 한계 — 보이는 만큼만 끌 수 있다
 * 드래그 중 목록이 자동으로 스크롤되지 않는다. 30단계짜리 레시피에서 1단계를 맨
 * 아래로 옮기려면 여러 번 나눠 끌어야 한다. 자동 스크롤은 손가락 위치·스크롤 오프셋·
 * 측정 배열을 한 프레임 안에서 같이 굴려야 하는 별개의 기계라, 여기서 같이 만들면
 * 재정렬 전체가 실기기에서만 검증 가능한 덩어리가 된다. 대신 순번과
 * `accessibilityRole="adjustable"`(한 칸씩 위/아래)이 그 길을 열어 둔다.
 *
 * ## 알려진 한계 — 상한은 키패드가 다 올라온 뒤에 줄어든다
 * `useKeyboardState` 는 `keyboardDidShow`/`keyboardDidHide` 에만 깨어난다(모듈이
 * 캐시하는 상태 자체가 `keyboardDidShow` 에서 갱신된다). 그래서 키패드가 올라오는
 * 동안(≈250ms)에는 상한이 아직 예전 값이고, 그 사이 CTA 는 예전처럼 화면 밖에 있다가
 * 키패드가 다 오르면 제자리로 돌아온다. 정지 상태는 맞고 전이만 한 번 튄다.
 * `useGenericKeyboardHandler` 의 `onStart` 는 애니메이션 **시작**에 목적지 높이를 주므로
 * 이 튐을 없앨 수 있지만, 그러면 gorhom 이 시트를 밀어 올리는 애니메이션과 목록이
 * 줄어드는 레이아웃 변경이 같은 250ms 안에서 겹친다 — 어느 쪽이 나은지는 실기기에서만
 * 갈리고 지금 그걸 재 볼 수 없어서, 선례가 있는 쪽을 골랐다. 실기기에서 튐이 거슬리면
 * 훅만 바꾸면 된다(계산식은 그대로).
 */

import {
  useCallback,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from "react"
import {
  Pressable,
  type ScrollView,
  type ScrollViewProps,
  StyleSheet,
  useWindowDimensions,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Text } from "@/src/shared/components/AppText"
import { useKeyboardState } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated"

import {
  radius,
  spacing,
  V2BottomSheet,
  V2SheetScrollView,
} from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import { StepSheetRow } from "./StepSheetRow"
import {
  isFilledStep,
  resolveDropIndex,
  staticOffsetFor,
  type StepRow,
} from "./writeFormState"

/** 행 사이 간격. 비워진 자리의 크기 = 행 높이 + 이 값이다. */
const ROW_GAP = 10

/**
 * 키패드가 없을 때의 목록 상한(화면 대비). 이때는 시트가 화면을 넘을 일이 없으니
 * 이 비율이 하는 일은 하나뿐이다 — 단계가 많아도 목록이 시트를 통째로 먹지 않게 하는 것.
 * 키패드가 떠 있는 동안의 상한은 이 비율이 아니라 아래 산수가 정한다(머리말 §목록 상한).
 */
const LIST_HEIGHT_RATIO = 0.42

/**
 * 목록 **밖**에서 시트 높이를 먹는 것들. 두 갈래로 나눠 둔다 — 픽셀에서 나온 항과
 * **글자에서 나온 항**. 뒤쪽은 OS 글자 배율(`fontScale`)을 그대로 탄다.
 *
 * 예외가 있는지부터 확인했다: 이 저장소에는 `allowFontScaling={false}` 가 **한 군데도
 * 없다**(2026-08-21, `grep -rn allowFontScaling src app` → 0건). 그러니 글자에서 나온
 * 항은 전부 배율을 탄다고 봐야 한다.
 *
 * 픽셀에서 나온 항 — 배율과 무관:
 *  · 핸들 44   `V2BottomSheet` `styles.handleArea` = paddingTop 16 + 바 4 + paddingBottom 24
 *  · 안내 위 8 아래 `styles.hint` 의 marginTop `spacing[8]`
 *  · 푸터 위 32 `V2BottomSheet` `styles.footer` 의 marginTop `spacing[32]`
 *  · 바닥 20   `V2BottomSheet` 의 `BottomSheetView` paddingBottom `spacing[20]`
 *
 * 글자에서 나온 항 — 배율을 곱한다:
 *  · 타이틀 27 `V2BottomSheet` `styles.title` 이 펴는 `typography.title.small` 의 lineHeight
 *  · 안내 16   아래 `styles.hint` 가 펴는 `TYPE.cardSub` 의 lineHeight
 *  · CTA       푸터의 `V2Button size="xl"` 은 `height` 가 아니라 **`minHeight`**(56,
 *              `size.controlHeight.xl`)다. 라벨 한 줄(`typography.label.medium` 의
 *              lineHeight 21)에 `V2Button` `styles.base` 의 paddingVertical 2 를 위아래로
 *              더한 값이 그 바닥을 넘으면 버튼이 따라 자란다 — 배율 (56−4)/21 ≈ 2.48 부터.
 *              안드로이드 상한(2.0) 밖이지만 iOS 접근성 크기에서는 온다.
 *
 * safe-area 하단은 같은 paddingBottom 에 더해지지만 기기마다 달라 런타임에 `insets.bottom`
 * 으로 따로 뺀다.
 *
 * **예전 주석이 틀렸다.** "안내 한 줄만 흔들린다 · 가정이 깨지는 유일한 지점" 이라고
 * 적혀 있었는데, 배율을 타는 것은 **타이틀 · 안내 · CTA 셋**이다. 적게 세면 그만큼 목록이
 * 길어지고, 남는 몫은 전부 CTA **아래**로 나간다. 이 시트는
 * `enableContentPanningGesture={false}` 라 손가락으로 끌어올릴 수도 없어서 화면 밖으로
 * 나간 CTA 는 되찾을 방법이 없다. 같은 종류의 고장이 이 저장소에 이미 한 번 있었다 —
 * `RecordSheetShell` 머리말의 "큰 글씨나 작은 기기에서는 마지막 줄이 스냅 밖으로 밀려
 * 닿을 수 없었다".
 *
 * 여전히 **한 줄 가정**이다(타이틀도 안내도 CTA 라벨도). 배율 보정은 한 줄이 얼마나
 * 커지는지만 따라가지, 두 줄로 접히는 것은 모른다. 제대로 하는 길은 머리 영역과 바닥
 * 영역을 `onLayout` 으로 **실측**하는 것이고 — 그러면 줄바꿈 · 다국어 CTA · 토큰 변경까지
 * 한꺼번에 따라온다 — 그쪽으로 가려면 `V2BottomSheet` 가 자기 머리 · 푸터 높이를 알려 주는
 * 통로를 하나 내고 이 함수를 지우면 된다. 이번에는 배율 보정까지만 한다.
 *
 * **`+ 순서 추가`(30)는 여기 없다.** 그 버튼은 목록 *안쪽* 끝에 산다(아래 `+` 주석) —
 * 목록 안의 높이는 이미 상한 안에서 세어지므로 여기 또 더하면 목록만 30 짧아진다.
 */
const CHROME_FIXED = 44 + 8 + 32 + 20 // = 104
const CHROME_TITLE_LINE = 27
const CHROME_HINT_LINE = 16
const CHROME_CTA_MIN_HEIGHT = 56
const CHROME_CTA_LINE = 21
const CHROME_CTA_PADDING_Y = 2 * 2

/**
 * 위 주석의 합. 기본 배율에서 `sheetChromeFor(1)` = 104 + 27 + 16 + 56 = **203** 이라
 * 예전 상수와 정확히 같다 — 이 갈래 나누기는 기본 배율의 산수를 바꾸지 않는다.
 */
function sheetChromeFor(fontScale: number): number {
  /*
    0 이 오면(플랫폼이 `fontScale` 을 안 채우는 경우) 배율 항이 통째로 사라져 CHROME 을
    **적게** 세게 된다 — 이 함수가 막으려는 바로 그 방향이다. 그래서 1 로 접는다.
    `PixelRatio.getFontScale()` 도 같은 이유로 `|| PixelRatio.get()` 폴백을 들고 있다.
  */
  const scale = fontScale || 1
  return (
    CHROME_FIXED +
    CHROME_TITLE_LINE * scale +
    CHROME_HINT_LINE * scale +
    Math.max(
      CHROME_CTA_MIN_HEIGHT,
      CHROME_CTA_LINE * scale + CHROME_CTA_PADDING_Y,
    )
  )
}

/**
 * 시트 머리와 상태바 사이에 남겨 두는 최소 간격. 상한 식에서 `insets.top` 과 함께 빠진다.
 *
 * `insets.top` 만으로 부족한 이유는 CHROME 이 **다른 파일의 스타일에서 베껴 온 상수**이기
 * 때문이다(`V2BottomSheet` 의 핸들 · 푸터 · 바닥). 그중 하나라도 줄면 상한이 실제보다 크게
 * 나오고, 커진 만큼 시트가 다시 위로 붙는다 — 0 이 아니라 이 8 을 먼저 먹는다.
 * 눈으로도 필요하다: 시트 윗 모서리가 `radius["4xl"]`(28)로 둥근데 딱 붙이면 그 곡률이
 * 상태바 글자 뒤에서 잘린 것처럼 보인다.
 *
 * 8 은 터치 타겟이 아니다(`size.touchTarget.min` = 44). 이 간격으로 스크림 탭이
 * 되살아나지는 않는다 — 되살아나는 것은 **핸들**이고, 그거면 된다(머리말 §머리를 상태바).
 */
const SHEET_TOP_GAP = spacing[8]

/**
 * 목록이 줄어들 수 있는 하한 — 무슨 일이 있어도 행 하나는 보여야 한다.
 * 행 48(`styles.box` 의 minHeight) + 목록 위아래 여백 16(`styles.list` 의
 * paddingTop `spacing[12]` + 아래쪽 실효 4 = paddingBottom 7 − marginBottom 3.
 * 그 7/3 짝이 왜 있는지는 `list` 주석).
 *
 * 여기에 걸리려면 `H − K − CHROME − insets.bottom − insets.top − 8 < 64` 다. 세로 667pt ·
 * 기본 배율(CHROME 203) · insets 20/0 이면 키패드가 372 를 넘어야 하는데 세로 화면에서는
 * 오지 않는 값이다(예전 주석의 400 은 위쪽 두 항을 빼기 전 수다). 실제로 걸리는 것은
 * 가로처럼 세로가 극단적으로 짧을 때이고, 그때는 시트가 화면을 넘는 쪽을 택한다 — 한 줄도
 * 못 보는 목록보다 낫다. 하한이 없으면 이 식은 음수가 되고, 음수 `maxHeight` 는 목록을
 * 통째로 지운다.
 *
 * 이 하한이 이기는 동안에는 위쪽 보호도 같이 진다 — 시트가 다시 상태바까지 올라갈 수 있다.
 * 화면이 모자라서 둘 다는 못 지키고, 그때는 보이는 행 하나를 택했다.
 */
const LIST_MIN_HEIGHT = 48 + 16

/**
 * `V2SheetScrollView` 를 **`ref` 를 아는 이름으로** 다시 부른 것. 값은 그대로다.
 *
 * 그 공용 컴포넌트의 props 타입이 `ScrollViewProps` 라 `ref` 가 빠져 있다. 런타임은
 * 멀쩡하다 — React 19 의 jsx 런타임은 `key` 만 떼고 `ref` 는 props 안에 그대로 두며
 * (`react-jsx-runtime`), RN 렌더러는 `element.props.ref` 를 파이버 ref 로 쓴다
 * (`coerceRef`). 그리고 `V2SheetScrollView` 는 받은 props 를 통째로 `ScrollView` 에
 * 펴 넘긴다. 즉 타입만 이 사실을 모른다.
 *
 * 정답은 공용 컴포넌트에 `ref` 를 얹는 것이지만 이번 작업 범위 밖이라, **캐스팅 없이**
 * 이 파일 안에서만 이름을 하나 더 붙인다(함수 매개변수는 반공변이라 그냥 대입된다).
 * 공용 쪽이 고쳐지면 이 블록을 지우고 원래 이름을 쓰면 된다.
 */
const StepScrollView: (
  props: ScrollViewProps & { ref?: Ref<ScrollView> },
) => ReactElement = V2SheetScrollView

export interface StepSheetCopy {
  /** 시트 타이틀. */
  title: string
  /** 하단 주 액션(= 닫기). */
  confirm: string
  placeholder: (index: number) => string
  add: string
  removeLabel: (index: number) => string
  limitReached: string
  dragHint: string
  dragHandleLabel: (index: number) => string
  moveUp: string
  moveDown: string
}

interface StepSheetProps {
  visible: boolean
  onClose: () => void
  rows: StepRow[]
  onChangeRow: (id: string, text: string) => void
  onAddRow: () => void
  onRemoveRow: (id: string) => void
  onReorder: (from: number, to: number) => void
  copy: StepSheetCopy
}

export function StepSheet({
  visible,
  onClose,
  rows,
  onChangeRow,
  onAddRow,
  onRemoveRow,
  onReorder,
  copy,
}: StepSheetProps) {
  const s = useSurface()
  /*
    `fontScale` 은 `PixelRatio.getFontScale()` 과 **같은 수**다 — 그 정적 메서드가 바로
    `Dimensions.get("window").fontScale` 을 읽는다(RN `Utilities/PixelRatio.js`).
    다만 이쪽은 구독한다: `useWindowDimensions` 가 `Dimensions` 의 change 를 듣고 다시
    그리므로, 앱이 떠 있는 동안 사용자가 글자 크기를 바꿔도 상한이 따라온다.
    높이 때문에 이미 부르고 있던 훅이라 새로 들일 것도 없다.
  */
  const { height: windowHeight, fontScale } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  /*
    키패드 높이. `isVisible` 로 한 번 접는 이유는 키패드가 내려간 뒤에도 모듈이 마지막
    높이를 들고 있기 때문이다 — 0 으로 접어야 상한이 원래대로 돌아온다.
    셀렉터가 수 하나라 값이 그대로면 리렌더도 없다(훅 자체도 didShow/didHide 에만 깬다).
  */
  const keyboardHeight = useKeyboardState((state) =>
    state.isVisible ? state.height : 0,
  )
  const atLimit = rows.length >= RECIPE_WRITE_LIMITS.stepMax

  /* 머리말 §목록 상한. 하한을 밖에 두어 음수·0 이 나올 수 없게 한다. */
  const listMaxHeight = Math.max(
    LIST_MIN_HEIGHT,
    Math.round(
      Math.min(
        windowHeight * LIST_HEIGHT_RATIO,
        /*
          아래쪽(`insets.bottom`)만 빼면 시트 총 높이가 정확히 `H − K` 가 되고, 그때
          gorhom 이 시트를 화면 꼭대기(0)에 눕혀 핸들이 상태바 밑으로 들어간다 —
          유일한 닫기 그립이 사라진다(머리말 §머리를 상태바 밑으로). 위쪽 몫도 뺀다.
          키패드가 없을 때는 왼쪽 비율이 늘 더 작아서 이 항이 아무것도 바꾸지 않는다.
        */
        windowHeight -
          keyboardHeight -
          sheetChromeFor(fontScale) -
          insets.bottom -
          insets.top -
          SHEET_TOP_GAP,
      ),
    ),
  )

  const drag = useSharedValue(0)
  const heights = useRef<number[]>([])
  const [fromIndex, setFromIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  /*
    같은 값을 state 와 ref 로 둘 다 든다. state 는 그리기 위해, ref 는 제스처
    콜백이 **최신 값을 즉시** 읽기 위해서다(state 는 다음 렌더에나 보인다).
  */
  const fromRef = useRef<number | null>(null)
  const dropRef = useRef<number | null>(null)

  /*
    새 행은 목록 끝에 붙는다. 목록이 상한에 닿아 있으면 그 행도 `+` 도 뷰포트 밖에
    생겨서, 방금 누른 버튼이 아무 일도 안 한 것처럼 보인다. 그래서 끝으로 따라간다.

    `V2SheetScrollView` 는 `forwardRef` 가 아니지만 받은 props 를 그대로 `ScrollView` 에
    펴 넘기고, React 19 부터 `ref` 는 함수 컴포넌트에도 **평범한 prop** 이라 그 스프레드를
    타고 그대로 도착한다 — 공용 컴포넌트를 고칠 필요가 없었다.

    스크롤 시점은 `onContentSizeChange` 다. `onAddRow()` 직후나 `requestAnimationFrame`
    에서 부르면 그 시점의 콘텐츠 높이는 **아직 새 행이 없는 높이**라 예전 끝으로 간다.
    콘텐츠 크기 변화는 줄을 지우거나 글이 줄바꿈될 때도 오므로, 방금 추가했다는 표시를
    ref 로 들고 그때만 따라간다(상태로 들면 스크롤 한 번에 렌더가 두 번 돈다).
  */
  const listRef = useRef<ScrollView>(null)
  const addedRowRef = useRef(false)

  const handleAddRow = useCallback(() => {
    addedRowRef.current = true
    onAddRow()
  }, [onAddRow])

  const handleContentSizeChange = useCallback(() => {
    if (!addedRowRef.current) return
    addedRowRef.current = false
    listRef.current?.scrollToEnd({ animated: true })
  }, [])

  const measure = useCallback((index: number, height: number) => {
    heights.current[index] = height + ROW_GAP
  }, [])

  const beginDrag = useCallback((index: number) => {
    fromRef.current = index
    dropRef.current = index
    setFromIndex(index)
    setDropIndex(index)
  }, [])

  const updateDrag = useCallback(
    (translateY: number) => {
      const from = fromRef.current
      if (from === null) return
      // 줄을 지워도 측정값 배열은 그대로 남는다. 지금 있는 줄까지만 본다 —
      // 안 자르면 목록 끝을 지나 없는 자리로 끌 수 있다.
      const next = resolveDropIndex(
        heights.current.slice(0, rows.length),
        from,
        translateY,
      )
      if (next === dropRef.current) return
      dropRef.current = next
      setDropIndex(next)
    },
    [rows.length],
  )

  const finishDrag = useCallback(() => {
    const from = fromRef.current
    const to = dropRef.current
    fromRef.current = null
    dropRef.current = null
    setFromIndex(null)
    setDropIndex(null)
    if (from !== null && to !== null && from !== to) onReorder(from, to)
  }, [onReorder])

  useAnimatedReaction(
    () => drag.value,
    (current) => {
      runOnJS(updateDrag)(current)
    },
    [updateDrag],
  )

  const draggedHeight =
    fromIndex === null ? 0 : (heights.current[fromIndex] ?? 0)

  return (
    <V2BottomSheet
      surface="recipe_write"
      visible={visible}
      onClose={onClose}
      title={copy.title}
      primaryLabel={copy.confirm}
      /*
        `확인` 은 저장이 아니라 **닫기**다. 값은 이미 폼에 들어가 있다(머리말 §상태를
        갖지 않는다). 여기서 따로 저장 동작을 만들면 스크림으로 닫은 사람만 값을
        잃는 두 갈래가 생긴다.
      */
      onPrimary={onClose}
    >
      <Text style={[styles.hint, { color: s.textMuted }]}>{copy.dragHint}</Text>

      <StepScrollView
        /*
          드래그 중에는 목록 스크롤을 끈다. 안 끄면 잡은 행과 목록이 같이 움직여서
          손가락 아래의 자리와 실제 드롭 자리가 어긋난다(측정값은 스크롤을 모른다).
          `V2SheetScrollView`(여기서는 `StepScrollView` 라는 이름으로 부른다 — 위 주석)
          는 받은 props 를 그대로 `ScrollView` 에 넘기므로 `scrollEnabled` 가 그냥
          통한다 — 별도 구멍을 낼 필요가 없었다.
        */
        ref={listRef}
        scrollEnabled={fromIndex === null}
        onContentSizeChange={handleContentSizeChange}
        style={{ maxHeight: listMaxHeight }}
        contentContainerStyle={styles.list}
      >
        {rows.map((row, index) => {
          /*
            **번호는 배열 인덱스가 아니다.** 요약(`summarizeSteps`)도 전송
            (`toCreateRecipeRequest`)도 `isFilledStep` 으로 빈 줄을 턴 뒤에 세므로,
            중간에 빈 줄이 하나만 있어도 시트의 3단계가 서버의 2단계가 된다 —
            "3번째로 무엇을 하나요?" 를 보고 적은 글이 2단계로 저장된다.
            그래서 앞쪽의 **적힌 줄만** 세어 번호를 만든다. 빈 줄은 아직 단계가 아니라
            번호를 비우고(아래 `ordinal` 렌더), 그 줄에 붙는 안내·삭제 라벨에는
            **적으면 받게 될** 번호를 준다.
          */
          const ordinal = rows.slice(0, index).filter(isFilledStep).length + 1
          return (
            <StepSheetRow
              key={row.id}
              index={index}
              ordinal={ordinal}
              total={rows.length}
              row={row}
              drag={drag}
              isDragging={fromIndex === index}
              staticOffset={staticOffsetFor(
                index,
                fromIndex,
                dropIndex,
                draggedHeight,
              )}
              onMeasure={measure}
              onBeginDrag={beginDrag}
              onFinishDrag={finishDrag}
              onChangeText={(text) => onChangeRow(row.id, text)}
              onRemove={() => onRemoveRow(row.id)}
              onMoveUp={() => onReorder(index, index - 1)}
              onMoveDown={() => onReorder(index, index + 1)}
              copy={copy}
            />
          )
        })}

        {atLimit ? (
          <Text style={[styles.limit, { color: s.textMuted }]}>
            {copy.limitReached}
          </Text>
        ) : (
          /*
            `+` 는 목록 **안쪽 끝**에 둔다. 목록 밖(고정)에 두면 늘 보이지만, 새 줄이
            붙는 자리와 버튼이 떨어져 있어 "어디에 생겼는지" 를 눈으로 못 따라간다.
            모양은 재료 `+` 와 같다 — 같은 화면에서 같은 일을 하는 버튼이 둘인데
            생김새가 다르면 둘 중 하나는 다른 일을 한다는 뜻이 된다.
          */
          <Pressable
            onPress={handleAddRow}
            accessibilityRole="button"
            accessibilityLabel={copy.add}
            /*
              상자는 30 인데(시안) 손가락은 44 다. 위아래로 7 씩 내밀어 30 + 7×2 = 44 를
              채운다. 좌우는 안 준다 — 이 버튼은 목록 폭을 다 쓰므로 이미 넉넉하다.

              **아래쪽 7 은 `styles.list` 가 들고 있다.** 이 버튼은 스크롤 콘텐츠의 마지막
              자식이라 아래 슬롭이 곧장 부모 밖인데 hitSlop 은 부모 경계를 넘지 못한다.
              그 여백이 4 이던 동안 여기 적힌 44 는 실제로 41 이었다(`list` 주석).

              위쪽 7 은 행 사이 간격(`ROW_GAP` 10) 안에서 바로 위 행 ✕ 의 hitSlop(8)과
              5pt 겹친다. 겹치는 자리는 `+` 가 가져간다(트리에서 뒤라 위에 그려진다).
              그 5pt 를 `+` 에 주는 쪽을 택한 이유는 결과의 무게가 다르기 때문이다 —
              잘못 눌리면 줄이 하나 **느는** 것이고, 반대로 기울이면 적어 둔 줄이 지워진다.
              ✕ 는 자기 28 상자와 나머지 슬롭을 그대로 들고 있다.
            */
            hitSlop={{ top: 7, bottom: 7 }}
            style={({ pressed }) => [
              styles.addButton,
              pressed
                ? { backgroundColor: s.surfaceBrand, borderColor: s.brand }
                : { backgroundColor: s.surface, borderColor: "transparent" },
            ]}
          >
            <Ionicons name="add" size={16} color={s.text} />
            <Text style={[styles.addText, { color: s.text }]}>{copy.add}</Text>
          </Pressable>
        )}
      </StepScrollView>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  /*
    가로 여백은 24 다 — `V2BottomSheet` 가 자기 타이틀과 CTA 를 24 에 두기 때문이다.
    화면 여백(`LAYOUT.screenX` = 20)을 그대로 가져오면 목록만 타이틀보다 4pt 왼쪽으로
    튀어나온다. 시트 안의 시작선은 시트가 정한다.
  */

  /*
    12px 을 `TYPE.caption`(13/18) 위에 손으로 덮어쓰고 있었다. 그러면 크기만 12 로
    내려가고 행간은 18 로 남아 스케일에 없는 12/18 조합이 된다. 정본에 12 짜리 자리가
    이미 있다 — `TYPE.cardSub`(= `typography.subtext.small`, 12/16, surface.ts 확인).
  */
  hint: {
    ...TYPE.cardSub,
    marginTop: spacing[8],
    paddingHorizontal: spacing[24],
  },
  list: {
    gap: ROW_GAP,
    paddingHorizontal: spacing[24],
    paddingTop: spacing[12],
    /*
      보이는 아래 여백은 예전과 같은 4 다(7 − 3). 스크롤 끝이 CTA 에 붙지 않게 두던 그 4
      이고, 시트 바닥 여백은 시트 몫이라 여기선 조금만 준다.

      7 은 간격이 아니라 **과녁**이다. `+` 줄은 이 콘텐츠 컨테이너의 마지막 자식이라 아래
      hitSlop 7 이 곧장 부모 밖인데, hitSlop 은 부모 경계를 넘지 못한다(RN
      `ViewPropTypes.d.ts`: "The touch area never extends past the parent view bounds.").
      여백이 4 뿐이던 동안 `+` 가 약속한 44 는 실제로 30 + 7 + 4 = **41** 이었다.
      그래서 프레임만 7 로 늘리고 늘어난 3 을 음수 마진으로 되돌린다 —
      `IngredientEditor` 의 `wrap`(paddingBottom 7 / marginBottom −7)과 같은 짝이다.

      스크롤 콘텐츠라 한 겹 더 확인해야 한다: 늘어난 7 이 스크롤 **뷰포트 안**인가.
      이 `ScrollView` 는 높이를 콘텐츠에서 받고 `maxHeight` 로만 잘리므로 끝까지 내렸을
      때든 콘텐츠가 짧을 때든 컨테이너 아래 끝 = 뷰포트 아래 끝이고, 그 7 은 양쪽 프레임
      안에 든다. 음수 마진은 콘텐츠 크기에서 빠지므로 목록 높이도 예전 그대로다.

      7 은 `spacing` 사다리에 없다(4px 그리드 + 2px 마이크로). 있을 이유도 없다 — 이 수는
      간격 스케일이 아니라 `+` 의 hitSlop 7 에서 나온다.
    */
    paddingBottom: 7,
    marginBottom: -3,
  },
  addButton: {
    /*
      30 은 시안 값이지만 **고정이 아니라 하한**이다. `height: 30` 이면 글자 배율을
      키운 기기(2.0)에서 라벨이 상자를 넘어 잘렸다. 기본 배율에서는 6 + 18(TYPE.caption
      의 lineHeight) + 6 = 30 이라 픽셀이 그대로고, 커진 만큼만 상자가 같이 자란다.
    */
    minHeight: 30,
    /*
      6 이 아니라 4 다. 이 상자에는 `borderWidth: 1` 이 **늘 있고**(눌림에서 색만 바뀐다)
      RN 은 보더를 높이에 포함하므로, 6 을 주면 18(캡션 13/18) + 12 + 2 = **32** 가 되어
      `minHeight: 30` 을 넘긴다 — 시안 실측 30 짜리 띠가 2pt 두꺼워지고, 같은 화면의
      재료 `+`(같은 계산으로 4 를 쓴다)와 높이가 갈린다. 4 면 18 + 8 + 2 = 28 이라
      `minHeight` 가 높이를 정해 정확히 30 이 된다.

      글자가 커지면 상자가 자라고 그때 이 4 가 글리프와 보더를 띄운다 —
      큰 글씨에서 안 잘리게 하려던 목적은 그대로다.
    */
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addText: { ...TYPE.caption, fontWeight: "600" },
  /** 위 `hint` 와 같은 이유로 `TYPE.cardSub`(12/16). */
  limit: { ...TYPE.cardSub },
})
