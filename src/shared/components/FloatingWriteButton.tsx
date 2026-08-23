import { StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "./SurfacePressable"
import { V2Text } from "@/src/design-system-v2"
import {
  FLOATING_AI_BUTTON_HEIGHT,
  floatingAiButtonBottomInScreen,
} from "./floatingAiButtonLayout"

/** 필의 높이. 스타일과 여백 계산이 같은 값을 봐야 한다. */
export const FLOATING_WRITE_BUTTON_HEIGHT = 44

/** 전역 AI 상담 필과 글쓰기 필 사이 간격. */
const STACK_GAP = 12

/**
 * 전역 `AI 상담` 필 **위**에 쌓이는 브랜드색 작성 버튼.
 *
 * ## 왜 컴포넌트로 뽑았나
 *
 * 커뮤니티와 레시피가 같은 자리에 같은 규칙으로 이 버튼을 둔다. 좌표를 각자 계산하면
 * 한쪽만 어긋나고, 그 어긋남은 **화면에서만** 보인다(타입도 린트도 통과한다).
 * 실제로 커뮤니티가 그렇게 필 뒤에 깔렸다(2026-08-19).
 *
 * ## 좌표계 (중요)
 *
 * 이 버튼은 탭 **화면 안**의 절대 위치라 원점이 **화면 바닥**이다. 반면 AI 상담 필은
 * 탭 네비게이터 밖에서 그려져 원점이 다르다 — `tabBarStyle: { position: "absolute" }`
 * 라 탭바가 레이아웃 공간을 안 먹기 때문이다. 그래서 필과 같은 산술을 쓰면 안 되고
 * `floatingAiButtonBottomInScreen()` 로 변환한 뒤 그 위로 쌓아야 한다.
 *
 * ## 색
 *
 * 브랜드색을 쓴다. AI 상담은 잉크색이라 **위계가 색으로 갈린다** — 같은 자리에 둘이
 * 겹쳐 있어도 "쓰기" 와 "묻기" 가 헷갈리지 않는다.
 */
export function FloatingWriteButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  accessibilityLabel: string
}) {
  const insets = useSafeAreaInsets()
  const surface = useSurface()

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom:
            floatingAiButtonBottomInScreen(insets.bottom) +
            FLOATING_AI_BUTTON_HEIGHT +
            STACK_GAP,
        },
      ]}
    >
      <SurfacePressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        baseColor={surface.brand}
        pressedColor="#E9632F"
        pressScale={0.94}
        style={styles.button}
      >
        <Ionicons name="add" size={18} color={surface.onBrand} />
        <V2Text
          color={surface.onBrand}
          lineBreakStrategyIOS="hangul-word"
          style={styles.label}
        >
          {label}
        </V2Text>
      </SurfacePressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 20,
    // `bottom` 은 insets 가 필요해 렌더에서 준다.
  },
  button: {
    height: FLOATING_WRITE_BUTTON_HEIGHT,
    borderRadius: FLOATING_WRITE_BUTTON_HEIGHT / 2,
    paddingLeft: 12,
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
})
