import { useState, useEffect } from "react"
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  useColorScheme,
  StyleSheet,
} from "react-native"
import { YStack, XStack, Text, View, ScrollView } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
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
import { ConfirmExitModal } from "@/src/shared/components/ConfirmExitModal"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"

const BG_COLOR = { light: "#FCFCFC", dark: "#2A2A30" } as const
const HEADER_TEXT_COLOR = { light: "#3C3C43", dark: "#E7E7EE" } as const
const REGISTER_ACTIVE_COLOR = { light: "#44AF94", dark: "#44AF94" } as const
const REGISTER_DISABLED_COLOR = { light: "#81818D", dark: "#81818D" } as const
const CATEGORY_LABEL_COLOR = { light: "#666677", dark: "#858591" } as const
const CATEGORY_VALUE_COLOR = { light: "#2A2A37", dark: "#E7E7EE" } as const
const SELECT_BTN_BG = { light: "#EAEAF0", dark: "#2A2A30" } as const
const SELECT_BTN_TEXT = { light: "#81818D", dark: "#C5C8CE" } as const
const DIVIDER_COLOR = { light: "#E5E5EA", dark: "#1F1F21" } as const
const TITLE_COLOR = { light: "#2A2A37", dark: "#E7E7EE" } as const
const TITLE_PLACEHOLDER_COLOR = { light: "#666677", dark: "#858591" } as const
const BODY_PLACEHOLDER_COLOR = { light: "#A5A5AF", dark: "#595960" } as const
const PRIMARY_BAR_COLOR = { light: "#F1F1F3", dark: "#1F1F21" } as const
const TOOLBAR_ICON_COLOR = { light: "#666677", dark: "#F5F6FA" } as const
const TOOLBAR_BORDER_COLOR = { light: "#A5A5AF", dark: "#595960" } as const
const MAX_IMAGES = 5

const BODY_PLACEHOLDER = `식단을 건강하게 관리하고, 고민과 의견을 나눌 수 있도록\n다양한 이야기를 나누는 공간입니다.\n\n이런 글을 남겨보세요\nex) 오늘의 식단 인증, 식단 관리중의 고민사항들...\n\n상대방을 불쾌하게 하거나 배려 없는 의견은 삼가 주세요.\n게시판의 성격과 무관한 글, 타인 비방, 광고성 게시물은 사전 경고 없이 삭제될 수 있습니다.`

interface FreePostEditorProps {
  onClose: () => void
}

