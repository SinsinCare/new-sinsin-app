import { useState, useEffect } from "react"
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"
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
import { ArticleSkeleton } from "@/src/shared/components"
import { ConfirmExitModal } from "@/src/shared/components/ConfirmExitModal"
import { presentCommunityError } from "@/src/features/recipe/utils/communityError"
import { useTranslation } from "react-i18next"

import { showInfoToast } from "@/src/lib/toast"

const MAX_IMAGES = 5
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
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name="keyboard" size={24} color={color} />
    </Pressable>
  )
}

export default function FreePostEditScreen() {
  const { t } = useTranslation("recipe")
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 24) : insets.bottom

  const { post, isLoading, refetch } = usePostDetail(id!)
  const { updatePost, isUpdating } = useCommunityPosts()
  const { data: myProfile } = useMyPageProfile()

  const [selectedCategory, setSelectedCategory] = useState("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [images, setImages] = useState<EditImage[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [confirmExitVisible, setConfirmExitVisible] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [initialized, setInitialized] = useState(false)

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

  // 남의 글로 판정되면 back() 이 도는 한 프레임 동안 편집 폼 대신 스켈레톤을 둔다.
  if (isLoading || !post || isForeignPost) {
    return <ArticleSkeleton variant="editor" />
  }

  const inkBg = surface.isDark ? "#F4F4F6" : "#1D1E20"
  const inkContent = surface.isDark ? "#17181C" : "#FFFFFF"
  const isSaving = isUpdating || isUploading

  const canSubmit = title.trim().length > 0 && body.trim().length > 0

  const imagesChanged =
    images.length !== post.imageObjectPaths.length ||
    images.some(
      (image, index) => image.objectPath !== post.imageObjectPaths[index],
    )

  const tagsChanged =
    tags.length !== post.tags.length ||
    tags.some((tag, index) => tag !== post.tags[index])

  const hasChanges =
    title !== post.title ||
    body !== post.description ||
    selectedCategory !== post.category ||
    imagesChanged ||
    tagsChanged

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
        onSuccess: () => router.back(),
        // 남의 글을 고치려 하면 `COMMUNITY_ERROR_002`, 그 사이 지워졌으면 `001` 이다.
        // 둘 다 재시도가 아니라 목록을 다시 받는 것으로 끝난다.
        onError: (error) =>
          presentCommunityError(error, {
            scope: "community-post-edit",
            refresh: () => void refetch(),
          }),
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
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="close" size={24} color={surface.textStrong} />
        </Pressable>
        <SurfacePressable
          onPress={handleSubmit}
          disabled={!canSubmit || isSaving}
          accessibilityState={{ disabled: !canSubmit || isSaving }}
          baseColor={canSubmit ? inkBg : surface.ctaOffBg}
          pressedColor={
            canSubmit
              ? surface.isDark
                ? "#DADAE0"
                : "#34363A"
              : surface.ctaOffBg
          }
          pressScale={0.94}
          style={styles.submitPill}
        >
          <Text
            style={[
              styles.submitLabel,
              { color: canSubmit ? inkContent : surface.ctaOffText },
            ]}
            lineBreakStrategyIOS="hangul-word"
          >
            {isSaving ? t("action.saving") : t("action.save")}
          </Text>
        </SurfacePressable>
      </View>

      {/* 카테고리 */}
      <View style={styles.categoryRow}>
        <SurfacePressable
          onPress={() => {
            Keyboard.dismiss()
            setCategorySheetOpen(true)
          }}
          accessibilityLabel={t("freePost.topicAccessibility", {
            category: selectedLabel,
          })}
          baseColor={surface.surface}
          pressScale={0.96}
          style={styles.categoryChip}
        >
          <Text style={[styles.categoryLabel, { color: surface.textStrong }]}>
            {selectedLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={surface.textMuted} />
        </SurfacePressable>
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
              value={title}
              onChangeText={setTitle}
              placeholder={t("freePost.titlePlaceholder")}
              placeholderTextColor={surface.placeholder}
              maxLength={200}
              style={[
                styles.titleInput,
                {
                  color: surface.textStrong,
                  borderBottomColor: surface.hairline,
                },
              ]}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t("freePost.editBodyPlaceholder")}
              placeholderTextColor={surface.placeholder}
              multiline
              textAlignVertical="top"
              style={[styles.bodyInput, { color: surface.textStrong }]}
            />
            {(tagInputOpen || tags.length > 0) && (
              <TagInput tags={tags} onChangeTags={setTags} />
            )}
          </View>
        </KeyboardAwareScrollView>

        <KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>
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
                  onPress={() => {}}
                  onRemove={() => handleRemoveImage(index)}
                />
              ))}
            </ScrollView>
          )}
          <View
            style={[
              styles.toolbar,
              {
                borderTopColor: surface.hairline,
                backgroundColor: surface.canvas,
                paddingBottom: 10 + bottomInset,
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
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Icon name="hashtag" size={22} color={surface.textMuted} />
              </Pressable>
            </View>
            <KeyboardDismissButton color={surface.textMuted} />
          </View>
        </KeyboardStickyView>
      </View>

      <PostCategorySheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        categories={FREE_POST_CATEGORIES}
        selectedKey={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <ConfirmExitModal
        visible={confirmExitVisible}
        title={t("freePost.editExitTitle")}
        description={t("freePost.editExitBody")}
        cancelLabel={t("action.keepEditing")}
        confirmLabel={t("action.exit")}
        onCancel={() => setConfirmExitVisible(false)}
        onConfirm={() => {
          setConfirmExitVisible(false)
          router.back()
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
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  submitPill: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitLabel: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.28,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },

  categoryRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: "row",
  },
  categoryChip: {
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryLabel: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },

  editorContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  editorBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleInput: {
    fontSize: 19,
    letterSpacing: -0.38,
    // 단일행 입력엔 lineHeight 를 주지 않는다 — iOS 가 글자를 문단 기준으로 앉혀
    // 상하 여백이 어긋난다(surface.ts `singleLineInputText` 머리말).
    includeFontPadding: false,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bodyInput: {
    flex: 1,
    minHeight: 200,
    paddingTop: 14,
    fontSize: 15.5,
    lineHeight: 24,
    letterSpacing: -0.31,
    fontFamily: "Pretendard-Regular",
  },

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
})
