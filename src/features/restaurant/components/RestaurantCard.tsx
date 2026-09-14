import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { memo, useCallback } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
import { Pressable } from "react-native-gesture-handler"
import { useTranslation } from "react-i18next"
import {
  V2Badge,
  V2Divider,
  V2Icon,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import type { BookmarkCardDto, RestaurantCardDto } from "../types"
import { cuisineTypeLabelKey } from "../data/filterCatalog"
import { formatDistanceKm } from "../utils/distance"
import { cardConcernNutrients } from "../utils/cardSafetyBadge"
import { BusinessStatusText } from "./BusinessStatusText"
import { PhotoStrip } from "./PhotoStrip"
import { RestaurantMenuSummary } from "./RestaurantMenuSummary"
import type { RestaurantCardTarget } from "../utils/restaurantCardNavigation"
import { GUTTER } from "../layout"

export interface RestaurantCardProps {
  card: RestaurantCardDto | BookmarkCardDto
  selected?: boolean
  onPress?: (target: RestaurantCardTarget) => void
  style?: ViewStyle
}

export const RestaurantCard = memo(function RestaurantCard({
  card,
  selected = false,
  onPress,
  style,
}: RestaurantCardProps) {
  const { t } = useTranslation("common")
  const { colors, mode, primitives } = useV2Theme()
  const cuisine = t(dynamicKey(cuisineTypeLabelKey(card.cuisineType)))
  const concerns = cardConcernNutrients("safety" in card ? card.safety : null)
  const concernLabels = concerns.map((nutrient) =>
    t(dynamicKey(`restaurant.safety.driver.${nutrient}`)),
  )
  const location = [formatDistanceKm(card.distanceKm), card.shortAddress]
    .filter(Boolean)
    .join(" · ")
  const ratingLabel =
    card.rating !== null
      ? t("restaurant.detail.ratingAccessibility", {
          rating: card.rating.toFixed(1),
          count: card.reviewCount,
        })
      : null

  /* 자식(`PhotoStrip`·`RestaurantMenuSummary`)도 `memo` 다. 인라인 화살표를 넘기면 이 카드가
     다시 그려질 때마다 자식의 `onPress` 가 새 함수라 memo 가 한 번도 걸러 내지 못한다 —
     사진 스트립은 이미지를 최대 6장 물고 있어 그게 가장 비싼 부분이다. `onPress` 가 없을 때
     `undefined` 를 넘겨야 자식이 `disabled` 로 접히므로 삼항은 그대로 둔다. */
  const handlePressHome = useCallback(
    () => onPress?.({ type: "home" }),
    [onPress],
  )
  const handlePressPhotos = useCallback(
    (urls: readonly string[], index: number) =>
      onPress?.({ type: "photos", urls, index }),
    [onPress],
  )
  const handlePressMenu = useCallback(
    () => onPress?.({ type: "menu" }),
    [onPress],
  )

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: selected
            ? colors.fill.normal
            : colors.background.default,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={[
          card.name,
          ...concernLabels.map(
            (label) => `${label} ${t("restaurant.safety.CAUTION")}`,
          ),
          cuisine,
          ratingLabel,
          location,
          t(dynamicKey("restaurant.businessStatus." + card.businessStatus)),
        ]
          .filter(Boolean)
          .join(", ")}
        onPress={onPress ? handlePressHome : undefined}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.identity}>
          <Text
            style={[
              typography.label.small,
              styles.name,
              { color: colors.label.normal },
            ]}
            lineBreakStrategyIOS="hangul-word"
          >
            {card.name}
          </Text>
          {concerns.map((nutrient, index) => (
            <V2Badge
              key={nutrient}
              size="xs"
              color="red"
              variant="weak"
              style={styles.nutrientBadge}
            >
              <Text
                style={{
                  color:
                    mode === "light"
                      ? primitives.red[700]
                      : primitives.red[300],
                }}
              >
                {concernLabels[index]}
              </Text>
            </V2Badge>
          ))}
          <Text
            style={[typography.subtext.small, { color: colors.label.neutral }]}
          >
            {cuisine}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <BusinessStatusText
            tone="neutral"
            status={card.businessStatus}
            closingTime={card.closeTime}
            openingTime={card.openTime}
            breakEndTime={"breakEnd" in card ? card.breakEnd : null}
          />
          {card.rating !== null && (
            <View style={styles.rating}>
              <Text
                style={[
                  typography.subtext.small,
                  { color: colors.label.assistive },
                ]}
              >
                ·
              </Text>
              <V2Icon
                name="starFilled"
                size="xs"
                color={colors.primary.primary}
              />
              <Text
                style={[
                  typography.label.xSmall,
                  styles.numeric,
                  { color: colors.label.normal },
                ]}
              >
                {card.rating.toFixed(1)}
              </Text>
            </View>
          )}
          {card.reviewCount > 0 && (
            <Text
              style={[
                typography.subtext.medium,
                styles.numeric,
                { color: colors.label.neutral },
              ]}
            >
              {t("restaurant.detail.metaReviews", {
                formattedCount: card.reviewCount.toLocaleString(),
              })}
            </Text>
          )}
        </View>
        {location.length > 0 && (
          <Text
            style={[typography.subtext.small, { color: colors.label.neutral }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {location}
          </Text>
        )}
      </Pressable>
      <PhotoStrip
        urls={card.imageUrls}
        name={card.name}
        onPress={onPress ? handlePressPhotos : undefined}
      />
      <RestaurantMenuSummary
        names={
          "representativeMenuNames" in card
            ? card.representativeMenuNames
            : undefined
        }
        selected={selected}
        onPress={onPress ? handlePressMenu : undefined}
      />
    </View>
  )
})

export interface RestaurantCardRowProps<
  Card extends RestaurantCardDto | BookmarkCardDto,
> {
  item: Card
  selected?: boolean
  /** 어느 카드가 눌렸는지 카드 자신이 알려 준다 — 화면은 이 콜백 하나를 안정적으로 든다. */
  onPress?: (card: Card, target: RestaurantCardTarget) => void
}

/**
 * 목록 한 줄. `RestaurantCard` 를 감싸기만 하는 얇은 층인데, **여기 있어야 하는 이유**가 있다.
 *
 * 목록의 `renderItem` 은 `extraData` 가 바뀔 때 보이는 행마다 다시 불린다. 그때
 * `onPress={(target) => onPressCard(item, target)}` 처럼 인라인 화살표를 만들면 매번 새 함수라
 * `memo(RestaurantCard)` 가 **한 번도 걸러 내지 못한다** — 마커를 누를 때마다 화면에 있는
 * 카드가 사진 스트립까지 통째로 다시 그려졌다(지도 시트에서 실측한 멈칫).
 *
 * 이 컴포넌트가 그 화살표를 자기 안에서 `useCallback` 으로 들고 있으면, 바뀐 것이 선택
 * 상태뿐일 때 `selected` 가 실제로 달라진 **두 줄만** 다시 그려진다. 지도 시트·리스트
 * 모드·저장한 곳이 전부 이 한 줄을 쓴다 — 화면마다 인라인 화살표로 되돌아가지 않게.
 */
function RestaurantCardRowInner<
  Card extends RestaurantCardDto | BookmarkCardDto,
>({ item, selected = false, onPress }: RestaurantCardRowProps<Card>) {
  const handlePress = useCallback(
    (target: RestaurantCardTarget) => {
      onPress?.(item, target)
    },
    [onPress, item],
  )

  return (
    <RestaurantCard
      card={item}
      selected={selected}
      onPress={onPress ? handlePress : undefined}
    />
  )
}

/* `memo` 는 제네릭 호출 시그니처를 잃는다 — props 가 `Card` 의 상한(유니온)으로 접히면서
   `onPress` 매개변수의 반공변 검사에 걸려, 저장한 곳(`BookmarkCardDto`)과 지도 시트
   (`RestaurantCardDto`)가 같은 줄을 못 쓴다. 캐스트로 원래 시그니처를 되돌린다; 런타임은
   그대로 memo 다. */
export const RestaurantCardRow = memo(
  RestaurantCardRowInner,
) as typeof RestaurantCardRowInner

/**
 * 카드 사이 구분선. 지도 시트·리스트 모드의 실패 화면·저장한 곳이 같은 선을 쓴다 —
 * 화면마다 `() => <V2Divider />` 를 따로 두면 톤이 한 곳만 바뀌어 같은 카드가 화면마다
 * 다른 목록처럼 보인다.
 */
export function RestaurantCardSeparator() {
  return <V2Divider tone="alternative" />
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: GUTTER,
    paddingVertical: spacing[16],
    gap: spacing[12],
  },
  body: { gap: spacing[6] },
  identity: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: spacing[6],
    rowGap: spacing[4],
  },
  name: { flexShrink: 1 },
  nutrientBadge: {
    borderRadius: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[6],
  },
  rating: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  numeric: { fontVariant: ["tabular-nums"] },
  pressed: { opacity: 0.7 },
})
