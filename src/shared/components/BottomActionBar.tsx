import React from "react"
import { View, StyleSheet, Text } from "react-native"

import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

interface BottomActionBarProps {
  label: string
  onPress: () => void
  disabled?: boolean
  paddingBottom?: number
}

/**
 * 화면 하단의 주 행동 하나. 설정·탈퇴·문의·건강자료 화면이 전부 이걸 쓴다.
 *
 * 사양은 시트의 CTA 표(h56 r16, 브랜드 면)를 그대로 따른다 — 예전엔 구 초록
 * (sub6) + r8 이라 같은 앱의 다른 CTA 들과 따로 놀았다. 꺼진 상태는 반투명이
 * 아니라 전용 면(ctaOffBg)으로 말한다. 반투명 브랜드는 배경마다 다르게 보인다.
 */
export function BottomActionBar({
  label,
  onPress,
  disabled = false,
  paddingBottom = 16,
}: BottomActionBarProps) {
  const s = useSurface()

  return (
    <View style={[styles.bottomBar, { paddingBottom }]}>
      <SurfacePressable
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={label}
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
  bottomBar: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 12,
  },
  button: {
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    ...TYPE.cta,
    fontWeight: "700",
  },
})
