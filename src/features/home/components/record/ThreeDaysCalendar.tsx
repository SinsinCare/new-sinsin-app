import {
  Pressable,
  StyleSheet,
  PanResponder,
  View as RNView,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import Ionicons from "@expo/vector-icons/Ionicons"
import { tokens } from "@/src/theme/tokens"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

function getSundayWeek(base: Date): Date[] {
  const sunday = new Date(base)
  sunday.setDate(base.getDate() - base.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

interface ThreeDaysCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  recordedDates?: Date[]
  onMonthPress?: () => void
  mode?: "record" | "statistics"
}

export function ThreeDaysCalendar({
  selectedDate,
  onSelectDate,
  recordedDates = [],
  onMonthPress,
}: ThreeDaysCalendarProps) {
  const { i18n } = useTranslation("common")
  const isDark = useAppColorScheme() === "dark"
  const { colors } = useV2Theme()
  const today = new Date()
  const week = getSundayWeek(selectedDate)
  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en-US"
    : "ko-KR"
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long" }).format(
    selectedDate,
  )

  const recordBg = isDark ? "#3A3A3F" : "#EBEBED"
  const recordText = isDark ? tokens.color.textDarkSub.val : "#555"
  const regularText = isDark ? tokens.color.textDarkSub.val : "#999"
  const futureText = isDark ? "#555" : "#CCC"
  const labelText = isDark ? tokens.color.textDarkSub.val : "#999"

  // refs so PanResponder closure always has latest values
  const selectedDateRef = useRef(selectedDate)
  selectedDateRef.current = selectedDate
  const onSelectDateRef = useRef(onSelectDate)
  onSelectDateRef.current = onSelectDate

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 20,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) {
          const next = new Date(selectedDateRef.current)
          next.setDate(next.getDate() + 7)
          onSelectDateRef.current(next)
        } else if (gs.dx > 50) {
          const prev = new Date(selectedDateRef.current)
          prev.setDate(prev.getDate() - 7)
          onSelectDateRef.current(prev)
        }
      },
    }),
  ).current

  return (
    <RNView {...panResponder.panHandlers}>
      <V2VStack gap={8} paddingBottom={4}>
        {/* 월 헤더 */}
        <Pressable onPress={onMonthPress} hitSlop={8}>
          <V2HStack align="center" gap={4} paddingHorizontal={4}>
            <V2Text
              color={colors.label.strong}
              style={{ fontSize: 22, fontWeight: "700" }}
            >
              {monthLabel}
            </V2Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                isDark ? tokens.color.textDark.val : tokens.color.black.val
              }
            />
          </V2HStack>
        </Pressable>

        {/* 요일 레이블 */}
        <V2HStack justify="space-between" paddingHorizontal={4}>
          {week.map((date) => {
            const label = new Intl.DateTimeFormat(locale, {
              weekday: "narrow",
            }).format(date)
            return (
              <RNView key={date.getDay()} style={styles.cell}>
                <V2Text
                  color={labelText}
                  style={{ fontSize: 12, fontWeight: "500" }}
                >
                  {label}
                </V2Text>
              </RNView>
            )
          })}
        </V2HStack>

        {/* 날짜 행 */}
        <V2HStack justify="space-between" paddingHorizontal={4}>
          {week.map((date) => {
            const isSelected = isSameDay(date, selectedDate)
            const hasRecord = recordedDates.some((r) => isSameDay(r, date))
            const isFuture = date > today && !isSameDay(date, today)
            const isToday = isSameDay(date, today)

            const cellBg = isSelected
              ? tokens.color.primary7.val
              : isToday
                ? tokens.color.primaryAccent.val
                : hasRecord
                  ? recordBg
                  : "transparent"

            const textColor =
              isSelected || isToday
                ? "white"
                : isFuture
                  ? futureText
                  : hasRecord
                    ? recordText
                    : regularText

            return (
              <Pressable
                key={date.toISOString()}
                onPress={() => !isFuture && onSelectDate(date)}
                disabled={isFuture}
              >
                <RNView
                  style={[
                    styles.cell,
                    styles.dateCell,
                    { backgroundColor: cellBg },
                  ]}
                >
                  <V2Text
                    color={textColor}
                    style={{
                      fontSize: 16,
                      fontWeight: isSelected ? "700" : "500",
                    }}
                  >
                    {date.getDate()}
                  </V2Text>
                </RNView>
              </Pressable>
            )
          })}
        </V2HStack>
      </V2VStack>
    </RNView>
  )
}

const styles = StyleSheet.create({
  cell: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCell: {
    borderRadius: 12,
  },
})
