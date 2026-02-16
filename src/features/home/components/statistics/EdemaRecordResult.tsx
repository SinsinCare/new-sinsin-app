import { TouchableOpacity } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { EDEMA_OPTIONS, EdemaLevel } from "../../data/EdemaConstants"
import { RecordResultCard } from "./RecordResultCard"

const YESTERDAY_EDEMA = EDEMA_OPTIONS[0]

interface EdemaRecordResultProps {
  selected: EdemaLevel | null
  onSelect: (level: EdemaLevel) => void
}

export function EdemaRecordResult({
  selected,
  onSelect,
}: EdemaRecordResultProps) {
  return (
    <RecordResultCard
      type="edema"
      title={`몸이 붓는 \n느낌이 있나요?`}
      subtitle={`어제: ${YESTERDAY_EDEMA}`}
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
