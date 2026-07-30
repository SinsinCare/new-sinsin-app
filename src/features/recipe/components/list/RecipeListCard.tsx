/**
 * 목록 카드 — 계약 §6.3 그대로.
 *
 *   [이미지 16:9]
 *   제목
 *   한 줄 소개(1줄, 없으면 안 그림)
 *   나트륨 376mg · 오늘 남은 양의 24%      ← headline 하나만. 이 카드의 유일한 강조다.
 *   ★4.7 (1,227) · 저장 1,228             ← 리뷰 0건이면 "저장 1,228" 만
 *   35분 · 1인분
 *
 * 시안에서 고친 것(§6.1):
 *  - `#CKD3` `#저염식` 을 카드마다 붙이던 것을 지웠다(§1.2). 그 자리에 영양 수치 한 개와
 *    내 남은 참고량 대비를 넣는다 — 이게 이 앱의 존재 이유다.
 *  - `★4.0 (27)` 이 데이터 없이 그려져 있었다. 리뷰가 0건이면 별점 줄을 **안 그린다**.
 *  - 태그가 `#저염ㅅ` 로 잘렸다. 최대 2개 + 넘치면 `+N`(recipeCardFormat).
 *  - 2열 그리드를 1열로 바꿨다. 위 다섯 줄은 반쪽 폭(약 170pt)에 들어가지 않는다 —
 *    시안이 태그를 자른 진짜 원인이 그 폭이었다.
 *
 * 색: 강조는 `tokens.color.primary` 하나, 나머지는 그레이스케일. `safe*`(틸)는 "안전"
 * 의미색이라 쓰지 않는다(§6.4 / §1.1).
 */
import { memo, useMemo } from "react"
import { Image } from "expo-image"
import { Text, View, XStack, YStack } from "tamagui"
import { useTranslation } from "react-i18next"

import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"

import type { NutrientKey, RecipeCard } from "../../types/recipeListV2"
import {
  formatNutrientAmount,
  groupThousands,
  resolveCardHeadline,
  resolveCardMeta,
  resolveCardRating,
  resolveCardTags,
} from "./recipeCardFormat"

/** 영양소 라벨은 이미 있는 키를 그대로 쓴다 — 같은 말을 두 벌 두지 않는다. */
const NUTRIENT_LABEL_KEYS = {
  sodium: "curated.sodium",
  potassium: "curated.potassium",
  phosphorus: "curated.phosphorus",
  protein: "curated.protein",
} as const satisfies Record<NutrientKey, string>

interface RecipeListCardProps {
  card: RecipeCard
  onPress: (card: RecipeCard) => void
}

