import { useCallback, useState } from "react"
import {
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  useColorScheme,
} from "react-native"
import { XStack, YStack, View, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { FREQUENTLY_ASKED_QUESTIONS } from "../data/mockData"
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
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
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
                <Pressable
                  key={faq.id}
                  onPress={() => onFaqPress(faq)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    flex: 1,
                  })}
                >
                  <YStack
                    backgroundColor={isDarkMode ? "#252529" : "#F3F3F3"}
                    borderRadius={16}
                    padding="16"
                    gap="$2"
                    minHeight={120}
                  >
                    <Text
                      fontSize="18"
                      fontWeight="700"
                      color={isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val}
                      numberOfLines={1}
                    >
                      {faq.title}
                    </Text>
                    <Text
                      fontSize="14"
                      color={isDarkMode ? tokens.color.textDarkSub.val : "#474758"}
                      lineHeight={18}
                      numberOfLines={3}
                    >
                      {faq.description}
                    </Text>
                  </YStack>
                </Pressable>
              ))}
              {pageItems.length < 2 && <View flex={1} />}
            </XStack>
            {/* Row 2 */}
            {pageItems.length > 2 && (
              <XStack gap={CARD_GAP}>
                {pageItems.slice(2, 4).map((faq) => (
                  <Pressable
                    key={faq.id}
                    onPress={() => onFaqPress(faq)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      flex: 1,
                    })}
                  >
                    <YStack
                      backgroundColor={isDarkMode ? "#252529" : "#F3F3F3"}
                      borderRadius={16}
                      padding="16"
                      gap="$2"
                      minHeight={120}
                    >
                      <Text
                        fontSize="18"
                        fontWeight="700"
                        color={isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val}
                        numberOfLines={1}
                      >
                        {faq.title}
                      </Text>
                      <Text
                        fontSize="14"
                        color={isDarkMode ? tokens.color.textDarkSub.val : "#474758"}
                        lineHeight={18}
                        numberOfLines={3}
                      >
                        {faq.description}
                      </Text>
                    </YStack>
                  </Pressable>
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
            backgroundColor={index === activeIndex ? tokens.color.sub6.val : "$grey7"}
          />
        ))}
      </XStack>
    </YStack>
  )
}
