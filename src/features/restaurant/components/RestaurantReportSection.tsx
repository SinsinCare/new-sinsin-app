/**
 * 제보 폼의 한 묶음(식당 정보 / 추천 포인트 / 사진). 회색 면 + 제목 한 줄.
 *
 * Tamagui `YStack`/`Text` 를 쓰고 `fontWeight="700"` 을 지정하던 파일이었다. 이 화면은
 * 지도 시트 끝의 `식당 알려주기` 에서 두 번 탭이면 닿는 **배포되는 화면**이므로 legacy 로
 * 남겨 둘 수 없다. 굵기는 `typography.label.small` 이 고르는 `fontFamily`(Pretendard-*)에
 * 있고, `fontWeight` 를 함께 주면 iOS 가 가짜 굵게를 한 번 더 얹어 글자가 번진다.
 */

import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"

import {
  borderWidth,
  radius,
  spacing,
  typography,
} from "@/src/design-system-v2"

export interface RestaurantReportSectionProps {
  title: string
  children: ReactNode
  backgroundColor: string
  borderColor: string
  textColor: string
}

export function RestaurantReportSection({
  title,
  children,
  backgroundColor,
  borderColor,
  textColor,
}: RestaurantReportSectionProps) {
  return (
    <View style={[styles.root, { backgroundColor, borderColor }]}>
      <Text
        style={[typography.label.small, { color: textColor }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {title}
      </Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: spacing[16],
    padding: spacing[16],
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
  },
})
