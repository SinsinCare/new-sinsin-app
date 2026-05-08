import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { MainTab } from "../types"
import { Pressable, View, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Icon } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import { useRouter } from "expo-router"
import { useNotificationHistoryStore } from "@/src/stores/notificationHistoryStore"

interface HomeHeaderProps {
  mainTab: MainTab
  onChangeTab: (tab: MainTab) => void
  topInset?: number
}

export function HomeHeader({
  mainTab,
  onChangeTab,
  topInset = 0,
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
          {isDarkMode ? (
            <Icon name="profile-dark" size={27} />
          ) : (
            <Icon name="profile" size={27} />
          )}
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
})
