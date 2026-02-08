import { XStack } from "tamagui"
import { NutrientChip } from "./NutrientChip"

interface FlowTagsProps {
  tags: string[]
}

export function FlowTags({ tags }: FlowTagsProps) {
  if (tags.length === 0) return null

  return (
    <XStack flexWrap="wrap" gap="$1.5">
      {tags.map((tag) => (
        <NutrientChip key={tag} label={tag} variant="beneficial" />
      ))}
    </XStack>
  )
}
