import { StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { AlertCircle } from "./lucide"
import { Button } from "./Button"

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
  const { colors } = useV2Theme()
  const resolvedRetryLabel = retryLabel ?? t("action.retry")

  /*
    tamagui 테마 토큰 `$danger` / `$dangerBackground` 를 v2 색으로 옮겼다.
    v2 에는 위험색이 `status.negative` 하나뿐이고 배경 짝이 없어서, 같은 색을 옅게 깐다
    — 원본의 `$dangerBackground` 도 같은 계열의 옅은 면이었다.
  */
  const danger = colors.status.negative

  return (
    <V2VStack
      gap={12}
      padding={16}
      style={[styles.card, { backgroundColor: `${danger}14` }]}
    >
      <V2HStack gap={8} align="center">
        <AlertCircle size={20} color={danger} />
        <V2Text token="label.medium" color={danger}>
          {title}
        </V2Text>
      </V2HStack>
      <V2Text token="body.mediumWeak" color={danger}>
        {message}
      </V2Text>
      {onRetry && (
        <Button variant="outline" buttonSize="small" onPress={onRetry}>
          {resolvedRetryLabel}
        </Button>
      )}
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 12 },
})
