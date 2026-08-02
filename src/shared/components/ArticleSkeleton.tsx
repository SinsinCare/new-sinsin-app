/**
 * 글 한 편이 들어올 자리 — 커뮤니티 글 상세, 레시피 상세, 글 수정 화면이 함께 쓴다.
 *
 * 세 화면 모두 "전체 화면 링 하나" 로 기다렸다. 링은 뒤에 무엇이 오는지 말하지 않아서
 * 도착하는 순간 헤더 · 본문 · 사진이 한꺼번에 나타난다. 여기서는 그 순서를 미리 세워
 * 둔다 — 제목이 올 자리, 글쓴이 줄, 본문 문단, (있으면) 사진.
 *
 * 화면마다 조각이 조금씩 다르므로 `variant` 로 가른다. 세 벌을 따로 만들면 셋 중 하나만
 * 고쳐지고 같은 앱 안에서 글 로딩이 세 가지 모양이 된다.
 */

import { StyleSheet, View, useWindowDimensions } from "react-native"

import {
  V2Skeleton,
  V2SkeletonCircle,
  V2SkeletonGroup,
  V2SkeletonText,
  spacing,
} from "@/src/design-system-v2"

export type ArticleSkeletonVariant = "post" | "recipe" | "editor"

export interface ArticleSkeletonProps {
  /**
   * - `post`   커뮤니티 글 상세 (제목 · 글쓴이 · 본문 · 댓글)
   * - `recipe` 레시피 상세 (4:3 사진 · 제목 · 영양 카드 · 재료)
   * - `editor` 글 수정 (제목 입력 · 본문 입력 · 태그)
   */
  variant?: ArticleSkeletonVariant
}

export function ArticleSkeleton({ variant = "post" }: ArticleSkeletonProps) {
  const { width } = useWindowDimensions()

  if (variant === "recipe") {
    return (
      <V2SkeletonGroup style={styles.root}>
        {/* RecipeHero 의 사진 우물과 같은 4:3 */}
        <V2Skeleton
          width={width}
          height={Math.round((width * 3) / 4)}
          radius="xs"
        />
        <View style={styles.body}>
          <V2Skeleton width="70%" height={24} />
          <V2Skeleton width="46%" height={15} />
          <V2Skeleton height={104} radius="2xl" style={styles.block} />
          <V2Skeleton width={88} height={17} style={styles.block} />
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={styles.listRow}>
              <V2Skeleton width="40%" height={15} />
              <V2Skeleton width={56} height={15} />
            </View>
          ))}
        </View>
      </V2SkeletonGroup>
    )
  }

  if (variant === "editor") {
    return (
      <V2SkeletonGroup style={[styles.root, styles.body]}>
        <V2Skeleton height={28} />
        <V2Skeleton height={220} radius="lg" style={styles.block} />
        <View style={styles.tagRow}>
          {[64, 80, 52].map((tagWidth, index) => (
            <V2Skeleton
              key={index}
              width={tagWidth}
              height={30}
              radius="full"
            />
          ))}
        </View>
      </V2SkeletonGroup>
    )
  }

  return (
    <V2SkeletonGroup style={[styles.root, styles.body]}>
      <V2Skeleton width="82%" height={24} />
      <View style={styles.authorRow}>
        <V2SkeletonCircle size={36} />
        <View style={styles.authorText}>
          <V2Skeleton width={96} height={14} />
          <V2Skeleton width={64} height={12} />
        </View>
      </View>
      <V2SkeletonText lines={4} lineHeight={15} style={styles.block} />
      <V2Skeleton height={180} radius="lg" style={styles.block} />
      {/* 댓글 두 줄 — 글 아래에 무엇이 더 있는지 미리 알린다. */}
      {[0, 1].map((index) => (
        <View key={index} style={styles.commentRow}>
          <V2SkeletonCircle size={28} />
          <View style={styles.commentBody}>
            <V2Skeleton width="34%" height={13} />
            <V2Skeleton width="74%" height={14} />
          </View>
        </View>
      ))}
    </V2SkeletonGroup>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: spacing[20], paddingTop: spacing[20], gap: 10 },
  block: { marginTop: spacing[16] },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[10],
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    marginTop: spacing[8],
  },
  authorText: { gap: spacing[6] },
  tagRow: {
    flexDirection: "row",
    gap: spacing[8],
    marginTop: spacing[16],
  },
  commentRow: {
    flexDirection: "row",
    gap: spacing[10],
    marginTop: spacing[20],
  },
  commentBody: { flex: 1, gap: spacing[6] },
})
