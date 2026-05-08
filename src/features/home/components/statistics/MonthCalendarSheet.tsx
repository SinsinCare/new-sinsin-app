import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack, YStack, View } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { tokens } from "@/src/theme/tokens"
import { useMonthDiaryExistence } from "../../hooks/useMonthDiaryExistence"

const DAYS_OF_WEEK = ["월", "화", "수", "목", "금", "토", "일"]

interface MonthCalendarSheetProps {
  visible: boolean
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onClose: () => void
  disableFuture?: boolean
}

export function MonthCalendarSheet({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  disableFuture = false,
}: MonthCalendarSheetProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())

  const { data: recordedDays = new Set<number>() } = useMonthDiaryExistence(
    viewYear,
    viewMonth,
  )

  const today = new Date()
  const bgColor = isDarkMode ? tokens.color.appBgDark.val : tokens.color.appBg.val
  const cardBg = isDarkMode ? tokens.color.cardBgDark.val : tokens.color.pureWhite.val
  const textColor = isDarkMode ? tokens.color.textDark.val : tokens.color.black.val
  const subTextColor = isDarkMode ? tokens.color.textDarkSub.val : tokens.color.grey5.val

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleSelectDate = (date: Date) => {
    onSelectDate(date)
    onClose()
  }

  // 달력 날짜 그리드 생성 (월요일 시작)
  const buildCalendarDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    // 0=일, 1=월 ... 6=토 → 월요일 시작으로 변환
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]

    // 6주 고정 (42칸)
    while (cells.length < 42) cells.push(null)
    return cells
  }

  const isSameDay = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day

  const isSelected = (day: number) =>
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getDate() === day

  const isFutureDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return d > todayStart
  }

  const cells = buildCalendarDays()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <YStack
        style={[styles.sheet, { backgroundColor: cardBg }]}
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        paddingHorizontal="$4"
        paddingTop="$4"
        paddingBottom="$6"
        gap="$4"
      >
        {/* 핸들 */}
        <YStack alignItems="center">
          <YStack
            width={36}
            height={4}
            borderRadius={2}
            backgroundColor={isDarkMode ? tokens.color.grey4.val : tokens.color.grey8.val}
          />
        </YStack>

        {/* 월 네비게이션 */}
        <XStack justifyContent="space-between" alignItems="center">
          <TouchableOpacity onPress={goPrevMonth} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={subTextColor} />
          </TouchableOpacity>
          <Text fontSize="$5" fontWeight="700" color={textColor}>
            {viewYear}년 {viewMonth + 1}월
          </Text>
          <TouchableOpacity onPress={goNextMonth} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={subTextColor} />
          </TouchableOpacity>
        </XStack>

        {/* 요일 헤더 */}
        <XStack justifyContent="space-around">
          {DAYS_OF_WEEK.map((d) => (
            <View key={d} style={styles.cell}>
              <Text fontSize="$3" fontWeight="600" color={subTextColor} textAlign="center">
                {d}
              </Text>
            </View>
          ))}
        </XStack>

        {/* 날짜 그리드 */}
        <YStack gap="$1">
          {Array.from({ length: 6 }, (_, row) => (
            <XStack key={row} justifyContent="space-around">
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (!day) {
                  return <View key={col} style={styles.cell} />
                }

                const selected = isSelected(day)
                const isToday = isSameDay(day)
                const hasRecord = recordedDays.has(day)
                const disabled = disableFuture && isFutureDay(day)

                return (
                  <TouchableOpacity
                    key={col}
                    style={styles.cell}
                    disabled={disabled}
                    onPress={() =>
                      handleSelectDate(new Date(viewYear, viewMonth, day))
                    }
                  >
                    <YStack alignItems="center" gap={3}>
                      <YStack
                        width={32}
                        height={32}
                        borderRadius={16}
                        alignItems="center"
                        justifyContent="center"
                        backgroundColor={
                          selected
                            ? tokens.color.primary7.val
                            : isToday
                              ? isDarkMode
                                ? tokens.color.grey3.val
                                : tokens.color.grey8.val
                              : "transparent"
                        }
                      >
                        <Text
                          fontSize="$4"
                          fontWeight={selected || isToday ? "700" : "400"}
                          color={
                            selected
                              ? tokens.color.pureWhite.val
                              : disabled
                                ? tokens.color.grey7.val
                                : textColor
                          }
                        >
                          {day}
                        </Text>
                      </YStack>
                      <YStack
                        width={5}
                        height={5}
                        borderRadius={3}
                        backgroundColor={
                          hasRecord
                            ? tokens.color.primary7.val
                            : "transparent"
                        }
                      />
                    </YStack>
                  </TouchableOpacity>
                )
              })}
            </XStack>
          ))}
        </YStack>
      </YStack>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  cell: {
    width: 40,
    alignItems: "center",
  },
})
