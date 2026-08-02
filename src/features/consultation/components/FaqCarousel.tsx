import { useCallback, useState } from "react"
import {
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack, YStack, View, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { getLocalizedFrequentlyAskedQuestions } from "../data/mockData"
import type { FaqCardEntry } from "../types"
import { useTranslation } from "react-i18next"

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
  const { i18n } = useTranslation("common")
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"
  const { width: screenWidth } = useWindowDimensions()
  const [activeIndex, setActiveIndex] = useState(0)
  const pages = chunkArray(
    getLocalizedFrequentlyAskedQuestions(
      i18n.resolvedLanguage ?? i18n.language,
    ),
    CARDS_PER_PAGE,
  )

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
        bounces={false}
        overScrollMode="never"
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
                    padding={16}
                    gap="$2"
                    minHeight={104}
                  >
                    <Text
                      fontSize={16}
                      lineHeight={22}
                      fontWeight="700"
                      color={
                        isDarkMode
                          ? tokens.color.textDark.val
                          : tokens.color.textLight.val
                      }
                      numberOfLines={1}
                    >
                      {faq.title}
                    </Text>
                    <Text
                      fontSize={13.5}
                      color={
                        isDarkMode ? tokens.color.textDarkSub.val : "#474758"
                      }
                      lineHeight={19}
                      numberOfLines={3}
                      lineBreakStrategyIOS="hangul-word"
                      textBreakStrategy="balanced"
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
                      padding={16}
                      gap="$2"
                      minHeight={104}
                    >
                      <Text
                        fontSize={16}
                        lineHeight={22}
                        fontWeight="700"
                        color={
                          isDarkMode
                            ? tokens.color.textDark.val
                            : tokens.color.textLight.val
                        }
                        numberOfLines={1}
                      >
                        {faq.title}
                      </Text>
                      <Text
                        fontSize={13.5}
                        color={
                          isDarkMode ? tokens.color.textDarkSub.val : "#474758"
                        }
                        lineHeight={19}
                        numberOfLines={3}
                        lineBreakStrategyIOS="hangul-word"
                        textBreakStrategy="balanced"
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
      <XStack justifyContent="center" gap={6}>
        {pages.map((_, index) => (
          <View
            key={index}
            width={6}
            height={6}
            borderRadius={3}
            backgroundColor={
              index === activeIndex ? tokens.color.sub6.val : "$grey7"
            }
          />
        ))}
      </XStack>
    </YStack>
  )
}
