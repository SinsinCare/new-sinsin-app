import { Pressable, useColorScheme } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
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
  const isDarkMode = useColorScheme() === "dark"

  return (
    <XStack
      justifyContent="space-between"
      paddingHorizontal="$2"
      paddingBottom="$3"
    >
      {days.map((day) => {
        const isSelected = isSameDay(day.date, selectedDate)

        return (
          <Pressable
            key={day.date.toISOString()}
            onPress={() => onSelectDate(day.date)}
          >
            <YStack
              alignItems="center"
              backgroundColor={
                isSelected
                  ? isDarkMode
                    ? tokens.color.cardBgDark.val
                    : "rgba(0,0,0,0.06)"
                  : "transparent"
              }
              borderRadius="$5"
              paddingBottom={10}
            >
              <YStack
                width={36}
                height={36}
                alignItems="center"
                justifyContent="center"
              >
                <Text
                  fontSize="$4"
                  fontWeight={500}
                  color={
                    isDarkMode
                      ? tokens.color.textDark.val
                      : tokens.color.black.val
                  }
                >
                  {day.dayOfMonth}
                </Text>
              </YStack>
              <YStack
                width={7}
                height={7}
                borderRadius={3}
                backgroundColor={
                  day.hasRecord ? "$primary" : "$backgroundPress"
                }
              />
            </YStack>
          </Pressable>
        )
      })}
    </XStack>
  )
}
