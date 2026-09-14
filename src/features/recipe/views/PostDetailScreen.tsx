import { borderWidth } from "@/src/design-system-v2/tokens/size"
import {
  hasSubmittableComment,
  prepareCommentReply,
} from "../utils/commentDraft"
import { primitives } from "@/src/design-system-v2/tokens/colors"
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { V2Text } from "@/src/design-system-v2"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import {
  AppModal,
  afterModalTransitions,
} from "@/src/shared/components/AppModal"
import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  KeyboardController,
  useKeyboardState,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller"
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
import { RelatedDiscussionRow } from "../components/community/RelatedDiscussionRow"
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
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"

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

import { useSuppressGlobalKeyboardToolbar } from "@/src/stores/keyboardToolbarStore"
import { orderComments, type CommentOrder } from "../utils/commentOrder"
import { typography } from "@/src/design-system-v2/tokens"
import {
  FIELD,
  FORM,
  MIN,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"
import { useCommentDraftGuard } from "../hooks/useCommentDraftGuard"

const HEART_SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }

/** 설치 링크는 한 곳에서만 짓는다(`deepLink.ts` 머리말). */
const APP_DOWNLOAD_URL = STORE_REDIRECT_URL

/** 카테고리 키 → 문구 키. 렌더마다 `switch` 를 다시 만들지 않으려고 표로 둔다(검색 화면과 같은 모양). */
const CATEGORY_LABEL_KEYS = {
  diet: "community.categories.diet",
  numbers: "community.categories.numbers",
  symptoms: "community.categories.symptoms",
  medicine: "community.categories.medicine",
  "dining-out": "community.categories.diningOut",
  daily: "community.categories.daily",
} as const

/** 댓글 신고 사유 — 서버 enum 과 문구 키. 문구는 `t` 가 바뀔 때만 다시 만든다. */
const REPORT_REASONS = [
  { labelKey: "community.postDetail.reportReasons.spam", value: "SPAM" },
  {
    labelKey: "community.postDetail.reportReasons.harassment",
    value: "HARASSMENT",
  },
  {
    labelKey: "community.postDetail.reportReasons.inappropriate",
    value: "INAPPROPRIATE_CONTENT",
  },
  {
    labelKey: "community.postDetail.reportReasons.falseInformation",
    value: "FALSE_INFORMATION",
  },
  { labelKey: "community.postDetail.reportReasons.other", value: "OTHER" },
] as const

/*
  ─── 댓글 행과 입력 바를 화면에서 떼어 낸 이유 ──────────────────────────────

  입력창의 글자·커서가 **화면 상태**였다. 한 글자를 칠 때마다 1,800줄짜리 화면이
  통째로 다시 그려졌다 — 댓글 트리 전부(행마다 `formatTimeAgo`·멘션 조각 다시 계산),
  신고 사유 배열·카테고리 라벨 재생성, 이어 읽을 글까지. 긴 댓글이 달린 글에서는
  입력이 눈에 띄게 끊겼다.

  그래서 둘로 가른다.
   - `PostCommentRow` — 댓글 한 행. `memo` 이고 받는 것은 댓글 객체와 **고정 콜백**
     셋뿐이라, 화면이 다시 그려져도 그 댓글이 그대로면 건너뛴다.
   - `PostCommentComposer` — 입력 바. 글자·커서·멘션 후보·초안 가드를 **스스로**
     들고 있어 타이핑이 화면까지 올라오지 않는다. 화면이 알아야 하는 것은 답글·수정
     **대상**(누구에게 · 어느 댓글)과 전송뿐이고, 대상을 정하는 쪽(화면)이 초안을 심는
     길은 `ref` 의 `seed`/`reset`/`confirmDiscard` 다.
*/

interface CommentActions {
  onToggleLike: (comment: CommunityComment) => void
  onReply: (comment: CommunityComment) => void
  onMore: (comment: CommunityComment, isReply: boolean) => void
}

interface PostCommentRowProps extends CommentActions {
  comment: CommunityComment
  isReply: boolean
}

