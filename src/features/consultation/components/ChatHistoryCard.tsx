import { useState } from "react"
import {
  GestureResponderEvent,
  Pressable,
  View,
  StyleSheet,
} from "react-native"
import { V2HStack, V2Text, V2VStack, useV2Theme } from "@/src/design-system-v2"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Icon } from "@/src/shared/components/Icon"
import { useTranslation } from "react-i18next"
import {
  AppModal,
  afterModalTransitions,
} from "@/src/shared/components/AppModal"

function formatDate(timestamp: string, language: string): string {
  const date = new Date(timestamp)
  return new Intl.DateTimeFormat(
    language.startsWith("en") ? "en-US" : "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date)
}

interface ChatHistoryCardProps {
  summary: string
  content: string
  timestamp: string
  onPress: () => void
  onRename?: () => void
  onDelete?: () => void
}

export function ChatHistoryCard({
  summary,
  content,
  timestamp,
  onPress,
  onRename,
  onDelete,
}: ChatHistoryCardProps) {
  const { t, i18n } = useTranslation()
  const { colors, mode } = useV2Theme()

  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })

  const handleEllipsisPress = (e: GestureResponderEvent) => {
    const { pageY } = e.nativeEvent
    setMenuPosition({ top: pageY + 14, right: 16 })
    setMenuOpen(true)
  }

  const textColor = colors.label.normal
  const deleteColor = colors.status.negative

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          backgroundColor: colors.background.lower,
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 14,
        })}
      >
        <V2VStack gap={8}>
          <V2HStack justify="space-between" align="center">
            <V2Text
              color={colors.label.normal}
              numberOfLines={1}
              style={{
                fontSize: 15,
                lineHeight: 20,
                fontWeight: "600",
                flex: 1,
              }}
            >
              {summary}
            </V2Text>
            <Pressable
              onPress={handleEllipsisPress}
              hitSlop={8}
              style={{ marginLeft: 8 }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={colors.label.normal}
              />
            </Pressable>
          </V2HStack>

          <V2Text
            color={colors.label.neutral}
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
            style={{ fontSize: 14, lineHeight: 20, fontWeight: "400" }}
          >
            {content}
          </V2Text>

          <V2Text
            color={colors.label.alternative}
            style={{ fontSize: 13, lineHeight: 16, fontWeight: "400" }}
          >
            {formatDate(timestamp, i18n.language)}
          </V2Text>
        </V2VStack>
      </Pressable>

      <AppModal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <View
            style={[
              styles.menuCard,
              {
                top: menuPosition.top,
                right: menuPosition.right,
                backgroundColor: colors.background.default,
                shadowColor: colors.static.black,
                shadowOpacity: mode === "dark" ? 0.4 : 0.15,
              },
            ]}
          >
            {/* 제목 바꾸기 */}
            <Pressable
              onPress={async () => {
                setMenuOpen(false)
                await afterModalTransitions()
                onRename?.()
              }}
              style={({ pressed }) => ({
                ...styles.menuItem,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <V2Text
                lineBreakStrategyIOS="hangul-word"
                style={[styles.menuItemText, { color: textColor }]}
              >
                {t("consult.history.rename")}
              </V2Text>
              <Icon name="pencil" size={20} color={textColor} />
            </Pressable>

            {/* 삭제하기 */}
            <Pressable
              onPress={async () => {
                setMenuOpen(false)
                await afterModalTransitions()
                onDelete?.()
              }}
              style={({ pressed }) => ({
                ...styles.menuItem,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <V2Text
                lineBreakStrategyIOS="hangul-word"
                style={[styles.menuItemText, { color: deleteColor }]}
              >
                {t("consult.history.delete")}
              </V2Text>
              <Icon name="trashcan" size={20} color={deleteColor} />
            </Pressable>
          </View>
        </Pressable>
      </AppModal>
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  menuCard: {
    position: "absolute",
    minWidth: 160,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "400",
  },
})
