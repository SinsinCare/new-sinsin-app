import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack, Text, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { FilterChip } from "../FilterChip"

type ChipTheme = "primary" | "sub" | "tertiary"

const LABEL_COLOR = { light: tokens.color.textLight.val, dark: tokens.color.textDark.val }

interface TagSelectorProps {
  tags: readonly string[]
  selected: string[]
  onToggle: (tag: string) => void
  label: string
  chipTheme?: ChipTheme
}

export function TagSelector({
  tags,
  selected,
  onToggle,
  label,
  chipTheme = "primary",
}: TagSelectorProps) {
  const scheme = useAppColorScheme()

  return (
    <YStack gap={10} marginBottom={16}>
      <Text
        fontSize={14}
        fontWeight="500"
        fontFamily="$body"
        lineHeight={20}
        color={LABEL_COLOR[scheme]}
      >
        {label}
      </Text>
      <XStack flexWrap="wrap" gap={8}>
        {tags.map((tag) => (
          <FilterChip
            key={tag}
            label={tag}
            theme={chipTheme}
            selected={selected.includes(tag)}
            onPress={() => onToggle(tag)}
          />
        ))}
      </XStack>
    </YStack>
  )
}
