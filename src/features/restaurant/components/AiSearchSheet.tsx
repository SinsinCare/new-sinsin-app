import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * AI 검색 시트. 자연어("칼륨 낮고 국물 없는 한식") → 구조화 필터.
 *
 * ## AI 가 아니었으면 AI 라고 말하지 않는다
 *
 * 서버는 `GEMINI_API_KEY` 가 없거나 모델이 죽어도 200 을 주고 키워드 매칭 결과에
 * `fallback: true` 를 붙인다. 그때 이 화면은 **가장 먼저** "AI 없이 검색어로 찾았어요" 를
 * 말한다. 조용히 일반 검색을 해 놓고 AI 가 한 것처럼 보이게 하면, 다음에 사용자는
 * 훨씬 더 어려운 질문을 AI 에게 맡긴다 — 그건 신뢰를 잘못된 곳에 쌓는 것이다.
 *
 * ## 못 옮긴 말을 감추지 않는다
 *
 * `unmatchedTerms` 는 필터로 변환하지 못한 표현이다. 감추면 사용자는 자기가 말한 조건이
 * 전부 반영됐다고 믿고 결과를 오해한다. 신장 환자에게 그 오해는 "국물 없는" 을 뺀 목록을
 * 안전한 목록으로 읽게 만든다.
 *
 * ## 결과를 자동으로 적용하지 않는다
 *
 * 모델이 만든 필터는 `이 조건으로 보기` 를 눌러야 반영된다. 사용자가 애써 고른 필터를
 * 말없이 덮어쓰면 그건 앱이 멋대로 움직인 것이다.
 *
 * ## 열릴 때 지난 결과를 지운다 (프로토타입 버그)
 *
 * Modal 은 닫혀도 마운트가 남는다. 되맞추지 않으면 두 번째로 열었을 때 지난 질의의
 * 근거 문장이 새 입력창 아래에 그대로 붙어 있다.
 */

import { useEffect, useState } from "react"
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  radius,
  spacing,
  typography,
  useV2Theme,
  V2Badge,
  V2BottomSheet,
  V2Button,
  V2ErrorState,
  V2LoadingState,
  V2SearchField,
} from "@/src/design-system-v2"

import { SHEET_GUTTER } from "../layout"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import {
  cuisineTypeLabelKey,
  nutritionTagLabelKey,
  sortLabelKey,
} from "../data/filterCatalog"
import { labelKeyFor } from "../data/regionCatalog"
import { useAiSearch } from "../hooks/useAiSearch"
import type { AiSearchFilters, LatLng, MapBounds } from "../types"

export interface AiSearchSheetProps {
  visible: boolean
  onClose: () => void
  /** 지금 보고 있는 지도 범위. 있으면 서버가 "이 근처" 를 해석에 쓴다. */
  viewport?: MapBounds | null
  userLocation?: LatLng | null
  /** `이 조건으로 보기`. 화면이 필터를 적용하고 재조회한다. */
  onApply: (filters: AiSearchFilters) => void
}

/** 옵션 영역이 차지할 수 있는 최대 높이 비율. 키보드가 올라와도 CTA 가 남게 낮게 잡는다. */
const MAX_BODY_RATIO = 0.42

/** 응답의 필터를 사람이 읽는 라벨 키 목록으로 편다. 순서는 필터 시트의 축 순서와 같다. */
function filterLabelKeys(filters: AiSearchFilters): string[] {
  const keys: string[] = []
  for (const group of filters.regionGroups) {
    const key = labelKeyFor(group)
    // 카탈로그에 없는 지역 키는 버린다 — 키 문자열을 그대로 보여 주면 설명이 안 된다.
    if (key) keys.push(key)
  }
  for (const cuisine of filters.cuisineTypes) {
    keys.push(cuisineTypeLabelKey(cuisine))
  }
  for (const tag of filters.nutritionTags) {
    keys.push(nutritionTagLabelKey(tag))
  }
  if (filters.sort) keys.push(sortLabelKey(filters.sort))
  if (filters.openNow) keys.push("restaurant.businessStatus.openNow")
  return keys
}

