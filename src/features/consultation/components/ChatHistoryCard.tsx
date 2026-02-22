import { useRef, useState } from "react"
import {
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
  onShare?: () => void
  onRename?: () => void
  onDelete?: () => void
}

export function ChatHistoryCard({
  summary,
  content,
  timestamp,
  onPress,
  onShare,
  onRename,
  onDelete,
}: ChatHistoryCardProps) {
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"

  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const ellipsisRef = useRef<View>(null)

  const handleEllipsisPress = () => {
    ellipsisRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPosition({
        top: y + height + 4,
        right: 16,
      })
      setMenuOpen(true)
    })
  }

  const textColor = isDarkMode ? "#E7E7EE" : "#2A2A37"
  const deleteColor = tokens.color.primary9.val

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          backgroundColor: isDarkMode ? "#2E2E34" : "#FDFDFD",
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
              color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
              flex={1}
              numberOfLines={1}
            >
              {summary}
            </Text>
            <View ref={ellipsisRef} collapsable={false}>
              <Pressable
                onPress={handleEllipsisPress}
                hitSlop={8}
                style={{ marginLeft: 8 }}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
                />
              </Pressable>
            </View>
          </XStack>

          <Text
            fontSize={14}
            lineHeight={20}
            fontWeight="400"
            color={isDarkMode ? "#ABABB4" : "#474758"}
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
                backgroundColor: isDarkMode ? "#2E2E34" : "#FFFFFF",
                shadowOpacity: isDarkMode ? 0.4 : 0.15,
              },
            ]}
          >
            {/* 공유하기 */}
            <Pressable
              onPress={() => {
                setMenuOpen(false)
                onShare?.()
              }}
              style={({ pressed }) => ({
                ...styles.menuItem,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={[styles.menuItemText, { color: textColor }]}>
                공유하기
              </Text>
              <Icon name="upload" size={20} color={textColor} />
            </Pressable>

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
