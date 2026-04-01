import { useColorScheme } from "react-native"
import { YStack } from "tamagui"

interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const isDark = useColorScheme() === "dark"
  const trackBg = isDark ? "#3A3A42" : "#F0F0F0"

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
