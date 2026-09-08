import { Icon } from "@/src/shared/components/Icon"
import { useEffect } from "react"
import { BackHandler, Pressable, StyleSheet, View } from "react-native"
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { V2Icon, V2Text, spacing, useV2Theme } from "@/src/design-system-v2"
import type { Chat } from "@/src/types/chat"

export function ConsultHistoryActions({
  target,
  onClose,
  onRename,
  onDelete,
}: {
  target: Chat
  onClose: () => void
  onRename: (chat: Chat) => void
  onDelete: (chat: Chat) => void
}) {
  const { colors } = useV2Theme()
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [onClose])
  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(150)}
      exiting={reduced ? undefined : FadeOut.duration(120)}
      style={StyleSheet.absoluteFill}
    >
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.32)" },
        ]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("consult.history.closeMenu")}
      />
      <Animated.View
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
        entering={reduced ? undefined : FadeInDown.duration(200)}
        style={[
          styles.panel,
          {
            bottom: insets.bottom + spacing[12],
            backgroundColor: colors.background.default,
          },
        ]}
      >
        <V2Text
          token="subtext.medium"
          color={colors.label.neutral}
          numberOfLines={2}
          style={styles.title}
        >
          {target.title}
        </V2Text>
        <View style={[styles.line, { backgroundColor: colors.line.normal }]} />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onClose()
            onRename(target)
          }}
          style={({ pressed }) => [
            styles.action,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Icon name="pencil" size={18} color={colors.label.normal} />
          <V2Text token="label.small">{t("consult.history.rename")}</V2Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onClose()
            onDelete(target)
          }}
          style={({ pressed }) => [
            styles.action,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <V2Icon name="trash" size={18} color={colors.status.negative} />
          <V2Text token="label.small" color={colors.status.negative}>
            {t("consult.history.delete")}
          </V2Text>
        </Pressable>
        <View style={[styles.line, { backgroundColor: colors.line.normal }]} />
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.cancel}
        >
          <V2Text token="label.xSmall" color={colors.label.neutral}>
            {t("action.cancel")}
          </V2Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  )
}
const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: spacing[16],
    right: spacing[16],
    borderRadius: 20,
    overflow: "hidden",
  },
  title: { padding: spacing[20] },
  line: { height: StyleSheet.hairlineWidth },
  action: {
    minHeight: 52,
    paddingHorizontal: spacing[20],
    gap: spacing[12],
    flexDirection: "row",
    alignItems: "center",
  },
  cancel: { minHeight: 48, alignItems: "center", justifyContent: "center" },
})
