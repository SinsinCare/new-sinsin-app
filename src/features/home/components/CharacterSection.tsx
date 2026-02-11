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
    <YStack
      borderRadius="$6"
      padding="$5"
      gap="$7"
      alignItems="center"
      backgroundColor="$backgroundFocus"
    >
      <XStack>
        <Image
          source={require("@/assets/images/character.png")}
          style={{ width: 200, height: 200 }}
          contentFit="contain"
        />
      </XStack>
      <YStack gap="$2">
        {messages.map((msg, i) => (
          <Text
            key={i}
            fontSize="$4"
            fontWeight="600"
            backgroundColor="$cardBackground"
            paddingHorizontal="18"
            paddingVertical="5"
            borderRadius="$6"
          >
            {msg}
          </Text>
        ))}
      </YStack>
    </YStack>
  )
}

export default CharacterSection
