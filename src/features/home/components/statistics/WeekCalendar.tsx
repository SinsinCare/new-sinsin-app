import { StyleSheet, View, useWindowDimensions } from "react-native"
import { getWeekDays } from "../../utils/getWeekDays"
import { CalendarDay } from "../calendar/CalendarDay"
import { isFutureCalendarDate } from "../calendar/calendarModel"

interface WeekCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  recordedDates?: string[]
  disableFuture?: boolean
}

export function WeekCalendar({
  selectedDate,
  onSelectDate,
  recordedDates = [],
  disableFuture = false,
}: WeekCalendarProps) {
  const today = new Date()
  const { fontScale } = useWindowDimensions()
  return (
    <View key={fontScale} style={styles.week}>
      {getWeekDays(selectedDate, recordedDates).map((day) => (
        <CalendarDay
          key={day.date.getTime()}
          date={day.date}
          selectedDate={selectedDate}
          today={today}
          hasRecord={day.hasRecord}
          disabled={disableFuture && isFutureCalendarDate(day.date, today)}
          onSelect={onSelectDate}
          showWeekday
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  week: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 12 },
})
