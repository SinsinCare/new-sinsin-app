import { XStack, YStack, Text } from "tamagui"
import { ScrollView } from "react-native"
import { tokens } from "@/src/theme/tokens"
import { FaqCard } from "./FaqCard"
import type { FaqItem } from "../types"
import { useTranslation } from "react-i18next"

interface FaqSectionProps {
  items: FaqItem[]
  onFaqPress: (item: FaqItem) => void
}

export function FaqSection({ items, onFaqPress }: FaqSectionProps) {
  const { t } = useTranslation()
  return (
    <YStack gap="$3">
      {/* Section header */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="$5"
      >
        <Text fontSize="$5" fontWeight="700" color="$grey3">
          {t("consult.faqTitle")}
        </Text>
        <Text
          fontSize="$3"
          fontWeight="600"
          backgroundColor={tokens.color.sub1.val}
          color={tokens.color.sub7.val}
          borderRadius={12}
          paddingHorizontal={10}
          paddingVertical={2}
        >
          {t("consult.questionCount", { count: items.length })}
        </Text>
      </XStack>

      {/* Horizontal FAQ list */}
      <ScrollView
        bounces={false}
        overScrollMode="never"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: "row",
          gap: 12,
          paddingHorizontal: 20,
        }}
      >
        {items.map((item) => (
          <FaqCard key={item.id} item={item} onPress={onFaqPress} />
        ))}
      </ScrollView>
    </YStack>
  )
}
