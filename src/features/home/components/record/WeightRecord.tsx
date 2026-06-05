import {
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack } from "tamagui"
import { RecordCard } from "./RecordCard"
import { tokens } from "@/src/theme/tokens"
import WeightIconSvg from "@/assets/images/weight-icon.svg"

interface WeightRecordProps {
  weight: string
  yesterdayWeight: number | null
  onChangeWeight: (value: string) => void
  onDecrease: () => void
  onIncrease: () => void
  onSave: (weight: string) => void
}

export function WeightRecord({
  weight,
  yesterdayWeight,
  onChangeWeight,
  onDecrease,
  onIncrease,
  onSave,
}: WeightRecordProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const placeholder =
    yesterdayWeight !== null ? `${yesterdayWeight}` : "직접 입력"

  return (
    <RecordCard
      type="weight"
      title="오늘의 체중을 기록해 주세요."
      icon={<WeightIconSvg width={36} height={36} />}
    >
      <XStack
        alignItems="center"
        justifyContent="flex-end"
        gap="$3"
        paddingTop="$7"
      >
        <TouchableOpacity onPress={onDecrease}>
          <XStack
            backgroundColor={isDarkMode ? "$appBgDark" : "$pureWhite"}
            paddingVertical="$2"
            paddingHorizontal="$3"
            borderColor="$borderColor"
            borderWidth={isDarkMode ? 0 : 1}
            borderRadius="$4"
          >
            <Text
              fontSize="$4"
              fontWeight="500"
              color={isDarkMode ? "$textDarkSub" : "$black"}
            >
              -0.1kg
            </Text>
          </XStack>
        </TouchableOpacity>

        <XStack
          backgroundColor={isDarkMode ? "$appBgDark" : "$backgroundFocus"}
          paddingVertical="$2"
          paddingHorizontal="$3"
          borderRadius="$4"
          alignItems="center"
          minWidth={110}
          justifyContent="center"
        >
          <TextInput
            style={[
              styles.input,
              { color: isDarkMode ? tokens.color.textDark.val : "#1a1a1a" },
            ]}
            placeholder={placeholder}
            placeholderTextColor={tokens.color.grey6.val}
            value={weight}
            onChangeText={onChangeWeight}
            onEndEditing={() => onSave(weight)}
            keyboardType="decimal-pad"
          />
          {!!weight && (
            <Text
              fontSize="$4"
              fontWeight="600"
              color={isDarkMode ? "$textDarkSub" : "$black"}
            >
              kg
            </Text>
          )}
        </XStack>

        <TouchableOpacity onPress={onIncrease}>
          <XStack
            backgroundColor={isDarkMode ? "$appBgDark" : "$pureWhite"}
            paddingVertical="$2"
            paddingHorizontal="$3"
            borderColor="$borderColor"
            borderWidth={isDarkMode ? 0 : 1}
            borderRadius="$4"
          >
            <Text
              fontSize="$4"
              fontWeight="500"
              color={isDarkMode ? "$textDarkSub" : "$black"}
            >
              +0.1kg
            </Text>
          </XStack>
        </TouchableOpacity>
      </XStack>
    </RecordCard>
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    minWidth: 60,
  },
})
