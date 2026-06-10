import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { getWeekDays } from "../../utils/getWeekDays"

interface WeekCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  recordedDates?: number[]
  disableFuture?: boolean
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export function WeekCalendar({
  selectedDate,
  onSelectDate,
  recordedDates = [],
  disableFuture = false,
}: WeekCalendarProps) {
  const days = getWeekDays(selectedDate, recordedDates)
  const isDarkMode = useAppColorScheme() === "dark"
  const today = new Date()

  const isFutureDay = (date: Date) => {
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    )
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )
    return dayStart > todayStart
  }

  return (
    <XStack
      justifyContent="space-between"
      paddingHorizontal="$2"
      paddingBottom="$3"
    >
      {days.map((day) => {
        const isSelected = isSameDay(day.date, selectedDate)
        const disabled = disableFuture && isFutureDay(day.date)

        return (
          <Pressable
            key={day.date.toISOString()}
            disabled={disabled}
            onPress={() => {
              if (!disabled) onSelectDate(day.date)
            }}
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
                    disabled
                      ? tokens.color.grey7.val
                      : isDarkMode
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
                  disabled
                    ? "$backgroundPress"
                    : day.hasRecord
                      ? "$primary"
                      : "$backgroundPress"
                }
              />
            </YStack>
          </Pressable>
        )
      })}
    </XStack>
  )
}
