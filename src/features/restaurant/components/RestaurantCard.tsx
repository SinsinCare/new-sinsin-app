/**
 * 목록 카드. 목업 §2.8 의 세 줄 + 사진 스트립.
 *
 * ```
 * 신신국밥  [저단백] [한식]
 * ★ 4.0 (1,413)  영업중 21:30까지
 * 2.6km · 서울 강남구 대치동  ›     ← 누르면 주소가 카드 안에서 펼쳐진다(목업 -6)
 * [사진1][사진2][사진3]
 * ```
 *
 * ## 카드 높이를 고정하지 않는다
 *
 * 주소 확장·평점 없음·거리 없음·사진 없음이 모두 실제로 일어나고, Dynamic Type 까지 있다.
 * 고정 높이를 주면 큰 글씨에서 글자가 잘린다. 각 줄은 없으면 **그리지 않고** 자리표시자로
 * 채우지 않는다.
 *
 * ## 없는 값을 0 으로 쓰지 않는다
 *
 * - `distanceKm === null`(위치 권한 없음) → 거리 조각을 빼고 지역만 남긴다. `0km` 는
 *   "아주 가깝다" 로 읽힌다.
 * - `rating === null` → 별 줄에서 평점만 빼고 영업 상태는 남긴다. `0.0` 은 "최악" 이다.
 * - `imageUrls` 가 비면 회색 사각형 3개를 그리지 않는다(`PhotoStrip` 주석 참고).
 *
 * ## 배지는 `safety` 에서 **유도**한다 (이 카드가 죽었던 자리)
 *
 * 이 파일 106번째 줄이 `card.nutritionBadges.slice(...)` 였고, 그 필드는 응답에 **없다.**
 * `Cannot read property 'slice' of undefined` 로 목록 전체가 죽었다. DTO 가 손으로 쓴
 * `interface` + `as` 캐스트였기 때문에 타입스크립트는 아무 말도 하지 않았다.
 *
 * 서버에 그 필드를 추가하지 **않았다.** 정적 `restaurant.nutrition_tags` 는 환자별 기준을
 * 모르는 미검수 임상 주장이고(`BUILD_CONTRACT §-1.1`), 배지로 내보내면 `mealrec` 의
 * `nonclinicalTags()` 검열을 우회하는 두 번째 경로가 생긴다. 배지는 사용자 기준으로 계산된
 * `card.safety` 에서 만들고, 그 규칙과 근거는 전부 `utils/cardSafetyBadge.ts` 에 있다.
 * 원본 CSV 는 `legacyNutritionTags` 로만 내려오며 **그리지 않는다.**
 *
 * 등급 배지는 `SafetyBadge` 를 쓴다 — 색 매핑을 여기서 다시 하면 같은 등급이 카드와
 * 상세에서 다른 색으로 보인다(`SafetyBadge` 헤더의 규칙).
 *
 * ## 별 색은 `status.cautionary` 하나다 (기능 전체 공통)
 *
 * 목업의 별을 확대해 픽셀을 뽑으면 `#FFA938` 이고, 카드(-5)·평점 분해(-11)·후기 행(-11)·
 * 후기 작성의 입력 별(-27)이 **전부 같은 값**이다. `#FFA938` 은 `status.cautionary` 의
 * 라이트 값과 정확히 일치한다(다크에서는 `#FFC06E` 로 밝아진다).
 *
 * 한때 이 파일만 `primitives.lightOrange[500]` 을 직접 읽었다. 라이트 모드에서는 같은
 * hex 라 티가 나지 않지만 다크 모드에서 카드의 별만 어두워졌고, 같은 4.0 이 카드와 상세
 * 헤더에서 다른 색으로 보였다. "경고 토큰을 별에 쓰는 게 뜻이 어긋난다" 는 것이 그때의
 * 근거였는데, 토큰 이름보다 **한 기능 안에서 같은 값이 한 곳에서 온다**는 것이 먼저다.
 * 이 규칙은 `detail/StarRating.tsx` 헤더와 같은 문장을 공유한다.
 *
 * ## 끄는 동작은 press 가 아니다 (유령 내비게이션)
 *
 * 이 카드는 지도 시트의 `BottomSheetFlatList` 안에 산다. 그 스크롤뷰는
 * react-native-gesture-handler 의 `Gesture.Native()` 에 감싸여 있고, 그 네이티브 제스처가
 * 터치를 가져가도 **RN 의 JS 리스폰더에는 취소가 전달되지 않는다.** 그래서 세로로 스크롤만
 * 했는데 손을 떼는 순간 `onPress` 가 불려 상세가 열렸다(실측 2026-07-31).
 *
 * 그래서 이 컴포넌트는 **누른 지점과 뗀 지점이 같을 때만** press 로 센다. 판정은
 * `utils/pressIntent` 의 `isTapGesture` 한 곳에 있고 WebView 마커 shim 과 같은 8px 이다.
 * 규칙을 여기 인라인으로 적으면 카드·칩·푸터가 각자 다른 임계값을 갖게 된다.
 */

