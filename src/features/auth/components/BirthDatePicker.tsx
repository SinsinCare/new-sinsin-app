import { YStack, XStack, Text } from "tamagui"
import { BottomSheetPicker } from "@/src/shared/components"
import {
  generateYearOptions,
  generateMonthOptions,
  generateDayOptions,
} from "../data/dateUtils"

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
  return (
    <YStack>
      <XStack paddingBottom={10}>
        <Text
          fontSize={13}
          fontWeight="500"
          color="#17191C"
          letterSpacing={-0.3}
          lineHeight={18.2}
        >
          생년월일
        </Text>
        <Text fontSize={13} fontWeight="500" color="#FF3B30">
          {" "}
          *
        </Text>
      </XStack>
      <XStack gap={8}>
        <YStack flex={1}>
          <BottomSheetPicker
            value={birthYear}
            options={generateYearOptions()}
            onSelect={onYearChange}
            placeholder="년"
          />
        </YStack>
        <YStack flex={1}>
          <BottomSheetPicker
            value={birthMonth}
            options={generateMonthOptions()}
            onSelect={onMonthChange}
            placeholder="월"
          />
        </YStack>
        <YStack flex={1}>
          <BottomSheetPicker
            value={birthDay}
            options={generateDayOptions(birthYear, birthMonth)}
            onSelect={onDayChange}
            placeholder="일"
          />
        </YStack>
      </XStack>
    </YStack>
  )
}
