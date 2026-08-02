/**
 * 시트 상단·리스트 모드의 필터 칩 행 — `추천순 ⌄` `지역` `영양 기준` `음식 종류` (목업 -5 / -8).
 *
 * ## 개수를 붙인다 (목업에 없는 추가)
 *
 * 목업은 활성 상태를 주황 테두리로만 보여 준다. 그런데 `지역` 칩 하나에 `강남`·`서초`·`수원`
 * 세 개가 걸려 있을 수 있어서(목업 -24), 테두리만으로는 시트를 열어 봐야 몇 개인지 안다.
 * 라벨 뒤에 개수를 붙이면 그 왕복이 사라진다. 의도된 개선이고, 0 이면 붙지 않으므로
 * 비활성 상태의 목업과는 픽셀이 같다.
 *
 * ## 정렬 칩은 값을 그대로 말한다
 *
 * `추천순` 은 라벨이 아니라 **현재 정렬값**이다. `별점순` 을 고르면 칩이 `별점순 ⌄` 이 된다.
 * 기본값(`RECOMMENDED`)일 때는 활성으로 그리지 않는다 — 아무것도 고르지 않은 상태와
 * 같기 때문이다.
 *
 * ## 네 칩 모두 `variant="quiet"` 다
 *
 * 이 행은 필터 시트와 달리 지도·목록 **본문 위에 상시** 떠 있다. 활성 표시는 주황
 * 테두리 + 옅은 주황 면까지만이고 글자는 gray-900 으로 남는다(목업 -5 실측: 면 `#FFF9F6`,
 * 글자 `#2F2F3C`). 네 칩이 동시에 주황 글자가 되면 시트 머리가 주황 덩어리가 되어 그
 * 아래 카드의 주황 요소와 구분되지 않는다. 값의 정의는 `SelectableChip` 헤더에 있다.
 */

import { ScrollView, StyleSheet, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import { CHIP_GAP, RAIL_INSET } from "../layout"
import { DEFAULT_SORT, sortLabelKey } from "../data/filterCatalog"
import type { FilterAxisState } from "../hooks/useRestaurantFilters"
import type { SortOption } from "../types"
import { SelectableChip } from "./SelectableChip"

/** 어느 섹션으로 필터 시트를 열지. 시트가 그 위치로 스크롤한다. */
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
      style={style}
    >
      <SelectableChip
        size="s"
        variant="quiet"
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
        selected={axes.region.active}
        onPress={() => onPressAxis("region")}
      />
      <SelectableChip
        size="s"
        variant="quiet"
        label={t("restaurant.tabs.nutrient")}
        count={axes.nutrition.count}
        selected={axes.nutrition.active}
        onPress={() => onPressAxis("nutrition")}
      />
      <SelectableChip
        size="s"
        variant="quiet"
        label={t("restaurant.tabs.foodType")}
        count={axes.cuisine.count}
        selected={axes.cuisine.active}
        onPress={() => onPressAxis("cuisine")}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
    // 가로 스크롤 인셋은 `contentContainerStyle` 쪽이다 — 컨테이너에 주면 끝에서 잘린다.
    paddingHorizontal: RAIL_INSET,
  },
})
