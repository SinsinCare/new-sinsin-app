/**
 * `PostRow` 의 자리표시. 스펙: §2.1 · §2.18 (WBS 1.2).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 규칙 두 가지
 *
 *  1. **링 스피너 금지 · 스켈레톤 우선**(전역 §0.2). 목록은 "무엇이 오는지" 를 미리 그린다.
 *  2. **리듬이 진짜 행과 같아야 한다.** 높이를 `postRowHeight()` 에서 똑같이 받아오고
 *     막대의 높이도 실제 타이포 토큰의 라인박스를 쓴다 — 도착 순간 레이아웃이 안 튄다.
 *     여기서 숫자를 새로 적으면 다음 리팩터에서 스켈레톤만 옛 리듬으로 남는다.
 *
 * ■ 묶음(`V2SkeletonGroup`)은 여기서 씌우지 않는다
 *
 * 그 컴포넌트는 스크린리더에 "불러오는 중" 을 **한 번** 알리는 겉포장이다. 행마다 씌우면
 * 같은 안내가 N번 읽힌다. 목록을 만드는 쪽이 N개를 감싼다.
 */
import { StyleSheet, View } from "react-native"

import { V2Divider } from "@/src/design-system-v2/components/V2Divider"
import { V2Skeleton } from "@/src/design-system-v2/components/V2Skeleton"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { typography } from "@/src/design-system-v2/tokens/typography"

import {
  CHIP_GAP,
  COMMUNITY_GUTTER,
  POST_ROW_HEADER_GAP,
  POST_ROW_PAD_V,
  POST_ROW_RANK_SIZE,
  POST_ROW_TAG_GAP,
  ROW,
  postRowHeight,
  type PostRowShape,
} from "./communityLayout"

/**
 * 기본 모양 = 실측 **176**(카테고리 배지 + 태그 + 썸네일). 피드 첫 화면에서 가장 흔한 행이다.
 * 화면이 다른 모양을 기다린다면(예: 검색 결과 118) 그 모양을 넘긴다.
 */
const DEFAULT_SHAPE: PostRowShape = {
  hasCategory: true,
  hasTags: true,
  hasThumbnail: true,
}

/** 태그 자리 3개의 실측 폭(§2.1 — `CKD 정보` 55 · `식단 인증` 51 · `저염식` 40). */
const TAG_WIDTHS = [55, 51, 40] as const

/** 카테고리 배지 자리의 실측 폭(`질문·상담` 52×21). */
const CATEGORY_WIDTH = 52

export type PostRowSkeletonProps = {
  /** 기다리는 행의 모양. 높이는 이 값으로 `postRowHeight()` 가 정한다. */
  shape?: PostRowShape
}

export function PostRowSkeleton({
  shape = DEFAULT_SHAPE,
}: PostRowSkeletonProps) {
  const { colors } = useV2Theme()
  const hasHeader = Boolean(shape.hasRank) || Boolean(shape.hasCategory)

  return (
    <View
      style={[
        { height: postRowHeight(shape) },
        { backgroundColor: colors.background.default },
      ]}
    >
      <View style={styles.inner}>
        {hasHeader ? (
          <View
            style={[
              styles.header,
              {
                height: shape.hasRank ? POST_ROW_RANK_SIZE : ROW.microPill,
              },
            ]}
          >
            {shape.hasRank ? (
              <V2Skeleton
                width={POST_ROW_RANK_SIZE}
                height={POST_ROW_RANK_SIZE}
                radius="full"
              />
            ) : null}
            {shape.hasCategory ? (
              <V2Skeleton
                width={CATEGORY_WIDTH}
                height={ROW.microPill}
                radius="full"
              />
            ) : null}
          </View>
        ) : null}

        {shape.hasTags ? (
          <View style={styles.tagRail}>
            {TAG_WIDTHS.map((width) => (
              <V2Skeleton
                key={width}
                width={width}
                height={ROW.microPill}
                radius="full"
              />
            ))}
          </View>
        ) : null}

        <View style={styles.content}>
          <View style={styles.textColumn}>
            <V2Skeleton
              width="88%"
              height={typography.subtext.largeStrong.lineHeight}
              radius="xs"
            />
            <V2Skeleton
              width="66%"
              height={typography.body.xSmall.lineHeight}
              radius="xs"
              style={styles.summary}
            />
            <V2Skeleton
              width="46%"
              height={typography.subtext.medium.lineHeight}
              radius="xs"
              style={styles.meta}
            />
          </View>

          {shape.hasThumbnail ? (
            <V2Skeleton
              width={ROW.thumbLarge}
              height={ROW.thumbLarge}
              radius="sm"
            />
          ) : null}
        </View>
      </View>

      <V2Divider tone="alternative" style={styles.divider} />
    </View>
  )
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    paddingHorizontal: COMMUNITY_GUTTER,
    paddingVertical: POST_ROW_PAD_V,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
    marginBottom: POST_ROW_HEADER_GAP,
  },
  tagRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
    height: ROW.microPill,
    marginBottom: POST_ROW_TAG_GAP,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  textColumn: { flex: 1 },
  summary: { marginTop: spacing[4] },
  meta: { marginTop: spacing[12] },
  divider: { position: "absolute", left: 0, right: 0, bottom: 0 },
})