export function FreePostEditor({ onClose }: FreePostEditorProps) {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  const [selectedCategory, setSelectedCategory] = useState(
    FREE_POST_CATEGORIES[0].key,
  )
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [votes, setVotes] = useState<VoteData[]>([])
  const [voteSheetOpen, setVoteSheetOpen] = useState(false)
  const [editingVoteIndex, setEditingVoteIndex] = useState<number | null>(null)
  const [confirmExitVisible, setConfirmExitVisible] = useState(false)
  const { createPost } = useCommunityPosts()

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"
    const showSub = Keyboard.addListener(showEvent, () =>
      setIsKeyboardVisible(true),
    )
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setIsKeyboardVisible(false),
    )
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const iconColor = isDark ? TOOLBAR_ICON_COLOR.dark : TOOLBAR_ICON_COLOR.light

  const selectedLabel =
    FREE_POST_CATEGORIES.find((c) => c.key === selectedCategory)?.label ?? ""

  const canSubmit = title.trim().length > 0 && body.trim().length > 0

  const handleOpenCategorySheet = () => {
    Keyboard.dismiss()
    setCategorySheetOpen(true)
  }

  const hasContent =
    title.trim().length > 0 ||
    body.trim().length > 0 ||
    images.length > 0 ||
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
    if (remaining <= 0) return
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
        const next = [...prev]
        next[editingVoteIndex] = data
        return next
      })
    } else {
      setVotes((prev) => [...prev, data])
    }
    setVoteSheetOpen(false)
    setEditingVoteIndex(null)
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    createPost({
      authorName: "나",
      authorRole: "CKD 환자",
      category: selectedCategory,
      imageUri: images.length > 0 ? images[0] : null,
      title,
      description: body,
    })
    onClose()
  }

  const registerColor = canSubmit
    ? isDark
      ? REGISTER_ACTIVE_COLOR.dark
      : REGISTER_ACTIVE_COLOR.light
    : isDark
      ? REGISTER_DISABLED_COLOR.dark
      : REGISTER_DISABLED_COLOR.light

  return (
    <YStack
      flex={1}
      backgroundColor={isDark ? BG_COLOR.dark : BG_COLOR.light}
      paddingTop={insets.top}
    >
      {/* Header */}
      <XStack
        paddingHorizontal={20}
        paddingVertical={12}
        alignItems="center"
        justifyContent="space-between"
      >
        <Pressable
          onPress={handleClose}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Icon
            name="x"
            size={24}
            color={isDark ? HEADER_TEXT_COLOR.dark : HEADER_TEXT_COLOR.light}
          />
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed && canSubmit ? 0.7 : 1,
          })}
        >
          <Text
            fontSize={16}
            fontWeight="600"
            fontFamily="$body"
            color={registerColor}
          >
            등록
          </Text>
        </Pressable>
      </XStack>

      {/* Category Selector */}
      <YStack paddingHorizontal={20} paddingVertical={16} gap={4}>
        <Text
          fontSize={12}
          fontWeight="400"
          fontFamily="$body"
          color={
            isDark ? CATEGORY_LABEL_COLOR.dark : CATEGORY_LABEL_COLOR.light
          }
        >
          카테고리 선택
        </Text>
        <XStack alignItems="center" justifyContent="space-between">
          <Text
            fontSize={16}
            fontWeight="600"
            fontFamily="$body"
            color={
              isDark ? CATEGORY_VALUE_COLOR.dark : CATEGORY_VALUE_COLOR.light
            }
          >
            {selectedLabel}
          </Text>
          <Pressable
            onPress={handleOpenCategorySheet}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: isDark
                ? SELECT_BTN_BG.dark
                : SELECT_BTN_BG.light,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 8,
            })}
          >
            <Text
              fontSize={12}
              lineHeight={14}
              fontWeight="500"
              fontFamily="$body"
              color={isDark ? SELECT_BTN_TEXT.dark : SELECT_BTN_TEXT.light}
            >
              선택
            </Text>
          </Pressable>
        </XStack>
      </YStack>

      {/* Primary color divider bar */}
      <View
        height={12}
        backgroundColor={
          isDark ? PRIMARY_BAR_COLOR.dark : PRIMARY_BAR_COLOR.light
        }
      />

      {/* Title + Body inputs */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack paddingHorizontal={16} paddingTop={20} flex={1}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="제목을 입력해주세요"
              placeholderTextColor={
                isDark
                  ? TITLE_PLACEHOLDER_COLOR.dark
                  : TITLE_PLACEHOLDER_COLOR.light
              }
              style={[
                styles.titleInput,
                {
                  fontWeight: "500",
                  color: isDark ? TITLE_COLOR.dark : TITLE_COLOR.light,
                  borderBottomColor: isDark
                    ? DIVIDER_COLOR.dark
                    : DIVIDER_COLOR.light,
                },
              ]}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={BODY_PLACEHOLDER}
              placeholderTextColor={
                isDark
                  ? BODY_PLACEHOLDER_COLOR.dark
                  : BODY_PLACEHOLDER_COLOR.light
              }
              multiline
              textAlignVertical="top"
              style={[
                styles.bodyInput,
                {
                  color: isDark ? TITLE_COLOR.dark : TITLE_COLOR.light,
                  fontSize: 16,
                  lineHeight: 24,
                  fontWeight: "400",
                },
              ]}
            />
          </YStack>
        </ScrollView>

        {/* Image Strip */}
        {images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              gap: 12,
            }}
            style={{
              flexGrow: 0,
              flexShrink: 0,
            }}
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

        {/* Vote Attachment Cards */}
        {votes.map((_, voteIndex) => (
          <View
            key={voteIndex}
            marginHorizontal={20}
            marginTop={voteIndex === 0 ? 8 : 0}
            marginBottom={8}
          >
            <VoteAttachCard
              onEdit={() => handleEditVote(voteIndex)}
              onRemove={() => handleRemoveVote(voteIndex)}
            />
          </View>
        ))}

        {/* Bottom Toolbar */}
        <XStack
          paddingHorizontal={20}
          paddingVertical={10}
          paddingBottom={isKeyboardVisible ? 10 : 10 + insets.bottom}
          alignItems="center"
          borderTopWidth={StyleSheet.hairlineWidth}
          borderTopColor={
            isDark ? TOOLBAR_BORDER_COLOR.dark : TOOLBAR_BORDER_COLOR.light
          }
          backgroundColor={isDark ? BG_COLOR.dark : BG_COLOR.light}
        >
          <XStack gap={20} flex={1}>
            <Pressable
              onPress={handlePickImages}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Icon name="gallery" size={24} color={iconColor} />
            </Pressable>
            <Pressable
              onPress={handleOpenVoteSheet}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Icon name="vote" size={24} color={iconColor} />
            </Pressable>
            <Pressable
              onPress={() => {
                Keyboard.dismiss()
                console.log("hashtag pressed")
              }}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Icon name="hashtag" size={24} color={iconColor} />
            </Pressable>
          </XStack>
          {isKeyboardVisible && (
            <Pressable
              onPress={() => Keyboard.dismiss()}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Icon name="keyboard" size={24} color={iconColor} />
            </Pressable>
          )}
        </XStack>
      </KeyboardAvoidingView>

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
            <Icon name="x" size={24} color="#FFFFFF" />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirm Exit Modal */}
      <ConfirmExitModal
        visible={confirmExitVisible}
        title={"게시글 작성을\n취소하시겠어요?"}
        description="작성 중인 글은 저장되지 않습니다."
        cancelLabel="유지"
        confirmLabel="작성 취소"
        onCancel={() => setConfirmExitVisible(false)}
        onConfirm={() => {
          setConfirmExitVisible(false)
          onClose()
        }}
      />
    </YStack>
  )
}

const styles = StyleSheet.create({
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bodyInput: {
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 16,
    flex: 1,
    minHeight: 200,
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
