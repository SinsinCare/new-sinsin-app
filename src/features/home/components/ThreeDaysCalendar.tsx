import { XStack, Text } from "tamagui"
import { Pressable } from "react-native"
import { CalendarMode, getThreeDays } from "../utils/getThreeDays"

interface ThreeDaysCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  mode?: CalendarMode
}

export function ThreeDaysCalendar({
  selectedDate,
  onSelectDate,
  mode = "record",
}: ThreeDaysCalendarProps) {
  const days = getThreeDays(new Date(), mode)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  return (
    <XStack justifyContent="space-between" paddingHorizontal="$4" gap="$4">
      {days.map((day) => {
        const month = day.date.getMonth() + 1
        const date = day.date.getDate()
        const isSelected = isSameDay(day.date, selectedDate)

        return (
          <Pressable
            key={day.date.toISOString()}
            onPress={() => onSelectDate(day.date)}
          >
            <XStack alignItems="center" gap="$1">
              <Text fontSize="$5" fontWeight="600">
                {month}.{date}
              </Text>

              <XStack
                alignItems="center"
                justifyContent="center"
                paddingHorizontal={10}
                paddingVertical="$2"
                borderRadius="$10"
                border="0.7"
                borderColor="$borderColor"
                backgroundColor={isSelected ? "$primary" : "transparent"}
              >
                <Text
                  fontSize="$3"
                  color={isSelected ? "white" : "$gray8"}
                  fontWeight={isSelected ? "700" : "400"}
                >
                  {day.label}
                </Text>
              </XStack>
            </XStack>
          </Pressable>
        )
      })}
    </XStack>
  )
}
