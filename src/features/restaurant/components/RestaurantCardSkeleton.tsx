/**
 * 카드 스켈레톤.
 *
 * 예전에는 이 파일이 자체 reanimated 펄스를 돌렸다. 지금은 `V2Skeleton` 이 앱 전체의
 * 시머를 하나의 드라이버로 몰기 때문에 여기서 리듬을 따로 만들지 않는다 — 만들면 같은
 * 화면 안에서 두 가지 로딩 감각이 생긴다(시트의 카드와 목록의 카드가 다르게 숨 쉰다).
 *
 * ## 왜 스피너가 아니라 스켈레톤인가
 *
 * 스피너는 "무엇이 올 것인지" 를 말하지 않아서 시트가 열려 있는 동안 높이가 크게 튄다.
 * 목업의 카드 형태를 미리 잡아 두면 도착 후 레이아웃이 흔들리지 않는다.
 */

import { StyleSheet, View, useWindowDimensions } from "react-native"
import type { StyleProp, ViewStyle } from "react-native"

import { V2Skeleton, V2SkeletonGroup, spacing } from "@/src/design-system-v2"

import { GUTTER } from "../layout"
const SIDE = GUTTER

export interface RestaurantCardSkeletonProps {
  style?: StyleProp<ViewStyle>
}

export function RestaurantCardSkeleton({ style }: RestaurantCardSkeletonProps) {
  const { width } = useWindowDimensions()
  // 실제 카드의 사진 타일과 같은 식으로 유도한다 — 도착 후 높이가 튀지 않게.
  const tile = Math.round((width - SIDE) / 3)

  return (
    <V2SkeletonGroup style={[styles.root, style]}>
      <View style={styles.body}>
        <V2Skeleton width="45%" height={20} />
        <V2Skeleton width="62%" height={16} />
        <V2Skeleton width="52%" height={16} />
      </View>
      <View style={[styles.photos, { paddingLeft: SIDE }]}>
        {[0, 1, 2].map((index) => (
          <V2Skeleton key={index} width={tile} height={tile} radius="sm" />
        ))}
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
  root: { paddingTop: spacing[16], paddingBottom: spacing[16] },
  body: { paddingHorizontal: SIDE, gap: spacing[8] },
  photos: { flexDirection: "row", gap: spacing[8], marginTop: spacing[12] },
})
