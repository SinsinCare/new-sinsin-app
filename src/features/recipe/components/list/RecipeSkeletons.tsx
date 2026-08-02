/**
 * 레시피 목록·캐러셀의 로딩 자리표시.
 *
 * 치수를 새로 정하지 않는다 — `recipeRowLayout.ts` 와 `RecipePhotoCard` 가 이미 줄 높이
 * (96), 썸네일 한 변(72), 캐러셀 카드 폭(152)을 못 박아 두었고 여기서는 그 상수를
 * 그대로 들여온다. 스켈레톤이 자체 숫자를 가지면 카드 치수를 바꾸는 날 로딩만 어긋난다.
 */

import { memo } from "react"
import { ScrollView, StyleSheet, View } from "react-native"

import { GUTTER, V2Skeleton, V2SkeletonGroup } from "@/src/design-system-v2"

import {
  RECIPE_PHOTO_CARD_GAP,
  RECIPE_PHOTO_CARD_WIDTH,
} from "./RecipePhotoCard"
import {
  RECIPE_ROW_HEIGHT,
  RECIPE_ROW_PAD_V,
  RECIPE_ROW_THUMB,
  RECIPE_ROW_THUMB_GAP,
} from "./recipeRowLayout"

/** 캐러셀 카드의 사진 우물 — 4:3 (RecipePhotoCard 의 carousel 기하와 같다). */
const CARD_PHOTO_HEIGHT = Math.round((RECIPE_PHOTO_CARD_WIDTH * 3) / 4)

/** 목록 줄 하나. 실제 줄과 높이가 같아 도착해도 스크롤이 밀리지 않는다. */
export const RecipeRowSkeleton = memo(function RecipeRowSkeleton() {
  return (
    <View style={styles.row}>
      <V2Skeleton
        width={RECIPE_ROW_THUMB}
        height={RECIPE_ROW_THUMB}
        radius="lg"
      />
      <View style={styles.rowText}>
        <V2Skeleton width="58%" height={17} />
        <V2Skeleton width="76%" height={13} />
        <V2Skeleton width="40%" height={13} />
      </View>
    </View>
  )
})

export interface RecipeListSkeletonProps {
  /** 기본 5줄 — 390pt 화면의 첫 스크린을 채우는 최소치. 더 그리면 낭비다. */
  count?: number
}

export function RecipeListSkeleton({ count = 5 }: RecipeListSkeletonProps) {
  return (
    <V2SkeletonGroup style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <RecipeRowSkeleton key={index} />
      ))}
    </V2SkeletonGroup>
  )
}

export interface RecipeCarouselSkeletonProps {
  /** 화면에 걸치는 카드 수. 기본 3 (두 장 + 셋째의 일부). */
  count?: number
}

/** 섹션의 가로 캐러셀 자리. 스크롤은 막아 둔다 — 빈 카드를 밀어 볼 이유가 없다. */
export function RecipeCarouselSkeleton({
  count = 3,
}: RecipeCarouselSkeletonProps) {
  return (
    <V2SkeletonGroup>
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {Array.from({ length: count }, (_, index) => (
          <View key={index} style={styles.card}>
            <V2Skeleton height={CARD_PHOTO_HEIGHT} radius="2xl" />
            <V2Skeleton width="82%" height={15} />
            <V2Skeleton width="54%" height={13} />
          </View>
        ))}
      </ScrollView>
    </V2SkeletonGroup>
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: GUTTER },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: RECIPE_ROW_THUMB_GAP,
    paddingVertical: RECIPE_ROW_PAD_V,
    height: RECIPE_ROW_HEIGHT,
  },
  rowText: { flex: 1, gap: 8 },
  rail: { paddingHorizontal: GUTTER, gap: RECIPE_PHOTO_CARD_GAP },
  card: { width: RECIPE_PHOTO_CARD_WIDTH, gap: 8 },
})
