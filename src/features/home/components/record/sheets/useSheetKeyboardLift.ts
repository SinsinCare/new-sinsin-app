import { useMemo } from "react"
import { useAnimatedStyle } from "react-native-reanimated"
import {
  useKeyboardState,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getBottomSheetContentPadding } from "@/src/shared/utils/appBottomSheet"

/**
 * 기록 시트가 키보드를 피하는 방식 — 시트는 그대로 두고 **CTA 만 키보드 위로**.
 *
 * 루트에 세운 키보드 바(`AppKeyboardToolbar`·옛 `KeyboardDock`)는 이 시트 위로
 * 올라오지 못한다. 둘 다 내부가 `KeyboardStickyView` 라 네이티브 키보드가 아니라
 * 앱 뷰 계층에 살고, 기록 시트가 그보다 위에 그려지기 때문이다(2026-08-03 실측).
 * 그래서 키보드 대응은 반드시 **시트 안에서** 한다.
 *
 * 쓰는 법 — 시트 본문을 세로 열 세 칸으로 만든다.
 *   <Animated.View style={[styles.body, bodyStyle]}>   // body 는 flex:1
 *     <머리말/>
 *     <ScrollView style={{flexGrow:1, flexShrink:1}}>…</ScrollView>
 *     <CTA 줄/>                                        // 키보드 위로 떠오른다
 *   </Animated.View>
 * 그리고 `AppBottomSheet` 에 `contentBottomPadding={false}` — 바닥 여백을 두 겹으로
 * 주면 CTA 가 두 번 밀린다.
 *
 * `snapPoints` 로 키보드가 뜬 동안 시트를 키운다. 안 키우면 키보드가 가린 만큼
 * 본문이 눌려서, 값 옆에서 응답해야 할 판정 배지가 스크롤 밖으로 나간다.
 * 상한 90% 는 시트 위쪽 끝이 상태바(시계·배터리)에 닿지 않는 선이다.
 */
export function useSheetKeyboardLift(snapPoint: number) {
  const insets = useSafeAreaInsets()
  // 셀렉터를 준다 — 높이까지 구독하면 키보드가 뜨는 내내 매 프레임 리렌더된다.
  const keyboardShown = useKeyboardState((state) => state.isVisible)
  // 키보드 높이는 음수로 온다(translateY 용).
  const { height: keyboardOffset } = useReanimatedKeyboardAnimation()
  const restPadding = getBottomSheetContentPadding(insets.bottom)

  const bodyStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(restPadding, -keyboardOffset.value + 10),
  }))

  const snapPoints = useMemo(
    () => [keyboardShown ? Math.max(snapPoint, 90) : snapPoint],
    [keyboardShown, snapPoint],
  )

  return { bodyStyle, snapPoints, keyboardShown }
}
