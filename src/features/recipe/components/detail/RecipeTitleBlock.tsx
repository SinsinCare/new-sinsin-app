/**
 * 제목 · **한 줄 메타** · 작성자 · 태그. 상세의 첫 화면이다.
 *
 * ─── 네이버 지도 벤치마크 §F-P0 를 그대로 적용한 자리 ──────────────────────
 * 벤치마크 문서의 첫 번째 격차가 "메타를 한 줄로" 였다. 네이버는 `한식 · ★4.63 · 리뷰 1,848`
 * 을 **한 줄**에 넣는데, 우리 레시피 상세는 같은 정보를 **회색 알약 네 개**
 * (`한식` `35분` `1인분` `보통`)로 그렸다. 실측 결과 그 알약 줄은
 *  - 세로를 38pt 먹고(한 줄 텍스트는 20pt),
 *  - 알약 하나하나가 눌리는 것처럼 보이는데 아무 데도 안 가고(§G "없는 버튼을 만들지 않는다"),
 *  - 면이 넷이라 바로 위 제목과 무게를 다툰다.
 * 셋 다 손해라 가운뎃점 한 줄로 바꿨다. 아이콘은 붙이지 않는다 — 넷을 나란히 세우면
 * 각각이 강조가 되어 제목보다 시끄러워진다(계약 §6.4).
 *
 * 별점은 **리뷰가 있을 때만** 이 줄에 붙는다(`hasRatings`). 0건에 `★0.0` 을 만들면
 * 사용자가 그 숫자를 믿고 레시피를 고른다(계약 §6.1).
 *
 * ─── 지운 것과 그 이유 (되돌리기 전에 읽을 것) ──────────────────────────────
 *  - **태그 줄의 중복**: dev 카탈로그 175/175 에서 임상 필터를 통과한 태그는
 *    카테고리와 글자까지 같은 하나뿐이었다(`#한식` vs `한식`). 판단은
 *    `displayTags` 한 곳에 있고 카테고리와 다른 태그가 오면 그대로 보인다.
 *  - **`저장 0`**: 175건 중 174건이 0 이라 모든 화면에 같은 0 이 붙었다(`showsSaveCount`).
 *  - **큐레이션 레시피의 `description`**: 서버가 검수 전 카탈로그의 원문 설명을 막고
 *    고정 문장을 준다. 175건 전부 `"재료와 조리 순서를 확인해 보세요."` 였다.
 *    가장 값비싼 자리에 레시피마다 같은 안내문이 앉는 셈이라 출처로 갈랐다
 *    (`showsDescription`). 작성자가 쓴 설명은 그대로 본문이다.
 */
