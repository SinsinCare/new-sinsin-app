import React, { useState } from "react"
import { Text, XStack } from "tamagui"
import { TouchableOpacity } from "react-native"
import { Droplets } from "@tamagui/lucide-icons"
import RecordCard from "./RecordCard"
import { EDEMA_OPTIONS, EdemaLevel } from "../data/EdemaConstants"

const EdemaRecord = () => {
  const [selected, setSelected] = useState<EdemaLevel | null>(null)

  return (
    <RecordCard
      icon={<Droplets size={24} color="$blue10" />}
      title="오늘 몸이 붓는 느낌이 있나요?"
    >
      <XStack gap="$2">
        {EDEMA_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => setSelected(option)}
            style={{
              backgroundColor: selected === option ? "#3b82f6" : "#e5e7eb",
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
            }}
            activeOpacity={0.7}
          >
            <Text
              fontSize="$3"
              fontWeight="600"
              color={selected === option ? "white" : "$gray11"}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </XStack>
    </RecordCard>
  )
}

export default EdemaRecord
