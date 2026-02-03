import { YStack, Spinner, Text } from 'tamagui'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = '로딩 중...' }: LoadingScreenProps) {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
      <Spinner size="large" color="$primary" />
      <Text color="$colorSubtle">{message}</Text>
    </YStack>
  )
}
