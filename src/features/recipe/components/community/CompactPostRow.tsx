/**
 * **76px 목록 행** — 상세의 `{작성자}의 다른글` · `추천 게시글`, 작성자 프로필의 `추천 게시글`.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.4 · `detail-drag.md` §4.5 (WBS 1.3).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ `PostRow` 와 무엇이 다른가
 *
 * 같은 "게시글 행"이지만 **다른 리듬**이다. 하나로 합치려면 프롭으로 높이·타이포·썸네일·
 * 시각 유무를 전부 갈라야 해서, 두 리듬 중 어느 쪽도 읽히지 않는 컴포넌트가 된다.
 *
 *   | | `PostRow` | `CompactPostRow` |
 *   |---|---|---|
 *   | 높이 | 106~179 (`postRowHeight()`) | **76 고정** |
 *   | 제목 | 15 Medium / lh **20** | 15 Medium / lh **19** (`label.smallWeak`) |
 *   | 제목↔메타 | 요약 한 줄이 사이에 있다 | **6**, 요약 없음 |
 *   | 메타 | 시각 있음 | **시각 없음** |
 *   | 썸네일 | 86 | **60** + 이미지 개수 배지 |
 *
 * ■ `V2ListRow` 로는 안 된다
 *
 * 그쪽은 제목 17 Bold + 우측 값 텍스트 구조다(detail-drag §5). 여기 필요한 건 제목 15 +
 * 지표 줄 + 우측 썸네일이다.
 *
 * ■ 구분선
 *
 * 하단 1px full-bleed. **섹션 첫 행 위에는 선이 없다** — 선을 아래에만 그리면 저절로 그렇다
 * (detail-drag §4.5). `PostRow` 와 같은 이유로 절대 배치이고, 그래서 좌우 여백은 안쪽
 * `View` 가 갖는다(Yoga 는 절대 배치 자식을 패딩 안쪽 기준으로 놓는다).
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
import {
  remoteImageSource,
  stableImageCacheKey,
} from "@/src/shared/images/remoteImageSource"

import { V2Divider } from "@/src/design-system-v2/components/V2Divider"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

import type { CommunityMealPost } from "../../types"
import { COMMUNITY_GUTTER, ROW } from "./communityLayout"
import { MetaRow } from "./MetaRow"

/** 이미지 개수 배지의 지름. §2.4 — 20×20 원. */
export const IMAGE_COUNT_BADGE_SIZE = 20

/** 썸네일 우·하단에서 배지까지의 안쪽 여백. §2.4. */
const IMAGE_COUNT_BADGE_INSET = spacing[8]

/** 배지를 그리기 시작하는 이미지 수. §2.4 — "이미지 2장 이상일 때만". */
const IMAGE_COUNT_BADGE_MIN = 2

export type ImageCountBadgeProps = {
  /** 이 게시글의 **전체 이미지 수**. 시안이 2장짜리 글에 `2` 를 그렸다(§2.4 · detail-drag §4.5). */
  count: number
}

/**
 * 썸네일 위에 얹는 개수 배지. `V2Badge` 로는 안 된다 — 그쪽은 **hug 폭**이라 원 20 이
 * 고정되지 않는다(detail-drag §5).
 */
export function ImageCountBadge({ count }: ImageCountBadgeProps) {
  const { colors } = useV2Theme()

  return (
    <View
      style={[styles.countBadge, { backgroundColor: colors.label.alternative }]}
    >
      <V2Text token="label.xSmall" color={colors.static.white}>
        {count}
      </V2Text>
    </View>
  )
}

/** `PostRow` 와 같은 이유로 도메인 타입에서 `Pick` 한다 — §2.4 의 행은 요약도 시각도 없다. */
export type CompactPostRowPost = Pick<
  CommunityMealPost,
  "title" | "imageUri" | "imageUris" | "likes" | "comments" | "views"
>

export type CompactPostRowProps = {
  post: CompactPostRowPost
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export function CompactPostRow({ post, onPress, style }: CompactPostRowProps) {
  const { colors } = useV2Theme()

  const thumbnail = post.imageUri
  /*
    `imageUris` 가 정본이고 `imageUri` 는 첫 장(하위호환)이다. 옛 서버 응답처럼 목록만
    비어 있고 첫 장은 있는 경우를 1 로 접는다 — 그래야 "1장" 과 "모른다" 가 같은 값이 되어
    배지가 잘못 뜨지 않는다.
  */
  const imageCount = post.imageUris.length || (thumbnail ? 1 : 0)

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={post.title}
      style={({ pressed }) => [
        {
          height: ROW.compactRow,
          backgroundColor: pressed
            ? colors.fill.normal
            : colors.background.default,
        },
        style,
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.textColumn}>
          <V2Text
            token="label.smallWeak"
            color={colors.label.normal}
            numberOfLines={1}
            textBreakStrategy="balanced"
          >
            {post.title}
          </V2Text>
          {/* 시각 없음 — `조회 N · ♥N · 💬N` 만(§2.4). */}
          <MetaRow
            style={styles.meta}
            viewCount={post.views}
            likeCount={post.likes}
            commentCount={post.comments}
          />
        </View>

        {thumbnail ? (
          <View>
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
            {imageCount >= IMAGE_COUNT_BADGE_MIN ? (
              <ImageCountBadge count={imageCount} />
            ) : null}
          </View>
        ) : null}
      </View>

      <V2Divider tone="alternative" style={styles.divider} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  /** 썸네일 60 이 76 안에서 세로 중앙 → 위아래 8. 텍스트 블록도 같은 중심선에 둔다. */
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: COMMUNITY_GUTTER,
    gap: spacing[12],
  },
  /** 썸네일 있으면 263, 없으면 335 — 폭을 박지 않고 `flex:1` 이 만든다. */
  textColumn: { flex: 1 },
  meta: { marginTop: spacing[6] },
  thumbnail: {
    width: ROW.thumbSmall,
    height: ROW.thumbSmall,
    borderRadius: radius.sm,
  },
  countBadge: {
    position: "absolute",
    right: IMAGE_COUNT_BADGE_INSET,
    bottom: IMAGE_COUNT_BADGE_INSET,
    width: IMAGE_COUNT_BADGE_SIZE,
    height: IMAGE_COUNT_BADGE_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { position: "absolute", left: 0, right: 0, bottom: 0 },
})
