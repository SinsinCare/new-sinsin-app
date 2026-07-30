import { useMemo, useState } from "react"
import { ScrollView } from "react-native"
import { YStack } from "tamagui"
import { useTranslation } from "react-i18next"
import { LocationBar } from "./LocationBar"
import { CurationSection } from "./CurationSection"
import { RestaurantDetailSheet } from "./RestaurantDetailSheet"
import { getCurationSections } from "../data/curationData"
import { normalizeLanguage } from "@/src/i18n"

export function CurationTab() {
  const { t, i18n } = useTranslation("common")
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null)
  const sections = useMemo(
    () => getCurationSections(t, normalizeLanguage(i18n.resolvedLanguage)),
    [i18n.resolvedLanguage, t],
  )

  return (
    <>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <YStack>
          <LocationBar />
          {sections.map((section) => (
            <YStack key={section.id} marginTop={24}>
              <CurationSection
                section={section}
                onRestaurantPress={(id) => setSelectedRestaurantId(id)}
              />
            </YStack>
          ))}
          {/* 우하단 AI 상담 필(16+48)에 마지막 섹션이 가리지 않을 여백. */}
          <YStack height={96} />
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
