import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { Platform, Pressable, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import {
  V2Text,
  V2Icon,
  borderWidth,
  spacing,
  radius,
  fontFamily,
  useV2Theme,
} from "@/src/design-system-v2"
import { Icon } from "@/src/shared/components/Icon"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { MAX_CHAT_MESSAGE_CONTENT_LENGTH } from "@/src/types/chat"
import type { ConsultScreenModel } from "../hooks/useConsultScreen"
export function ConsultComposer({ model: m }: { model: ConsultScreenModel }) {
  const { colors } = useV2Theme()
  const { t } = m
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.default,
          borderTopColor: colors.line.normal,
        },
      ]}
    >
      <View
        ref={m.attachmentAnchorRef}
        collapsable={false}
        style={[
          styles.field,
          {
            backgroundColor: colors.fill.alternative,
            borderColor: colors.line.normal,
          },
        ]}
      >
        {m.attachedImageUri && (
          <View style={styles.attachment}>
            <Image
              source={remoteImageSource(m.attachedImageUri)}
              contentFit="cover"
              style={styles.thumb}
              accessibilityLabel={t("consult.attachedPhoto")}
            />
            <Pressable
              onPress={m.clearAttachedImage}
              style={styles.remove}
              accessibilityRole="button"
              accessibilityLabel={t("consult.removeAttachment")}
            >
              <View
                style={[
                  styles.removeBadge,
                  { backgroundColor: colors.label.normal },
                ]}
              >
                <V2Icon
                  name="close"
                  size={16}
                  color={colors.background.default}
                />
              </View>
            </Pressable>
          </View>
        )}
        <View style={styles.row}>
          <Pressable
            onPress={m.handlePlusPress}
            disabled={m.isPickingPhoto}
            accessibilityRole="button"
            accessibilityLabel={t("consult.openAttachmentMenu")}
            accessibilityState={{
              expanded: m.attachMenuOpen,
              disabled: m.isPickingPhoto,
            }}
            style={styles.iconTarget}
          >
            <Icon name="paperclip" size={20} color={colors.label.neutral} />
          </Pressable>
          <TextInput
            ref={m.inputRef}
            value={m.inputMessage}
            onChangeText={m.setInputMessage}
            multiline
            placeholder={t("consult.placeholder")}
            accessibilityLabel={t("consult.placeholder")}
            maxLength={MAX_CHAT_MESSAGE_CONTENT_LENGTH}
            placeholderTextColor={colors.label.neutral}
            style={[styles.input, { color: colors.label.normal }]}
          />
          <Pressable
            onPress={m.isSending ? m.stopGenerating : m.handleSend}
            disabled={!m.isSending && !m.canSend}
            accessibilityRole="button"
            accessibilityLabel={t(
              m.isSending ? "consult.stopGenerating" : "consult.send",
            )}
            accessibilityState={{ disabled: !m.isSending && !m.canSend }}
            style={styles.iconTarget}
          >
            <View
              style={[
                styles.send,
                {
                  backgroundColor:
                    m.isSending || m.canSend
                      ? colors.label.normal
                      : colors.fill.control,
                },
              ]}
            >
              {m.isSending ? (
                <View
                  style={[
                    styles.stop,
                    { backgroundColor: colors.background.default },
                  ]}
                />
              ) : (
                <V2Icon
                  name="arrowUp"
                  size={20}
                  color={
                    m.canSend
                      ? colors.background.default
                      : colors.label.assistive
                  }
                />
              )}
            </View>
          </Pressable>
        </View>
      </View>
      {m.attachmentError && (
        <View style={styles.errorRow}>
          <V2Text
            token="subtext.medium"
            color={colors.label.neutral}
            style={{ flex: 1 }}
            accessibilityLiveRegion="polite"
            lineBreakStrategyIOS="hangul-word"
          >
            {t(
              m.attachmentError.settings
                ? "consult.attachmentSettingsError"
                : "consult.attachmentPickerError",
            )}
          </V2Text>
          <Pressable
            onPress={() => void m.retryAttachment()}
            accessibilityRole="button"
            style={styles.references}
          >
            <V2Text token="label.small" color={colors.label.normal}>
              {t(
                m.attachmentError.settings
                  ? "consult.openSettings"
                  : m.attachmentError.source === "camera"
                    ? "consult.retryCamera"
                    : "consult.retryPhoto",
              )}
            </V2Text>
          </Pressable>
        </View>
      )}
      <View style={styles.noteRow}>
        <V2Text
          token="subtext.small"
          color={colors.label.neutral}
          style={styles.note}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("consult.answerNotice")}
        </V2Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("consult.references")}
          onPress={() => m.router.push("/(settings)/medical-reference")}
          style={styles.references}
        >
          <V2Text token="label.xSmall" color={colors.label.neutral}>
            {t("consult.referencesShort")}
          </V2Text>
        </Pressable>
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[12],
    borderTopWidth: borderWidth.thin,
  },
  field: {
    borderWidth: borderWidth.thin,
    borderRadius: radius.xl,
    padding: spacing[4],
  },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing[4] },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    includeFontPadding: false,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 0,
    ...Platform.select({
      ios: { paddingTop: 12, paddingBottom: 12 },
      default: {
        lineHeight: 22,
        paddingVertical: 11,
        textAlignVertical: "center" as const,
      },
    }),
  },
  iconTarget: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  send: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  stop: { width: 12, height: 12, borderRadius: 3 },
  attachment: { padding: spacing[8], alignSelf: "flex-start" },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  remove: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  noteRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingHorizontal: spacing[8],
  },
  note: { flex: 1 },
  references: { minHeight: 44, justifyContent: "center" },
})
