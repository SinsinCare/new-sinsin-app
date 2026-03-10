import { YStack } from "tamagui"

interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <YStack paddingHorizontal={20}>
      <YStack
        height={4}
        borderRadius={2}
        backgroundColor="#F0F0F0"
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
