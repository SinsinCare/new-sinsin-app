import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { communityEditorStyles } from "../components/community/communityEditorStyles"
import { CommunityPhotoPreview } from "../components/community/CommunityPhotoPreview"
import { useSuppressGlobalKeyboardToolbar } from "@/src/stores/keyboardToolbarStore"
import type { ReactNode } from "react"
import { useState, useEffect, useRef } from "react"
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { Text, TextInput } from "@/src/shared/components/AppText"
import { HeaderIconButton } from "@/src/shared/components/HeaderIconButton"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useNavigation } from "expo-router"
import { usePreventRemove } from "@react-navigation/native"
import { useAppRouter } from "@/src/shared/navigation"
import {
  KeyboardAwareScrollView,
  KeyboardController,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller"

import { useSurface } from "@/src/hooks/useSurface"
import { Icon } from "@/src/shared/components/Icon"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { PostCategorySheet } from "@/src/features/recipe/components/PostCategorySheet"
import { ImageThumbnailCard } from "@/src/features/recipe/components/ImageThumbnailCard"
import { TagInput } from "@/src/features/recipe/components/TagInput"
import { FREE_POST_CATEGORIES } from "@/src/features/recipe/data/freePostCategories"
import { usePostDetail } from "@/src/features/recipe/hooks/usePostDetail"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { isConfidentlyNotMine } from "@/src/features/recipe/utils/contentOwnership"
import { pickMultipleImages } from "@/src/features/recipe/services/imagePickerService"
import { imageUploadService } from "@/src/features/recipe/services/imageUploadService"
import { ArticleSkeleton, ErrorMessage } from "@/src/shared/components"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import { ConfirmExitModal } from "@/src/shared/components/ConfirmExitModal"
import { presentCommunityError } from "@/src/features/recipe/utils/communityError"
import { resolveError } from "@/src/lib/errorMessage"
import { useTranslation } from "react-i18next"

import { showInfoToast } from "@/src/lib/toast"

const MAX_IMAGES = 5
/*
  본문 상한 — **작성 화면과 같은 700 자**(`FreePostEditor` 의 `maxLength`/카운터).
  서버는 20,000 자까지 받지만, 그 사이 구간은 "작성으로는 만들 수 없는데 수정으로는
  만들어지는 글" 이다. 같은 글에 두 가지 규칙이 있으면 어느 쪽이 규칙인지 알 수 없다.
  이미 700 자를 넘겨 저장된 글(이 화면에 상한이 없던 동안 만들어진 것)은 그대로
  보이고 그대로 저장된다 — `maxLength` 는 **더 넣는 것만** 막는다. 카운터가
  `812 / 700` 으로 사실을 말하고, 지우면 규칙 안으로 돌아온다.
*/
const MAX_BODY_LENGTH = 700
/** 글이 사라졌다는 서버 코드. 이 화면에서는 편집을 계속할 대상이 없다는 뜻이다. */
const POST_GONE_CODE = "COMMUNITY_ERROR_001"
const POST_CATEGORY_LABEL_KEYS = {
  diet: "category.post.diet",
  numbers: "category.post.numbers",
  symptoms: "category.post.symptoms",
  medicine: "category.post.medicine",
  "dining-out": "category.post.dining-out",
  daily: "category.post.daily",
} as const

/** 기존 이미지는 저장 경로를, 새로 고른 이미지는 로컬 URI 를 들고 있다. */
interface EditImage {
  objectPath?: string
  localUri?: string
  displayUri: string
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
 * 편집기를 그릴 수 없는 상태의 그릇 — 실패 · 없는 글.
 *
 * 규칙 하나: **어느 갈래든 나갈 문이 있다.** 이 화면은 딥링크로도 열리므로
 * (`sinsin:///free/999999`) 앞에 스택이 없을 수 있는데, `useAppRouter().back()` 이
 * 그때 라우트 그래프가 정한 곳으로 내보낸다(그 훅 머리말).
 */
function EditorStateScreen({ children }: { children: ReactNode }) {
  const { t } = useTranslation("recipe")
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const surface = useSurface()

  return (
    <View
      style={[
        styles.stateScreen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      {children}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={({ pressed }) => [
          communityEditorStyles.tool,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
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

export function FreePostEditScreen() {
  const { t } = useTranslation("recipe")
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 24) : insets.bottom

  const { post, isLoading, isError, error, refetch } = usePostDetail(id!)
  /*
    변이(`updatePost`) 하나만 필요한 화면은 피드를 **관찰하지 않는다.** 기본값
    (`observe: true`)으로 두면 이 편집기를 여는 것만으로 옵저버가 하나 더 붙어,
    이미 낡은 무한 쿼리가 들고 있던 **페이지 전부**가 다시 날아간다(세 장 스크롤한
    사람이 수정을 열면 GET 3개). 작성 화면(`FreePostEditor`)이 이미 같은 처방이다.
  */
  const { updatePost, isUpdating } = useCommunityPosts({ observe: false })
  const { data: myProfile } = useMyPageProfile()

  const [selectedCategory, setSelectedCategory] = useState("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [images, setImages] = useState<EditImage[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  useSuppressGlobalKeyboardToolbar()
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible)
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [confirmExitVisible, setConfirmExitVisible] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  /*
    저장하려는 순간 서버가 "이 글은 사라졌어요"(`COMMUNITY_ERROR_001`)를 줬다.
    종전에는 토스트만 띄우고 화면을 그대로 뒀는데, 함께 넘긴 `refresh: refetch` 도
    같은 404 를 받고 react-query 는 **직전 `data` 를 그대로 들고 있으므로**
    `post` 가 계속 truthy 였다 — 없는 글의 편집기가 남아 사용자는 `저장` 을 몇 번이고
    누를 수 있었다. 그 오류를 여기 담아 두고 아래 실패 갈래로 넘긴다.
  */
  const [goneError, setGoneError] = useState<unknown>(null)

  /*
    진입 가드 — 이 화면은 상세의 "수정" 메뉴(내 글에만 보인다)로만 오지만, 백스택
    복원·딥링크로 남의 글 id 가 들어올 수 있다. **확정된 불일치에만** 반응한다:
    모르는 동안 접으면 내 글 수정까지 튕겨 낸다(`isConfidentlyNotMine` 머리말).
    저장은 어차피 서버가 `COMMUNITY_ERROR_002` 로 거절한다.
  */
  const isForeignPost =
    post != null && isConfidentlyNotMine(post, myProfile?.nickName)

  useEffect(() => {
    if (isForeignPost) router.back()
  }, [isForeignPost, router])

  useEffect(() => {
    if (post && !initialized) {
      setSelectedCategory(post.category)
      setTitle(post.title)
      setBody(post.description)
      setImages(
        post.imageObjectPaths.map((objectPath, index) => ({
          objectPath,
          displayUri: post.imageUris[index] ?? objectPath,
        })),
      )
      setTags(post.tags)
      setInitialized(true)
    }
  }, [post, initialized])

  /*
    ── 두고 나갈 것이 있는가 ─────────────────────────────────────────────────
    아래 이른 반환(실패·로딩·없는 글)보다 **위**에 있어야 한다 — 훅(`usePreventRemove`)
    이 이 값을 받고, 훅 호출 순서는 렌더마다 같아야 한다.

    `initialized` 를 앞에 두는 것이 중요하다. 글이 막 도착한 프레임에는 폼이 아직 비어
    있어서(`title` 은 "") 모든 칸이 "바뀐 것" 으로 보인다 — 그대로 두면 남의 글 판정으로
    자동으로 나가는 경로(`isForeignPost`)까지 확인창에 걸린다. 채워 넣기 전에는
    두고 나갈 것이 없다.
  */
  const imagesChanged =
    post != null &&
    (images.length !== post.imageObjectPaths.length ||
      images.some(
        (image, index) => image.objectPath !== post.imageObjectPaths[index],
      ))

  const tagsChanged =
    post != null &&
    (tags.length !== post.tags.length ||
      tags.some((tag, index) => tag !== post.tags[index]))

  /*
    ── 확인창을 그릴 수 없는 상태에서는 가드를 **내린다** ─────────────────────
    `usePreventRemove` 의 콜백이 하는 일은 `setConfirmExitVisible(true)` 하나뿐인데,
    `<ConfirmExitModal>` 은 이 파일 맨 아래 — **아래 이른 반환들보다 밑**에 있다.
    그러니 실패 갈래(`failure`)나 남의 글 갈래(`isForeignPost`)를 그리는 동안 가드가
    서 있으면, 뒤로가기는 취소되는데 확인창은 **아무것도 렌더되지 않는다.** 나갈 문이
    사라진다 — 실측된 모양은 이렇다:

      제목을 고친다 → 그 사이 글이 지워진다 → 저장 → `COMMUNITY_ERROR_001` →
      `goneError` (refetch 를 일부러 안 하므로 `post` 는 캐시에 그대로 남아
      `hasChanges` 도 계속 true) → 실패 화면 → 그 화면의 뒤로가기 →
      가드가 잡음 → 확인창 없음 → **앱을 죽이는 것 말고 나갈 방법이 없다.**
      안드로이드 하드웨어 백도 같고, iOS 엣지 스와이프는 `(write)/_layout.tsx` 가
      이미 꺼 두었다.

    그래서 "두고 나갈 것이 있는가" 에 **"물어볼 수 있는가"** 를 같이 넣는다.
    `goneError` 가 있으면 편집을 이어 갈 글이 없어 두고 나갈 변경분도 없고,
    `isForeignPost` 는 화면이 스스로 나가는 길이라(위 이펙트) 붙잡을 이유가 없다.
    `initialized`·`post` 는 이미 같은 이유로 앞에 서 있었다(로딩·없는 글 갈래).

    ⚠️ 새 이른 반환을 이 아래에 추가하면 그 조건도 여기 들어와야 한다 —
    `tests/writeExitTrap.test.ts` 가 이른 반환 목록을 세어 두고 있다.
  */
  const canAskBeforeLeaving =
    initialized && post != null && goneError == null && !isForeignPost

  const hasChanges =
    canAskBeforeLeaving &&
    post != null &&
    (title !== post.title ||
      body !== post.description ||
      selectedCategory !== post.category ||
      imagesChanged ||
      tagsChanged)

  /*
    ── 안드로이드 하드웨어 백 ────────────────────────────────────────────────
    ✕ 를 거치지 않는 길이다. `app/(write)/_layout.tsx` 의 `gestureEnabled: false` 는
    **iOS 전용**이라(native-stack 이 안드로이드에서는 그 값을 무조건 false 로 넘긴다)
    안드로이드에서는 백 한 번에 고쳐 쓰던 내용이 확인 없이 사라졌다.

    가드는 이탈의 **출처를 가리지 않는다** — 확인창의 "나가기" 도, 저장 성공 뒤의
    `router.back()` 도 바뀐 것이 남은 채로 나가는 길이라 같이 잡힌다. 그대로 두면
    확인창이 되뜨어 화면을 못 떠나고, 저장하고 나서도 "쓰던 걸 두고 나갈까요" 가 뜬다.
    그래서 나가기로 **결정한** 순간 `allowExitRef` 를 세우고, 가드는 잡아 둔 그 동작을
    그대로 다시 던진다(공식 처방 `navigation.dispatch(data.action)` — 다시 던진 동작은
    이미 이 화면을 지나온 것으로 표시돼 있어 두 번 잡히지 않는다).
  */
  const navigation = useNavigation()
  const allowExitRef = useRef(false)
  usePreventRemove(hasChanges, ({ data }) => {
    if (allowExitRef.current) {
      navigation.dispatch(data.action)
      return
    }
    Keyboard.dismiss()
    setConfirmExitVisible(true)
  })

  /*
    ── 화면 상태 세 갈래 (실패 / 로딩 / 없는 글) ─────────────────────────────
    종전에는 셋이 한 줄로 뭉쳐 **영원한 스켈레톤**이었다. 없는 글의 딥링크
    (`/free/999999`)로 들어오면 조회는 실패로 끝나므로 `isLoading` 은 false, `post` 는 null —
    헤더도 뒤로가기도 없는 회색 뼈대만 남고 그 화면에서 나갈 방법이 없었다.
    상세(`app/post/[id].tsx`)가 쓰는 것과 같은 세 갈래로 나눈다: 어느 갈래든
    **나갈 문**이 있고, 다시 시도는 `retryable` 일 때만 준다(없는 글은 몇 번을
    눌러도 없다).
  */
  const failure = goneError ?? (isError && !post ? error : null)
  if (failure != null) {
    const resolved = resolveError(failure)
    return (
      <EditorStateScreen>
        <ErrorMessage
          title={resolved.title}
          message={resolved.body ?? ""}
          onRetry={resolved.retryable ? () => void refetch() : undefined}
          retryLabel={t("feed.errorRetry")}
        />
      </EditorStateScreen>
    )
  }

  if (isLoading) return <ArticleSkeleton variant="editor" />

  if (!post) {
    return (
      <EditorStateScreen>
        <Text
          style={[styles.stateTitle, { color: surface.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {t("community.postDetail.notFound", { ns: "common" })}
        </Text>
      </EditorStateScreen>
    )
  }

  // 남의 글로 판정되면 back() 이 도는 한 프레임 동안 편집 폼 대신 스켈레톤을 둔다.
  if (isForeignPost) return <ArticleSkeleton variant="editor" />

  const isSaving = isUpdating || isUploading

  /*
    작성 화면은 여기에 **책임 동의 체크**(`ContentResponsibilityCheck`)를 하나 더
    걸고 있다. 수정에는 **일부러 걸지 않는다.**

    그 체크는 기록이 남지 않는 화면 전용 장치다(서버로 아무것도 보내지 않는다).
    그러니 다시 물어도 더 강한 동의가 생기지 않고, 늘어나는 것은 단계뿐이다.
    더 나쁜 쪽은 그 다음이다 — 수정은 **문제를 지적받은 사람이 고치러 오는 길**이라,
    고치기 전에 동의부터 다시 받게 하면 정정이라는 옳은 행동에 마찰을 붙인다.
    남은 두 모양도 둘 다 거짓말이다: 체크를 꺼 두고 시작하면 "당신은 아직 동의하지
    않았다" 가 되는데 그 글은 동의 위에서 올라간 글이고, 켜 두고 시작하면 사용자가
    누른 적 없는 동의를 화면이 대신 눌러 준 것이 된다.

    본문 상한(`MAX_BODY_LENGTH`)은 반대다 — 그쪽은 **결과물에 남는 규칙**이라
    두 화면이 같아야 한다.
  */
  const canSubmit = title.trim().length > 0 && body.trim().length > 0

  const handleClose = () => {
    Keyboard.dismiss()
    if (hasChanges) {
      setConfirmExitVisible(true)
    } else {
      router.back()
    }
  }

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
      setImages((prev) =>
        [
          ...prev,
          ...uris.map((uri) => ({ localUri: uri, displayUri: uri })),
        ].slice(0, MAX_IMAGES),
      )
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!canSubmit || isSaving) return
    setIsUploading(true)
    let imageObjectPaths: string[]
    try {
      imageObjectPaths = []
      for (const image of images) {
        if (image.objectPath) {
          imageObjectPaths.push(image.objectPath)
        } else if (image.localUri) {
          const uploaded = await imageUploadService.uploadImage(
            image.localUri,
            "community",
          )
          imageObjectPaths.push(uploaded.objectPath)
        }
      }
    } catch (error) {
      setIsUploading(false)
      // 형식·용량(`FOOD_CAMERA_001`·`002`)은 사진을 바꾸면 바로 풀린다. 그걸
      // "인터넷 연결을 확인" 으로 덮으면 같은 사진으로 계속 다시 누르게 된다.
      presentCommunityError(error, {
        scope: "community-post-edit-photo",
        retry: () => void handleSubmit(),
      })
      return
    }
    setIsUploading(false)
    updatePost(
      {
        id: post.id,
        category: selectedCategory,
        title: title.trim(),
        description: body.trim(),
        imageObjectPaths,
        tags,
      },
      {
        onSuccess: () => {
          // 저장했으면 두고 나갈 변경분이 아니다 — 초안 가드를 통과시킨다(위 머리말).
          allowExitRef.current = true
          router.back()
        },
        /*
          남의 글을 고치려 하면 `COMMUNITY_ERROR_002`, 그 사이 지워졌으면 `001` 이다.
          `002` 는 목록을 다시 받으면 화면이 맞춰진다. `001` 은 다르다 — 다시 받아도
          같은 404 이므로 "새로고침" 버튼은 거짓말이고, 편집을 계속할 글도 없다.
          그때는 버튼을 주지 않고 화면을 **없는 글**로 바꾼다(위 세 갈래).
        */
        onError: (saveError) => {
          const isGone = resolveError(saveError).code === POST_GONE_CODE
          if (isGone) setGoneError(saveError)
          presentCommunityError(saveError, {
            scope: "community-post-edit",
            ...(isGone ? {} : { refresh: () => void refetch() }),
          })
        },
      },
    )
  }

  const selectedLabel = t(
    POST_CATEGORY_LABEL_KEYS[
      selectedCategory as keyof typeof POST_CATEGORY_LABEL_KEYS
    ],
  )

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: surface.border }]}>
        <HeaderIconButton
          onPress={handleClose}
          accessibilityLabel={t("action.close")}
        >
          <Ionicons name="close" size={24} color={surface.textStrong} />
        </HeaderIconButton>
        <Text
          style={[
            communityEditorStyles.headerTitle,
            { color: surface.textStrong },
          ]}
        >
          {t("community.refresh.editPostTitle", { ns: "common" })}
        </Text>
        <SurfacePressable
          onPress={handleSubmit}
          disabled={!canSubmit || isSaving}
          accessibilityState={{ disabled: !canSubmit || isSaving }}
          baseColor={surface.canvas}
          pressedColor={surface.surface}
          pressScale={0.94}
          style={styles.submitPill}
        >
          <Text
            style={[
              styles.submitLabel,
              { color: canSubmit ? surface.brand : surface.ctaOffText },
            ]}
            lineBreakStrategyIOS="hangul-word"
          >
            {isSaving ? t("action.saving") : t("action.save")}
          </Text>
        </SurfacePressable>
      </View>

      {/* 카테고리 */}
      <View style={styles.categoryRow}>
        <Pressable
          onPress={() => {
            Keyboard.dismiss()
            setCategorySheetOpen(true)
          }}
          accessibilityRole="button"
          accessibilityLabel={t("freePost.topicAccessibility", {
            category: selectedLabel,
          })}
          style={[styles.categoryChip, { borderBottomColor: surface.border }]}
        >
          <Text style={[styles.categoryLabel, { color: surface.textStrong }]}>
            {selectedLabel}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={surface.textMuted}
          />
        </Pressable>
      </View>

      {/* 제목·본문 */}
      <View style={styles.flex}>
        <KeyboardAwareScrollView
          bounces={false}
          overScrollMode="never"
          style={styles.flex}
          contentContainerStyle={styles.editorContent}
          bottomOffset={bottomInset + 72}
          disableScrollOnKeyboardHide
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          <View style={styles.editorBody}>
            <TextInput
              multiline
              accessibilityLabel={t("freePost.titleLabel")}
              value={title}
              onChangeText={setTitle}
              placeholder={t("freePost.titlePlaceholder")}
              placeholderTextColor={surface.placeholder}
              maxLength={200}
              style={[
                styles.titleInput,
                {
                  color: surface.textStrong,
                  borderBottomColor: surface.border,
                },
              ]}
            />
            <TextInput
              accessibilityLabel={t("freePost.descriptionLabel")}
              value={body}
              onChangeText={setBody}
              placeholder={t("freePost.editBodyPlaceholder")}
              placeholderTextColor={surface.placeholder}
              multiline
              maxLength={MAX_BODY_LENGTH}
              textAlignVertical="top"
              style={[styles.bodyInput, { color: surface.textStrong }]}
            />
            {/* 작성 화면과 같은 카운터. 상한이 있다는 사실을 다 채우기 전에 말한다. */}
            <Text
              style={[
                styles.counter,
                {
                  color:
                    body.length > MAX_BODY_LENGTH
                      ? surface.danger
                      : surface.text,
                },
              ]}
            >
              {body.length} / {MAX_BODY_LENGTH}
            </Text>
            {(tagInputOpen || tags.length > 0) && (
              <TagInput tags={tags} onChangeTags={setTags} />
            )}
          </View>
        </KeyboardAwareScrollView>

        <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
          {images.length > 0 && (
            <ScrollView
              bounces={false}
              overScrollMode="never"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageStrip}
              style={styles.imageStripWrap}
            >
              {images.map((image, index) => (
                <ImageThumbnailCard
                  key={`${image.displayUri}-${index}`}
                  uri={image.displayUri}
                  onPress={() => setPreviewImage(image.displayUri)}
                  onRemove={() => handleRemoveImage(index)}
                />
              ))}
            </ScrollView>
          )}
          <View
            style={[
              styles.toolbar,
              {
                borderTopColor: surface.border,
                backgroundColor: surface.canvas,
                paddingBottom: isKeyboardVisible ? 0 : bottomInset,
              },
            ]}
          >
            <View style={styles.toolbarActions}>
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
                  size={23}
                  color={surface.textMuted}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss()
                  setTagInputOpen(true)
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("action.addTag")}
                style={({ pressed }) => [
                  communityEditorStyles.tool,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Icon name="hashtag" size={22} color={surface.textMuted} />
              </Pressable>
            </View>
            <KeyboardDismissButton color={surface.textMuted} />
          </View>
        </KeyboardStickyView>
      </View>

      <CommunityPhotoPreview
        uri={previewImage}
        onClose={() => setPreviewImage(null)}
      />
      <PostCategorySheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        categories={FREE_POST_CATEGORIES}
        selectedKey={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <ConfirmExitModal
        surface="free_edit"
        hasDraft={hasChanges}
        visible={confirmExitVisible}
        title={t("freePost.editExitTitle")}
        description={t("freePost.editExitBody")}
        cancelLabel={t("action.keepEditing")}
        confirmLabel={t("action.exit")}
        onCancel={() => setConfirmExitVisible(false)}
        onConfirm={() => {
          // 여기부터의 이탈은 사용자가 이미 고른 것이다(위 `allowExitRef` 머리말).
          allowExitRef.current = true
          // 확인 모달의 dismiss 와 화면 pop(네이티브 전환)이 겹치지 않게 전이가
          // 가라앉은 뒤 나간다 — 겹치면 iOS 에서 앱 전체 터치가 죽는다
          // (`appModalGate` 머리말. 작성 화면 둘이 이미 같은 처방이다).
          setConfirmExitVisible(false)
          void afterModalTransitions().then(() => router.back())
        }}
      />
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

  /* 실패·없는 글 화면. 상세(`app/post/[id].tsx`)와 같은 모양을 쓴다. */
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

  header: communityEditorStyles.header,
  submitPill: communityEditorStyles.submit,
  submitLabel: communityEditorStyles.submitLabel,

  categoryRow: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
    flexDirection: "row",
  },
  categoryChip: { ...communityEditorStyles.category, flex: 1 },
  categoryLabel: communityEditorStyles.categoryLabel,

  editorContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  editorBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleInput: communityEditorStyles.titleInput,
  bodyInput: communityEditorStyles.bodyInput,
  /* 작성 화면(`FreePostEditor`)의 카운터와 같은 치수. */
  counter: communityEditorStyles.counter,

  imageStrip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  imageStripWrap: {
    flexGrow: 0,
    flexShrink: 0,
  },
  toolbar: {
    paddingHorizontal: 20,
    paddingTop: 0,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: borderWidth.thin,
  },
  toolbarActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
})
