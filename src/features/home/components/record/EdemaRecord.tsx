import { TouchableOpacity, StyleSheet } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { EDEMA_OPTIONS, EdemaLevel } from "../../data/EdemaConstants"
import { RecordCard } from "./RecordCard"

interface EdemaRecordProps {
  selected: EdemaLevel | null
  yesterdayEdema?: string | null
  onSave: (edemaLevel: EdemaLevel) => void
}

export function EdemaRecord({
  selected,
  yesterdayEdema,
  onSave,
}: EdemaRecordProps) {
  const subtitle =
    yesterdayEdema != null ? `어제: ${yesterdayEdema}` : "이전 기록이 없어요"

  return (
    <RecordCard
      type="edema"
      title={`몸이 붓는 \n느낌이 있나요?`}
      subtitle={subtitle}
    >
      <YStack gap="$2">
        {EDEMA_OPTIONS.map((option) => (
          <TouchableOpacity key={option} onPress={() => onSave(option)}>
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
                fontWeight="600"
                color={selected === option ? "white" : "$color"}
              >
                {option}
              </Text>
            </XStack>
          </TouchableOpacity>
        ))}
      </YStack>
    </RecordCard>
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
