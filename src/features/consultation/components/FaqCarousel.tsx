import { useCallback, useState } from "react"
import {
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native"
import { XStack, YStack, View } from "tamagui"
import { FREQUENTLY_ASKED_QUESTIONS } from "../data/mockData"
import { FaqCarouselCard } from "./FaqCarouselCard"
import type { FaqCardEntry } from "../types"

const CARDS_PER_PAGE = 4
const HORIZONTAL_PADDING = 20
const CARD_GAP = 12

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

interface FaqCarouselProps {
  onFaqPress: (entry: FaqCardEntry) => void
}

export function FaqCarousel({ onFaqPress }: FaqCarouselProps) {
  const { width: screenWidth } = useWindowDimensions()
  const [activeIndex, setActiveIndex] = useState(0)
  const pages = chunkArray(FREQUENTLY_ASKED_QUESTIONS, CARDS_PER_PAGE)

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x
      const pageIndex = Math.round(offsetX / screenWidth)
      setActiveIndex(pageIndex)
    },
    [screenWidth],
  )

  return (
    <YStack gap="$3">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {pages.map((pageItems, pageIndex) => (
          <YStack
            key={pageIndex}
            width={screenWidth}
            paddingHorizontal={HORIZONTAL_PADDING}
            gap={CARD_GAP}
          >
            {/* Row 1 */}
            <XStack gap={CARD_GAP}>
              {pageItems.slice(0, 2).map((faq) => (
                <FaqCarouselCard
                  key={faq.id}
                  title={faq.title}
                  description={faq.description}
                  onPress={() => onFaqPress(faq)}
                />
              ))}
              {pageItems.length < 2 && <View flex={1} />}
            </XStack>
            {/* Row 2 */}
            {pageItems.length > 2 && (
              <XStack gap={CARD_GAP}>
                {pageItems.slice(2, 4).map((faq) => (
                  <FaqCarouselCard
                    key={faq.id}
                    title={faq.title}
                    description={faq.description}
                    onPress={() => onFaqPress(faq)}
                  />
                ))}
                {pageItems.length < 4 && <View flex={1} />}
              </XStack>
            )}
          </YStack>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <XStack justifyContent="center" gap={8}>
        {pages.map((_, index) => (
          <View
            key={index}
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={index === activeIndex ? "$sub5" : "$grey7"}
          />
        ))}
      </XStack>
    </YStack>
  )
}
