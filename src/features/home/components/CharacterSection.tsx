import { Image } from "expo-image"
import React from "react"
import { Text, XStack, YStack } from "tamagui"
import { getMessagesForDate } from "../utils/getMessagesForDate"

interface CharacterSectionProps {
  selectedDate: Date
}

const CharacterSection = ({ selectedDate }: CharacterSectionProps) => {
  const messages = getMessagesForDate(selectedDate)

  return (
    <YStack borderRadius="$6" padding="$4" gap="$10" alignItems="center">
      <XStack background="$backgroundTransparent">
        <Image
          source={require("@/assets/images/character.png")}
          style={{ width: 200, height: 200 }}
          contentFit="contain"
        />
      </XStack>
      <YStack gap="$2" background="$white">
        {messages.map((msg, i) => (
          <Text key={i} fontSize="$4" fontWeight="600">
            {msg}
          </Text>
        ))}
      </YStack>
    </YStack>
  )
}

export default CharacterSection
