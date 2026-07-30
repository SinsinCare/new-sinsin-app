import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack, Text } from "tamagui"
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
      <XStack paddingHorizontal={20} paddingVertical="$3" alignItems="center">
        {/* 좌우 슬롯을 같은 flex로 잡아 제목이 항상 정중앙에 온다. */}
        <XStack flex={1} alignItems="center" justifyContent="flex-start">
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
        </XStack>

        <Text
          fontSize="$5"
          fontWeight="700"
          color={headerColor}
          numberOfLines={1}
        >
          {t("consult.chatTitle")}
        </Text>

        <XStack flex={1} alignItems="center" justifyContent="flex-end" gap={18}>
          {onClosePress && (
            <Pressable onPress={onHistoryPress} hitSlop={8}>
              <Icon name="history" size={24} color={headerColor} />
            </Pressable>
          )}
          <Pressable onPress={onNewChatPress} hitSlop={8}>
            <Icon name="plus" size={24} color={headerColor} />
          </Pressable>
        </XStack>
      </XStack>
    </>
  )
}
