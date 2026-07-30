import { useLocalSearchParams } from "expo-router"
import { useMemo } from "react"
import { View, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { ThemedText } from "@/components/themed-text"
import { RestaurantDetailScreen } from "@/src/features/restaurant/views/RestaurantDetailScreen"
import { getMockPlaceRestaurants } from "@/src/features/restaurant/data/curationData"
import { normalizeLanguage } from "@/src/i18n"

export default function RestaurantDetailRoute() {
  const { t, i18n } = useTranslation("common")
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()

  const restaurant = useMemo(
    () => getMockPlaceRestaurants(t, language).find((item) => item.id === id),
    [id, language, t],
  )

  if (!restaurant) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top + 20 }]}>
        <ThemedText style={styles.notFoundText}>
          {t("restaurant.notFound")}
        </ThemedText>
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
