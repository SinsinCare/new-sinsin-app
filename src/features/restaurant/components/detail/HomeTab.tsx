/**
 * 홈 탭 (목업 -9 / -18 / -19 / -20).
 *
 * 순서: 정보 요약 → 메뉴 3개 → 사진 6칸 + `사진 전체보기` → 후기 요약 + 3개 + `후기 더보기`.
 *
 * ## 왜 여기서 사진·후기를 각자 조회하는가
 *
 * 홈 탭은 목업 그대로 사진과 후기를 미리 보여 준다. 그 조회를 **기본 조건**으로 하면
 * (사진 `ALL`, 후기 `LATEST` + 필터 없음) 사진 탭·후기 탭의 초기 상태와 쿼리 키가
 * 같아져 탭을 옮겨도 요청이 다시 나가지 않는다. 상세 화면으로 상태를 끌어올려
 * 두 탭이 공유하게 만들면 필터를 건 뒤 홈 탭에 돌아왔을 때 홈 탭이 필터 걸린
 * 목록을 보여 준다 — 그쪽이 더 나쁘다.
 *
 * ## 미리보기에도 면책이 붙는다
 *
 * 홈 탭의 메뉴 세 줄에도 개인화 배지(`제한`/`주의`/`안전`)와 숫자 근거가 그대로 나온다.
 * 그런데 여기에는 오래도록 어떤 면책도 없었다 — 메뉴 탭까지 가지 않은 사용자는
 * 추정 분석을 검수된 사실로 읽게 된다. 판정이 있는 곳이면 근거(`한 끼 기준`)와
 * 의료 면책이 함께 있어야 한다. 지우지 말 것.
 *
 * ## 미리보기의 실패를 화면 전체의 실패로 만들지 않는다
 *
 * 사진이나 후기 조회가 실패해도 정보 요약과 메뉴는 이미 있다. 그래서 실패한 섹션만
 * 조용히 빼고 나머지를 그린다 — 여기서 `V2ErrorState` 를 띄우면 사진 하나 때문에
 * 주소와 영업시간이 사라진다. 전용 탭에서는 같은 실패가 재시도 버튼으로 드러난다.
 */

import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  radius,
  spacing,
  typography,
  useV2Theme,
  V2Divider,
  V2Icon,
} from "@/src/design-system-v2"

import { GUTTER, SECTION_GAP } from "../../layout"
import { useRestaurantReviews } from "../../hooks/useRestaurantReviews"
import { useRestaurantPhotos } from "../../hooks/useRestaurantPhotos"
import type { MenuItemDto, PhotoDto, RestaurantDetailDto } from "../../types"
import { menuConfidenceMode } from "../../utils/menuSafetyEvidence"
import { reviewPhotos } from "./reviewPhotos"
import { DetailCard } from "./DetailCard"
import { DetailInfoRows } from "./DetailInfoRows"
import { DetailSection } from "./DetailSection"
import { MenuRow } from "./MenuRow"
import { OutlinePill } from "./OutlinePill"
import { ProfileMissingNotice } from "./ProfileMissingNotice"
import { RatingBreakdown } from "./RatingBreakdown"
import { ReviewCard } from "./ReviewCard"
import { ReviewWritePrompt } from "./ReviewWritePrompt"

/** 미리보기 개수. 목업 §4.2 그대로. */
const PREVIEW = { menus: 3, photos: 6, reviews: 3 } as const

/** 사진 미리보기 격자. 3열 × 2행 = 6칸. */
const PHOTO_COLUMNS = 3
const PHOTO_GAP = spacing[4]

export interface HomeTabProps {
  restaurantId: number
  detail: RestaurantDetailDto
  /** 이미 상세 화면이 조회해 둔 메뉴. 여기서 다시 요청하지 않는다. */
  menus: MenuItemDto[]
  menusProfileMissing: boolean
  /** 메뉴 탭으로. 섹션 제목과 하단 pill 이 같은 곳으로 간다. */
  onSeeAllMenus: () => void
  onSeeAllPhotos: () => void
  onSeeAllReviews: () => void
  onWriteReview?: () => void
  onOpenPhotos?: (photos: PhotoDto[], index: number) => void
  onPressReviewAuthor?: (reviewerId: number) => void
}

