import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useEffect, useRef, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native"
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/shared/components/AppText"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { V2BottomSheet } from "@/src/design-system-v2"
import { useMonthDiaryExistence } from "../../hooks/useMonthDiaryExistence"
import { CalendarDay } from "../calendar/CalendarDay"
import {
  calendarDateKey,
  calendarMonth,
  calendarWeeks,
  isFutureCalendarDate,
} from "../calendar/calendarModel"

interface MonthCalendarSheetProps {
  visible: boolean
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onClose: () => void
  disableFuture?: boolean
}

/** Mobbin references and interaction choices: docs/design/calendar-refresh-2026-09-05/REVIEW.md. */
export function MonthCalendarSheet({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  disableFuture = false,
}: MonthCalendarSheetProps) {
  const { t, i18n } = useTranslation()
  const s = useSurface()
  const insets = useSafeAreaInsets()
  const { height, fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  const locale = i18n.language.startsWith("en") ? "en-US" : "ko-KR"
  const [month, setMonth] = useState(() => calendarMonth(selectedDate))
  const [choosingMonth, setChoosingMonth] = useState(false)
  const [year, setYear] = useState(selectedDate.getFullYear())
  const opened = useRef(false)
  const selectedKey = calendarDateKey(selectedDate)
  useEffect(() => {
    if (visible && !opened.current) {
      setMonth(calendarMonth(selectedDate))
      setYear(selectedDate.getFullYear())
      setChoosingMonth(false)
    }
    opened.current = visible
  }, [visible, selectedKey, selectedDate])

  const today = new Date()
  const query = useMonthDiaryExistence(
    month.getFullYear(),
    month.getMonth(),
    visible && !choosingMonth,
  )
  const nextDisabled =
    disableFuture && calendarMonth(month, 1) > calendarMonth(today)
  const rowHeight = Math.max(44, Math.ceil(24 * fontScale + 16)) + 4
  const gridHeight = rowHeight * 6 + Math.ceil(18 * fontScale) + 12
  const title = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
  }).format(month)
  const selectDate = (date: Date) => {
    if (disableFuture && isFutureCalendarDate(date)) return
    onSelectDate(date)
    onClose()
  }
  const shiftMonth = (offset: number) => {
    hapticSelection()
    setMonth((current) => calendarMonth(current, offset))
  }

  return (
    <V2BottomSheet
      surface="statistics_month_picker"
      visible={visible}
      onClose={onClose}
    >
      <ScrollView
        key={fontScale}
        style={{
          flexGrow: 0,
          maxHeight: Math.max(240, height - insets.top - insets.bottom - 100),
        }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[styles.eyebrow, { color: s.text }]}>
              {t("stats.calendar.title")}
            </Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("stats.calendar.goToday")}
                onPress={() => {
                  hapticSelection()
                  selectDate(today)
                }}
                style={({ pressed }) => [
                  styles.today,
                  {
                    backgroundColor: pressed
                      ? s.surfacePressed
                      : s.surfaceSunken,
                  },
                ]}
              >
                <Text style={[styles.todayText, { color: s.textStrong }]}>
                  {t("stats.calendar.today")}
                </Text>
              </Pressable>
              <NavButton
                icon="close"
                label={t("action.close")}
                onPress={onClose}
              />
            </View>
          </View>
          <View
            style={[
              styles.monthRow,
              { minHeight: Math.max(64, Math.ceil(58 * fontScale)) },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                choosingMonth
                  ? t("stats.calendar.backToDays")
                  : t("stats.calendar.chooseMonth", { month: title })
              }
              accessibilityState={{ expanded: choosingMonth }}
              style={styles.monthTrigger}
              onPress={() => {
                hapticSelection()
                setYear(month.getFullYear())
                setChoosingMonth((value) => !value)
              }}
            >
              <View style={styles.monthHeading}>
                {!choosingMonth ? (
                  <Text style={[styles.yearLabel, { color: s.text }]}>
                    {new Intl.DateTimeFormat(locale, {
                      year: "numeric",
                    }).format(month)}
                  </Text>
                ) : null}
                <Text style={[styles.monthTitle, { color: s.textStrong }]}>
                  {new Intl.DateTimeFormat(
                    locale,
                    choosingMonth ? { year: "numeric" } : { month: "long" },
                  ).format(choosingMonth ? new Date(year, 0, 1) : month)}
                </Text>
              </View>
              <Ionicons
                name={choosingMonth ? "chevron-up" : "chevron-down"}
                style={styles.monthChevron}
                size={16}
                color={s.text}
              />
            </Pressable>
            <View style={styles.actions}>
              <NavButton
                icon="chevron-back"
                label={t(
                  choosingMonth
                    ? "stats.calendar.previousYear"
                    : "stats.calendar.previousMonth",
                )}
                onPress={() =>
                  choosingMonth
                    ? (hapticSelection(), setYear((value) => value - 1))
                    : shiftMonth(-1)
                }
                disabled={choosingMonth && year <= 1900}
              />
              <NavButton
                icon="chevron-forward"
                label={t(
                  choosingMonth
                    ? "stats.calendar.nextYear"
                    : "stats.calendar.nextMonth",
                )}
                onPress={() =>
                  choosingMonth
                    ? (hapticSelection(), setYear((value) => value + 1))
                    : shiftMonth(1)
                }
                disabled={
                  choosingMonth
                    ? disableFuture && year >= today.getFullYear()
                    : nextDisabled
                }
              />
            </View>
          </View>

          <Animated.View
            key={choosingMonth ? `months-${year}` : calendarDateKey(month)}
            entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
            style={{ minHeight: gridHeight }}
          >
            {choosingMonth ? (
              <View style={[styles.monthGrid, { minHeight: gridHeight }]}>
                {Array.from({ length: 12 }, (_, index) => {
                  const value = new Date(year, index, 1)
                  const selected =
                    year === month.getFullYear() && index === month.getMonth()
                  const disabled = disableFuture && value > calendarMonth(today)
                  return (
                    <Pressable
                      key={index}
                      accessibilityRole="button"
                      accessibilityLabel={new Intl.DateTimeFormat(locale, {
                        year: "numeric",
                        month: "long",
                      }).format(value)}
                      accessibilityState={{ selected, disabled }}
                      disabled={disabled}
                      style={({ pressed }) => [
                        styles.monthCell,
                        {
                          minHeight: Math.max(
                            52,
                            Math.ceil(24 * fontScale + 24),
                          ),
                          backgroundColor: selected
                            ? s.textStrong
                            : pressed
                              ? s.surfacePressed
                              : s.surfaceSunken,
                        },
                      ]}
                      onPress={() => {
                        hapticSelection()
                        setMonth(value)
                        setChoosingMonth(false)
                      }}
                    >
                      <Text
                        style={[
                          styles.monthName,
                          {
                            color: selected
                              ? s.canvas
                              : disabled
                                ? s.placeholder
                                : s.textStrong,
                          },
                        ]}
                      >
                        {new Intl.DateTimeFormat(locale, {
                          month: "short",
                        }).format(value)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : (
              <>
                <View style={styles.weekdays}>
                  {Array.from({ length: 7 }, (_, index) => (
                    <Text
                      key={index}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.weekday, { color: s.text }]}
                    >
                      {new Intl.DateTimeFormat(locale, {
                        weekday: "short",
                      }).format(new Date(2024, 0, 8 + index))}
                    </Text>
                  ))}
                </View>
                {calendarWeeks(month).map((week, index) => (
                  <View
                    key={index}
                    style={[styles.week, { minHeight: rowHeight }]}
                  >
                    {week.map((date, column) =>
                      date ? (
                        <CalendarDay
                          key={column}
                          date={date}
                          selectedDate={selectedDate}
                          today={today}
                          disabled={
                            disableFuture && isFutureCalendarDate(date, today)
                          }
                          hasRecord={
                            query.data?.has(calendarDateKey(date)) ?? false
                          }
                          onSelect={selectDate}
                        />
                      ) : (
                        <View key={column} style={styles.blank} />
                      ),
                    )}
                  </View>
                ))}
              </>
            )}
          </Animated.View>

          <View
            style={[
              styles.legend,
              {
                borderTopColor: s.border,
                minHeight: Math.max(56, 40 * fontScale + 12),
              },
            ]}
            accessibilityLiveRegion="polite"
          >
            {choosingMonth ? (
              <Text style={[styles.legendText, { color: s.text }]}>
                {t("stats.calendar.chooseMonthHint")}
              </Text>
            ) : query.isError ? (
              <>
                <Text style={[styles.legendText, { color: s.text }]}>
                  {t("stats.calendar.loadError")}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={query.isFetching}
                  onPress={() => void query.refetch()}
                  style={styles.retry}
                >
                  <Text style={[styles.retryText, { color: s.textStrong }]}>
                    {t("action.retry")}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View
                  style={[styles.recordDot, { backgroundColor: s.brand }]}
                />
                <Text style={[styles.legendText, { color: s.text }]}>
                  {query.isPending
                    ? t("stats.calendar.loading")
                    : t("stats.calendar.mealLegend")}
                </Text>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </V2BottomSheet>
  )
}

function NavButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: "chevron-back" | "chevron-forward" | "close"
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const s = useSurface()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.nav,
        { backgroundColor: pressed ? s.surfacePressed : "transparent" },
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={disabled ? s.placeholder : s.textStrong}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, gap: 12 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: { fontSize: 15, lineHeight: 22, fontWeight: "500", flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  today: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  todayText: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  nav: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  monthRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  monthTrigger: {
    flexDirection: "row",
    alignItems: "flex-end",
    flex: 1,
    minHeight: 48,
    gap: 8,
  },
  monthChevron: { marginBottom: 10 },
  monthHeading: { flexShrink: 1, gap: 2 },
  yearLabel: { fontSize: 13, lineHeight: 20, fontWeight: "500" },
  monthTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "600",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  weekdays: { flexDirection: "row", marginBottom: 12 },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  week: { flexDirection: "row" },
  blank: { flex: 1 },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
    justifyContent: "space-between",
    rowGap: 12,
  },
  monthCell: {
    width: "31%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  monthName: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  legend: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
  },
  legendText: { fontSize: 13, lineHeight: 20, flex: 1 },
  recordDot: { width: 4, height: 4, borderRadius: 2 },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  retryText: { fontSize: 13, lineHeight: 20, fontWeight: "600" },
})
