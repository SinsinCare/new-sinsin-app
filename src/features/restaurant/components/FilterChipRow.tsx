/** 현재 정렬값과 필터별 적용 개수를 표시하는 결과 도구 모음. */

import { StyleSheet, type ViewStyle } from "react-native"
// 시트 안의 가로 스크롤은 RNGH 것을 쓴다 — 이유는 `PhotoStrip` 의 같은 import 주석에.
import { ScrollView } from "react-native-gesture-handler"
import { useTranslation } from "react-i18next"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import { CHIP_GAP, RAIL_INSET } from "../layout"
import { DEFAULT_SORT, sortLabelKey } from "../data/filterCatalog"
import type { FilterAxisState } from "../hooks/useRestaurantFilters"
import type { SortOption } from "../types"
import { SelectableChip } from "./SelectableChip"

/** 필터를 열 때 바로 보여 줄 탭. */
export type FilterAxis = "region" | "nutrition" | "cuisine"

export interface FilterChipRowProps {
  sort: SortOption
  axes: Record<FilterAxis, FilterAxisState>
  onPressSort: () => void
  onPressAxis: (axis: FilterAxis) => void
  style?: ViewStyle
}

export function FilterChipRow({
  sort,
  axes,
  onPressSort,
  onPressAxis,
  style,
}: FilterChipRowProps) {
  const { t } = useTranslation("common")

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
      contentContainerStyle={styles.content}
      /*
        가로 칩 레일은 세로로 자라면 안 된다. ScrollView 기본 스타일에는
        flexGrow:1 이 있어서, flex 컬럼(지도 실패 화면)에 놓이면 아래 목록과
        남은 높이를 반반 나눠 갖고 칩을 그 한가운데 띄웠다 — 칩 위아래로
        유령 여백 ~100pt 씩(QA 2026-08-06). 칩 높이만 차지하게 못 박는다.
      */
      style={[styles.rail, style]}
    >
      <SelectableChip
        size="s"
        variant="text"
        label={t(dynamicKey(sortLabelKey(sort)))}
        trailingIcon="chevronDown"
        selected={sort !== DEFAULT_SORT}
        onPress={onPressSort}
      />
      <SelectableChip
        size="s"
        variant="quiet"
        label={t("restaurant.tabs.region")}
        count={axes.region.count}
        trailingIcon="chevronDown"
        selected={axes.region.active}
        onPress={() => onPressAxis("region")}
      />
      <SelectableChip
        size="s"
        variant="quiet"
        label={t("restaurant.tabs.nutrient")}
        count={axes.nutrition.count}
        trailingIcon="chevronDown"
        selected={axes.nutrition.active}
        onPress={() => onPressAxis("nutrition")}
      />
      <SelectableChip
        size="s"
        variant="quiet"
        label={t("restaurant.tabs.foodType")}
        count={axes.cuisine.count}
        trailingIcon="chevronDown"
        selected={axes.cuisine.active}
        onPress={() => onPressAxis("cuisine")}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  rail: { flexGrow: 0 },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
    // 가로 스크롤 인셋은 `contentContainerStyle` 쪽이다 — 컨테이너에 주면 끝에서 잘린다.
    paddingHorizontal: RAIL_INSET,
  },
})
