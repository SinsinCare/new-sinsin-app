import { ReactNode } from "react"
import { TouchableOpacity } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"

interface RecordResultCardProps {
  type: string
  title: string
  subtitle?: string
  onReset?: () => void
  children: ReactNode
}

export function RecordResultCard({
  type,
  title,
  subtitle,
  onReset,
  children,
}: RecordResultCardProps) {
  const { t } = useTranslation()
  const isHorizontal = type === "edema"

  const titleSection = (
    <YStack
      flex={isHorizontal ? 1 : undefined}
      justifyContent="center"
      gap="$1"
    >
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={18} fontWeight="600" color="$gray12">
          {title}
        </Text>
        {onReset && (
          <TouchableOpacity onPress={onReset}>
            <XStack alignItems="center" gap={2}>
              <Text fontSize="$3" color="$color.grey5">
                {t("home.undoRecord")}
              </Text>
              <Ionicons name="refresh" size={14} color="#999" />
            </XStack>
          </TouchableOpacity>
        )}
      </XStack>
      {subtitle && (
        <Text
          fontSize={13}
          color="$color.grey5"
          lineBreakStrategyIOS="hangul-word"
        >
          {subtitle}
        </Text>
      )}
    </YStack>
  )

  if (isHorizontal) {
    return (
      <XStack
        backgroundColor="$cardBackground"
        borderRadius="$6"
        paddingVertical="$4"
        paddingHorizontal="$5"
        alignItems="flex-start"
      >
        {titleSection}
        <YStack gap="$2">{children}</YStack>
      </XStack>
    )
  }

  return (
    <XStack
      backgroundColor="$cardBackground"
      borderRadius="$6"
      paddingVertical="$4"
      paddingHorizontal="$4"
      gap="$3"
    >
      <YStack flex={1} gap="$1">
        {titleSection}
        {children}
      </YStack>
    </XStack>
  )
}
