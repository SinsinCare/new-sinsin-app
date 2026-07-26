import { useEffect, useState } from "react"
import { TextInput } from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { formatBirthDateInput, getBirthDateInputState } from "../data/dateUtils"
import { useV2Theme } from "@/src/design-system-v2"
import { getBirthDatePickerPalette } from "../data/birthDatePresentation"

interface BirthDatePickerProps {
  birthYear: string
  birthMonth: string
  birthDay: string
  onYearChange: (year: string) => void
  onMonthChange: (month: string) => void
  onDayChange: (day: string) => void
}

export function BirthDatePicker({
  birthYear,
  birthMonth,
  birthDay,
  onYearChange,
  onMonthChange,
  onDayChange,
}: BirthDatePickerProps) {
  const theme = useV2Theme()
  const palette = getBirthDatePickerPalette(theme)
  const formattedValue =
    birthYear && birthMonth && birthDay
      ? `${birthYear}.${birthMonth.padStart(2, "0")}.${birthDay.padStart(2, "0")}`
      : ""
  const [inputValue, setInputValue] = useState(formattedValue)
  const inputState = getBirthDateInputState(inputValue)

  useEffect(() => {
    if (formattedValue && formattedValue !== inputValue) {
      setInputValue(formattedValue)
    }
  }, [formattedValue, inputValue])

  const clearBirthDate = () => {
    if (birthYear) onYearChange("")
    if (birthMonth) onMonthChange("")
    if (birthDay) onDayChange("")
  }

  const handleChange = (value: string) => {
    const formatted = formatBirthDateInput(value)
    setInputValue(formatted)
    const nextState = getBirthDateInputState(formatted)
    if (nextState.isValid && nextState.parts) {
      onYearChange(nextState.parts.year)
      onMonthChange(nextState.parts.month)
      onDayChange(nextState.parts.day)
      return
    }
    clearBirthDate()
  }

  return (
    <YStack>
      <XStack paddingBottom={10}>
        <Text
          fontSize={13}
          fontWeight="500"
          color={palette.label}
          letterSpacing={0}
          lineHeight={18.2}
        >
          생년월일
        </Text>
        <Text fontSize={13} fontWeight="500" color={palette.error}>
          {" "}
          *
        </Text>
      </XStack>
      <View
        borderWidth={1}
        borderColor={inputState.message ? palette.error : palette.border}
        borderRadius={8}
        backgroundColor={palette.background}
        paddingHorizontal={16}
        height={52}
        justifyContent="center"
      >
        <TextInput
          accessibilityLabel="생년월일 필수 입력"
          accessibilityHint="연도, 월, 일을 숫자 8자리로 입력하세요"
          value={inputValue}
          onChangeText={handleChange}
          placeholder="YYYY.MM.DD"
          placeholderTextColor={palette.placeholder}
          keyboardType="number-pad"
          maxLength={10}
          style={{
            color: palette.text,
            fontSize: 16,
            fontWeight: "500",
            letterSpacing: 0,
          }}
        />
      </View>
      {inputState.message && (
        <Text marginTop={6} fontSize={12} lineHeight={16} color={palette.error}>
          {inputState.message}
        </Text>
      )}
    </YStack>
  )
}
