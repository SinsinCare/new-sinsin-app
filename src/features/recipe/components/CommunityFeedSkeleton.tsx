/**
 * 커뮤니티 피드의 첫 조회 자리표시.
 *
 * 이 탭은 링 하나만 돌다가 스토리 레일 + 인기글 + 카테고리 피드가 한꺼번에 나타났다.
 * 세 덩어리가 동시에 들어오면 화면이 한 번 크게 튄다. 여기서는 세 덩어리의 자리를
 * 미리 잡아 둔다 — 순서를 그대로 두는 것이 요점이라 스토리 레일을 맨 위에 둔다.
 *
 * 치수는 `FreePostTab` 의 listWrap(좌우 20 · 간격 10)과 `PostListItem`
 * (radius 16 · padding 16 · 썸네일 64)에서 가져왔다.
 */

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
        <V2Skeleton width={64} height={64} radius="lg" />
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
      {/* 스토리 레일 — 원형 썸네일이 가로로 도는 자리 */}
      <View style={styles.storyRail}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View key={index} style={styles.story}>
            <V2Skeleton width={64} height={64} radius="full" />
            <V2Skeleton width={44} height={11} />
          </View>
        ))}
      </View>

      <V2Skeleton width={56} height={13} style={styles.sectionLabel} />

      <View style={styles.list}>
        {Array.from({ length: count }, (_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </View>
    </V2SkeletonGroup>
  )
}

const styles = StyleSheet.create({
  storyRail: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  story: { alignItems: "center", gap: 6 },
  sectionLabel: { marginHorizontal: 20, marginTop: 24, marginBottom: 10 },
  list: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  card: { borderRadius: 16, padding: 16, gap: 10 },
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
