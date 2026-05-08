import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { ImageCard } from "./ImageCard"
import { FilterChip } from "./FilterChip"

export interface RecipeCardTags {
  nutrition?: string[]
  country?: string[]
  stage?: string[]
}

export interface RecipeCardProps {
  imageUri: string
  likeCount: number
  commentCount: number
  tags: RecipeCardTags
  title: string
  onPress?: () => void
}

const TITLE_COLORS = {
  light: tokens.color.textLight.val,
  dark: tokens.color.textDark.val,
} as const

export function RecipeCard({
  imageUri,
  likeCount,
  commentCount,
  tags,
  title,
  onPress,
}: RecipeCardProps) {
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"
  const titleColor = isDark ? TITLE_COLORS.dark : TITLE_COLORS.light

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <YStack gap={10}>
        <ImageCard
          imageUri={imageUri}
          likeCount={likeCount}
          commentCount={commentCount}
        />

        <XStack flexWrap="wrap" gap={6} paddingHorizontal={2}>
          {tags.nutrition?.map((label) => (
            <FilterChip
              key={`n-${label}`}
              label={`#${label}`}
              theme="primary"
              selected
            />
          ))}
          {tags.stage?.map((label) => (
            <FilterChip
              key={`s-${label}`}
              label={`#${label}`}
              theme="sub"
              selected
            />
          ))}
          {tags.country?.map((label) => (
            <FilterChip
              key={`c-${label}`}
              label={`#${label}`}
              theme="tertiary"
              selected
            />
          ))}
        </XStack>

        <Text
          fontSize={18}
          fontWeight="700"
          fontFamily="$body"
          color={titleColor}
          paddingHorizontal={2}
        >
          {title}
        </Text>
      </YStack>
    </Pressable>
  )
}
