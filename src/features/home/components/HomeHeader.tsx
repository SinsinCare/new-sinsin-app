import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { MainTab } from "../types"
import { useColorScheme } from "react-native"
import { Icon } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"

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
  const isDarkMode = useColorScheme() === "dark"

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
          {isDarkMode ? (
            <Ionicons
              name="notifications-outline"
              color={tokens.color.textDark.val}
              size={28}
            />
          ) : (
            <Ionicons name="notifications-outline" size={28} />
          )}
        </XStack>
      </XStack>
    </YStack>
  )
}
