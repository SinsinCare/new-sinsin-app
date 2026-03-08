import { useState, useEffect } from "react"
import {
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  useColorScheme,
  StyleSheet,
  Alert,
} from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Icon } from "@/src/shared/components/Icon"
import {
  BlockEditor,
  EditorToolbar,
  TagSelector,
} from "@/src/features/recipe/components/editor"
import { useBlockEditor } from "@/src/features/recipe/hooks/useBlockEditor"
import { pickMultipleImages } from "@/src/features/recipe/services/imagePickerService"
import {
  NUTRITION_TAGS,
  STAGE_TAGS,
  CUISINE_TAGS,
} from "@/src/features/recipe/data/recipeTags"
import { ConfirmExitModal } from "@/src/shared/components/ConfirmExitModal"

const BG_COLOR = { light: "#FCFCFC", dark: "#2A2A30" }
const HEADER_TEXT = { light: "#3C3C43", dark: "#E7E7EE" }
const REGISTER_ACTIVE = { light: "#44AF94", dark: "#44AF94" }
const REGISTER_DISABLED = { light: "#81818D", dark: "#81818D" }
const DIVIDER = { light: "#E5E5EA", dark: "#1F1F21" }
const TITLE_COLOR = { light: "#2A2A37", dark: "#E7E7EE" }
const PLACEHOLDER = { light: "#A5A5AF", dark: "#595960" }
const SECTION_LABEL = { light: "#2A2A37", dark: "#E7E7EE" }
const PRIMARY_BAR = { light: "#F1F1F3", dark: "#1F1F21" }

const MAX_TOTAL_IMAGES = 10

interface RecipeEditorProps {
  onClose: () => void
}

