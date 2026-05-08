import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"

interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const isDark = useAppColorScheme() === "dark"
  const trackBg = isDark ? tokens.color.borderDark.val : "#F0F0F0"

  return (
    <YStack paddingHorizontal={20}>
      <YStack
        height={4}
        borderRadius={2}
        backgroundColor={trackBg}
        overflow="hidden"
      >
        <YStack
          height={4}
          borderRadius={2}
          backgroundColor="#34D399"
          width={`${((current + 1) / total) * 100}%`}
        />
      </YStack>
    </YStack>
  )
}
