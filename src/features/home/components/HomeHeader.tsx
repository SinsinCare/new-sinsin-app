import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { MainTab } from "../types"
import Profile from "@/assets/icons/profile.svg"

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
  return (
    <YStack
      backgroundColor="$backgroundFocus"
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
              fontSize="$6"
              fontWeight="700"
              color={mainTab === tab ? "$colorPress" : "$borderColorFocus"}
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
          <Profile width={28} height={28} />
          <Ionicons name="notifications-outline" size={28} />
        </XStack>
      </XStack>
    </YStack>
  )
}
