import type { ReactNode } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  Easing,
  SlideInRight,
  SlideOutRight,
  useReducedMotion,
} from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import { V2Icon, V2Text, spacing, useV2Theme } from "@/src/design-system-v2"

export function ConsultHistoryPage({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const { colors } = useV2Theme()
  const reduced = useReducedMotion()
  if (!isOpen) return null
  return (
    <Animated.View
      accessibilityViewIsModal
      onAccessibilityEscape={onClose}
      entering={
        reduced
          ? undefined
          : SlideInRight.duration(260).easing(Easing.out(Easing.cubic))
      }
      exiting={
        reduced
          ? undefined
          : SlideOutRight.duration(220).easing(Easing.out(Easing.cubic))
      }
      style={[
        StyleSheet.absoluteFill,
        { paddingTop: insets.top, backgroundColor: colors.background.default },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.grow}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {children}
      </KeyboardAvoidingView>
    </Animated.View>
  )
}
export function ConsultHistoryHeader({
  onClose,
  onNewChat,
}: {
  onClose: () => void
  onNewChat: () => void
}) {
  const { colors } = useV2Theme()
  const { t } = useTranslation("common")
  return (
    <View style={[styles.header, { borderBottomColor: colors.line.normal }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("consult.history.close")}
        onPress={onClose}
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed ? 0.55 : 1 },
        ]}
      >
        <V2Icon name="chevronLeft" size={22} color={colors.label.normal} />
      </Pressable>
      <V2Text token="title.xSmallWeak" style={styles.grow}>
        {t("consult.history.title")}
      </V2Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("consult.history.new")}
        onPress={onNewChat}
        style={({ pressed }) => [
          styles.newButton,
          {
            backgroundColor: pressed
              ? colors.fill.normal
              : colors.fill.alternative,
          },
        ]}
      >
        <V2Icon name="plus" size={16} color={colors.label.normal} />
        <V2Text token="label.xSmall">{t("consult.history.new")}</V2Text>
      </Pressable>
    </View>
  )
}
const styles = StyleSheet.create({
  grow: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingLeft: spacing[8],
    paddingRight: spacing[20],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  newButton: {
    minHeight: 44,
    paddingHorizontal: spacing[12],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    borderRadius: 12,
  },
})