export const RecipeListCard = memo(function RecipeListCard({
  card,
  onPress,
}: RecipeListCardProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  const headline = resolveCardHeadline(card)
  const rating = resolveCardRating(card.rating)
  const meta = resolveCardMeta(card)
  const tags = useMemo(() => resolveCardTags(card.tags), [card.tags])
  const unmatchedCount = card.nutrition?.unmatchedIngredients.length ?? 0

  const headlineText = headline
    ? t("list.headline", {
        label: t(NUTRIENT_LABEL_KEYS[headline.key]),
        amount: formatNutrientAmount(headline.amount, headline.unit),
      })
    : null
  const remainingText =
    headline?.percentOfRemaining != null
      ? t("list.headlineRemaining", { percent: headline.percentOfRemaining })
      : null

  const socialParts: string[] = []
  if (rating) {
    socialParts.push(
      `${t("list.ratingValue", { average: rating.average })} ${t("list.ratingCount", { count: rating.count })}`,
    )
  }
  if (card.saveCount > 0) {
    socialParts.push(
      t("list.saveCount", { count: groupThousands(card.saveCount) }),
    )
  }

  const metaParts: string[] = []
  if (meta.timeMin != null) {
    metaParts.push(t("curated.minutes", { count: meta.timeMin }))
  }
  if (meta.servings != null) {
    metaParts.push(t("curated.servings", { count: meta.servings }))
  }

  return (
    <SurfacePressable
      onPress={() => onPress(card)}
      accessibilityLabel={t("list.cardAccessibility", { name: card.name })}
      baseColor={surface.card}
      style={{
        borderRadius: LAYOUT.card.radius,
        padding: 14,
        gap: 8,
      }}
    >
      {/* 썸네일이 없으면 회색 덩어리를 대신 깔지 않는다 — 없는 사진을 만들어 내지 않고
          그만큼 글자에 자리를 준다. */}
      {card.thumbnailUrl != null && (
        <View
          borderRadius={12}
          overflow="hidden"
          backgroundColor={surface.surface}
          style={{ width: "100%", aspectRatio: 16 / 9 }}
        >
          <Image
            source={{ uri: card.thumbnailUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </View>
      )}

      <XStack alignItems="flex-start" gap={8}>
        <Text
          flex={1}
          fontFamily="$body"
          fontWeight="600"
          fontSize={TYPE.cardTitle.fontSize}
          lineHeight={TYPE.cardTitle.lineHeight}
          letterSpacing={TYPE.cardTitle.letterSpacing}
          color={surface.textStrong}
          numberOfLines={2}
        >
          {card.name}
        </Text>
        {card.authored && (
          <View
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={8}
            backgroundColor={surface.surface}
          >
            <Text
              fontFamily="$body"
              fontSize={11}
              lineHeight={16}
              fontWeight="600"
              color={surface.textMuted}
            >
              {t("list.authored")}
            </Text>
          </View>
        )}
      </XStack>

      {card.summary != null && (
        <Text
          fontFamily="$body"
          fontSize={TYPE.cardSub.fontSize}
          lineHeight={TYPE.cardSub.lineHeight}
          letterSpacing={TYPE.cardSub.letterSpacing}
          color={surface.textMuted}
          numberOfLines={1}
        >
          {card.summary}
        </Text>
      )}

      {/* 계약 §1.1: provenance 를 신뢰할 수 없으면 headlineText 가 null 이고 이 줄이 사라진다. */}
      {headlineText != null && (
        <YStack gap={2}>
          <Text
            fontFamily="$body"
            fontSize={13.5}
            lineHeight={19}
            fontWeight="600"
            letterSpacing={-0.27}
            color={tokens.color.primary.val}
            numberOfLines={1}
          >
            {remainingText != null
              ? `${headlineText} · ${remainingText}`
              : headlineText}
          </Text>
          {unmatchedCount > 0 && (
            <Text
              fontFamily="$body"
              fontSize={11.5}
              lineHeight={16}
              color={surface.textWeak}
              numberOfLines={1}
            >
              {t("list.unmatchedNotice")}
            </Text>
          )}
        </YStack>
      )}

      {socialParts.length > 0 && (
        <Text
          fontFamily="$body"
          fontSize={TYPE.caption.fontSize}
          lineHeight={TYPE.caption.lineHeight}
          letterSpacing={TYPE.caption.letterSpacing}
          color={surface.text}
          numberOfLines={1}
        >
          {socialParts.join(" · ")}
        </Text>
      )}

      {(metaParts.length > 0 || tags.shown.length > 0 || tags.overflow > 0) && (
        <XStack alignItems="center" gap={8}>
          {metaParts.length > 0 && (
            <Text
              fontFamily="$body"
              fontSize={TYPE.cardSub.fontSize}
              lineHeight={TYPE.cardSub.lineHeight}
              letterSpacing={TYPE.cardSub.letterSpacing}
              color={surface.textWeak}
              numberOfLines={1}
            >
              {metaParts.join(" · ")}
            </Text>
          )}
          {tags.shown.map((tag) => (
            <View
              key={tag}
              paddingHorizontal={8}
              paddingVertical={3}
              borderRadius={8}
              backgroundColor={surface.surface}
              flexShrink={0}
            >
              <Text
                fontFamily="$body"
                fontSize={11.5}
                lineHeight={16}
                color={surface.textMuted}
                numberOfLines={1}
              >
                {tag}
              </Text>
            </View>
          ))}
          {tags.overflow > 0 && (
            <Text
              fontFamily="$body"
              fontSize={11.5}
              lineHeight={16}
              color={surface.textWeak}
              flexShrink={0}
            >
              {t("list.tagOverflow", { count: tags.overflow })}
            </Text>
          )}
        </XStack>
      )}
    </SurfacePressable>
  )
})
