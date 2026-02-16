import { useState, useCallback } from "react"
import { ScrollView } from "react-native"
import { YStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

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
import { FaqDetailSheet } from "@/src/features/consultation/components/FaqDetailSheet"

export default function ConsultScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null)

  const handleCategoryPress = useCallback(
    (key: ChatCategory) => {
      router.push({ pathname: "/chat", params: { category: key } })
    },
    [router],
  )

  const handleFaqPress = useCallback((item: FaqItem) => {
    setSelectedFaq(item)
  }, [])

  const handleHistoryPress = useCallback((id: string) => {
    console.log("History selected:", id)
  }, [])

  const handleSeeAll = useCallback(() => {
    router.push("/consultation-history")
  }, [router])

  return (
    <YStack flex={1} backgroundColor="#f8f9fa" paddingTop={insets.top}>
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

      <FaqDetailSheet
        item={selectedFaq}
        open={selectedFaq !== null}
        onClose={() => setSelectedFaq(null)}
      />
    </YStack>
  )
}
