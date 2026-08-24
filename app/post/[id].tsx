import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Text, TextInput } from "@/src/shared/components/AppText"
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
import { useQueryClient } from "@tanstack/react-query"
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
import {
  POSTS_KEY,
  useCommunityPosts,
} from "@/src/features/recipe/hooks/useCommunityPosts"
import {
  isAuthorBlocked,
  useBlockedUsers,
} from "@/src/features/recipe/hooks/useBlockedUsers"
import { COMMUNITY_POST_REFRESH } from "@/src/features/recipe/refresh/scopes"
import { useRefreshable, useRevalidateOnReturn } from "@/src/shared/refresh"
import { PollCard } from "@/src/features/recipe/components/PollCard"
import { TagChips } from "@/src/features/recipe/components/TagChips"
import { NextPageErrorRow } from "@/src/features/recipe/components/NextPageErrorRow"
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
import {
  ArticleSkeleton,
  ErrorMessage,
  HeaderIconButton,
  headerActionRowRoom,
} from "@/src/shared/components"
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
/*
  탈퇴 판정(`isWithdrawnAuthor`)은 **여기서 다시 적지 않는다.** 이 파일에는
  `author.authorId === null || author.authorName === WITHDRAWN_AUTHOR_NAME` 를 그대로
  베낀 사본이 있었다 — 소유자·탈퇴 판정은 한 곳에만 산다는 규칙(`contentOwnership`
  머리말)의 정확히 그 위반이고, 두 벌이면 한쪽만 고치는 사고가 난다.
*/
import {
  isMyContent,
  isWithdrawnAuthor,
  WITHDRAWN_AUTHOR_NAME,
} from "@/src/features/recipe/utils/contentOwnership"

const HEART_SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }

/** 설치 링크는 한 곳에서만 짓는다(`deepLink.ts` 머리말). */
const APP_DOWNLOAD_URL = STORE_REDIRECT_URL

