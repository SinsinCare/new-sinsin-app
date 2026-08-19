import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { tokens } from "@/src/theme/tokens"
import { ImageCard } from "./ImageCard"
import { V2Chip } from "@/src/design-system-v2"

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
      <V2VStack gap={10}>
        <ImageCard
          imageUri={imageUri}
          likeCount={likeCount}
          commentCount={commentCount}
        />

        {/* 태그는 **읽기 전용 표시**다 — 누를 수 없으므로 고른 상태로 그리지 않는다.
            예전에는 영양/병기/국가를 각각 다른 색(주황·틸·회색)으로 칠했는데,
            셋 다 그냥 태그라 색이 뜻하는 게 없었다. 한 얼굴로 모은다. */}
        <V2HStack wrap="wrap" gap={6} paddingHorizontal={2}>
          {[
            ...(tags.nutrition ?? []).map((l) => ({ key: `n-${l}`, label: l })),
            ...(tags.stage ?? []).map((l) => ({ key: `s-${l}`, label: l })),
            ...(tags.country ?? []).map((l) => ({ key: `c-${l}`, label: l })),
          ].map(({ key, label }) => (
            <V2Chip key={key} label={`#${label}`} size="s" />
          ))}
        </V2HStack>

        <V2Text color={titleColor} style={{ fontSize: 18, fontWeight: "700", paddingHorizontal: 2 }}>
          {title}
        </V2Text>
      </V2VStack>
    </Pressable>
  )
}
