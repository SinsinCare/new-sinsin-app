import { Pressable, StyleSheet, View, ActivityIndicator } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Text } from "@/src/shared/components/AppText"
import { V2BottomSheet } from "@/src/design-system-v2/components/V2BottomSheet"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { typography } from "@/src/design-system-v2/tokens"

export function AccountPreferenceSheet({
  visible,
  title,
  options,
  selected,
  busy,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  options: { value: string; label: string }[]
  selected: string
  busy?: boolean
  onSelect: (value: string) => void
  onClose: () => void
}) {
  const { colors } = useV2Theme()
  return (
    <V2BottomSheet
      surface="settings_preferences"
      visible={visible}
      title={title}
      showClose
      onClose={onClose}
    >
      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{
              selected: option.value === selected,
              disabled: busy,
              busy,
            }}
            disabled={busy}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: pressed ? colors.fill.normal : undefined },
            ]}
          >
            <Text style={[styles.label, { color: colors.label.normal }]}>
              {option.label}
            </Text>
            {option.value === selected &&
              (busy ? (
                <ActivityIndicator color={colors.label.neutral} />
              ) : (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={colors.label.normal}
                />
              ))}
          </Pressable>
        ))}
      </View>
    </V2BottomSheet>
  )
}
const styles = StyleSheet.create({
  options: { paddingBottom: 8 },
  option: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  label: { ...typography.subtext.large, flex: 1 },
})
