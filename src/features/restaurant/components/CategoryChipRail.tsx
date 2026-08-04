/**
 * 지도 위 카테고리 칩 레일. 목업 §2.3 (`AI 검색` + 한식/중식/일식/양식/샐러드/디저트).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 2026-07-31: **레시피 화면과 같은 선택 문법으로 옮겼다**
 *
 * 직전까지 이 레일의 선택 표시는 `1.5pt 브랜드색 테두리` 였다(목업 -2 실측). 그런데 같은
 * 앱의 레시피 탭에는 **같은 그림을 쓰는 같은 성격의 카테고리 레일**이 이미 있고
 * (`RecipeCategoryCarousel` — 자산도 `assets/images/*.svg` 로 동일하다) 그쪽 규칙은
 * 정반대였다: 테두리 없음, 선택은 **면**으로 말하고, 안 고른 것은 그림을 흐리게 둔다.
 * 사용자가 탭을 옮길 때마다 "고른 것" 의 생김새를 다시 배우게 되는 상태였다.
 *
 * 그래서 이 레일을 그쪽에 맞춘다:
 *   - **테두리를 없앴다.** 앱 전체 규칙이 보더리스이고, 지도 위에서 칩이 배경과 끊기는 일은
 *     `FLOATING_SHADOW` 가 이미 하고 있다(검색바가 테두리 없이 같은 방식으로 떠 있다).
 *   - **선택 = 잉크 면 + 흰 글자.** 브랜드색을 쓰지 않는 이유는 종전 판본의 근거 그대로다 —
 *     같은 주황인 마커 링·`현재 지도에서 찾기` pill 과 우선순위가 엉킨다. 회색 면으로는
 *     흰 칩 위에서 대비가 서지 않아(지도 타일 위라 더 그렇다) 레시피 캐러셀이 쓰는
 *     "연회색 면" 대신 **잉크 면**을 쓴다. 둘 다 무채색이고, 뜻하는 바는 같다.
 *   - **안 고른 칩의 그림은 45% 로 흐리다.** 레시피 캐러셀과 같은 값이다. 다색 일러스트라
 *     색을 바꿀 수 없으므로 투명도가 유일하게 일관된 방법이고, 여섯 칩이 전부 총천연색으로
 *     떠 있던 "알록달록한 지도" 가 이것으로 가라앉는다.
 *
 * 폭이 상태에 따라 흔들리지 않는다는 성질은 그대로다(테두리가 아예 없으므로 자명하다).
 *
 * ## `AI 검색` 은 선택이 아니라 액션이다
 *
 * 눌러도 `selected` 상태가 되지 않고 AI 검색 시트를 연다. 그래서 `accessibilityState.selected`
 * 를 붙이지 않는다 — 붙이면 스크린리더가 토글이라고 알려 준다. 브랜드색 반짝임은
 * 이 칩 하나에만 남는다(액션이라 카테고리 선택과 다른 신호를 줘야 한다).
 *
 * ## 음식 아이콘은 currentColor 가 아니다
 *
 * `assets/images/{korean,chinese,...}.svg` 는 여러 색이 박힌 **일러스트**다(아이콘이 아니다).
 * v2 아이콘 규칙("hex 하드코딩 금지, currentColor 만")은 단색 글리프에 대한 규칙이고,
 * 이 자산들은 컬러 일러스트라 그 규칙의 대상이 아니다. 대신 v2 레지스트리에 넣지 않고
 * 여기서 직접 import 한다 — 레지스트리는 색을 받는 글리프만 담는다. 레시피 카드가 쓰는
 * 표(`RECIPE_CATEGORY_ART`)와 같은 파일들이다.
 */

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native"
import { useTranslation } from "react-i18next"
import type React from "react"

