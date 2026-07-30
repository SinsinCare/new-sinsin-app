/**
 * 하단 등록 바 — **왜 못 누르는지를 버튼 위에 적는다.**
 *
 * 시안(`Home_Recipes_writing-16`)은 등록 버튼이 회색인데 이유가 화면 어디에도 없다.
 * 사용자는 위로 올라가 다섯 칸을 다시 살펴야 하고, 그중 어느 것이 필수인지도 모른다.
 * 여기서는 남은 것 중 **첫 번째 한 줄**만 말한다("한 줄 소개를 적어주세요") —
 * 다섯 개를 한꺼번에 나열하면 그것도 읽히지 않는다.
 *
 * 다 채우면 그 자리에 "이제 등록할 수 있어요" 가 들어간다. 자리를 비우면 문구가
 * 사라질 때 버튼이 위로 튀어 손가락 아래 위치가 바뀐다.
 */

import { StyleSheet, Text, View } from "react-native"

import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

interface WriteSubmitBarProps {
  /** 버튼 위 한 줄. 남은 것이 있으면 그 이유, 없으면 준비됐다는 말. */
  statusText: string
  label: string
  onPress: () => void
  disabled: boolean
  paddingBottom: number
}

export function WriteSubmitBar({
  statusText,
  label,
  onPress,
  disabled,
  paddingBottom,
}: WriteSubmitBarProps) {
  const s = useSurface()

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom,
          backgroundColor: s.canvas,
          borderTopColor: s.hairline,
        },
      ]}
    >
      <Text
        style={[styles.status, { color: disabled ? s.textMuted : s.textWeak }]}
        accessibilityLiveRegion="polite"
      >
        {statusText}
      </Text>
      <SurfacePressable
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={`${label}. ${statusText}`}
        baseColor={disabled ? s.ctaOffBg : s.brand}
        pressedColor={disabled ? s.ctaOffBg : s.brand}
        haptic={!disabled}
        style={styles.button}
      >
        <Text
          style={[
            styles.buttonText,
            { color: disabled ? s.ctaOffText : s.onBrand },
          ]}
        >
          {label}
        </Text>
      </SurfacePressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  status: { ...TYPE.caption, textAlign: "center" },
  button: {
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { ...TYPE.cta, fontWeight: "700" },
})
