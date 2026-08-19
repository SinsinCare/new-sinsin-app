/**
 * 필터 시트 — **고르는 곳일 뿐이다.** 무엇이 적용 중인지는 시트가 아니라 목록 상단의
 * 칩이 말한다(계약 §6.1).
 *
 * 시안과 다른 점:
 *  - 그룹이 2개다(음식 종류 · 영양 기준). 시안의 "신장질환 병기(CKD 1~5기)" 그룹은
 *    넣지 않았다 — 검수 전 카탈로그에서 "CKD 3기용" 을 골라 거르게 하면 그 결과 목록
 *    자체가 임상 주장이 된다(§1.1). "저염" 은 영양소 표기라 질의로 성립하지만
 *    "CKD 3기" 는 적합성 판단이다. 계약 확인이 필요해 보고에 적었다.
 *  - 시트를 닫아도 무엇이 걸렸는지 보인다(상단 칩) — 시안은 시트가 유일한 표시였다.
 *  - 초안(temp)과 적용을 분리했다. 시트에서 만지는 동안 목록이 흔들리지 않고,
 *    닫기로 나가면 원래대로 돌아간다(되돌리기 가능, §6.4).
 */
import { useEffect, useState } from "react"
import { Pressable, useWindowDimensions } from "react-native"
import { V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

import { V2BottomSheet, V2SheetScrollView } from "@/src/design-system-v2"
import { Icon } from "@/src/shared/components/Icon"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"

import {
  clearRecipeFilters,
  countRecipeFilters,
  EMPTY_RECIPE_FILTERS,
  RECIPE_FILTER_GROUP_VIEWS,
  type RecipeFilterSelection,
  toggleRecipeFilter,
} from "./recipeListFilterModel"

/**
 * 그룹 2개 + 칩 12개 짜리 시트.
 *
 * **고정 스냅과 `disableDrag` 를 함께 버렸다.** 그 둘은 Tamagui 시트의 함정을 피하려던
 * 대응이었다 — 프레임이 **가장 큰 스냅** 높이로 눕는 탓에, 스냅이 둘이면 자식이 큰 상자를
 * 기준으로 배치되고 `적용하기` CTA 가 화면 밖으로 밀려났다(2026-08-04 QA:
 * "선택해도 적용이 안 된다"). 그래서 스냅을 하나로 줄이고 드래그를 막아 두었다.
 *
 * `V2BottomSheet` 는 콘텐츠 높이로 자라므로 그 함정 자체가 없다. 스냅 상수도, 드래그를
 * 막을 이유도 사라졌다 — 오히려 아래로 쓸어 닫기가 돌아온다.
 */

interface RecipeFilterSheetProps {
  open: boolean
  onClose: () => void
  selection: RecipeFilterSelection
  onApply: (selection: RecipeFilterSelection) => void
}

export function RecipeFilterSheet({
  open,
  onClose,
  selection,
  onApply,
}: RecipeFilterSheetProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const { height: windowHeight } = useWindowDimensions()
  const [draft, setDraft] = useState<RecipeFilterSelection>(
    selection ?? EMPTY_RECIPE_FILTERS,
  )

  useEffect(() => {
    if (open) setDraft(selection)
  }, [open, selection])

  const draftCount = countRecipeFilters(draft)

  return (
    <V2BottomSheet surface="recipe_filter" visible={open} onClose={onClose}>
      <V2VStack style={{ backgroundColor: surface.canvas, paddingTop: 4 }}>
        <V2HStack paddingHorizontal={LAYOUT.screenX} align="center" justify="space-between" style={{ paddingTop: 4, paddingBottom: 14 }}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Icon name="x" size={22} color={surface.textStrong} />
          </Pressable>
          <V2Text color={surface.textStrong} lineBreakStrategyIOS="hangul-word" style={{ fontSize: 16, lineHeight: 22, fontWeight: "700" }}>
            {t("filter.title")}
          </V2Text>
          {/* 되돌리는 길을 고르는 화면 안에 둔다 — 시안에는 해제 수단이 없었다. */}
          <Pressable
            onPress={() => setDraft(clearRecipeFilters())}
            disabled={draftCount === 0}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("list.filterClearAll")}
            accessibilityState={{ disabled: draftCount === 0 }}
            style={({ pressed }) => ({
              opacity: draftCount === 0 ? 0.35 : pressed ? 0.7 : 1,
            })}
          >
            <V2Text color={surface.textMuted} lineBreakStrategyIOS="hangul-word" style={{ fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
              {t("list.filterClearAll")}
            </V2Text>
          </Pressable>
        </V2HStack>

        <V2SheetScrollView
          /* 칩이 늘어도 시트가 화면을 다 먹지 않게 하는 상한. */
          style={{ maxHeight: Math.round(windowHeight * 0.55) }}
          contentContainerStyle={{
            paddingHorizontal: LAYOUT.screenX,
            gap: 22,
            paddingBottom: 12,
          }}
        >
          {RECIPE_FILTER_GROUP_VIEWS.map((group) => (
            <V2VStack key={group.key} gap={10}>
              <V2Text color={surface.textStrong} lineBreakStrategyIOS="hangul-word" style={{ fontSize: 14, lineHeight: 20, fontWeight: "700" }}>
                {t(group.titleKey)}
              </V2Text>
              <V2HStack wrap="wrap" gap={8}>
                {group.options.map((option) => {
                  const isSelected =
                    draft[group.key]?.includes(option.key) ?? false
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() =>
                        setDraft((prev) =>
                          toggleRecipeFilter(prev, group.key, option.key),
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={t(option.labelKey)}
                      accessibilityState={{ selected: isSelected }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    >
                      <V2HStack align="center" paddingHorizontal={14} style={{ height: LAYOUT.chip.height, borderRadius: LAYOUT.chip.radius, backgroundColor: 
                          isSelected ? surface.surfaceBrand : surface.surface
                         }}>
                        <V2Text color={
                            isSelected
                              ? tokens.color.primary.val
                              : surface.textMuted
                          } lineBreakStrategyIOS="hangul-word" style={{ fontSize: 13.5, lineHeight: 19, fontWeight: isSelected ? "700" : "500" }}>
                          {t(option.labelKey)}
                        </V2Text>
                      </V2HStack>
                    </Pressable>
                  )
                })}
              </V2HStack>
            </V2VStack>
          ))}
        </V2SheetScrollView>

        <V2VStack paddingHorizontal={LAYOUT.screenX} style={{ paddingTop: 8 }}>
          <Pressable
            onPress={() => {
              onApply(draft)
              onClose()
            }}
            accessibilityRole="button"
            accessibilityLabel={t("action.apply")}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <V2HStack align="center" justify="center" gap={8} style={{ height: LAYOUT.cta.height, borderRadius: LAYOUT.cta.radius, backgroundColor: tokens.color.primary.val }}>
              <V2Text color="#FFFFFF" lineBreakStrategyIOS="hangul-word" style={{ fontSize: 16, lineHeight: 22, fontWeight: "700" }}>
                {t("action.apply")}
              </V2Text>
              {/* 누르기 전에 몇 개가 걸리는지 보인다(§6.4). */}
              {draftCount > 0 && (
                <V2Text color="#FFFFFFCC" lineBreakStrategyIOS="hangul-word" style={{ fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
                  {t("list.filterApplied", { count: draftCount })}
                </V2Text>
              )}
            </V2HStack>
          </Pressable>
        </V2VStack>
      </V2VStack>
    </V2BottomSheet>
  )
}
