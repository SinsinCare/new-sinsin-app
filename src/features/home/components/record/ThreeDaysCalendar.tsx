import { XStack, YStack, Text, View } from "tamagui"
import {
  Animated,
  Pressable,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { CalendarMode, getThreeDays } from "../../utils/getThreeDays"
import { tokens } from "@/src/theme/tokens"
import { useEffect, useRef } from "react"

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
  const days = getThreeDays(selectedDate, mode)
  const today = new Date()
  const isDarkMode = useColorScheme() === "dark"
  const bgColor = isDarkMode
    ? tokens.color.appBgDark.val
    : tokens.color.appBg.val
  const { width } = useWindowDimensions()

  const translateX = useRef(new Animated.Value(0)).current
  const prevDateRef = useRef(selectedDate)

  useEffect(() => {
    const isForward = selectedDate > prevDateRef.current
    prevDateRef.current = selectedDate

    translateX.setValue(isForward ? width * 0.4 : -width * 0.4)
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start()
  }, [selectedDate, translateX, width])

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  return (
    <View style={styles.wrapper}>
      <Animated.View style={{ transform: [{ translateX }] }}>
        <XStack justifyContent="space-between" paddingHorizontal="$2">
          {days.map((day) => {
            const month = day.date.getMonth() + 1
            const date = day.date.getDate()
            const isSelected = isSameDay(day.date, selectedDate)
            const hasRecord = recordedDates.some((d) => isSameDay(d, day.date))
            const isFuture = day.date > today && !isSameDay(day.date, today)

            return (
              <Pressable
                key={day.date.toISOString()}
                onPress={() => !isFuture && onSelectDate(day.date)}
                disabled={isFuture}
              >
                <YStack alignItems="center" gap={4}>
                  <Text
                    fontSize="$5"
                    fontWeight={isSelected ? 600 : 500}
                    textAlign="center"
                    color={
                      isDarkMode
                        ? "$textDark"
                        : isFuture
                          ? "$placeholderColor"
                          : "$color"
                    }
                  >
                    {month}.{date}({day.label})
                  </Text>

                  <View
                    width={8}
                    height={8}
                    borderRadius={10}
                    backgroundColor={hasRecord ? "$primary" : "$grey7"}
                  />
                </YStack>
              </Pressable>
            )
          })}
        </XStack>
      </Animated.View>

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
    overflow: "hidden",
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
