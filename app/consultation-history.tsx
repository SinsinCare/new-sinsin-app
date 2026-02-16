import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { ScrollView, Pressable, View } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { tokens } from "@/src/theme/tokens"
import type { ChatCategory } from "@/src/types/models"
import {
  CATEGORY_LIST,
  MOCK_HISTORY_LIST,
  getCategoryMeta,
} from "@/src/features/consultation/data/mockData"
import { HistoryCard } from "@/src/features/consultation/components/HistoryCard"

export default function ConsultationHistoryScreen() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<ChatCategory | null>(
    null,
  )

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return MOCK_HISTORY_LIST
    return MOCK_HISTORY_LIST.filter(
      (item) => item.category === selectedCategory,
    )
  }, [selectedCategory])

  const groupedItems = useMemo(() => {
    const groups: { category: ChatCategory; items: typeof filteredItems }[] = []
    const categoryOrder = CATEGORY_LIST.map((c) => c.key)

    for (const catKey of categoryOrder) {
      const items = filteredItems.filter((item) => item.category === catKey)
      if (items.length > 0) {
        groups.push({ category: catKey, items })
      }
    }
    return groups
  }, [filteredItems])

  const contentScrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [selectedCategory])

  const handleItemPress = useCallback((id: string) => {
    console.log("History item pressed:", id)
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <XStack paddingHorizontal="$4" paddingVertical="$3" alignItems="center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={tokens.color.grey1.val}
          />
        </Pressable>
        <Text
          fontSize="$5"
          fontWeight="700"
          color="$color"
          flex={1}
          textAlign="center"
        >
          이전 대화
        </Text>
        {/* Temporary empty view to balance the header - TODO: Search button  */}
        <View style={{ width: 24 }} />
        {/* <Pressable onPress={() => console.log("Search pressed")} hitSlop={8}>
          <Ionicons
            name="search-outline"
            size={22}
            color={tokens.color.grey3.val}
          />
        </Pressable> */}
      </XStack>

      <YStack height={1} backgroundColor="$borderColor" />

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        style={{ flexGrow: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 8,
        }}
      >
        <Pressable onPress={() => setSelectedCategory(null)}>
          <YStack
            paddingHorizontal="$3"
            paddingVertical="$1.5"
            borderRadius="$10"
            backgroundColor={
              selectedCategory === null ? "#44af94" : "$background"
            }
          >
            <Text
              fontSize="$3"
              fontFamily="Pretendard-SemiBold"
              color={selectedCategory === null ? "white" : "$grey4"}
            >
              전체
            </Text>
          </YStack>
        </Pressable>
        {CATEGORY_LIST.map((cat) => (
          <Pressable key={cat.key} onPress={() => setSelectedCategory(cat.key)}>
            <YStack
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius="$10"
              backgroundColor={
                selectedCategory === cat.key ? "#44af94" : "$background"
              }
            >
              <Text
                fontSize="$3"
                fontFamily="Pretendard-SemiBold"
                color={selectedCategory === cat.key ? "white" : "$grey4"}
              >
                {cat.label}
              </Text>
            </YStack>
          </Pressable>
        ))}
      </ScrollView>

      {/* Grouped History List */}
      <ScrollView
        ref={contentScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack gap="$5">
          {groupedItems.map((group) => {
            const meta = getCategoryMeta(group.category)
            return (
              <YStack key={group.category} gap="$3">
                <Text
                  fontSize="$4"
                  fontWeight="600"
                  color={meta?.color ?? "$color"}
                >
                  {meta?.label ?? group.category}
                </Text>
                <YStack gap="$2">
                  {group.items.map((item) => (
                    <HistoryCard
                      key={item.id}
                      item={item}
                      onPress={handleItemPress}
                      showAnswer
                    />
                  ))}
                </YStack>
              </YStack>
            )
          })}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
