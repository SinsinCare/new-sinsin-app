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

/**
 * 칩을 44pt 로 만들되 **줄의 자리는 그대로** 두는 값.
 *
 * 칩 자체는 목업대로 32pt 다. 그런데 이 줄은 시트가 접혀 있을 때 화면에 남는 **유일한
 * 컨트롤**이라, 32pt 짜리 과녁 네 개가 곧 "터치가 잘 안 먹힌다" 가 된다(hitSlop 을 칩에
 * 줘도 스크롤뷰 프레임이 32pt 라 바깥은 잘려 나간다 — 프레임을 키워야 한다).
 *
 * `contentContainerStyle` 로 위아래를 6 씩 벌려 프레임을 44 로 만들고, 같은 값을 음수
 * 마진으로 되돌려 **레이아웃 상자는 32pt 그대로** 둔다. 접힘 높이는 이 줄을 `onLayout`
 * 으로 재서 정해지므로(시트의 §collapsed 스냅) 이렇게 하지 않으면 접힘이 12pt 자란다.
 * 같은 기법을 `CategoryChipRail` 이 이미 쓴다.
 */
const RAIL_TOUCH_PAD = 6

const styles = StyleSheet.create({
  rail: { flexGrow: 0, marginVertical: -RAIL_TOUCH_PAD },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
    // 가로 스크롤 인셋은 `contentContainerStyle` 쪽이다 — 컨테이너에 주면 끝에서 잘린다.
    paddingHorizontal: RAIL_INSET,
    paddingVertical: RAIL_TOUCH_PAD,
  },
})
