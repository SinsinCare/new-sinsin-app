import { communityEditorStyles } from "./community/communityEditorStyles"
import { CommunityPhotoPreview } from "./community/CommunityPhotoPreview"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { usePreventRemove } from "@react-navigation/native"
import { useNavigation } from "expo-router"
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInputProps,
} from "react-native"
import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { V2Text } from "@/src/design-system-v2"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  KeyboardAwareScrollView,
  KeyboardController,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller"

import { useSurface } from "@/src/hooks/useSurface"
import { useSuppressGlobalKeyboardToolbar } from "@/src/stores/keyboardToolbarStore"
import { Icon } from "@/src/shared/components/Icon"
import { TopicField } from "./community/TopicField"
import { recordFieldLabel } from "@/src/features/home/components/record/pages/recordInk"
import { S } from "@/src/features/home/components/record/pages/recordPageSpec"
import { pickMultipleImages } from "@/src/features/recipe/services/imagePickerService"
import {
  VoteSheet,
  type VoteData,
} from "@/src/features/recipe/components/VoteSheet"
import { VoteAttachCard } from "@/src/features/recipe/components/VoteAttachCard"
import { ImageThumbnailCard } from "@/src/features/recipe/components/ImageThumbnailCard"
import { TagInput } from "@/src/features/recipe/components/TagInput"
import { ContentResponsibilityCheck } from "@/src/features/recipe/components/ContentResponsibilityCheck"
import { ConfirmExitModal } from "@/src/shared/components/ConfirmExitModal"
import { HeaderIconButton } from "@/src/shared/components/HeaderIconButton"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { imageUploadService } from "@/src/features/recipe/services/imageUploadService"
import { presentError, resolveError } from "@/src/lib/errorMessage"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"
import type { Href } from "expo-router"

import { showInfoToast } from "@/src/lib/toast"

/** 서버 정책과 같은 값 — community_post_image 테이블이 게시글당 5장을 받는다. */
const MAX_IMAGES = 5
/** 첫 주제(식단 이야기). 주제 행은 항상 값이 있다 — 비워 두고 시트를 강제하지 않는다. */
const DEFAULT_POST_CATEGORY = "diet"

interface FreePostEditorProps {
  onClose: () => void
}

