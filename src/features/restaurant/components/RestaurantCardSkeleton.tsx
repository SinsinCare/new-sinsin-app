import { StyleSheet, View } from "react-native"
import type { StyleProp, ViewStyle } from "react-native"

import { V2Skeleton, V2SkeletonGroup, spacing } from "@/src/design-system-v2"

import { GUTTER } from "../layout"
import { RESTAURANT_PHOTO_HEIGHT } from "./PhotoStrip"
const SIDE = GUTTER

export interface RestaurantCardSkeletonProps {
  style?: StyleProp<ViewStyle>
}

export function RestaurantCardSkeleton({ style }: RestaurantCardSkeletonProps) {
  return (
    <V2SkeletonGroup style={[styles.root, style]}>
      <View style={styles.body}>
        <V2Skeleton width="65%" height={19} />
        <V2Skeleton width="82%" height={18} />
        <V2Skeleton width="60%" height={16} />
      </View>
      <V2Skeleton width="100%" height={RESTAURANT_PHOTO_HEIGHT} radius="lg" />
      <V2Skeleton width="100%" height={38} radius="md" />
    </V2SkeletonGroup>
  )
}

/** 시트가 처음 열릴 때 보여 줄 개수. 3개면 mid 스냅을 채우고 그 이상은 낭비다. */
export const RESTAURANT_SKELETON_COUNT = 3

/** 목록 화면용 묶음 — 카드 사이 간격까지 실제 목록과 같게 둔다. */
export function RestaurantCardSkeletonList({
  count = RESTAURANT_SKELETON_COUNT,
}: {
  count?: number
}) {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <RestaurantCardSkeleton key={index} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: SIDE,
    paddingVertical: spacing[16],
    gap: spacing[12],
  },
  body: { gap: spacing[6] },
})
