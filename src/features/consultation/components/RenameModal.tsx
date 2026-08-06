import { useState, useEffect, useRef } from "react"
import { Pressable, TextInput, StyleSheet, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
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
  const { t } = useTranslation()
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [name, setName] = useState(currentName)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visible) {
      setName(currentName)
      // 오버레이 마운트 직후엔 포커스가 안 잡힌다 — 한 프레임 늦춘다.
      const timer = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(timer)
    }
  }, [visible, currentName])

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (trimmed) {
      onConfirm(trimmed)
    }
  }

  const textColor = isDarkMode
    ? tokens.color.textDark.val
    : tokens.color.textLight.val
  const secondaryTextColor = isDarkMode
    ? tokens.color.textDarkSub.val
    : "#81818D"
  const cardBg = isDarkMode
    ? tokens.color.appBgDark.val
    : tokens.color.pureWhite.val
  const borderColor = isDarkMode
    ? tokens.color.cardBgDark.val
    : tokens.color.borderLight.val
  const backdropBg = isDarkMode ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.3)"

  // iOS pageSheet 위에선 RN Modal 이 프레젠트되지 않는다 — 화면 내 오버레이로 띄운다.
  if (!visible) return null

  return (
    <Pressable
      style={[
        StyleSheet.absoluteFill,
        styles.backdrop,
        { backgroundColor: backdropBg },
      ]}
      onPress={onCancel}
    >
      <Pressable style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.cardContent}>
          <Text
            fontSize={16}
            lineHeight={20}
            fontWeight="600"
            color={textColor}
            textAlign="center"
            marginBottom={16}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("consult.renameTitle")}
          </Text>

          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            placeholder={t("consult.renamePlaceholder")}
            placeholderTextColor={secondaryTextColor}
            style={[
              styles.input,
              {
                color: textColor,
                borderColor: borderColor,
              },
            ]}
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
        </View>

        <XStack style={{ borderTopWidth: 1, borderColor }}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => ({
              ...styles.button,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              fontSize={14}
              lineHeight={20}
              fontWeight="500"
              color={textColor}
              textAlign="center"
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {t("action.cancel")}
            </Text>
          </Pressable>

          <View style={{ width: 1, backgroundColor: borderColor }} />

          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => ({
              ...styles.button,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              fontSize={14}
              lineHeight={20}
              fontWeight="500"
              color={textColor}
              textAlign="center"
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {t("action.save")}
            </Text>
          </Pressable>
        </XStack>
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  card: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  input: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
})