function KeyboardDismissButton({ color }: { color: string }) {
  const { t } = useTranslation("recipe")
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible)

  if (!isKeyboardVisible) return null

  return (
    <Pressable
      onPress={() => KeyboardController.dismiss()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t("action.dismissKeyboard")}
      style={({ pressed }) => [
        communityEditorStyles.tool,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name="keyboard" size={24} color={color} />
    </Pressable>
  )
}

/**
 * 제목·본문 글쓰기 면 — **상자가 없다**(2026-09-12 Mobbin: 당근·Reddit·Threads·X 의 글쓰기는
 * 전부 흰 면 위에 바로 쓴다). 제목은 `typography.title.small`(굵고 큼), 본문은 `FORM.body`.
 * 포커스 표시는 커서 색(`brand`)뿐이고 테두리는 없다. 상한 초과는 카운터 색으로만 말한다
 * (아래 `children` — 수정 화면). 자유글 작성(`FreePostEditor`)과 수정(`FreePostEditScreen`)이 같이 쓴다.
 */
export function EditorTextField({
  body = false,
  children,
  onFocus,
  onBlur,
  style,
  ...input
}: TextInputProps & {
  /** 본문 칸(높은 상자·위 정렬). 기본은 제목 칸. */
  body?: boolean
  /** 칸 아래 줄(카운터 등). */
  children?: ReactNode
}) {
  const s = useSurface()
  return (
    <View style={communityEditorStyles.group}>
      <View
        style={[
          communityEditorStyles.field,
          body
            ? communityEditorStyles.bodyField
            : communityEditorStyles.titleField,
        ]}
      >
        <TextInput
          {...input}
          multiline
          textAlignVertical="top"
          placeholderTextColor={recordFieldLabel(s)}
          selectionColor={s.brand}
          onFocus={onFocus}
          onBlur={onBlur}
          style={[
            body
              ? communityEditorStyles.bodyInput
              : communityEditorStyles.titleInput,
            { color: s.textStrong },
            style,
          ]}
        />
      </View>
      {children}
    </View>
  )
}

export function FreePostEditor({ onClose }: FreePostEditorProps) {
  const { t } = useTranslation("recipe")
  const { t: tCommon } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 24) : insets.bottom
  /*
    이 화면은 사진·투표·키보드 내리기·등록을 **자기 도크**로 키보드 위에 세운다.
    전역 툴바까지 뜨면 바가 두 겹이 되고 키보드를 내리는 버튼이 두 개가 된다
    (그 스토어 머리말). 도크가 탈출구(자판 아이콘)를 들고 있으므로 끌 자격이 있다.
  */
  useSuppressGlobalKeyboardToolbar()
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible)

  const [selectedCategory, setSelectedCategory] = useState(
    DEFAULT_POST_CATEGORY,
  )
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [votes, setVotes] = useState<VoteData[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [voteSheetOpen, setVoteSheetOpen] = useState(false)
  const [editingVoteIndex, setEditingVoteIndex] = useState<number | null>(null)
  const [confirmExitVisible, setConfirmExitVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  /** 등록에 성공한 글의 id. 세워지면 가드가 꺼지고 그 글로 이동한다. */
  const [createdPostId, setCreatedPostId] = useState<string | null>(null)
  const submittedRef = useRef(false)
  /** 하단 도크의 실측 높이 — 스크롤이 입력을 도크 위로 올릴 때 쓴다. */
  const [dockHeight, setDockHeight] = useState(0)
  const [submitStatus, setSubmitStatus] = useState<string | null>(null)
  const [responsibilityAgreed, setResponsibilityAgreed] = useState(false)
  /** 등록 직전의 책임 확인 시트(`ContentResponsibilityCheck`). */
  const [consentVisible, setConsentVisible] = useState(false)
  const router = useAppRouter()
  /*
    변이 하나만 필요한 화면은 피드를 **관찰하지 않는다.** 기본값(`observe: true`)으로
    두면 이 편집기를 여는 것만으로 옵저버가 하나 더 붙어, 이미 낡은 무한 쿼리가 들고
    있던 **페이지 전부**를 다시 받는다(세 장 스크롤한 사람이 글쓰기를 열면 GET 3개).
    캐시에 손을 대는 것은 `createPostAsync` 의 정산이고, 그건 관찰과 무관하다.
  */
  const { createPostAsync } = useCommunityPosts({ observe: false })

  /**
   * **이미 서버에 올라간 사진.** 원본 uri → 업로드된 objectPath.
   *
   * 재시도가 사진을 처음부터 다시 올리던 자리다: 다섯 장 중 세 번째가 실패하면 앞의
   * 두 장은 이미 GCS 에 있는데(지울 경로가 앱에도 서버에도 없다) 재시도가 다섯 장을
   * 새로 올려 두 장을 더 버린다. 눌 때마다 두 장씩 는다. 여기 적어 두면 재시도는
   * **남은 장부터** 이어 올린다.
   *
   * 상태가 아니라 ref 인 이유: 그리는 데 쓰지 않고, 업로드 루프가 **같은 tick 안에서**
   * 방금 올린 것을 읽어야 한다(상태였다면 다음 렌더까지 못 본다).
   */
  const uploadedPathsRef = useRef<Record<string, string>>({})

  const toolbarIconColor = surface.text

  const canSubmit = title.trim().length > 0 && body.trim().length > 0
  /** 이미 올라간 폼. 이동을 기다리는 동안 CTA·동의를 다시 만지지 못하게 한다. */
  const submitted = createdPostId !== null

  const hasContent =
    title.trim().length > 0 ||
    body.trim().length > 0 ||
    images.length > 0 ||
    tags.length > 0 ||
    votes.length > 0

  const handleClose = () => {
    Keyboard.dismiss()
    if (hasContent) {
      setConfirmExitVisible(true)
    } else {
      onClose()
    }
  }

  /*
    ── 안드로이드 하드웨어 백 ────────────────────────────────────────────────
    ✕ 를 거치지 않는 길이다. `app/(write)/_layout.tsx` 의 `gestureEnabled: false` 는
    **iOS 전용**이라(native-stack 이 안드로이드에서는 그 값을 무조건 false 로 넘긴다 —
    시스템 백을 JS 에서 처리하기 때문) 지금까지 안드로이드에서는 백 한 번에 제목·본문
    700자·사진 다섯 장이 **확인 없이** 사라졌다.

    조건이 `hasContent` 인 것이 요점이다. 무조건 막으면 빈 편집기에서 나가려는 사람에게도
    확인창이 떠서, 잃을 것 없는 사람을 한 번 더 누르게 한다.

    ── `allowExitRef` — 화면 **스스로** 나가는 길은 통과시킨다 ──────────────────
    가드는 이탈의 **출처를 가리지 않는다.** 하드웨어 백뿐 아니라 확인창의 "나가기" 가
    부르는 `onClose()`(= `router.back()`)도 같이 잡힌다 — 초안은 그때도 그대로 있기
    때문이다. 그대로 두면 확인창이 되뜬다(가둠).

    그래서 나가기로 **결정한** 순간 이 깃발을 세우고, 가드는 잡아 둔 그 동작을 그대로
    다시 던진다. 다시 던진 동작은 이미 이 화면을 지나온 것으로 표시돼 있어
    (react-navigation 의 `shouldPreventRemove`) 두 번 잡히지 않는다 — 공식 문서의
    `navigation.dispatch(data.action)` 처방이 이것이다.

    ── 되던지기로 **안 되는** 경우: 등록 성공 뒤의 `router.replace` ─────────────
    그 처방은 **같은 네비게이터가 처리할 수 있는 동작**일 때만 성립한다. 뒤로가기는
    이 스택이 처리하지만, `post/[id]` 로의 REPLACE 는 `(write)` 스택에 그 라우트가
    없어서 되던지는 순간 갈 곳을 잃고 조용히 버려진다(2026-08-25 실측: 등록은 됐는데
    폼이 그대로 남았고, 거기서 한 번 더 누르니 같은 글이 한 벌 더 올라갔다).
    그 길은 되던지지 않고 **가드를 끈 다음 렌더에서** 이동한다 — 아래 `createPostId`.
  */
  const navigation = useNavigation()
  const allowExitRef = useRef(false)
  /*
    등록에 성공한 뒤에는 가드를 **아예 끈다**(되던지기에 기대지 않는다 —
    `handleSubmit` 성공 분기 머리말). 초안은 그대로지만 이미 서버에 올라갔으므로
    두고 나갈 것이 없다.
  */
  usePreventRemove(hasContent && createdPostId === null, ({ data }) => {
    if (allowExitRef.current) {
      navigation.dispatch(data.action)
      return
    }
    Keyboard.dismiss()
    setConfirmExitVisible(true)
  })

  /* 가드가 꺼진 렌더에서 올린 글로 이동한다. */
  useEffect(() => {
    if (createdPostId === null) return
    router.replace(`/post/${createdPostId}` as Href)
  }, [createdPostId, router])

  const handlePickImages = async () => {
    Keyboard.dismiss()
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      showInfoToast(
        t("freePost.photoLimitTitle"),
        t("freePost.photoLimitBody", { count: MAX_IMAGES }),
      )
      return
    }
    const uris = await pickMultipleImages(remaining)
    if (uris.length > 0) {
      setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES))
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleOpenVoteSheet = () => {
    Keyboard.dismiss()
    if (votes.length >= 1) return
    setEditingVoteIndex(null)
    setVoteSheetOpen(true)
  }

  const handleEditVote = (index: number) => {
    Keyboard.dismiss()
    setEditingVoteIndex(index)
    setVoteSheetOpen(true)
  }

  const handleRemoveVote = (index: number) => {
    setVotes((prev) => prev.filter((_, i) => i !== index))
  }

  const handleVoteComplete = (data: VoteData) => {
    if (editingVoteIndex !== null) {
      setVotes((prev) => {
        const next = prev.slice(0, 1)
        next[editingVoteIndex] = data
        return next.slice(0, 1)
      })
    } else {
      setVotes([data])
    }
    setVoteSheetOpen(false)
    setEditingVoteIndex(null)
  }

  /**
   * 등록 탭. 아직 책임 확인을 안 했으면 시트를 띄우고 멈춘다 — 시트의 "확인했어요" 가
   * `agreed = true` 로 다시 이 함수를 부른다. 한 번 확인하면 그 뒤로는 바로 올라간다.
   */
  const handleSubmit = async (agreed = responsibilityAgreed) => {
    // 한 번 올라간 폼은 두 번 올라가지 않는다 — 성공 뒤 이동까지의 한 프레임 동안
    // `isSubmitting` 은 이미 false 다(아래 `finally`). 만들기 경로에 멱등키가 없어서
    // 그 틈의 두 번째 탭이 **두 번째 글**이 된다.
    if (!canSubmit || isSubmitting || submittedRef.current) return
    if (!agreed) {
      Keyboard.dismiss()
      setConsentVisible(true)
      return
    }
    setIsSubmitting(true)
    /*
      만들기 요청이 **나갔는가.** 나가기 전(사진 업로드 중)의 실패는 서버에 글이 없으니
      다시 시도해도 안전하다. 나간 뒤의 무응답은 다르다 — 아래 catch 머리말.
    */
    let createRequested = false
    try {
      // 한 장이라도 실패하면 글을 올리지 않는다 — 이미지가 빠진 채 조용히
      // 등록되는 것보다 실패를 알리고 다시 시도하게 하는 쪽이 낫다.
      const imageObjectPaths: string[] = []
      for (const [index, imageUri] of images.entries()) {
        // 이미 올라간 장은 다시 올리지 않는다(`uploadedPathsRef` 머리말).
        const known = uploadedPathsRef.current[imageUri]
        if (known) {
          imageObjectPaths.push(known)
          continue
        }
        if (images.length > 1) {
          setSubmitStatus(
            t("freePost.photoProgress", {
              current: index + 1,
              total: images.length,
            }),
          )
        }
        const uploaded = await imageUploadService.uploadImage(
          imageUri,
          "community",
        )
        uploadedPathsRef.current[imageUri] = uploaded.objectPath
        imageObjectPaths.push(uploaded.objectPath)
      }
      setSubmitStatus(null)
      createRequested = true
      const created = await createPostAsync({
        authorName: t("freePost.selfName"),
        authorRole: t("freePost.selfRole"),
        category: selectedCategory,
        imageUri: null,
        imageObjectPaths,
        title: title.trim(),
        description: body.trim(),
        tags,
        vote: votes[0] ?? null,
      })
      /*
        **올린 글로 데려간다**(`onClose()` 로 피드에 돌려보내지 않는다).

        정산은 새 글을 **기본 조합의 피드 첫 장**에만 꽂고 나머지는 낡음 표시만 한다
        (`useCommunityPosts` 의 `createPostMutation`). 그래서 태그·카테고리·정렬을 걸어
        둔 사람은 자기 글이 없는 목록으로 돌아왔고, 확인 문구도 없어서 실패로 읽었다.
        토스트를 띄우는 방법도 있지만, 올린 글 자체를 보여 주는 것이 더 강한 확인이고
        (읽을 것이 문구가 아니라 자기 글이다) 필터가 무엇이었든 항상 옳다.
        `replace` 라서 뒤로가기는 편집기가 아니라 목록으로 간다 — 다 쓴 폼으로 되돌아가는
        일이 없다.
      */
      // 등록에 성공했으면 두고 나갈 초안이 아니다 — 초안 가드를 통과시킨다(위 머리말).
      /*
        **이동은 여기서 하지 않는다.** 가드(`usePreventRemove`)가 켜져 있는 동안의
        `router.replace` 는 `beforeRemove` 에 잡히고, 가드가 되던지는 REPLACE 는
        원래 dispatch 가 겨눴던 네비게이터를 잃는다 — `(write)` 스택에는
        `post/[id]` 라우트가 없어서 그 액션이 **조용히 버려진다.**
        결과는 "등록은 됐는데 폼이 그대로" 이고, 그 화면에서 한 번 더 누르면
        **같은 글이 한 벌 더** 올라간다(만들기 경로에 멱등키가 없다).
        2026-08-25 실측: 테스트 서버에 같은 글이 두 벌 생겼다.

        그래서 성공을 상태로만 남기고, 가드가 꺼진 **다음 렌더**에서 이동한다
        (아래 `useEffect`). `usePreventRemove` 의 리스너는 최신 렌더의
        `preventRemove` 를 읽으므로(`useLatestCallback`) 그 시점의 replace 는
        가로채이지 않고 그대로 나간다.
      */
      submittedRef.current = true
      allowExitRef.current = true
      setCreatedPostId(created.id)
    } catch (error) {
      /*
        여기서 가장 흔한 실패는 글이 아니라 **사진**이다 — 5MB 초과(`FOOD_CAMERA_002`),
        JPG·PNG 가 아닌 형식(`001`). 둘 다 "다른 사진을 고르면 된다" 로 끝나는데
        `글을 올리지 못했어요 / 인터넷 연결을 확인…` 이 그 사실을 가리고 있었다.

        **다시 시도 버튼은 항상 주지 않는다.** axios 타임아웃은 10초인데(`apiClient.ts`)
        서버는 그 뒤에도 계속 돌아서, 12초에 커밋된 글을 앱은 `ECONNABORTED` 로 본다.
        그 상태에서 "다시 시도" 를 누르면 **두 번째 글**이 올라간다(커뮤니티 만들기
        경로에는 멱등키가 없다 — 서버가 `Idempotency-Key` 를 안 읽는다). 요청이 나간
        뒤의 무응답(타임아웃·오프라인)일 때만 버튼을 뺀다: 그때는 사용자가 목록에서
        확인하는 편이 안전하다. 사진 업로드 중의 실패는 그대로 재시도 가능하고, 이제는
        올라간 장을 건너뛰고 이어 올린다.
      */
      const resolved = resolveError(error)
      const mayHaveCommitted =
        createRequested &&
        (resolved.kind === "timeout" || resolved.kind === "offline")
      presentError(error, {
        scope: "community-post-create",
        /*
          `submitRef` 로 부른다 — 이 클로저가 닫고 있는 `title`·`body`·`images` 는
          **실패한 그 렌더**의 값이다. 토스트를 보고 제목을 고친 뒤 누르면 고치기 전
          내용이 올라가던 자리다(버튼은 토스트가 살아 있는 동안 계속 눌린다).
        */
        retry: mayHaveCommitted
          ? undefined
          : () => void submitRef.current(true),
      })
    } finally {
      setIsSubmitting(false)
      setSubmitStatus(null)
    }
  }

  /* 렌더마다 최신 `handleSubmit` 로 갈아 끼운다 — 위 `retry` 가 이걸 부른다. */
  const submitRef = useRef(handleSubmit)
  submitRef.current = handleSubmit

  /* 등록 버튼 — 제목·본문이 차면 brand pill, 아니면 회색 pill. */
  const submitReady = canSubmit && !isSubmitting && !submitted

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      {/* 등록은 항상 같은 상단 위치에 둔다. */}
      <View
        style={[
          communityEditorStyles.header,
          { borderBottomColor: surface.border },
        ]}
      >
        {/*
          `Pressable + hitSlop` 이 아니라 `HeaderIconButton` 이다 — 44/48 규격 상자를
          음수 마진으로 제자리에 넣는다(그 파일 머리말). 이 버튼은 초안을 들고
          나가는 유일한 문이라 "눌렀는데 안 먹었다" 의 비용이 특히 크다.
        */}
        <HeaderIconButton
          onPress={handleClose}
          accessibilityLabel={tCommon("action.close")}
        >
          <Ionicons name="close" size={24} color={surface.textStrong} />
        </HeaderIconButton>
        <V2Text
          style={communityEditorStyles.headerTitle}
          color={surface.textStrong}
        >
          {t("freePost.formTitle")}
        </V2Text>
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={!submitReady}
          hitSlop={S[2]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !submitReady }}
          style={[
            communityEditorStyles.submit,
            { backgroundColor: submitReady ? surface.brand : surface.ctaOffBg },
          ]}
        >
          <V2Text
            style={communityEditorStyles.submitLabel}
            color={submitReady ? surface.onBrand : surface.ctaOffText}
          >
            {isSubmitting ? t("action.uploading") : t("freePost.register")}
          </V2Text>
        </Pressable>
      </View>

      {/*
        주제·제목·본문.
        `bottomOffset` = 포커스된 입력과 키보드 사이에 둘 여유 = **도크 높이**.
        상수로 적으면 동의 문구가 두 줄로 접히는 기기에서 그만큼 어긋나므로
        실제로 잰 값(`dockHeight`)을 쓰고, 아직 못 쟀으면 예전 값으로 시작한다.
      */}
      <View style={styles.flex}>
        <KeyboardAwareScrollView
          bounces={false}
          overScrollMode="never"
          style={styles.flex}
          contentContainerStyle={communityEditorStyles.content}
          bottomOffset={dockHeight > 0 ? dockHeight : bottomInset + 72}
          disableScrollOnKeyboardHide
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          {/* 주제 — 당근의 "맛집 ›" 행. 시트에서 고른다. */}
          <TopicField
            value={selectedCategory}
            disabled={isSubmitting || submitted}
            onChange={setSelectedCategory}
          />

          <View style={communityEditorStyles.page}>
            {/* 당근의 '안내' 배너 — 읽고 넘어가는 한 줄. 동의는 등록 때 시트가 받는다. */}
            <View style={communityEditorStyles.notice} accessibilityRole="text">
              <V2Text
                style={communityEditorStyles.noticeLabel}
                color={surface.textStrong}
              >
                {t("freePost.noticeLabel")}
              </V2Text>
              <V2Text
                style={communityEditorStyles.noticeBody}
                color={surface.textMuted}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("freePost.noticeBody")}
              </V2Text>
            </View>

            {/* 글 한 덩어리: 제목 → 태그 칩(12) → 본문(16). 라벨·상자 없음. */}
            <View style={communityEditorStyles.paper}>
              <View style={communityEditorStyles.paperHead}>
                <EditorTextField
                  accessibilityLabel={t("freePost.titleLabel")}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t("freePost.titlePlaceholder")}
                  maxLength={200}
                />

                {/* Reddit 의 "Add tags (optional)" — 제목 아래 칩. 누르면 태그 입력이 그 자리에 열린다. */}
                {tagInputOpen || tags.length > 0 ? (
                  <TagInput tags={tags} onChangeTags={setTags} />
                ) : (
                  <Pressable
                    onPress={() => setTagInputOpen(true)}
                    disabled={isSubmitting || submitted}
                    hitSlop={S[2]}
                    accessibilityRole="button"
                    accessibilityLabel={t("action.addTag")}
                    style={({ pressed }) => [
                      communityEditorStyles.tagChip,
                      {
                        backgroundColor: pressed
                          ? surface.surfacePressed
                          : surface.surfaceSunken,
                      },
                    ]}
                  >
                    <Icon name="hashtag" size={16} color={surface.text} />
                    <V2Text
                      style={communityEditorStyles.tagChipLabel}
                      color={surface.text}
                    >
                      {t("freePost.addTagsOptional")}
                    </V2Text>
                  </Pressable>
                )}
              </View>
              <EditorTextField
                body
                accessibilityLabel={t("freePost.descriptionLabel")}
                value={body}
                onChangeText={setBody}
                placeholder={t(
                  `freePost.bodyPlaceholderByTopic.${selectedCategory}`,
                  {
                    defaultValue: t("freePost.descriptionPlaceholder"),
                  },
                )}
                maxLength={700}
              />
            </View>

            {images.length > 0 ? (
              <View style={communityEditorStyles.group}>
                <V2Text
                  style={communityEditorStyles.label}
                  color={surface.textStrong}
                >
                  {t("freePost.photoVideo")}
                </V2Text>
                <ScrollView
                  horizontal
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={communityEditorStyles.photoRail}
                  style={communityEditorStyles.photoRailScroll}
                >
                  {images.map((uri, index) => (
                    <ImageThumbnailCard
                      key={uri + index}
                      uri={uri}
                      onPress={() => setPreviewImage(uri)}
                      onRemove={() => handleRemoveImage(index)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
            {votes.map((voteData, voteIndex) => (
              <View key={voteIndex} style={communityEditorStyles.group}>
                <V2Text
                  style={communityEditorStyles.label}
                  color={surface.textStrong}
                >
                  {t("freePost.attachPoll")}
                </V2Text>
                <VoteAttachCard
                  title={voteData.title}
                  onEdit={() => handleEditVote(voteIndex)}
                  onRemove={() => handleRemoveVote(voteIndex)}
                />
              </View>
            ))}
          </View>
        </KeyboardAwareScrollView>

        {/* 실제 도크 높이를 스크롤에 반영하고 키보드 인셋은 한 번만 적용한다. */}
        <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
          <View
            onLayout={(event) => setDockHeight(event.nativeEvent.layout.height)}
            style={[
              communityEditorStyles.dock,
              {
                borderTopColor: surface.border,
                backgroundColor: surface.canvas,
                paddingBottom: isKeyboardVisible ? 0 : bottomInset,
              },
            ]}
          >
            {/* 툴바 */}
            <View style={communityEditorStyles.toolbar}>
              <View style={communityEditorStyles.toolbarActions}>
                <Pressable
                  onPress={handlePickImages}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("action.addPhoto")}
                  style={({ pressed }) => [
                    communityEditorStyles.tool,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons
                    name="image-outline"
                    size={20}
                    color={toolbarIconColor}
                  />
                  <V2Text
                    style={communityEditorStyles.toolLabel}
                    color={toolbarIconColor}
                  >
                    {t("freePost.photoVideo")}
                  </V2Text>
                </Pressable>
                <Pressable
                  onPress={handleOpenVoteSheet}
                  disabled={votes.length >= 1}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("freePost.attachPoll")}
                  style={({ pressed }) => [
                    communityEditorStyles.tool,
                    {
                      opacity: votes.length >= 1 ? 0.3 : pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="podium-outline"
                    size={22}
                    color={toolbarIconColor}
                  />
                  <V2Text
                    style={communityEditorStyles.toolLabel}
                    color={toolbarIconColor}
                  >
                    {t("freePost.pollTool")}
                  </V2Text>
                </Pressable>
              </View>
              <View style={communityEditorStyles.toolbarTrailing}>
                {/* 카운터·업로드 진행은 도크 오른쪽 — 본문 아래 붕 뜨지 않는다. */}
                {submitStatus !== null || body.length > 0 ? (
                  <V2Text
                    accessibilityLiveRegion="polite"
                    style={communityEditorStyles.counter}
                    color={surface.textMuted}
                  >
                    {submitStatus ?? `${body.length}/700`}
                  </V2Text>
                ) : null}
                <KeyboardDismissButton color={toolbarIconColor} />
              </View>
            </View>
          </View>
        </KeyboardStickyView>
      </View>

      {/* Vote Sheet — conditional render so useState initializers pick up initialData */}
      {voteSheetOpen && (
        <VoteSheet
          open
          onClose={() => setVoteSheetOpen(false)}
          onComplete={handleVoteComplete}
          initialData={
            editingVoteIndex !== null ? votes[editingVoteIndex] : null
          }
        />
      )}

      {/* 등록 직전 책임 확인 — 확인이 곧 동의, 이어서 바로 올린다. */}
      <ContentResponsibilityCheck
        visible={consentVisible}
        onClose={() => setConsentVisible(false)}
        onConfirm={() => {
          setConsentVisible(false)
          setResponsibilityAgreed(true)
          void afterModalTransitions().then(() => submitRef.current(true))
        }}
      />

      {/* 사진 크게 보기 — 수정 화면과 같은 그릇. */}
      <CommunityPhotoPreview
        uri={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Confirm Exit Modal */}
      <ConfirmExitModal
        surface="free_write"
        hasDraft={hasContent}
        visible={confirmExitVisible}
        title={t("freePost.exitTitle")}
        description={t("freePost.exitBody")}
        cancelLabel={t("action.keepWriting")}
        confirmLabel={t("action.exit")}
        onCancel={() => setConfirmExitVisible(false)}
        onConfirm={() => {
          // 여기부터의 이탈은 사용자가 이미 고른 것이다(위 `allowExitRef` 머리말).
          allowExitRef.current = true
          // 확인 모달 dismiss 와 화면 pop(네이티브 전환)이 겹치지 않게
          // 전이가 가라앉은 뒤 나간다(appModalGate 머리말).
          setConfirmExitVisible(false)
          void afterModalTransitions().then(onClose)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
})
