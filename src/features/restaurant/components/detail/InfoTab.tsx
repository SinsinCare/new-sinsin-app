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
 */

import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  spacing,
  typography,
  useV2Theme,
  V2Badge,
  V2Icon,
  type V2IconName,
} from "@/src/design-system-v2"

import { CARD_GAP } from "../../layout"
import type { Amenity, RestaurantDetailDto } from "../../types"
import { DetailCard } from "./DetailCard"
import { DetailSection } from "./DetailSection"
import { normalizeHttpsUrl } from "@/src/shared/utils/externalUrl"

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
    세 덩어리를 **면**으로 묶는다.

    예전에는 섹션 사이에 머리카락 선(`V2Divider tone="alternative"`)만 있었다. 선은
    "여기가 끝" 을 말하지만 "이 아이콘 여섯 개가 한 주제" 를 말하지 못해서, 편의시설
    격자와 주차 한 줄과 SNS 링크가 같은 무게로 흩어져 보였다. 카드로 묶으면서 선은
    지웠다 — 면과 선을 함께 쓰면 한 경계가 두 번 그어진다.
  */
  return (
    <View>
      <DetailSection
        title={t("restaurant.amenity.title")}
        style={styles.section}
      >
        <DetailCard>
          {detail.amenities.length === 0 ? (
            <Text
              style={[
                typography.subtext.large,
                { color: colors.label.assistive },
              ]}
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
                  >
                    {t(`restaurant.amenity.${amenity}`)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </DetailCard>
      </DetailSection>

      <DetailSection
        title={t("restaurant.parking.title")}
        style={styles.section}
      >
        <DetailCard>
          {parking.note && (
            <Text
              style={[
                typography.subtext.large,
                styles.parkingNote,
                { color: colors.label.neutral },
              ]}
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
              style={[
                typography.label.smallWeak,
                { color: colors.label.normal },
              ]}
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
        </DetailCard>
      </DetailSection>

      {hasSns && (
        <DetailSection title={t("restaurant.sns.title")} style={styles.section}>
          <DetailCard>
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
          </DetailCard>
        </DetailSection>
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
        if (target) void Linking.openURL(target)
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
    카드가 이미 면으로 끊고 있으므로 섹션의 위아래 여백을 `SECTION_GAP`(20) 에서
    `CARD_GAP`(12) 로 좁힌다. 그대로 두면 카드 사이가 화면 여백만큼 벌어져
    세 덩어리가 서로 다른 화면처럼 흩어진다.
  */
  section: { paddingVertical: CARD_GAP },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing[20] },
  // 4열. 고정 폭이 아니라 25% 라 화면 폭이 바뀌어도 열 수가 유지된다.
  gridCell: {
    width: "25%",
    alignItems: "center",
    gap: spacing[6],
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
