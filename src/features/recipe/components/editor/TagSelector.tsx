import { useColorScheme } from "react-native"
import { XStack, Text, YStack } from "tamagui"
import { FilterChip } from "../FilterChip"

type ChipTheme = "primary" | "sub" | "tertiary"

const LABEL_COLOR = { light: "#2A2A37", dark: "#E7E7EE" }

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
  const scheme = useColorScheme() ?? "light"

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
