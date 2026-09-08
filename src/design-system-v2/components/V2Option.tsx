import { Text } from "@/src/design-system-v2/primitives/NativeText"
// Design System v2 — Option
// Spec: project/design-system-v2/design-system-base/components/Option.md (Figma node 121:6812)
//
// 목록·바텀시트·설정에서 항목을 고르는 "선택 옵션 행"이에요.
// 왼쪽 아이콘 + 제목/보조설명 + 오른쪽 트레일링(값 텍스트 등)으로 구성.
// 선택 여부는 체크마크가 아니라 **테두리·배경 톤**으로 표현.
//
// 상태 매핑(중요): Figma의 `state=pressed`는 눌림 순간이 아니라 **선택됨(selected)** 을 뜻함.
//   → RN에선 `selected` boolean prop으로 매핑(`pressed` → `selected`).
//   실제 눌림 피드백은 Pressable 런타임 pressed(opacity)로 별도 처리.
//
// 보정:
//  - Figma 색상 토큰 원본 오타 `label/nomal` → 코드에선 `label.normal` 사용.
//  - `size`('s'|'m'|'l')는 Figma에서 데모 컨테이너 폭(232/323/343px)만 다르고
//    패딩·높이·radius·폰트·아이콘 크기는 전 사이즈 동일 → prop은 두되 **실제 스타일 차등 없음**.
//    실사용 행은 부모 폭에 stretch되므로 데모 폭은 반영하지 않음.
//
// STANDALONE: V2ListRow에 의존하지 않고 행 레이아웃을 직접 구현.

import { type ReactNode } from "react"
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { radius, spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"
import { type V2IconName } from "../icons/registry"

/** size 축 — Figma 데모 폭만 다름(스타일 차등 없음, 위 보정 주석 참고). 소문자로 정규화. */
export type V2OptionSize = "s" | "m" | "l"

export type V2OptionProps = {
  /** 선택 상태(Figma `state=pressed`에 대응). true면 주황 테두리 + 옅은 주황 배경으로 강조. */
  selected: boolean
  /** 행 탭 콜백 */
  onPress: () => void
  /** 제목 (Figma Title) */
  label: string
  /** 보조 설명 (Figma Subtext 1) */
  description?: string
  /** size 축 — 실제 스타일 차등 없음(보정 주석 참고). 기본 'l'. */
  size?: V2OptionSize
  /** 왼쪽 아이콘 이름(V2Icon) */
  leadingIcon?: V2IconName
  /** 오른쪽 트레일링 슬롯(값 텍스트/컨트롤 등). 문자열이면 label.neutral 톤으로 렌더. */
  trailing?: ReactNode
  /** 비활성화 — Figma 세트엔 없음(state=Default/pressed 뿐). RN 편의상 opacity 처리. */
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

export function V2Option({
  selected,
  onPress,
  label,
  description,
  size = "l", // 기본값 Figma 'L' → 소문자 정규화 'l' (실제 스타일엔 영향 없음)
  leadingIcon,
  trailing,
  disabled = false,
  style,
}: V2OptionProps) {
  const { colors } = useV2Theme()

  // 상태별 배경/테두리 — 텍스트 색은 두 상태 동일(스펙).
  const backgroundColor = selected
    ? colors.primary.primaryWeak // 선택: Primary/primary-weak
    : colors.fill.background // 미선택: fill/background (#f9fafb)
  // 테두리는 항상 1px 두고 색만 토글 → 선택 시 레이아웃 시프트 방지.
  const borderColor = selected ? colors.primary.primary : "transparent"

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor, borderColor },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {leadingIcon ? (
        <V2Icon name={leadingIcon} color={colors.label.normal} />
      ) : null}

      <View style={styles.textColumn}>
        <Text
          style={[typography.title.xSmall, { color: colors.label.normal }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={[typography.subtext.medium, { color: colors.label.neutral }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {description}
          </Text>
        ) : null}
      </View>

      {trailing != null ? (
        <View style={styles.trailing}>
          {typeof trailing === "string" ? (
            // 트레일링 값 텍스트: Subtext/Large(15 Regular) + label.neutral
            <Text
              style={[
                typography.subtext.large,
                { color: colors.label.neutral },
              ]}
            >
              {trailing}
            </Text>
          ) : (
            trailing
          )}
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12], // 아이콘↔텍스트 gap 12
    minHeight: 44, // 탭 타겟(토큰 없음, 하드코딩)
    paddingHorizontal: spacing[24], // Global/Side Padding/M
    paddingVertical: spacing[16], // Component/List Row/Vertical Paddings/L
    borderRadius: radius["3xl"], // Radius/Semantic/L = 24
    borderWidth: 1, // 항상 1px(색만 토글) — 선택 시 레이아웃 시프트 방지
    overflow: "hidden", // Figma overflow: clip
  },
  textColumn: {
    flex: 1, // 트레일링을 오른쪽 끝으로 밀어냄
    justifyContent: "center",
    gap: spacing[2],
  },
  trailing: {
    paddingLeft: spacing[8], // 트레일링 왼쪽 padding-left 8
  },
  // 런타임 눌림 피드백(Figma의 pressed=selected와는 별개). 정확한 pressed 토큰 미추출 → opacity.
  pressed: { opacity: 0.85 },
  // Disabled: Figma 세트엔 없음. 정확한 disabled 토큰 미추출 → opacity.
  disabled: { opacity: 0.4 },
})
