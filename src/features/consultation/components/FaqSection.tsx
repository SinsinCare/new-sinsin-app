import { ScrollView, StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { tokens } from "@/src/theme/tokens"
import { FaqCard } from "./FaqCard"
import type { FaqItem } from "../types"

interface FaqSectionProps {
  items: FaqItem[]
  onFaqPress: (item: FaqItem) => void
}

export function FaqSection({ items, onFaqPress }: FaqSectionProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()

  return (
    <V2VStack gap={12}>
      {/* Section header */}
      <V2HStack justify="space-between" align="center" paddingHorizontal={20}>
        {/* `$grey3`(테마가 뒤집어 주던 진한 회색) → 의미대로 섹션 제목 색. */}
        <V2Text
          token="title.small"
          color={colors.label.strong}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("consult.faqTitle")}
        </V2Text>
        {/*
          개수 배지. 브랜드 옅은 면 위에 브랜드 진한 글자 — sub1/sub7 은 앱의
          브랜드 스케일이라 v2 로 옮기지 않고 그대로 둔다(themes.ts 도 같은 값을
          `primary` 램프의 hover/press 단으로 쓴다).
        */}
        <V2Text
          token="label.smallStrong"
          color={tokens.color.sub7.val}
          style={styles.countBadge}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("consult.questionCount", { count: items.length })}
        </V2Text>
      </V2HStack>

      {/* Horizontal FAQ list */}
      <ScrollView
        bounces={false}
        overScrollMode="never"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {items.map((item) => (
          <FaqCard key={item.id} item={item} onPress={onFaqPress} />
        ))}
      </ScrollView>
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  countBadge: {
    backgroundColor: tokens.color.sub1.val,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  list: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
  },
})
