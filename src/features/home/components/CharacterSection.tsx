import { Image } from "expo-image"
import React from "react"
import { Text, XStack, YStack } from "tamagui"

const CharacterSection = () => {
  return (
    <YStack borderRadius="$6" padding="$4" gap="$3" alignItems="center">
      <XStack background="$backgroundTransparent">
        <Image
          source={require("@/assets/images/character.png")}
          style={{ width: 150, height: 150 }}
          contentFit="contain"
        />
      </XStack>
      <YStack gap="$2" background="white">
        <Text fontSize="$4" fontWeight="600">
          일주일동안 매일 식이 기록을 했어요 🎉✨
        </Text>
        <Text fontSize="$4" fontWeight="600">
          영양소 제한 조건을 잘 지키고 있어요
        </Text>
      </YStack>
    </YStack>
  )
}

export default CharacterSection