/**
 * 댓글 한 행(답글은 자기 자신을 한 단 들여 재귀한다).
 *
 * 안쪽 함수 이름이 바깥 상수와 다른 이유: 같으면 재귀의 `<PostCommentRow>` 가 함수
 * 표현식의 자기 이름(= `memo` 를 거치지 않은 본체)에 묶여 답글 행만 메모가 풀린다.
 */
const PostCommentRow = memo(function PostCommentRowInner({
  comment,
  isReply,
  onToggleLike,
  onReply,
  onMore,
}: PostCommentRowProps) {
  const { t, i18n } = useTranslation()
  const surface = useSurface()
  const router = useAppRouter()

  return (
    <View
      style={[
        styles.comment,
        { borderBottomColor: surface.border },
        isReply && styles.commentReply,
      ]}
    >
      <View style={styles.commentTop}>
        <View
          style={[
            styles.commentAvatar,
            { backgroundColor: surface.surfaceSunken },
          ]}
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
              {/*
                댓글 이름도 프로필로 간다 — 글 상세의 작성자 행(위)과 같은 규칙이다.
                예전에는 이 이름이 평문이라, 같은 화면 안에서 위쪽 이름은 눌리고
                아래쪽 이름은 안 눌렸다. 탈퇴·익명(`authorId === null`)은 갈 곳이
                없으므로 `disabled` 로 두고 평문처럼 보이게 둔다.
              */}
              <Pressable
                onPress={() => {
                  if (comment.authorId != null) {
                    router.push(`/community/author/${comment.authorId}` as Href)
                  }
                }}
                disabled={
                  comment.authorId == null || isWithdrawnAuthor(comment)
                }
                hitSlop={8}
                accessibilityRole={
                  comment.authorId == null ? undefined : "button"
                }
                accessibilityLabel={
                  comment.authorId == null
                    ? undefined
                    : t("community.author.openProfile", {
                        name: comment.authorName,
                      })
                }
              >
                <V2Text
                  style={styles.commentName}
                  color={surface.textStrong}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {isWithdrawnAuthor(comment)
                    ? t("community.postDetail.withdrawnUser")
                    : comment.authorName}
                </V2Text>
              </Pressable>
              <V2Text style={styles.commentTime} color={surface.text}>
                {formatTimeAgo(comment.createdAt, i18n.language)}
              </V2Text>
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
                onPress={() => onToggleLike(comment)}
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
                  <V2Text
                    style={styles.commentActionText}
                    color={comment.liked ? surface.brand : surface.text}
                  >
                    {comment.likes}
                  </V2Text>
                )}
              </Pressable>
              {!isReply && (
                <Pressable
                  onPress={() => onReply(comment)}
                  hitSlop={8}
                  accessibilityRole="button"
                  style={styles.commentAction}
                >
                  <V2Text
                    style={styles.commentActionText}
                    color={surface.text}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {t("community.postDetail.reply")}
                  </V2Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        {!comment.isDeleted && (
          <Pressable
            hitSlop={10}
            onPress={() => onMore(comment, isReply)}
            accessibilityRole="button"
            accessibilityLabel={t("community.postDetail.commentMore")}
            style={styles.commentMore}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={16}
              color={surface.text}
            />
          </Pressable>
        )}
      </View>
      {comment.replies.map((reply) => (
        <PostCommentRow
          key={reply.id}
          comment={reply}
          isReply
          onToggleLike={onToggleLike}
          onReply={onReply}
          onMore={onMore}
        />
      ))}
    </View>
  )
})

interface CommentDraftSeed {
  text: string
  /** 이 값과 같으면 "보낼 것이 없다" — 답글 시드(`@이름 `)·수정 원문이 여기 온다. */
  baseline: string
  mentions: string[]
}

interface PostCommentComposerHandle {
  /** 답글·수정 진입 — 초안을 채우고 커서를 끝에 두고 포커스한다. */
  seed(next: CommentDraftSeed): void
  reset(): void
  /** 초안이 있으면 버릴지 묻고, 없거나 버리기로 하면 `next` 를 돈다. */
  confirmDiscard(next: () => void): Promise<void>
}

