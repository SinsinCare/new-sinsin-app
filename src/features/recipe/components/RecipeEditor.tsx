import { useState } from "react"
import {
  Pressable,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  InteractionManager,
} from "react-native"
import { TextInput } from "@/src/shared/components/AppText"
import {
  V2Box,
  V2HStack,
  V2Text,
  V2VStack,
  useV2Theme,
} from "@/src/design-system-v2"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Icon } from "@/src/shared/components/Icon"
import {
  BlockEditor,
  TagSelector,
} from "@/src/features/recipe/components/editor"
import { useBlockEditor } from "@/src/features/recipe/hooks/useBlockEditor"
import { pickMultipleImages } from "@/src/features/recipe/services/imagePickerService"
import { imageUploadService } from "@/src/features/recipe/services/imageUploadService"
import { recipeCatalogService } from "@/src/features/recipe/services/recipeCatalogService"
import type { ContentBlock } from "@/src/features/recipe/types"
import { CUISINE_TAGS } from "@/src/features/recipe/data/recipeTags"
import { ConfirmExitModal } from "@/src/shared/components/ConfirmExitModal"
import { ContentResponsibilityCheck } from "@/src/features/recipe/components/ContentResponsibilityCheck"
import { useQueryClient } from "@tanstack/react-query"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useTranslation } from "react-i18next"

import { presentError } from "@/src/lib/errorMessage"
import { showSuccessToast } from "@/src/lib/toast"
import {
  AppModal,
  afterModalTransitions,
} from "@/src/shared/components/AppModal"

const MAX_TOTAL_IMAGES = 10
type EditorTarget = "desc" | "ingred" | "steps"

const CUISINE_LABEL_KEYS = {
  한식: "category.cuisineValue.한식",
  중식: "category.cuisineValue.중식",
  일식: "category.cuisineValue.일식",
  양식: "category.cuisineValue.양식",
  샐러드: "category.cuisineValue.샐러드",
  디저트: "category.cuisineValue.디저트",
  음료: "category.cuisineValue.음료",
} as const

interface RecipeEditorProps {
  onClose: () => void
}

async function uploadImageBlocks(
  blocks: ContentBlock[],
): Promise<ContentBlock[]> {
  const uploadedBlocks: ContentBlock[] = []
  for (const block of blocks) {
    if (block.type !== "image" || block.imageUrl) {
      uploadedBlocks.push(block)
      continue
    }
    const uploaded = await imageUploadService.uploadImage(
      block.localUri,
      "recipe",
    )
    uploadedBlocks.push({ ...block, imageUrl: uploaded.imageUrl })
  }
  return uploadedBlocks
}

