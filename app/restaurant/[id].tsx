import { useLocalSearchParams } from "expo-router"
import { View, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ThemedText } from "@/components/themed-text"
import { RestaurantDetailScreen } from "@/src/features/restaurant/views/RestaurantDetailScreen"
import { MOCK_PLACE_RESTAURANTS } from "@/src/features/restaurant/data/curationData"

export default function RestaurantDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()

  const restaurant = MOCK_PLACE_RESTAURANTS.find((r) => r.id === id)

  if (!restaurant) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top + 20 }]}>
        <ThemedText style={styles.notFoundText}>식당 정보를 찾을 수 없습니다.</ThemedText>
      </View>
    )
  }

  return <RestaurantDetailScreen restaurant={restaurant} />
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: "#64748B",
  },
})
