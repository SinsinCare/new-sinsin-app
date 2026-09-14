/**
 * 예상 영양 카드 — 작성자가 자기 레시피의 나트륨·칼륨·인을 처음 보는 자리.
 * 인분 스테퍼 바로 아래에 붙는다(분모와 결과가 떨어져 있으면 "왜 절반이지" 를 모른다).
 *
 * 카드는 키트의 우물 면(`s.surfaceSunken` · `FIELD.radius`)이고 타이포는 `FORM.*`.
 * 막대는 오늘 남은 양 대비 비율, 100% 에서 멈추고 넘친 사실은 숫자가 말한다.
 */

import { useState } from "react"
import { StyleSheet, View, Pressable } from "react-native"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import {
  FIELD,
  FORM,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"
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
  headline: (nutrient: string, amount: string, percent: number) => string
  headlineNoPercent: (nutrient: string, amount: string) => string
  percent: (percent: number) => string
  perServing: string
  noPercent: string
  proteinNoWeight: string
  provenanceBadge: string
  provenanceNote: string
  nutrientName: (key: NutrientHeadline["key"]) => string
  unmatchedTitle: (n: number) => string
  unmatchedItem: (name: string) => string
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

const BAR_HEIGHT = S[2] - S[1]

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
  const groups = groupUnmatched(data?.perIngredient ?? [])
  const unmatchedCount =
    groups.unknownAmount.length + groups.notInCatalog.length

  return (
    <View style={[styles.card, { backgroundColor: s.surfaceSunken }]}>
      <View style={styles.headerRow}>
        <V2Text style={styles.title} color={s.textStrong}>
          {copy.title}
        </V2Text>
        {showNumbers ? (
          <Pressable
            onPress={() => setNoteOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={copy.provenanceBadge}
            accessibilityState={{ expanded: noteOpen }}
            hitSlop={S[2]}
            style={({ pressed }) => [
              styles.badge,
              { backgroundColor: pressed ? s.surfacePressed : s.canvas },
            ]}
          >
            <V2Text style={styles.hint} color={s.text}>
              {copy.provenanceBadge}
            </V2Text>
          </Pressable>
        ) : null}
      </View>
      {noteOpen ? (
        <V2Text style={styles.hint} color={s.text}>
          {copy.provenanceNote}
        </V2Text>
      ) : null}
      {isEmpty ? (
        <V2Text style={styles.hint} color={s.text}>
          {copy.empty}
        </V2Text>
      ) : error !== null && error !== undefined && !showNumbers ? (
        <View style={styles.errorRow}>
          <V2Text style={[styles.hint, styles.shrink]} color={s.text}>
            {copy.error}
          </V2Text>
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={copy.retry}
            hitSlop={S[2]}
          >
            <V2Text style={styles.option} color={s.brand}>
              {copy.retry}
            </V2Text>
          </Pressable>
        </View>
      ) : !showNumbers ? (
        <V2Text style={styles.hint} color={s.text}>
          {copy.calculating}
        </V2Text>
      ) : (
        <View style={[styles.body, isStale && styles.stale]}>
          {headline ? (
            <V2Text style={styles.headline} color={s.textStrong}>
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
            </V2Text>
          ) : null}
          <V2Text style={styles.hint} color={s.text}>
            {copy.perServing}
          </V2Text>
          {data?.nutrientBreakdown.map((item) => (
            <View key={item.key} style={styles.nutrientRow}>
              <V2Text style={styles.nutrientName} color={s.text}>
                {copy.nutrientName(item.key)}
              </V2Text>
              <V2Text style={styles.nutrientAmount} color={s.textStrong}>
                {formatNutrientAmount(item)}
              </V2Text>
              <View style={styles.barArea}>
                <View style={[styles.barTrack, { backgroundColor: s.canvas }]}>
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
                <V2Text style={styles.hint} color={s.text}>
                  {item.percentOfRemaining !== null
                    ? copy.percent(item.percentOfRemaining)
                    : item.key === "protein"
                      ? copy.proteinNoWeight
                      : copy.noPercent}
                </V2Text>
              </View>
            </View>
          ))}
          {isStale ? (
            <V2Text style={styles.hint} color={s.text}>
              {copy.calculating}
            </V2Text>
          ) : null}
        </View>
      )}
      {unmatchedCount > 0 ? (
        <View style={[styles.unmatched, { borderTopColor: s.hairline }]}>
          <V2Text style={styles.option} color={s.textStrong}>
            {copy.unmatchedTitle(unmatchedCount)}
          </V2Text>
          {groups.unknownAmount.map((name) => (
            <V2Text key={name} style={styles.hint} color={s.text}>
              {copy.unmatchedItem(name)}
            </V2Text>
          ))}
          {groups.notInCatalog.map((name) => (
            <V2Text key={name} style={styles.hint} color={s.text}>
              {copy.unmatchedNotFound(name)}
            </V2Text>
          ))}
          {groups.unknownAmount.length > 0 ? (
            <V2Text style={styles.hint} color={s.text}>
              {copy.unmatchedHelp}
            </V2Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: FIELD.radius,
    padding: FIELD.paddingX,
    gap: S[3],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[2],
  },
  title: FORM.label,
  badge: {
    minHeight: FORM.choiceHeight - S[4],
    borderRadius: FORM.choiceRadius,
    paddingHorizontal: S[2],
    justifyContent: "center",
  },
  hint: FORM.hint,
  option: FORM.option,
  shrink: { flexShrink: 1 },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[3],
  },
  body: { gap: S[2] },
  stale: { opacity: 0.45 },
  headline: FORM.body,
  nutrientRow: { flexDirection: "row", alignItems: "center", gap: S[2] },
  nutrientName: { ...FORM.hint, width: FORM.choiceHeight },
  nutrientAmount: { ...FORM.option, width: FIELD.height - S[6] },
  barArea: { flex: 1, gap: S[1] },
  barTrack: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: "hidden",
  },
  barFill: { height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2 },
  unmatched: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: S[3],
    gap: S[1],
  },
})
