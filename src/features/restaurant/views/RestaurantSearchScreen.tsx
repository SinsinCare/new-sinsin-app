import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 식당 검색 화면 (`app/restaurant/search.tsx` 가 감싼다).
 * 최근 검색어(개별·전체 삭제) + 250ms 디바운스 자동완성 + 확정 시 리스트 모드.
 *
 * ## 지역 제안은 검색이 아니라 카메라 이동이다
 *
 * `REGION` 제안은 서버가 좌표를 함께 준다(그래서 카카오 `services` 지오코딩 라이브러리를
 * 붙이지 않아도 "강남역 근처" 가 동작한다). 이걸 텍스트 검색으로 흘려보내면 `강남역` 이라는
 * **이름을 가진 식당**을 찾게 되어 거의 0건이 나온다. 좌표가 있으면 지도를 옮긴다.
 *
 * ## 최근 검색어는 기기에만 있다
 *
 * 검색어는 개인 건강 문맥을 드러낼 수 있어(`저칼륨`, `투석`) 서버로 보내지 않는다.
 * `useRecentSearches` 가 AsyncStorage 를 쓰는 이유이고, 그래서 개별 삭제가 실제로 지운다.
 *
 * ## 디바운스를 화면에 두지 않는다
 *
 * 대기 시간·취소·최소 글자 수는 `useSearchSuggest` 가 소유한다. 화면마다 250/300/즉시로
 * 갈리면 어떤 화면은 취소를 빼먹고, 늦게 도착한 이전 응답이 목록을 과거로 되돌린다.
 */

import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import {
  iconSize,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
  V2Badge,
  V2Divider,
  V2Icon,
  V2SearchField,
  V2Skeleton,
  V2SkeletonGroup,
  type V2IconName,
} from "@/src/design-system-v2"

import { useRecentSearches } from "../hooks/useRecentSearches"
import { useSearchSuggest } from "../hooks/useSearchSuggest"
import type { SearchSuggestionDto, SuggestKind } from "../types"
import {
  replayRestaurantRecent,
  restaurantRecentFromSuggestion,
  restaurantRecentKey,
  type RestaurantRecentSearch,
} from "../utils/restaurantSearchRecent"

export interface RestaurantSearchScreenProps {
  /** 확정 검색어. 리스트 모드로 넘어간다. */
  onSubmitQuery: (query: string) => void
  /** 좌표가 실린 지역 제안. 지도 카메라를 옮긴다(텍스트 검색이 아니다). */
  onSelectRegion: (suggestion: SearchSuggestionDto) => void
  /** 식당 제안 → 상세. */
  onSelectRestaurant: (restaurantId: number) => void
  onBack: () => void
  /** 리스트 모드에서 검색 필드를 눌러 돌아왔을 때의 초기값. */
  initialQuery?: string
}

/** 제안 종류 → 앞머리 글리프. 종류를 색이 아니라 형태로 구분한다. */
const SUGGEST_ICON: Record<SuggestKind, V2IconName> = {
  RESTAURANT: "search",
  REGION: "mapPin",
  MENU: "fork",
}

/**
 * 제안 종류 → 배지 라벨 키.
 * `Record<SuggestKind, string>` 로 주석을 달면 리터럴이 `string` 으로 넓어져 타입 지정된
 * `t()` 에 못 들어간다. `satisfies` 로 빠짐 없음만 검사하고 리터럴은 그대로 남긴다.
 */
const SUGGEST_LABEL_KEY = {
  RESTAURANT: "restaurant.search.suggestRestaurant",
  REGION: "restaurant.search.suggestRegion",
  MENU: "restaurant.search.suggestMenu",
} as const satisfies Record<SuggestKind, string>

export function RestaurantSearchScreen({
  onSubmitQuery,
  onSelectRegion,
  onSelectRestaurant,
  onBack,
  initialQuery = "",
}: RestaurantSearchScreenProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()

  // 이 화면은 라우트라 열릴 때마다 새로 마운트된다 — 초기값을 useState 초기화로 두는 것이
  // 안전하다. (상시 마운트되는 Modal 이라면 `visible` 로 되맞춰야 했다.)
  const [draft, setDraft] = useState(initialQuery)
  const recent = useRecentSearches()
  const suggest = useSearchSuggest(draft)

  const trimmed = draft.trim()
  // 제안이 뜨는 동안에는 최근 검색어를 감춘다. 둘을 동시에 쌓으면 어느 줄을 눌러야
  // 하는지가 흐려지고, 목업도 한 번에 하나만 보여 준다.
  const showSuggestions = trimmed.length >= 2

  const commit = (keyword: string) => {
    const value = keyword.trim()
    if (!value) return
    recent.add({ kind: "query", label: value })
    onSubmitQuery(value)
  }

  const pickRecent = (entry: RestaurantRecentSearch) => {
    recent.add(entry)
    replayRestaurantRecent(entry, {
      onSubmitQuery,
      onSelectRegion,
      onSelectRestaurant,
    })
  }

  const pickSuggestion = (item: SearchSuggestionDto) =>
    pickRecent(restaurantRecentFromSuggestion(item))

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.default,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
          hitSlop={Math.max(0, (touchTarget.min - iconSize.md) / 2)}
          onPress={onBack}
          style={({ pressed }) => [pressed && styles.pressedRow]}
        >
          <V2Icon name="chevronLeft" size="md" color={colors.label.normal} />
        </Pressable>
        <V2SearchField
          value={draft}
          onChangeText={setDraft}
          placeholder={t("restaurant.search.placeholder")}
          accessibilityLabel={t("restaurant.search.title")}
          returnKeyType="search"
          autoFocus
          onSubmitEditing={() => commit(draft)}
          style={styles.field}
        />
      </View>

      <ScrollView
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing[24] },
        ]}
      >
        {showSuggestions ? (
          <SuggestionList
            isLoading={suggest.isLoading}
            suggestions={suggest.suggestions}
            onPick={pickSuggestion}
          />
        ) : (
          <RecentList
            isLoading={recent.isLoading}
            entries={recent.recentSearches}
            onPick={pickRecent}
            onRemove={recent.remove}
            onClear={recent.clear}
          />
        )}
      </ScrollView>
    </View>
  )
}

