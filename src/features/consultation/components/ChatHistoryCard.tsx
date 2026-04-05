import { useState } from "react"
import {
  GestureResponderEvent,
  Pressable,
  useColorScheme,
  Modal,
  View,
  StyleSheet,
} from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${y}.${m}.${d} ${h}:${min}`
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
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"

  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })

  const handleEllipsisPress = (e: GestureResponderEvent) => {
    const { pageY } = e.nativeEvent
    setMenuPosition({ top: pageY + 14, right: 16 })
    setMenuOpen(true)
  }

  const textColor = isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val
  const deleteColor = tokens.color.primary9.val

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          backgroundColor: isDarkMode ? tokens.color.inputBgDark.val : tokens.color.offWhite.val,
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 14,
        })}
      >
        <YStack gap={8}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text
              fontSize={15}
              lineHeight={20}
              fontWeight="600"
              color={isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val}
              flex={1}
              numberOfLines={1}
            >
              {summary}
            </Text>
            <Pressable
              onPress={handleEllipsisPress}
              hitSlop={8}
              style={{ marginLeft: 8 }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val}
              />
            </Pressable>
          </XStack>

          <Text
            fontSize={14}
            lineHeight={20}
            fontWeight="400"
            color={isDarkMode ? tokens.color.textDarkSub.val : "#474758"}
            numberOfLines={2}
          >
            {content}
          </Text>

          <Text
            fontSize={13}
            lineHeight={16}
            fontWeight="400"
            color={isDarkMode ? "#66666B" : "#81818D"}
          >
            {formatDate(timestamp)}
          </Text>
        </YStack>
      </Pressable>

      <Modal
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
                backgroundColor: isDarkMode ? tokens.color.inputBgDark.val : tokens.color.pureWhite.val,
                shadowOpacity: isDarkMode ? 0.4 : 0.15,
              },
            ]}
          >
            {/* 제목 바꾸기 */}
            <Pressable
              onPress={() => {
                setMenuOpen(false)
                onRename?.()
              }}
              style={({ pressed }) => ({
                ...styles.menuItem,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={[styles.menuItemText, { color: textColor }]}>
                제목 바꾸기
              </Text>
              <Icon name="pencil" size={20} color={textColor} />
            </Pressable>

            {/* 삭제하기 */}
            <Pressable
              onPress={() => {
                setMenuOpen(false)
                onDelete?.()
              }}
              style={({ pressed }) => ({
                ...styles.menuItem,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={[styles.menuItemText, { color: deleteColor }]}>
                삭제하기
              </Text>
              <Icon name="trashcan" size={20} color={deleteColor} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    shadowColor: "#000",
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
