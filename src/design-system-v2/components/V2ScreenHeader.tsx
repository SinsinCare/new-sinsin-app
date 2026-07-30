// Design System v2 — Screen Header (Top Navigation)
// Spec: project/design-system-v2/design-system-base/components/Top-Navigation.md (Figma set 50:579)
//
// 화면 최상단 앱 바. Toss 스타일이라 제목이 가운데가 아니라 **뒤로가기 바로 옆(좌측 정렬)**.
// Figma의 OS × Theme × Type(우측 액션 구성) 3축을 RN 관점으로 매핑:
//  - OS            → `os` prop (기본 Platform 자동) → 바 높이·뒤로가기 아이콘 모양 결정
//  - Theme         → useV2Theme(다크 자동)로 흡수(별도 prop 없음)
//  - Type          → `right` 슬롯(ReactNode). 아이콘 1~2개·라벨 등 사용처에서 자유 구성
//
// 레이아웃: [ ‹ 뒤로 ][ 제목 ]···(Left 컨테이너 flex:1)···[ 우측 액션 ].
//  Left가 남는 폭을 차지해 우측 슬롯을 화면 오른쪽 끝으로 밀어냄.

import { type ReactNode } from "react"
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { barHeight, spacing, touchTarget, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"
import { useTranslation } from "react-i18next"

export type V2ScreenHeaderOS = "ios" | "android"

export type V2ScreenHeaderProps = {
  /** 화면 제목 (1줄, 넘치면 말줄임). 뒤로가기 우측에 좌측정렬 */
  title?: string
  /** 넘기면 뒤로가기 버튼 표시 + 눌림 콜백 */
  onBack?: () => void
  /** 우측 액션 슬롯 — 보통 V2IconButton 1~2개 또는 텍스트 라벨 */
  right?: ReactNode
  /** 바 높이·뒤로가기 아이콘 모양. 기본 현재 Platform 자동 */
  os?: V2ScreenHeaderOS
  /** 상단 safe-area(노치·상태바) 만큼 위 여백 확보. 기본 true */
  safeAreaTop?: boolean
  style?: ViewStyle
}

export function V2ScreenHeader({
  title,
  onBack,
  right,
  os = Platform.OS === "android" ? "android" : "ios",
  safeAreaTop = true,
  style,
}: V2ScreenHeaderProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()

  // OS별 바 높이(iOS 44 / Android 54)와 뒤로가기 터치 타깃(44 / 48)
  const bar = os === "ios" ? barHeight.appBarIOS : barHeight.appBarAndroid
  const backTouch = os === "ios" ? touchTarget.min : touchTarget.android

  return (
    <View
      style={[
        {
          backgroundColor: colors.background.default,
          paddingTop: safeAreaTop ? insets.top : 0,
        },
        style,
      ]}
    >
      <View style={[styles.bar, { height: bar }]}>
        {/* Left: 뒤로가기 + 제목(좌측정렬). flex:1로 우측 슬롯을 끝으로 밀어냄 */}
        <View style={styles.left}>
          {onBack != null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("action.back")}
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                { width: backTouch, height: backTouch },
                pressed && styles.pressed,
              ]}
            >
              {/* 뒤로가기: 세트 시스템 글리프 사용(iOS chevron / Android arrow) */}
              <V2Icon
                name={os === "ios" ? "chevronLeft" : "arrowBack"}
                size="md"
                color={colors.label.normal}
              />
            </Pressable>
          )}
          {title != null && (
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={[
                typography.label.small,
                styles.title,
                { color: colors.label.strong },
                // 뒤로가기 없이 제목이 좌측 끝에 놓일 때만 선행 여백
                onBack == null && styles.titleLeadingPad,
              ]}
            >
              {title}
            </Text>
          )}
        </View>

        {/* Right: 우측 액션 슬롯(오른쪽 정렬) */}
        {right != null && <View style={styles.right}>{right}</View>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    // Left 컨테이너 패딩(스펙: 좌우 4). 뒤로가기 터치 타깃이 시각 여백을 겸함
    paddingHorizontal: spacing[4],
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0, // 제목 말줄임이 동작하도록 축소 허용
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flexShrink: 1, // 넘칠 때 말줄임(...) 처리
  },
  titleLeadingPad: {
    paddingLeft: spacing[8],
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  // Pressed: 눌림 피드백. 정확한 pressed 토큰 미추출 → opacity 기반(V2Button과 동일)
  pressed: { opacity: 0.6 },
})
