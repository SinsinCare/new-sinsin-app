import { Text } from "@/src/design-system-v2/primitives/NativeText"
// Design System v2 — Bottom Sheet
// Spec: Figma `Design system_Mobile` node 91-8619
//
// 하단에서 올라오는 시트. 겉모습(핸들 → Title/SubTitle → children → 푸터 버튼)은 Figma 정본
// 그대로이고, **역학은 `@gorhom/bottom-sheet` 가 맡는다.**
//
// ## 왜 손으로 만든 역학을 걷어냈나 (2026-08-17, 전 시트 감사)
//
// 이 컴포넌트는 원래 RN `Animated` 로 열고 닫는 자작 시트였다. 그 결과 실기기에서:
//
//  - **핸들이 장식이었다.** 손잡이를 그려 놓고 팬 제스처를 안 달아서, 아래로 쓸어도 아무 일도
//    일어나지 않았다(실측: 237pt 를 끌어도 미동 없음). 시트를 내리는 보편적 동작이 이 앱에서만
//    통하지 않았다.
//  - **키보드가 CTA 를 덮었다.** 바닥 여백으로 키보드를 피하려 했지만 그 여백이
//    `maxHeight` 에 먹혀서, 신고 시트에서 `기타` 를 고르고 입력창을 누르면 푸터가 키보드
//    뒤로 들어가고 스크롤도 없어 저장할 방법이 없었다.
//  - **콘텐츠가 넘치면 잘렸다.** children 슬롯에 스크롤이 없어서, 검진 회차 선택처럼 목록이
//    길어지는 시트는 오래된 항목이 화면 밖에 남았다.
//  - **닫는 220ms 동안 투명한 스크림이 터치를 계속 먹었다.** 닫기를 누르고 곧바로 아래를
//    누르면 그 탭이 사라졌다.
//
// 넷 다 "시트 라이브러리가 원래 해 주는 일"이다. 이 앱은 이미 지도 시트에서 gorhom 을 쓰고
// 있었으므로(가장 어려운 시트), 계보를 하나로 접으면서 위 넷을 한꺼번에 없앴다.
//
// ## 껍데기는 왜 그대로 `AppModal` 인가
//
// gorhom 의 `BottomSheetModal` 로 갈아타면 표현 모델이 **네이티브 모달 → React 트리 포털**
// 로 바뀐다. 이 앱에는 iOS 네이티브 모달 전환이 겹치면 터치가 죽는 문제 때문에 만든 전역
// 직렬화 게이트(`AppModal`/`appModalGate`)가 있고, 화면들이 그 스택 의미에 기대고 있다.
// 그래서 **표현은 건드리지 않고**(AppModal 안에 그대로 산다) 역학만 gorhom 의 비모달
// `BottomSheet` 로 바꿨다. 모달 안에서 RNGH 가 동작하려면 `GestureHandlerRootView` 가
// 모달 **안쪽**에 있어야 한다 — 아래 트리가 그 모양이다.
//
// ## 팬은 **핸들만** 잡는다
//
// `enableContentPanningGesture={false}`. 이 시트의 소비처들은 대부분 자기 `ScrollView` 를
// children 으로 넘긴다(정렬·필터·검진 회차). 콘텐츠 팬을 켜면 그 스크롤과 시트가 같은
// 손짓을 두고 다투는데, 이 시트는 스냅이 하나뿐이라 다툴 이유가 없다 — 본문은 스크롤,
// 핸들은 닫기로 역할을 나누는 편이 예측 가능하다. 대신 핸들 블록을 44pt 로 키워
// 엄지로 잡을 수 있게 했다(지도 시트와 달리 여기서는 접힘 높이를 아낄 이유가 없다).
//
// ## 고정 높이 탈출구(`snapPoints`)와 도킹 푸터(`footer`) — §4-G13
//
// 기본은 여전히 **콘텐츠 높이**다. 하지만 스토리 댓글 시트처럼 "화면의 86% 를 차지하고
// 바닥에 컴포저가 붙어 있는" 시트는 콘텐츠 높이로 만들 수 없다(목록이 짧으면 시트가
// 쪼그라들고, 길면 상한에 붙어 매번 높이가 달라진다). 그래서 `snapPoints` 를 주면
// **dynamic sizing 이 꺼진다.**
//
// ⚠️ **둘을 같이 켜면 안 되는 이유**(이 저장소가 이미 한 번 데인 자리):
// gorhom 은 `enableDynamicSizing` 이 켜져 있으면 콘텐츠 높이로 만든 스냅을 사용자가 준
// 목록에 **하나 더 밀어 넣고 정렬한다**(`useAnimatedDetents`). 그러면 스냅이 둘이 되고,
// **프레임은 가장 큰 스냅 높이로 눕는데 지금 스냅은 그보다 작아서** 아래쪽 내용(=CTA·
// 컴포저)이 화면 밖으로 나간다. 2026-08-04 레시피 필터 시트에서 `적용하기` 버튼이
// 처음부터 화면 밖이던 사고가 정확히 이 모양이었다(메모리: `sinsin-sheet-snap-trap`,
// "CTA 가 안 보이면 flex 말고 snapPoints 개수부터").
//
// 그래서 같은 이유로 **스냅을 여러 개 주면 프레임을 채우지 않는다**(`fillsFrame=false`).
// 스냅이 여럿인 시트는 작은 스냅에서 아래가 잘려 보이는 게 정상이라, 거기에 바닥 고정
// 컴포저를 붙이면 그 컴포저가 안 보이는 상태가 생긴다. 도킹 푸터를 쓰려면 스냅은 하나다.
//
// 푸터는 gorhom 의 `footerComponent` 로 넘긴다 — 시트 안 절대 위치가 아니라 **키보드를
// 따라 올라오는** 자리다(`BottomSheetFooter` 가 키보드 상태를 보고 bottomInset 을 뺀다).

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native"
// 네이티브 Modal 직접 사용 금지 — 전이 직렬화 게이트를 통과해야 한다(AppModal 머리말)
import { AppModal } from "@/src/shared/components/AppModal"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  toDurationBucket,
  trackAnalyticsEvent,
  type AnalyticsSurface,
} from "@/src/features/analytics"
import { radius, spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Button } from "./V2Button"
import { useTranslation } from "react-i18next"

