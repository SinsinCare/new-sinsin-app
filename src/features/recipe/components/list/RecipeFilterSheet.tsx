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
import { Pressable } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { useTranslation } from "react-i18next"

import {
  AppBottomSheet,
  AppBottomSheetScrollView,
} from "@/src/shared/components"
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

/** 그룹 2개 + 칩 12개 짜리 시트다. 화면 절반이면 스크롤 없이 다 보인다. */
const FILTER_SNAP_POINTS = [52, 74]

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
  const [draft, setDraft] = useState<RecipeFilterSelection>(
    selection ?? EMPTY_RECIPE_FILTERS,
  )

  useEffect(() => {
    if (open) setDraft(selection)
  }, [open, selection])

  const draftCount = countRecipeFilters(draft)

  return (
    <AppBottomSheet
      visible={open}
      onClose={onClose}
      snapPoints={FILTER_SNAP_POINTS}
      disableDrag
    >
      <YStack flex={1} backgroundColor={surface.canvas} paddingTop={4}>
        <XStack
          paddingHorizontal={LAYOUT.screenX}
          paddingTop={4}
          paddingBottom={14}
          alignItems="center"
          justifyContent="space-between"
        >
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Icon name="x" size={22} color={surface.textStrong} />
          </Pressable>
          <Text
            fontFamily="$body"
            fontSize={16}
            lineHeight={22}
            fontWeight="700"
            color={surface.textStrong}
          >
            {t("filter.title")}
          </Text>
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
            <Text
              fontFamily="$body"
              fontSize={14}
              lineHeight={20}
              fontWeight="600"
              color={surface.textMuted}
            >
              {t("list.filterClearAll")}
            </Text>
          </Pressable>
        </XStack>

        <AppBottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: LAYOUT.screenX,
            gap: 22,
            paddingBottom: 12,
          }}
        >
          {RECIPE_FILTER_GROUP_VIEWS.map((group) => (
            <YStack key={group.key} gap={10}>
              <Text
                fontFamily="$body"
                fontSize={14}
                lineHeight={20}
                fontWeight="700"
                color={surface.textStrong}
              >
                {t(group.titleKey)}
              </Text>
              <XStack flexWrap="wrap" gap={8}>
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
                      <XStack
                        alignItems="center"
                        height={LAYOUT.chip.height}
                        paddingHorizontal={14}
                        borderRadius={LAYOUT.chip.radius}
                        backgroundColor={
                          isSelected ? surface.surfaceBrand : surface.surface
                        }
                      >
                        <Text
                          fontFamily="$body"
                          fontSize={13.5}
                          lineHeight={19}
                          fontWeight={isSelected ? "700" : "500"}
                          color={
                            isSelected
                              ? tokens.color.primary.val
                              : surface.textMuted
                          }
                        >
                          {t(option.labelKey)}
                        </Text>
                      </XStack>
                    </Pressable>
                  )
                })}
              </XStack>
            </YStack>
          ))}
        </AppBottomSheetScrollView>

        <YStack paddingHorizontal={LAYOUT.screenX} paddingTop={8}>
          <Pressable
            onPress={() => {
              onApply(draft)
              onClose()
            }}
            accessibilityRole="button"
            accessibilityLabel={t("action.apply")}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <XStack
              height={LAYOUT.cta.height}
              borderRadius={LAYOUT.cta.radius}
              alignItems="center"
              justifyContent="center"
              gap={8}
              backgroundColor={tokens.color.primary.val}
            >
              <Text
                fontFamily="$body"
                fontSize={16}
                lineHeight={22}
                fontWeight="700"
                color="#FFFFFF"
              >
                {t("action.apply")}
              </Text>
              {/* 누르기 전에 몇 개가 걸리는지 보인다(§6.4). */}
              {draftCount > 0 && (
                <Text
                  fontFamily="$body"
                  fontSize={14}
                  lineHeight={20}
                  fontWeight="600"
                  color="#FFFFFFCC"
                >
                  {t("list.filterApplied", { count: draftCount })}
                </Text>
              )}
            </XStack>
          </Pressable>
        </YStack>
      </YStack>
    </AppBottomSheet>
  )
}
