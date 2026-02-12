import { Text, XStack } from "tamagui"
import { TextInput } from "react-native"
import { Scale } from "@tamagui/lucide-icons"
import { RecordCard } from "./RecordCard"

interface WeightRecordProps {
  weight: string
  onChangeWeight: (value: string) => void
  yesterdayWeight?: number | null
}

export function WeightRecord({
  weight,
  onChangeWeight,
  yesterdayWeight,
}: WeightRecordProps) {
  return (
    <RecordCard icon={<Scale size={24} />} title="오늘의 체중을 기록해주세요.">
      <XStack alignItems="center" gap="$3">
        <XStack alignItems="baseline" gap="$1" flex={1}>
          <Text fontSize="$4" color="$gray10">
            :
          </Text>
          <TextInput
            value={weight}
            onChangeText={onChangeWeight}
            keyboardType="decimal-pad"
            style={{
              fontSize: 18,
              fontWeight: "600",
              minWidth: 80,
              borderBottomWidth: 1,
              borderBottomColor: "#d1d5db",
              paddingVertical: 4,
              paddingRight: 4,
              textAlign: "right",
            }}
          />
          <Text fontSize="$4" fontWeight="600" color="$gray12">
            kg
          </Text>
        </XStack>

        {yesterdayWeight != null && (
          <Text fontSize={13} color="$colorSubtle" paddingRight={2}>
            어제:{yesterdayWeight}kg
          </Text>
        )}
      </XStack>
    </RecordCard>
  )
}
