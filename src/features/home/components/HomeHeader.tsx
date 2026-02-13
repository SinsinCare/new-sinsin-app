import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { MainTab } from "../types"

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
              fontSize="$5"
              fontWeight="700"
              backgroundColor={mainTab === tab ? "white" : "$colorTransparent"}
              paddingHorizontal={12}
              paddingVertical={6}
              onPress={() => onChangeTab(tab)}
              borderRadius="$5"
            >
              {tab === "record" ? "기록" : "통계"}
            </Text>
          ))}
        </XStack>

        <XStack gap="$4">
          <Ionicons name="camera-outline" size={22} />
          <Ionicons name="notifications-outline" size={22} />
        </XStack>
      </XStack>
    </YStack>
  )
}
