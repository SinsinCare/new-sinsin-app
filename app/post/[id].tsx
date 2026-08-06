import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import {
  AppModal,
  afterModalTransitions,
} from "@/src/shared/components/AppModal"
import { useMemo, useRef, useState } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useLocalSearchParams, type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { MOTION } from "@/src/theme/surface"
import { usePostDetail } from "@/src/features/recipe/hooks/usePostDetail"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { useBlockedUsers } from "@/src/features/recipe/hooks/useBlockedUsers"
import { PollCard } from "@/src/features/recipe/components/PollCard"
import { TagChips } from "@/src/features/recipe/components/TagChips"
import { MentionText } from "@/src/features/recipe/components/MentionText"
import {
  MentionSuggestions,
  type MentionCandidate,
} from "@/src/features/recipe/components/MentionSuggestions"
import {
  applyMention,
  findMentionQuery,
  removeMention,
  retainedMentions,
} from "@/src/features/recipe/utils/commentMentions"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { formatTimeAgo } from "@/src/features/recipe/utils/timeAgo"
import { rankRelatedPosts } from "@/src/features/recipe/utils/postRanking"
import { ArticleSkeleton, ErrorMessage } from "@/src/shared/components"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { resolveError } from "@/src/lib/errorMessage"
import { presentCommunityError } from "@/src/features/recipe/utils/communityError"
import type { CommunityComment } from "@/src/features/recipe/types"
import { useTranslation } from "react-i18next"

import { showSuccessToast } from "@/src/lib/toast"

import { showActionSheet, showConfirm } from "@/src/lib/dialog"
import {
  communityPostDeepLink,
  STORE_REDIRECT_URL,
} from "@/src/shared/utils/deepLink"
import { shareContent } from "@/src/shared/utils/share"
import {
  isMyContent,
  WITHDRAWN_AUTHOR_NAME,
} from "@/src/features/recipe/utils/contentOwnership"

const HEART_SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }

/** 설치 링크는 한 곳에서만 짓는다(`deepLink.ts` 머리말). */
const APP_DOWNLOAD_URL = STORE_REDIRECT_URL

function isWithdrawnAuthor(author: {
  authorId?: number | null
  authorName: string
}) {
  return author.authorId === null || author.authorName === WITHDRAWN_AUTHOR_NAME
}