/**
 * 검색 화면의 줄 자리표시. 최근 검색어와 자동완성이 같은 `styles.row` 를 쓰므로
 * 하나로 둔다 — 줄 높이가 같아야 두 목록이 갈아탈 때 화면이 튀지 않는다.
 * 폭은 일부러 들쭉날쭉하게 둔다. 다 같은 길이면 표처럼 보여 "검색어" 로 읽히지 않는다.
 */
const SEARCH_ROW_WIDTHS = ["58%", "42%", "68%", "36%", "50%"] as const

function SearchRowsSkeleton({ count }: { count: number }) {
  return (
    <V2SkeletonGroup>
      {SEARCH_ROW_WIDTHS.slice(0, count).map((width, index) => (
        <View key={index} style={styles.row}>
          <V2Skeleton width={20} height={20} radius="full" />
          <V2Skeleton width={width} height={15} />
        </View>
      ))}
    </V2SkeletonGroup>
  )
}

function RecentList({
  isLoading,
  entries,
  onPick,
  onRemove,
  onClear,
}: {
  isLoading: boolean
  entries: RestaurantRecentSearch[]
  onPick: (entry: RestaurantRecentSearch) => void
  onRemove: (entry: RestaurantRecentSearch) => void
  onClear: () => void
}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  // 저장소를 읽는 동안 "이력 없음" 을 그리면 한 프레임 깜빡인다.
  if (isLoading) return <SearchRowsSkeleton count={4} />

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text
          style={[typography.label.small, { color: colors.label.normal }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("restaurant.search.recentTitle")}
        </Text>
        {entries.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={spacing[8]}
            onPress={onClear}
            style={({ pressed }) => [pressed && styles.pressedRow]}
          >
            <Text
              style={[
                typography.subtext.medium,
                { color: colors.label.neutral },
              ]}
            >
              {t("restaurant.search.clearAll")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {entries.length === 0 ? (
        <Text
          style={[
            typography.subtext.large,
            styles.emptyLine,
            { color: colors.label.alternative },
          ]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("restaurant.search.recentEmpty")}
        </Text>
      ) : (
        entries.map((entry) => (
          <View key={restaurantRecentKey(entry)} style={styles.recentRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onPick(entry)}
              style={({ pressed }) => [
                styles.recentDestination,
                pressed && styles.pressedRow,
              ]}
            >
              <V2Icon
                name={
                  entry.kind === "region"
                    ? "mapPin"
                    : entry.kind === "restaurant"
                      ? "fork"
                      : "clock"
                }
                size="sm"
                color={colors.label.alternative}
              />
              <Text
                style={[
                  typography.body.mediumWeak,
                  styles.rowLabel,
                  { color: colors.label.normal },
                ]}
                numberOfLines={1}
              >
                {entry.label}
              </Text>
              {entry.kind !== "query" ? (
                <V2Badge size="s" color="neutral" variant="weak">
                  {t(
                    entry.kind === "region"
                      ? "restaurant.search.suggestRegion"
                      : "restaurant.search.suggestRestaurant",
                  )}
                </V2Badge>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("restaurant.search.removeOne", {
                keyword: entry.label,
              })}
              onPress={() => onRemove(entry)}
              style={({ pressed }) => [
                styles.recentDelete,
                pressed && styles.pressedRow,
              ]}
            >
              <V2Icon name="close" size="sm" color={colors.label.assistive} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  )
}

function SuggestionList({
  isLoading,
  suggestions,
  onPick,
}: {
  isLoading: boolean
  suggestions: SearchSuggestionDto[]
  onPick: (item: SearchSuggestionDto) => void
}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  if (isLoading && suggestions.length === 0) {
    return <SearchRowsSkeleton count={5} />
  }

  if (suggestions.length === 0) {
    return (
      <Text
        style={[
          typography.subtext.large,
          styles.emptyLine,
          { color: colors.label.alternative },
        ]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("restaurant.search.noSuggestion")}
      </Text>
    )
  }

  return (
    <View>
      {suggestions.map((item, index) => (
        <View key={`${item.type}:${item.label}:${String(item.restaurantId)}`}>
          {index > 0 ? <V2Divider inset={spacing[16]} /> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => onPick(item)}
            style={({ pressed }) => [styles.row, pressed && styles.pressedRow]}
          >
            <V2Icon
              name={SUGGEST_ICON[item.type]}
              size="sm"
              color={colors.label.alternative}
            />
            <Text
              style={[
                typography.body.mediumWeak,
                styles.rowLabel,
                { color: colors.label.normal },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            <V2Badge size="s" color="neutral" variant="weak">
              {t(SUGGEST_LABEL_KEY[item.type])}
            </V2Badge>
          </Pressable>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  field: { flex: 1 },
  content: { paddingTop: spacing[8] },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    minHeight: touchTarget.min,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  rowLabel: { flex: 1 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing[16],
    paddingRight: spacing[4],
  },
  recentDestination: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    minHeight: touchTarget.min,
    paddingVertical: spacing[8],
  },
  recentDelete: {
    width: touchTarget.min,
    minHeight: touchTarget.min,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyLine: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  // 행의 눌림 피드백은 0.6 (DS 규칙: 버튼/칩 0.85, 행/탭 0.6).
  pressedRow: { opacity: 0.6 },
})
