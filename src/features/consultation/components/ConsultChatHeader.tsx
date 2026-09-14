import { StyleSheet, View } from "react-native"
import {
  V2Text,
  V2Icon,
  spacing,
  iconSize,
  borderWidth,
  useV2Theme,
} from "@/src/design-system-v2"
import {
  HeaderIconButton,
  HEADER_TOUCH_SIZE,
  Icon,
} from "@/src/shared/components"
import { useTranslation } from "react-i18next"

/**
 * 헤더 액션 규격 — V2ScreenHeader 와 같은 리듬.
 *
 * 2026-09-11 피드백: 우측의 기록·새 대화 아이콘이 21pt 글리프에 4pt 간격으로
 * 오른쪽 끝에 몰려 있어 구분도 탭도 어려웠다. `HeaderIconButton` 은 터치 상자는
 * 44/48 로 키우지만 **레이아웃 자리는 아이콘 크기(21)로 되돌리는** 음수 마진 방식이라,
 * 두 버튼의 터치 상자가 서로 겹치고 눈에는 여전히 붙어 보였다.
 *
 * 그래서 여기서는 `visualSize` 를 상자 크기와 같게 줘서 음수 마진을 0 으로 만든다 —
 * 버튼 하나가 **레이아웃에서도 44pt(안드 48) 정사각**을 차지하고, 글리프는 24pt,
 * 버튼 사이는 8pt, 바 끝 여백은 8pt(= 상자 안 여백 10 + 8 = 글리프에서 화면 끝까지 18).
 */
export const CONSULT_HEADER_ACTION_HIT = HEADER_TOUCH_SIZE // 44 (iOS) / 48 (Android)
export const CONSULT_HEADER_ACTION_GLYPH = iconSize.md // 24
export const CONSULT_HEADER_ACTION_GAP = spacing[8] // 8

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
        visualSize={CONSULT_HEADER_ACTION_HIT}
      >
        {onClosePress ? (
          <V2Icon
            name="chevronLeft"
            size={CONSULT_HEADER_ACTION_GLYPH}
            color={colors.label.normal}
          />
        ) : (
          <Icon
            name="history"
            size={CONSULT_HEADER_ACTION_GLYPH}
            color={colors.label.normal}
          />
        )}
      </HeaderIconButton>
      <V2Text
        token="label.smallStrong"
        color={colors.label.normal}
        style={styles.title}
        numberOfLines={1}
      >
        {t("consult.chatTitle")}
      </V2Text>
      <View style={styles.actions}>
        {onClosePress && (
          <HeaderIconButton
            onPress={onHistoryPress}
            accessibilityLabel={t("consult.openHistory")}
            visualSize={CONSULT_HEADER_ACTION_HIT}
          >
            <Icon
              name="history"
              size={CONSULT_HEADER_ACTION_GLYPH}
              color={colors.label.normal}
            />
          </HeaderIconButton>
        )}
        <HeaderIconButton
          onPress={onNewChatPress}
          accessibilityLabel={t("consult.newChat")}
          visualSize={CONSULT_HEADER_ACTION_HIT}
        >
          <Icon
            name="pencil"
            size={CONSULT_HEADER_ACTION_GLYPH}
            color={colors.label.normal}
          />
        </HeaderIconButton>
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  root: {
    minHeight: 56,
    // V2ScreenHeader 와 같은 좌우 4 — 리딩 상자(44)가 시각 여백을 겸한다.
    paddingLeft: spacing[4],
    paddingRight: spacing[8],
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: borderWidth.thin,
  },
  title: { flex: 1, minWidth: 0, marginLeft: spacing[4] },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: CONSULT_HEADER_ACTION_GAP,
    marginLeft: spacing[8],
  },
})
