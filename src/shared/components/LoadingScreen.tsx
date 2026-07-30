import { YStack, Spinner, Text } from "tamagui"
import { useTranslation } from "react-i18next"

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const { t } = useTranslation()
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
      <Spinner size="large" color="$primary" />
      <Text color="$colorSubtle">{message ?? t("state.loading")}</Text>
    </YStack>
  )
}
