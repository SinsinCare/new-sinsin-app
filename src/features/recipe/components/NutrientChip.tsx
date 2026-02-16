import { XStack, Text } from "tamagui"

interface NutrientChipProps {
  label: string
  variant?: "penalty" | "beneficial"
}

export function NutrientChip({
  label,
  variant = "beneficial",
}: NutrientChipProps) {
  const isPenalty = variant === "penalty"

  return (
    <XStack
      backgroundColor={isPenalty ? "$primaryLight" : "#edf8f7"}
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$10"
      alignItems="center"
      gap="$1"
    >
      <Text
        fontSize="$3"
        color={isPenalty ? "$primary" : "#4db6ac"}
        fontWeight="500"
      >
        {isPenalty ? "●" : "✓"} {label}
      </Text>
    </XStack>
  )
}