/**
 * 닫힘 신호(`onChange(-1)`)가 유실됐을 때 모달을 강제로 걷는 마감시한.
 * gorhom 의 닫힘 애니메이션은 길어야 ~350ms 라 정상 경로가 이 값에 닿는 일은 없다.
 */
const CLOSE_DEADLINE_MS = 900

export type V2BottomSheetProps = {
  /**
   * 어느 시트인가 (필수). `sheet_opened`/`sheet_dismissed` 는 이름이 하나뿐이라
   * 이 값이 없으면 28곳의 시트가 한 덩어리가 되어 아무것도 못 읽는다.
   */
  surface: AnalyticsSurface
  /** 표시 여부 */
  visible: boolean
  /** dim 탭 / 아래로 쓸기 / Android 뒤로가기 / 닫기 요청 시 호출 */
  onClose: () => void
  /** 상단 타이틀 (typography.title.small) */
  title?: string
  /** 타이틀 아래 보조 설명 (typography.subtext.large) */
  subTitle?: string
  /** 콘텐츠 슬롯. 길어지면 시트가 화면 상한까지 자라고, 그 뒤는 소비처의 스크롤이 맡는다. */
  children?: ReactNode
  /** 주 액션 라벨 (Brand/Fill) */
  primaryLabel?: string
  onPrimary?: () => void
  /**
   * 주 액션 버튼 색. 삭제처럼 파괴적인 동작만 "danger" — 레드는 지우기에만 쓴다.
   * 기본은 brand.
   */
  primaryColor?: "brand" | "danger"
  /** 보조 액션 라벨 (Neutral/Weak) */
  secondaryLabel?: string
  onSecondary?: () => void
  /** 뒤 배경 딤(스크림) 표시. 기본 true (false여도 탭-투-클로즈는 유지) */
  dim?: boolean
  /** 우상단 닫기(✕). 확인 비용을 의도적으로 남기는 시트(삭제 확인 등)에서 켠다. */
  showClose?: boolean
  /**
   * **고정 높이 탈출구.** 주면 콘텐츠 높이 계산(dynamic sizing)이 꺼지고 이 스냅으로 산다.
   * 안 주면 오늘과 똑같이 콘텐츠 높이로 자란다 — 기본값은 `undefined` 다.
   *
   * 하나만 주는 것을 권한다(`["86%"]`). 여럿을 주면 프레임은 **가장 큰 스냅** 높이로
   * 눕고 지금 스냅 아래는 화면 밖이라, 바닥에 붙인 것(`footer`)이 안 보이는 상태가
   * 생긴다 — 그래서 스냅이 여럿이면 프레임 채우기를 하지 않는다(머리말 §고정 높이).
   */
  snapPoints?: (string | number)[]
  /**
   * **콘텐츠 높이로 사는가, 화면을 채우는가.** 기본 `"auto"` 는 지금 동작 그대로다 —
   * 이 값을 안 주는 시트(전부)는 한 글자도 안 바뀐다.
   *
   * `"fill"` 은 **자기 높이를 아는 표면**(채팅처럼 목록이 얼마든 길어지고 바닥에 컴포저가
   * 붙는 시트) 전용이고, 하는 일은 셋뿐이다:
   *
   *  1. 스냅 하나짜리 고정 높이(`maxDynamicContentSize - 16`)로 산다 → `snapPoints` 를
   *     손으로 준 것과 **같은 길**이다(dynamic sizing 이 꺼진다). 375×812·`insets.top` 44
   *     에서 752 = 시트 상단 y 60. 그 위에 콘텐츠 컨테이너를 **흐름 안의 `flex:1` View**
   *     로 두어 children 의 `flex:1` 이 산다(아래 ■ 두 번째 — `BottomSheetView` 가 아니다).
   *  2. 바닥 패딩(`20 + insets.bottom`)을 **붙이지 않는다.** 바닥에 붙는 것(컴포저)의
   *     여백은 소비처가 정한다 — gorhom 이 키보드 몫을 이미 넣고 있어서(아래) 여기서 한 겹
   *     더 얹으면 두 겹 보정이 된다.
   *  3. `title`/`subTitle`/`showClose` 를 쓰지 않는다(헤더는 소비처가 children 첫 블록으로
   *     그린다). **핸들은 그대로다** — 아래로 쓸어 닫는 손잡이는 여기서도 유일하다.
   *
   * ■ 왜 `enableDynamicSizing` 으로는 안 되는가 (gorhom 5.2.8 원본을 열어 확인)
   *
   * 이 시트는 `keyboardBehavior="interactive"` 다. 그런데 화면을 거의 채운 시트에는
   * **키보드를 피해 올라갈 여유가 없다** — `BottomSheet.tsx:843-856` 이
   * `max(0, highestDetentPosition - keyboardHeightInContainer)` 를 돌려주는데, 752 짜리
   * 시트의 `highestDetentPosition` 은 60 이고 키보드가 336 이면 그 값은 0 이다.
   *
   * 그래서 gorhom 은 위치가 아니라 **콘텐츠 상자를 줄인다**:
   * `BottomSheetContent.tsx:96-110` 이 상자 높이를
   * `containerHeight - 키보드높이 - handleHeight` 로 낮추고, `:183-213` 이 그 값을 마스크
   * 컨테이너의 **명시 `height`** 로 박는다(+ `paddingBottom = 키보드 높이`).
   *
   * 콘텐츠 높이로 사는 시트에서는 그 상자 안의 자식이 여전히 **자기 높이를 주장**한다.
   * 상자가 708 → 432 로 줄어도 자식은 708 그대로라 **입력바가 키보드 밑으로 사라진다.**
   * 고정 스냅이면 상자 높이가 `animatedSheetHeight - handleHeight`(`:74`)에서 파생되고
   * 자식은 `flex:1` 로 그 상자를 따라가므로, 키보드가 뜨면 목록만 줄어든다.
   *
   * ■ 왜 `BottomSheetView` + `bottom: 0` 으로는 안 되는가 (같은 실패가 되돌아온다)
   *
   * 위 보정은 두 갈래로 들어온다 — 상자 **높이**를 줄이는 쪽과, 마스크 컨테이너의
   * **`paddingBottom` 에 키보드 높이를 얹는** 쪽이다. 후자가
   * `BottomSheetContent.tsx:168-170`(`paddingBottom = overDragSafe + 키보드높이`)이고,
   * `:200-213` 이 그 값과 `height = 상자높이 + paddingBottom` 을 같은 스타일에 함께 박는다.
   * 즉 **키보드를 피할 자리는 그 padding 안에 있다.**
   *
   * 그런데 `BottomSheetView` 는 `position:absolute; top/left/right:0` 을 넘긴 스타일
   * **뒤에** 합치므로(`BottomSheetView.tsx:30-33` + `bottomSheetView/styles.ts:3-9`)
   * 늘릴 변이 `bottom` 뿐이고, 절대 위치 자식의 `bottom: 0` 은 **부모의 padding 을 빼지
   * 않는다**: yoga 는 inset 이 정의되면 높이를
   * `containingNode.measuredDimension(Height) - (border) - (top + bottom)` 로 잡는다
   * (`react-native@0.83.6/ReactCommon/yoga/yoga/algorithm/AbsoluteLayout.cpp:311-320`,
   * 위치도 같은 파일 `:204-210` 에서 border 만 뺀다). `measuredDimension` 은 padding 을
   * 포함한 **border-box** 라서, `bottom: 0` 인 자식은 키보드 몫으로 비워 둔 padding 까지
   * 통째로 먹는다. padding 이 자식 배치에 반영되는 것은 inset 이 **정의되지 않았을 때의
   * 정적 위치 계산뿐**이다(같은 파일 `:27`·`:44`·`:64-78`).
   *
   * 결과는 이 설계가 막으려던 바로 그 실패다 — 상자는 줄었는데 자식은 안 줄어서 컴포저가
   * 키보드 밑으로 사라진다. 그래서 `fill` 의 콘텐츠 컨테이너는 `BottomSheetView` 가 아니라
   * **마스크 컨테이너의 평범한 흐름 자식(`<View style={{flex:1}}>`)** 이다. 흐름 자식은
   * 부모의 content box(= height − paddingBottom) 안에서 자라므로 padding 을 그대로 존중한다.
   *
   * `BottomSheetView` 는 `auto` 에만 남는다 — dynamic sizing 이 그 `onLayout` 측정에
   * 기대기 때문이다(`BottomSheetView.tsx:44-57`).
   */
  layout?: "auto" | "fill"
  /**
   * 시트 바닥에 **도킹**되는 슬롯(댓글 컴포저 등). gorhom `footerComponent` 로 넘어가
   * 키보드를 따라 올라온다.
   *
   * `primaryLabel`/`secondaryLabel` 의 버튼 행과 다르다 — 그쪽은 콘텐츠 흐름 안에서
   * 같이 스크롤되는 CTA 고, 이건 스크롤과 무관하게 바닥에 붙어 있는 바다.
   */
  footer?: ReactNode
}