import { memo, useCallback, useRef, useState } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2Icon,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

import { dynamicKey } from "@/src/i18n/dynamicKey"

import type { BookmarkCardDto, RestaurantCardDto } from "../types"
import { cuisineTypeLabelKey } from "../data/filterCatalog"
import {
  cardSafetyBadges,
  cardSafetyNoteKey,
  showsAnalysisPendingChip,
} from "../utils/cardSafetyBadge"
import { formatDistanceKm } from "../utils/distance"
import { isTapGesture, type TapPoint } from "../utils/pressIntent"
import { AddressBlock } from "./AddressBlock"
import { BusinessStatusText } from "./BusinessStatusText"
import { PhotoStrip } from "./PhotoStrip"
import { SafetyBadge } from "./SafetyBadge"

/** 카드 좌우 여백. 사진 스트립의 첫 타일 인셋과 같은 값이어야 줄이 정렬된다. */
import { GUTTER } from "../layout"
const SIDE = GUTTER

const STAR_SIZE = 15
const CHEVRON_SIZE = 16
/** `subtext.large`(줄높이 20) 한 줄을 44 터치 타겟까지 hitSlop 으로 넓힌다. */
const LOCATION_HIT_SLOP = Math.round((touchTarget.min - 20) / 2)

export interface RestaurantCardProps {
  /**
   * `/search` 카드 또는 `저장한 곳` 카드.
   *
   * **두 응답의 모양이 다르다.** 저장한 곳 카드에는 `address`·`jibunAddress`·`zipcode`
   * (주소 펼치기)와 `safety`(안전도 배지)가 없다. 예전에는 둘을 같은 `RestaurantCardDto`
   * 로 선언해 두었고, 그래서 저장한 곳 목록에서는 셰브론이 늘 보이는데 눌러도 빈 블록이
   * 펼쳐졌다. 유니온으로 받으면 타입스크립트가 **없는 필드를 읽는 곳마다** 멈춰 세운다 —
   * 아래 `in` 검사들이 그 결과이고, 지우면 같은 결함이 조용히 돌아온다.
   */
  card: RestaurantCardDto | BookmarkCardDto
  /** 지도 마커 선택과 연동된 하이라이트. */
  selected?: boolean
  onPress?: () => void
  style?: ViewStyle
}

