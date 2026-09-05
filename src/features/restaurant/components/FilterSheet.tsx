/**
 * 필터 바텀시트 (목업 -22 / -23 / -24).
 * 지역 2단 + 영양 기준 + 음식 종류 + 선택 트레이 + `닫기`/`식당 보기`.
 *
 * ## 시도를 바꿔도 이전 선택은 남는다
 *
 * 목업 -24 에서 `경기`로 옮긴 뒤에도 트레이에 `강남`·`서초`가 남아 있다. 즉 `activeSido` 는
 * **어느 세부 칩 목록을 그릴지**만 정하고 질의에는 들어가지 않는다. 여기를 "시도 바꾸면
 * 초기화" 로 바꾸면 다중 지역 선택이 불가능해진다. `useRestaurantFilters` 가 이미 그렇게
 * 구현돼 있고, 이 시트는 그 계약을 깨지 않는다.
 *
 * ## 열릴 때 초안을 되맞춘다 (프로토타입 버그)
 *
 * 프로토타입의 필터 시트는 `useState(current)` 초기화 + 상시 마운트된 Modal 이라
 * **두 번째로 열면 지난번에 고르고 닫은 상태가 그대로** 남아 있었다. `visible` 이 켜지는
 * 순간 `syncDraft()` 로 확정본을 다시 복사한다.
 *
 * ## 스크롤 높이를 매직 넘버로 두지 않는다
 *
 * 프로토타입의 시트는 `bottom: 210 → 470`, `maxHeight: 330`, `paddingTop: insets.top + 122`
 * 같은 숫자로 짜여 있어 다른 화면 크기에서 잘렸다. 여기서는 창 높이에서 **안전영역 +
 * 시트 고정부(핸들·제목·트레이·푸터)** 를 빼서 남는 값을 쓴다. 각 항이 무엇인지 아래
 * 상수 이름에 있다.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import {
  touchTarget,
  radius,
  spacing,
  typography,
  useV2Theme,
  V2BottomSheet,
  V2Button,
} from "@/src/design-system-v2"

import { SHEET_GUTTER } from "../layout"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import {
  CUISINE_TYPES,
  NUTRITION_TAGS,
  hasUnbackedSelection,
} from "../data/filterCatalog"
import {
  groupsFor,
  isSidoAllKey,
  sidoKeyOf,
  sidoList,
} from "../data/regionCatalog"
import type { UseRestaurantFiltersResult } from "../hooks/useRestaurantFilters"
import type { FilterState } from "../types"
import type { FilterAxis } from "./FilterChipRow"
import { ChipWrap, SelectableChip } from "./SelectableChip"
import { SelectedFilterTray } from "./SelectedFilterTray"

export interface FilterSheetProps {
  visible: boolean
  onClose: () => void
  /** 필터 상태의 소유자. 시트는 `draft` 만 만지고 `확인` 에서 확정한다. */
  filters: UseRestaurantFiltersResult
  /** `확인` 직후 호출. 화면이 재조회를 트리거한다. */
  onApply?: () => void
  /** 칩 행에서 어느 축을 눌러 들어왔는가. 그 섹션으로 스크롤한다. */
  initialSection?: FilterAxis
}

/* 시트 고정부 — 스크롤 영역이 쓸 수 있는 높이를 계산할 때 뺀다.
   V2BottomSheet 내부 값(핸들 상단 패딩 16 + 바 4, 제목 상단 20 + 20/27 한 줄)과
   이 파일의 푸터·트레이 치수에서 온다. */
const SHEET_HANDLE_HEIGHT = spacing[16] + 4
const SHEET_TITLE_HEIGHT = spacing[20] + 27
/** 목업의 푸터 버튼 높이(64). `controlHeight` 에 64 가 없어 리터럴 + 주석으로 둔다. */
const FOOTER_BUTTON_HEIGHT = 64
const FOOTER_HEIGHT = spacing[20] + FOOTER_BUTTON_HEIGHT
const TRAY_HEIGHT = touchTarget.min + spacing[12]

