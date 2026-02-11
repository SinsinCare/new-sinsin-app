import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { MainTab } from "../types"
import { ThreeDaysCalendar } from "./ThreeDaysCalendar"

interface HomeHeaderProps {
  mainTab: MainTab
  onChangeTab: (tab: MainTab) => void
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export function HomeHeader({
  mainTab,
  onChangeTab,
  selectedDate,
  onSelectDate,
}: HomeHeaderProps) {
  return (
    <YStack>
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        justifyContent="space-between"
        alignItems="center"
      >
        <XStack gap="$3">
          {(["record", "stats"] as MainTab[]).map((tab) => (
            <Text
              key={tab}
              fontSize="$5"
              fontWeight="700"
              color={mainTab === tab ? "$primaryPress" : "$color"}
              onPress={() => onChangeTab(tab)}
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
      <ThreeDaysCalendar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
    </YStack>
  )
}
