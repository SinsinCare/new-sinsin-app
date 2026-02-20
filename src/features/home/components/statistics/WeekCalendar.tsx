import { Pressable } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { getWeekDays } from "../../utils/getWeekDays"

interface WeekCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  recordedDates?: number[]
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export function WeekCalendar({
  selectedDate,
  onSelectDate,
  recordedDates = [],
}: WeekCalendarProps) {
  const days = getWeekDays(selectedDate, recordedDates)

  return (
    <XStack justifyContent="space-between" paddingHorizontal="$2">
      {days.map((day) => {
        const isSelected = isSameDay(day.date, selectedDate)

        return (
          <Pressable
            key={day.date.toISOString()}
            onPress={() => onSelectDate(day.date)}
          >
            <YStack
              alignItems="center"
              gap="$1"
              backgroundColor={isSelected ? "rgba(0,0,0,0.06)" : "transparent"}
              borderRadius="$5"
              paddingBottom={4}
            >
              <YStack
                width={36}
                height={36}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="$4" fontWeight={500}>
                  {day.dayOfMonth}
                </Text>
              </YStack>
              <YStack
                width={6}
                height={6}
                borderRadius={3}
                backgroundColor={day.hasRecord ? "$primary" : "transparent"}
              />
            </YStack>
          </Pressable>
        )
      })}
    </XStack>
  )
}