export function RecipeEditor({ onClose }: RecipeEditorProps) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 24) : insets.bottom

  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")

  const [cuisineTags, setCuisineTags] = useState<string[]>([])

  const descEditor = useBlockEditor()
  const ingredEditor = useBlockEditor()
  const stepsEditor = useBlockEditor()

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [confirmExitVisible, setConfirmExitVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [responsibilityAgreed, setResponsibilityAgreed] = useState(false)

  const totalImageCount =
    descEditor.imageCount + ingredEditor.imageCount + stepsEditor.imageCount
  const imageDisabled = totalImageCount >= MAX_TOTAL_IMAGES

  const canSubmit =
    title.trim().length > 0 &&
    descEditor.hasContent &&
    responsibilityAgreed &&
    !descEditor.hasUploadingImages &&
    !ingredEditor.hasUploadingImages &&
    !stepsEditor.hasUploadingImages

  const hasAnyContent =
    title.trim().length > 0 ||
    summary.trim().length > 0 ||
    descEditor.hasContent ||
    ingredEditor.hasContent ||
    stepsEditor.hasContent ||
    cuisineTags.length > 0

  const handleClose = () => {
    Keyboard.dismiss()
    if (hasAnyContent) {
      setConfirmExitVisible(true)
    } else {
      onClose()
    }
  }

  const handleAddImage = async (target: EditorTarget) => {
    const remaining = MAX_TOTAL_IMAGES - totalImageCount
    if (remaining <= 0) return

    const uris = await pickMultipleImages(remaining)
    if (uris.length === 0) return

    const editor =
      target === "desc"
        ? descEditor
        : target === "ingred"
          ? ingredEditor
          : stepsEditor

    InteractionManager.runAfterInteractions(() => {
      editor.insertImages(uris)
    })
  }

  const toggleTag = (
    list: string[],
    setList: (v: string[]) => void,
    tag: string,
  ) => {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag])
  }

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)
    try {
      const [description, ingredients, cookingSteps] = await Promise.all([
        uploadImageBlocks(descEditor.blocks),
        uploadImageBlocks(ingredEditor.blocks),
        uploadImageBlocks(stepsEditor.blocks),
      ])
      await recipeCatalogService.createRecipe({
        title: title.trim(),
        summary: summary.trim(),
        authorInfo: undefined,
        nutritionTags: [],
        stageTags: [],
        cuisineTags,
        description,
        ingredients,
        cookingSteps,
      })
      await queryClient.invalidateQueries({ queryKey: ["recipes"] })
      // 저장은 끝났다 — 확인을 눌러야 닫히는 대신 닫으면서 알린다.
      onClose()
      showSuccessToast(
        t("recipeEditor.successTitle"),
        t("recipeEditor.successBody"),
      )
    } catch (error) {
      /*
        본문·재료·조리순서의 사진을 먼저 올리고 레시피를 만든다. 그래서 여기 오는
        실패의 절반은 사진 쪽이고(`FOOD_CAMERA_001`·`002`), 그건 사진을 바꾸면 바로
        풀린다 — `인터넷 연결을 확인한 뒤 다시 올려 주세요.` 로 덮어 두면 사용자는
        같은 사진으로 계속 다시 누른다.
      */
      presentError(error, {
        scope: "recipe-create",
        retry: () => void handleSubmit(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const registerColor = canSubmit
    ? colors.primary.primary
    : colors.label.assistive

  const renderSectionHeader = (label: string, target: EditorTarget) => (
    <V2HStack
      align="center"
      justify="space-between"
      style={{ marginBottom: 10 }}
    >
      <V2Text
        color={colors.label.normal}
        style={{ fontSize: 14, lineHeight: 20, fontWeight: "500" }}
      >
        {label}
      </V2Text>
      <Pressable
        onPress={() => handleAddImage(target)}
        disabled={imageDisabled}
        hitSlop={8}
        style={({ pressed }) => [
          styles.imageButton,
          { backgroundColor: colors.fill.alternative },
          pressed && !imageDisabled && { opacity: 0.72 },
          imageDisabled && { opacity: 0.5 },
        ]}
      >
        <Icon
          name="gallery"
          size={18}
          color={imageDisabled ? colors.label.assistive : colors.label.normal}
        />
        <V2Text
          color={imageDisabled ? colors.label.assistive : colors.label.normal}
          lineBreakStrategyIOS="hangul-word"
          style={{ fontSize: 13, lineHeight: 18, fontWeight: "500" }}
        >
          {t("action.addPhoto")}
        </V2Text>
      </Pressable>
    </V2HStack>
  )

  return (
    <V2VStack
      flex={1}
      style={{
        backgroundColor: colors.background.default,
        paddingTop: insets.top,
      }}
    >
      {/* Header */}
      <V2HStack
        paddingHorizontal={20}
        paddingVertical={12}
        align="center"
        justify="space-between"
      >
        <Pressable
          onPress={handleClose}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Icon name="x" size={24} color={colors.label.normal} />
        </Pressable>
        <V2Text
          color={colors.label.normal}
          lineBreakStrategyIOS="hangul-word"
          style={{ fontSize: 16, lineHeight: 22, fontWeight: "500" }}
        >
          {t("recipeEditor.title")}
        </V2Text>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed && canSubmit ? 0.7 : 1,
          })}
        >
          <V2Text
            color={registerColor}
            lineBreakStrategyIOS="hangul-word"
            style={{ fontSize: 16, fontWeight: "600" }}
          >
            {isSubmitting ? t("action.uploading") : t("action.upload")}
          </V2Text>
        </Pressable>
      </V2HStack>

      <KeyboardAwareScrollView
        bounces={false}
        overScrollMode="never"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomInset + 16 }}
        bottomOffset={bottomInset + 24}
        disableScrollOnKeyboardHide
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        {/* Title */}
        <V2VStack paddingHorizontal={16} gap={4} style={{ paddingTop: 20 }}>
          <V2Text
            color={colors.label.neutral}
            lineBreakStrategyIOS="hangul-word"
            style={{ fontSize: 12, fontWeight: "400" }}
          >
            {t("recipeEditor.titleLabel")}
          </V2Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("recipeEditor.titlePlaceholder")}
            placeholderTextColor={colors.label.assistive}
            style={[
              styles.titleInput,
              {
                color: colors.label.normal,
                borderBottomColor: colors.line.normal,
              },
            ]}
          />
        </V2VStack>
        {/* Primary color divider bar */}
        <V2Box style={{ height: 12, backgroundColor: colors.fill.normal }} />
        {/* Summary */}
        <V2VStack paddingHorizontal={16} style={{ paddingTop: 16 }}>
          <V2Text
            color={colors.label.normal}
            lineBreakStrategyIOS="hangul-word"
            style={{
              fontWeight: "500",
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 4,
            }}
          >
            {t("recipeEditor.summaryLabel")}
          </V2Text>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder={t("recipeEditor.summaryPlaceholder")}
            placeholderTextColor={colors.label.assistive}
            multiline
            style={[
              styles.fieldInput,
              {
                color: colors.label.normal,
                borderColor: colors.line.normal,
              },
            ]}
          />
        </V2VStack>

        {/* Tags */}
        <V2VStack paddingHorizontal={16} style={{ paddingTop: 20 }}>
          <TagSelector
            label={t("recipeEditor.cuisineLabel")}
            tags={CUISINE_TAGS}
            selected={cuisineTags}
            onToggle={(tag) => toggleTag(cuisineTags, setCuisineTags, tag)}
            getLabel={(tag) =>
              t(CUISINE_LABEL_KEYS[tag as keyof typeof CUISINE_LABEL_KEYS])
            }
          />
        </V2VStack>

        {/* Description BlockEditor */}
        <V2VStack paddingHorizontal={16} style={{ paddingTop: 20 }}>
          {renderSectionHeader(t("recipeEditor.descriptionLabel"), "desc")}
          <BlockEditor
            blocks={descEditor.blocks}
            placeholder={t("recipeEditor.descriptionPlaceholder")}
            onPreviewImage={setPreviewImage}
            onFocusedIndexChange={(i) => {
              descEditor.setFocusedIndex(i)
            }}
            onCursorPositionChange={descEditor.setCursorPosition}
            onUpdateTextBlock={descEditor.updateTextBlock}
            onDeleteImage={descEditor.deleteImage}
          />
        </V2VStack>

        {/* Ingredients BlockEditor */}
        <V2VStack paddingHorizontal={16} style={{ paddingTop: 20 }}>
          {renderSectionHeader(t("recipeEditor.ingredientsLabel"), "ingred")}
          <BlockEditor
            blocks={ingredEditor.blocks}
            placeholder={t("recipeEditor.ingredientsPlaceholder")}
            onPreviewImage={setPreviewImage}
            onFocusedIndexChange={(i) => {
              ingredEditor.setFocusedIndex(i)
            }}
            onCursorPositionChange={ingredEditor.setCursorPosition}
            onUpdateTextBlock={ingredEditor.updateTextBlock}
            onDeleteImage={ingredEditor.deleteImage}
          />
        </V2VStack>

        {/* Cooking Steps BlockEditor */}
        <V2VStack paddingHorizontal={16} style={{ paddingTop: 20 }}>
          {renderSectionHeader(t("recipeEditor.stepsLabel"), "steps")}
          <BlockEditor
            blocks={stepsEditor.blocks}
            placeholder={t("recipeEditor.stepsPlaceholder")}
            onPreviewImage={setPreviewImage}
            onFocusedIndexChange={(i) => {
              stepsEditor.setFocusedIndex(i)
            }}
            onCursorPositionChange={stepsEditor.setCursorPosition}
            onUpdateTextBlock={stepsEditor.updateTextBlock}
            onDeleteImage={stepsEditor.deleteImage}
          />
        </V2VStack>

        <V2VStack
          paddingHorizontal={16}
          style={{ paddingTop: 20, paddingBottom: 8 }}
        >
          <ContentResponsibilityCheck
            value={responsibilityAgreed}
            onChange={setResponsibilityAgreed}
            disabled={isSubmitting}
          />
        </V2VStack>
      </KeyboardAwareScrollView>

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
            <Icon name="x" size={24} color={colors.static.white} />
          </Pressable>
        </Pressable>
      </AppModal>

      {/* Confirm Exit Modal */}
      <ConfirmExitModal
        surface="recipe_edit"
        hasDraft={hasAnyContent}
        visible={confirmExitVisible}
        title={t("recipeEditor.exitTitle")}
        description={t("recipeEditor.exitBody")}
        cancelLabel={t("action.keepWriting")}
        confirmLabel={t("action.exit")}
        onCancel={() => setConfirmExitVisible(false)}
        onConfirm={() => {
          setConfirmExitVisible(false)
          void afterModalTransitions().then(onClose)
        }}
      />
    </V2VStack>
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
  imageButton: {
    minHeight: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
