import { useCallback } from "react"
import { ScrollView } from "react-native"
import { YStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { ChatCategory } from "@/src/types/models"
import type { FaqItem } from "@/src/features/consultation/types"
import {
  MOCK_FAQ_LIST,
  MOCK_HISTORY_LIST,
} from "@/src/features/consultation/data/mockData"
import { ConsultHeader } from "@/src/features/consultation/components/ConsultHeader"
import { CategorySection } from "@/src/features/consultation/components/CategorySection"
import { FaqSection } from "@/src/features/consultation/components/FaqSection"
import { HistorySection } from "@/src/features/consultation/components/HistorySection"

export default function ConsultScreen() {
  const insets = useSafeAreaInsets()

  const handleCategoryPress = useCallback((key: ChatCategory) => {
    console.log("Category selected:", key)
  }, [])

  const handleFaqPress = useCallback((item: FaqItem) => {
    console.log("FAQ selected:", item.question)
  }, [])

  const handleHistoryPress = useCallback((id: string) => {
    console.log("History selected:", id)
  }, [])

  const handleSeeAll = useCallback(() => {
    console.log("See all history")
  }, [])

  return (
    <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack paddingTop="$3" gap="$6">
          <ConsultHeader />
          <CategorySection onCategoryPress={handleCategoryPress} />
          <FaqSection items={MOCK_FAQ_LIST} onFaqPress={handleFaqPress} />
          <HistorySection
            items={MOCK_HISTORY_LIST}
            onItemPress={handleHistoryPress}
            onSeeAll={handleSeeAll}
          />
        </YStack>
      </ScrollView>
    </YStack>
  )
}
