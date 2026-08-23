// Design System v2 — Divider (Figma: "Border")
// Spec: project/design-system-v2/design-system-base/components/Border.md (Figma node 190:2157)
//
// 콘텐츠 영역을 시각적으로 나누는 순수 레이아웃 프리미티브 (텍스트/아이콘 없음).
// Figma의 2축을 RN props로 매핑:
//  - Height = Default | Thick   → variant: "hairline" | "thick"
//  - Left Padding = True | False → inset (boolean | number)
// tone은 line/* 패밀리의 강조 단계 선택지 (Figma 변형엔 neutral만 존재, 문서상 확장 허용).
//
// ⚠️ 보정(Border.md): 하위 primitive가 헤어라인 채움색을 background/lower로 잘못 바인딩한
//    케이스가 있으나, 1px 헤어라인은 반드시 line/* 를 사용해야 함.
//    background.lower는 Thick(16px 회색 스페이서 블록) 전용.

import { StyleSheet, View, type ViewStyle } from "react-native"
import { borderWidth, spacing } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

export type V2DividerVariant = "hairline" | "thick"
// line/* 패밀리 강조 단계 (colors.line 키와 1:1 — 축약하지 않음)
export type V2DividerTone = "normal" | "neutral" | "alternative" | "strong"
/** thick 블록 높이. 두 값뿐 — 임의 px 을 열면 밴드 높이가 화면마다 갈린다 */
export type V2DividerThickSize = 8 | 16

export type V2DividerProps = {
  /** hairline=1px 실선(기본) · thick=회색 스페이서 블록(기본 16px) */
  variant?: V2DividerVariant
  /** hairline 색상 — line/* 강조 단계. thick에는 미적용 */
  tone?: V2DividerTone
  /**
   * thick 블록의 높이. 기본 **16**(Figma 원값). 커뮤니티 시안의 섹션 밴드는 **8** 이다.
   * hairline 에는 미적용(1px 은 `borderWidth.thin` 고정).
   */
  size?: V2DividerThickSize
  /** 좌측 인셋(px). true=24, 숫자=해당 px, 미지정/false=full-bleed. hairline 전용 */
  inset?: boolean | number
  /**
   * 방향. 현재 horizontal만 지원 (Figma 정의 범위).
   * vertical이 필요하면 동일 토큰(line[tone])에 width: borderWidth.thin / height: "100%"
   * 로 별도 구현 권장 (문서 범위 밖 · 구현 재량).
   */
  orientation?: "horizontal"
  style?: ViewStyle
}

/** inset prop → 좌측 패딩 px (true는 스펙상 24px = spacing[24]) */
function resolveInset(inset: V2DividerProps["inset"]): number {
  if (inset === true) return spacing[24]
  if (typeof inset === "number") return inset
  return 0
}

export function V2Divider({
  variant = "hairline",
  tone = "neutral",
  size = 16,
  inset = false,
  // orientation은 현재 horizontal 고정 — 구조 문서화 목적의 prop
  orientation = "horizontal",
  style,
}: V2DividerProps) {
  const { colors } = useV2Theme()

  // Thick: 라인이 아니라 두 섹션 사이를 벌리는 회색 블록 (full-bleed, 기본 16px)
  if (variant === "thick") {
    return (
      <View
        style={[
          styles.thick,
          { height: spacing[size], backgroundColor: colors.background.lower },
          style,
        ]}
      />
    )
  }

  // Hairline: 좌측 인셋 래퍼 + 1px 실선. 실선은 부모 폭으로 stretch (line[tone] 채움)
  const paddingLeft = resolveInset(inset)
  return (
    <View style={[styles.hairlineWrap, { paddingLeft }, style]}>
      <View style={[styles.hairline, { backgroundColor: colors.line[tone] }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  // 부모 폭으로 확장 (Figma flex-[1_0_0]). 자식은 기본 alignItems:stretch로 content 폭을 채움
  hairlineWrap: { alignSelf: "stretch" },
  hairline: { height: borderWidth.thin },
  // 높이는 `size` 가 정한다(기본 16) — 여기 두면 스타일 배열에서 조용히 덮인다.
  thick: { alignSelf: "stretch" },
})