/** 세부 지역 칩 하나가 선택돼 있는가. `<sido>-all` 은 시도 필터로 담기므로 따로 본다. */
function isRegionSelected(draft: FilterState, groupKey: string): boolean {
  return isSidoAllKey(groupKey)
    ? draft.regionSidos.includes(sidoKeyOf(groupKey))
    : draft.regionGroups.includes(groupKey)
}

export function FilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  initialSection,
}: FilterSheetProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const { height: windowHeight, fontScale } = useWindowDimensions()

  const { draft, chips } = filters
  /* 열림 효과가 `filters` 전체를 의존성으로 잡으면 확정본이 바뀔 때마다 편집 중인 초안이
     날아간다. 최신 함수만 ref 로 들고 가서 의존성을 `visible`/`initialSection` 로 좁힌다. */
  const syncDraftRef = useRef(filters.syncDraft)
  syncDraftRef.current = filters.syncDraft
  const setActiveSidoRef = useRef(filters.setActiveSido)
  setActiveSidoRef.current = filters.setActiveSido
  const activeSidoRef = useRef(draft.activeSido)
  activeSidoRef.current = draft.activeSido

  const [activeAxis, setActiveAxis] = useState<FilterAxis>(
    initialSection ?? "region",
  )

  useEffect(() => {
    if (!visible) return
    syncDraftRef.current()
    setActiveAxis(initialSection ?? "region")
    if (activeSidoRef.current === null) {
      setActiveSidoRef.current(sidoList()[0].key)
    }
  }, [visible, initialSection])

  const groups = groupsFor(draft.activeSido)
  const showUnbackedNotice = useMemo(
    () =>
      hasUnbackedSelection({
        nutritionTags: draft.nutritionTags,
        cuisineTypes: draft.cuisineTypes,
      }),
    [draft.nutritionTags, draft.cuisineTypes],
  )

  const maxScrollHeight = Math.max(
    // 아주 작은 화면에서도 최소 한 섹션은 보이게 바닥을 둔다.
    200,
    windowHeight -
      insets.top -
      insets.bottom -
      SHEET_HANDLE_HEIGHT -
      (touchTarget.min + spacing[16]) * Math.max(1, fontScale) -
      SHEET_TITLE_HEIGHT * fontScale -
      FOOTER_HEIGHT * Math.max(1, fontScale) -
      TRAY_HEIGHT * Math.max(1, fontScale),
  )

  const handleApply = () => {
    filters.applyDraft()
    onApply?.()
    onClose()
  }

  return (
    <V2BottomSheet
      surface="restaurant_filter"
      visible={visible}
      onClose={onClose}
      title={t("restaurant.filter.title")}
    >
      <View style={styles.axes}>
        {(["region", "nutrition", "cuisine"] as const).map((axis) => (
          <SelectableChip
            key={axis}
            size="s"
            variant="quiet"
            label={t(
              axis === "region"
                ? "restaurant.tabs.region"
                : axis === "nutrition"
                  ? "restaurant.tabs.nutrient"
                  : "restaurant.tabs.foodType",
            )}
            selected={activeAxis === axis}
            onPress={() => setActiveAxis(axis)}
            style={styles.axis}
          />
        ))}
      </View>
      <ScrollView
        key={activeAxis}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: maxScrollHeight }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1단 광역(단일 선택, 면을 채우는 유일한 칩) + 2단 세부(다중 선택) */}
        {activeAxis === "region" && (
          <View style={styles.section}>
            <Text
              style={[typography.label.medium, { color: colors.label.normal }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("restaurant.filter.region")}
            </Text>
            <ChipWrap>
              {sidoList().map((sido) => (
                <SelectableChip
                  key={sido.key}
                  variant="outline"
                  label={t(dynamicKey(sido.labelKey))}
                  selected={draft.activeSido === sido.key}
                  onPress={() => filters.setActiveSido(sido.key)}
                />
              ))}
            </ChipWrap>

            {groups.length > 0 ? (
              <View
                style={[
                  styles.groupSurface,
                  { backgroundColor: colors.fill.background },
                ]}
              >
                <ChipWrap>
                  {groups.map((group) => (
                    <SelectableChip
                      key={group.key}
                      size="s"
                      onSurface
                      label={t(dynamicKey(group.labelKey))}
                      selected={isRegionSelected(draft, group.key)}
                      onPress={() => filters.toggleRegion(group.key)}
                    />
                  ))}
                </ChipWrap>
              </View>
            ) : null}
          </View>
        )}

        {/* 영양 기준(다중) */}
        {activeAxis === "nutrition" && (
          <View style={styles.section}>
            <Text
              style={[typography.label.medium, { color: colors.label.normal }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("restaurant.filter.nutrient")}
            </Text>
            <ChipWrap>
              {NUTRITION_TAGS.map((tag) => (
                <SelectableChip
                  key={tag.value}
                  label={t(dynamicKey(tag.labelKey))}
                  selected={draft.nutritionTags.includes(tag.value)}
                  onPress={() => filters.toggleNutritionTag(tag.value)}
                />
              ))}
            </ChipWrap>
          </View>
        )}

        {/* 음식 종류(다중) */}
        {activeAxis === "cuisine" && (
          <View style={styles.section}>
            <Text
              style={[typography.label.medium, { color: colors.label.normal }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("restaurant.filter.foodType")}
            </Text>
            <ChipWrap>
              {CUISINE_TYPES.map((cuisine) => (
                <SelectableChip
                  key={cuisine.value}
                  label={t(dynamicKey(cuisine.labelKey))}
                  selected={draft.cuisineTypes.includes(cuisine.value)}
                  onPress={() => filters.toggleCuisineType(cuisine.value)}
                />
              ))}
            </ChipWrap>
          </View>
        )}

        {/* 오늘 데이터로는 0건이 나올 조합을 고른 상태. 칩을 끄지 않고 미리 말해 준다 —
            결과 화면에서 처음 알게 되면 앱이 고장 난 것처럼 보인다. */}
        {showUnbackedNotice ? (
          <Text
            style={[
              typography.subtext.medium,
              styles.notice,
              { color: colors.label.neutral },
            ]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("restaurant.filter.unbackedNotice")}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ minHeight: TRAY_HEIGHT * Math.max(1, fontScale) }}>
        <SelectedFilterTray
          chips={chips}
          onRemove={filters.removeChip}
          onClearAll={filters.clearAllSelections}
          style={styles.tray}
        />
      </View>

      {/* 목업의 푸터 비율은 45:55 다. V2BottomSheet 의 기본 푸터는 50:50 이라 직접 짠다. */}
      <View style={styles.footer}>
        <V2Button
          size="xl"
          color="neutral"
          variant="weak"
          onPress={onClose}
          style={styles.footerClose}
        >
          {t("action.close")}
        </V2Button>
        <V2Button
          size="xl"
          color="brand"
          variant="fill"
          onPress={handleApply}
          style={styles.footerApply}
        >
          {t("restaurant.filter.applyResults")}
        </V2Button>
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  axes: {
    flexDirection: "row",
    gap: spacing[8],
    paddingHorizontal: SHEET_GUTTER,
    paddingTop: spacing[8],
    paddingBottom: spacing[16],
  },
  axis: { flex: 1, paddingHorizontal: spacing[8] },
  scrollContent: {
    paddingTop: spacing[8],
    paddingBottom: spacing[8],
    gap: spacing[24],
  },
  section: {
    paddingHorizontal: SHEET_GUTTER,
    gap: spacing[12],
  },
  groupSurface: {
    borderRadius: radius.lg,
    padding: spacing[12],
  },
  notice: {
    paddingHorizontal: SHEET_GUTTER,
  },
  tray: {
    marginTop: spacing[12],
  },
  footer: {
    flexDirection: "row",
    gap: spacing[8],
    marginTop: spacing[20],
    paddingHorizontal: SHEET_GUTTER,
  },
  // 목업 45:55. flex 값의 비율이 그대로 폭 비율이 된다.
  footerClose: {
    flex: 45,
    minHeight: FOOTER_BUTTON_HEIGHT,
    borderRadius: radius.xl,
  },
  footerApply: {
    flex: 55,
    minHeight: FOOTER_BUTTON_HEIGHT,
    borderRadius: radius.xl,
  },
})
