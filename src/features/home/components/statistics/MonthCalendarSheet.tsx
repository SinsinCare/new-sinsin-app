import Ionicons from "@expo/vector-icons/Ionicons"
import { useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"

import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { V2BottomSheet } from "@/src/design-system-v2"
import { LAYOUT } from "@/src/theme/surface"

import { useMonthDiaryExistence } from "../../hooks/useMonthDiaryExistence"
import { useTranslation } from "react-i18next"

/**
 * 날짜 선택 시트.
 *
 * 세 상태가 서로 다른 채널을 쓴다 — 겹쳐도 읽히게:
 *   선택 = 잉크 원(면) · 오늘 = 브랜드색 숫자(글자) · 기록 = 4pt 도트(마크).
 * 예전에는 셋 다 "채운 원"이라 그리드가 얼룩졌고 오늘과 선택이 같은
 * 오렌지로 구분되지 않았다. 선택을 브랜드색이 아닌 잉크로 칠하는 이유도
 * 같다 — 브랜드는 "오늘"과 "기록"이라는 의미에 이미 배정돼 있다.
 *
 * 월 스와이프는 넣지 않는다 — 시트 자체가 세로 드래그를 쓰고 있어
 * 제스처가 충돌한다. 횡 이동은 ‹ › 와 [오늘] 지름길이 담당한다.
 */
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
  const { t, i18n } = useTranslation()
  const s = useSurface()
  const isEnglish = i18n.language.startsWith("en")
  const locale = isEnglish ? "en-US" : "ko-KR"
  const weekStartsMonday = !isEnglish
  const daysOfWeek = useMemo(() => {
    const sunday = new Date(2024, 0, 7)
    return Array.from({ length: 7 }, (_, index) => {
      const offset = weekStartsMonday ? (index + 1) % 7 : index
      const date = new Date(sunday)
      date.setDate(sunday.getDate() + offset)
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date)
    })
  }, [locale, weekStartsMonday])
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())

  // 열 때마다 선택된 날짜의 달로 돌아온다 — 지난번에 넘겨 본 달이
  // 남아 있으면 "내가 고른 날이 없는 달"이 먼저 보인다(실제 버그였다).
  useEffect(() => {
    if (!visible) return
    setViewYear(selectedDate.getFullYear())
    setViewMonth(selectedDate.getMonth())
  }, [visible, selectedDate])

  const { data: recordedDays = new Set<number>() } = useMonthDiaryExistence(
    viewYear,
    viewMonth,
  )

  const today = new Date()
  const isViewingCurrentMonth =
    today.getFullYear() === viewYear && today.getMonth() === viewMonth
  const selectedIsToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate()

  // 다음 달 전체가 미래면 › 를 비활성한다 — 눌러도 고를 게 없는 달로
  // 보내는 버튼은 버튼이 아니다.
  const nextMonthDisabled =
    disableFuture &&
    new Date(viewYear, viewMonth + 1, 1) >
      new Date(today.getFullYear(), today.getMonth(), 1)

  const goPrevMonth = () => {
    hapticSelection()
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goNextMonth = () => {
    if (nextMonthDisabled) return
    hapticSelection()
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleSelectDate = (date: Date) => {
    hapticSelection()
    onSelectDate(date)
    onClose()
  }

  const goToday = () => {
    handleSelectDate(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    )
  }

  // 실제 주 수만 렌더한다(4~6주). 6주 고정은 4주 달에 빈 두 줄을 남긴다.
  const weeks = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const startOffset = weekStartsMonday
      ? firstDay.getDay() === 0
        ? 6
        : firstDay.getDay() - 1
      : firstDay.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    const rows: (number | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [viewYear, viewMonth, weekStartsMonday])

  const isToday = (day: number) =>
    isViewingCurrentMonth && today.getDate() === day
  const isSelected = (day: number) =>
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getDate() === day
  const isFutureDay = (day: number) =>
    new Date(viewYear, viewMonth, day) >
    new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // 올해면 "7월", 다른 해면 "2025년 12월" — 대부분의 경우 연도는 소음이다.
  const monthTitle = new Intl.DateTimeFormat(locale, {
    month: "long",
    ...(viewYear === today.getFullYear() ? {} : { year: "numeric" as const }),
  }).format(new Date(viewYear, viewMonth, 1))

  return (
    /* 고정 56% 스냅을 버렸다. 6주짜리 달에서는 마지막 주 행이 56% 밖으로 잘렸고
       (SE 계열 375×667) Tamagui 프레임이 `overflow:hidden` 이라 스크롤로도 못 갔다.
       이제 시트가 달력 높이에 맞춰 자란다. */
    <V2BottomSheet
      surface="statistics_month_picker"
      visible={visible}
      onClose={onClose}
    >
      <View style={styles.body}>
        {/* ── 헤더: 타이틀(주인) · 오늘 지름길 · 월 이동 ── */}
        <View style={styles.head}>
          <Text style={[styles.title, { color: s.textStrong }]}>
            {monthTitle}
          </Text>

          <View style={styles.headRight}>
            {!selectedIsToday && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("stats.calendar.goToday")}
                onPress={goToday}
                hitSlop={6}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.todayPill,
                      {
                        backgroundColor: pressed ? s.surfacePressed : s.surface,
                      },
                    ]}
                  >
                    <Text style={[styles.todayLabel, { color: s.text }]}>
                      {t("stats.calendar.today")}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}

            <NavButton
              icon="chevron-back"
              label={t("stats.calendar.previousMonth")}
              onPress={goPrevMonth}
              s={s}
            />
            <NavButton
              icon="chevron-forward"
              label={t("stats.calendar.nextMonth")}
              onPress={goNextMonth}
              disabled={nextMonthDisabled}
              s={s}
            />
          </View>
        </View>

        {/* ── 요일 ── */}
        <View style={styles.weekRow}>
          {daysOfWeek.map((d) => (
            <View key={d} style={styles.cell}>
              <Text style={[styles.weekday, { color: s.textWeak }]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* ── 날짜 ── */}
        <View style={styles.grid}>
          {weeks.map((week, row) => (
            <View key={row} style={styles.weekRow}>
              {week.map((day, col) => {
                if (!day) return <View key={col} style={styles.cell} />

                const selected = isSelected(day)
                const todayCell = isToday(day)
                const hasRecord = recordedDays.has(day)
                const disabled = disableFuture && isFutureDay(day)

                const numberColor = selected
                  ? s.canvas
                  : disabled
                    ? s.placeholder
                    : todayCell
                      ? s.brand
                      : s.textStrong

                const a11y = [
                  new Intl.DateTimeFormat(locale, {
                    month: "long",
                    day: "numeric",
                  }).format(new Date(viewYear, viewMonth, day)),
                  todayCell ? t("stats.calendar.today") : null,
                  hasRecord ? t("stats.calendar.hasRecord") : null,
                  selected ? t("stats.calendar.selected") : null,
                ]
                  .filter(Boolean)
                  .join(", ")

                return (
                  <Pressable
                    key={col}
                    style={styles.cell}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={a11y}
                    accessibilityState={{ selected, disabled }}
                    onPress={() =>
                      handleSelectDate(new Date(viewYear, viewMonth, day))
                    }
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.dayCircle,
                          selected
                            ? { backgroundColor: s.textStrong }
                            : pressed
                              ? { backgroundColor: s.surfacePressed }
                              : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            { color: numberColor },
                            (selected || todayCell) && styles.dayNumberStrong,
                          ]}
                        >
                          {day}
                        </Text>
                        {/* 기록 도트 — 선택 원 안에서는 흰 도트로 살아남는다 */}
                        <View
                          style={[
                            styles.dot,
                            {
                              backgroundColor: hasRecord
                                ? selected
                                  ? s.canvas
                                  : s.brand
                                : "transparent",
                            },
                          ]}
                        />
                      </View>
                    )}
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>
      </View>
    </V2BottomSheet>
  )
}

function NavButton({
  icon,
  label,
  onPress,
  disabled,
  s,
}: {
  icon: "chevron-back" | "chevron-forward"
  label: string
  onPress: () => void
  disabled?: boolean
  s: ReturnType<typeof useSurface>
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled } : undefined}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.navButton,
            { backgroundColor: pressed ? s.surfacePressed : s.surface },
          ]}
        >
          <Ionicons
            name={icon}
            size={16}
            color={disabled ? s.placeholder : s.text}
          />
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: LAYOUT.screenX, paddingTop: 2, gap: 14 },

  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.38,
    fontWeight: "700",
  },
  headRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayPill: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  todayLabel: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekday: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  grid: { gap: 4 },
  cell: { flex: 1, alignItems: "center" },

  dayCircle: {
    width: 40,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 3,
  },
  dayNumber: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  dayNumberStrong: { fontWeight: "700" },
  dot: { width: 4, height: 4, borderRadius: 999, marginTop: 2 },
})
