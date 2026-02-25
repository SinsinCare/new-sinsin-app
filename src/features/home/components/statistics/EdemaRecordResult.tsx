import { TouchableOpacity, StyleSheet } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { EDEMA_OPTIONS, EdemaLevel } from "../../data/EdemaConstants"
import { RecordResultCard } from "./RecordResultCard"

interface EdemaRecordResultProps {
  selected: EdemaLevel | null
  yesterdayEdema: string | null
  onSelect: (level: EdemaLevel) => void
}

export function EdemaRecordResult({
  selected,
  onSelect,
  yesterdayEdema,
}: EdemaRecordResultProps) {
  return (
    <RecordResultCard
      type="edema"
      title={`몸이 붓는 \n느낌이 있나요?`}
      subtitle={`어제: ${yesterdayEdema ?? "기록 없음"}`}
    >
      <YStack gap="$2">
        {EDEMA_OPTIONS.map((option) => (
          <TouchableOpacity key={option} onPress={() => onSelect(option)}>
            <XStack
              backgroundColor={selected === option ? "$primary" : "$pureWhite"}
              paddingVertical="$2.5"
              paddingHorizontal="$7"
              borderRadius="$4"
              justifyContent="center"
              style={styles.optionButton}
            >
              <Text
                fontSize={15}
                fontWeight="500"
                color={selected === option ? "white" : "$color"}
              >
                {option}
              </Text>
            </XStack>
          </TouchableOpacity>
        ))}
      </YStack>
    </RecordResultCard>
  )
}

const styles = StyleSheet.create({
  optionButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
})
