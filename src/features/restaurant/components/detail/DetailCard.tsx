/**
 * 정보 덩어리를 묶는 **둥근 회색 카드**.
 *
 * ```
 * ╭───────────────────────────────╮
 * │ 🕐 영업중 · 21:30까지          │
 * │ 📍 서울 강남구 …        복사 ⌄ │
 * │ 📞 02-579-7788          복사   │
 * ╰───────────────────────────────╯
 * ```
 *
 * ## 선이 아니라 면으로 끊는다
 *
 * 예전에는 이 블록들이 머리카락 선으로만 나뉘어 있었다. 선은 "여기가 끝" 을 말하지만
 * "이 세 줄이 한 덩어리" 를 말하지 못한다 — 그래서 화면이 균일한 줄무늬로 보이고
 * 어디부터 어디까지가 한 주제인지 읽히지 않았다(사용자 지적: "덩어리가 안 보인다").
 * 면으로 묶으면 경계가 한눈에 잡힌다.
 *
 * ## `V2Card` 를 쓰지 않는 이유
 *
 * DS 의 `V2Card` 는 흰 면 + 그림자(떠 있는 카드)다. 여기 필요한 것은 그 반대로
 * **바탕에 눌린 회색 면**이라 톤이 어긋난다. 다크 모드에서도 뒤집히지 않도록
 * `background.lower` 를 쓴다 — 라이트에서는 흰 배경보다 어둡고(`#f7f7f7`),
 * 다크에서는 검은 배경보다 밝다(`#313135`). 두 모드 모두에서 "바탕과 다른 면" 이다.
 *
 * 치수는 `layout.ts`(격자 정본)에서만 가져온다. 여기서 숫자를 새로 정하면
 * 카드마다 안쪽 여백이 갈리고, 그것이 애초에 이 파일을 만들게 한 문제다.
 */

import { StyleSheet, View } from "react-native"
import type { ReactNode } from "react"
import type { StyleProp, ViewStyle } from "react-native"

import { useV2Theme } from "@/src/design-system-v2"

import { CARD_PADDING, CARD_RADIUS } from "../../layout"

export interface DetailCardProps {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

export function DetailCard({ children, style }: DetailCardProps) {
  const { colors } = useV2Theme()
  return (
    <View
      style={[styles.card, { backgroundColor: colors.background.lower }, style]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: CARD_PADDING,
    borderRadius: CARD_RADIUS,
  },
})
