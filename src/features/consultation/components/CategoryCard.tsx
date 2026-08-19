import { Pressable, View, Animated } from "react-native"
import { useRef, useCallback } from "react"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useV2Theme, V2Text } from "@/src/design-system-v2"
import { GlassmorphicCard } from "@/src/shared/components/GlassmorphicCard"
import type { CategoryMeta, ChatCategory } from "../types"

interface CategoryCardProps {
  category: CategoryMeta
  onPress: (key: ChatCategory) => void
}

export function CategoryCard({ category, onPress }: CategoryCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const { colors } = useV2Theme()

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }, [scaleAnim])

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }, [scaleAnim])

  return (
    <Pressable
      onPress={() => onPress(category.key)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <GlassmorphicCard
          variant="flat"
          padding={12}
          gap={8}
          align="flex-start"
          style={{ borderColor: colors.line.normal }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: category.color + "1A",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={category.icon as keyof typeof Ionicons.glyphMap}
              size={22}
              color={category.color}
            />
          </View>
          <V2Text token="body.mediumWeak" color={colors.label.strong}>
            {category.label}
          </V2Text>
        </GlassmorphicCard>
      </Animated.View>
    </Pressable>
  )
}
