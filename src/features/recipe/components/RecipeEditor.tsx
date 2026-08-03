import { useState } from "react"
import {
  TextInput,
  Pressable,
  Modal,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  InteractionManager,
} from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
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
import { tokens } from "@/src/theme/tokens"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useQueryClient } from "@tanstack/react-query"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useTranslation } from "react-i18next"

import { presentError } from "@/src/lib/errorMessage"
import { showSuccessToast } from "@/src/lib/toast"

const BG_COLOR = { light: "#FCFCFC", dark: "#2A2A30" }
const HEADER_TEXT = { light: "#3C3C43", dark: tokens.color.textDark.val }
const REGISTER_ACTIVE = {
  light: tokens.color.sub6.val,
  dark: tokens.color.sub6.val,
}
const REGISTER_DISABLED = { light: "#81818D", dark: "#81818D" }
const DIVIDER = { light: "#E5E5EA", dark: "#1F1F21" }
const TITLE_COLOR = {
  light: tokens.color.textLight.val,
  dark: tokens.color.textDark.val,
}
const PLACEHOLDER = {
  light: tokens.color.textLightSub.val,
  dark: tokens.color.textLightMuted.val,
}
const LABEL_COLOR = { light: "#666677", dark: "#858591" }
const SECTION_TITLE_COLOR = {
  light: tokens.color.textLight.val,
  dark: tokens.color.textDark.val,
}
const INPUT_BORDER_COLOR = {
  light: tokens.color.textLightSub.val,
  dark: "#858591",
}
const SECTION_LABEL = {
  light: tokens.color.textLight.val,
  dark: tokens.color.textDark.val,
}
const PRIMARY_BAR = { light: "#F1F1F3", dark: "#1F1F21" }
const IMAGE_BUTTON_BG = { light: "#F3F4F6", dark: "#3A3A42" }
const IMAGE_BUTTON_TEXT = { light: "#3C3C43", dark: "#F5F6FA" }
const IMAGE_BUTTON_DISABLED = { light: "#A0A3AA", dark: "#858591" }

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
  const scheme = useAppColorScheme()
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
    ? REGISTER_ACTIVE[scheme]
    : REGISTER_DISABLED[scheme]

  const renderSectionHeader = (label: string, target: EditorTarget) => (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      marginBottom={10}
    >
      <Text
        fontSize={14}
        lineHeight={20}
        fontWeight="500"
        fontFamily="$body"
        color={SECTION_LABEL[scheme]}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => handleAddImage(target)}
        disabled={imageDisabled}
        hitSlop={8}
        style={({ pressed }) => [
          styles.imageButton,
          { backgroundColor: IMAGE_BUTTON_BG[scheme] },
          pressed && !imageDisabled && { opacity: 0.72 },
          imageDisabled && { opacity: 0.5 },
        ]}
      >
        <Icon
          name="gallery"
          size={18}
          color={
            imageDisabled
              ? IMAGE_BUTTON_DISABLED[scheme]
              : IMAGE_BUTTON_TEXT[scheme]
          }
        />
        <Text
          fontSize={13}
          lineHeight={18}
          fontWeight="500"
          fontFamily="$body"
          color={
            imageDisabled
              ? IMAGE_BUTTON_DISABLED[scheme]
              : IMAGE_BUTTON_TEXT[scheme]
          }
        >
          {t("action.addPhoto")}
        </Text>
      </Pressable>
    </XStack>
  )

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
        <Text
          fontSize={16}
          lineHeight={22}
          fontWeight="500"
          fontFamily="$body"
          color={HEADER_TEXT[scheme]}
        >
          {t("recipeEditor.title")}
        </Text>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
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
            {isSubmitting ? t("action.uploading") : t("action.upload")}
          </Text>
        </Pressable>
      </XStack>

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
        <YStack paddingHorizontal={16} paddingTop={20} gap={4}>
          <Text
            fontSize={12}
            fontWeight="400"
            fontFamily="$body"
            color={LABEL_COLOR[scheme]}
          >
            {t("recipeEditor.titleLabel")}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("recipeEditor.titlePlaceholder")}
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
            fontWeight="500"
            fontSize={14}
            lineHeight={20}
            fontFamily="$body"
            color={SECTION_TITLE_COLOR[scheme]}
            marginBottom={4}
          >
            {t("recipeEditor.summaryLabel")}
          </Text>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder={t("recipeEditor.summaryPlaceholder")}
            placeholderTextColor={PLACEHOLDER[scheme]}
            multiline
            style={[
              styles.fieldInput,
              {
                color: TITLE_COLOR[scheme],
                borderColor: INPUT_BORDER_COLOR[scheme],
              },
            ]}
          />
        </YStack>

        {/* Tags */}
        <YStack paddingHorizontal={16} paddingTop={20}>
          <TagSelector
            label={t("recipeEditor.cuisineLabel")}
            tags={CUISINE_TAGS}
            selected={cuisineTags}
            onToggle={(tag) => toggleTag(cuisineTags, setCuisineTags, tag)}
            getLabel={(tag) =>
              t(CUISINE_LABEL_KEYS[tag as keyof typeof CUISINE_LABEL_KEYS])
            }
            chipTheme="tertiary"
          />
        </YStack>

        {/* Description BlockEditor */}
        <YStack paddingHorizontal={16} paddingTop={20}>
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
        </YStack>

        {/* Ingredients BlockEditor */}
        <YStack paddingHorizontal={16} paddingTop={20}>
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
        </YStack>

        {/* Cooking Steps BlockEditor */}
        <YStack paddingHorizontal={16} paddingTop={20}>
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
        </YStack>

        <YStack paddingHorizontal={16} paddingTop={20} paddingBottom={8}>
          <ContentResponsibilityCheck
            value={responsibilityAgreed}
            onChange={setResponsibilityAgreed}
            disabled={isSubmitting}
          />
        </YStack>
      </KeyboardAwareScrollView>

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
        title={t("recipeEditor.exitTitle")}
        description={t("recipeEditor.exitBody")}
        cancelLabel={t("action.keepWriting")}
        confirmLabel={t("action.exit")}
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
