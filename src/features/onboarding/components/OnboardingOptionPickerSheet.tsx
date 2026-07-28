import { useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import {
  V2BottomSheet,
  V2Checkbox,
  controlHeight,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import type { OnboardingValueOption } from "../types"

type OnboardingOptionPickerSheetProps = {
  visible: boolean
  type: "only" | "multi"
  title: string
  subTitle?: string | null
  options: OnboardingValueOption[]
  selectedKeys: string[]
  onClose: () => void
  onConfirm: (selectedKeys: string[]) => void
}

/**
 * Figma 온보딩 선택 상호작용: 질문 본문은 현재 선택값만 보여주고,
 * 실제 단일/복수 선택은 V2 bottom sheet 안에서 완료한다.
 */
export function OnboardingOptionPickerSheet({
  visible,
  type,
  title,
  subTitle,
  options,
  selectedKeys,
  onClose,
  onConfirm,
}: OnboardingOptionPickerSheetProps) {
  const { colors } = useV2Theme()
  const [draftKeys, setDraftKeys] = useState(selectedKeys)

  useEffect(() => {
    if (visible) setDraftKeys(selectedKeys)
  }, [selectedKeys, visible])

  const selectedSet = useMemo(() => new Set(draftKeys), [draftKeys])

  const toggleOption = (key: string) => {
    setDraftKeys((current) => {
      if (type === "only") return [key]
      return current.includes(key)
        ? current.filter((selectedKey) => selectedKey !== key)
        : [...current, key]
    })
  }

  const handleConfirm = () => {
    onConfirm(draftKeys)
    onClose()
  }

  return (
    <V2BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subTitle={subTitle ?? undefined}
      primaryLabel="선택 완료"
      onPrimary={handleConfirm}
      secondaryLabel="취소"
      onSecondary={onClose}
    >
      <View style={styles.options}>
        {options.map((option) => {
          const selected = selectedSet.has(option.key)
          return (
            <Pressable
              key={option.key}
              accessibilityRole={type === "only" ? "radio" : "checkbox"}
              accessibilityLabel={option.value}
              accessibilityState={
                type === "only" ? { selected } : { checked: selected }
              }
              onPress={() => toggleOption(option.key)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected
                    ? colors.primary.primaryWeak
                    : colors.background.default,
                  borderColor: selected
                    ? colors.primary.primary
                    : colors.line.normal,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionText, { color: colors.label.normal }]}>
                {option.value}
              </Text>
              {type === "multi" ? (
                <View pointerEvents="none">
                  <V2Checkbox checked={selected} onChange={() => undefined} />
                </View>
              ) : (
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: selected
                        ? colors.primary.primary
                        : colors.label.assistive,
                      backgroundColor: selected
                        ? colors.primary.primary
                        : "transparent",
                    },
                  ]}
                />
              )}
            </Pressable>
          )
        })}
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  options: {
    gap: spacing[8],
    marginTop: spacing[20],
    paddingHorizontal: spacing[24],
  },
  option: {
    alignItems: "center",
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[12],
    minHeight: controlHeight.xl,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  optionText: {
    ...typography.body.mediumStrong,
    flex: 1,
  },
  radio: {
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    width: 22,
  },
  pressed: { opacity: 0.85 },
})