export default function PostDetailScreen() {
  const { t, i18n } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const queryClient = useQueryClient()
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
    isPostGone,
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
  /*
    작성자의 "다른 글" 후보와 `deletePost` 때문에 피드 훅이 여기 붙는다. 관찰 여부는
    **캐시가 정한다**(`observe: "cold-only"`).

    피드를 보다 들어온 사람에게는 관찰하지 않는다 — 옵저버를 하나 더 마운트하는
    것만으로 이미 낡은 무한 쿼리의 **페이지 전부**가 다시 날아간다(3페이지 스크롤 뒤
    글을 열면 GET 3개). 캐시에 있는 것만 읽는다.

    그런데 그냥 `false` 로 두면 **푸시 알림·공유 링크로 앱을 콜드 스타트한 사람**에게는
    피드 캐시가 아예 없어서 `relatedPosts` 가 항상 빈 배열이고, 아래 섹션이 통째로
    사라진다(그런 섹션이 있었다는 흔적도 남지 않는다). 그래서 캐시가 비었을 때만
    켠다 — 그때 나가는 요청은 **첫 장 하나**뿐이다(이 화면에는 `fetchNextPage` 가 없다).

    판정 기준은 **기본 조합**이다(이 호출에 인자가 없다). 그래서 `category=diet` 를
    보다 들어온 사람은 피드를 세 장 스크롤했어도 "콜드" 로 판정돼 요청이 한 번 나간다 —
    관련글이 읽는 캐시가 바로 그 기본 조합이라 그에게는 실제로 읽을 데이터가 없다.
    의도한 동작이고 대가는 첫 장 하나다(`useCommunityPosts` 의 `observe` 머리말).

    그 **한 번의 요청이 실패하면** 섹션을 조용히 지우지 않는다(아래 `relatedFailed`) —
    재시도는 두 번뿐이고, 상세의 새로고침 스코프에는 피드가 없어서
    (`COMMUNITY_POST_REFRESH`) 그대로 두면 이 화면이 살아 있는 내내 복구되지 않는다.
  */
  const {
    posts,
    deletePostAsync,
    isDeleting,
    isError: isRelatedError,
    error: relatedError,
    refetch: refetchRelated,
  } = useCommunityPosts({ observe: "cold-only" })
  const { blockedAuthors } = useBlockedUsers()

  /*
    상세에는 당김이 아예 없었다. 댓글이 달렸는지 보려면 뒤로 갔다 다시 들어와야 했고,
    그마저 목록 캐시가 살아 있으면 같은 화면이 다시 그려졌다.
    본문·댓글을 한 스코프로 묶는다 — 댓글만 새로 오면 상단 좋아요 수와 어긋난다.
  */
  const refreshable = useRefreshable({
    queryKeys: COMMUNITY_POST_REFRESH,
    scope: "community-post",
    /*
      피드는 이 스코프에 없다(`COMMUNITY_POST_REFRESH` 머리말) — 여기서 당길 때마다
      피드가 들고 있던 페이지를 전부 다시 받던 자리다. 좋아요·북마크·댓글 수는
      `patchPostInFeedCaches` 가 이미 계보에 반영하므로, 남은 것은 낡음 표시뿐이다.
    */
    extra: () =>
      queryClient.invalidateQueries({
        queryKey: POSTS_KEY,
        refetchType: "none",
      }),
  })
  useRevalidateOnReturn({ queryKeys: COMMUNITY_POST_REFRESH })

  const inkBg = surface.isDark ? "#F4F4F6" : "#1D1E20"
  const inkContent = surface.isDark ? "#17181C" : "#FFFFFF"
  /**
   * 본문↔댓글 · 댓글↔이어 읽을 글 경계의 두꺼운 밴드. 두 자리가 같은 값이다.
   *
   * 값은 `surface.band` 다 — 토큰 표가 **이 개념 그대로** 정의해 둔 자리다
   * ("화면을 가르는 띠" · `src/theme/surface.ts`). 예전에는 다크만 손으로 고른
   * `#26262A` 였는데, 그 값은 v2 팔레트 어디에도 없어서 팔레트가 움직여도 혼자
   * 따라오지 않는 면이었다. 같은 띠를 그리는 건강검진 목록(`background.lower`)과
   * 레시피 작성(`s.band`)이 이미 이 토큰을 쓴다.
   */
  const sectionBandBg = surface.band
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

  /**
   * 이어 읽을 글 — 태그·카테고리·핫스코어 기반, 차단한 작성자의 글은 제외.
   *
   * 필터 식은 피드·검색·인기·스토리·보관함과 **글자 그대로 같다** — 탈퇴 글쓴이는
   * 면제다. 여기만 면제가 빠져 있어서, `탈퇴한 사용자` 라는 라벨이 이름 축에 앉는
   * 순간(지금 프로덕션 파이썬 서버는 차단 목록에 id 칸이 없어 **모든 행**이 그렇다)
   * 같은 글이 피드에는 서고 이 섹션에서는 사라졌다.
   */
  const relatedPosts = useMemo(() => {
    if (!post) return []
    const candidates = posts.filter(
      (p) => isWithdrawnAuthor(p) || !isAuthorBlocked(blockedAuthors, p),
    )
    return rankRelatedPosts(post, candidates, new Date(), 3)
  }, [post, posts, blockedAuthors])

  /*
    **후보를 못 받았다는 사실은 말한다.** 콜드 스타트(푸시·공유 링크)에서 켜지는
    그 한 번의 피드 요청이 실패하면 후보가 0개고, 예전에는 섹션이 통째로 사라졌다 —
    실패한 적이 있다는 흔적이 어디에도 남지 않는 조용한 축소다. 게다가 재조회할
    경로가 없다: 재시도 2회 뒤 포기하고, `refetchOnWindowFocus` 는 꺼져 있고,
    상세의 새로고침 스코프에는 피드가 **일부러** 빠져 있다(`COMMUNITY_POST_REFRESH`).
    그래서 화면이 살아 있는 내내 복구되지 않는다. 머리글과 조용한 재시도를 세운다.

    `relatedPosts` 가 아니라 `posts` 로 판정한다 — 후보는 받았는데 닿는 글이 없는
    경우(정상)와 아예 못 받은 경우(실패)는 다른 사실이다.
  */
  const relatedFailed = isRelatedError && posts.length === 0

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

  /*
    **지워진 것을 확인한 뒤에만 나간다.**

    예전에는 `deletePost(id)` 를 쏘고 곧바로 `router.back()` 했다. 실패는 훅이 조용히
    삼켰고(`onError` 는 재조회만 걸었는데, 삭제가 실패하는 가장 흔한 이유가 회선이
    없어서라 그 재조회도 못 나간다) 낙관 삭제는 그대로 굳었다 — 글은 피드·검색·인기
    에서 사라지고, 아무 말도 없고, 다음 자연 재검증이 며칠 뒤 되살린다.
    지금은 훅이 확정 뒤에만 지우고(`useCommunityPosts` 의 삭제 머리말), 이 화면은
    성공했을 때만 나간다. 실패하면 지우려던 글 위에 남아 이유를 듣는다.
  */
  const handleDelete = async () => {
    // 요청이 떠 있는 동안 한 번 더 지우면 두 번째는 `COMMUNITY_ERROR_001` 로 돌아온다 —
    // 실제로는 지워진 것인데 화면은 "이 글은 사라졌어요" 를 실패처럼 말하게 된다.
    if (isDeleting) return
    const confirmed = await showConfirm({
      title: t("community.postDetail.deletePostTitle"),
      description: t("community.postDetail.deletePostBody"),
      confirmLabel: t("action.delete"),
      cancelLabel: t("action.cancel"),
      destructive: true,
    })
    if (!confirmed) return
    // 확인 다이얼로그 dismiss 와 다음 전이가 겹치지 않게(appModalGate 머리말).
    await afterModalTransitions()
    try {
      await deletePostAsync(post!.id)
    } catch (deleteError) {
      /*
        이미 지워진 글(`COMMUNITY_ERROR_001`)이면 새로고침이 답이고 — 그때 상세 쿼리가
        404 를 받아 이 화면이 묘비로 바뀐다 — 남의 글(`002`)이면 다시 시도해도 같다.
        전송 실패는 회선이 돌아온 뒤 한 번 더 누르면 된다.
      */
      presentCommunityError(deleteError, {
        scope: "community-post-delete",
        refresh: () => void refetch(),
      })
      return
    }
    router.back()
  }

  const handleReport = async () => {
    if (!post) return
    await afterModalTransitions()
    router.push(`/community/report?postId=${post.id}` as Href)
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
      const resolved = resolveError(commentError)
      /*
        **대상이 없어진 수정은 겨눔을 푼다.** `setEditingCommentId(null)` 이 `await`
        뒤에 있어서, 사라진 댓글(`008`)·남의 댓글(`009`)을 고치려다 실패하면 입력 바가
        그 댓글에 고정된 채 남았다. 사용자가 안내대로 새로고침하면 그 댓글은 트리에서
        사라지는데 바는 여전히 "댓글 수정 중" 이고, 보내기는 영원히 같은 오류를 낸다.
        **전송 실패·5xx 는 그대로 겨눈 채 둔다** — 대상은 아직 있고 다시 시도가 정답이다.
        초안까지 비우는 이유: 겨눔만 풀면 다음 전송이 그 글을 **새 댓글로** 올린다.
      */
      const targetVanished =
        resolved.code === "COMMUNITY_ERROR_008" ||
        resolved.code === "COMMUNITY_ERROR_009" ||
        resolved.kind === "notFound"
      if (editingCommentId && targetVanished) {
        setEditingCommentId(null)
        resetCommentDraft()
      }
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

  /**
   * 댓글의 ⋯ 메뉴.
   *
   * `isReply` 를 받는 이유: 서버는 **답글의 답글을 받지 않는다**(`INVALID_COMMENT_PARENT`).
   * 인라인 "답글" 버튼은 그래서 `!isReply` 로 잠겨 있는데 이 시트만 잠기지 않아서,
   * 답글에서 ⋯ → 답글 을 고르면 입력 바가 그 답글에 고정되고 전송은 **언제나** 실패했다.
   * 게다가 그때 뜨는 안내는 "답글을 달 댓글이 사라졌어요 / 새로고침한 뒤 다시 달아
   * 주세요"(`COMMUNITY_ERROR_010`) 다 — 댓글은 사라지지 않았고, 새로고침해도 그대로고,
   * 다시 시도해도 똑같이 실패한다. 빠져나가는 길은 아무도 가리키지 않는 ✕ 하나였다.
   * 애초에 고를 수 없게 한다.
   */
  const handleCommentMore = async (
    comment: CommunityComment,
    isReply: boolean,
  ) => {
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
    // 답글에는 "답글" 이 아예 없다(서버가 못 받는다 · 위 머리말).
    const mine = mineOf(comment)
    const replyEntry = isReply
      ? []
      : [
          {
            handler: () => startReplyTo(comment),
            action: { label: t("community.postDetail.reply") },
          },
        ]
    const entries = [
      ...replyEntry,
      ...(mine
        ? [
            {
              handler: startEdit,
              action: { label: t("community.postDetail.edit") },
            },
            {
              handler: () => handleDeleteComment(comment),
              action: { label: t("action.delete"), destructive: true },
            },
          ]
        : [
            {
              handler: () => handleCommentReport(comment),
              action: { label: t("community.postDetail.report") },
            },
          ]),
    ]

    const picked = await showActionSheet({
      title: t("community.postDetail.comment"),
      actions: entries.map((entry) => entry.action),
    })
    if (picked != null) await entries[picked].handler()
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
          <Ionicons name="person" size={15} color={surface.text} />
        </View>
        <View style={styles.commentBody}>
          {/*
            **지워진 댓글은 글쓴이를 밝히지 않는다.** 이 줄이 아래 `isDeleted` 가드
            밖에 있어서 묘비가 "철수 · 3시간 전 / 삭제된 댓글이에요" 로 떴다 — 서버는
            지울 때 멘션을 일부러 비워 흔적을 없애는데(`authorName` 은 트리를 그리려고
            계속 보낸다) 앱이 그 이름을 도로 세우고 있었다. 남는 것은 답글이 매달릴
            자리 하나면 된다.
          */}
          {!comment.isDeleted && (
            <View style={styles.commentNameRow}>
              <Text
                style={[styles.commentName, { color: surface.textStrong }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {isWithdrawnAuthor(comment)
                  ? t("community.postDetail.withdrawnUser")
                  : comment.authorName}
              </Text>
              <Text style={[styles.commentTime, { color: surface.text }]}>
                {formatTimeAgo(comment.createdAt, i18n.language)}
              </Text>
            </View>
          )}
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
                  color={comment.liked ? surface.brand : surface.text}
                />
                {comment.likes > 0 && (
                  <Text
                    style={[
                      styles.commentActionText,
                      {
                        color: comment.liked ? surface.brand : surface.text,
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
                    style={[styles.commentActionText, { color: surface.text }]}
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
            onPress={() => handleCommentMore(comment, isReply)}
            accessibilityRole="button"
            accessibilityLabel={t("community.postDetail.commentMore")}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={16}
              color={surface.text}
            />
          </Pressable>
        )}
      </View>
      {comment.replies.map((reply) => renderComment(reply, true))}
    </View>
  )

  if (isError && (!post || isPostGone)) {
    /*
      **본문이 있으면 오류 화면이 이기지 않는다 — 글이 정말 사라진 게 아니라면.**
      react-query 는 재조회가 실패해도 들고 있던 `data` 를 그대로 두고 `status` 만
      `"error"` 로 바꾼다 — 그래서 `isError && post` 는 도달 가능한 상태다. 그때 이
      화면을 그리면 비행기 모드에서 당긴 사용자가 읽던 글이 통째로 사라지고(뒤로 갔다
      와도 캐시가 error 라 그대로), 느린 회선에서는 본문이 뜬 몇 초 뒤 오류로 바뀐다.
      당김 실패는 `useRefreshable` 의 토스트가 이미 비파괴적으로 말한다 — 목록 세
      화면(R5)과 같은 규칙이다.

      **예외가 하나 있다: 서버가 "이 글은 없다" 고 말했을 때**(`isPostGone` —
      `COMMUNITY_ERROR_001`·404). 상세 쿼리는 계보에서 `initialData` 를 받으므로
      목록에서 들어오면 `post` 가 **항상** 있고, 그래서 이 화면은 남이 지운 글 위에서도
      멀쩡해 보였다: 하트는 눌렸다 튕기고, 북마크도 같고, 수정은 낡은 사본으로 편집기를
      열고, 공유는 성공해서 받는 사람만 묘비를 본다. 그 사본으로 할 수 있는 일이 하나도
      없으므로 그때는 묘비가 이긴다(피드 행은 훅이 함께 지운다 · `usePostDetail`).

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
        <HeaderIconButton
          onPress={() => router.back()}
          accessibilityLabel={t("action.back")}
        >
          <Ionicons name="chevron-back" size={24} color={surface.textStrong} />
        </HeaderIconButton>
        <View style={styles.appBarActions}>
          <HeaderIconButton
            onPress={handleShare}
            accessibilityLabel={t("community.postDetail.share")}
            visualSize={22}
          >
            <Ionicons name="share-outline" size={22} color={surface.text} />
          </HeaderIconButton>
          <HeaderIconButton
            onPress={() => {
              hapticSelection()
              togglePostBookmark()
            }}
            accessibilityLabel={t("community.postDetail.bookmark")}
            visualSize={22}
          >
            <Ionicons
              name={post.bookmarked ? "bookmark" : "bookmark-outline"}
              size={21}
              color={post.bookmarked ? surface.brand : surface.text}
            />
          </HeaderIconButton>
          <HeaderIconButton
            onPress={handleMorePress}
            accessibilityLabel={t("community.postDetail.more")}
            visualSize={22}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={surface.text}
            />
          </HeaderIconButton>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 96 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        {...refreshable.scrollProps}
      >
        {/* 작성자 */}
        <Pressable
          onPress={() => {
            if (post.authorId != null) {
              router.push(`/community/author/${post.authorId}` as Href)
            }
          }}
          disabled={post.authorId == null || withdrawnAuthor}
          accessibilityRole={post.authorId == null ? undefined : "button"}
          accessibilityLabel={
            post.authorId == null
              ? undefined
              : t("community.author.openProfile", {
                  name: post.authorName,
                })
          }
          style={({ pressed }) => [
            styles.authorRow,
            pressed && { opacity: 0.65 },
          ]}
        >
          <View
            style={[styles.authorAvatar, { backgroundColor: surface.surface }]}
          >
            <Ionicons name="person" size={19} color={surface.text} />
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
            <Text style={[styles.authorSub, { color: surface.text }]}>
              {getCategoryLabel(post.category)} ·{" "}
              {formatTimeAgo(post.createdAt, i18n.language)}
            </Text>
          </View>
          {post.authorId != null && !withdrawnAuthor && (
            <Ionicons name="chevron-forward" size={16} color={surface.text} />
          )}
        </Pressable>

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
          <Text style={[styles.viewCount, { color: surface.text }]}>
            {/*
              천 단위는 **문구 쪽**에서 끊는다(`"조회 {{count, number}}"`).
              여기서 `formatCount()` 로 미리 끊어 `{{formattedCount}}` 로 넘기려면
              같은 열쇠를 부르는 `CommunityPopularScreen` 도 같이 고쳐야 하는데,
              한쪽만 고치면 다른 화면에 `{{formattedCount}}` 가 글자 그대로 찍힌다.
              복수형(`viewCount_one`/`_other`)도 `count` 로 그대로 갈린다.
            */}
            {t("community.postDetail.viewCount", { count: post.views ?? 0 })}
          </Text>
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
                color={post.liked ? surface.brand : surface.text}
              />
            </Animated.View>
            <Text
              style={[
                styles.likeLabel,
                { color: post.liked ? surface.brand : surface.text },
              ]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("community.postDetail.likeCount", { count: post.likes })}
            </Text>
          </SurfacePressable>
        </View>

        {/* 본문 ↔ 댓글 경계 — 두꺼운 회색 밴드 하나로 가른다. */}
        <View
          style={[styles.sectionBand, { backgroundColor: sectionBandBg }]}
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
              style={[styles.commentsLoading, { color: surface.text }]}
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
              {/* 실패한 것은 **댓글** 쿼리다 — `refetch()`(본문)를 부르면 이 자리는
                  몇 번을 눌러도 오류에서 못 나온다. */}
              <Pressable onPress={() => void refetchComments()} hitSlop={8}>
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
                style={[styles.commentsEmptySub, { color: surface.text }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("community.postDetail.firstComment")}
              </Text>
            </View>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </View>

        {/*
          이어 읽을 글 — 태그·카테고리가 닿아 있는 글을 골라준다.
          후보 조회가 실패했을 때도(그때만) 머리글은 세운다: 있던 섹션이 흔적 없이
          사라지는 대신 무슨 일이 있었는지 말하고 다시 받을 기회를 준다(`relatedFailed`).
        */}
        {relatedPosts.length > 0 || relatedFailed ? (
          <>
            <View
              style={[styles.sectionBand, { backgroundColor: sectionBandBg }]}
            />
            <View style={styles.relatedSection}>
              <Text
                style={[styles.relatedTitle, { color: surface.textStrong }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("community.postDetail.related")}
              </Text>
              {relatedFailed ? (
                /*
                  목록 두 화면(R5)의 꼬리와 **같은 조용한 행**이다 — 문구 하나와
                  재시도 하나. 여기서 눌리는 것은 후보 목록의 첫 장이라 회선이
                  돌아오면 그대로 섹션이 선다.
                */
                <NextPageErrorRow
                  title={resolveError(relatedError).title}
                  retryLabel={t("action.retry")}
                  onRetry={() => void refetchRelated()}
                />
              ) : null}
              {relatedPosts.map((related) => (
                <SurfacePressable
                  key={related.id}
                  onPress={() => router.push(`/post/${related.id}` as Href)}
                  accessibilityLabel={related.title}
                  baseColor={surface.isDark ? "#2E2E33" : surface.surface}
                  style={styles.relatedCard}
                >
                  <Text
                    style={[styles.relatedMeta, { color: surface.text }]}
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
        ) : null}
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
                style={[styles.inputContextText, { color: surface.text }]}
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
                <Ionicons name="close" size={15} color={surface.text} />
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
              /*
                원은 36pt 다 — 손끝 최소치(44pt)보다 8pt 작다. 좋아요 버튼이 같은
                줄에서 쓰는 방법 그대로 `hitSlop` 으로 사방 4pt 를 채워 44pt 를
                만든다. 원을 키우면 입력 바의 높이가 따라 커지므로 그리는 크기는
                두고 **닿는 크기만** 넓힌다.
              */
              hitSlop={4}
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
    /*
      규격 터치 상자(44/48)가 이 행 **안쪽**에 들어오게 자리를 만든다. 안드로이드는
      부모 경계 밖 터치를 자식에게 안 준다 — 이게 없으면 상자를 키워도 위아래·좌우로
      넘친 절반이 죽는다. 행이 차지하는 자리와 아이콘 위치는 그대로다(그 함수 주석).
    */
    ...headerActionRowRoom(22),
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewCount: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontFamily: "Pretendard-Regular",
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
  /*
    위·아래를 **같은 수로 주면 위가 더 커 보인다.** 이 블록 바로 위에는 `댓글 0`
    머리가 있고, 그 줄의 글자 상자(21)와 제 아래 여백(8)이 눈에는 **빈 공간의 일부**로
    읽힌다 — 왼쪽 끝에 짧은 글자 하나뿐이라 그 줄의 나머지 폭이 통째로 여백처럼 보인다.
    반대로 아래에는 그런 것이 없다. 그래서 숫자가 대칭이어도 그림은 위로 쏠린다.

    아래에 그 머리 줄만큼(21)을 더해 눈으로 맞춘다. 실기기에서 보고 정한 값이다 —
    산술로 대칭을 만들면 이 결함이 그대로 돌아온다.
  */
  commentsEmpty: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 57,
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