interface PostCommentComposerProps {
  bottomInset: number
  mentionCandidates: MentionCandidate[]
  /** 답글·수정 대상 띠. null 이면 안 그린다. */
  contextLabel: string | null
  /** ✕ 로 대상을 놓았을 때 — 초안은 이 컴포넌트가 스스로 비운다. */
  onCancelContext: () => void
  /** 글이 사라졌거나 전송 중 — 보내기를 잠근다. */
  submitLocked: boolean
  submitLabel: string
  /** 뒤로가기·대상 전환 때 초안을 지킬지. 글이 사라졌으면 지킬 것이 없다. */
  guardDraft: boolean
  /** 전송. `true` 를 돌려주면 초안을 비운다(성공 · 대상이 사라진 수정). */
  onSubmit: (draft: { content: string; mentions: string[] }) => Promise<boolean>
}

/** 댓글 입력 바 — 글자·커서·멘션·초안 가드를 스스로 든다(위 머리말). */
const PostCommentComposer = forwardRef<
  PostCommentComposerHandle,
  PostCommentComposerProps
>(function PostCommentComposer(
  {
    bottomInset,
    mentionCandidates,
    contextLabel,
    onCancelContext,
    submitLocked,
    submitLabel,
    guardDraft,
    onSubmit,
  },
  ref,
) {
  const { t } = useTranslation()
  const surface = useSurface()
  const keyboardVisible = useKeyboardState((state) => state.isVisible)
  const keyboard = useReanimatedKeyboardAnimation()
  // Keep the dock's layout height fixed. Both movement and safe-area compensation
  // follow the same native keyboard animation, including its final zero height.
  const keyboardDockStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          keyboard.height.value + bottomInset * keyboard.progress.value,
      },
    ],
  }))
  const [text, setText] = useState("")
  const [baseline, setBaseline] = useState("")
  const [cursor, setCursor] = useState(0)
  /** 입력창에서 고른 멘션. 전송 직전 본문에 남아 있는 것만 서버로 보낸다. */
  const [pickedMentions, setPickedMentions] = useState<string[]>([])
  const inputRef = useRef<TextInput>(null)
  /** 입력 면의 포커스 — 신장 정보 수정의 `otherField` 처럼 브랜드 테두리를 켠다. */
  const [focused, setFocused] = useState(false)
  const confirmDiscard = useCommentDraftGuard(
    guardDraft && text.trim() !== baseline.trim(),
  )
  const inkBg = surface.textStrong
  const inkContent = surface.canvas

  const reset = () => {
    setText("")
    setBaseline("")
    setCursor(0)
    setPickedMentions([])
  }

  /*
    의존성 없이 매 렌더 갈아 끼운다 — `confirmDiscard` 가 지금 초안을 닫고 있는 함수라
    한 번 만든 핸들이 옛 초안을 보면 "버릴까요" 를 엉뚱하게 묻거나 안 묻는다.
  */
  useImperativeHandle(ref, () => ({
    seed: (next) => {
      setText(next.text)
      setBaseline(next.baseline)
      setCursor(next.text.length)
      setPickedMentions(next.mentions)
      inputRef.current?.focus()
    },
    reset,
    confirmDiscard,
  }))

  const mentionQuery = findMentionQuery(text, cursor)
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
    const next = applyMention(text, mentionQuery, nickName)
    setText(next.text)
    setCursor(next.cursor)
    setPickedMentions((prev) =>
      prev.includes(nickName) ? prev : [...prev, nickName],
    )
    inputRef.current?.focus()
  }

  /** 실제로 전송될 태그. 손으로 친 '@이름'은 여기 들어오지 않는다. */
  const activeMentions = useMemo(
    () => retainedMentions(text, pickedMentions),
    [text, pickedMentions],
  )

  const handleRemoveMention = (nickName: string) => {
    hapticSelection()
    const next = removeMention(text, nickName)
    setText(next)
    setCursor(next.length)
    setPickedMentions((prev) => prev.filter((name) => name !== nickName))
  }

  const canSubmit = !submitLocked && hasSubmittableComment(text, baseline)

  const handleSubmit = async () => {
    if (!canSubmit) return
    const content = text.trim()
    if (!content) return
    // 골라놓고 '@닉네임'을 지웠다면 태그도 함께 사라진다.
    const mentions = retainedMentions(content, pickedMentions)
    if (await onSubmit({ content, mentions })) reset()
  }

  return (
    <Animated.View style={keyboardDockStyle}>
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
            borderTopColor: surface.border,
            paddingBottom: 10 + bottomInset,
          },
        ]}
      >
        {contextLabel !== null && (
          <View
            style={[
              styles.inputContext,
              { backgroundColor: surface.surfaceSunken },
            ]}
          >
            <V2Text
              style={styles.inputContextText}
              color={surface.text}
              numberOfLines={1}
            >
              {contextLabel}
            </V2Text>
            <Pressable
              onPress={() => {
                void confirmDiscard(() => {
                  onCancelContext()
                  reset()
                })
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
                    backgroundColor: surface.surfaceSunken,
                    borderColor: surface.textStrong,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <V2Text
                  style={styles.mentionChipText}
                  color={surface.textStrong}
                  numberOfLines={1}
                >
                  @{nickName}
                </V2Text>
                <Ionicons name="close" size={12} color={surface.textStrong} />
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.inputRow}>
          {keyboardVisible ? (
            <Pressable
              onPress={() => void KeyboardController.dismiss()}
              style={styles.keyboardDismiss}
              accessibilityRole="button"
              accessibilityLabel={t("keyboard.dismiss")}
            >
              <Ionicons name="chevron-down" size={20} color={surface.text} />
            </Pressable>
          ) : null}
          <View
            style={[
              styles.inputField,
              {
                backgroundColor: focused
                  ? surface.canvas
                  : surface.surfaceSunken,
                borderColor: focused ? surface.brand : surface.surfaceSunken,
              },
            ]}
          >
            <TextInput
              accessibilityLabel={t("community.postDetail.commentPlaceholder")}
              ref={inputRef}
              value={text}
              onChangeText={setText}
              onSelectionChange={(event) =>
                setCursor(event.nativeEvent.selection.start)
              }
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={t("community.postDetail.commentPlaceholder")}
              placeholderTextColor={surface.placeholder}
              selectionColor={surface.brand}
              multiline
              maxLength={2000}
              style={[styles.commentInput, { color: surface.textStrong }]}
            />
          </View>
          <SurfacePressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            hitSlop={4}
            accessibilityLabel={submitLabel}
            baseColor={canSubmit ? inkBg : surface.surfaceSunken}
            pressScale={0.98}
            style={styles.sendButton}
          >
            <Ionicons
              name="arrow-up"
              size={17}
              color={canSubmit ? inkContent : surface.ctaOffText}
            />
          </SurfacePressable>
        </View>
      </View>
    </Animated.View>
  )
})

