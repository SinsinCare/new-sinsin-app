import { StyleSheet, View } from "react-native"
import type { StyleProp, ViewStyle } from "react-native"

import { V2Skeleton, V2SkeletonGroup, spacing } from "@/src/design-system-v2"

import { GUTTER } from "../layout"
const SIDE = GUTTER

export interface RestaurantCardSkeletonProps {
  style?: StyleProp<ViewStyle>
}

export function RestaurantCardSkeleton({ style }: RestaurantCardSkeletonProps) {
  return (
    <V2SkeletonGroup style={[styles.root, style]}>
      <View style={styles.main}>
        <View style={styles.body}>
          <V2Skeleton width="90%" height={19} />
          <V2Skeleton width="65%" height={18} />
          <V2Skeleton width="82%" height={18} />
          <V2Skeleton width="70%" height={18} />
          <View style={styles.nutrition}>
            <V2Skeleton width="90%" height={18} />
          </View>
        </View>
        <V2Skeleton width={96} height={113} radius="lg" />
      </View>
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
  },
  main: { flexDirection: "row", gap: spacing[12] },
  body: { flex: 1, gap: spacing[4] },
  nutrition: { paddingTop: spacing[6] },
})
