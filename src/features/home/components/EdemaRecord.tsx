import React, { useState } from "react"
import { Text, useTheme, XStack } from "tamagui"
import { TouchableOpacity } from "react-native"
import { Droplets } from "@tamagui/lucide-icons"
import RecordCard from "./RecordCard"
import { EDEMA_OPTIONS, EdemaLevel } from "../data/EdemaConstants"

const EdemaRecord = () => {
  const [selected, setSelected] = useState<EdemaLevel | null>(null)
  const theme = useTheme()

  return (
    <RecordCard
      icon={<Droplets size={24} />}
      title="오늘 몸이 붓는 느낌이 있나요?"
    >
      <XStack gap="$2">
        {EDEMA_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => setSelected(option)}
            style={{
              backgroundColor:
                selected === option
                  ? theme.primary.val
                  : theme.backgroundFocus.val,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              justifyContent: "center",
              alignItems: "center",
            }}
            activeOpacity={0.7}
          >
            <Text
              fontSize="$3"
              fontWeight="600"
              color={selected === option ? "white" : "$color"}
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
