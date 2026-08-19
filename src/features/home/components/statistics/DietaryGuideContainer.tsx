import { StyleSheet } from "react-native"

import { useV2Theme, V2Text, V2VStack } from "@/src/design-system-v2"

interface DietaryGuideContainerProps {
  title: string
  isSummary?: boolean
  children: React.ReactNode
}

export function DietaryGuideContainer({
  title,
  isSummary = false,
  children,
}: DietaryGuideContainerProps) {
  const { colors } = useV2Theme()

  /*
    `isDarkMode ? "$cardBgDark" : "$cardBackground"` 두 갈래가 v2 에서는
    `background.default` 하나로 접힌다 — 그 토큰이 이미 스킴별 값을 들고 있다.
    제목 색의 `isDarkMode ? "$textDark" : "$color"` 도 같은 이유로 `label.strong`.
  */
  return (
    <V2VStack
      paddingHorizontal={20}
      paddingVertical={20}
      gap={12}
      style={[styles.card, { backgroundColor: colors.background.default }]}
    >
      <V2Text
        color={isSummary ? colors.label.neutral : colors.label.strong}
        style={[styles.title, { fontSize: isSummary ? 14 : 16 }]}
      >
        {title}
      </V2Text>
      <V2VStack gap={12}>{children}</V2VStack>
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  // tamagui `borderRadius="$6"` = radius 스케일 12.
  card: { borderRadius: 12 },
  title: { fontWeight: "600", paddingVertical: 4 },
})
