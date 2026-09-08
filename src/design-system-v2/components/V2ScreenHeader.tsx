import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { Text } from "@/src/design-system-v2/primitives/NativeText"
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

import { useState, type ReactNode } from "react"
import {
  Platform,
  useWindowDimensions,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { barHeight, spacing, touchTarget, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"
import { useTranslation } from "react-i18next"

export type V2ScreenHeaderOS = "ios" | "android"
/** 제목 정렬. 기본 `leading`(Toss 식 좌측 정렬 — 기존 21개 화면의 모양) */
export type V2ScreenHeaderTitleAlign = "leading" | "center"
/** 리딩 액션의 글리프. 기본 `back`. `close` 는 "이 흐름을 접는다"(신고·글쓰기) */
export type V2ScreenHeaderLeading = "back" | "close"

export type V2ScreenHeaderProps = {
  /** 화면 제목 (1줄, 넘치면 말줄임). 기본은 뒤로가기 우측에 좌측정렬 */
  title?: string
  /** 넘기면 리딩 버튼 표시 + 눌림 콜백 (글리프는 `leading` 이 정한다) */
  onBack?: () => void
  /**
   * 제목 정렬. 기본 `leading`.
   *
   * `center` 는 제목을 **바 전체의 가운데**에 놓는다(남는 폭의 가운데가 아니다) —
   * 리딩/우측 슬롯 위에 절대 배치로 얹고, 양쪽에 터치 타깃만큼 여백을 남겨
   * 긴 제목이 아이콘 밑으로 숨는 대신 말줄임되게 한다.
   */
  titleAlign?: V2ScreenHeaderTitleAlign
  /** 리딩 글리프. 기본 `back`(iOS chevron / Android arrow) */
  leading?: V2ScreenHeaderLeading
  /** 우측 액션 슬롯 — 보통 V2IconButton 1~2개 또는 텍스트 라벨 */
  right?: ReactNode
  /** 바 높이·뒤로가기 아이콘 모양. 기본 현재 Platform 자동 */
  os?: V2ScreenHeaderOS
  /** 상단 safe-area(노치·상태바) 만큼 위 여백 확보. 기본 true */
  safeAreaTop?: boolean
  /** Separate an opaque navigation bar from scrolling form content. */
  separator?: boolean
  style?: ViewStyle
}

export function V2ScreenHeader({
  title,
  onBack,
  right,
  os = Platform.OS === "android" ? "android" : "ios",
  safeAreaTop = true,
  separator = false,
  titleAlign = "leading",
  leading = "back",
  style,
}: V2ScreenHeaderProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const { fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.control)

  // OS별 바 높이(iOS 44 / Android 54)와 뒤로가기 터치 타깃(44 / 48)
  const bar = Math.max(
    os === "ios" ? barHeight.appBarIOS : barHeight.appBarAndroid,
    Math.ceil(typography.label.small.lineHeight * fontScale + spacing[8]),
  )
  const backTouch = os === "ios" ? touchTarget.min : touchTarget.android
  const isCentered = titleAlign === "center"
  const [rightWidth, setRightWidth] = useState(0)
  const titleInset =
    Math.max(backTouch, right == null ? 0 : rightWidth) + spacing[8]

  /*
    제목 글리프/라벨은 **한 벌만** 만들고 두 정렬이 나눠 쓴다. 두 벌로 두면 한쪽에만
    타이포를 고치는 사고가 난다(가운데 제목이 15 Bold 로 남는 부류).
  */
  const titleText =
    title == null ? null : (
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        maxFontSizeMultiplier={FONT_SCALE.control}
        style={[
          typography.label.small,
          styles.title,
          { color: colors.label.strong },
          // 뒤로가기 없이 제목이 좌측 끝에 놓일 때만 선행 여백
          !isCentered && onBack == null && styles.titleLeadingPad,
        ]}
      >
        {title}
      </Text>
    )

  return (
    <View
      style={[
        {
          backgroundColor: colors.background.default,
          paddingTop: safeAreaTop ? insets.top : 0,
          borderBottomWidth: separator ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: colors.line.normal,
        },
        style,
      ]}
    >
      <View style={[styles.bar, { height: bar }]}>
        {/* Left: 리딩 액션 + 제목(좌측정렬). flex:1로 우측 슬롯을 끝으로 밀어냄 */}
        <View style={styles.left}>
          {onBack != null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                leading === "close" ? "action.close" : "action.back",
              )}
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                { width: backTouch, height: backTouch },
                pressed && styles.pressed,
              ]}
            >
              {/*
                리딩 글리프: 세트 시스템 글리프. back 은 OS 를 따르고(iOS chevron /
                Android arrow), close 는 두 OS 공통 ✕ 다 — 닫기에는 OS 관습이 없다.
                색은 두 글리프 모두 `label.normal` 이다. 시안은 `#2E2F33@88%`
                (= `label.neutral`)로 그렸지만 오프토큰이라 DS 값으로 스냅한다(§0.1).
              */}
              <V2Icon
                name={
                  leading === "close"
                    ? "close"
                    : os === "ios"
                      ? "chevronLeft"
                      : "arrowBack"
                }
                size="md"
                color={colors.label.normal}
              />
            </Pressable>
          )}
          {!isCentered && titleText}
        </View>

        {/* Right: 우측 액션 슬롯(오른쪽 정렬) */}
        {right != null && (
          <View
            style={styles.right}
            onLayout={(event) => setRightWidth(event.nativeEvent.layout.width)}
          >
            {right}
          </View>
        )}

        {/*
          가운데 제목은 **마지막에** 절대 배치로 얹는다. 흐름에 두면 리딩 폭만큼
          오른쪽으로 밀려 "가운데" 가 아니게 된다. 터치는 통과시킨다 — 제목이 우측
          액션 위를 덮고 있어도 눌리는 것은 액션이어야 한다.
        */}
        {isCentered && titleText != null && (
          <View
            pointerEvents="none"
            style={[styles.centerTitle, { paddingHorizontal: titleInset }]}
          >
            {titleText}
          </View>
        )}
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
  // 바를 통째로 덮는 층. 좌우 여백(터치 타깃 폭)은 대칭이라 가운데는 바의 가운데다.
  centerTitle: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  // Pressed: 눌림 피드백. 정확한 pressed 토큰 미추출 → opacity 기반(V2Button과 동일)
  pressed: { opacity: 0.6 },
})
