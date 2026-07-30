import { useState } from "react"
import {
  Alert,
  Image,
  Keyboard,
  Modal,
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
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { imageUploadService } from "@/src/features/recipe/services/imageUploadService"
import { useTranslation } from "react-i18next"

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
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [voteSheetOpen, setVoteSheetOpen] = useState(false)
  const [editingVoteIndex, setEditingVoteIndex] = useState<number | null>(null)
  const [confirmExitVisible, setConfirmExitVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<string | null>(null)
  const [responsibilityAgreed, setResponsibilityAgreed] = useState(false)
  const { createPostAsync } = useCommunityPosts()

  const inkBg = surface.isDark ? "#F4F4F6" : "#1D1E20"
  const inkContent = surface.isDark ? "#17181C" : "#FFFFFF"
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

  const handlePickImages = async () => {
    Keyboard.dismiss()
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      Alert.alert(
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

  const handleOpenTagInput = () => {
    Keyboard.dismiss()
    setTagInputOpen(true)
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
    try {
      // 한 장이라도 실패하면 글을 올리지 않는다 — 이미지가 빠진 채 조용히
      // 등록되는 것보다 실패를 알리고 다시 시도하게 하는 쪽이 낫다.
      const imageObjectPaths: string[] = []
      for (const [index, imageUri] of images.entries()) {
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
        imageObjectPaths.push(uploaded.objectPath)
      }
      setSubmitStatus(null)
      await createPostAsync({
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
      onClose()
    } catch {
      Alert.alert(t("freePost.uploadErrorTitle"), t("freePost.uploadErrorBody"))
    } finally {
      setIsSubmitting(false)
      setSubmitStatus(null)
    }
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      {/* 헤더 — 등록은 잉크 필 버튼. 활성/비활성이 면으로 갈린다. */}
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
          disabled={!canSubmit || isSubmitting}
          accessibilityState={{ disabled: !canSubmit || isSubmitting }}
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
          >
            {isSubmitting
              ? (submitStatus ?? t("action.uploading"))
              : t("action.upload")}
          </Text>
        </SurfacePressable>
      </View>

      {/* 카테고리 — 현재 값이 곧 버튼이다. */}
      <View style={styles.categoryRow}>
        <SurfacePressable
          onPress={handleOpenCategorySheet}
          haptic={false}
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
              placeholder={t("freePost.bodyPlaceholder")}
              placeholderTextColor={surface.placeholder}
              multiline
              textAlignVertical="top"
              style={[styles.bodyInput, { color: surface.textStrong }]}
            />
            {(tagInputOpen || tags.length > 0) && (
              <TagInput tags={tags} onChangeTags={setTags} />
            )}
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
          {/* 첨부 이미지 */}
          {images.length > 0 && (
            <ScrollView
              bounces={false}
              overScrollMode="never"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageStrip}
              style={styles.imageStripWrap}
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
          )}

          {/* 첨부 투표 */}
          {votes.map((voteData, voteIndex) => (
            <View
              key={voteIndex}
              style={[
                styles.voteAttachWrap,
                voteIndex === 0 && styles.voteAttachWrapFirst,
              ]}
            >
              <VoteAttachCard
                title={voteData.title}
                onEdit={() => handleEditVote(voteIndex)}
                onRemove={() => handleRemoveVote(voteIndex)}
              />
            </View>
          ))}

          {/* 툴바 */}
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
              <Pressable
                onPress={handleOpenTagInput}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("action.addTag")}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Icon name="hashtag" size={22} color={toolbarIconColor} />
              </Pressable>
            </View>
            <KeyboardDismissButton color={toolbarIconColor} />
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
      <Modal
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
      </Modal>

      {/* Confirm Exit Modal */}
      <ConfirmExitModal
        visible={confirmExitVisible}
        title={t("freePost.exitTitle")}
        description={t("freePost.exitBody")}
        cancelLabel={t("action.keepWriting")}
        confirmLabel={t("action.exit")}
        onCancel={() => setConfirmExitVisible(false)}
        onConfirm={() => {
          setConfirmExitVisible(false)
          onClose()
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
    lineHeight: 26,
    letterSpacing: -0.38,
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
  responsibilityWrap: {
    paddingTop: 16,
    paddingBottom: 8,
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
  voteAttachWrap: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  voteAttachWrapFirst: {
    marginTop: 8,
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