export const RestaurantCard = memo(function RestaurantCard({
  card,
  selected = false,
  onPress,
  style,
}: RestaurantCardProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const [addressOpen, setAddressOpen] = useState(false)

  /**
   * 손가락이 닿은 지점. 뗀 지점과 8px 넘게 다르면 그것은 스크롤이지 탭이 아니다.
   * `null` 은 "좌표를 못 봤다" 이고, 그때는 막지 않는다(`isTapGesture` 주석).
   */
  const pressOriginRef = useRef<TapPoint | null>(null)
  /** 주소 줄은 카드 안의 별도 Pressable 이라 자기 시작점을 따로 들고 있어야 한다. */
  const addressOriginRef = useRef<TapPoint | null>(null)

  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    pressOriginRef.current = touchPoint(event)
  }, [])

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      const origin = pressOriginRef.current
      pressOriginRef.current = null
      if (!isTapGesture(origin, touchPoint(event))) return
      onPress?.()
    },
    [onPress],
  )

  const handleAddressPressIn = useCallback((event: GestureResponderEvent) => {
    addressOriginRef.current = touchPoint(event)
  }, [])

  const toggleAddress = useCallback((event: GestureResponderEvent) => {
    const origin = addressOriginRef.current
    addressOriginRef.current = null
    if (!isTapGesture(origin, touchPoint(event))) return
    setAddressOpen((prev) => !prev)
  }, [])

  const distanceText = formatDistanceKm(card.distanceKm)
  // 거리 · 지역. 둘 다 없으면 줄 자체를 그리지 않는다.
  const locationText = [distanceText, card.shortAddress]
    .filter((part): part is string => Boolean(part))
    .join(" · ")

  // 도로명은 서버 이름이 `address` 다(`roadAddress` 가 아니다). 저장한 곳 카드에는
  // 이 필드 자체가 없으므로 펼칠 것이 없다 — 셰브론도 그리지 않는다.
  const roadAddress = "address" in card ? card.address : null
  const jibunAddress = "jibunAddress" in card ? card.jibunAddress : null
  const zipcode = "zipcode" in card ? card.zipcode : null
  const hasAddressDetail = Boolean(roadAddress || jibunAddress)

  /**
   * 안전도 배지. `safety` 가 없는 목록(저장한 곳)에서는 두 칸 모두 비고, 그게 맞다 —
   * 서버가 그 화면에 개인화 판정을 계산해 주지 않는다(`BookmarkCardDto` 헤더).
   */
  const safety = "safety" in card ? card.safety : null
  const badges = cardSafetyBadges(safety)
  /*
    **아직 우리가 메뉴를 모르는 가게.** 오늘 데이터(강남 376곳)는 전부 분석돼 있어 이
    자리가 뜨지 않지만, 장소를 전국으로 넓히면 대다수가 이 상태가 된다. 그때 배지 자리를
    비워 두면 "이 앱이 확인한 곳" 과 "그냥 지도에 있는 곳" 이 구별되지 않는다 —
    그 구별이 이 제품의 전부다. 판정을 지어내지 않고 **모른다는 사실**만 회색으로 말한다.
  */
  const analysisPending = showsAnalysisPendingChip(safety)

  const ratingLabel =
    card.rating !== null
      ? t("restaurant.detail.ratingAccessibility", {
          rating: card.rating.toFixed(1),
          count: card.reviewCount,
        })
      : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={
        ratingLabel ? `${card.name}, ${ratingLabel}` : card.name
      }
      // 끄는 동작을 press 로 세지 않는다(파일 헤더). `onPress` 를 그대로 넘기지 말 것.
      onPressIn={handlePressIn}
      onPress={onPress ? handlePress : undefined}
      style={({ pressed }) => [
        styles.root,
        {
          backgroundColor: selected
            ? colors.primary.primaryWeak
            : colors.background.default,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[typography.title.xSmall, { color: colors.label.normal }]}
            numberOfLines={1}
          >
            {card.name}
          </Text>
          {/* 등급 배지는 색이 있는 `SafetyBadge` 다. `UNKNOWN`·프로필 없음이면 `level` 이
              `null` 이라 이 자리가 통째로 비고, 회색 배지로도 채우지 않는다. */}
          {badges.level !== null && (
            <SafetyBadge level={badges.level} size="s" />
          )}
          {badges.note !== null && (
            <MetaBadge
              label={t(dynamicKey(cardSafetyNoteKey(badges.note)), {
                count:
                  badges.note.kind === "SAFE_MENU_COUNT"
                    ? badges.note.count
                    : undefined,
                driver:
                  badges.note.kind === "DRIVER"
                    ? t(
                        dynamicKey(
                          `restaurant.safety.driver.${badges.note.driver}`,
                        ),
                      )
                    : undefined,
              })}
            />
          )}
          {analysisPending && (
            <MetaBadge label={t("restaurant.safety.analysisPending")} />
          )}
          <MetaBadge
            label={t(dynamicKey(cuisineTypeLabelKey(card.cuisineType)))}
          />
        </View>

        <View style={styles.statusRow}>
          {card.rating !== null && (
            <View
              accessibilityLabel={ratingLabel ?? undefined}
              style={styles.ratingRow}
            >
              <V2Icon
                name="starFilled"
                size={STAR_SIZE}
                color={colors.status.cautionary}
              />
              <Text
                style={[typography.label.small, { color: colors.label.normal }]}
              >
                {card.rating.toFixed(1)}
              </Text>
              <Text
                style={[
                  typography.subtext.large,
                  { color: colors.label.alternative },
                ]}
              >
                {`(${card.reviewCount.toLocaleString()})`}
              </Text>
            </View>
          )}
          {/* `closeTime`·`openTime` 은 서버 이름 그대로다. 예전 코드는 `closingTime` /
              `nextTransitionAt` 을 읽어 둘 다 `undefined` 였고, 그래서 `영업중` 뒤에
              마감 시각이 늘 비어 있었다.

              `nextTransitionAt` 은 **넘기지 않는다.** 카드 응답에 그 필드가 없다 —
              계약이 요구하는 곳은 E8 `/:id/hours` 와 상세이고, 거기서는 서버가 실제로
              준다. 목록에서 만들려면 가게마다 요일별 영업시간 행을 배치로 읽어야 하는데
              (서버의 카드 응답은 `open_time`/`close_time` 폴백으로 상태를 낸다) 계약이
              요구하지 않는 비용이다. 결과: **카드의 상태 문구는 시간이 지나도 흐려지지
              않는다.** 상세로 들어가면 흐려진다. 없는 값을 기기 시계로 지어내
              `휴무일 21:30까지` 류의 프로토타입 버그를 되살리는 것보다 이 편이 낫다. */}
          <BusinessStatusText
            status={card.businessStatus}
            closingTime={card.closeTime}
            openingTime={card.openTime}
            breakEndTime={"breakEnd" in card ? card.breakEnd : null}
          />
        </View>

        {locationText.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: addressOpen }}
            accessibilityLabel={
              addressOpen
                ? t("restaurant.address.collapse")
                : t("restaurant.address.expand")
            }
            // 주소 상세가 없으면 펼칠 것이 없다 — 셰브론도 빼고 눌리지도 않게 한다.
            disabled={!hasAddressDetail}
            hitSlop={LOCATION_HIT_SLOP}
            onPressIn={handleAddressPressIn}
            onPress={toggleAddress}
            style={({ pressed }) => [
              styles.locationRow,
              pressed && hasAddressDetail && styles.rowPressed,
            ]}
          >
            <Text
              style={[
                typography.subtext.large,
                { color: colors.label.alternative },
              ]}
              numberOfLines={1}
            >
              {locationText}
            </Text>
            {hasAddressDetail && (
              <V2Icon
                name={addressOpen ? "chevronDown" : "chevronRight"}
                size={CHEVRON_SIZE}
                color={colors.label.assistive}
              />
            )}
          </Pressable>
        )}

        {addressOpen && hasAddressDetail && (
          <AddressBlock
            roadAddress={roadAddress}
            jibunAddress={jibunAddress}
            zipcode={zipcode}
            style={styles.address}
          />
        )}
      </View>

      {/* 사진은 누를 수 없다 — 카드 어디를 눌러도 상세로 간다는 규칙이 하나로 남는다.
          근거는 `PhotoStrip` 헤더에 있다. */}
      <PhotoStrip
        urls={card.imageUrls}
        name={card.name}
        insetLeft={SIDE}
        cuisineType={card.cuisineType}
        style={styles.photos}
      />
    </Pressable>
  )
})

