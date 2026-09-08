import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native"
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
} from "react-native-reanimated"
import {
  V2Text,
  V2Icon,
  useV2Theme,
  spacing,
  radius,
  borderWidth,
  elevation,
} from "@/src/design-system-v2"
import type { ConsultScreenModel } from "../hooks/useConsultScreen"

export function ConsultAttachMenu({ model: m }: { model: ConsultScreenModel }) {
  const { colors } = useV2Theme()
  const reduceMotion = useReducedMotion()
  const { width } = useWindowDimensions()
  if (!m.attachMenuOpen) return null
  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal
      onAccessibilityEscape={m.closeAttachMenu}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={m.closeAttachMenu}
        accessibilityRole="button"
        accessibilityLabel={m.t("consult.closeAttachmentMenu")}
      />
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(140)}
        exiting={reduceMotion ? undefined : FadeOut.duration(100)}
        style={[
          styles.menu,
          {
            bottom: m.attachMenuPosition.bottom,
            maxHeight: m.attachMenuPosition.maxHeight,
            width: Math.min(224, width - spacing[20] * 2),
            backgroundColor: colors.background.floated,
            borderColor: colors.line.normal,
          },
        ]}
      >
        <ScrollView bounces={false} keyboardShouldPersistTaps="always">
          {(
            [
              {
                key: "choosePhoto",
                icon: "gallery",
                action: m.handlePhotoUpload,
              },
              {
                key: "takePhoto",
                icon: "camera",
                action: m.handleCameraUpload,
              },
            ] as const
          ).map(({ key, icon, action }) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={m.t(`consult.${key}`)}
              onPress={() => void action()}
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: pressed
                    ? colors.fill.alternative
                    : "transparent",
                },
              ]}
            >
              <V2Icon name={icon} size={20} color={colors.label.normal} />
              <V2Text
                token="subtext.large"
                color={colors.label.normal}
                style={styles.label}
                lineBreakStrategyIOS="hangul-word"
              >
                {m.t(`consult.${key}`)}
              </V2Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  )
}
const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    left: spacing[20],
    padding: spacing[4],
    borderWidth: borderWidth.thin,
    borderRadius: radius.lg,
    ...elevation[2],
  },
  item: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
  },
  label: { flex: 1 },
})
