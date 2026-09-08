import { openRestaurantLink } from "../../utils/openRestaurantLink"
import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 정보 탭 (목업 -13). 편의시설 4열 그리드 → 주차 → SNS.
 *
 * ## 없는 것을 "없다" 고 말한다
 *
 * `amenities` 는 CSV 컬럼이고 오늘 시드 데이터에는 비어 있다. 빈 배열일 때 4열 격자만
 * 남기면 "로딩이 안 됐다" 로 읽히므로 한 줄로 명시한다. 주차도 같다 —
 * `parking.available` 이 `null` 인 것은 "주차가 없다" 가 아니라 **모른다** 는 뜻이라
 * 문구를 따로 둔다(`주차 정보가 없어요`). 세 상태를 두 상태로 접지 않는다.
 *
 * ## 4열을 고정폭으로 만들지 않는다
 *
 * `남/녀 화장실 구분` 은 두 줄로 접힌다(목업도 그렇다). 칸을 고정 높이로 잡으면
 * Dynamic Type 을 키운 사용자에게서 라벨이 잘린다. `flexBasis: 25%` + 줄바꿈 허용으로
 * 칸 높이가 내용에 따라 늘어나게 둔다.
 *
 * ## 4열은 **화면 전폭**을 넷으로 나눈 것이다 (2026-08-20 시안 실측)
 *
 * 시안(D7_1) 3배 렌더에서 각 칸의 라벨 중심을 재면 `46.83 · 140.83 · 234.83 · 328.83`
 * 이고 간격이 94.0 으로 일정하다. 좌우 여백 g 를 두고 (375-2g)/4 로 나눴다면 첫 칸
 * 중심이 `g/4 + 46.875` 라 g=0 일 때만 실측과 맞는다 — 즉 **격자는 여백 없이 전폭**이다.
 * 그래서 섹션의 좌우 여백을 음수 마진으로 되돌린다. 전폭이라 우리 `GUTTER`(16)와
 * 시안의 여백(20)이 달라도 칸 중심이 시안과 정확히 같아진다(93.75 간격).
 */

import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  spacing,
  typography,
  useV2Theme,
  V2Badge,
  V2Divider,
  V2Icon,
  type V2IconName,
} from "@/src/design-system-v2"

import { GUTTER } from "../../layout"
import type { Amenity, RestaurantDetailDto } from "../../types"
import { DetailSection } from "./DetailSection"
import { normalizeHttpsUrl } from "@/src/shared/utils/externalUrl"

/**
 * 이 탭의 섹션 제목 크기. **홈 탭보다 한 단계 작다** (2026-08-20 시안 D7_1 3배 렌더).
 *
 * `편의시설 및 서비스` 의 한글 음절 이송이 39px(=13.0pt)이라 0.864em 으로 나누면 15pt 다
 * (17 이면 44px 여야 한다). `주차` 도 같고, 잉크 높이 40px 는 홈 탭 `메뉴` 의 46px 와
 * 정확히 17:15 비율이다. 세로획은 5px 대 6px 로 굵기는 둘 다 Bold → `label.smallStrong`.
 *
 * 공용 `DetailSection` 의 기본값을 내리지 않고 여기서만 넘기는 이유는 그 파일 머리말에.
 */
const SECTION_TITLE = typography.label.smallStrong

/**
 * 편의시설 → v2 아이콘. 목업 -13 의 6종과 1:1 이고, 새 토큰이 서버에서 오면
 * 여기에 한 줄만 추가하면 된다(화면 코드는 손대지 않는다).
 */
const AMENITY_ICON = {
  RESERVATION: "reservation",
  RESTROOM_GENDERED: "restroom",
  WIFI: "wifi",
  GROUP_SEAT: "groupSeat",
  BABY_CHAIR: "babyChair",
  PRIVATE_ROOM: "privateRoom",
} as const satisfies Record<Amenity, V2IconName>

export interface InfoTabProps {
  detail: RestaurantDetailDto
}

