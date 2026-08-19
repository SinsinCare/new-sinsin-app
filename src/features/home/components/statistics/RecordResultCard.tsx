import { ReactNode } from "react"
import { StyleSheet, TouchableOpacity } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"

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
  const { colors } = useV2Theme()
  const isHorizontal = type === "edema"

  const titleSection = (
    <V2VStack flex={isHorizontal ? 1 : undefined} justify="center" gap={4}>
      <V2HStack justify="space-between" align="center">
        {/* `$gray12`(가장 진한 글자) → v2 label.strong */}
        <V2Text token="title.xSmall" color={colors.label.strong}>
          {title}
        </V2Text>
        {onReset && (
          <TouchableOpacity onPress={onReset}>
            <V2HStack align="center" gap={2}>
              {/* `$color.grey5` → 보조 글자 */}
              <V2Text token="caption.medium" color={colors.label.neutral}>
                {t("home.undoRecord")}
              </V2Text>
              <Ionicons name="refresh" size={14} color="#999" />
            </V2HStack>
          </TouchableOpacity>
        )}
      </V2HStack>
      {subtitle && (
        <V2Text
          color={colors.label.neutral}
          style={styles.subtitle}
          lineBreakStrategyIOS="hangul-word"
        >
          {subtitle}
        </V2Text>
      )}
    </V2VStack>
  )

  const surface = {
    backgroundColor: colors.background.default,
    borderRadius: 12,
  }

  if (isHorizontal) {
    return (
      <V2HStack
        paddingVertical={16}
        paddingHorizontal={20}
        align="flex-start"
        style={surface}
      >
        {titleSection}
        <V2VStack gap={8}>{children}</V2VStack>
      </V2HStack>
    )
  }

  return (
    <V2HStack
      paddingVertical={16}
      paddingHorizontal={16}
      gap={12}
      style={surface}
    >
      <V2VStack flex={1} gap={4}>
        {titleSection}
        {children}
      </V2VStack>
    </V2HStack>
  )
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 13 },
})
