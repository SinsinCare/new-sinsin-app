/**
 * 필터 바텀시트 (목업 -22 / -23 / -24).
 * 지역 2단 + 영양 기준 + 음식 종류 + 선택 트레이 + `닫기`/`확인`.
 *
 * ## 광역은 채우고, 나머지는 테두리다
 *
 * 목업에서 **면을 채우는 선택은 광역(시도) 칩 하나뿐**이다. 세부 지역·영양·음식은 모두
 * 흰 면 + 주황 테두리다. 이유가 있다: 시도는 "지금 어느 목록을 보고 있는가" 라는 단일
 * 선택이고, 나머지는 "무엇을 걸었는가" 라는 다중 선택이다. 같은 시각 언어를 주면
 * 사용자는 시도도 필터로 걸린 줄 안다 — 실제로는 걸리지 않는다(아래 참고).
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
  controlHeight,
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
const TRAY_HEIGHT = controlHeight.sm + spacing[12]

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
  const { height: windowHeight } = useWindowDimensions()

  const { draft, chips } = filters
  const scrollRef = useRef<ScrollView>(null)
  const sectionOffsets = useRef<Record<FilterAxis, number>>({
    region: 0,
    nutrition: 0,
    cuisine: 0,
  })

  /* 열림 효과가 `filters` 전체를 의존성으로 잡으면 확정본이 바뀔 때마다 편집 중인 초안이
     날아간다. 최신 함수만 ref 로 들고 가서 의존성을 `visible`/`initialSection` 로 좁힌다. */
  const syncDraftRef = useRef(filters.syncDraft)
  syncDraftRef.current = filters.syncDraft
  const setActiveSidoRef = useRef(filters.setActiveSido)
  setActiveSidoRef.current = filters.setActiveSido
  const activeSidoRef = useRef(draft.activeSido)
  activeSidoRef.current = draft.activeSido

  const [scrolledFor, setScrolledFor] = useState<FilterAxis | null>(null)

  useEffect(() => {
    if (!visible) {
      setScrolledFor(null)
      return
    }
    syncDraftRef.current()
    // 목업 -22 는 언제나 광역 하나가 켜져 있다. 아무것도 안 켜져 있으면 첫 시도를 켠다 —
    // `activeSido` 는 질의에 안 들어가므로 이걸로 결과가 달라지지 않는다.
    if (activeSidoRef.current === null) {
      setActiveSidoRef.current(sidoList()[0].key)
    }
  }, [visible])

  /* 섹션 위치는 `onLayout` 이 알려 준다. 열린 프레임에는 아직 0 이라 레이아웃이 한 번
     돌아온 뒤에 옮긴다 — `scrolledFor` 가 "이번 열림에서 이미 옮겼다" 를 기억한다. */
  useEffect(() => {
    if (!visible || !initialSection || scrolledFor === initialSection) return
    const y = sectionOffsets.current[initialSection]
    if (initialSection !== "region" && y === 0) return
    scrollRef.current?.scrollTo({ y, animated: false })
    setScrolledFor(initialSection)
  }, [visible, initialSection, scrolledFor])

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
      SHEET_TITLE_HEIGHT -
      FOOTER_HEIGHT -
      (chips.length > 0 ? TRAY_HEIGHT : 0),
  )

  const handleApply = () => {
    filters.applyDraft()
    onApply?.()
    onClose()
  }

  return (
    <V2BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("restaurant.filter.title")}
    >
      <ScrollView
        ref={scrollRef}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: maxScrollHeight }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1단 광역(단일 선택, 면을 채우는 유일한 칩) + 2단 세부(다중 선택) */}
        <View
          onLayout={(event) => {
            sectionOffsets.current.region = event.nativeEvent.layout.y
          }}
          style={styles.section}
        >
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
                variant="fill"
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

        {/* 영양 기준(다중) */}
        <View
          onLayout={(event) => {
            sectionOffsets.current.nutrition = event.nativeEvent.layout.y
          }}
          style={styles.section}
        >
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

        {/* 음식 종류(다중) */}
        <View
          onLayout={(event) => {
            sectionOffsets.current.cuisine = event.nativeEvent.layout.y
          }}
          style={styles.section}
        >
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

      <SelectedFilterTray
        chips={chips}
        onRemove={filters.removeChip}
        onClearAll={filters.clearAllSelections}
        style={styles.tray}
      />

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
          {t("action.confirm")}
        </V2Button>
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing[20],
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
