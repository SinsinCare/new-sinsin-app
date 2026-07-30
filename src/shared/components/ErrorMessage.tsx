import { YStack, Text, XStack } from "tamagui"
import { AlertCircle } from "./lucide"
import { Button } from "./Button"
import { useTranslation } from "react-i18next"

interface ErrorMessageProps {
  title: string
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorMessage({
  title,
  message,
  onRetry,
  retryLabel,
}: ErrorMessageProps) {
  const { t } = useTranslation()
  const resolvedRetryLabel = retryLabel ?? t("action.retry")

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
          {title}
        </Text>
      </XStack>
      <Text color="$danger">{message}</Text>
      {onRetry && (
        <Button variant="outline" buttonSize="small" onPress={onRetry}>
          {resolvedRetryLabel}
        </Button>
      )}
    </YStack>
  )
}
