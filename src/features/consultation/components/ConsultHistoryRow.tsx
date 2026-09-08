import { memo } from "react"
import { Keyboard, Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { V2Icon, V2Text, spacing, useV2Theme } from "@/src/design-system-v2"
import type { Chat } from "@/src/types/chat"
import { hapticSelection } from "@/src/lib/haptics"
import {
  formatChatHistoryTime,
  historyRowCopy,
} from "../lib/chatHistoryPresentation"

export const ConsultHistoryRow = memo(function ConsultHistoryRow({
  chat,
  now,
  selected,
  onSelect,
  onManage,
}: {
  chat: Chat
  now: Date
  selected: boolean
  onSelect: (id: number) => void
  onManage: (chat: Chat) => void
}) {
  const { colors } = useV2Theme()
  const { t, i18n } = useTranslation("common")
  const copy = historyRowCopy(chat)
  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.line.normal,
          backgroundColor: selected ? colors.fill.alternative : "transparent",
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("consult.history.openChat", {
          title: copy.title,
        })}
        accessibilityState={{ selected }}
        onPress={() => {
          Keyboard.dismiss()
          onSelect(chat.id)
        }}
        style={({ pressed }) => [styles.body, { opacity: pressed ? 0.55 : 1 }]}
      >
        <V2Text
          token="subtext.largeStrong"
          numberOfLines={2}
          lineBreakStrategyIOS="hangul-word"
        >
          {copy.title}
        </V2Text>
        <View style={styles.meta}>
          <V2Text token="subtext.small" color={colors.label.neutral}>
            {formatChatHistoryTime(
              chat,
              now,
              i18n.resolvedLanguage ?? i18n.language,
            )}
          </V2Text>
          {selected && (
            <V2Text token="subtext.small" color={colors.label.neutral}>
              · {t("consult.history.current")}
            </V2Text>
          )}
        </View>
        {!!copy.summary && (
          <V2Text
            token="subtext.medium"
            color={colors.label.neutral}
            numberOfLines={1}
          >
            {copy.summary}
          </V2Text>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("consult.history.manageChat", {
          title: copy.title,
        })}
        onPress={() => {
          Keyboard.dismiss()
          hapticSelection()
          onManage(chat)
        }}
        style={({ pressed }) => [styles.menu, { opacity: pressed ? 0.55 : 1 }]}
      >
        <V2Icon name="more" size={18} color={colors.label.neutral} />
      </Pressable>
    </View>
  )
})
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    minHeight: 68,
  },
  body: {
    flex: 1,
    paddingVertical: spacing[12],
    paddingLeft: spacing[8],
    gap: spacing[4],
  },
  meta: { flexDirection: "row", alignItems: "baseline", gap: spacing[4] },
  menu: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
})
