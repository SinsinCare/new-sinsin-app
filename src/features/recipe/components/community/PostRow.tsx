/**
 * **피드 · 검색 결과 · 인기글이 공유하는 게시글 행.**
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.1 (WBS 1.2).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 세 화면이 한 컴포넌트인가
 *
 * 4개 구역(feed-drag · feed-home · search · popular)에서 잰 행 높이 **6종이 전부 한 공식**
 * 으로 재현된다(`postRowHeight()`). 종류를 나누면 다섯 번째 조합이 나오는 순간 아무도
 * 정답을 모른다. 그래서 높이를 여기서 계산하지 않고 **`communityLayout.ts` 에서 받아온다**.
 *
 * ■ 카드가 아니라 행이다
 *
 * radius 0 · 행 간격 0 · 배경 `background.default` · 하단 1px **full-bleed** 구분선.
 * 구분선은 **절대 배치**다: 실측 피치가 176/147/106 으로 행 높이와 **정확히 같아서**
 * (feed-home 338→514→661→767), 선이 흐름 안에 있으면 행마다 1px 씩 밀린다.
 * 그래서 좌우 여백을 바깥 `Pressable` 이 아니라 안쪽 `View` 가 갖는다 — Yoga 는 절대 배치
 * 자식을 **패딩 안쪽** 기준으로 놓기 때문에, 패딩이 바깥에 있으면 `left:0` 이 20 이 된다.
 *
 * ■ 제목·요약은 각각 **한 줄**이다
 *
 * 네 구역이 전부 1줄 말줄임이고(popular.md: "every card in the design truncates on line 1"),
 * 텍스트열 74 = 20 + 4 + 20 + 12 + 18 이 그 전제 위에 서 있다. 2줄로 늘리면 74 가 94 가 되어
 * 실측 6종이 통째로 어긋난다.
 */
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import { V2Divider } from "@/src/design-system-v2/components/V2Divider"
import { V2Icon } from "@/src/design-system-v2/components/V2Icon"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import {
  remoteImageSource,
  stableImageCacheKey,
} from "@/src/shared/images/remoteImageSource"

import type { CommunityMealPost } from "../../types"
import { formatTimeAgo } from "../../utils/timeAgo"
import {
  CHIP_GAP,
  COMMUNITY_GUTTER,
  POST_ROW_HEADER_GAP,
  POST_ROW_PAD_V,
  POST_ROW_RANK_SIZE,
  POST_ROW_TAG_GAP,
  ROW,
  postRowHeight,
} from "./communityLayout"
import { MetaRow } from "./MetaRow"
import { MicroPill } from "./MicroPill"

/** 태그 레일에 그리는 최대 개수. §2.1 `tags.slice(0, 4)`. */
export const POST_ROW_MAX_TAGS = 4

/**
 * 행이 그리는 데 실제로 필요한 필드만. **도메인 타입에서 `Pick` 으로 판다** —
 * 이름이 바뀌면 여기가 같이 깨지고(구조 타입을 손으로 베끼면 안 깨진다),
 * 부르는 쪽·테스트는 `CommunityMealPost` 전체를 조립하지 않아도 된다.
 */
export type PostRowPost = Pick<
  CommunityMealPost,
  | "title"
  | "description"
  | "category"
  | "tags"
  | "imageUri"
  | "likes"
  | "comments"
  | "views"
  | "createdAt"
>

export type PostRowProps = {
  post: PostRowPost
  /**
   * 인기글 랭크(1부터). 있으면 24 원을 그리고 **헤더행 높이를 24 로** 만든다
   * (랭크와 카테고리 배지는 같은 줄이다 — 179 가 그 경우다).
   */
  rank?: number
  /**
   * 카테고리 배지를 그릴지. 기본 **true**.
   * 검색 결과는 끈다 — 실측 118(썸네일만) 행이 그 모양이다.
   */
  showCategory?: boolean
  onPress: () => void
  /** 태그를 누르면 그 태그로 검색. 안 주면 태그는 **누를 수 없는 알약**이 된다. */
  onPressTag?: (tag: string) => void
  /**
   * 케밥(신고·차단) 히트영역 — **시안에는 없고 §6.1 보존 목록에 있다**(D5: 대체 진입점을
   * 만들기 전에는 기존 진입점을 지우지 않는다).
   *
   * ⚠ 자리는 **헤더행(랭크/카테고리)의 오른쪽 끝 하나뿐**이다. 헤더행이 없는 행
   * (실측 118·147·106)에는 시안이 정한 자리가 없고, 없는 자리에 얹으면 썸네일 위나
   * 태그 레일 위에 겹친다. 그래서 헤더행이 없으면 **안 그린다** — 그 화면은
   * `showCategory` 를 켜서 자리를 만들거나 다른 진입점을 쓴다.
   */
  onPressMore?: () => void
  style?: StyleProp<ViewStyle>
}

