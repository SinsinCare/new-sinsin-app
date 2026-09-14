import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { memo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import {
  remoteImageSource,
  stableImageCacheKey,
} from "@/src/shared/images/remoteImageSource"
import Ionicons from "@expo/vector-icons/Ionicons"
import { type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { afterModalTransitions } from "@/src/shared/components/AppModal"

import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { formatCount } from "../utils/displayNumber"
import { formatTimeAgo } from "../utils/timeAgo"
import { useTranslation } from "react-i18next"

import { showActionSheet, showConfirm } from "@/src/lib/dialog"

interface PostListItemProps {
  postId: string
  rank?: number
  category: string
  createdAt: Date
  title: string
  summary: string
  imageUri?: string | null
  authorName: string
  likeCount: number
  commentCount: number
  /** 조회수. 넘기지 않으면(옛 호출부) 눈 아이콘 자체를 그리지 않는다. */
  viewCount?: number | null
  tags?: string[]
  /**
   * 글쓴이의 id. 주면 이름을 누를 때 카드가 **스스로** 프로필로 간다.
   *
   * 피드·검색은 행마다 `onPress={() => router.push(…)}` 를 새 클로저로 넘기고 있었다 —
   * 그 프롭 하나 때문에 이 카드의 `memo` 가 매 렌더 무효였고, 피드 머리(인기·이웃
   * 섹션)가 바뀔 때마다 보이는 행 전부가 다시 그려졌다. id 만 넘기면 프롭이 전부
   * 원시값·안정 참조라 비교가 통과한다.
   */
  authorId?: string | number | null
  /** 글을 눌렀을 때. **넘기지 않으면 카드가 `/post/{postId}` 로 스스로 간다.** */
  onPress?: () => void
  onPressTag?: (tag: string) => void
  /**
   * 작성자 이름을 눌렀을 때 — `authorId` 로는 갈 수 없는 곳(다른 라우트)이 필요할 때만.
   * `authorId` 도 이것도 없으면 이름은 평문 그대로다 — 카드 전체가 글로 가는 Pressable
   * 이라, 이름만 따로 눌리게 하려면 갈 곳이 있어야 한다.
   * 탈퇴·익명(`isWithdrawnAuthor`)이면 갈 곳이 없어 둘 중 무엇이 있어도 안 그린다.
   */
  onPressAuthor?: () => void
  onBlock?: (authorName: string) => void
  isWithdrawnAuthor?: boolean
  /**
   * 바로 아래에 섹션 밴드(요즘 이야기 중·이웃 추천)가 끼어드는 행이면 true — 행의 헤어라인은
   * 행 사이 구분선이라 밴드 위에 남으면 경계가 둘이 된다(피드백 F4). 밴드에 배경을 칠해 덮는
   * 방식은 라이트 대비 감사(§4)가 막으므로, 선 자체를 그리지 않는다.
   */
  hideDivider?: boolean
  /**
   * 내 글이면 케밥(신고·차단)을 그리지 않는다 — 자기 자신을 신고·차단하는 메뉴는
   * 서버 거절에 기대는 UI 다(QA 2026-08-06, `app/post/[id].tsx` 와 같은 규칙).
   * 프로필 미로딩(undefined)은 "내 것 아님" 으로 접는다.
   */
  isMine?: boolean
}

/** Shared flat discussion row: category, title/preview, then author and activity. */
export const PostListItem = memo(function PostListItem({
  postId,
  rank,
  category,
  createdAt,
  title,
  summary,
  imageUri,
  authorName,
  likeCount,
  commentCount,
  viewCount,
  tags: _tags = [],
  authorId,
  onPress,
  onPressTag: _onPressTag,
  onPressAuthor,
  onBlock,
  isWithdrawnAuthor = false,
  hideDivider = false,
  isMine = false,
}: PostListItemProps) {
  const { t, i18n } = useTranslation("recipe")
  /* 프로필 열기 라벨은 `common` 에 있다(`community.author.openProfile`). */
  const { t: tCommon } = useTranslation("common")
  const surface = useSurface()
  const router = useAppRouter()
  /*
    **닉네임을 신원으로 쓰지 않는다.** 예전에는 `authorName === "나"` 였다 — 서버가
    한국어로 준 표시 이름을 코드에 박아 둔 한국어 리터럴과 비교한 것이라, 같은 앱이
    `Accept-Language: en-US` 로 요청하면 그 비교는 영영 거짓이 된다. 그리고 이 리터럴은
    `contentOwnership.ts` 가 소유자 판정 사고(QA 2026-08-06)의 출처로 지목한 바로 그
    줄이다. 판정은 서버가 준 `isMine` 하나로만 한다(프로필 미로딩은 "내 것 아님").
  */
  const displayAuthorName = isWithdrawnAuthor
    ? t("post.withdrawnUser")
    : isMine
      ? t("freePost.selfName")
      : authorName

  const handleMorePress = async () => {
    const picked = await showActionSheet({
      title: authorName,
      actions: [
        { label: t("post.reportPost") },
        { label: t("post.blockUser"), destructive: true },
      ],
    })
    if (picked === 0) {
      await afterModalTransitions()
      router.push(`/community/report?postId=${postId}` as Href)
      return
    }
    if (picked !== 1) return

    const confirmed = await showConfirm({
      title: t("post.blockTitle", { author: displayAuthorName }),
      description: t("post.blockBody"),
      confirmLabel: t("post.block"),
      cancelLabel: t("action.cancel"),
      destructive: true,
    })
    if (confirmed) onBlock?.(authorName)
  }

  /*
    글·작성자로 가는 길은 카드가 스스로 안다(`authorId` 프롭 머리말). 호출부가 콜백을
    넘기면 그쪽이 이긴다 — 보관함처럼 다른 라우트로 보내야 하는 자리가 있다.
  */
  const openPost = () => {
    if (onPress) onPress()
    else router.push(`/post/${postId}` as Href)
  }
  const canOpenAuthor =
    !isWithdrawnAuthor && (onPressAuthor != null || authorId != null)
  const openAuthor = () => {
    if (onPressAuthor) onPressAuthor()
    else if (authorId != null)
      router.push(`/community/author/${authorId}` as Href)
  }

  return (
    <SurfacePressable
      onPress={openPost}
      accessibilityLabel={title}
      baseColor={surface.canvas}
      style={[
        styles.card,
        { borderBottomColor: surface.border },
        hideDivider && styles.cardNoDivider,
      ]}
    >
      <View style={styles.metaRow}>
        {rank != null ? (
          <Text style={[styles.rank, { color: surface.brand }]}>{rank}</Text>
        ) : null}
        <Text
          style={[styles.metaText, { color: surface.text, flex: 1 }]}
          numberOfLines={1}
        >
          {category}
        </Text>
        {!isWithdrawnAuthor && !isMine && onBlock && (
          <Pressable
            onPress={handleMorePress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("post.moreActions")}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={16}
              color={surface.text}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.bodyText}>
          <Text
            style={[styles.title, { color: surface.textStrong }]}
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {title}
          </Text>
          <Text
            style={[styles.summary, { color: surface.text }]}
            numberOfLines={1}
            lineBreakStrategyIOS="hangul-word"
          >
            {summary}
          </Text>
        </View>
        {imageUri ? (
          <Image
            source={remoteImageSource(imageUri)}
            recyclingKey={stableImageCacheKey(imageUri) ?? imageUri}
            style={[styles.thumbnail, { backgroundColor: surface.surface }]}
            contentFit="cover"
          />
        ) : null}
      </View>

      <View style={styles.footerRow}>
        {canOpenAuthor ? (
          <Pressable
            onPress={openAuthor}
            style={styles.author}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={tCommon("community.author.openProfile", {
              name: displayAuthorName,
            })}
          >
            <Text
              style={[styles.metaText, { color: surface.text }]}
              numberOfLines={1}
            >
              {displayAuthorName}
            </Text>
          </Pressable>
        ) : (
          <Text
            style={[styles.metaText, { color: surface.text }]}
            numberOfLines={1}
          >
            {displayAuthorName}
          </Text>
        )}
        {/*
          아이콘은 눈으로만 뜻을 말한다. 라벨이 없으면 스크린리더에는 `481` `3` 처럼
          **맥락 없는 수**만 읽히므로, 셋 다 이름을 갖는다(조회에만 있었다).
        */}
        <Text style={[styles.metaText, { color: surface.text }]}>
          {formatTimeAgo(createdAt, i18n.language)}
        </Text>
        <View style={styles.counts}>
          {viewCount != null && (
            <View
              style={styles.countItem}
              accessibilityLabel={t("post.viewCount", { count: viewCount })}
            >
              <Ionicons name="eye-outline" size={14} color={surface.text} />
              <Text style={[styles.countText, { color: surface.text }]}>
                {formatCount(viewCount, i18n.language)}
              </Text>
            </View>
          )}
          <View
            style={styles.countItem}
            accessibilityLabel={t("post.likeCount", { count: likeCount })}
          >
            <Ionicons name="heart-outline" size={14} color={surface.text} />
            <Text style={[styles.countText, { color: surface.text }]}>
              {formatCount(likeCount, i18n.language)}
            </Text>
          </View>
          <View
            style={styles.countItem}
            accessibilityLabel={t("post.commentCount", { count: commentCount })}
          >
            <Ionicons
              name="chatbubble-outline"
              size={13}
              color={surface.text}
            />
            <Text style={[styles.countText, { color: surface.text }]}>
              {formatCount(commentCount, i18n.language)}
            </Text>
          </View>
        </View>
      </View>
    </SurfacePressable>
  )
})

const styles = StyleSheet.create({
  cardNoDivider: { borderBottomWidth: 0 },
  card: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: borderWidth.thin,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rank: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontFamily: "Pretendard-Medium",
    flexShrink: 1,
  },
  bodyRow: {
    flexDirection: "row",
    gap: 12,
  },
  bodyText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.31,
    fontFamily: "Pretendard-Bold",
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.27,
    fontFamily: "Pretendard-Regular",
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 8,
  },
  author: { flex: 1, minWidth: 0 },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  counts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  countText: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontFamily: "Pretendard-SemiBold",
  },
})
