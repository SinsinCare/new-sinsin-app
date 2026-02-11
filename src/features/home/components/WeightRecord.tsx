import React, { useState } from "react"
import { Text, XStack } from "tamagui"
import { TextInput } from "react-native"
import { Scale } from "@tamagui/lucide-icons"
import RecordCard from "./RecordCard"

interface WeightRecordProps {
  yesterdayWeight?: number
}

const WeightRecord = ({ yesterdayWeight }: WeightRecordProps) => {
  const [weight, setWeight] = useState("")

  return (
    <RecordCard
      icon={<Scale size={24} color="$blue10" />}
      title="오늘의 체중을 기록해주세요."
    >
      <XStack alignItems="center" gap="$3">
        <XStack alignItems="baseline" gap="$1" flex={1}>
          <Text fontSize="$4" color="$gray10">
            :
          </Text>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            placeholder="______"
            keyboardType="decimal-pad"
            style={{
              fontSize: 18,
              fontWeight: "600",
              minWidth: 80,
              borderBottomWidth: 1,
              borderBottomColor: "#d1d5db",
              paddingVertical: 4,
            }}
          />
          <Text fontSize="$4" fontWeight="600" color="$gray12">
            kg
          </Text>
        </XStack>

        {yesterdayWeight && (
          <Text fontSize="$3" color="$gray9">
            어제:{yesterdayWeight}kg
          </Text>
        )}
      </XStack>
    </RecordCard>
  )
}

export default WeightRecord
