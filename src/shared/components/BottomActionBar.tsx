import React from "react"
import { View, StyleSheet, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

interface BottomActionBarProps {
  label: string
  onPress: () => void
  disabled?: boolean
  /**
   * 바닥 여백. **넘기지 않으면 시스템 바(안드로이드 내비게이션 바 · iOS 홈 인디케이터)를
   * 스스로 피한다.**
   *
   * 예전 기본값은 상수 16 이었다. 지금 호출부 10곳이 전부 `insets.bottom + 16` 을
   * 넘겨 주고 있어 화면에 드러난 적은 없지만, 안드로이드는 targetSdk 35 부터
   * edge-to-edge 가 강제라 **깜빡하고 안 넘긴 다음 호출부의 버튼은 내비게이션 바
   * 아래로 들어간다**(3버튼 내비게이션에서 48dp). 기본값이 안전한 쪽이어야 한다.
   */
  paddingBottom?: number
}

/** 버튼과 화면 바닥 사이의 최소 숨통. 시스템 바 위에 이만큼 더 띄운다. */
const BOTTOM_GAP = 16

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
  paddingBottom,
}: BottomActionBarProps) {
  const s = useSurface()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.bottomBar,
        { paddingBottom: paddingBottom ?? insets.bottom + BOTTOM_GAP },
      ]}
    >
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
