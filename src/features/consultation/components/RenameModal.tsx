import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { useState, useEffect, useRef } from "react"
import { Keyboard, Pressable, StyleSheet, View } from "react-native"
import {
  V2HStack,
  V2Text,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

interface RenameModalProps {
  visible: boolean
  currentName: string
  onConfirm: (newName: string) => void
  onCancel: () => void
}
export function RenameModal({
  visible,
  currentName,
  onConfirm,
  onCancel,
}: RenameModalProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const [name, setName] = useState(currentName)
  const inputRef = useRef<TextInput>(null)
  useEffect(() => {
    if (!visible) return
    setName(currentName)
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [visible, currentName])
  if (!visible) return null
  const cancel = () => {
    Keyboard.dismiss()
    onCancel()
  }
  const confirm = () => {
    if (name.trim()) {
      Keyboard.dismiss()
      onConfirm(name.trim())
    }
  }
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.backdrop]}
      onAccessibilityEscape={cancel}
    >
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.32)" },
        ]}
        onPress={cancel}
        accessible={false}
      />
      <View
        accessibilityViewIsModal
        style={[styles.card, { backgroundColor: colors.background.default }]}
      >
        <View style={styles.content}>
          <V2Text accessibilityRole="header" token="title.xSmallWeak">
            {t("consult.renameTitle")}
          </V2Text>
          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            accessibilityLabel={t("consult.renamePlaceholder")}
            placeholder={t("consult.renamePlaceholder")}
            placeholderTextColor={colors.label.neutral}
            style={[
              styles.input,
              {
                color: colors.label.normal,
                borderColor: colors.line.normal,
                backgroundColor: colors.fill.alternative,
              },
            ]}
            maxLength={50}
            returnKeyType="done"
            selectTextOnFocus
            onSubmitEditing={confirm}
          />
        </View>
        <V2HStack
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: colors.line.normal,
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={cancel}
            style={({ pressed }) => [
              styles.button,
              { opacity: pressed ? 0.55 : 1 },
            ]}
          >
            <V2Text token="label.smallWeak" color={colors.label.neutral}>
              {t("action.cancel")}
            </V2Text>
          </Pressable>
          <View
            style={{
              width: StyleSheet.hairlineWidth,
              backgroundColor: colors.line.normal,
            }}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!name.trim()}
            accessibilityState={{ disabled: !name.trim() }}
            onPress={confirm}
            style={({ pressed }) => [
              styles.button,
              { opacity: !name.trim() ? 0.3 : pressed ? 0.55 : 1 },
            ]}
          >
            <V2Text token="label.small">{t("action.save")}</V2Text>
          </Pressable>
        </V2HStack>
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  backdrop: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[32],
  },
  card: { width: "100%", borderRadius: 20, overflow: "hidden" },
  content: { padding: spacing[20], gap: spacing[16] },
  input: {
    ...typography.subtext.large,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[12],
  },
  button: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
})
