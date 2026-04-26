import { useState, useEffect } from "react"
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  useColorScheme,
  StyleSheet,
  Alert,
} from "react-native"
import { YStack, XStack, Text, View, ScrollView } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Icon } from "@/src/shared/components/Icon"
import { PostCategorySheet } from "@/src/features/recipe/components/PostCategorySheet"
import { FREE_POST_CATEGORIES } from "@/src/features/recipe/data/freePostCategories"
import { usePostDetail } from "@/src/features/recipe/hooks/usePostDetail"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { LoadingScreen } from "@/src/shared/components"
import { ConfirmExitModal } from "@/src/shared/components/ConfirmExitModal"
import { tokens } from "@/src/theme/tokens"

const BG_COLOR = { light: tokens.color.offWhite.val, dark: "#2A2A30" } as const
const HEADER_TEXT_COLOR = { light: "#3C3C43", dark: tokens.color.textDark.val } as const
const REGISTER_ACTIVE_COLOR = { light: "#44AF94", dark: "#44AF94" } as const
const REGISTER_DISABLED_COLOR = { light: "#81818D", dark: "#81818D" } as const
const CATEGORY_LABEL_COLOR = { light: "#666677", dark: "#858591" } as const
const CATEGORY_VALUE_COLOR = { light: tokens.color.textLight.val, dark: tokens.color.textDark.val } as const
const SELECT_BTN_BG = { light: tokens.color.borderLight.val, dark: "#2A2A30" } as const
const SELECT_BTN_TEXT = { light: "#81818D", dark: "#C5C8CE" } as const
const DIVIDER_COLOR = { light: "#E5E5EA", dark: tokens.color.appBgDark.val } as const
const TITLE_COLOR = { light: tokens.color.textLight.val, dark: tokens.color.textDark.val } as const
const TITLE_PLACEHOLDER_COLOR = { light: "#666677", dark: "#858591" } as const
const BODY_PLACEHOLDER_COLOR = { light: tokens.color.textLightSub.val, dark: tokens.color.textLightMuted.val } as const
const PRIMARY_BAR_COLOR = { light: "#F1F1F3", dark: tokens.color.appBgDark.val } as const
const TOOLBAR_ICON_COLOR = { light: "#666677", dark: "#F5F6FA" } as const
const TOOLBAR_BORDER_COLOR = { light: tokens.color.textLightSub.val, dark: tokens.color.textLightMuted.val } as const

