import { YStack, Text, XStack } from 'tamagui'
import { AlertCircle } from '@tamagui/lucide-icons'
import { Button } from './Button'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <YStack
      backgroundColor="$dangerBackground"
      borderRadius="$3"
      padding="$4"
      gap="$3"
    >
      <XStack gap="$2" alignItems="center">
        <AlertCircle size={20} color="$danger" />
        <Text color="$danger" fontWeight="600">
          오류 발생
        </Text>
      </XStack>
      <Text color="$danger">{message}</Text>
      {onRetry && (
        <Button variant="outline" size="small" onPress={onRetry}>
          다시 시도
        </Button>
      )}
    </YStack>
  )
}
