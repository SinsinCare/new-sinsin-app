/**
 * 제목 · 한 줄 소개 · 메타 · 태그. 계약 §6.2 의 위쪽 절반이다.
 *
 * 메타는 **아이콘 없이 텍스트만** 이다("한식 · 35분 · 1인분 · 보통"). 시안은 항목마다
 * 아이콘을 붙였는데, 네 개가 나란히 서면 각각이 강조가 되어 제목보다 시끄러워진다(§6.4).
 *
 * 태그는 서버가 §1.2 로 걸러 보내지만 여기서 한 번 더 막는다(`filterClinicalTags`).
 * 검수 전 카탈로그에 "저염" 딱지가 붙는 사고는 서버 한 곳의 실수로 전 화면에 퍼진다.
 */
import { Text, XStack, YStack } from "tamagui"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import type { RecipeAuthor, RecipeLocaleInfo } from "../../types/recipeV2"
import { filterClinicalTags } from "./recipeDetailModel"

const DIFFICULTY_KEYS = {
  easy: "curated.difficulty.easy",
  medium: "curated.difficulty.medium",
  hard: "curated.difficulty.hard",
  쉬움: "curated.difficulty.easy",
  보통: "curated.difficulty.medium",
  어려움: "curated.difficulty.hard",
} as const

const MAX_VISIBLE_TAGS = 4

export interface RecipeTitleBlockProps {
  name: string
  summary: string | null
  description: string | null
  category: string
  timeMin: number | null
  servings: number | null
  difficulty: string | null
  tags: string[]
  author: RecipeAuthor
  saveCount: number
  authored: boolean
  localeInfo: RecipeLocaleInfo
}

export function RecipeTitleBlock({
  name,
  summary,
  description,
  category,
  timeMin,
  servings,
  difficulty,
  tags,
  author,
  saveCount,
  authored,
  localeInfo,
}: RecipeTitleBlockProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  const difficultyKey =
    difficulty == null
      ? null
      : (DIFFICULTY_KEYS[
          difficulty.toLowerCase() as keyof typeof DIFFICULTY_KEYS
        ] ??
        DIFFICULTY_KEYS[difficulty as keyof typeof DIFFICULTY_KEYS] ??
        null)
  const difficultyLabel = difficultyKey ? t(difficultyKey) : difficulty

  const meta = [
    category.length > 0 ? category : null,
    timeMin != null && timeMin > 0
      ? t("curated.minutes", { count: timeMin })
      : null,
    servings != null && servings > 0
      ? t("curated.servings", { count: servings })
      : null,
    difficultyLabel,
  ].filter((item): item is string => item != null && item.length > 0)

  const visibleTags = filterClinicalTags(tags)

  return (
    <YStack gap={10}>
      <YStack gap={6}>
        <Text
          fontSize={24}
          lineHeight={33}
          letterSpacing={-0.5}
          fontFamily="$body"
          fontWeight="700"
          color={surface.textStrong}
        >
          {name}
        </Text>
        {/* 한 줄 소개가 없으면 자리채우기 문구를 만들지 않는다(계약 §3.1). */}
        {summary && (
          <Text
            {...TYPE.value}
            fontFamily="$body"
            color={surface.textMuted}
            lineHeight={22}
          >
            {summary}
          </Text>
        )}
      </YStack>

      {meta.length > 0 && (
        <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
          {meta.join(" · ")}
        </Text>
      )}

      <XStack gap={8} alignItems="center" flexWrap="wrap">
        <Text {...TYPE.caption} fontFamily="$body" color={surface.textWeak}>
          {author.nickName}
        </Text>
        <Text {...TYPE.caption} fontFamily="$body" color={surface.textWeak}>
          {t("detail.saveCount", { count: saveCount })}
        </Text>
        {authored && (
          <Text {...TYPE.caption} fontFamily="$body" color={surface.brand}>
            {t("detail.authored")}
          </Text>
        )}
      </XStack>

      {visibleTags.length > 0 && (
        <XStack gap={6} flexWrap="wrap">
          {visibleTags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
            <Text
              key={tag}
              {...TYPE.caption}
              fontFamily="$body"
              color={surface.textWeak}
            >
              {`#${tag.replace(/^#+/u, "")}`}
            </Text>
          ))}
          {visibleTags.length > MAX_VISIBLE_TAGS && (
            <Text {...TYPE.caption} fontFamily="$body" color={surface.textWeak}>
              {`+${visibleTags.length - MAX_VISIBLE_TAGS}`}
            </Text>
          )}
        </XStack>
      )}

      {description && (
        <Text
          {...TYPE.value}
          fontFamily="$body"
          color={surface.text}
          lineHeight={23}
          paddingTop={4}
        >
          {description}
        </Text>
      )}

      {!localeInfo.fullyTranslated && (
        <YStack
          gap={4}
          padding={14}
          borderRadius={LAYOUT.card.radius}
          backgroundColor={surface.surface}
        >
          <Text
            {...TYPE.caption}
            fontFamily="$body"
            fontWeight="600"
            color={surface.textStrong}
          >
            {t("detail.localeGapTitle")}
          </Text>
          <Text
            {...TYPE.caption}
            fontFamily="$body"
            color={surface.textMuted}
            lineHeight={20}
          >
            {t("detail.localeGapBody")}
          </Text>
        </YStack>
      )}
    </YStack>
  )
}
