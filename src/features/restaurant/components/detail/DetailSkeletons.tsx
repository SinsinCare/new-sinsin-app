/**
 * 식당 상세 탭들의 로딩 자리표시.
 *
 * 세 탭(메뉴/후기/사진)이 모두 `V2LoadingState` 한 줄 — 화면 가운데 점 몇 개 — 로 기다렸다.
 * 탭 전환은 자주 일어나는 동작이라 그 순간마다 콘텐츠가 사라지고 가운데로 모였다가
 * 다시 펼쳐지는 것이 눈에 띈다. 탭마다 자기 모양을 미리 그려 두면 전환이 "채워지는" 것으로
 * 보인다.
 *
 * 치수는 각 탭이 실제로 쓰는 값에서 **가져온다**. 눈대중으로 잡으면 도착 순간 어긋난다.
 *
 * ## 숫자를 베끼지 말고 import 할 것
 *
 * 이 머리말은 한동안 `메뉴 썸네일 88×72` 라고 적혀 있었고 아래 상수도 그랬다. 그 사이
 * `MenuRow` 의 썸네일은 정사각 86 으로 바뀌었고(시안 C1_2 실측), 스켈레톤만 옛 치수로
 * 남아 로딩→도착 순간 가로 2pt·세로 14pt 가 튀었다 — 이 파일이 존재하는 이유를 정확히
 * 위반한 것이다. 그래서 메뉴 썸네일은 `MenuRow` 가 export 하는 값을 그대로 쓴다.
 * 아직 미러인 것(후기 아바타 40 · 사진 2열)도 같은 방식으로 옮길 것.
 */

import { StyleSheet, View, useWindowDimensions } from "react-native"

import {
  V2Skeleton,
  V2SkeletonCircle,
  V2SkeletonGroup,
  V2SkeletonText,
  spacing,
} from "@/src/design-system-v2"

import { GUTTER } from "../../layout"
import { THUMBNAIL as MENU_THUMBNAIL } from "./MenuRow"

/** ReviewCard 의 아바타 (ReviewCard.tsx AVATAR_SIZE) */
const REVIEW_AVATAR = 40
/** PhotoTab 의 격자 (COLUMNS · GAP) */
const PHOTO_COLUMNS = 2
const PHOTO_GAP = spacing[4]
/** 세로로 길고 짧은 타일이 섞여야 masonry 로 보인다 — 실제 사진 비율의 분포를 흉내 낸다. */
const PHOTO_TILE_RATIOS = [1.25, 0.82, 0.95, 1.4, 1.1, 0.9]

export interface MenuTabSkeletonProps {
  /** 기본 4줄 */
  count?: number
}

export function MenuTabSkeleton({ count = 4 }: MenuTabSkeletonProps) {
  return (
    <V2SkeletonGroup style={styles.container}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.menuRow}>
          <View style={styles.menuBody}>
            <V2Skeleton width="52%" height={16} />
            <V2Skeleton width={68} height={14} />
            <V2Skeleton width="80%" height={13} />
          </View>
          <V2Skeleton
            width={MENU_THUMBNAIL}
            height={MENU_THUMBNAIL}
            radius="sm"
          />
        </View>
      ))}
    </V2SkeletonGroup>
  )
}

export interface ReviewTabSkeletonProps {
  /** 기본 3건 */
  count?: number
}

export function ReviewTabSkeleton({ count = 3 }: ReviewTabSkeletonProps) {
  return (
    <V2SkeletonGroup style={styles.container}>
      {/* 별점 요약 줄 */}
      <View style={styles.summary}>
        <V2Skeleton width={64} height={32} />
        <V2Skeleton width="46%" height={14} />
      </View>

      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.reviewCard}>
          <View style={styles.reviewHead}>
            <V2SkeletonCircle size={REVIEW_AVATAR} />
            <View style={styles.reviewAuthor}>
              <V2Skeleton width="42%" height={14} />
              <V2Skeleton width={72} height={12} />
            </View>
          </View>
          <V2SkeletonText lines={2} lineHeight={14} />
          <View style={styles.reviewPhotos}>
            {[0, 1, 2].map((cell) => (
              <View key={cell} style={styles.reviewPhotoCell}>
                <V2Skeleton height={96} radius="sm" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </V2SkeletonGroup>
  )
}

/** 2열 masonry. 타일 높이를 실제처럼 들쭉날쭉하게 둬야 도착 후 배치가 크게 안 바뀐다. */
export function PhotoTabSkeleton() {
  const { width } = useWindowDimensions()
  const columnWidth =
    (width - GUTTER * 2 - PHOTO_GAP * (PHOTO_COLUMNS - 1)) / PHOTO_COLUMNS

  return (
    <V2SkeletonGroup style={styles.masonry}>
      {Array.from({ length: PHOTO_COLUMNS }, (_, column) => (
        <View key={column} style={styles.masonryColumn}>
          {PHOTO_TILE_RATIOS.filter(
            (_, index) => index % PHOTO_COLUMNS === column,
          ).map((ratio, index) => (
            <V2Skeleton
              key={index}
              width={columnWidth}
              height={Math.round(columnWidth * ratio)}
              radius="sm"
            />
          ))}
        </View>
      ))}
    </V2SkeletonGroup>
  )
}

/** 상세 화면 첫 진입. 사진 히어로 + 제목 블록 + 정보 줄. */
export function RestaurantDetailSkeleton() {
  const { width } = useWindowDimensions()

  return (
    <V2SkeletonGroup style={styles.detail}>
      <V2Skeleton width={width} height={Math.round(width * 0.62)} radius="xs" />
      <View style={styles.detailBody}>
        <V2Skeleton width="62%" height={24} />
        <V2Skeleton width="44%" height={15} />
        <V2Skeleton width="34%" height={15} />
        <View style={styles.detailPills}>
          {[0, 1, 2].map((index) => (
            <V2Skeleton key={index} width={88} height={36} radius="full" />
          ))}
        </View>
        <V2SkeletonText lines={3} lineHeight={15} style={styles.detailText} />
      </View>
    </V2SkeletonGroup>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: GUTTER },
  menuRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
    paddingVertical: spacing[16],
  },
  menuBody: { flex: 1, gap: spacing[6] },

  summary: { gap: spacing[8], paddingVertical: spacing[20] },
  reviewCard: { gap: spacing[10], paddingVertical: spacing[20] },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: spacing[10] },
  reviewAuthor: { flex: 1, gap: spacing[6] },
  reviewPhotos: { flexDirection: "row", gap: spacing[4] },
  reviewPhotoCell: { flex: 1 },

  masonry: {
    flexDirection: "row",
    gap: PHOTO_GAP,
    paddingHorizontal: GUTTER,
    paddingTop: spacing[12],
  },
  masonryColumn: { gap: PHOTO_GAP, flex: 1 },

  detail: { flex: 1 },
  detailBody: { paddingHorizontal: GUTTER, paddingTop: spacing[20], gap: 10 },
  detailPills: {
    flexDirection: "row",
    gap: spacing[8],
    marginTop: spacing[8],
  },
  detailText: { marginTop: spacing[16] },
})