export function InfoTab({ detail }: InfoTabProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  const parking = detail.parking
  const hasSns = Boolean(
    detail.instagramUrl || detail.youtubeUrl || detail.blogUrl,
  )

  /*
    세 덩어리를 **전폭 머리카락 선**으로 끊는다 (2026-08-20 시안 D7_1·D7_2).

    앞 판본은 셋을 각각 `DetailCard`(회색 면)로 묶었다. 그 판단이 고치려던 문제는
    "선이 덩어리를 말하지 못한다" 였고 관찰은 옳았지만, 시안을 3배 렌더에서 재 보면
    이 탭의 경계는 면이 아니라 선이다 — 주차와 SNS 사이에 x 전 구간이 균일한
    `rgb(244,244,245)` 3px(=1.00pt) 줄이 있고(D7_1 y 1407–1409 · D7_2 y 348–350),
    그 색은 `over(line.alternative, background.default)` 와 정확히 같다
    (`restaurantDetailDensity.test.ts` 가 이미 같은 값을 하단 바 선으로 못 박아 두었다).

    시안은 편의시설↔주차 사이만 선 없이 61pt 여백으로 끊는다. **그 예외는 따르지
    않는다** — 같은 뜻(다음 섹션)을 두 장치로 그리면 "편의시설과 주차는 한 덩어리"
    라는 없는 뜻이 생기고, 무엇보다 오늘 시드 데이터는 `amenities` 가 비어 있어서
    (머리말 참고) 그 여백이 한 줄짜리 안내문으로 쪼그라든다. 여백에 경계를 맡기면
    바로 그 날 경계가 사라진다.
  */
  return (
    <View>
      <DetailSection
        title={t("restaurant.amenity.title")}
        titleStyle={SECTION_TITLE}
      >
        {detail.amenities.length === 0 ? (
          <Text
            style={[
              typography.subtext.large,
              { color: colors.label.assistive },
            ]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("restaurant.amenity.empty")}
          </Text>
        ) : (
          <View style={styles.grid}>
            {detail.amenities.map((amenity) => (
              <View key={amenity} style={styles.gridCell}>
                <V2Icon
                  name={AMENITY_ICON[amenity]}
                  size={iconSize.md}
                  color={colors.label.normal}
                />
                <Text
                  style={[
                    typography.subtext.small,
                    styles.gridLabel,
                    { color: colors.label.neutral },
                  ]}
                  lineBreakStrategyIOS="hangul-word"
                  textBreakStrategy="balanced"
                >
                  {t(`restaurant.amenity.${amenity}`)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </DetailSection>

      <V2Divider tone="alternative" />

      <DetailSection
        title={t("restaurant.parking.title")}
        titleStyle={SECTION_TITLE}
      >
        {parking.note && (
          <Text
            style={[
              typography.subtext.large,
              styles.parkingNote,
              { color: colors.label.neutral },
            ]}
            lineBreakStrategyIOS="hangul-word"
          >
            {parking.note}
          </Text>
        )}
        <View style={styles.parkingRow}>
          <V2Icon
            name="parking"
            size={iconSize.sm}
            color={colors.label.normal}
          />
          <Text
            style={[typography.label.smallWeak, { color: colors.label.normal }]}
          >
            {parking.available === null
              ? t("restaurant.parking.unknown")
              : parking.available
                ? t("restaurant.parking.available")
                : t("restaurant.parking.unavailable")}
          </Text>
          {parking.available === true && parking.free !== null && (
            <V2Badge size="s" color="neutral" variant="weak">
              {parking.free
                ? t("restaurant.parking.free")
                : t("restaurant.parking.paid")}
            </V2Badge>
          )}
        </View>
      </DetailSection>

      {hasSns && (
        <>
          <V2Divider tone="alternative" />
          <DetailSection
            title={t("restaurant.sns.title")}
            titleStyle={SECTION_TITLE}
          >
            <View style={styles.snsList}>
              {detail.instagramUrl && (
                <SnsLink
                  icon="instagram"
                  label={t("restaurant.sns.instagram")}
                  url={detail.instagramUrl}
                />
              )}
              {detail.youtubeUrl && (
                <SnsLink
                  icon="youtube"
                  label={t("restaurant.sns.youtube")}
                  url={detail.youtubeUrl}
                />
              )}
              {detail.blogUrl && (
                <SnsLink
                  icon="blog"
                  label={t("restaurant.sns.blog")}
                  url={detail.blogUrl}
                />
              )}
            </View>
          </DetailSection>
        </>
      )}
    </View>
  )
}

function SnsLink({
  icon,
  label,
  url,
}: {
  icon: V2IconName
  label: string
  url: string
}) {
  const { colors } = useV2Theme()
  const target = normalizeHttpsUrl(url)
  return (
    <Pressable
      onPress={() => {
        void openRestaurantLink(target)
      }}
      accessibilityRole="link"
      accessibilityState={{ disabled: !target }}
      disabled={!target}
      accessibilityLabel={label}
      hitSlop={spacing[8]}
      style={({ pressed }) => [styles.snsRow, pressed && styles.pressed]}
    >
      <V2Icon name={icon} size={iconSize.sm} color={colors.label.normal} />
      <Text
        style={[
          typography.subtext.large,
          styles.link,
          { color: colors.label.normal },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  /*
    ── `section` 키가 없는 이유 ──
    섹션 위아래 여백은 `DetailSection` 기본값(`SECTION_GAP` 20)을 그대로 쓴다.
    앞 판본은 `CARD_GAP`(12) 로 좁혔는데, 그 이유("카드가 이미 면으로 끊고 있으므로")가
    카드와 함께 사라졌다. 시안 실측도 20 언저리다 — 탭 바 선→편의시설 제목 상자 16,
    주차 마지막 줄→선 19, 선→SNS 제목 상자 25.
  */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing[12],
    // 격자는 전폭이다(머리말). 섹션의 좌우 여백을 여기서만 되돌린다.
    marginHorizontal: -GUTTER,
  },
  // 4열. 고정 폭이 아니라 25% 라 화면 폭이 바뀌어도 열 수가 유지된다.
  gridCell: {
    width: "25%",
    alignItems: "center",
    // 아이콘 상자 아래 8. 시안 실측: 아이콘 상자 바닥 213.0 → 라벨 상자 머리 221.5.
    gap: spacing[8],
    paddingHorizontal: spacing[2],
  },
  gridLabel: { textAlign: "center" },
  parkingNote: { marginBottom: spacing[12] },
  parkingRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  snsList: { gap: spacing[12] },
  snsRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  link: { textDecorationLine: "underline" },
  pressed: { opacity: 0.85 },
})
