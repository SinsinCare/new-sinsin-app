import { useEffect, useRef, useState } from "react"
import { Animated, Pressable, StyleSheet, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"

/* ── useFadeVisibility hook ── */

function useFadeVisibility(visible: boolean, duration: number) {
  const opacity = useRef(new Animated.Value(0)).current
  const wasVisible = useRef(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (visible) {
      wasVisible.current = true
      setShouldRender(true)
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start()
    } else if (wasVisible.current) {
      wasVisible.current = false
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShouldRender(false)
      })
    }
  }, [visible, opacity, duration])

  return { opacity, shouldRender }
}

/* ── ConfirmExitModal ── */

interface ConfirmExitModalProps {
  visible: boolean
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

const FADE_DURATION = 200

export function ConfirmExitModal({
  visible,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmExitModalProps) {
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"
  const { opacity, shouldRender } = useFadeVisibility(visible, FADE_DURATION)

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

  if (!shouldRender) return null

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity }]}
      pointerEvents={visible ? "auto" : "none"}
    >
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
              fontFamily="$body"
              fontSize={18}
              lineHeight={24}
              fontWeight="700"
              color={textColor}
              textAlign="center"
              marginBottom={8}
            >
              {title}
            </Text>

            <Text
              fontFamily="$body"
              fontSize={15}
              lineHeight={20}
              fontWeight="500"
              color={secondaryTextColor}
              textAlign="center"
            >
              {description}
            </Text>
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
                fontFamily="$body"
                fontSize={14}
                lineHeight={18}
                fontWeight="400"
                color={textColor}
                textAlign="center"
              >
                {cancelLabel}
              </Text>
            </Pressable>

            <View style={{ width: 1, backgroundColor: borderColor }} />

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                ...styles.button,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                fontFamily="$body"
                fontSize={14}
                lineHeight={18}
                fontWeight="600"
                color={textColor}
                textAlign="center"
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </XStack>
        </Pressable>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
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
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
})
