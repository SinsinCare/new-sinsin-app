import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { afterModalTransitions } from "@/src/shared/components/AppModal"

import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { formatCount } from "../utils/displayNumber"
import { formatTimeAgo } from "../utils/timeAgo"
import { TagChips } from "./TagChips"
import { useTranslation } from "react-i18next"

import { showActionSheet, showConfirm } from "@/src/lib/dialog"

interface PostListItemProps {
  postId: string
  category: string
  createdAt: Date
  title: string
  summary: string
  imageUri?: string | null
  authorName: string
  likeCount: number
  commentCount: number
  /** 조회수. 넘기지 않으면(옛 호출부) 눈 아이콘 자체를 그리지 않는다. */
  viewCount?: number
  tags?: string[]
  onPress?: () => void
  onPressTag?: (tag: string) => void
  onBlock?: (authorName: string) => void
  isWithdrawnAuthor?: boolean
  /**
   * 내 글이면 케밥(신고·차단)을 그리지 않는다 — 자기 자신을 신고·차단하는 메뉴는
   * 서버 거절에 기대는 UI 다(QA 2026-08-06, `app/post/[id].tsx` 와 같은 규칙).
   * 프로필 미로딩(undefined)은 "내 것 아님" 으로 접는다.
   */
  isMine?: boolean
}

/** 피드 카드 — 회색 바닥 위의 흰 카드. 제목·미리보기 왼쪽, 사진은 오른쪽 섬네일. */
export function PostListItem({
  postId,
  category,
  createdAt,
  title,
  summary,
  imageUri,
  authorName,
  likeCount,
  commentCount,
  viewCount,
  tags = [],
  onPress,
  onPressTag,
  onBlock,
  isWithdrawnAuthor = false,
  isMine = false,
}: PostListItemProps) {
  const { t, i18n } = useTranslation("recipe")
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

  return (
    <SurfacePressable
      onPress={() => onPress?.()}
      accessibilityLabel={title}
      baseColor={surface.card}
      style={styles.card}
    >
      <View style={styles.metaRow}>
        <Text
          style={[styles.metaText, { color: surface.text }]}
          numberOfLines={1}
        >
          {category} · {formatTimeAgo(createdAt, i18n.language)}
        </Text>
        {!isWithdrawnAuthor && !isMine && (
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
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
          >
            {summary}
          </Text>
        </View>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[styles.thumbnail, { backgroundColor: surface.surface }]}
            contentFit="cover"
          />
        ) : null}
      </View>

      {tags.length > 0 && <TagChips tags={tags} onPressTag={onPressTag} />}

      <View style={styles.footerRow}>
        <Text
          style={[styles.metaText, { color: surface.text }]}
          numberOfLines={1}
        >
          {displayAuthorName}
        </Text>
        {/*
          아이콘은 눈으로만 뜻을 말한다. 라벨이 없으면 스크린리더에는 `481` `3` 처럼
          **맥락 없는 수**만 읽히므로, 셋 다 이름을 갖는다(조회에만 있었다).
        */}
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
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontWeight: "500",
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
    fontSize: 15.5,
    lineHeight: 22,
    letterSpacing: -0.31,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  summary: {
    fontSize: 13.5,
    lineHeight: 20,
    letterSpacing: -0.27,
    fontFamily: "Pretendard-Regular",
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
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
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
})
