// Design System v2 — Bubble (말풍선)
// Spec: project/design-system-v2/design-system-base/components/Bubble.md (Figma set node 227:5284)
//
// 꼬리(tail)가 달린 말풍선. 온보딩 안내·대화형 메시지처럼 특정 대상을 가리키며
// 짧은 문구를 띄울 때 사용. Figma의 2축(line / Placement)을 RN 관점으로 매핑:
//  - line(1 line / Multi / process) → `variant` prop (본문 형태)
//  - Placement(True / False)        → `placement` prop (꼬리 방향: start=왼쪽 / end=오른쪽)
//
// 구조: 루트 flex-row + items-end. [tail][bubble](start) 또는 [bubble][tail](end)를
// 음수 margin(-10)으로 겹쳐, 꼬리(bg 동일색)가 bubble의 둥근 모서리 뒤를 메워 이어지게 함.
// 색은 line·placement 6변형 모두 공통(background.lower / label.normal). 형태만 다름.

import { type ReactNode } from "react"
import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import Svg, { Polygon } from "react-native-svg"
import { fontFamily, radius, spacing } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

// 값 이름은 Figma 'line'/'Placement' 축과 대응 (오탈자 없이 camelCase)
export type V2BubblePlacement = "start" | "end"
export type V2BubbleVariant = "oneLine" | "multi" | "process"

export type V2BubbleProps = {
  /** 본문 텍스트 (variant='process'에선 무시하고 처리중 인디케이터 표시) */
  children?: ReactNode
  /** 꼬리 방향: start=왼쪽(Figma Placement=True) / end=오른쪽(False) */
  placement?: V2BubblePlacement
  /** 본문 형태: oneLine=한 줄 / multi=여러 줄 / process=처리중 인디케이터 */
  variant?: V2BubbleVariant
  style?: ViewStyle
}

// 스펙 치수 (Bubble.md). 좌우 비대칭 패딩·꼬리 크기는 spacing 그리드 밖 값이라 raw 유지.
const BUBBLE_RADIUS = radius["2xl"] // 16
const PAD_VERTICAL = spacing[12] // 12 (상하)
const PAD_TAIL_SIDE = 19 // 꼬리쪽(+여유) — off-grid
const PAD_OPEN_SIDE = 14 // 반대쪽 — off-grid
const TAIL_W = 16
const TAIL_H = 18
const TAIL_OVERLAP = 10 // bubble 쪽으로 겹치는 음수 margin 폭
// process 컴팩트 크기 (Bubble.md: Placement=False 38×37 참고)
const PROCESS_MIN_W = 38
const PROCESS_MIN_H = 37

// 본문 타이포: Semantic/Body/Medium = Pretendard Medium(500) / 17.
// ⚠️ DS 토큰에 body.medium 부재(있는 건 mediumWeak=Regular·mediumStrong=SemiBold)라
//    스펙 weight(Medium)를 맞추려 fontFamily.medium으로 직접 구성.
// 보정: line-height는 카탈로그 135%가 아닌 컴포넌트 실측 150% 사용 → 17 × 1.5 ≈ 26.
const BODY_TEXT = {
  fontFamily: fontFamily.medium,
  fontSize: 17,
  lineHeight: 26,
  letterSpacing: 0,
} as const

export function V2Bubble({
  children,
  placement = "start",
  variant = "oneLine",
  style,
}: V2BubbleProps) {
  const { colors } = useV2Theme()
  const bg = colors.background.lower
  const isStart = placement === "start"
  const isProcess = variant === "process"

  // 꼬리 = 작은 삼각형. start=아래-왼 점 / end=아래-오른 점. 색은 bubble 배경과 동일.
  const tailPoints = isStart ? "16,0 16,18 0,18" : "0,0 0,18 16,18"
  const tail = (
    <Svg
      width={TAIL_W}
      height={TAIL_H}
      // 겹침: 꼬리를 bubble 쪽으로 -10 당김 (start=오른쪽 margin, end=왼쪽 margin)
      style={
        isStart ? { marginRight: -TAIL_OVERLAP } : { marginLeft: -TAIL_OVERLAP }
      }
    >
      <Polygon points={tailPoints} fill={bg} />
    </Svg>
  )

  // 텍스트 variant 패딩: 꼬리쪽 19 / 반대쪽 14 (placement에 따라 좌우 반전)
  const textPadding: ViewStyle = {
    paddingLeft: isStart ? PAD_TAIL_SIDE : PAD_OPEN_SIDE,
    paddingRight: isStart ? PAD_OPEN_SIDE : PAD_TAIL_SIDE,
    paddingVertical: PAD_VERTICAL,
  }

  const bubble = (
    <View
      style={[
        styles.bubble,
        { backgroundColor: bg },
        isProcess ? styles.processBubble : textPadding,
      ]}
    >
      {isProcess ? (
        // process: 텍스트 대신 처리중/입력중 인디케이터(점 3개). 정보 적어 간단히 처리.
        <View style={styles.dots}>
          <View
            style={[styles.dot, { backgroundColor: colors.label.alternative }]}
          />
          <View
            style={[styles.dot, { backgroundColor: colors.label.alternative }]}
          />
          <View
            style={[styles.dot, { backgroundColor: colors.label.alternative }]}
          />
        </View>
      ) : (
        <Text
          style={[BODY_TEXT, styles.text, { color: colors.label.normal }]}
          // oneLine=한 줄 고정 / multi=줄바꿈 허용
          numberOfLines={variant === "oneLine" ? 1 : undefined}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {children}
        </Text>
      )}
    </View>
  )

  return (
    <View style={[styles.root, style]}>
      {isStart ? (
        <>
          {tail}
          {bubble}
        </>
      ) : (
        <>
          {bubble}
          {tail}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "flex-end", // 꼬리 바닥을 bubble 바닥에 정렬
  },
  bubble: {
    borderRadius: BUBBLE_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  // process: 텍스트 패딩 대신 컴팩트 최소 크기 + 중앙 정렬
  processBubble: {
    minWidth: PROCESS_MIN_W,
    minHeight: PROCESS_MIN_H,
  },
  text: { textAlign: "center" },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4], // 4
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full, // circle
  },
})