export function PostDetailScreen() {
  const { t, i18n } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const queryClient = useQueryClient()
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 16) : insets.bottom
  useSuppressGlobalKeyboardToolbar()
  const [commentOrder, setCommentOrder] = useState<CommentOrder>("oldest")
  const [replyingTo, setReplyingTo] = useState<CommunityComment | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  /** 입력 바. 글자·커서·멘션은 저쪽이 들고, 화면은 대상을 정할 때만 초안을 심는다(머리말). */
  const composerRef = useRef<PostCommentComposerHandle>(null)

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
  const orderedComments = useMemo(
    () => orderComments(comments, commentOrder),
    [comments, commentOrder],
  )
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
  const reportReasons = useMemo(
    () =>
      REPORT_REASONS.map((reason) => ({
        label: t(reason.labelKey),
        value: reason.value,
      })),
    [t],
  )
  const getCategoryLabel = useCallback(
    (category: string) => {
      const key =
        CATEGORY_LABEL_KEYS[category as keyof typeof CATEGORY_LABEL_KEYS]
      return key ? t(key) : category
    },
    [t],
  )

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

  /** 답글은 상대를 태그한 채로 시작한다 — 누구에게 하는 말인지 본문에도 남는다. */
  const startReplyTo = (comment: CommunityComment) => {
    void composerRef.current?.confirmDiscard(() => {
      const seed = prepareCommentReply(
        comment,
        t("community.postDetail.withdrawnUser"),
        myProfile?.nickName,
      )
      setReplyingTo(seed.target)
      setEditingCommentId(null)
      composerRef.current?.seed({
        text: seed.text,
        baseline: seed.text,
        mentions: seed.mentions,
      })
    })
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
    // `push`/`navigate` 는 루트 Stack 에 `(tabs)` 를 한 벌 더 쌓는다 — 근거는
    // `CommunitySearchScreen.handleTagPress` 머리말, 가드는 `tests/tabRouteNavigation.test.ts`.
    router.dismissTo({ pathname: "/community", params: { tag } } as Href)
  }

  /**
   * 입력 바가 부른다. `true` 를 돌려주면 입력 바가 초안을 비운다 — 성공했거나,
   * 수정하던 댓글이 그 사이 사라져 겨눔을 풀 때다.
   */
  const submitComment = async ({
    content,
    mentions,
  }: {
    content: string
    mentions: string[]
  }): Promise<boolean> => {
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
      return true
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
        초안까지 비우는 이유(아래 반환값): 겨눔만 풀면 다음 전송이 그 글을 **새 댓글로** 올린다.
      */
      const targetVanished =
        resolved.code === "COMMUNITY_ERROR_008" ||
        resolved.code === "COMMUNITY_ERROR_009" ||
        resolved.kind === "notFound"
      if (editingCommentId && targetVanished) {
        setEditingCommentId(null)
      }
      presentCommunityError(commentError, {
        scope: "community-comment-save",
        refresh: () => void refetchComments(),
      })
      return editingCommentId != null && targetVanished
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
      void composerRef.current?.confirmDiscard(() => {
        setEditingCommentId(comment.id)
        setReplyingTo(null)
        // 수정 진입 시 기존 멘션을 이어받아, 손대지 않으면 그대로 유지된다.
        composerRef.current?.seed({
          text: comment.content,
          baseline: comment.content,
          mentions: comment.mentions,
        })
      })
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

  /*
    댓글 행(`PostCommentRow`)은 `memo` 다 — 행에 넘기는 콜백이 렌더마다 새 함수면 그
    비교가 매번 무효라 댓글 트리 전체가 다시 그려진다(정렬을 바꾸거나 답글 대상을 고를
    때마다). 위 세 핸들러는 닫고 있는 것이 많아(`t`·프로필·입력 바 ref) `useCallback`
    으로 묶으면 의존성이 곧 그 전부가 된다. 대신 **최신 핸들러를 ref 에 갈아 끼우고**,
    행에는 그 ref 를 읽는 고정 함수 셋을 준다(`FreePostEditor` 의 `submitRef` 와 같은 처방).
  */
  const commentActionsRef = useRef({
    toggleLike: handleToggleCommentLike,
    reply: startReplyTo,
    handleCommentMore,
  })
  commentActionsRef.current = {
    toggleLike: handleToggleCommentLike,
    reply: startReplyTo,
    handleCommentMore,
  }
  const commentActions = useMemo<CommentActions>(
    () => ({
      onToggleLike: (comment) =>
        void commentActionsRef.current.toggleLike(comment),
      onReply: (comment) => commentActionsRef.current.reply(comment),
      onMore: (comment, isReply) =>
        void commentActionsRef.current.handleCommentMore(comment, isReply),
    }),
    [],
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
        <Text
          style={[styles.boardTitle, { color: surface.textStrong }]}
          numberOfLines={1}
        >
          {getCategoryLabel(post.category)}
        </Text>
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

        <Text
          style={[styles.title, { color: surface.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {post.title}
        </Text>
        {/* 제목·본문 */}
        <Text
          style={[styles.body, { color: surface.textStrong }]}
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
                source={remoteImageSource(post.imageUris[0])}
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
                  source={remoteImageSource(uri)}
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
            baseColor={surface.canvas}
            pressScale={0.94}
            style={[
              styles.likeButton,
              { borderColor: post.liked ? surface.brand : surface.border },
            ]}
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
          <V2Text
            style={styles.commentsTitle}
            color={surface.textStrong}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("community.postDetail.commentCount", {
              count: post.comments,
            })}
          </V2Text>
          <View style={styles.commentSort}>
            {(["oldest", "newest", "popular"] as const).map((order) => (
              <Pressable
                key={order}
                accessibilityRole="radio"
                accessibilityState={{ checked: commentOrder === order }}
                onPress={() => setCommentOrder(order)}
                style={styles.sortChoice}
              >
                <V2Text
                  style={styles.sortLabel}
                  color={
                    commentOrder === order ? surface.textStrong : surface.text
                  }
                >
                  {t(
                    `community.refresh.${order === "popular" ? "popularComments" : order}`,
                  )}
                </V2Text>
              </Pressable>
            ))}
          </View>
          {isCommentsLoading ? (
            <V2Text
              style={styles.commentsLoading}
              color={surface.text}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("community.postDetail.commentsLoading")}
            </V2Text>
          ) : isCommentsError && comments.length === 0 ? (
            <View style={styles.commentsEmpty}>
              <V2Text
                style={styles.commentsEmptyTitle}
                color={surface.textStrong}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("community.postDetail.commentsError")}
              </V2Text>
              {/* 실패한 것은 **댓글** 쿼리다 — `refetch()`(본문)를 부르면 이 자리는
                  몇 번을 눌러도 오류에서 못 나온다. */}
              <Pressable onPress={() => void refetchComments()} hitSlop={8}>
                <V2Text
                  style={styles.commentsEmptyTitle}
                  color={surface.brand}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("action.retry")}
                </V2Text>
              </Pressable>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.commentsEmpty}>
              <V2Text
                style={styles.commentsEmptyTitle}
                color={surface.textStrong}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("community.postDetail.noComments")}
              </V2Text>
              <V2Text
                style={styles.commentsEmptySub}
                color={surface.text}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("community.postDetail.firstComment")}
              </V2Text>
            </View>
          ) : (
            orderedComments.map((comment) => (
              <PostCommentRow
                key={comment.id}
                comment={comment}
                isReply={false}
                onToggleLike={commentActions.onToggleLike}
                onReply={commentActions.onReply}
                onMore={commentActions.onMore}
              />
            ))
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
                accessibilityRole="header"
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
              {relatedPosts.map((related, index) => (
                <RelatedDiscussionRow
                  key={related.id}
                  post={related}
                  category={getCategoryLabel(related.category)}
                  divider={index < relatedPosts.length - 1}
                  onPress={() => router.push(`/post/${related.id}` as Href)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* 댓글 입력 바 — 글자·커서·멘션·초안 가드는 저쪽이 든다(파일 머리말). */}
      <PostCommentComposer
        ref={composerRef}
        bottomInset={bottomInset}
        mentionCandidates={mentionCandidates}
        contextLabel={
          editingCommentId
            ? t("community.postDetail.editingComment")
            : replyingTo
              ? isWithdrawnAuthor(replyingTo)
                ? t("community.refresh.replyToComment")
                : t("community.postDetail.replyingTo", {
                    name: replyingTo.authorName,
                  })
              : null
        }
        onCancelContext={() => {
          setReplyingTo(null)
          setEditingCommentId(null)
        }}
        submitLocked={isPostGone || isCreatingComment || isUpdatingComment}
        submitLabel={
          editingCommentId
            ? t("community.postDetail.saveComment")
            : t("community.postDetail.postComment")
        }
        guardDraft={!isPostGone}
        onSubmit={submitComment}
      />

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
              source={remoteImageSource(previewImage)}
              style={styles.previewImage}
              contentFit="contain"
            />
          )}
          <View style={styles.previewClose}>
            <Ionicons name="close" size={26} color={primitives.common[0]} />
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
    fontFamily: "Pretendard-SemiBold",
    textAlign: "center",
  },
  stateAction: {
    fontSize: 17,
    lineHeight: 24,
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
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  authorText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  authorName: {
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
    fontFamily: "Pretendard-SemiBold",
  },
  authorSub: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontFamily: "Pretendard-Medium",
  },

  title: {
    ...typography.title.small,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  body: {
    ...typography.body.mediumWeak,
    paddingHorizontal: 20,
    paddingBottom: 24,
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
    minHeight: 44,
    borderWidth: borderWidth.thin,
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
    fontFamily: "Pretendard-Bold",
    paddingBottom: 2,
  },
  commentsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  boardTitle: { ...typography.label.small, flex: 1, marginLeft: 20 },
  commentSort: { flexDirection: "row", gap: S[4], marginBottom: S[2] },
  sortChoice: { minHeight: MIN.TOUCH, justifyContent: "center" },
  sortLabel: typography.subtext.mediumStrong,
  keyboardDismiss: {
    width: MIN.TOUCH,
    height: MIN.TOUCH,
    alignItems: "center",
    justifyContent: "center",
  },
  /* 댓글 머리는 기록 페이지의 섹션 라벨과 같은 글자다. */
  commentsTitle: { ...FORM.label, paddingBottom: S[2] },
  commentsLoading: { ...FORM.hint, paddingVertical: S[3] },
  /*
    위·아래를 **같은 수로 주면 위가 더 커 보인다.** 이 블록 바로 위에는 `댓글 0`
    머리가 있고, 그 줄의 글자 상자(24)와 제 아래 여백(8)이 눈에는 **빈 공간의 일부**로
    읽힌다 — 왼쪽 끝에 짧은 글자 하나뿐이라 그 줄의 나머지 폭이 통째로 여백처럼 보인다.
    반대로 아래에는 그런 것이 없다. 그래서 숫자가 대칭이어도 그림은 위로 쏠린다.

    아래에 그 머리 줄만큼을 더해 눈으로 맞춘다. 실기기에서 보고 정한 값이다 —
    산술로 대칭을 만들면 이 결함이 그대로 돌아온다(`tests/emptyStateSpacing`).
  */
  commentsEmpty: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 57,
    gap: 4,
  },
  commentsEmptyTitle: typography.label.small,
  commentsEmptySub: typography.body.xSmall,

  /* ── 댓글 한 행: 중성 면, 색은 활성 좋아요 하나뿐 ─────────────────────── */
  comment: {
    paddingVertical: S[4],
    borderBottomWidth: borderWidth.thin,
  },
  commentReply: {
    marginLeft: S[5],
  },
  commentTop: {
    flexDirection: "row",
    gap: S[3],
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
    gap: S[1],
  },
  commentNameRow: {
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
  },
  commentName: typography.label.xSmall,
  commentTime: typography.caption.small,
  commentContent: FORM.body,
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[4],
  },
  commentAction: {
    minHeight: MIN.TOUCH,
    flexDirection: "row",
    alignItems: "center",
    gap: S[1],
  },
  commentActionText: typography.subtext.medium,
  /* 음수 마진 없이 이름 줄에 맞춘다 — 안드로이드는 부모 밖 터치를 자식에게 안 준다. */
  commentMore: {
    width: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  /* ── 댓글 작성 도크: 기록 페이지의 입력 면(`FIELD`)을 그대로 ────────────── */
  mentionFloat: {
    paddingHorizontal: S[4],
    paddingBottom: S[2],
  },
  inputBar: {
    paddingHorizontal: S[4],
    paddingTop: S[3],
    gap: S[2],
    borderTopWidth: borderWidth.thin,
  },
  inputContext: {
    borderRadius: FORM.choiceRadius,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[2],
  },
  inputContextText: { ...typography.subtext.medium, flex: 1 },
  mentionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S[2],
  },
  /* 확정된 멘션 — 선택 칩(`RecordChoice`)과 같은 중성 바탕 + 진한 테두리. */
  mentionChip: {
    minHeight: 28,
    borderRadius: FORM.choiceRadius,
    borderWidth: 1,
    paddingLeft: S[3],
    paddingRight: S[2],
    flexDirection: "row",
    alignItems: "center",
    gap: S[1],
    maxWidth: 180,
  },
  mentionChipText: { ...typography.label.xSmall, flexShrink: 1 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: S[2],
  },
  inputField: {
    flex: 1,
    minHeight: MIN.TOUCH,
    borderRadius: FIELD.radius,
    borderWidth: 1,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    justifyContent: "center",
  },
  commentInput: {
    ...FORM.body,
    minHeight: 20,
    maxHeight: 96,
    padding: 0,
    includeFontPadding: false,
    // UITextView vertically offsets custom line-height on the empty placeholder.
    // Use native font metrics on iOS; the outer field centers the intrinsic line.
    ...(Platform.OS === "ios" ? { lineHeight: undefined } : {}),
    textAlignVertical: "center",
  },
  /* 44 를 숫자로 적는다 — `communityCrossFileFixes` 가 원의 크기를 숫자로 읽는다. */
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
})
