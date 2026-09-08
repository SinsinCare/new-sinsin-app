import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/shared/components/AppText"
import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { calendarDateKey } from "./calendarModel"

export function CalendarDay({
  date,
  selectedDate,
  today,
  hasRecord,
  disabled,
  onSelect,
  showWeekday = false,
}: {
  date: Date
  selectedDate: Date
  today: Date
  hasRecord: boolean
  disabled: boolean
  onSelect: (date: Date) => void
  showWeekday?: boolean
}) {
  const s = useSurface()
  const { t, i18n } = useTranslation()
  const { fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  const locale = i18n.language.startsWith("en") ? "en-US" : "ko-KR"
  const selected = calendarDateKey(date) === calendarDateKey(selectedDate)
  const isToday = calendarDateKey(date) === calendarDateKey(today)
  const label = [
    new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(date),
    isToday && t("stats.calendar.today"),
    hasRecord && t("stats.calendar.hasMealRecord"),
  ]
    .filter(Boolean)
    .join(", ")
  return (
    <Pressable
      style={styles.cell}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      onPress={() => {
        hapticSelection()
        onSelect(date)
      }}
    >
      {({ pressed }) => (
        <>
          {showWeekday ? (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                styles.weekday,
                { color: disabled ? s.placeholder : s.text },
              ]}
            >
              {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
                date,
              )}
            </Text>
          ) : null}
          <View
            style={[
              styles.face,
              {
                minHeight: Math.max(44, Math.ceil(24 * fontScale + 16)),
                backgroundColor: selected
                  ? s.textStrong
                  : pressed
                    ? s.surfacePressed
                    : "transparent",
                borderColor: isToday && !selected ? s.text : "transparent",
              },
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              style={[
                styles.number,
                {
                  color: selected
                    ? s.canvas
                    : disabled
                      ? s.placeholder
                      : s.textStrong,
                  fontWeight: selected || isToday ? "600" : "500",
                },
              ]}
            >
              {date.getDate()}
            </Text>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    hasRecord && !disabled
                      ? selected
                        ? s.canvas
                        : s.brand
                      : "transparent",
                },
              ]}
            />
          </View>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  cell: { flex: 1, minWidth: 0, alignItems: "center", paddingVertical: 2 },
  face: {
    width: "100%",
    maxWidth: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  number: {
    fontSize: 17,
    lineHeight: 24,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  weekday: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
})
