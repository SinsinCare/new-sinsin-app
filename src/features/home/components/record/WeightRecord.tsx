import {
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useColorScheme,
} from "react-native"
import { Text, XStack } from "tamagui"
import { RecordCard } from "./RecordCard"
import { tokens } from "@/src/theme/tokens"

interface WeightRecordProps {
  weight: string
  yesterdayWeight: number | null
  onChangeWeight: (value: string) => void
  onDecrease: () => void
  onIncrease: () => void
  onReset: () => void
  onSave: (weight: string) => void
}

export function WeightRecord({
  weight,
  yesterdayWeight,
  onChangeWeight,
  onDecrease,
  onIncrease,
  onReset,
  onSave,
}: WeightRecordProps) {
  const subtitle =
    yesterdayWeight !== null
      ? `어제: ${yesterdayWeight}kg`
      : "이전 기록이 없어요"
  const isDarkMode = useColorScheme() === "dark"

  return (
    <RecordCard
      type="weight"
      title="오늘의 체중을 기록해 주세요."
      subtitle={subtitle}
      onReset={onReset}
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
              { color: isDarkMode ? tokens.color.textDarkSub.val : "#1a1a1a" },
            ]}
            placeholder="눌러서 입력해요"
            placeholderTextColor={isDarkMode ? "$textDark" : "#999999"}
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
