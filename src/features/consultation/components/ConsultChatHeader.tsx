import { StyleSheet, View } from "react-native"
import {
  V2Text,
  V2Icon,
  spacing,
  borderWidth,
  useV2Theme,
} from "@/src/design-system-v2"
import { HeaderIconButton, Icon } from "@/src/shared/components"
import { useTranslation } from "react-i18next"
export function ConsultChatHeader({
  onHistoryPress,
  onNewChatPress,
  onClosePress,
}: {
  onHistoryPress: () => void
  onNewChatPress: () => void
  onClosePress?: () => void
}) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  return (
    <View style={[styles.root, { borderBottomColor: colors.line.normal }]}>
      <HeaderIconButton
        onPress={onClosePress ?? onHistoryPress}
        accessibilityLabel={t(
          onClosePress ? "consult.back" : "consult.openHistory",
        )}
      >
        {onClosePress ? (
          <V2Icon name="chevronLeft" size={22} color={colors.label.normal} />
        ) : (
          <Icon name="history" size={22} color={colors.label.normal} />
        )}
      </HeaderIconButton>
      <V2Text
        token="label.smallStrong"
        color={colors.label.normal}
        style={styles.title}
      >
        {t("consult.chatTitle")}
      </V2Text>
      {onClosePress && (
        <HeaderIconButton
          onPress={onHistoryPress}
          accessibilityLabel={t("consult.openHistory")}
        >
          <Icon name="history" size={21} color={colors.label.neutral} />
        </HeaderIconButton>
      )}
      <HeaderIconButton
        onPress={onNewChatPress}
        accessibilityLabel={t("consult.newChat")}
      >
        <Icon name="pencil" size={21} color={colors.label.neutral} />
      </HeaderIconButton>
    </View>
  )
}
const styles = StyleSheet.create({
  root: {
    minHeight: 56,
    paddingHorizontal: spacing[12],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    borderBottomWidth: borderWidth.thin,
  },
  title: { flex: 1, marginLeft: spacing[4] },
})
