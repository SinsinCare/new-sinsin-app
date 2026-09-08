import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 후기 작성 유도 카드 (목업 -11 상단 / -19 홈 탭). 홈 탭과 후기 탭이 같은 물건을
 * 쓰므로 한 파일에 둔다 — 두 곳에 복사하면 문구가 갈라진다.
 *
 * ## 상호명만 브랜드색으로 강조하기
 *
 * i18n 키는 `{{name}} 방문하셨나요?` 한 문장이다. 문장을 둘로 쪼개 키를 늘리면
 * 영어("Have you visited {{name}}?")처럼 어순이 다른 로케일에서 조각이 뒤집힌다.
 * 그래서 **번역된 문장 안에서 상호명 위치를 찾아** 앞·이름·뒤 세 조각으로 나눈다.
 * 못 찾으면(번역이 이름을 빼먹었거나 활용형이면) 통째로 한 톤에 그린다 —
 * 강조를 잃는 것이 문장이 깨지는 것보다 낫다.
 *
 * ## 핸들러가 없으면 이 카드는 렌더되지 않는다
 *
 * 호출부에서 `onPress` 없이 쓰지 못하게 필수 prop 이다. 프로토타입은 `후기 작성하기`
 * 버튼을 그려 두고 `onPress` 를 붙이지 않아 눌러도 아무 일이 없었다.
 */

import { StyleSheet, View, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import {
  spacing,
  typography,
  useV2Theme,
  V2Button,
} from "@/src/design-system-v2"

export interface ReviewWritePromptProps {
  restaurantName: string
  onPress: () => void
  style?: ViewStyle
}

export function ReviewWritePrompt({
  restaurantName,
  onPress,
  style,
}: ReviewWritePromptProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  const title = t("restaurant.review.writePromptTitle", {
    name: restaurantName,
  })
  const at = title.indexOf(restaurantName)
  const before = at >= 0 ? title.slice(0, at) : title
  const after = at >= 0 ? title.slice(at + restaurantName.length) : ""

  return (
    <View style={[styles.card, style]}>
      <Text
        style={[typography.title.small, { color: colors.label.normal }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {before}
        {at >= 0 && (
          <Text style={{ color: colors.primary.primary }}>
            {restaurantName}
          </Text>
        )}
        {after}
      </Text>
      <Text
        style={[typography.subtext.medium, { color: colors.label.neutral }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("restaurant.review.writePromptBody")}
      </Text>
      <V2Button
        size="l"
        color="brand"
        variant="weak"
        fullWidth
        onPress={onPress}
        style={styles.button}
      >
        {t("restaurant.review.writeCta")}
      </V2Button>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing[6] },
  button: { marginTop: spacing[10] },
})