export function HomeTab({
  restaurantId,
  detail,
  menus,
  menusProfileMissing,
  onSeeAllMenus,
  onSeeAllPhotos,
  onSeeAllReviews,
  onWriteReview,
  onOpenPhotos,
  onPressReviewAuthor,
}: HomeTabProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const { width } = useWindowDimensions()

  const { photos } = useRestaurantPhotos(restaurantId, "ALL")
  const { reviews, breakdown } = useRestaurantReviews({ restaurantId })

  const previewMenus = menus.slice(0, PREVIEW.menus)
  // 신뢰도 표기는 **화면에 보이는 세 줄**을 기준으로 판단한다. 전체 목록이 섞여 있어도
  // 미리보기 세 줄이 전부 추정이면 여기서 행마다 붙일 이유가 없다.
  const previewConfidence = menuConfidenceMode(previewMenus)
  const previewPhotos = photos.slice(0, PREVIEW.photos)
  const previewReviews = reviews.slice(0, PREVIEW.reviews)

  const photoSize =
    (width - GUTTER * 2 - PHOTO_GAP * (PHOTO_COLUMNS - 1)) / PHOTO_COLUMNS

  return (
    <View>
      {/* 영업시간·주소·전화·링크는 한 주제다. 선이 아니라 둥근 면으로 묶는다. */}
      <View style={styles.infoBlock}>
        <DetailCard>
          <DetailInfoRows restaurantId={restaurantId} detail={detail} />
        </DetailCard>
      </View>

      {previewMenus.length > 0 && (
        <>
          <V2Divider variant="thick" />
          <DetailSection
            title={t("restaurant.detail.menuSection")}
            count={
              detail.menuCount > 0
                ? t("restaurant.detail.menus", { count: detail.menuCount })
                : null
            }
            onPress={onSeeAllMenus}
          >
            {menusProfileMissing && (
              <ProfileMissingNotice style={styles.notice} />
            )}
            {previewMenus.map((menu, index) => (
              <View key={menu.menuId}>
                {index > 0 && <V2Divider tone="alternative" />}
                <MenuRow
                  menu={menu}
                  profileMissing={menusProfileMissing}
                  showConfidence={previewConfidence === "MIXED"}
                />
              </View>
            ))}
            {/* 판정이 있으면 근거의 기준과 의료 면책이 함께 있어야 한다(헤더 참고). */}
            {!menusProfileMissing && (
              <View style={styles.menuFootnote}>
                <Text
                  style={[
                    typography.subtext.medium,
                    { color: colors.label.assistive },
                  ]}
                >
                  {t("restaurant.safety.mealBasis")}
                </Text>
                <Text
                  style={[
                    typography.subtext.small,
                    { color: colors.label.assistive },
                  ]}
                >
                  {t("restaurant.safety.disclaimer")}
                </Text>
              </View>
            )}
            {menus.length > previewMenus.length && (
              <View style={styles.pillRow}>
                <OutlinePill
                  label={t("restaurant.detail.seeAllMenus")}
                  showChevron
                  onPress={onSeeAllMenus}
                />
              </View>
            )}
          </DetailSection>
        </>
      )}

      {previewPhotos.length > 0 && (
        <>
          <V2Divider variant="thick" />
          <DetailSection title={t("restaurant.detail.photoSection")}>
            <View style={styles.photoGrid}>
              {previewPhotos.map((photo, index) => (
                <Pressable
                  key={photo.photoId}
                  disabled={!onOpenPhotos}
                  onPress={() => onOpenPhotos?.(photos, index)}
                  accessibilityRole="imagebutton"
                  accessibilityState={{ disabled: !onOpenPhotos }}
                  accessibilityLabel={t("restaurant.photoAccessibility", {
                    name: detail.name,
                    number: index + 1,
                  })}
                  style={({ pressed }) => [pressed && styles.pressedCard]}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={[
                      styles.photoTile,
                      {
                        width: photoSize,
                        height: photoSize,
                        backgroundColor: colors.fill.alternative,
                      },
                    ]}
                    contentFit="cover"
                    transition={120}
                  />
                  {photo.isVideo && (
                    <View
                      style={[
                        styles.playBadge,
                        { backgroundColor: colors.background.dim },
                      ]}
                    >
                      <V2Icon
                        name="playCircle"
                        size={iconSize.sm}
                        color={colors.static.white}
                      />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
            <View style={styles.pillRow}>
              <OutlinePill
                label={t("restaurant.detail.seeAllPhotos")}
                showChevron
                onPress={onSeeAllPhotos}
              />
            </View>
          </DetailSection>
        </>
      )}

      {breakdown && (
        <>
          <V2Divider variant="thick" />
          <DetailSection
            title={t("restaurant.detail.reviewSection")}
            count={breakdown.totalCount.toLocaleString("ko-KR")}
            onPress={onSeeAllReviews}
          >
            {onWriteReview && (
              <ReviewWritePrompt
                restaurantName={detail.name}
                onPress={onWriteReview}
                style={styles.writeRow}
              />
            )}
            <RatingBreakdown
              breakdown={breakdown}
              style={styles.breakdownInset}
            />
            {previewReviews.map((review, index) => (
              <View key={review.reviewId}>
                {index > 0 && <V2Divider tone="alternative" />}
                <ReviewCard
                  review={review}
                  onPressAuthor={onPressReviewAuthor}
                  onPressPhoto={
                    onOpenPhotos
                      ? (target, photoIndex) =>
                          onOpenPhotos(reviewPhotos(target), photoIndex)
                      : undefined
                  }
                />
              </View>
            ))}
            {previewReviews.length > 0 && (
              <View style={styles.pillRow}>
                <OutlinePill
                  label={t("restaurant.review.seeMore")}
                  showChevron
                  onPress={onSeeAllReviews}
                />
              </View>
            )}
          </DetailSection>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  infoBlock: { paddingHorizontal: GUTTER, paddingVertical: SECTION_GAP },
  notice: { marginBottom: spacing[8] },
  menuFootnote: { gap: spacing[6], paddingTop: spacing[16] },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: PHOTO_GAP },
  /*
    로드 전에 **자리를 회색으로 잡아 둔다.** 없으면 이미지가 도착할 때까지 배경색이
    비쳐 격자가 깜빡이고, 사진마다 도착 시각이 달라 화면이 들썩인다. `transition` 은
    도착 순간의 팝을 없애는 최소치다(형제인 후기 카드·히어로 캐러셀도 같은 값).
  */
  photoTile: { borderRadius: radius.sm },
  playBadge: {
    position: "absolute",
    top: spacing[6],
    right: spacing[6],
    padding: spacing[4],
    borderRadius: radius.full,
  },
  pillRow: { alignItems: "center", paddingTop: spacing[16] },
  writeRow: { paddingBottom: spacing[8] },
  // 평점 분해는 자기 좌우 여백을 갖고 있어(후기 탭에서 full-bleed) 섹션 안에서는 상쇄한다.
  breakdownInset: { paddingHorizontal: 0 },
  pressedCard: { opacity: 0.9 },
})