export function AiSearchSheet({
  visible,
  onClose,
  viewport = null,
  userLocation = null,
  onApply,
}: AiSearchSheetProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const { height: windowHeight } = useWindowDimensions()

  const [draft, setDraft] = useState("")
  const ai = useAiSearch({
    query: draft,
    enabled: visible,
    viewport,
    userLocation,
  })

  // The hook owns request cleanup. Reopening starts with a fresh input.
  useEffect(() => {
    if (!visible) return
    setDraft("")
  }, [visible])

  const close = () => {
    ai.reset()
    onClose()
  }

  const trimmed = draft.trim()
  const canSubmit = trimmed.length > 0 && !ai.isPending

  const submit = () => {
    if (!canSubmit) return
    void ai.search()
  }

  const result = ai.result
  const appliedKeys = result ? filterLabelKeys(result.filters) : []
  /* 음식 이름은 i18n 키가 아니라 사용자가 친 말 그대로다(서버가 질의의 부분문자열만
     통과시킨다). 그래서 키 목록과 섞지 않고 맨 앞에 따로 그린다 — 결과를 가장 크게
     좁히는 조건이라 사용자가 먼저 봐야 한다. */
  const dishTerm = result?.filters.q?.trim() ?? ""
  const appliedCount = appliedKeys.length + (dishTerm === "" ? 0 : 1)

  return (
    <V2BottomSheet
      surface="restaurant_ai_search"
      visible={visible}
      onClose={close}
      title={t("restaurant.aiSearch.title")}
    >
      <View style={styles.inputRow}>
        <V2SearchField
          value={draft}
          onChangeText={setDraft}
          placeholder={t("restaurant.aiSearch.placeholder")}
          returnKeyType="search"
          onSubmitEditing={submit}
          style={styles.input}
        />
        <V2Button
          size="l"
          color="brand"
          variant="fill"
          disabled={!canSubmit}
          onPress={submit}
        >
          {t("restaurant.aiSearch.submit")}
        </V2Button>
      </View>

      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        /* `flexShrink: 1` 이 있어야 키보드가 떠서 시트가 최대 높이에 닿았을 때
           이 영역이 먼저 줄어든다. 없으면 시트가 잘리면서 아래 CTA 가 사라진다. */
        style={{
          maxHeight: Math.round(windowHeight * MAX_BODY_RATIO),
          flexShrink: 1,
        }}
        contentContainerStyle={styles.body}
      >
        {ai.isPending ? (
          <V2LoadingState message={t("restaurant.aiSearch.thinking")} />
        ) : null}

        {!ai.isPending && ai.isError ? (
          <V2ErrorState
            surface="restaurant_ai_search"
            title={t("restaurant.aiSearch.errorTitle")}
            description={t("restaurant.aiSearch.errorBody")}
            onRetry={submit}
            retryLabel={t("restaurant.aiSearch.retry")}
          />
        ) : null}

        {!ai.isPending && result ? (
          <View style={styles.result}>
            {/* 폴백은 근거 문장보다 위에 온다 — 무엇으로 찾았는지가 왜 찾았는지보다 먼저다. */}
            {result.fallback ? (
              <View
                style={[
                  styles.fallback,
                  { backgroundColor: colors.fill.background },
                ]}
              >
                <Text
                  style={[
                    typography.subtext.medium,
                    { color: colors.label.neutral },
                  ]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("restaurant.aiSearch.fallback")}
                </Text>
              </View>
            ) : null}

            <View style={styles.block}>
              <Text
                style={[typography.label.small, { color: colors.label.normal }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("restaurant.aiSearch.rationaleTitle")}
              </Text>
              <Text
                style={[
                  typography.body.xSmall,
                  { color: colors.label.neutral },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {result.rationale}
              </Text>
            </View>

            {appliedCount > 0 ? (
              <View style={styles.block}>
                <Text
                  style={[
                    typography.label.small,
                    { color: colors.label.normal },
                  ]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("restaurant.aiSearch.appliedTitle")}
                </Text>
                <View style={styles.badges}>
                  {dishTerm === "" ? null : (
                    <V2Badge size="m" color="brand" variant="weak">
                      {dishTerm}
                    </V2Badge>
                  )}
                  {appliedKeys.map((key) => (
                    <V2Badge key={key} size="m" color="brand" variant="weak">
                      {t(dynamicKey(key))}
                    </V2Badge>
                  ))}
                </View>
              </View>
            ) : (
              <Text
                style={[
                  typography.subtext.medium,
                  { color: colors.label.neutral },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("restaurant.aiSearch.noFilters")}
              </Text>
            )}

            {result.unmatchedTerms.length > 0 ? (
              <Text
                style={[
                  typography.subtext.medium,
                  { color: colors.accentForeground.orange },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("restaurant.aiSearch.unmatched", {
                  terms: result.unmatchedTerms.join(", "),
                })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {result && appliedCount > 0 ? (
        <View style={styles.footer}>
          <V2Button
            size="xl"
            color="brand"
            variant="fill"
            fullWidth
            onPress={() => {
              // 이벤트를 여기서 쏘는 이유: `fallback`·`unmatchedTerms` 는 이 시트만 안다.
              // 화면으로 올리려면 `onApply` 계약에 결과 메타를 얹어야 하는데, 그러면
              // 필터를 받는 쪽이 AI 의 내부 사정까지 알게 된다.
              //
              // 질의 문자열은 **일부러 싣지 않는다** — "칼륨 낮은 국물" 같은 검색어는
              // 사용자의 병기를 드러낸다. 결과의 모양만 본다.
              trackAnalyticsEvent("restaurant_ai_search", {
                fallback: result.fallback,
                filter_count: appliedCount,
                unmatched_count: result.unmatchedTerms.length,
              })
              onApply(result.filters)
              close()
            }}
          >
            {t("restaurant.aiSearch.apply")}
          </V2Button>
        </View>
      ) : null}
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    marginTop: spacing[20],
    paddingHorizontal: SHEET_GUTTER,
  },
  input: { flex: 1 },
  body: {
    paddingTop: spacing[16],
    paddingHorizontal: SHEET_GUTTER,
  },
  result: { gap: spacing[16] },
  block: { gap: spacing[6] },
  fallback: {
    borderRadius: radius.md,
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[12],
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[6],
  },
  footer: {
    marginTop: spacing[20],
    paddingHorizontal: SHEET_GUTTER,
  },
})