export default function FreePostEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  const { post, isLoading } = usePostDetail(id!)
  const { updatePost, isUpdating } = useCommunityPosts()

  const [selectedCategory, setSelectedCategory] = useState("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [confirmExitVisible, setConfirmExitVisible] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (post && !initialized) {
      setSelectedCategory(post.category)
      setTitle(post.title)
      setBody(post.description)
      setInitialized(true)
    }
  }, [post, initialized])

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true))
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false))
    return () => { showSub.remove(); hideSub.remove() }
  }, [])

  if (isLoading || !post) {
    return <LoadingScreen message="게시물을 불러오는 중..." />
  }

  const canSubmit = title.trim().length > 0 && body.trim().length > 0

  const hasChanges =
    title !== post.title ||
    body !== post.description ||
    selectedCategory !== post.category

  const handleClose = () => {
    Keyboard.dismiss()
    if (hasChanges) {
      setConfirmExitVisible(true)
    } else {
      router.back()
    }
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    updatePost(
      {
        id: post.id,
        category: selectedCategory,
        title: title.trim(),
        description: body.trim(),
      },
      {
        onSuccess: () => router.back(),
        onError: () => Alert.alert("오류", "게시글 수정에 실패했습니다."),
      },
    )
  }

  const selectedLabel =
    FREE_POST_CATEGORIES.find((c) => c.key === selectedCategory)?.label ?? ""

  const registerColor = canSubmit
    ? isDark ? REGISTER_ACTIVE_COLOR.dark : REGISTER_ACTIVE_COLOR.light
    : isDark ? REGISTER_DISABLED_COLOR.dark : REGISTER_DISABLED_COLOR.light

  const iconColor = isDark ? TOOLBAR_ICON_COLOR.dark : TOOLBAR_ICON_COLOR.light

  return (
    <YStack flex={1} backgroundColor={isDark ? BG_COLOR.dark : BG_COLOR.light} paddingTop={insets.top}>
      {/* Header */}
      <XStack paddingHorizontal={20} paddingVertical={12} alignItems="center" justifyContent="space-between">
        <Pressable onPress={handleClose} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Icon name="x" size={24} color={isDark ? HEADER_TEXT_COLOR.dark : HEADER_TEXT_COLOR.light} />
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || isUpdating}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed && canSubmit ? 0.7 : 1 })}
        >
          <Text fontSize={16} fontWeight="600" fontFamily="$body" color={registerColor}>
            {isUpdating ? "수정 중..." : "수정"}
          </Text>
        </Pressable>
      </XStack>

      {/* Category Selector */}
      <YStack paddingHorizontal={20} paddingVertical={16} gap={4}>
        <Text fontSize={12} fontWeight="400" fontFamily="$body" color={isDark ? CATEGORY_LABEL_COLOR.dark : CATEGORY_LABEL_COLOR.light}>
          카테고리 선택
        </Text>
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize={16} fontWeight="600" fontFamily="$body" color={isDark ? CATEGORY_VALUE_COLOR.dark : CATEGORY_VALUE_COLOR.light}>
            {selectedLabel}
          </Text>
          <Pressable
            onPress={() => { Keyboard.dismiss(); setCategorySheetOpen(true) }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: isDark ? SELECT_BTN_BG.dark : SELECT_BTN_BG.light,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 8,
            })}
          >
            <Text fontSize={12} lineHeight={14} fontWeight="500" fontFamily="$body" color={isDark ? SELECT_BTN_TEXT.dark : SELECT_BTN_TEXT.light}>
              선택
            </Text>
          </Pressable>
        </XStack>
      </YStack>

      <View height={12} backgroundColor={isDark ? PRIMARY_BAR_COLOR.dark : PRIMARY_BAR_COLOR.light} />

      {/* Title + Body */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <YStack paddingHorizontal={16} paddingTop={20} flex={1}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="제목을 입력해주세요"
              placeholderTextColor={isDark ? TITLE_PLACEHOLDER_COLOR.dark : TITLE_PLACEHOLDER_COLOR.light}
              style={[
                styles.titleInput,
                {
                  fontWeight: "500",
                  color: isDark ? TITLE_COLOR.dark : TITLE_COLOR.light,
                  borderBottomColor: isDark ? DIVIDER_COLOR.dark : DIVIDER_COLOR.light,
                },
              ]}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="내용을 입력해주세요"
              placeholderTextColor={isDark ? BODY_PLACEHOLDER_COLOR.dark : BODY_PLACEHOLDER_COLOR.light}
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

        {/* Bottom Toolbar */}
        <XStack
          paddingHorizontal={20}
          paddingVertical={10}
          paddingBottom={isKeyboardVisible ? 10 : 10 + insets.bottom}
          alignItems="center"
          style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? TOOLBAR_BORDER_COLOR.dark : TOOLBAR_BORDER_COLOR.light }}
          backgroundColor={isDark ? BG_COLOR.dark : BG_COLOR.light}
        >
          <XStack gap={20} flex={1}>
            <Pressable hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Icon name="gallery" size={24} color={iconColor} />
            </Pressable>
          </XStack>
          {isKeyboardVisible && (
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Icon name="keyboard" size={24} color={iconColor} />
            </Pressable>
          )}
        </XStack>
      </KeyboardAvoidingView>

      <PostCategorySheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        categories={FREE_POST_CATEGORIES}
        selectedKey={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <ConfirmExitModal
        visible={confirmExitVisible}
        title={"게시글 수정을\n취소하시겠어요?"}
        description="수정한 내용은 저장되지 않습니다."
        cancelLabel="유지"
        confirmLabel="수정 취소"
        onCancel={() => setConfirmExitVisible(false)}
        onConfirm={() => { setConfirmExitVisible(false); router.back() }}
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
})
