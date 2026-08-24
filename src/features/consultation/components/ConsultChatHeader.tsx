import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2HStack, V2Text } from "@/src/design-system-v2"
import { HeaderIconButton, Icon } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"

/**
 * 상담 헤더.
 *
 * 버튼은 전부 `HeaderIconButton` 이다 — 예전에는 `Pressable + hitSlop={8}` 이라
 * 터치 상자가 40pt 였다(규격 44/48 미달). 이 화면은 iOS 에서 pageSheet 로 뜨는데,
 * 시트 상단은 **아래로 쓸어 닫는 제스처의 영역**이라 손가락이 몇 px 만 움직여도
 * 탭이 제스처로 넘어간다. 작은 상자 + 제스처 경합이 겹쳐 "✕ 가 잘 안 눌린다" 가
 * 되던 자리다. 상자를 규격까지 키우면 두 번째 원인은 남아도 체감이 크게 준다.
 */
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
    <V2HStack paddingHorizontal={20} paddingVertical={12} align="center">
      {/* 좌우 슬롯을 같은 flex로 잡아 제목이 항상 정중앙에 온다. */}
      <V2HStack flex={1} align="center" justify="flex-start">
        {onClosePress ? (
          <HeaderIconButton
            onPress={onClosePress}
            accessibilityLabel={t("consult.closeChat")}
          >
            <Icon name="x" size={24} color={headerColor} />
          </HeaderIconButton>
        ) : (
          <HeaderIconButton
            onPress={onHistoryPress}
            accessibilityLabel={t("consult.openHistory")}
          >
            <Icon name="history" size={24} color={headerColor} />
          </HeaderIconButton>
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
          <HeaderIconButton
            onPress={onHistoryPress}
            accessibilityLabel={t("consult.openHistory")}
          >
            <Icon name="history" size={24} color={headerColor} />
          </HeaderIconButton>
        )}
        <HeaderIconButton
          onPress={onNewChatPress}
          accessibilityLabel={t("consult.newChat")}
        >
          <Icon name="plus" size={24} color={headerColor} />
        </HeaderIconButton>
      </V2HStack>
    </V2HStack>
  )
}
