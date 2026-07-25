import { Text, XStack, YStack } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { MainTab } from "../types"
import { Pressable, View, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import { useRouter } from "expo-router"
import { useNotificationHistoryStore } from "@/src/stores/notificationHistoryStore"

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

function formatDate(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dow = DAY_LABELS[date.getDay()]
  return `${month}월 ${day}일 (${dow})`
}

interface HomeHeaderProps {
  mainTab: MainTab
  onChangeTab: (tab: MainTab) => void
  topInset?: number
  selectedDate?: Date
  onDatePress?: () => void
}

export function HomeHeader({
  mainTab,
  onChangeTab,
  topInset = 0,
  selectedDate,
  onDatePress,
}: HomeHeaderProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const router = useRouter()
  const unreadCount = useNotificationHistoryStore((s) => s.unreadCount())

  return (
    <YStack
      backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}
      paddingTop={topInset}
      marginHorizontal={-25}
      paddingHorizontal={25}
    >
      <XStack
        paddingVertical="$3"
        justifyContent="space-between"
        alignItems="center"
      >
        <XStack>
          {(["record", "stats"] as MainTab[]).map((tab) => (
            <Text
              key={tab}
              fontSize={21}
              fontWeight="600"
              color={
                mainTab === tab
                  ? isDarkMode
                    ? "$textDark"
                    : "$colorPress"
                  : "$borderColorFocus"
              }
              paddingHorizontal={8}
              paddingVertical={6}
              onPress={() => onChangeTab(tab)}
              borderRadius="$5"
            >
              {tab === "record" ? "기록" : "통계"}
            </Text>
          ))}
        </XStack>

        <XStack gap="$4">
          <Pressable
            onPress={() => router.push("/(settings)/notifications")}
            hitSlop={8}
            style={styles.bellWrapper}
          >
            {isDarkMode ? (
              <Ionicons
                name="notifications-outline"
                color={tokens.color.textDark.val}
                size={28}
              />
            ) : (
              <Ionicons name="notifications-outline" size={28} />
            )}
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text fontSize={10} fontWeight="700" color="white" lineHeight={14}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </XStack>
      </XStack>

      {selectedDate && (
        <Pressable onPress={onDatePress} hitSlop={8} style={styles.datePillWrapper}>
          <View style={[styles.datePill, isDarkMode && styles.datePillDark]}>
            <Text
              fontSize={16}
              fontWeight="600"
              color={isDarkMode ? "$textDark" : "$color"}
            >
              {formatDate(selectedDate)}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={isDarkMode ? tokens.color.textDark.val : tokens.color.black.val}
              style={{ marginLeft: 6 }}
            />
          </View>
        </Pressable>
      )}
    </YStack>
  )
}

const styles = StyleSheet.create({
  bellWrapper: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: tokens.color.primary7.val,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  datePillWrapper: {
    alignItems: "center",
    paddingBottom: 10,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  datePillDark: {
    backgroundColor: tokens.color.cardBgDark.val,
  },
})
