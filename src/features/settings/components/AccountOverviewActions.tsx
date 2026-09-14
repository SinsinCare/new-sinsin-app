import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { V2Text, useV2Theme } from "@/src/design-system-v2"
import { useAppRouter } from "@/src/shared/navigation"
import { useHealthSummaryShare } from "../hooks/useHealthSummaryShare"

export function AccountOverviewActions() {
  const { t } = useTranslation("settings")
  const { colors } = useV2Theme()
  const router = useAppRouter()
  const share = useHealthSummaryShare()
  const actions = [
    {
      icon: "medkit-outline" as const,
      label: t("accountOverview.doctor"),
      onPress: () => router.push("/(settings)/doctor-connections"),
    },
    {
      icon: "clipboard-outline" as const,
      label: t("accountOverview.checkups"),
      onPress: () => router.push("/(settings)/checkup-list"),
    },
    {
      icon: "share-outline" as const,
      label: t("accountOverview.export"),
      onPress: () => void share(),
    },
  ]
  return (
    <View style={styles.actions}>
      {actions.map((action, index) => (
        <Pressable
          key={action.label}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            {
              opacity: pressed ? 0.5 : 1,
              borderLeftWidth: index ? StyleSheet.hairlineWidth : 0,
              borderLeftColor: colors.line.neutral,
            },
          ]}
        >
          <Ionicons name={action.icon} size={21} color={colors.label.neutral} />
          <V2Text
            color={colors.label.normal}
            token="subtext.mediumStrong"
            style={styles.label}
          >
            {action.label}
          </V2Text>
        </Pressable>
      ))}
    </View>
  )
}
const styles = StyleSheet.create({
  // 이제 "건강 관리" 카드 안에 홀로 산다 — 위 구분선·여백은 카드가 대신한다.
  actions: {
    flexDirection: "row",
    marginHorizontal: -4,
  },
  action: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 4,
  },
  label: { textAlign: "center" },
})
