import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"

export function ConsultHeader() {
  const { t } = useTranslation()
  const isDark = useAppColorScheme() === "dark"
  const borderColor = isDark ? tokens.color.grey3.val : tokens.color.grey8.val

  return (
    <YStack
      paddingHorizontal="$5"
      paddingBottom="$3"
      style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
    >
      <Text
        fontFamily="$heading"
        fontSize="$8"
        fontWeight="700"
        color="$color"
        textAlign="center"
      >
        {t("consult.shortTitle")}
      </Text>
    </YStack>
  )
}
