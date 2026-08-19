import { Pressable, StyleSheet } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useV2Theme, V2HStack, V2Text } from "@/src/design-system-v2"
import { tokens } from "@/src/theme/tokens"
import { GlassmorphicCard } from "@/src/shared/components/GlassmorphicCard"
import type { FaqItem } from "../types"

interface FaqCardProps {
  item: FaqItem
  onPress: (item: FaqItem) => void
}

export function FaqCard({ item, onPress }: FaqCardProps) {
  const { colors } = useV2Theme()

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {/*
        카드 치수(200×120)는 가로 스크롤에서 한 장이 차지하는 폭이라 토큰이 아니라
        레이아웃 상수다. `borderColor="$borderColor"` 는 themes.ts 에서 `s.border`
        → v2 `line.normal` 이다.
      */}
      <GlassmorphicCard
        variant="flat"
        justify="space-between"
        style={[styles.card, { borderColor: colors.line.normal }]}
      >
        <V2Text
          token="body.mediumWeak"
          color={colors.label.strong}
          numberOfLines={2}
          lineBreakStrategyIOS="hangul-word"
        >
          {item.question}
        </V2Text>

        <V2HStack justify="space-between" align="center">
          <Ionicons
            name="link-outline"
            size={16}
            color={tokens.color.grey6.val}
          />
          <Ionicons
            name="chevron-forward"
            size={18}
            color={tokens.color.sub7.val}
          />
        </V2HStack>
      </GlassmorphicCard>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { width: 200, minHeight: 120 },
})