/**
 * `snapPoints` 하나로 갈리는 세 가지를 한 곳에서 정한다.
 *
 *  - `enableDynamicSizing` — 스냅을 주면 끈다. **둘 다 켜면 gorhom 이 콘텐츠 높이 스냅을
 *    하나 더 끼워 넣어 스냅이 둘이 된다**(머리말 §고정 높이의 사고).
 *  - `snapPoints` — 빈 배열은 넘기지 않는다. gorhom 은 "스냅도 없고 dynamic sizing 도
 *    없는" 조합에서 invariant 로 **던진다**.
 *  - `fillsFrame` — 콘텐츠가 시트 프레임을 꽉 채울지. 스냅이 **정확히 하나**일 때만이다.
 *    여러 개면 프레임은 가장 큰 스냅으로 눕고 지금 스냅 아래는 화면 밖이다.
 *
 * @internal 컴포넌트와 그 테스트가 쓴다.
 */
export function v2SheetSizing(snapPoints?: (string | number)[]): {
  snapPoints?: (string | number)[]
  enableDynamicSizing: boolean
  fillsFrame: boolean
} {
  const fixed = Array.isArray(snapPoints) && snapPoints.length > 0
  if (!fixed) return { enableDynamicSizing: true, fillsFrame: false }
  return {
    snapPoints,
    enableDynamicSizing: false,
    fillsFrame: snapPoints.length === 1,
  }
}

/**
 * v2 하단 시트.
 * @example
 * <V2BottomSheet
 *   surface="home_meal_delete"
 *   visible={open}
 *   onClose={() => setOpen(false)}
 *   title="삭제할까요?"
 *   primaryLabel="삭제"
 *   onPrimary={handleDelete}
 * />
 */
