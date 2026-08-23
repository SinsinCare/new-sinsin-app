/**
 * 작성 중 영양 카드 — **이 화면의 존재 이유**다.
 *
 * 시안에는 영양이 어디에도 없었다(계약 §6.1 마지막 줄). 작성자가 재료를 적는 동안
 * 자기 레시피의 1인분 나트륨·칼륨·인·단백질을 처음으로 알게 되는 자리다.
 *
 * ## 무엇을 말하고 무엇을 말하지 않는가 (계약 §1.1 / §1.3)
 * - 숫자와 비율만 말한다. "안전", "먹어도 괜찮다", "신장에 좋다" 를 쓰지 않는다.
 * - `provenance` 배지를 항상 붙이고, **없으면 수치를 아예 그리지 않는다.**
 * - 넘친 비율(예: 140%)을 빨강으로 칠하지 않는다. 색으로 경고하면 그건 임상 판정이
 *   되고, 검수 전 카탈로그가 그 딱지를 붙일 수 없다. 막대는 꽉 찬 채로 두고 숫자가 말한다.
 * - 단백질 한도를 못 만들면(체중 기록 없음) **그 줄만** 안내로 바꾼다.
 *
 * ## 옛 숫자를 새 재료 옆에 두지 않는다
 * 디바운스 400ms + 왕복 동안 이전 결과가 그대로 보이면 사용자는 방금 고친 재료가
 * 반영된 값으로 읽는다. `isStale` 이면 수치를 흐리게 하고 "계산하는 중" 을 붙인다.
 */

import { useState } from "react"
import { StyleSheet, View, Pressable } from "react-native"
import { Text } from "@/src/shared/components/AppText"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import type {
  NutrientHeadline,
  NutritionPreviewResponse,
} from "@/src/features/recipe/types/recipeWrite"
import {
  barRatio,
  canRenderNutrition,
  formatNutrientAmount,
  pickHeadlineNutrient,
  groupUnmatched,
} from "./nutritionPreviewView"

export interface NutritionPreviewCopy {
  title: string
  empty: string
  calculating: string
  error: string
  retry: string
  /** 이미 채워진 한 줄. `{{nutrient}} {{amount}} · 오늘 남은 양의 {{percent}}%`. */
  headline: (nutrient: string, amount: string, percent: number) => string
  headlineNoPercent: (nutrient: string, amount: string) => string
  percent: (percent: number) => string
  /** "1인분 기준". 네 줄짜리 표의 분모를 말한다 — 인분 스테퍼가 바로 위에 있다. */
  perServing: string
  noPercent: string
  proteinNoWeight: string
  provenanceBadge: string
  provenanceNote: string
  nutrientName: (key: NutrientHeadline["key"]) => string
  unmatchedTitle: (n: number) => string
  unmatchedItem: (name: string) => string
  /** 무게는 알지만 그 이름을 못 찾은 경우. `unmatchedItem` 과 **다른 사실**이다. */
  unmatchedNotFound: (name: string) => string
  unmatchedHelp: string
}

interface NutritionPreviewCardProps {
  data: NutritionPreviewResponse | undefined
  isEmpty: boolean
  isStale: boolean
  error: unknown
  onRetry: () => void
  copy: NutritionPreviewCopy
}

