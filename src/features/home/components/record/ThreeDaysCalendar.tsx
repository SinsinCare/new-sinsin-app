import { XStack, YStack, Text, View } from "tamagui"
import { Pressable, StyleSheet } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { CalendarMode, getThreeDays } from "../../utils/getThreeDays"
import { tokens } from "@/src/theme/tokens"

interface ThreeDaysCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  mode?: CalendarMode
  recordedDates?: Date[]
}

export function ThreeDaysCalendar({
  selectedDate,
  onSelectDate,
  mode = "record",
  recordedDates = [],
}: ThreeDaysCalendarProps) {
  const days = getThreeDays(new Date(), mode)
  const bgColor = tokens.color.appBg.val

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  return (
    <View style={styles.wrapper}>
      <XStack justifyContent="space-between" paddingHorizontal="$2">
        {days.map((day) => {
          const month = day.date.getMonth() + 1
          const date = day.date.getDate()
          const isSelected = isSameDay(day.date, selectedDate)
          const hasRecord = recordedDates.some((d) => isSameDay(d, day.date))

          return (
            <Pressable
              key={day.date.toISOString()}
              onPress={() => onSelectDate(day.date)}
            >
              <YStack alignItems="center" gap={4}>
                <Text
                  fontSize="$5"
                  fontWeight={isSelected ? "700" : "600"}
                  textAlign="center"
                >
                  {month}.{date}({day.label})
                </Text>

                <View
                  width={7}
                  height={7}
                  borderRadius={3}
                  backgroundColor={hasRecord ? "$primary" : "$grey7"}
                />
              </YStack>
            </Pressable>
          )
        })}
      </XStack>

      <LinearGradient
        colors={[bgColor, `${bgColor}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeLeft}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[`${bgColor}00`, bgColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeRight}
        pointerEvents="none"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  fadeLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 80,
  },
  fadeRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 80,
  },
})
