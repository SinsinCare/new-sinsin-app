import { XStack, YStack, Text, Input } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"

interface RecipeHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function RecipeHeader({
  searchQuery,
  onSearchChange,
}: RecipeHeaderProps) {
  return (
    <YStack paddingHorizontal="$4" gap="$3">
      <Text
        fontFamily="$heading"
        fontSize="$8"
        fontWeight="700"
        color="$color"
        textAlign="center"
      >
        레시피 & 식재료
      </Text>

      <XStack
        backgroundColor={tokens.color.pureWhite.val}
        borderRadius="$6"
        paddingHorizontal="$3"
        alignItems="center"
        height={44}
      >
        <Ionicons name="search" size={20} color={tokens.color.grey5.val} />
        <Input
          flex={1}
          placeholder="식재료 또는 레시피 검색..."
          placeholderTextColor="$placeholderColor"
          value={searchQuery}
          onChangeText={onSearchChange}
          borderWidth={0}
          backgroundColor="transparent"
          fontSize="$4"
          paddingHorizontal="$2"
        />
        <Ionicons
          name="options-outline"
          size={20}
          color={tokens.color.grey5.val}
        />
      </XStack>
    </YStack>
  )
}