export function RecipeEditor({ onClose }: RecipeEditorProps) {
  const scheme = useColorScheme() ?? "light"
  const insets = useSafeAreaInsets()

  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [authorInfo, setAuthorInfo] = useState("")

  const [nutritionTags, setNutritionTags] = useState<string[]>([])
  const [stageTags, setStageTags] = useState<string[]>([])
  const [cuisineTags, setCuisineTags] = useState<string[]>([])

  const descEditor = useBlockEditor()
  const ingredEditor = useBlockEditor()
  const stepsEditor = useBlockEditor()

  const [activeEditor, setActiveEditor] = useState<"desc" | "ingred" | "steps">(
    "desc",
  )

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [confirmExitVisible, setConfirmExitVisible] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

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

  const totalImageCount =
    descEditor.imageCount + ingredEditor.imageCount + stepsEditor.imageCount
  const imageDisabled = totalImageCount >= MAX_TOTAL_IMAGES

  const canSubmit =
    title.trim().length > 0 &&
    descEditor.hasContent &&
    !descEditor.hasUploadingImages &&
    !ingredEditor.hasUploadingImages &&
    !stepsEditor.hasUploadingImages

  const hasAnyContent =
    title.trim().length > 0 ||
    summary.trim().length > 0 ||
    authorInfo.trim().length > 0 ||
    descEditor.hasContent ||
    ingredEditor.hasContent ||
    stepsEditor.hasContent ||
    nutritionTags.length > 0 ||
    stageTags.length > 0 ||
    cuisineTags.length > 0

  const handleClose = () => {
    Keyboard.dismiss()
    if (hasAnyContent) {
      setConfirmExitVisible(true)
    } else {
      onClose()
    }
  }

  const handleAddImage = async () => {
    Keyboard.dismiss()
    const remaining = MAX_TOTAL_IMAGES - totalImageCount
    if (remaining <= 0) return

    const uris = await pickMultipleImages(remaining)
    if (uris.length === 0) return

    const editor =
      activeEditor === "desc"
        ? descEditor
        : activeEditor === "ingred"
          ? ingredEditor
          : stepsEditor

    for (const uri of uris) {
      editor.insertImage(uri)
    }
  }

  const toggleTag = (
    list: string[],
    setList: (v: string[]) => void,
    tag: string,
  ) => {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag])
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const payload = {
      title: title.trim(),
      summary: summary.trim(),
      authorInfo: authorInfo.trim() || undefined,
      nutritionTags,
      stageTags,
      cuisineTags,
      description: descEditor.blocks,
      ingredients: ingredEditor.blocks,
      cookingSteps: stepsEditor.blocks,
    }
    console.log("Recipe submit:", JSON.stringify(payload, null, 2))
    Alert.alert("레시피 등록", "레시피가 등록되었습니다.", [
      { text: "확인", onPress: onClose },
    ])
  }

  const registerColor = canSubmit
    ? REGISTER_ACTIVE[scheme]
    : REGISTER_DISABLED[scheme]

  return (
    <YStack flex={1} backgroundColor={BG_COLOR[scheme]} paddingTop={insets.top}>
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
          <Icon name="x" size={24} color={HEADER_TEXT[scheme]} />
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <YStack paddingHorizontal={16} paddingTop={20}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="레시피 제목을 입력하세요"
              placeholderTextColor={PLACEHOLDER[scheme]}
              style={[
                styles.titleInput,
                {
                  color: TITLE_COLOR[scheme],
                  borderBottomColor: DIVIDER[scheme],
                },
              ]}
            />
          </YStack>
          {/* Primary color divider bar */}
          <View
            height={12}
            backgroundColor={
              scheme === "dark" ? PRIMARY_BAR.dark : PRIMARY_BAR.light
            }
          />
          {/* Summary */}
          <YStack paddingHorizontal={16} paddingTop={16}>
            <Text
              fontSize={12}
              fontWeight="400"
              fontFamily="$body"
              color={PLACEHOLDER[scheme]}
              marginBottom={4}
            >
              한줄소개
            </Text>
            <TextInput
              value={summary}
              onChangeText={setSummary}
              placeholder="이 레시피의 목적을 작성해주세요"
              placeholderTextColor={PLACEHOLDER[scheme]}
              multiline
              style={[
                styles.fieldInput,
                {
                  color: TITLE_COLOR[scheme],
                  borderColor: DIVIDER[scheme],
                },
              ]}
            />
          </YStack>

          {/* Author Info */}
          <YStack paddingHorizontal={16} paddingTop={16}>
            <Text
              fontSize={12}
              fontWeight="400"
              fontFamily="$body"
              color={PLACEHOLDER[scheme]}
              marginBottom={4}
            >
              작성자 정보 (선택)
            </Text>
            <TextInput
              value={authorInfo}
              onChangeText={setAuthorInfo}
              placeholder="CKD 병기 및 투석 여부"
              placeholderTextColor={PLACEHOLDER[scheme]}
              style={[
                styles.fieldInput,
                {
                  color: TITLE_COLOR[scheme],
                  borderColor: DIVIDER[scheme],
                },
              ]}
            />
          </YStack>

          {/* Tags */}
          <YStack paddingHorizontal={16} paddingTop={20}>
            <TagSelector
              label="영양 기준"
              tags={NUTRITION_TAGS}
              selected={nutritionTags}
              onToggle={(tag) =>
                toggleTag(nutritionTags, setNutritionTags, tag)
              }
              chipTheme="primary"
            />
            <TagSelector
              label="병기별"
              tags={STAGE_TAGS}
              selected={stageTags}
              onToggle={(tag) => toggleTag(stageTags, setStageTags, tag)}
              chipTheme="sub"
            />
            <TagSelector
              label="나라별"
              tags={CUISINE_TAGS}
              selected={cuisineTags}
              onToggle={(tag) => toggleTag(cuisineTags, setCuisineTags, tag)}
              chipTheme="tertiary"
            />
          </YStack>

          {/* Description BlockEditor */}
          <YStack paddingHorizontal={16} paddingTop={20}>
            <Text
              fontSize={14}
              lineHeight={20}
              fontWeight="500"
              fontFamily="$body"
              color={SECTION_LABEL[scheme]}
              marginBottom={10}
            >
              설명작성
            </Text>
            <BlockEditor
              blocks={descEditor.blocks}
              placeholder={`신장 건강을 고려한 저염·저단백·균형 식단 레시피를 나누는 공간입니다.\n\nCKD 환자분들이 일상에서 실천할 수 있는 현실적인 한식·집밥 메뉴를 함께 공유해 주세요.\n\n이런 글을 남겨보세요\nex)\n  • CKD 3기인데 이렇게 먹고 수치가 안정됐어요\n  • 국물 없이 먹는 저염 한식 메인 메뉴 공유합니다\n  • 단백질 20g 이하로 맞춘 한 끼 식단이에요\n  • 명절 음식 이렇게 조절해서 먹었어요\n  • 외식 메뉴를 이렇게 바꿔봤어요\n재료 양, 조리 방법, 간을 줄인 팁 등을 함께 적어주시면 다른 분들께 큰 도움이 됩니다.\n\n게시판 이용 안내\n  • 개인 병기(예: CKD 3a, 3b 등)를 함께 적어주시면 더 도움이 됩니다.\n  • 과도한 단백질·고염·가공식품 중심 식단은 주의가 필요합니다.\n  • 특정 제품 홍보, 광고성 게시물은 허용되지 않습니다.\n  • 타인의 식습관이나 병기 상태를 비난하는 댓글은 삼가 주세요.\n  • 의학적 판단이 필요한 내용은 의료진 상담을 권장합니다.\n게시판의 성격과 무관한 글, 타인 비방, 광고성 게시물은 사전 안내 없이 삭제될 수 있습니다.`}
              onPreviewImage={setPreviewImage}
              onFocusedIndexChange={(i) => {
                descEditor.setFocusedIndex(i)
                setActiveEditor("desc")
              }}
              onCursorPositionChange={descEditor.setCursorPosition}
              onUpdateTextBlock={descEditor.updateTextBlock}
              onDeleteImage={descEditor.deleteImage}
            />
          </YStack>

          {/* Ingredients BlockEditor */}
          <YStack paddingHorizontal={16} paddingTop={20}>
            <Text
              fontSize={14}
              lineHeight={20}
              fontWeight="500"
              fontFamily="$body"
              color={SECTION_LABEL[scheme]}
              marginBottom={10}
            >
              재료입력
            </Text>
            <BlockEditor
              blocks={ingredEditor.blocks}
              placeholder={`① 재료명(여러개 추가할 수 있게)\n자유 입력\n② 용량\ng / mL / 개 / 큰술 / 작은술 선택\n③ 재료 옆에 - 가공 여부 체크\n생식품\n가공식품\n조미료\n외식소스 게시물은 사전 안내 없이 삭제될 수 있습니다.`}
              onPreviewImage={setPreviewImage}
              onFocusedIndexChange={(i) => {
                ingredEditor.setFocusedIndex(i)
                setActiveEditor("ingred")
              }}
              onCursorPositionChange={ingredEditor.setCursorPosition}
              onUpdateTextBlock={ingredEditor.updateTextBlock}
              onDeleteImage={ingredEditor.deleteImage}
            />
          </YStack>

          {/* Cooking Steps BlockEditor */}
          <YStack paddingHorizontal={16} paddingTop={20}>
            <Text
              fontSize={14}
              lineHeight={20}
              fontWeight="500"
              fontFamily="$body"
              color={SECTION_LABEL[scheme]}
              marginBottom={10}
            >
              조리순서
            </Text>
            <BlockEditor
              blocks={stepsEditor.blocks}
              placeholder={`단계별 작성(단계를 추가할 수 있게 구성)\n  • Step 1\n  • Step 2\n  • Step 3\n→ 단계별로 사진을 추가할 수 있게 설정`}
              onPreviewImage={setPreviewImage}
              onFocusedIndexChange={(i) => {
                stepsEditor.setFocusedIndex(i)
                setActiveEditor("steps")
              }}
              onCursorPositionChange={stepsEditor.setCursorPosition}
              onUpdateTextBlock={stepsEditor.updateTextBlock}
              onDeleteImage={stepsEditor.deleteImage}
            />
          </YStack>
        </ScrollView>

        {/* Toolbar */}
        <EditorToolbar
          onAddImage={handleAddImage}
          imageDisabled={imageDisabled}
          isKeyboardVisible={isKeyboardVisible}
        />
      </KeyboardAvoidingView>

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
        title={"레시피 작성을\n취소하시겠어요?"}
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
  fieldInput: {
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
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
