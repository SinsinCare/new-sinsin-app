import { Keyboard, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { V2Button, V2IconButton, useV2Theme } from "@/src/design-system-v2"
import { useKeyboardVisibility } from "@/src/hooks/useKeyboardVisibility"
import { useSuppressGlobalKeyboardToolbar } from "@/src/stores/keyboardToolbarStore"

/** Owns both keyboard dismissal and save, so the global accessory cannot cover the CTA. */
export function SettingsFormActions({
  label,
  onPress,
  disabled = false,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  useSuppressGlobalKeyboardToolbar()
  const visible = useKeyboardVisibility()
  const insets = useSafeAreaInsets()
  const { colors } = useV2Theme()
  const { t } = useTranslation("common")
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.background.default,
          paddingBottom: visible ? 12 : Math.max(insets.bottom, 20),
        },
      ]}
    >
      {visible && (
        <V2IconButton
          name="chevronDown"
          accessibilityLabel={t("keyboard.dismiss")}
          onPress={Keyboard.dismiss}
          size="l"
        />
      )}
      <View style={styles.action}>
        <V2Button
          fullWidth
          size="xl"
          multilineLabel
          disabled={disabled}
          onPress={onPress}
        >
          {label}
        </V2Button>
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  action: { flex: 1 },
})