import { Fragment } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  GUTTER,
  V2Icon,
  spacing,
  radius,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import type {
  RatingSummary,
  RecipeAuthor,
  RecipeLocaleInfo,
} from "../../types/recipeV2"
import {
  displayTags,
  formatAverage,
  hasRatings,
  showsDescription,
  showsSaveCount,
} from "./recipeDetailModel"

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
  rating: RatingSummary
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
  rating,
}: RecipeTitleBlockProps) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()

  const difficultyKey =
    difficulty == null
      ? null
      : (DIFFICULTY_KEYS[
          difficulty.toLowerCase() as keyof typeof DIFFICULTY_KEYS
        ] ??
        DIFFICULTY_KEYS[difficulty as keyof typeof DIFFICULTY_KEYS] ??
        null)
  const difficultyLabel = difficultyKey ? t(difficultyKey) : difficulty

  const facts = [
    category.length > 0 ? category : null,
    timeMin != null && timeMin > 0
      ? t("curated.minutes", { count: timeMin })
      : null,
    servings != null && servings > 0
      ? t("curated.servings", { count: servings })
      : null,
    difficultyLabel,
  ].filter((item): item is string => item != null && item.length > 0)

  const showRating = hasRatings(rating) && rating.average != null
  const visibleTags = displayTags(tags, category)

  // 작성자 줄. 저장 0 과 중복 태그를 뺀 뒤 남는 게 없으면 줄 자체를 만들지 않는다.
  const credits = [
    author.nickName.length > 0 ? author.nickName : null,
    showsSaveCount(saveCount)
      ? t("detail.saveCount", { count: saveCount })
      : null,
  ].filter((item): item is string => item != null)

  return (
    <View style={styles.root}>
      <Text style={[styles.name, { color: colors.label.normal }]}>{name}</Text>

      {/*
       * 한 줄 메타. 별점만 아이콘이 필요해서 텍스트 조각과 노드를 섞어 그린다.
       * 구분자(`·`)는 조각 **사이에만** 들어간다 — 문자열을 join 하면 별 아이콘을
       * 넣을 자리가 없고, 조각마다 `·` 를 붙이면 줄 끝에 점이 남는다.
       */}
      {(facts.length > 0 || showRating) && (
        <View style={styles.metaRow}>
          {facts.map((fact, index) => (
            <Fragment key={fact}>
              {index > 0 && <MetaDot color={colors.label.assistive} />}
              <Text style={[styles.meta, { color: colors.label.alternative }]}>
                {fact}
              </Text>
            </Fragment>
          ))}
          {showRating && rating.average != null && (
            <>
              {facts.length > 0 && <MetaDot color={colors.label.assistive} />}
              <V2Icon
                name="starFilled"
                size={14}
                color={colors.primary.primary}
              />
              <Text style={[styles.metaStrong, { color: colors.label.normal }]}>
                {formatAverage(rating.average)}
              </Text>
              <MetaDot color={colors.label.assistive} />
              <Text style={[styles.meta, { color: colors.label.alternative }]}>
                {t("detail.meta.reviews", { count: rating.count })}
              </Text>
            </>
          )}
        </View>
      )}

      {/* 한 줄 소개가 없으면 자리채우기 문구를 만들지 않는다(계약 §3.1). */}
      {summary != null && summary.length > 0 && (
        <Text style={[styles.summary, { color: colors.label.neutral }]}>
          {summary}
        </Text>
      )}

      {(credits.length > 0 || authored || visibleTags.length > 0) && (
        <View style={styles.creditRow}>
          {credits.map((credit) => (
            <Text
              key={credit}
              style={[styles.credit, { color: colors.label.assistive }]}
            >
              {credit}
            </Text>
          ))}
          {authored && (
            <Text style={[styles.credit, { color: colors.primary.primary }]}>
              {t("detail.authored")}
            </Text>
          )}
          {visibleTags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
            <Text
              key={tag}
              style={[styles.credit, { color: colors.label.assistive }]}
            >
              {`#${tag.replace(/^#+/u, "")}`}
            </Text>
          ))}
        </View>
      )}

      {description != null &&
        description.length > 0 &&
        showsDescription(author) && (
          <Text style={[styles.description, { color: colors.label.neutral }]}>
            {description}
          </Text>
        )}

      {!localeInfo.fullyTranslated && (
        <View
          style={[styles.notice, { backgroundColor: colors.fill.alternative }]}
        >
          <Text style={[styles.noticeTitle, { color: colors.label.normal }]}>
            {t("detail.localeGapTitle")}
          </Text>
          <Text
            style={[styles.noticeBody, { color: colors.label.alternative }]}
          >
            {t("detail.localeGapBody")}
          </Text>
        </View>
      )}
    </View>
  )
}

/** 메타 조각 사이의 가운뎃점. 텍스트라서 줄바꿈 지점이 되어 준다. */
function MetaDot({ color }: { color: string }) {
  return <Text style={[styles.meta, { color }]}>·</Text>
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: GUTTER, gap: spacing[8] },
  name: { ...typography.display.small },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing[4],
  },
  meta: { ...typography.subtext.large },
  metaStrong: { ...typography.label.smallWeak },
  summary: { ...typography.subtext.large },
  creditRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing[8],
  },
  credit: { ...typography.subtext.medium },
  description: { ...typography.body.mediumWeak, paddingTop: spacing[4] },
  notice: {
    gap: spacing[4],
    padding: spacing[12],
    borderRadius: radius.lg,
    marginTop: spacing[4],
  },
  noticeTitle: { ...typography.label.xSmall },
  noticeBody: { ...typography.subtext.medium },
})
