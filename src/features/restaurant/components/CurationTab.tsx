import { useState } from "react"
import { ScrollView } from "react-native"
import { YStack } from "tamagui"
import { LocationBar } from "./LocationBar"
import { CurationSection } from "./CurationSection"
import { RestaurantDetailSheet } from "./RestaurantDetailSheet"
import { MOCK_CURATION_SECTIONS } from "../data/curationData"
import { MealRecommendationSection } from "@/src/features/meal-recommendation/components/MealRecommendationSection"

export function CurationTab() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack>
          <LocationBar />
          {/* 점메추/저메추 식당 추천 섹션 */}
          <YStack marginTop={8} paddingHorizontal={16}>
            <MealRecommendationSection category="restaurant" />
          </YStack>
          {MOCK_CURATION_SECTIONS.map((section) => (
            <YStack key={section.id} marginTop={24}>
              <CurationSection
                section={section}
                onRestaurantPress={(id) => setSelectedRestaurantId(id)}
              />
            </YStack>
          ))}
          <YStack height={40} />
        </YStack>
      </ScrollView>
      <RestaurantDetailSheet
        restaurantId={selectedRestaurantId}
        visible={selectedRestaurantId !== null}
        onClose={() => setSelectedRestaurantId(null)}
      />
    </>
  )
}
