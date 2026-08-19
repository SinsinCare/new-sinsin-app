import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2HStack, V2Text } from "@/src/design-system-v2"
import { Icon } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"

export function ConsultChatHeader({
  onHistoryPress,
  onNewChatPress,
  onClosePress,
}: {
  onHistoryPress: () => void
  onNewChatPress: () => void
  /** 모달로 띄웠을 때만 준다 — 탭이 아니라서 닫기 동선이 헤더에 있어야 한다. */
  onClosePress?: () => void
}) {
  const { t } = useTranslation()
  const colorScheme = useAppColorScheme()
  const headerColor =
    colorScheme === "dark"
      ? tokens.color.textDark.val
      : tokens.color.textLight.val

  return (
    <>
      <V2HStack paddingHorizontal={20} paddingVertical={12} align="center">
        {/* 좌우 슬롯을 같은 flex로 잡아 제목이 항상 정중앙에 온다. */}
        <V2HStack flex={1} align="center" justify="flex-start">
          {onClosePress ? (
            <Pressable
              onPress={onClosePress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("consult.closeChat")}
            >
              <Icon name="x" size={24} color={headerColor} />
            </Pressable>
          ) : (
            <Pressable onPress={onHistoryPress} hitSlop={8}>
              <Icon name="history" size={24} color={headerColor} />
            </Pressable>
          )}
        </V2HStack>

        <V2Text
          color={headerColor}
          numberOfLines={1}
          style={{ fontSize: 16, fontWeight: "700" }}
        >
          {t("consult.chatTitle")}
        </V2Text>

        <V2HStack flex={1} align="center" justify="flex-end" gap={18}>
          {onClosePress && (
            <Pressable onPress={onHistoryPress} hitSlop={8}>
              <Icon name="history" size={24} color={headerColor} />
            </Pressable>
          )}
          <Pressable onPress={onNewChatPress} hitSlop={8}>
            <Icon name="plus" size={24} color={headerColor} />
          </Pressable>
        </V2HStack>
      </V2HStack>
    </>
  )
}