export default function PostDetailScreen() {
  const { t, i18n } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 16) : insets.bottom
  const [commentText, setCommentText] = useState("")
  const [replyingTo, setReplyingTo] = useState<CommunityComment | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [commentCursor, setCommentCursor] = useState(0)
  /** 입력창에서 고른 멘션. 전송 직전 본문에 남아 있는 것만 서버로 보낸다. */
  const [pickedMentions, setPickedMentions] = useState<string[]>([])
  const commentInputRef = useRef<TextInput>(null)

  const {
    post,
    comments,
    isLoading,
    isCommentsLoading,
    isCommentsError,
    isError,
    error,
    refetch,
    refetchComments,
    castVoteAsync,
    isVoting,
    togglePostLike,
    togglePostBookmark,
    createComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
    reportComment,
    isCreatingComment,
    isUpdatingComment,
  } = usePostDetail(id!)
  const { posts, deletePost, reportPostAsync } = useCommunityPosts()
  const { blockedNickNames } = useBlockedUsers()

  const inkBg = surface.isDark ? "#F4F4F6" : "#1D1E20"
  const inkContent = surface.isDark ? "#17181C" : "#FFFFFF"
  const reportReasons: { label: string; value: string }[] = [
    {
      label: t("community.postDetail.reportReasons.spam"),
      value: "SPAM",
    },
    {
      label: t("community.postDetail.reportReasons.harassment"),
      value: "HARASSMENT",
    },
    {
      label: t("community.postDetail.reportReasons.inappropriate"),
      value: "INAPPROPRIATE_CONTENT",
    },
    {
      label: t("community.postDetail.reportReasons.falseInformation"),
      value: "FALSE_INFORMATION",
    },
    {
      label: t("community.postDetail.reportReasons.other"),
      value: "OTHER",
    },
  ]
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "diet":
        return t("community.categories.diet")
      case "numbers":
        return t("community.categories.numbers")
      case "symptoms":
        return t("community.categories.symptoms")
      case "medicine":
        return t("community.categories.medicine")
      case "dining-out":
        return t("community.categories.diningOut")
      case "daily":
        return t("community.categories.daily")
      default:
        return category
    }
  }

  /** 이어 읽을 글 — 태그·카테고리·핫스코어 기반, 차단한 작성자의 글은 제외. */
  const relatedPosts = useMemo(() => {
    if (!post) return []
    const candidates = posts.filter(
      (p) => !blockedNickNames.includes(p.authorName),
    )
    return rankRelatedPosts(post, candidates, new Date(), 3)
  }, [post, posts, blockedNickNames])

  /** 태그할 수 있는 사람 = 글쓴이 + 댓글 단 사람. 나 자신과 탈퇴 계정은 뺀다. */
  const { data: myProfile } = useMyPageProfile()
  const mentionCandidates = useMemo<MentionCandidate[]>(() => {
    if (!post) return []
    const myNickName = myProfile?.nickName
    const seen = new Set<string>()
    const candidates: MentionCandidate[] = []

    const push = (nickName: string, isPostAuthor: boolean) => {
      if (
        !nickName ||
        nickName === WITHDRAWN_AUTHOR_NAME ||
        nickName === myNickName ||
        seen.has(nickName)
      ) {
        return
      }
      seen.add(nickName)
      candidates.push({ nickName, isPostAuthor })
    }

    push(post.authorName, true)
    const walk = (list: CommunityComment[]) => {
      list.forEach((comment) => {
        if (!comment.isDeleted) push(comment.authorName, false)
        walk(comment.replies)
      })
    }
    walk(comments)
    return candidates
  }, [post, comments, myProfile?.nickName])

  const mentionQuery = findMentionQuery(commentText, commentCursor)
  const visibleMentionCandidates = useMemo(() => {
    if (!mentionQuery) return []
    const query = mentionQuery.query.toLowerCase()
    return mentionCandidates.filter((candidate) =>
      candidate.nickName.toLowerCase().includes(query),
    )
  }, [mentionQuery, mentionCandidates])

  const handleSelectMention = (nickName: string) => {
    if (!mentionQuery) return
    hapticSelection()
    const next = applyMention(commentText, mentionQuery, nickName)
    setCommentText(next.text)
    setCommentCursor(next.cursor)
    setPickedMentions((prev) =>
      prev.includes(nickName) ? prev : [...prev, nickName],
    )
    commentInputRef.current?.focus()
  }

  /** 답글은 상대를 태그한 채로 시작한다 — 누구에게 하는 말인지 본문에도 남는다. */
  const startReplyTo = (comment: CommunityComment) => {
    setReplyingTo(comment)
    setEditingCommentId(null)
    const canMention =
      comment.authorName !== WITHDRAWN_AUTHOR_NAME &&
      comment.authorName !== myProfile?.nickName
    const seed = canMention ? `@${comment.authorName} ` : ""
    setCommentText(seed)
    setCommentCursor(seed.length)
    setPickedMentions(canMention ? [comment.authorName] : [])
    commentInputRef.current?.focus()
  }

  const resetCommentDraft = () => {
    setCommentText("")
    setCommentCursor(0)
    setPickedMentions([])
  }

  /** 실제로 전송될 태그. 손으로 친 '@이름'은 여기 들어오지 않는다. */
  const activeMentions = useMemo(
    () => retainedMentions(commentText, pickedMentions),
    [commentText, pickedMentions],
  )

  const handleRemoveMention = (nickName: string) => {
    hapticSelection()
    const next = removeMention(commentText, nickName)
    setCommentText(next)
    setCommentCursor(next.length)
    setPickedMentions((prev) => prev.filter((name) => name !== nickName))
  }

  const heartScale = useSharedValue(1)
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }))

  const handleToggleLike = () => {
    heartScale.value = withSequence(
      withSpring(1.3, HEART_SPRING),
      withSpring(1, HEART_SPRING),
    )
    togglePostLike()
  }

  const handleEdit = async () => {
    if (!post) return
    const href = `/free/${post.id}` as Href
    // 더보기 시트의 dismiss 전환(V2BottomSheet 는 ~220ms 지연 언마운트)과
    // 네이티브 스택 push 가 겹치지 않게 전이가 가라앉은 뒤 이동한다.
    await afterModalTransitions()
    router.push(href)
  }

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: t("community.postDetail.deletePostTitle"),
      description: t("community.postDetail.deletePostBody"),
      confirmLabel: t("action.delete"),
      cancelLabel: t("action.cancel"),
      destructive: true,
    })
    if (!confirmed) return
    deletePost(post!.id)
    // 확인 다이얼로그 dismiss 와 화면 pop 이 겹치지 않게(appModalGate 머리말).
    await afterModalTransitions()
    router.back()
  }

  const handleReport = async () => {
    const picked = await showActionSheet({
      title: t("community.postDetail.reportReasonTitle"),
      actions: reportReasons.map((r) => ({ label: r.label })),
    })
    if (picked == null) return

    try {
      await reportPostAsync({
        postId: post!.id,
        reason: reportReasons[picked].value,
      })
      showSuccessToast(
        t("community.postDetail.reportReceivedTitle"),
        t("community.postDetail.reportReceivedBody"),
      )
    } catch (reportError) {
      /*
        지워진 글을 신고하면 `COMMUNITY_ERROR_001` 이 온다. 그때 할 일은 재시도가
        아니라 목록 갱신이라, 새로고침 핸들러를 함께 준다. 이미 신고한 글
        (`003`)은 실패가 아니므로 `presentCommunityError` 가 안내 토스트로 돌린다.
      */
      presentCommunityError(reportError, {
        scope: "community-post-report",
        refresh: () => void refetch(),
      })
    }
  }

  const handleShare = async () => {
    if (!post) return
    // 앱을 이미 깐 사람은 글로 바로 가고, 안 깐 사람은 스토어로 간다.
    // 스토어 URL 만 보내던 시절에는 전자가 앱을 열고 글을 다시 찾아야 했다.
    void shareContent({
      body: t("community.postDetail.shareMessage", {
        title: post.title,
        description: post.description,
        url: APP_DOWNLOAD_URL,
      }),
      link: communityPostDeepLink(post.id),
      scope: "community-post-detail",
    })
  }

  /*
    수정·삭제는 **내 것에만** 보인다. 판정은 이 화면이 하지 않는다 —
    `contentOwnership` 이 서버의 `isMine` 을 읽는다(머리말에 이유가 있다).
  */
  const mineOf = (content: Parameters<typeof isMyContent>[0]) =>
    isMyContent(content, myProfile?.nickName)

  const handleMorePress = async () => {
    if (!post) return
    const mine = mineOf(post)

    // 남의 글에서 남은 행동은 신고 하나 — 항목 하나짜리 중간 메뉴를 거치지
    // 않고 신고 사유 시트로 바로 간다(QA 2026-08-06: "선택지 1개에 시트냐").
    if (!mine) {
      await handleReport()
      return
    }

    // 예전엔 iOS 는 ActionSheetIOS, 안드로이드는 Alert 로 갈라져 있었다.
    // 시트 하나로 합치면 두 OS 가 같은 얼굴이 되고 분기도 사라진다.
    const handlers = [handleEdit, handleDelete]
    const picked = await showActionSheet({
      title: t("community.postDetail.more"),
      actions: [
        { label: t("community.postDetail.edit") },
        { label: t("action.delete"), destructive: true },
      ],
    })
    if (picked != null) await handlers[picked]()
  }

  const handleVote = async (optionIds: number[]) => {
    try {
      await castVoteAsync(optionIds)
    } catch (voteError) {
      /*
        투표는 실패 갈래가 넷이고 셋은 인터넷과 무관하다 — 지워진 투표(`004`) ·
        사라진 항목(`006`) · 하나만 고를 수 있는 투표(`007`) · 이미 참여(`005`).
        앞의 둘은 새로고침하면 지금 상태가 보이고, `005` 는 실패가 아니다.
      */
      presentCommunityError(voteError, {
        scope: "community-post-vote",
        refresh: () => void refetch(),
      })
    }
  }

  const handleTagPress = (tag: string) => {
    router.push({
      pathname: "/community",
      params: { tag },
    } as Href)
  }

  const handleSubmitComment = async () => {
    const content = commentText.trim()
    if (!content) return
    // 골라놓고 '@닉네임'을 지웠다면 태그도 함께 사라진다.
    const mentions = retainedMentions(content, pickedMentions)
    try {
      if (editingCommentId) {
        await updateComment({ commentId: editingCommentId, content, mentions })
        setEditingCommentId(null)
      } else {
        await createComment({
          content,
          parentCommentId: replyingTo?.id ?? null,
          mentions,
        })
        setReplyingTo(null)
      }
      resetCommentDraft()
    } catch (commentError) {
      /*
        답글을 쓰는 동안 상대가 댓글을 지우면 `COMMUNITY_ERROR_010`(답글 대상 없음)이
        온다. 글 자체가 사라졌으면 `001`, 수정 중이던 댓글이면 `008`·`009` 다.
        전부 "댓글 목록을 다시 받으면 보인다" 로 끝나는 실패라 새로고침을 붙인다.
      */
      presentCommunityError(commentError, {
        scope: "community-comment-save",
        refresh: () => void refetchComments(),
      })
    }
  }

  const handleCommentReport = async (comment: CommunityComment) => {
    const picked = await showActionSheet({
      title: t("community.postDetail.reportReasonTitle"),
      actions: reportReasons.map((r) => ({ label: r.label })),
    })
    if (picked == null) return

    try {
      await reportComment({
        commentId: comment.id,
        reason: reportReasons[picked].value,
      })
      showSuccessToast(
        t("community.postDetail.reportReceivedTitle"),
        t("community.postDetail.reportReceivedBody"),
      )
    } catch (commentError) {
      // 이미 신고한 댓글(`011`)은 안내로, 사라진 댓글(`008`)은 새로고침으로 끝난다.
      presentCommunityError(commentError, {
        scope: "community-comment-report",
        refresh: () => void refetchComments(),
      })
    }
  }

  const handleDeleteComment = async (comment: CommunityComment) => {
    const confirmed = await showConfirm({
      title: t("community.postDetail.deleteCommentTitle"),
      description: t("community.postDetail.deleteCommentBody"),
      confirmLabel: t("action.delete"),
      cancelLabel: t("action.cancel"),
      destructive: true,
    })
    if (!confirmed) return

    try {
      await deleteComment(comment.id)
    } catch (commentError) {
      // 남이 쓴 댓글을 지우려 하면 `009`, 이미 지워졌으면 `008` 이다. 둘 다
      // "다시 시도" 로 풀리지 않는다 — 목록을 새로 받는 것이 유일한 다음 걸음이다.
      presentCommunityError(commentError, {
        scope: "community-comment-delete",
        refresh: () => void refetchComments(),
      })
    }
  }

  const handleCommentMore = async (comment: CommunityComment) => {
    if (comment.isDeleted) return
    const startEdit = () => {
      setEditingCommentId(comment.id)
      setReplyingTo(null)
      setCommentText(comment.content)
      setCommentCursor(comment.content.length)
      // 수정 진입 시 기존 멘션을 이어받아, 손대지 않으면 그대로 유지된다.
      setPickedMentions(comment.mentions)
      commentInputRef.current?.focus()
    }
    // 글과 같은 규칙 — 수정·삭제는 내 댓글에만, 남의 댓글엔 답글·신고만.
    const mine = mineOf(comment)
    const handlers = mine
      ? [
          () => startReplyTo(comment),
          startEdit,
          () => handleDeleteComment(comment),
        ]
      : [() => startReplyTo(comment), () => handleCommentReport(comment)]
    const actions = mine
      ? [
          { label: t("community.postDetail.reply") },
          { label: t("community.postDetail.edit") },
          { label: t("action.delete"), destructive: true },
        ]
      : [
          { label: t("community.postDetail.reply") },
          { label: t("community.postDetail.report") },
        ]

    const picked = await showActionSheet({
      title: t("community.postDetail.comment"),
      actions,
    })
    if (picked != null) await handlers[picked]()
  }

  const handleToggleCommentLike = async (comment: CommunityComment) => {
    if (comment.isDeleted) return
    hapticSelection()
    try {
      await toggleCommentLike(comment.id)
    } catch (commentError) {
      presentCommunityError(commentError, {
        scope: "community-comment-like",
        refresh: () => void refetchComments(),
      })
    }
  }

  const renderComment = (comment: CommunityComment, isReply = false) => (
    <View
      key={comment.id}
      style={[styles.comment, isReply && styles.commentReply]}
    >
      <View style={styles.commentTop}>
        <View
          style={[styles.commentAvatar, { backgroundColor: surface.surface }]}
        >
          <Ionicons name="person" size={15} color={surface.textWeak} />
        </View>
        <View style={styles.commentBody}>
          <View style={styles.commentNameRow}>
            <Text
              style={[styles.commentName, { color: surface.textStrong }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {isWithdrawnAuthor(comment)
                ? t("community.postDetail.withdrawnUser")
                : comment.authorName}
            </Text>
            <Text style={[styles.commentTime, { color: surface.textWeak }]}>
              {formatTimeAgo(comment.createdAt, i18n.language)}
            </Text>
          </View>
          <MentionText
            content={
              comment.isDeleted
                ? t("community.postDetail.deletedComment")
                : comment.content
            }
            mentions={comment.mentions}
            muted={comment.isDeleted}
            style={styles.commentContent}
          />
          {!comment.isDeleted && (
            <View style={styles.commentActions}>
              <Pressable
                onPress={() => handleToggleCommentLike(comment)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("community.postDetail.likeComment")}
                style={styles.commentAction}
              >
                <Ionicons
                  name={comment.liked ? "heart" : "heart-outline"}
                  size={14}
                  color={comment.liked ? surface.brand : surface.textWeak}
                />
                {comment.likes > 0 && (
                  <Text
                    style={[
                      styles.commentActionText,
                      {
                        color: comment.liked ? surface.brand : surface.textWeak,
                      },
                    ]}
                  >
                    {comment.likes}
                  </Text>
                )}
              </Pressable>
              {!isReply && (
                <Pressable
                  onPress={() => startReplyTo(comment)}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.commentActionText,
                      { color: surface.textWeak },
                    ]}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {t("community.postDetail.reply")}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        {!comment.isDeleted && (
          <Pressable
            hitSlop={10}
            onPress={() => handleCommentMore(comment)}
            accessibilityRole="button"
            accessibilityLabel={t("community.postDetail.commentMore")}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={16}
              color={surface.textWeak}
            />
          </Pressable>
        )}
      </View>
      {comment.replies.map((reply) => renderComment(reply, true))}
    </View>
  )

  if (isError) {
    /*
      지워진 글의 딥링크(`/post/1`)를 열면 서버는 `COMMUNITY_ERROR_001` 을 준다.
      그런데 화면은 `글을 불러오지 못했어요 / 인터넷 연결을 확인한 뒤…` 에 **다시 시도**
      버튼까지 그렸다 — 없는 글은 몇 번을 눌러도 없으므로 그 버튼은 거짓말이다.
      `resolveError` 가 제목·본문과 함께 `retryable` 을 알려주니 버튼은 그때만 그린다.
    */
    const resolved = resolveError(error)
    return (
      <View
        style={[
          styles.stateScreen,
          {
            backgroundColor: surface.canvas,
            paddingTop: insets.top,
          },
        ]}
      >
        <ErrorMessage
          title={resolved.title}
          message={resolved.body ?? ""}
          onRetry={resolved.retryable ? () => void refetch() : undefined}
          retryLabel={t("community.postDetail.reload")}
        />
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text
            style={[styles.stateAction, { color: surface.brand }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("action.back")}
          </Text>
        </Pressable>
      </View>
    )
  }

  if (isLoading) {
    // 제목 · 글쓴이 · 본문 · 댓글 순서를 미리 세운다 — 도착해도 읽던 위치가 안 밀린다.
    return (
      <View style={{ flex: 1, backgroundColor: surface.canvas }}>
        <ArticleSkeleton variant="post" />
      </View>
    )
  }

  if (!post) {
    return (
      <View
        style={[
          styles.stateScreen,
          {
            backgroundColor: surface.canvas,
            paddingTop: insets.top,
          },
        ]}
      >
        <Text
          style={[styles.stateTitle, { color: surface.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {t("community.postDetail.notFound")}
        </Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text
            style={[styles.stateAction, { color: surface.brand }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("action.back")}
          </Text>
        </Pressable>
      </View>
    )
  }

  const withdrawnAuthor = isWithdrawnAuthor(post)

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      {/* 앱바 */}
      <View style={styles.appBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="chevron-back" size={24} color={surface.textStrong} />
        </Pressable>
        <View style={styles.appBarActions}>
          <Pressable
            hitSlop={10}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel={t("community.postDetail.share")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons
              name="share-outline"
              size={22}
              color={surface.textMuted}
            />
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() => {
              hapticSelection()
              togglePostBookmark()
            }}
            accessibilityRole="button"
            accessibilityLabel={t("community.postDetail.bookmark")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons
              name={post.bookmarked ? "bookmark" : "bookmark-outline"}
              size={21}
              color={post.bookmarked ? surface.brand : surface.textMuted}
            />
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={handleMorePress}
            accessibilityRole="button"
            accessibilityLabel={t("community.postDetail.more")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={surface.textMuted}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        bounces={false}
        overScrollMode="never"
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 96 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        {/* 작성자 */}
        <View style={styles.authorRow}>
          <View
            style={[styles.authorAvatar, { backgroundColor: surface.surface }]}
          >
            <Ionicons name="person" size={19} color={surface.textWeak} />
          </View>
          <View style={styles.authorText}>
            <Text
              style={[styles.authorName, { color: surface.textStrong }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {withdrawnAuthor
                ? t("community.postDetail.withdrawnUser")
                : post.authorName}
            </Text>
            <Text style={[styles.authorSub, { color: surface.textMuted }]}>
              {getCategoryLabel(post.category)} ·{" "}
              {formatTimeAgo(post.createdAt, i18n.language)}
            </Text>
          </View>
        </View>

        {/* 제목·본문 */}
        <Text
          style={[styles.title, { color: surface.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {post.title}
        </Text>
        <Text
          style={[styles.body, { color: surface.text }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {post.description}
        </Text>

        {/* 이미지 — 1장이면 크게, 여러 장이면 가로 스트립. 탭하면 전체 보기. */}
        {post.imageUris.length === 1 && (
          <View style={styles.imageWrap}>
            <Pressable
              onPress={() => setPreviewImage(post.imageUris[0])}
              accessibilityRole="imagebutton"
              accessibilityLabel={t("community.postDetail.enlargePhoto")}
            >
              <Image
                source={{ uri: post.imageUris[0] }}
                style={[styles.postImage, { backgroundColor: surface.surface }]}
                contentFit="cover"
              />
            </Pressable>
          </View>
        )}
        {post.imageUris.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            contentContainerStyle={styles.imageStrip}
          >
            {post.imageUris.map((uri, index) => (
              <Pressable
                key={`${uri}-${index}`}
                onPress={() => setPreviewImage(uri)}
                accessibilityRole="imagebutton"
                accessibilityLabel={t(
                  "community.postDetail.enlargePhotoNumber",
                  { number: index + 1 },
                )}
              >
                <Image
                  source={{ uri }}
                  style={[
                    styles.stripImage,
                    { backgroundColor: surface.surface },
                  ]}
                  contentFit="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* 태그 */}
        {post.tags.length > 0 && (
          <View style={styles.tagsWrap}>
            <TagChips tags={post.tags} onPressTag={handleTagPress} />
          </View>
        )}

        {/* 투표 */}
        {post.vote && (
          <PollCard
            vote={post.vote}
            isSubmitting={isVoting}
            onVote={handleVote}
          />
        )}

        {/* 좋아요 */}
        <View style={styles.engagementRow}>
          <SurfacePressable
            onPress={handleToggleLike}
            hitSlop={4}
            accessibilityState={{ selected: post.liked }}
            accessibilityLabel={t("community.postDetail.like")}
            baseColor={post.liked ? surface.surfaceBrand : surface.surface}
            pressScale={0.94}
            style={styles.likeButton}
          >
            <Animated.View style={heartStyle}>
              <Ionicons
                name={post.liked ? "heart" : "heart-outline"}
                size={16}
                color={post.liked ? surface.brand : surface.textMuted}
              />
            </Animated.View>
            <Text
              style={[
                styles.likeLabel,
                { color: post.liked ? surface.brand : surface.textMuted },
              ]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("community.postDetail.likeCount", { count: post.likes })}
            </Text>
          </SurfacePressable>
        </View>

        {/* 본문 ↔ 댓글 경계 — 두꺼운 회색 밴드 하나로 가른다. */}
        <View
          style={[
            styles.sectionBand,
            {
              backgroundColor: surface.isDark ? "#26262A" : surface.surface,
            },
          ]}
        />

        {/* 댓글 */}
        <View style={styles.commentsSection}>
          <Text
            style={[styles.commentsTitle, { color: surface.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("community.postDetail.commentCount", {
              count: post.comments,
            })}
          </Text>
          {isCommentsLoading ? (
            <Text
              style={[styles.commentsLoading, { color: surface.textMuted }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("community.postDetail.commentsLoading")}
            </Text>
          ) : isCommentsError && comments.length === 0 ? (
            <View style={styles.commentsEmpty}>
              <Text
                style={[
                  styles.commentsEmptyTitle,
                  { color: surface.textStrong },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("community.postDetail.commentsError")}
              </Text>
              <Pressable onPress={() => void refetch()} hitSlop={8}>
                <Text
                  style={[styles.commentsEmptyTitle, { color: surface.brand }]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("action.retry")}
                </Text>
              </Pressable>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.commentsEmpty}>
              <Text
                style={[
                  styles.commentsEmptyTitle,
                  { color: surface.textStrong },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("community.postDetail.noComments")}
              </Text>
              <Text
                style={[styles.commentsEmptySub, { color: surface.textMuted }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("community.postDetail.firstComment")}
              </Text>
            </View>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </View>

        {/* 이어 읽을 글 — 태그·카테고리가 닿아 있는 글을 골라준다. */}
        {relatedPosts.length > 0 && (
          <>
            <View
              style={[
                styles.sectionBand,
                {
                  backgroundColor: surface.isDark ? "#26262A" : surface.surface,
                },
              ]}
            />
            <View style={styles.relatedSection}>
              <Text
                style={[styles.relatedTitle, { color: surface.textStrong }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("community.postDetail.related")}
              </Text>
              {relatedPosts.map((related) => (
                <SurfacePressable
                  key={related.id}
                  onPress={() => router.push(`/post/${related.id}` as Href)}
                  accessibilityLabel={related.title}
                  baseColor={surface.isDark ? "#2E2E33" : surface.surface}
                  style={styles.relatedCard}
                >
                  <Text
                    style={[styles.relatedMeta, { color: surface.textWeak }]}
                    numberOfLines={1}
                  >
                    {getCategoryLabel(related.category)} ·{" "}
                    {formatTimeAgo(related.createdAt, i18n.language)}
                  </Text>
                  <Text
                    style={[
                      styles.relatedCardTitle,
                      { color: surface.textStrong },
                    ]}
                    numberOfLines={2}
                    lineBreakStrategyIOS="hangul-word"
                    textBreakStrategy="balanced"
                  >
                    {related.title}
                  </Text>
                </SurfacePressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* 댓글 입력 바 */}
      <KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>
        {/* 멘션 후보는 입력 바 밖에 띄운다 — 흰 면이 위로 늘어나지 않는다. */}
        {visibleMentionCandidates.length > 0 && (
          <View style={styles.mentionFloat}>
            <MentionSuggestions
              candidates={visibleMentionCandidates}
              onSelect={handleSelectMention}
            />
          </View>
        )}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: surface.canvas,
              borderTopColor: surface.hairline,
              paddingBottom: 10 + bottomInset,
            },
          ]}
        >
          {(replyingTo || editingCommentId) && (
            <View
              style={[
                styles.inputContext,
                { backgroundColor: surface.surface },
              ]}
            >
              <Text
                style={[styles.inputContextText, { color: surface.textMuted }]}
                numberOfLines={1}
              >
                {editingCommentId
                  ? t("community.postDetail.editingComment")
                  : t("community.postDetail.replyingTo", {
                      name: replyingTo?.authorName,
                    })}
              </Text>
              <Pressable
                onPress={() => {
                  setReplyingTo(null)
                  setEditingCommentId(null)
                  resetCommentDraft()
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("community.postDetail.cancelReply")}
              >
                <Ionicons name="close" size={15} color={surface.textWeak} />
              </Pressable>
            </View>
          )}
          {/* 확정된 태그 — 이 사람들에게만 실제로 알림이 간다. */}
          {activeMentions.length > 0 && (
            <View style={styles.mentionChips}>
              {activeMentions.map((nickName) => (
                <Pressable
                  key={nickName}
                  onPress={() => handleRemoveMention(nickName)}
                  accessibilityRole="button"
                  accessibilityLabel={t("community.postDetail.removeMention", {
                    name: nickName,
                  })}
                  style={({ pressed }) => [
                    styles.mentionChip,
                    {
                      backgroundColor: surface.surfaceBrand,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.mentionChipText, { color: surface.brand }]}
                    numberOfLines={1}
                  >
                    @{nickName}
                  </Text>
                  <Ionicons name="close" size={12} color={surface.brand} />
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.inputRow}>
            <View
              style={[styles.inputField, { backgroundColor: surface.surface }]}
            >
              <TextInput
                ref={commentInputRef}
                value={commentText}
                onChangeText={setCommentText}
                onSelectionChange={(event) =>
                  setCommentCursor(event.nativeEvent.selection.start)
                }
                placeholder={t("community.postDetail.commentPlaceholder")}
                placeholderTextColor={surface.placeholder}
                multiline
                maxLength={2000}
                style={[styles.commentInput, { color: surface.textStrong }]}
              />
            </View>
            <SurfacePressable
              onPress={handleSubmitComment}
              disabled={
                isCreatingComment || isUpdatingComment || !commentText.trim()
              }
              accessibilityLabel={
                editingCommentId
                  ? t("community.postDetail.saveComment")
                  : t("community.postDetail.postComment")
              }
              baseColor={commentText.trim() ? inkBg : surface.ctaOffBg}
              pressedColor={
                commentText.trim()
                  ? surface.isDark
                    ? "#DADAE0"
                    : "#34363A"
                  : surface.ctaOffBg
              }
              pressScale={0.88}
              style={styles.sendButton}
            >
              <Ionicons
                name="arrow-up"
                size={17}
                color={commentText.trim() ? inkContent : surface.ctaOffText}
              />
            </SurfacePressable>
          </View>
        </View>
      </KeyboardStickyView>

      {/* 이미지 전체 보기 */}
      <AppModal
        visible={previewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <Pressable
          onPress={() => setPreviewImage(null)}
          style={styles.previewOverlay}
          accessibilityRole="button"
          accessibilityLabel={t("community.postDetail.closePhoto")}
        >
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              contentFit="contain"
            />
          )}
          <View style={styles.previewClose}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </View>
        </Pressable>
      </AppModal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  stateScreen: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    gap: 12,
  },
  stateTitle: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.32,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
    textAlign: "center",
  },
  stateAction: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
    textAlign: "center",
  },

  appBar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  authorRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  authorText: {
    gap: 1,
  },
  authorName: {
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  authorSub: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },

  title: {
    paddingHorizontal: 20,
    paddingTop: 18,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.4,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    fontSize: 15.5,
    lineHeight: 25,
    letterSpacing: -0.31,
    fontFamily: "Pretendard-Regular",
  },

  imageWrap: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  postImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 14,
  },
  imageStrip: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  stripImage: {
    width: 200,
    height: 200,
    borderRadius: 14,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "94%",
    height: "76%",
  },
  previewClose: {
    position: "absolute",
    top: 60,
    right: 20,
    padding: 8,
  },

  tagsWrap: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  engagementRow: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
  },
  likeButton: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likeLabel: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.28,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },

  sectionBand: {
    height: 8,
  },

  relatedSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 8,
  },
  relatedTitle: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    paddingBottom: 2,
  },
  relatedCard: {
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  relatedMeta: {
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: -0.23,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  relatedCardTitle: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.28,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },

  commentsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  commentsTitle: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    paddingBottom: 8,
  },
  commentsLoading: {
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: "Pretendard-Regular",
    paddingVertical: 12,
  },
  commentsEmpty: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 4,
  },
  commentsEmptyTitle: {
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  commentsEmptySub: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontFamily: "Pretendard-Regular",
  },

  comment: {
    paddingVertical: 10,
  },
  commentReply: {
    marginLeft: 40,
  },
  commentTop: {
    flexDirection: "row",
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  commentBody: {
    flex: 1,
    gap: 3,
  },
  commentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commentName: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  commentTime: {
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: -0.23,
    fontFamily: "Pretendard-Regular",
  },
  commentContent: {
    fontSize: 14.5,
    lineHeight: 22,
    letterSpacing: -0.29,
    fontFamily: "Pretendard-Regular",
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 4,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },

  mentionFloat: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputContext: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  inputContextText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  mentionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  mentionChip: {
    height: 28,
    borderRadius: 8,
    paddingLeft: 10,
    paddingRight: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: 180,
  },
  mentionChipText: {
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  inputField: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    justifyContent: "center",
  },
  commentInput: {
    minHeight: 22,
    maxHeight: 96,
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
    fontFamily: "Pretendard-Regular",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
})
