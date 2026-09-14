/** Initial loading uses the same flat rows as the loaded discussion list. */

import { StyleSheet, View } from "react-native"

import { V2Skeleton, V2SkeletonGroup } from "@/src/design-system-v2"

/** 목록 카드 한 장 — 메타 줄 · 제목/요약 + 썸네일 · 반응 줄. */
function PostCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <V2Skeleton width={92} height={12} />
        <V2Skeleton width={44} height={12} />
      </View>
      <View style={styles.bodyRow}>
        <View style={styles.bodyText}>
          <V2Skeleton width="86%" height={16} />
          <V2Skeleton width="70%" height={14} />
        </View>
        <V2Skeleton width={68} height={68} radius="lg" />
      </View>
      <View style={styles.footerRow}>
        <V2Skeleton width={108} height={12} />
        <V2Skeleton width={36} height={12} />
      </View>
    </View>
  )
}

export interface CommunityFeedSkeletonProps {
  /** 목록 카드 수. 기본 4 — 첫 스크린을 채우는 최소치. */
  count?: number
}

export function CommunityFeedSkeleton({
  count = 4,
}: CommunityFeedSkeletonProps) {
  return (
    <V2SkeletonGroup>
      <View style={styles.list}>
        {Array.from({ length: count }, (_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </View>
    </V2SkeletonGroup>
  )
}

const styles = StyleSheet.create({
  list: {},
  card: { paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bodyRow: { flexDirection: "row", gap: 12 },
  bodyText: { flex: 1, gap: 6 },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
})
