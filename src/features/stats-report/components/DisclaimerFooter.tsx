import { StyleSheet, Text, View } from "react-native"

import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

type Surface = SurfacePalette & { isDark: boolean }

/**
 * 의료 면책 푸터 — 카드가 아니라 바닥글이다.
 * "판정은 의료진의 일"이라는 문장은 서버가 보내는 그대로 쓴다.
 */
export function DisclaimerFooter({ text, s }: { text: string; s: Surface }) {
  return (
    <View style={styles.wrap}>
      <Text
        style={[styles.text, { color: s.textWeak }]}
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
      >
        {text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 6, paddingTop: 4 },
  text: { ...TYPE.cardSub },
})
