import { XStack, Text } from "tamagui"
import { getThreeDays } from "../utils/getThreeDays"

export function ThreeDaysCalendar() {
  const days = getThreeDays()

  return (
    <XStack justifyContent="space-around" paddingVertical="$3">
      {days.map((day) => {
        const month = day.date.getMonth() + 1
        const date = day.date.getDate()

        return (
          <XStack key={day.date.toISOString()} alignItems="center" gap="$2">
            <Text
              fontSize="$5"
              fontWeight="600"
              color={day.isToday ? "$primary" : "$color"}
            >
              {month}.{date}
            </Text>

            <Text
              fontSize="$3"
              color={day.isToday ? "$primary" : "$color"}
              fontWeight={day.isToday ? "700" : "400"}
            >
              {day.label}
            </Text>
          </XStack>
        )
      })}
    </XStack>
  )
}
