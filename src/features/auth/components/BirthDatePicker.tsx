import { useEffect, useState } from "react"
import { TextInput } from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { formatBirthDateInput, getBirthDateInputState } from "../data/dateUtils"
import { tokens } from "@/src/theme/tokens"

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
          color="#17191C"
          letterSpacing={0}
          lineHeight={18.2}
        >
          생년월일
        </Text>
        <Text fontSize={13} fontWeight="500" color={tokens.color.error.val}>
          {" "}
          *
        </Text>
      </XStack>
      <View
        borderWidth={1}
        borderColor={
          inputState.message ? tokens.color.error.val : tokens.color.grey6.val
        }
        borderRadius={8}
        backgroundColor={tokens.color.pureWhite.val}
        paddingHorizontal={16}
        height={52}
        justifyContent="center"
      >
        <TextInput
          value={inputValue}
          onChangeText={handleChange}
          placeholder="YYYY.MM.DD"
          placeholderTextColor={tokens.color.grey5.val}
          keyboardType="number-pad"
          maxLength={10}
          style={{
            color: "#17191C",
            fontSize: 16,
            fontWeight: "500",
            letterSpacing: 0,
          }}
        />
      </View>
      {inputState.message && (
        <Text
          marginTop={6}
          fontSize={12}
          lineHeight={16}
          color={tokens.color.error.val}
        >
          {inputState.message}
        </Text>
      )}
    </YStack>
  )
}
