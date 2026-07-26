import { Text } from "tamagui"
import { Pressable, View, Animated } from "react-native"
import { useRef, useCallback } from "react"
import Ionicons from "@expo/vector-icons/Ionicons"
import { GlassmorphicCard } from "@/src/shared/components/GlassmorphicCard"
import type { CategoryMeta, ChatCategory } from "../types"

interface CategoryCardProps {
  category: CategoryMeta
  onPress: (key: ChatCategory) => void
}

export function CategoryCard({ category, onPress }: CategoryCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current

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
          padding="$3"
          gap="$2"
          alignItems="flex-start"
          borderColor="$borderColor"
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
          <Text fontSize="$4" fontWeight="600" color="$color">
            {category.label}
          </Text>
        </GlassmorphicCard>
      </Animated.View>
    </Pressable>
  )
}