export function PostRow({
  post,
  rank,
  showCategory = true,
  onPress,
  onPressTag,
  onPressMore,
  style,
}: PostRowProps) {
  const { colors } = useV2Theme()
  const { t, i18n } = useTranslation("recipe")

  const category = showCategory ? post.category.trim() : ""
  const tags = post.tags.slice(0, POST_ROW_MAX_TAGS)
  const thumbnail = post.imageUri

  const hasRank = rank != null
  const hasCategory = category.length > 0
  const hasTags = tags.length > 0
  const hasThumbnail = Boolean(thumbnail)
  const hasHeader = hasRank || hasCategory

  const height = postRowHeight({
    hasRank,
    hasCategory,
    hasTags,
    hasThumbnail,
  })

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={post.title}
      style={({ pressed }) => [
        {
          height,
          backgroundColor: pressed
            ? colors.fill.normal
            : colors.background.default,
        },
        style,
      ]}
    >
      <View style={styles.inner}>
        {hasHeader ? (
          <View
            style={[
              styles.header,
              // 랭크가 있으면 24 가 줄 높이다(179). 없으면 배지 21(176).
              { height: hasRank ? POST_ROW_RANK_SIZE : ROW.microPill },
            ]}
          >
            {hasRank ? (
              <View
                style={[
                  styles.rank,
                  { backgroundColor: colors.primary.primaryWeak },
                ]}
              >
                <V2Text token="label.xSmall" color={colors.primary.primary}>
                  {rank}
                </V2Text>
              </View>
            ) : null}

            {hasCategory ? <MicroPill face="ink" label={category} /> : null}

            {onPressMore ? (
              <Pressable
                onPress={onPressMore}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t("post.moreActions")}
                style={styles.more}
              >
                <V2Icon name="more" size="xs" color={colors.label.neutral} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {hasTags ? (
          <View style={styles.tagRail}>
            {tags.map((tag) =>
              onPressTag ? (
                <Pressable
                  key={tag}
                  onPress={() => onPressTag(tag)}
                  accessibilityRole="button"
                  accessibilityLabel={t("tag.search", { tag })}
                >
                  <MicroPill face="neutral" label={tag} />
                </Pressable>
              ) : (
                <MicroPill key={tag} face="neutral" label={tag} />
              ),
            )}
          </View>
        ) : null}

        {/*
          썸네일이 콘텐츠 블록 높이(86)를 정하고 텍스트열(74)은 그 안에서 세로 중앙에
          놓인다 — `alignItems:"center"` 가 위아래 6 을 만든다(§2.1 "썸네일 세로정렬").
        */}
        <View style={styles.content}>
          <View style={styles.textColumn}>
            <V2Text
              token="subtext.largeStrong"
              color={colors.label.normal}
              numberOfLines={1}
              textBreakStrategy="balanced"
            >
              {post.title}
            </V2Text>
            <V2Text
              token="body.xSmall"
              color={colors.label.neutral}
              numberOfLines={1}
              style={styles.summary}
            >
              {post.description}
            </V2Text>
            <MetaRow
              style={styles.meta}
              viewCount={post.views}
              likeCount={post.likes}
              commentCount={post.comments}
              timeText={formatTimeAgo(post.createdAt, i18n.language)}
            />
          </View>

          {thumbnail ? (
            <Image
              source={remoteImageSource(thumbnail)}
              // FlashList 재활용 시 이전 행의 사진이 잠깐 비치지 않게 — 키는 서명 회전에 불변.
              recyclingKey={stableImageCacheKey(thumbnail) ?? thumbnail}
              style={[
                styles.thumbnail,
                { backgroundColor: colors.fill.normal },
              ]}
              contentFit="cover"
            />
          ) : null}
        </View>
      </View>

      {/* 인셋 0. 바깥 Pressable 에 패딩이 없어야 이 선이 화면 끝까지 간다. */}
      <V2Divider tone="alternative" style={styles.divider} />
    </Pressable>
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
    // 랭크↔배지 6 (§2.1).
    gap: CHIP_GAP,
    marginBottom: POST_ROW_HEADER_GAP,
  },
  rank: {
    width: POST_ROW_RANK_SIZE,
    height: POST_ROW_RANK_SIZE,
    // 2자리(10위 이상)에서 원이 찌그러지지 않게 — §2.1 `minWidth 24`.
    minWidth: POST_ROW_RANK_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 케밥은 헤더행 오른쪽 끝. 자리는 남는 폭이 정한다. */
  more: { marginLeft: "auto" },
  tagRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
    height: ROW.microPill,
    marginBottom: POST_ROW_TAG_GAP,
    // 4번째 태그가 길면 밖으로 나가되 아래 줄로 흐르지는 않게(레일은 한 줄이다).
    overflow: "hidden",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  /** 썸네일 있으면 237, 없으면 335 — 폭을 박지 않고 `flex:1` 이 만든다. */
  textColumn: { flex: 1 },
  summary: { marginTop: spacing[4] },
  meta: { marginTop: spacing[12] },
  thumbnail: {
    width: ROW.thumbLarge,
    height: ROW.thumbLarge,
    borderRadius: radius.sm,
  },
  divider: { position: "absolute", left: 0, right: 0, bottom: 0 },
})