import {
  V2Icon,
  iconSize,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

import { dynamicKey } from "@/src/i18n/dynamicKey"

import type { CuisineType } from "../types"
import { RAIL_CUISINE_TYPES } from "../data/filterCatalog"
import { CUISINE_ART } from "./cuisineArt"
import { FLOATING_SHADOW } from "./mapFloating"

import { CHIP_GAP, RAIL_INSET } from "../layout"

/** 목업 h40. DS 사다리에는 38(md)이 가장 가깝지만 지도 위 칩은 목업 값을 지킨다. */
const HEIGHT = 40

/**
 * 안 고른 카테고리 그림의 투명도. 레시피 캐러셀과 **같은 값**이다
 * (`RecipeCategoryCarousel`: `opacity: isSelected ? 1 : 0.45`).
 */
const IDLE_ART_OPACITY = 0.45

/** 일러스트 자산의 viewBox 비율이 제각각이라(38×30 ~ 37×35) 폭·높이를 함께 고정한다. */
const ART_WIDTH = 22
const ART_HEIGHT = 20

export interface CategoryChipRailProps {
  /** 레일은 **단일 선택**이다. 선택 없음은 `null`. */
  selected: CuisineType | null
  onSelect: (type: CuisineType | null) => void
  onPressAiSearch: () => void
  /** 좌우 인셋. 검색바와 같은 값이어야 왼쪽 선이 맞는다. */
  insetHorizontal?: number
  style?: ViewStyle
}

export function CategoryChipRail({
  selected,
  onSelect,
  onPressAiSearch,
  insetHorizontal = RAIL_INSET,
  style,
}: CategoryChipRailProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  return (
    <ScrollView
      horizontal
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingLeft: insetHorizontal, paddingRight: insetHorizontal },
      ]}
      style={style}
    >
      <RailChip
        label={t("restaurant.map.aiSearch")}
        onPress={onPressAiSearch}
        leading={
          <V2Icon
            name="sparkle"
            size={iconSize.sm}
            color={colors.primary.primary}
          />
        }
      />
      {/*
        "전체" 칩은 두지 않는다(레시피 캐러셀과 같은 판단, 2026-08-04).

        한때 세웠던 이유는 "되돌리는 길이 화면에 안 보인다" 였는데, 이 레일은 원래부터
        **고른 칩을 다시 누르면 해제**되는 단일 선택이다. 전체 칩은 그 위에 "선택 없음"
        을 한 번 더 말하는 중복이었고, 음식 일러스트만 있는 줄에 글자 칩 하나가 끼어
        줄의 성격도 흐렸다.
      */}
      {RAIL_CUISINE_TYPES.map((spec) => {
        const Art = CUISINE_ART[spec.value]
        const isSelected = selected === spec.value
        return (
          <RailChip
            key={spec.value}
            label={t(dynamicKey(spec.labelKey))}
            selected={isSelected}
            // 같은 칩을 다시 누르면 해제된다(단일 선택 토글).
            onPress={() => onSelect(isSelected ? null : spec.value)}
            leading={
              Art ? (
                <Art
                  width={ART_WIDTH}
                  height={ART_HEIGHT}
                  // 고르지 않은 그림은 흐리다 — 레시피 캐러셀과 같은 처리.
                  opacity={isSelected ? 1 : IDLE_ART_OPACITY}
                />
              ) : undefined
            }
          />
        )
      })}
    </ScrollView>
  )
}

function RailChip({
  label,
  selected,
  onPress,
  leading,
}: {
  label: string
  /** `undefined` = 토글이 아닌 액션 칩. 스크린리더에 선택 상태를 알리지 않는다. */
  selected?: boolean
  onPress: () => void
  leading?: React.ReactNode
}) {
  const { colors } = useV2Theme()
  const isToggle = selected !== undefined
  const active = selected === true

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isToggle ? { selected: active } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        FLOATING_SHADOW,
        {
          /* 선택은 **면**이 말한다(테두리 없음). 잉크 면을 쓰는 이유는 파일 머리말 —
             회색으로는 지도 타일 위에서 흰 칩과 구별되지 않고, 주황은 마커·`현재 지도에서
             찾기` pill 과 신호가 겹친다. 반투명 면도 쓰지 않는다(지도 타일이 배어 나온다). */
          backgroundColor: active
            ? colors.label.normal
            : colors.background.default,
        },
        pressed && styles.pressed,
      ]}
    >
      {leading}
      <Text
        style={[
          // 고른 칩만 굵다 — 레시피 캐러셀과 같은 "굵기 + 면" 문법.
          active ? typography.label.small : typography.label.smallWeak,
          { color: active ? colors.static.white : colors.label.normal },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: { gap: CHIP_GAP, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    height: HEIGHT,
    paddingHorizontal: spacing[12],
    borderRadius: radius.full,
  },
  pressed: { opacity: 0.85 },
})