export function NutritionPreviewCard({
  data,
  isEmpty,
  isStale,
  error,
  onRetry,
  copy,
}: NutritionPreviewCardProps) {
  const s = useSurface()
  const [noteOpen, setNoteOpen] = useState(false)

  const nutrition = data?.nutrition
  const showNumbers = !isEmpty && canRenderNutrition(nutrition)
  const headline = data ? pickHeadlineNutrient(data.nutrientBreakdown) : null
  /**
   * **이름 목록(`unmatchedIngredients`)이 아니라 `perIngredient[].reason` 으로 나눈다.**
   * 이름만으로는 이유를 알 수 없어서, 이 카드는 모든 미매칭 재료에 "무게를 몰라
   * 빠졌어요" 를 붙이고 있었다 — `흰쌀밥 210g` 처럼 **무게를 아는데** 이름을 못 찾은
   * 경우에도 그렇게 말했다. 그러면 사용자는 무게를 다시 적으며 헛수고한다.
   */
  const groups = groupUnmatched(data?.perIngredient ?? [])
  const unmatchedCount =
    groups.unknownAmount.length + groups.notInCatalog.length

  return (
    <View
      style={[styles.card, { backgroundColor: s.card, borderColor: s.border }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: s.textStrong }]}>
          {copy.title}
        </Text>
        {showNumbers ? (
          <Pressable
            onPress={() => setNoteOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={copy.provenanceBadge}
            accessibilityState={{ expanded: noteOpen }}
            hitSlop={6}
            style={({ pressed }) => [
              styles.badge,
              { backgroundColor: s.surface },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.badgeText, { color: s.textMuted }]}>
              {copy.provenanceBadge}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {noteOpen ? (
        <Text style={[styles.note, { color: s.textMuted }]}>
          {copy.provenanceNote}
        </Text>
      ) : null}

      {isEmpty ? (
        <Text style={[styles.empty, { color: s.textMuted }]}>{copy.empty}</Text>
      ) : error !== null && error !== undefined && !showNumbers ? (
        <View style={styles.errorRow}>
          <Text style={[styles.empty, { color: s.textMuted }]}>
            {copy.error}
          </Text>
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={copy.retry}
            hitSlop={6}
          >
            <Text style={[styles.retry, { color: s.brand }]}>{copy.retry}</Text>
          </Pressable>
        </View>
      ) : !showNumbers ? (
        <Text style={[styles.empty, { color: s.textMuted }]}>
          {copy.calculating}
        </Text>
      ) : (
        <View style={[styles.body, isStale && styles.stale]}>
          {headline ? (
            <Text style={[styles.headline, { color: s.textStrong }]}>
              {headline.percentOfRemaining === null
                ? copy.headlineNoPercent(
                    copy.nutrientName(headline.key),
                    formatNutrientAmount(headline),
                  )
                : copy.headline(
                    copy.nutrientName(headline.key),
                    formatNutrientAmount(headline),
                    headline.percentOfRemaining,
                  )}
            </Text>
          ) : null}

          {/*
            네 줄짜리 표의 기준을 적는다. 바로 위에 인분 스테퍼가 있어서, 인분을 늘리면
            이 숫자들이 줄어든다 — 기준을 적지 않으면 "왜 나트륨이 절반이 됐지" 를
            알 수 없다(계약 §3.5: `nutrition` 은 servings 로 나눈 1인분 기준이다).
          */}
          <Text style={[styles.basis, { color: s.textMuted }]}>
            {copy.perServing}
          </Text>

          {data?.nutrientBreakdown.map((item) => (
            <View key={item.key} style={styles.nutrientRow}>
              <Text style={[styles.nutrientName, { color: s.text }]}>
                {copy.nutrientName(item.key)}
              </Text>
              <Text style={[styles.nutrientAmount, { color: s.textStrong }]}>
                {formatNutrientAmount(item)}
              </Text>
              <View style={styles.barArea}>
                <View style={[styles.barTrack, { backgroundColor: s.surface }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: s.brand,
                        width: `${barRatio(item.percentOfRemaining) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.percent, { color: s.textMuted }]}>
                  {item.percentOfRemaining !== null
                    ? copy.percent(item.percentOfRemaining)
                    : item.key === "protein"
                      ? copy.proteinNoWeight
                      : copy.noPercent}
                </Text>
              </View>
            </View>
          ))}

          {isStale ? (
            <Text style={[styles.calculating, { color: s.textMuted }]}>
              {copy.calculating}
            </Text>
          ) : null}
        </View>
      )}

      {unmatchedCount > 0 ? (
        <View style={[styles.unmatched, { borderTopColor: s.hairline }]}>
          <Text style={[styles.unmatchedTitle, { color: s.textStrong }]}>
            {copy.unmatchedTitle(unmatchedCount)}
          </Text>
          {groups.unknownAmount.map((name) => (
            <Text key={name} style={[styles.unmatchedItem, { color: s.text }]}>
              {copy.unmatchedItem(name)}
            </Text>
          ))}
          {groups.notInCatalog.map((name) => (
            <Text key={name} style={[styles.unmatchedItem, { color: s.text }]}>
              {copy.unmatchedNotFound(name)}
            </Text>
          ))}
          {/* 도움말은 무게로 고칠 수 있는 줄이 있을 때만 — 이름을 못 찾은 재료에
              "150g 처럼 적어 주세요" 는 해도 소용없는 일을 시키는 것이다. */}
          {groups.unknownAmount.length > 0 ? (
            <Text style={[styles.unmatchedHelp, { color: s.textMuted }]}>
              {copy.unmatchedHelp}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.card.radius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { ...TYPE.cardTitle, fontWeight: "700" },
  badge: {
    height: LAYOUT.badge.height,
    borderRadius: LAYOUT.badge.radius,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  badgeText: { ...TYPE.caption, fontSize: 12 },
  note: { ...TYPE.caption, fontSize: 12, lineHeight: 18 },
  empty: { ...TYPE.caption, lineHeight: 19, flexShrink: 1 },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  retry: { ...TYPE.caption, fontWeight: "600" },
  body: { gap: 10 },
  stale: { opacity: 0.45 },
  headline: { ...TYPE.value, fontWeight: "700", lineHeight: 22 },
  basis: { ...TYPE.caption, fontSize: 12 },
  nutrientRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nutrientName: { ...TYPE.caption, width: 44 },
  nutrientAmount: { ...TYPE.caption, fontWeight: "600", width: 64 },
  barArea: { flex: 1, gap: 4 },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  percent: { ...TYPE.caption, fontSize: 11.5 },
  calculating: { ...TYPE.caption, fontSize: 12 },
  unmatched: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 4,
  },
  unmatchedTitle: { ...TYPE.caption, fontWeight: "700" },
  unmatchedItem: { ...TYPE.caption, lineHeight: 19 },
  unmatchedHelp: {
    ...TYPE.caption,
    fontSize: 12,
    lineHeight: 17,
    paddingTop: 2,
  },
})
