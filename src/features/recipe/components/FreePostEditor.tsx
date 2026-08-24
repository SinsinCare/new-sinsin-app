import { useRef, useState } from "react"
import { usePreventRemove } from "@react-navigation/native"
import { useNavigation } from "expo-router"
import {
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { Text, TextInput } from "@/src/shared/components/AppText"
import {
  AppModal,
  afterModalTransitions,
} from "@/src/shared/components/AppModal"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  KeyboardAwareScrollView,
  KeyboardController,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { Icon } from "@/src/shared/components/Icon"
import { PostCategorySheet } from "@/src/features/recipe/components/PostCategorySheet"
import { FREE_POST_CATEGORIES } from "@/src/features/recipe/data/freePostCategories"
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
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
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

const POST_CATEGORY_LABEL_KEYS = {
  diet: "category.post.diet",
  numbers: "category.post.numbers",
  symptoms: "category.post.symptoms",
  medicine: "category.post.medicine",
  "dining-out": "category.post.dining-out",
  daily: "category.post.daily",
} as const

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
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name="keyboard" size={24} color={color} />
    </Pressable>
  )
}

export function FreePostEditor({ onClose }: FreePostEditorProps) {
  const { t } = useTranslation("recipe")
  const { t: tCommon } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 24) : insets.bottom

  const [selectedCategory, setSelectedCategory] = useState(
    FREE_POST_CATEGORIES[0].key,
  )
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [votes, setVotes] = useState<VoteData[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [voteSheetOpen, setVoteSheetOpen] = useState(false)
  const [editingVoteIndex, setEditingVoteIndex] = useState<number | null>(null)
  const [confirmExitVisible, setConfirmExitVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<string | null>(null)
  const [responsibilityAgreed, setResponsibilityAgreed] = useState(false)
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

  const toolbarIconColor = surface.textMuted

  const selectedLabel = t(
    POST_CATEGORY_LABEL_KEYS[
      selectedCategory as keyof typeof POST_CATEGORY_LABEL_KEYS
    ],
  )

  const canSubmit =
    title.trim().length > 0 && body.trim().length > 0 && responsibilityAgreed

  const handleOpenCategorySheet = () => {
    Keyboard.dismiss()
    hapticSelection()
    setCategorySheetOpen(true)
  }

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
    부르는 `onClose()`(= `router.back()`)와 등록 성공 뒤의 `router.replace` 도 같이
    잡힌다 — 초안은 그때도 그대로 있기 때문이다. 그대로 두면 확인창이 되뜨거나(가둠),
    글을 올리고 나서 "쓰던 걸 두고 나갈까요" 를 보게 된다.

    그래서 나가기로 **결정한** 순간 이 깃발을 세우고, 가드는 잡아 둔 그 동작을 그대로
    다시 던진다. 다시 던진 동작은 이미 이 화면을 지나온 것으로 표시돼 있어
    (react-navigation 의 `shouldPreventRemove`) 두 번 잡히지 않는다 — 공식 문서의
    `navigation.dispatch(data.action)` 처방이 이것이다.
  */
  const navigation = useNavigation()
  const allowExitRef = useRef(false)
  usePreventRemove(hasContent, ({ data }) => {
    if (allowExitRef.current) {
      navigation.dispatch(data.action)
      return
    }
    Keyboard.dismiss()
    setConfirmExitVisible(true)
  })

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

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
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
      allowExitRef.current = true
      router.replace(`/post/${created.id}` as Href)
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
        retry: mayHaveCommitted ? undefined : () => void submitRef.current(),
      })
    } finally {
      setIsSubmitting(false)
      setSubmitStatus(null)
    }
  }

  /* 렌더마다 최신 `handleSubmit` 로 갈아 끼운다 — 위 `retry` 가 이걸 부른다. */
  const submitRef = useRef(handleSubmit)
  submitRef.current = handleSubmit

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      {/* 디자인 정본: 뒤로가기 + 중앙 제목. 등록 CTA는 하단 전체 폭이다. */}
      <View style={[styles.header, { borderBottomColor: surface.hairline }]}>
        {/*
          `Pressable + hitSlop` 이 아니라 `HeaderIconButton` 이다 — 44/48 규격 상자를
          음수 마진으로 제자리에 넣는다(그 파일 머리말). 이 버튼은 초안을 들고
          나가는 유일한 문이라 "눌렀는데 안 먹었다" 의 비용이 특히 크다.
        */}
        <HeaderIconButton
          onPress={handleClose}
          accessibilityLabel={tCommon("action.back")}
        >
          <Ionicons name="chevron-back" size={24} color={surface.textStrong} />
        </HeaderIconButton>
        <Text style={[styles.headerTitle, { color: surface.textStrong }]}>
          {t("freePost.formTitle")}
        </Text>
        <View style={styles.headerSpacer} />
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
            <ScrollView
              horizontal
              bounces={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRail}
              style={styles.photoRailScroll}
            >
              <SurfacePressable
                onPress={handlePickImages}
                baseColor={surface.surface}
                style={styles.photoTile}
                accessibilityLabel={t("action.addPhoto")}
              >
                <Ionicons name="camera" size={25} color={surface.textWeak} />
                <Text style={[styles.photoLabel, { color: surface.textMuted }]}>
                  {t("freePost.photoVideo")}
                </Text>
              </SurfacePressable>
              {images.map((uri, index) => (
                <ImageThumbnailCard
                  key={uri + index}
                  uri={uri}
                  onPress={() => setPreviewImage(uri)}
                  onRemove={() => handleRemoveImage(index)}
                />
              ))}
            </ScrollView>

            <View style={styles.formSection}>
              <View style={styles.fieldLabelRow}>
                <Text
                  style={[styles.fieldLabel, { color: surface.textStrong }]}
                >
                  {t("freePost.categoryLabel")}
                </Text>
                <Text
                  style={[styles.optionalLabel, { color: surface.textWeak }]}
                >
                  ({t("freePost.optional")})
                </Text>
              </View>
              <SurfacePressable
                onPress={handleOpenCategorySheet}
                haptic={false}
                accessibilityLabel={t("freePost.topicAccessibility", {
                  category: selectedLabel,
                })}
                baseColor={surface.canvas}
                style={[styles.selectField, { borderColor: surface.hairline }]}
              >
                <Text
                  style={[styles.selectText, { color: surface.textStrong }]}
                >
                  {selectedLabel}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={surface.textWeak}
                />
              </SurfacePressable>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.fieldLabel, { color: surface.textStrong }]}>
                {t("freePost.titleLabel")}
                <Text style={{ color: surface.brand }}>*</Text>
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t("freePost.titlePlaceholder")}
                placeholderTextColor={surface.placeholder}
                maxLength={200}
                style={[
                  styles.titleInput,
                  { color: surface.textStrong, borderColor: surface.hairline },
                ]}
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.fieldLabelRow}>
                <Text
                  style={[styles.fieldLabel, { color: surface.textStrong }]}
                >
                  {t("freePost.tagsLabel")}
                </Text>
                <Text
                  style={[styles.optionalLabel, { color: surface.textWeak }]}
                >
                  ({t("freePost.optional")})
                </Text>
              </View>
              <TagInput tags={tags} onChangeTags={setTags} />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.fieldLabel, { color: surface.textStrong }]}>
                {t("freePost.descriptionLabel")}
                <Text style={{ color: surface.brand }}>*</Text>
              </Text>
              <View
                style={[
                  styles.descriptionField,
                  { backgroundColor: surface.surface },
                ]}
              >
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  placeholder={t("freePost.descriptionPlaceholder")}
                  placeholderTextColor={surface.placeholder}
                  multiline
                  maxLength={700}
                  textAlignVertical="top"
                  style={[styles.bodyInput, { color: surface.textStrong }]}
                />
                <Text style={[styles.counter, { color: surface.textWeak }]}>
                  {body.length} / 700
                </Text>
              </View>
            </View>

            {votes.map((voteData, voteIndex) => (
              <View key={voteIndex} style={styles.voteAttachWrap}>
                <VoteAttachCard
                  title={voteData.title}
                  onEdit={() => handleEditVote(voteIndex)}
                  onRemove={() => handleRemoveVote(voteIndex)}
                />
              </View>
            ))}

            <View style={styles.responsibilityWrap}>
              <ContentResponsibilityCheck
                value={responsibilityAgreed}
                onChange={setResponsibilityAgreed}
                disabled={isSubmitting}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>

        <KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>
          {/* 툴바 */}
          <View
            style={[
              styles.toolbar,
              {
                borderTopColor: surface.hairline,
                backgroundColor: surface.canvas,
                paddingBottom: 8,
              },
            ]}
          >
            <View style={styles.toolbarActions}>
              <Pressable
                onPress={handlePickImages}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("action.addPhoto")}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Ionicons
                  name="image-outline"
                  size={23}
                  color={toolbarIconColor}
                />
              </Pressable>
              <Pressable
                onPress={handleOpenVoteSheet}
                disabled={votes.length >= 1}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("freePost.attachPoll")}
                style={({ pressed }) => ({
                  opacity: votes.length >= 1 ? 0.3 : pressed ? 0.6 : 1,
                })}
              >
                <Ionicons
                  name="podium-outline"
                  size={22}
                  color={toolbarIconColor}
                />
              </Pressable>
            </View>
            <KeyboardDismissButton color={toolbarIconColor} />
          </View>
          <View
            style={[
              styles.submitBar,
              {
                backgroundColor: surface.canvas,
                paddingBottom: 14 + bottomInset,
              },
            ]}
          >
            <SurfacePressable
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              accessibilityState={{ disabled: !canSubmit || isSubmitting }}
              baseColor={canSubmit ? surface.brand : surface.ctaOffBg}
              pressedColor={canSubmit ? surface.brand : surface.ctaOffBg}
              pressScale={0.98}
              style={styles.submitFull}
            >
              <Text
                style={[
                  styles.submitLabel,
                  { color: canSubmit ? surface.onBrand : surface.ctaOffText },
                ]}
              >
                {isSubmitting
                  ? (submitStatus ?? t("action.uploading"))
                  : t("freePost.register")}
              </Text>
            </SurfacePressable>
          </View>
        </KeyboardStickyView>
      </View>

      {/* Category Sheet */}
      <PostCategorySheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        categories={FREE_POST_CATEGORIES}
        selectedKey={selectedCategory}
        onSelect={setSelectedCategory}
      />

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

      {/* Image Preview Modal */}
      <AppModal
        visible={previewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <Pressable
          onPress={() => setPreviewImage(null)}
          style={styles.previewOverlay}
        >
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <Pressable
            onPress={() => setPreviewImage(null)}
            style={styles.previewClose}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </Pressable>
      </AppModal>

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
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  header: {
    height: 54,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  headerSpacer: { width: 24 },
  submitLabel: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },

  editorContent: {
    paddingBottom: 24,
  },
  editorBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 22,
  },
  photoRailScroll: {
    flexGrow: 0,
  },
  photoRail: {
    gap: 10,
    alignItems: "center",
  },
  photoTile: {
    width: 96,
    height: 96,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoLabel: {
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: "Pretendard-Medium",
    fontWeight: "500",
  },
  formSection: { gap: 8 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: "Pretendard-SemiBold",
    fontWeight: "600",
  },
  optionalLabel: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Pretendard-Regular",
  },
  selectField: {
    height: 54,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: "Pretendard-Regular",
  },
  titleInput: {
    height: 54,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14.5,
    includeFontPadding: false,
    fontFamily: "Pretendard-Regular",
  },
  descriptionField: {
    minHeight: 190,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  bodyInput: {
    minHeight: 145,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.28,
    fontFamily: "Pretendard-Regular",
  },
  counter: {
    textAlign: "right",
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: "Pretendard-Regular",
  },
  responsibilityWrap: {
    paddingBottom: 4,
  },
  voteAttachWrap: {
    marginBottom: 2,
  },

  toolbar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
  submitBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  submitFull: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "90%",
    height: "70%",
  },
  previewClose: {
    position: "absolute",
    top: 60,
    right: 20,
    padding: 8,
  },
})
