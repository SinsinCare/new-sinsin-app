import { Pressable, StyleSheet, Text, View } from "react-native"
import {
  controlHeight,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import type { OnboardingValueOption } from "../types"

type OnboardingOptionSelectFieldProps = {
  options: OnboardingValueOption[]
  selectedKeys: string[]
  type: "only" | "multi"
  onPress: () => void
}

export function OnboardingOptionSelectField({
  options,
  selectedKeys,
  type,
  onPress,
}: OnboardingOptionSelectFieldProps) {
  const { colors } = useV2Theme()
  const selectedLabels = options
    .filter((option) => selectedKeys.includes(option.key))
    .map((option) => option.value)
  const hasSelection = selectedLabels.length > 0
  const label = hasSelection ? selectedLabels.join(", ") : "선택해주세요"

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${type === "only" ? "항목" : "항목들"} ${label} 선택`}
      accessibilityHint="누르면 선택 목록이 열립니다."
      onPress={onPress}
      style={({ pressed }) => [
        styles.field,
        {
          backgroundColor: hasSelection
            ? colors.primary.primaryWeak
            : colors.background.default,
          borderColor: hasSelection
            ? colors.primary.primary
            : colors.line.normal,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text
        numberOfLines={2}
        style={[
          styles.label,
          {
            color: hasSelection ? colors.primary.primary : colors.label.neutral,
          },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.chevron,
          {
            borderColor: hasSelection
              ? colors.primary.primary
              : colors.label.assistive,
          },
        ]}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  field: {
    alignItems: "center",
    borderRadius: radius.xl,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing[12],
    justifyContent: "space-between",
    minHeight: controlHeight.xl,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  label: {
    ...typography.body.mediumStrong,
    flex: 1,
  },
  chevron: {
    borderBottomWidth: 2,
    borderRightWidth: 2,
    height: 8,
    transform: [{ rotate: "45deg" }],
    width: 8,
  },
  pressed: { opacity: 0.85 },
})
