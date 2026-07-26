import { useState } from "react"
import { V2TextField } from "@/src/design-system-v2"
import { View } from "react-native"
import { formatBirthDateInput, getBirthDateInputState } from "../data/dateUtils"

interface BirthDatePickerProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function BirthDatePicker({
  value,
  onChange,
  error,
}: BirthDatePickerProps) {
  const [touched, setTouched] = useState(false)
  const inputState = getBirthDateInputState(value)
  const fieldError = error || (touched ? inputState.message : "")

  const handleChange = (value: string) => {
    const formatted = formatBirthDateInput(value)
    onChange(formatted)
  }

  return (
    <View>
      <V2TextField
        variant="box"
        label="생년월일"
        required
        accessibilityLabel="생년월일 필수 입력"
        accessibilityHint="연도, 월, 일을 숫자 8자리로 입력하세요"
        value={value}
        onChangeText={handleChange}
        onBlur={() => setTouched(true)}
        placeholder="YYYY.MM.DD"
        keyboardType="number-pad"
        maxLength={10}
        error={fieldError}
      />
    </View>
  )
}
