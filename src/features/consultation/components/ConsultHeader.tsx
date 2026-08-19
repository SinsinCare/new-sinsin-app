import { StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2Text, V2VStack } from "@/src/design-system-v2"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"

export function ConsultHeader() {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const isDark = useAppColorScheme() === "dark"
  const borderColor = isDark ? tokens.color.grey3.val : tokens.color.grey8.val

  return (
    <V2VStack
      paddingHorizontal={20}
      paddingBottom={12}
      style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
    >
      {/*
        tamagui `fontFamily="$heading" fontSize="$8" fontWeight="700"` 를 v2 토큰
        하나로 접었다. `title.medium` 이 22/30 SemiBold 로 그 조합에 가장 가깝고,
        무엇보다 **face 를 토큰이 들고 있어** fontWeight 를 따로 줄 필요가 없다.
        `$color` 는 themes.ts 에서 `s.textStrong` → v2 `label.strong` 이다.
      */}
      <V2Text
        token="title.medium"
        color={colors.label.strong}
        style={styles.center}
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
      >
        {t("consult.shortTitle")}
      </V2Text>
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  center: { textAlign: "center" },
})
