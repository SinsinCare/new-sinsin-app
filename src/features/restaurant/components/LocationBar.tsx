import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"
import { useCurrentAddress } from "../hooks/useCurrentAddress"

const COLORS = {
  light: {
    border: tokens.color.textDark.val,
    text: tokens.color.textLight.val,
  },
  dark: {
    border: tokens.color.cardBgDark.val,
    text: tokens.color.textDark.val,
  },
} as const

export function LocationBar() {
  const { t } = useTranslation("common")
  const isDark = useAppColorScheme() === "dark"
  const color = isDark ? COLORS.dark : COLORS.light
  const { address, isLoading, error } = useCurrentAddress()

  const displayText = isLoading
    ? t("restaurant.location.loading")
    : error
      ? t("restaurant.location.unavailable")
      : (address ?? t("restaurant.location.notFound"))

  return (
    <XStack
      alignItems="center"
      gap={6}
      paddingHorizontal={16}
      paddingVertical={8}
      style={{ borderBottomWidth: 2, borderBottomColor: color.border }}
    >
      <Icon name="location" size={24} color={color.text} />
      <Text
        fontSize={14}
        fontWeight="500"
        fontFamily="$body"
        color={color.text}
      >
        {displayText}
      </Text>
    </XStack>
  )
}
