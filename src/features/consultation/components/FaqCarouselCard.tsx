import { YStack, Text } from "tamagui"
import { Pressable } from "react-native"

interface FaqCarouselCardProps {
  title: string
  description: string
  onPress: () => void
}

export function FaqCarouselCard({
  title,
  description,
  onPress,
}: FaqCarouselCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flex: 1 })}
    >
      <YStack
        backgroundColor="$pureWhite"
        borderRadius={16}
        padding="$4"
        gap="$2"
        flex={1}
      >
        <Text fontSize="$5" fontWeight="700" color="$grey1">
          {title}
        </Text>
        <Text fontSize="$4" color="$grey4" lineHeight={18}>
          {description}
        </Text>
      </YStack>
    </Pressable>
  )
}
