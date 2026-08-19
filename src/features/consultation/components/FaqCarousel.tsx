import { useCallback, useState } from "react"
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  View,
} from "react-native"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import { getLocalizedFrequentlyAskedQuestions } from "../data/mockData"
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

/**
 * 카드 한 장.
 *
 * 원래 이 블록이 **1행·2행에 그대로 복붙**돼 있었다(각 33줄, 완전 동일).
 * tamagui 를 걷어내면서 같은 수정을 두 번 하게 되므로 여기서 하나로 합친다 —
 * 계보 이동과 중복 제거를 같이 하는 것이 오히려 안전하다. 두 벌을 각각 고치면
 * 한쪽만 틀리는 사고가 난다.
 */
function FaqTile({
  faq,
  onPress,
}: {
  faq: FaqCardEntry
  onPress: (entry: FaqCardEntry) => void
}) {
  const isDarkMode = useAppColorScheme() === "dark"

  return (
    <Pressable
      onPress={() => onPress(faq)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flex: 1 })}
    >
      <V2VStack
        gap={8}
        padding={16}
        style={[
          styles.tile,
          { backgroundColor: isDarkMode ? "#252529" : "#F3F3F3" },
        ]}
      >
        <V2Text
          color={
            isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val
          }
          style={styles.tileTitle}
          numberOfLines={1}
        >
          {faq.title}
        </V2Text>
        <V2Text
          color={isDarkMode ? tokens.color.textDarkSub.val : "#474758"}
          style={styles.tileBody}
          numberOfLines={3}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {faq.description}
        </V2Text>
      </V2VStack>
    </Pressable>
  )
}

export function FaqCarousel({ onFaqPress }: FaqCarouselProps) {
  const { i18n } = useTranslation("common")
  const { colors } = useV2Theme()
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
    <V2VStack gap={12}>
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
          <V2VStack
            key={pageIndex}
            paddingHorizontal={HORIZONTAL_PADDING}
            gap={CARD_GAP}
            style={{ width: screenWidth }}
          >
            {/* 한 페이지 = 2행 × 2열. 빈 칸은 flex 로 자리만 채운다. */}
            {[0, 2].map((start) => {
              const row = pageItems.slice(start, start + 2)
              if (row.length === 0) return null
              return (
                <V2HStack key={start} gap={CARD_GAP}>
                  {row.map((faq) => (
                    <FaqTile key={faq.id} faq={faq} onPress={onFaqPress} />
                  ))}
                  {row.length < 2 && <View style={styles.filler} />}
                </V2HStack>
              )
            })}
          </V2VStack>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <V2HStack justify="center" gap={6}>
        {pages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index === activeIndex
                    ? tokens.color.sub6.val
                    : // `$grey7`(옅은 회색 선) → v2 line.normal
                      colors.line.normal,
              },
            ]}
          />
        ))}
      </V2HStack>
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  tile: { borderRadius: 16, minHeight: 104 },
  /* 16/22 Bold. v2 토큰에 정확히 같은 조합이 없어 값으로 남긴다 —
     V2Text 가 fontWeight 를 Pretendard face 로 바꿔 준다. */
  tileTitle: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  tileBody: { fontSize: 13.5, lineHeight: 19 },
  filler: { flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
})