/**
 * 터치 이벤트에서 화면 좌표를 꺼낸다.
 *
 * `pageX`/`pageY` 를 쓰는 이유: `locationX` 는 **누른 뷰 기준**이라 목록이 스크롤되면
 * 같은 손가락 위치가 다른 값이 된다. 시작점과 끝점을 비교하는 데 쓸 수 없다.
 * 값이 없는 이벤트(합성 이벤트)면 `null` 을 돌려주고, 그때는 판정을 하지 않는다.
 */
function touchPoint(event: GestureResponderEvent): TapPoint | null {
  const native = event?.nativeEvent
  if (!native) return null
  const { pageX, pageY } = native
  if (typeof pageX !== "number" || typeof pageY !== "number") return null
  return { x: pageX, y: pageY }
}

/**
 * 보조·음식종류 배지. 회색 면 + 회색 글자, pill. 목업의 `[저단백] [한식]` 자리다.
 *
 * 여기 들어오는 문구는 `안전 메뉴 3개` / `나트륨 기준` / `한식` 처럼 **사실**이다.
 * 회색을 쓰는 이유가 있다 — 등급(제한/주의/안전)만 색을 갖고, 색이 뜻을 나르는 자리는
 * 카드에 하나뿐이어야 한다. 배지 두 개가 서로 다른 색을 가지면 사용자는 어느 색이
 * "가도 되는 곳" 을 뜻하는지 판단하려 한다.
 */
function MetaBadge({ label }: { label: string }) {
  const { colors } = useV2Theme()
  return (
    <View style={[styles.metaBadge, { backgroundColor: colors.fill.normal }]}>
      <Text style={[typography.caption.small, { color: colors.label.neutral }]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  // 좌우 패딩을 root 가 갖지 않는다 — 사진 스트립이 full-bleed 로 스크롤돼야 한다.
  root: { paddingTop: spacing[16], paddingBottom: spacing[16] },
  pressed: { opacity: 0.9 },
  body: { paddingHorizontal: SIDE, gap: spacing[6] },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    // 상호명이 길면 배지가 다음 줄로 내려간다. 배지를 잘라 버리지 않는다.
    flexWrap: "wrap",
    gap: spacing[6],
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    // 셰브론은 텍스트 바로 뒤에 붙는다(목업). 오른쪽 끝으로 밀지 않는다.
    alignSelf: "flex-start",
  },
  rowPressed: { opacity: 0.6 },
  address: { marginTop: spacing[2] },
  photos: { marginTop: spacing[12] },
  metaBadge: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
})