export function V2BottomSheet({
  surface,
  visible,
  onClose,
  title,
  subTitle,
  children,
  primaryLabel,
  onPrimary,
  primaryColor = "brand",
  secondaryLabel,
  onSecondary,
  dim = true,
  showClose = false,
  snapPoints,
  layout = "auto",
  footer,
}: V2BottomSheetProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()

  const hasPrimary = !!primaryLabel
  const hasSecondary = !!secondaryLabel
  const hasFooter = hasPrimary || hasSecondary

  /**
   * 시트가 자랄 수 있는 상한. 이보다 커지면 소비처의 스크롤이 나머지를 맡는다.
   * 상태바를 뚫지 않게 `insets.top` 을 뺀다.
   */
  const maxDynamicContentSize = Math.max(0, screenHeight - insets.top)

  /**
   * `layout="fill"` 의 스냅 **하나**. 숫자를 새로 만들지 않고 이미 있는 상한에서 16 만
   * 더 뺀다 — 상태바 아래 16pt 에 시트 상단이 앉는다.
   *
   * 매 렌더 새 배열을 만들면 gorhom 이 detent 목록이 바뀐 줄 알고 다시 계산한다.
   */
  const fillSnapPoints = useMemo(
    () => [maxDynamicContentSize - spacing[16]],
    [maxDynamicContentSize],
  )
  /*
    fill 은 "스냅을 손으로 준 것" 과 같은 길로 들어간다 — 판단은 `v2SheetSizing` 한 곳에
    그대로 남는다. 소비처가 `snapPoints` 를 직접 줬으면 그쪽이 이긴다(명시가 파생보다 세다).
  */
  const effectiveSnapPoints =
    layout === "fill" ? (snapPoints ?? fillSnapPoints) : snapPoints

  const sizing = useMemo(
    () => v2SheetSizing(effectiveSnapPoints),
    [effectiveSnapPoints],
  )

  /**
   * 모달 마운트 수명. `visible` 과 따로 두는 이유는 **닫힘 애니메이션을 끝까지 보여 주기**
   * 위해서다 — `visible` 이 false 가 되는 순간 언마운트하면 CTA 로 닫을 때만 시트가
   * 슬라이드 없이 사라져, 같은 시트가 닫는 방법에 따라 다르게 보인다.
   */
  const sheetRef = useRef<BottomSheet>(null)
  const [rendered, setRendered] = useState(visible)
  /** 콜백이 애니메이션 뒤늦은 신호를 받을 때도 부모의 최신 의도를 읽는다. */
  const desiredVisibleRef = useRef(visible)
  desiredVisibleRef.current = visible
  /**
   * 지금의 닫힘이 **부모가 시킨 것**인가(=`visible` 이 false 가 됐다). 사용자가 직접
   * 스크림·드래그·뒤로가기로 닫은 경우와 갈라야 `onClose` 가 두 번 불리지 않는다.
   */
  const closingByPropRef = useRef(false)
  /**
   * 한 번의 닫힘 동작에서 부모에게 `onClose` 를 한 번만 보낸다.
   *
   * backdrop 탭은 `onPress` 와 `onAnimate(..., -1)`, 완료 뒤 `onChange(-1)`까지
   * 세 신호를 낼 수 있다. 셋 중 하나만 믿으면 그 신호가 유실될 때 전면 모달이
   * 남고, 셋을 그대로 부모에게 보내면 화면별 닫기 부수효과가 중복 실행된다.
   */
  const closeRequestedRef = useRef(false)

  const requestClose = useCallback(() => {
    if (closeRequestedRef.current) return
    closeRequestedRef.current = true
    onClose()
  }, [onClose])

  useEffect(() => {
    if (visible) {
      closeRequestedRef.current = false
      setRendered(true)
      /*
        false → true 가 이전 닫힘 애니메이션 중에 오면 BottomSheet 컴포넌트는 아직
        마운트돼 있어 `index={0}` 이 다시 적용되지 않는다. AppModal 만 재표시되고
        gorhom 인스턴스는 -1 에 남으면 투명 전면 모달이 다시 스크롤을 먹는다.

        다음 프레임에 명시적으로 0번 스냅을 복구한다. 처음 여는 경우에도 같은 호출은
        멱등이고, 그 전에 다시 false 가 오면 정리 함수가 예약을 취소한다.
      */
      const frame = requestAnimationFrame(() =>
        sheetRef.current?.snapToIndex(0),
      )
      // `snapToIndex(0)` 이 이미 0이라 onChange를 만들지 않는 드문 경우에도
      // programmatic-close 표식이 영원히 남아 다음 드래그 닫기를 막지 않게 한다.
      const releaseClosing = setTimeout(() => {
        if (desiredVisibleRef.current) closingByPropRef.current = false
      }, CLOSE_DEADLINE_MS)
      return () => {
        cancelAnimationFrame(frame)
        clearTimeout(releaseClosing)
      }
    }
    if (!rendered) return
    closingByPropRef.current = true
    sheetRef.current?.close()

    /*
      ── 언마운트를 `onChange(-1)` **하나에만** 걸지 않는다 ────────────────────
      `rendered` 가 true 인 동안 이 시트는 전면 네이티브 모달(`AppModal`)이다.
      투명하고 스크림도 사라진 상태라 **화면은 멀쩡해 보이는데 아래의 모든 탭이
      죽는다.** 그리고 `AppModal` 의 전역 게이트는 "형제 모달이 보이는 동안"
      다른 모달의 present 를 미루므로, 하나가 이 상태로 굳으면 앱의 모든
      시트·확인창이 같이 안 뜬다.

      그 하나뿐인 탈출구가 gorhom 의 `onChange(-1)` 이었다. 그런데 그 신호는
      **안 올 수 있다**: 아직 열린 적이 없어 인덱스가 이미 -1 이면 `close()` 는
      아무 변화도 만들지 않고(따라서 `onChange` 도 없고), `sheetRef` 가 아직
      안 붙은 틱에 `visible` 이 꺼지면 `close()` 자체가 no-op 이다.

      그래서 마감시한을 둔다. 정상 경로에서는 항상 `onChange(-1)` 가 먼저 오고,
      이 타이머는 **굳은 경우에만** 늦게 도착해 모달을 걷어 낸다. 늦게 걷히는
      시트(최악 애니메이션 한 번 분량)와 앱 전체가 굳는 것 중 어느 쪽이 나은지는
      비교할 필요가 없다.
    */
    const timer = setTimeout(() => setRendered(false), CLOSE_DEADLINE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  /*
    열림·닫힘을 짝으로 센다. `visible` 에 걸고 정리 함수에서 닫음을 쏘면 **어떻게 닫혔든**
    (CTA·스크림 탭·아래로 쓸기·안드 뒤로가기·화면 언마운트) 한 번씩만 나간다 —
    닫는 길마다 따로 심으면 그중 하나가 빠져도 티가 안 난다.

    `rendered` 가 아니라 `visible` 에 거는 이유: `rendered` 는 닫힘 애니메이션이 끝날
    때까지 남으므로, 그걸 기준으로 재면 체류에 매번 애니메이션 시간이 얹힌다.
  */
  useEffect(() => {
    if (!visible) return
    const openedAt = Date.now()
    trackAnalyticsEvent("sheet_opened", { surface })
    return () => {
      trackAnalyticsEvent("sheet_dismissed", {
        surface,
        dwell_bucket: toDurationBucket(Date.now() - openedAt),
      })
    }
  }, [visible, surface])

  /*
    키패드가 내려가면 콘텐츠 높이로 **되돌린다.**

    gorhom 의 `keyboardBlurBehavior="restore"` 만으로는 안 됐다(2026-08-17 iPhone 17 Pro
    실측): 키패드가 뜨면 시트가 그만큼 올라가는데, 내려간 뒤에도 올라간 자리에 그대로
    남아서 CTA 아래로 빈 흰 띠 330pt 가 생겼다. 값과 CTA 는 살아 있으니 조용히 이상해
    보이기만 하는 종류의 결함이라 마우스로는 안 보인다 — 키패드를 실제로 띄워 봐야 나온다.
    (`restore` 는 저장된 스냅 인덱스로 돌아가는데, 콘텐츠 높이로 사는 시트에서는 그 계산이
    임시 위치를 못 벗어난다.)

    닫히는 중일 때는 건드리지 않는다 — 저장 CTA 는 키보드를 내리고 곧바로 시트를 닫으므로,
    거기서 스냅을 걸면 닫히던 시트를 다시 세운다.

    **고정 스냅 시트(`snapPoints`)에서는 이 보정을 하지 않는다.** 위 결함은 "콘텐츠 높이로
    만든 임시 스냅" 에서만 나는 것이고, 스냅이 명시돼 있으면 gorhom 의 `restore` 가
    `detents[currentIndex]` 로 정확히 되돌린다. 여기서까지 0번으로 밀면 사용자가 위 스냅으로
    끌어 올려 둔 시트가 키패드를 내릴 때마다 아래 스냅으로 내려앉는다.

    `layout="fill"` 도 같은 갈래다(스냅을 파생으로 하나 만들 뿐이라 `enableDynamicSizing`
    이 꺼진다). 스냅이 하나뿐이므로 `restore` 의 `detents[currentIndex]` 는 곧 제자리이고,
    `isInTemporaryPosition` 도 그 가지에서 함께 풀린다(`BottomSheet.tsx:800-813`).
  */
  useEffect(() => {
    if (!rendered) return
    if (!sizing.enableDynamicSizing) return
    const subscription = Keyboard.addListener("keyboardDidHide", () => {
      if (closingByPropRef.current) return
      sheetRef.current?.snapToIndex(0)
    })
    return () => subscription.remove()
  }, [rendered, sizing.enableDynamicSizing])

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index !== -1) {
        // 새 열림이 실제로 도착한 뒤에야 이전 programmatic close 표식을 푼다.
        closingByPropRef.current = false
        return
      }

      if (desiredVisibleRef.current && closingByPropRef.current) {
        // false → true 재열기 뒤에 도착한 **이전 닫힘** 완료 신호다. 새 표면을
        // 내리지 말고 부모가 원하는 열린 스냅을 다시 확정한다.
        sheetRef.current?.snapToIndex(0)
        return
      }

      setRendered(false)
      // 부모가 시킨 닫힘이면 이미 알고 있다 — 다시 알리면 두 번 닫힌다.
      if (closingByPropRef.current) return
      requestClose()
    },
    [requestClose],
  )

  /*
    사용자가 핸들을 내려 닫는 경우에도 **애니메이션 시작 시점**에 부모 visible 을
    내린다. 종전에는 완료 신호 `onChange(-1)` 만 기다렸고, 그 신호가 빠지면
    `visible=false` 에 걸린 CLOSE_DEADLINE_MS 안전장치조차 시작되지 않았다.

    backdrop 은 아래 `onPress` 에서 먼저 요청하지만 `requestClose` 가 한 번으로 접는다.
    부모가 이미 visible 을 내린 programmatic close 는 `closingByPropRef` 로 건너뛴다.
  */
  const handleSheetAnimate = useCallback(
    (_fromIndex: number, toIndex: number) => {
      if (toIndex !== -1 || closingByPropRef.current) return
      requestClose()
    },
    [requestClose],
  )

  /*
    ── 스크림 탭은 **우리 것**이다 (2026-08-24, 열리는 중 탭이 삼켜지던 결함) ──────

    gorhom 의 `BottomSheetBackdrop` 은 자기 터치 가능 여부를 UI 스레드 애니메이션
    값으로 판정하고 그 결과를 `runOnJS` → `setState` 로 넘긴다
    (`BottomSheetBackdrop.tsx` 의 `useAnimatedReaction`). 그 반응은 마운트 직후
    `animatedIndex <= disappearsOnIndex` 가 참이라 **먼저 `pointerEvents: "none"`
    으로 내려간 뒤**, 인덱스가 -1 을 벗어나고 나서야 왕복을 거쳐 `"auto"` 로 돌아온다.

    그래서 시트가 올라오는 첫 ~100ms 동안 스크림은 **보이는데 눌리지 않는다.**
    사용자에게는 "딤을 눌렀는데 아무 일도 없고 시트가 계속 올라온다" 로 보인다
    (실측 2026-08-24, 릴리즈 빌드: 0·50·100ms 에 탭하면 시트가 그대로 열린 채
    남고 150ms 부터 정상. 픽셀 오라클로 판정).

    딤 그리기는 계속 gorhom 에게 맡기고(인덱스에 따른 페이드가 그쪽 일이다),
    **누르는 층만 우리가 깐다.** 이 층은 `pointerEvents` 를 남에게 위임하지 않으므로
    열림 애니메이션의 어느 시점에도 살아 있다. gorhom 의 `pressBehavior` 는 끈다 —
    닫기는 `requestClose` → 부모 `visible=false` → 우리 effect 의 `close()` 라는
    한 줄기로만 흐르는 편이 신호가 겹치지 않는다.

    이 층은 gorhom 트리에서 시트 컨테이너보다 **먼저** 렌더되므로(BottomSheet.tsx
    의 `BackdropComponent` → `BottomSheetHostingContainer` 순서) 시트 자신을 덮지
    않는다.
  */
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <>
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={dim ? 1 : 0}
          pressBehavior="none"
          /*
            `opacity` 를 1 로 두고 색을 `background.dim` 으로 준다 — 딤의 농도는 토큰이
            정한다. `dim={false}` 여도 스크림은 남는다(탭-투-클로즈를 잃지 않기 위해).
          */
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: dim ? colors.background.dim : "transparent" },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          onPress={requestClose}
          style={StyleSheet.absoluteFill}
        />
      </>
    ),
    [colors.background.dim, dim, requestClose, t],
  )

  /** 핸들. 인라인 화살표로 넘기면 매 렌더 새 타입이 되어 드래그 도중 제스처가 끊긴다. */
  const renderHandle = useCallback(
    () => (
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={t("action.close")}
        style={styles.handleArea}
      >
        <View
          style={[styles.handleBar, { backgroundColor: colors.label.disable }]}
        />
      </View>
    ),
    [colors.label.disable, t],
  )

  /**
   * 도킹 푸터. gorhom 이 키보드 상태를 보고 위치를 잡아 준다 — 키패드가 뜨면 그 위로
   * 붙고(그때 `bottomInset` 은 자동으로 빠진다), 내려가면 safe-area 위로 돌아온다.
   */
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom}>
        {footer}
      </BottomSheetFooter>
    ),
    [footer, insets.bottom],
  )

  const backgroundStyle = useMemo(
    () => [styles.sheet, { backgroundColor: colors.background.default }],
    [colors.background.default],
  )

  /*
    **`auto` 경로(=`BottomSheetView`)의 스타일이다.** `layout="fill"` 은 이 값을 쓰지
    않는다 — 그쪽 콘텐츠 컨테이너는 절대 위치가 아니라 흐름 안의 `styles.fillContent`
    (`flex:1`)이고, 이유는 `layout` prop 머리말 ■ 두 번째다.

    콘텐츠 컨테이너 스타일은 **객체 하나**로 만든다(배열 금지).
    gorhom 의 `enableFooterMarginAdjustment` 는 넘어온 스타일이 배열이면
    `StyleSheet.compose(...style)` 로 합치는데, `compose` 는 인자를 둘만 받는다 —
    세 번째부터는 조용히 사라진다.

    가로 패딩은 시트 전체가 아니라 헤더/푸터에만 준다 → children(리스트 행 등)은
    full-bleed. 각 행이 자체 좌우 패딩(sideMargin)으로 제목·안내문과 같은 x 에
    정렬되고, 눌림/구분선도 시트 폭 전체로 자연스럽게 확장된다.
  */
  const contentStyle = useMemo<ViewStyle>(
    () => ({
      /*
        하단 내부 패딩 20 + safe-area 하단.

        `fill` 에는 **조건문이 필요 없다.** 그 시트는 이 스타일 자체를 안 쓴다
        (`styles.fillContent`). 그 바닥은 콘텐츠의 끝이 아니라 컴포저이고, 컴포저의 여백은
        키보드 유무로 갈린다(소비처 몫) — 여기서 한 겹 얹으면 gorhom 이 이미 넣는
        `paddingBottom = 키보드 높이`(BottomSheetContent.tsx:168-170) 위에 두 겹이 된다.
      */
      paddingBottom: spacing[20] + insets.bottom,
      /*
        고정 높이 시트에서만: 프레임 바닥까지 늘린다. gorhom 의 `BottomSheetView` 는
        `position:absolute` + `top:0` 이라 기본은 **콘텐츠 높이**다(그래야 dynamic
        sizing 이 그 높이를 잰다). 그 상태로는 안쪽 목록에 `flex:1` 을 줘도 늘어날
        높이가 없어서 시트만 크고 목록은 0 이 된다.

        **`BottomSheetView` 에 `flex:1` 을 주는 것으로는 안 된다.** 그쪽 스타일은
        `[넘긴 스타일, styles.container]` 순서로 합쳐지는데(`BottomSheetView.tsx:30-33`)
        `styles.container` 가 `position:absolute; top/left/right:0` 이고 `bottom` 만
        없다(`bottomSheetView/styles.ts:3-9`). 즉 뒤에 오는 절대 위치가 이기고, 늘릴 변은
        `bottom` 뿐이다 — 그래서 `flex` 가 아니라 `bottom: 0` 이다.

        ⚠️ 그 `bottom: 0` 은 **키보드를 못 피한다.** 절대 위치 자식은 부모의
        `paddingBottom`(= gorhom 이 키보드 몫으로 비워 둔 자리)을 빼지 않기 때문이다
        (`layout` prop 머리말 ■ 두 번째, yoga `AbsoluteLayout.cpp:311-320`). 그래서 이
        길은 **바닥에 입력을 붙이지 않는** 고정 높이 시트 전용이다. 키보드 위에 살아
        있어야 하는 바가 있으면 `snapPoints` 가 아니라 `layout="fill"` 을 쓴다.
      */
      ...(sizing.fillsFrame ? { bottom: 0 } : null),
    }),
    [insets.bottom, sizing.fillsFrame],
  )

  if (!rendered) return null

  /*
    콘텐츠 슬롯의 **속**은 두 레이아웃이 글자 하나까지 같다 — 갈리는 것은 그 속을 담는
    상자뿐이다(`auto` = gorhom `BottomSheetView`, `fill` = 흐름 안의 `flex:1` View).
    한 번만 쓰고 두 갈래에 나눠 주는 이유가 그것이다: JSX 를 두 벌 적으면 헤더·CTA 같은
    것이 한쪽에만 들어가는 표류가 시작된다.
  */
  const sheetBody = (
    <>
      {/* 우상단 닫기(옵션) — 타이틀과 같은 높이에 앉는다. */}
      {showClose && (
        <V2SheetCloseButton onPress={requestClose} label={t("action.close")} />
      )}

      {!!title && (
        <Text
          style={[styles.title, { color: colors.label.normal }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {title}
        </Text>
      )}
      {!!subTitle && (
        <Text
          style={[styles.subTitle, { color: colors.label.neutral }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {subTitle}
        </Text>
      )}

      {children}

      {/*
        푸터 — Button Area (V2Button size xl).
        버튼이 하나여도 `styles.footerButton`(flex:1) 을 준다. 푸터가 row 라
        `fullWidth`(alignSelf:stretch)는 **세로로만** 늘어난다 — 그래서 취소
        하나짜리 시트의 버튼이 왼쪽에 알약만 하게 붙어 있었다(QA 2026-08-06).
      */}
      {hasFooter && (
        <View style={styles.footer}>
          {hasSecondary && (
            <V2Button
              size="xl"
              color="neutral"
              variant="weak"
              style={styles.footerButton}
              onPress={onSecondary}
            >
              {secondaryLabel}
            </V2Button>
          )}
          {hasPrimary && (
            <V2Button
              size="xl"
              color={primaryColor === "danger" ? "danger" : "brand"}
              variant="fill"
              style={styles.footerButton}
              onPress={onPrimary}
            >
              {primaryLabel}
            </V2Button>
          )}
        </View>
      )}
    </>
  )

  return (
    <AppModal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      {/* 네이티브 모달 안에서 RNGH 가 살려면 루트가 모달 **안쪽**에 있어야 한다(안드로이드). */}
      <GestureHandlerRootView style={styles.root}>
        <BottomSheet
          ref={sheetRef}
          // Expose the fields and buttons individually instead of grouping the
          // whole form into a single adjustable element on iOS.
          accessible={false}
          /*
            `index={0}` 으로 열린 채 마운트한다. 모달 자체가 `visible` 로 켜고 꺼지므로
            시트의 열림/닫힘 애니메이션과 모달의 마운트가 한 번씩만 일어난다.
          */
          index={0}
          /*
            기본은 콘텐츠 높이 — 고정 퍼센트 스냅이 콘텐츠를 자르던 문제가 사라진다.
            `snapPoints` 를 받은 시트만 고정 높이로 산다(둘을 같이 켜지 않는 이유는
            머리말 §고정 높이).
          */
          snapPoints={sizing.snapPoints}
          enableDynamicSizing={sizing.enableDynamicSizing}
          maxDynamicContentSize={maxDynamicContentSize}
          /** 아래로 쓸어 닫기. 핸들이 장식이 아니게 되는 지점이다. */
          enablePanDownToClose
          /* 본문은 소비처의 스크롤 몫이다(파일 머리말 §팬은 핸들만). */
          enableContentPanningGesture={false}
          enableOverDrag={false}
          /* 키보드는 라이브러리가 피한다 — 자작 바닥 여백이 maxHeight 에 먹히던 문제. */
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          /*
            **`adjustResize` 를 쓰면 안드로이드에서 키보드가 CTA 를 덮는다**(2026-08-17
            에뮬레이터 실측). 매니페스트의 MainActivity 는 `adjustResize` 지만 이 시트는
            네이티브 `Modal`(AppModal) **안**에 살고, 모달은 자기 윈도우라서 그 리사이즈를
            물려받지 않는다. 그런데 gorhom 은 `adjustResize` 면 "OS 가 창을 줄여 줄 것"이라
            보고 키보드 높이를 0 으로 만들고 **아무것도 하지 않는다**(BottomSheet 의
            OnKeyboardStateChange). 그래서 창도 안 줄고 시트도 안 올라가, 혈압 시트에서
            키패드가 판정·구간 바·CTA 를 통째로 덮었다.
            `adjustPan` 으로 두면 gorhom 이 iOS 와 같은 경로로 시트를 직접 밀어 올린다.
          */
          android_keyboardInputMode="adjustPan"
          bottomInset={0}
          onAnimate={handleSheetAnimate}
          onChange={handleSheetChange}
          backdropComponent={renderBackdrop}
          handleComponent={renderHandle}
          footerComponent={footer != null ? renderFooter : undefined}
          backgroundStyle={backgroundStyle}
          style={styles.sheetShadow}
        >
          {/*
            콘텐츠 컨테이너는 레이아웃마다 다른 물건이다 — 여기가 이 파일에서 `fill` 이
            `auto` 와 갈리는 **두 자리 중 하나**다(다른 하나는 `effectiveSnapPoints`).

            `fill` — 마스크 컨테이너(`BottomSheetContent` 의 DraggableView)의 **평범한
            흐름 자식**이다. gorhom 은 키보드 대응을 그 컨테이너의
            `paddingBottom = overDragSafe + 키보드높이` 로 하는데
            (`BottomSheetContent.tsx:168-170`, 그 값과 `height` 를 `:200-213` 이 함께
            박는다), 흐름 자식만이 그 padding 을 존중한다. `BottomSheetView` 를 쓰면
            `position:absolute` 가 강제되고(`bottomSheetView/styles.ts:3-9`) 절대 위치
            자식의 `bottom: 0` 은 부모 padding 을 **빼지 않아**
            (yoga `AbsoluteLayout.cpp:311-320` — 높이를 `measuredDimension(=border-box)
            - border - (top+bottom)` 로 잡는다) 키보드 몫까지 먹는다. 그러면 컴포저가
            키보드 밑으로 사라진다 — 이 설계가 막으려던 바로 그 실패다.
            (근거 전문은 `layout` prop 머리말 ■ 두 번째.)

            `auto` — `BottomSheetView` 그대로다. dynamic sizing 이 그 `onLayout` 측정에
            기대므로(`BottomSheetView.tsx:44-57`) 여기서 바꾸면 27곳이 높이를 잃는다.
            `enableFooterMarginAdjustment` 도 그쪽에만 있는 물건이다.
          */}
          {layout === "fill" ? (
            <View style={styles.fillContent}>{sheetBody}</View>
          ) : (
            <BottomSheetView
              /* 푸터가 있으면 그 높이만큼 콘텐츠 하단 패딩을 늘린다(마지막 행이 안 가리게). */
              enableFooterMarginAdjustment={footer != null}
              style={contentStyle}
            >
              {sheetBody}
            </BottomSheetView>
          )}
        </BottomSheet>
      </GestureHandlerRootView>
    </AppModal>
  )
}

/**
 * 우상단 ✕. 32pt 원 + hitSlop 으로 44pt 를 채운다.
 * 별도 컴포넌트인 이유: `V2BottomSheet` 본문에서 `useV2Theme` 를 한 번 더 부르지 않으려고.
 */
function V2SheetCloseButton({
  onPress,
  label,
}: {
  onPress: () => void
  label: string
}) {
  const { colors } = useV2Theme()
  return (
    <View style={styles.closeButton}>
      <V2Button
        size="s"
        color="neutral"
        variant="weak"
        accessibilityLabel={label}
        onPress={onPress}
        style={styles.closeCircle}
      >
        <Text style={[styles.closeGlyph, { color: colors.label.neutral }]}>
          ✕
        </Text>
      </V2Button>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  /**
   * `layout="fill"` 의 콘텐츠 컨테이너. **절대 위치가 아니라 흐름 자식이다** — 그래야
   * gorhom 이 키보드 몫으로 마스크 컨테이너에 얹는 `paddingBottom` 안쪽,
   * 즉 `height - paddingBottom` 만큼만 차지한다(근거는 `layout` prop 머리말 ■ 두 번째).
   * 바닥 패딩을 주지 않는 것도 규약이다 — 그 자리는 소비처의 컴포저 몫이다.
   */
  fillContent: { flex: 1 },
  sheet: {
    // 상단 radius 28 (하단은 화면 밖 → top radius만 시각화)
    borderTopLeftRadius: radius["4xl"],
    borderTopRightRadius: radius["4xl"],
  },
  sheetShadow: {
    shadowColor: "rgb(0, 27, 55)",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  /**
   * 핸들 블록 44pt(16 + 4 + 24). 이 시트는 접힘 높이를 아낄 이유가 없으므로 지도 시트와
   * 달리 최소 터치 타겟을 그대로 채운다 — 여기가 아래로 쓸어 닫는 유일한 손잡이다.
   */
  handleArea: {
    alignItems: "center",
    paddingTop: spacing[16],
    paddingBottom: spacing[24],
  },
  handleBar: {
    width: 48,
    height: 4,
    borderRadius: radius.full,
  },
  title: {
    ...typography.title.small,
    paddingHorizontal: spacing[24],
  },
  subTitle: {
    ...typography.subtext.large,
    marginTop: spacing[8],
    paddingHorizontal: spacing[24],
  },
  footer: {
    flexDirection: "row",
    gap: spacing[8],
    marginTop: spacing[32],
    paddingHorizontal: spacing[24],
  },
  footerButton: { flex: 1 },
  closeButton: {
    position: "absolute",
    top: 0,
    right: spacing[20],
    zIndex: 1,
  },
  closeCircle: {
    width: 32,
    height: 32,
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 0,
  },
  closeGlyph: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "600",
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
})
