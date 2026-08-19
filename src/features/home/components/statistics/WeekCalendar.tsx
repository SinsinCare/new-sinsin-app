import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
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
  const { t, i18n } = useTranslation()
  const { colors } = useV2Theme()
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
    <V2HStack justify="space-between" paddingHorizontal={8} paddingBottom={12}>
      {days.map((day) => {
        const isSelected = isSameDay(day.date, selectedDate)
        const disabled = disableFuture && isFutureDay(day.date)
        const dateLabel = new Intl.DateTimeFormat(
          i18n.language.startsWith("en") ? "en-US" : "ko-KR",
          { weekday: "long", month: "long", day: "numeric" },
        ).format(day.date)
        const accessibilityLabel = [
          dateLabel,
          day.hasRecord ? t("stats.calendar.hasRecord") : null,
          isSelected ? t("stats.calendar.selected") : null,
        ]
          .filter(Boolean)
          .join(", ")

        return (
          <Pressable
            key={day.date.toISOString()}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ selected: isSelected, disabled }}
            onPress={() => {
              if (!disabled) onSelectDate(day.date)
            }}
          >
            <V2VStack
              align="center"
              paddingBottom={10}
              style={[
                styles.day,
                {
                  backgroundColor: isSelected
                    ? isDarkMode
                      ? tokens.color.cardBgDark.val
                      : "rgba(0,0,0,0.06)"
                    : "transparent",
                },
              ]}
            >
              <V2VStack align="center" justify="center" style={styles.dayCell}>
                <V2Text
                  color={
                    disabled
                      ? tokens.color.grey7.val
                      : isDarkMode
                        ? tokens.color.textDark.val
                        : tokens.color.black.val
                  }
                  style={styles.dayNumber}
                >
                  {day.dayOfMonth}
                </V2Text>
              </V2VStack>
              {/*
                기록 표시 점. `$backgroundPress`(= s.surfacePressed) 는 v2 에서
                `fill.pressed` 다 — 비활성/미기록 둘 다 같은 옅은 면을 쓴다.
              */}
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      !disabled && day.hasRecord
                        ? colors.primary.primary
                        : colors.fill.pressed,
                  },
                ]}
              />
            </V2VStack>
          </Pressable>
        )
      })}
    </V2HStack>
  )
}

const styles = StyleSheet.create({
  // tamagui `borderRadius="$5"` = radius 스케일 10.
  day: { borderRadius: 10 },
  dayCell: { width: 36, height: 36 },
  // `fontSize="$4"` = 14, weight 500 → V2Text 가 Pretendard-Medium 으로 바꾼다.
  dayNumber: { fontSize: 14, fontWeight: "500" },
  dot: { width: 7, height: 7, borderRadius: 3 },
})
