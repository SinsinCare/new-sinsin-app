import { XStack, Text } from "tamagui"
import { Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { tokens } from "@/src/theme/tokens"
import { GlassmorphicCard } from "@/src/shared/components/GlassmorphicCard"
import type { FaqItem } from "../types"

interface FaqCardProps {
  item: FaqItem
  onPress: (item: FaqItem) => void
}

export function FaqCard({ item, onPress }: FaqCardProps) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <GlassmorphicCard
        variant="flat"
        width={200}
        minHeight={120}
        justifyContent="space-between"
        borderColor="$borderColor"
      >
        <Text fontSize="$4" color="$color" fontWeight="500" numberOfLines={2} lineBreakStrategyIOS="hangul-word">
          {item.question}
        </Text>

        <XStack justifyContent="space-between" alignItems="center">
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
        </XStack>
      </GlassmorphicCard>
    </Pressable>
  )
}
