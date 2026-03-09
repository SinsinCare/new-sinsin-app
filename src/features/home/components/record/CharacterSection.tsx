import { Text, XStack, YStack } from "tamagui"
import FireEmpty from "@/assets/icons/fire-empty.svg"
import CheckEmpty from "@/assets/icons/check-empty.svg"
import FireColor from "@/assets/icons/fire-color.svg"
import CheckColor from "@/assets/icons/check-color.svg"
import ShadowLight from "@/assets/icons/shadow_light.svg"
import { Icon } from "@/src/shared/components/Icon"

type CharacterType = "character_1" | "character_2" | "character_3"

interface CharacterSectionProps {
  selectedDate: Date
  hasRecord: boolean
  characterType: CharacterType
}

export function CharacterSection({
  selectedDate: _selectedDate,
  hasRecord,
  characterType,
}: CharacterSectionProps) {
  const FireIcon = hasRecord ? FireColor : FireEmpty
  const CheckIcon = hasRecord ? CheckColor : CheckEmpty
  const streakText = hasRecord ? "연속 3일 기록중" : "오늘은 기록이 없어요"
  const guideText = hasRecord
    ? "영양소 제한조건을 잘 지켰어요"
    : "영양소 제한조건을 지켜 식사해요"

  return (
    <YStack borderRadius="$6" padding="$7" gap="$7" alignItems="center">
      <YStack alignItems="center">
        <Icon name={characterType} size={200} />
        <ShadowLight width={119} height={32} style={{ marginTop: -16 }} />
      </YStack>
      <YStack>
        <XStack
          alignItems="center"
          justifyContent="center"
          gap="$2"
          paddingHorizontal={18}
          paddingVertical={5}
          borderRadius="$6"
        >
          <FireIcon width={24} height={24} />
          <Text fontSize={17} fontWeight="600">
            {streakText}
          </Text>
        </XStack>

        <XStack
          alignItems="center"
          justifyContent="center"
          gap="$2"
          paddingHorizontal={18}
          paddingVertical={5}
          borderRadius="$6"
        >
          <CheckIcon width={24} height={24} />
          <Text fontSize={17} fontWeight="600">
            {guideText}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  )
}
