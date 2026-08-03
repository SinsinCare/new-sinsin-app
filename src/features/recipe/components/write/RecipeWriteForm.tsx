/**
 * 레시피 작성 v2 — 계약 §3.5 · §3.6 · §6.1.
 *
 * ## 시안에서 고친 네 가지
 * 1. **조리순서 바텀시트를 없앴다.** 폼 안에 인라인이다(`StepEditor` 머리말 참고).
 * 2. **등록이 왜 꺼졌는지 버튼 위에 적는다.** 활성 조건과 같은 계산에서 나온 문구다.
 * 3. **섹션을 접는다.** 한 번에 하나만 펴서, 스크롤을 하지 않아도 다섯 섹션의 상태
 *    (다 적었어요 / 남았어요 / 선택)가 한 화면에 보인다. 위쪽 진행 표시가 "필수 3/5" 다.
 * 4. **영양이 실시간으로 보인다.** 재료 칸을 고치면 400ms 뒤 `POST /recipes/nutrition/preview`
 *    가 한 번 나가고, 1인분 나트륨·칼륨·인·단백질과 내 남은 양 대비 비율이 뜬다.
 *    **이 갈래의 핵심 가치다** — 작성자가 자기 레시피의 영양을 처음으로 알게 된다.
 *
 * ## 인분(servings)을 재료 섹션에 둔 이유
 * 서버는 전체 영양을 `servings` 로 나눠 1인분을 만든다(계약 §3.5). 그 분모를 기본 정보에
 * 두면 영양 카드와 멀리 떨어져서, "왜 나트륨이 절반이지" 를 알 수 없다. 재료 바로 아래,
 * 영양 카드 바로 위에 둔다.
 *
 * ## 아직 없는 것 (보고에 적었다)
 * - 단계별 사진(`steps[].imageObjectPath`): 계약은 받지만 시안에 없고, 단계마다 사진을
 *   올리면 작성이 무거워진다. 지금은 null 로 보낸다.
 * - `nutritionOverride`: 작성자가 수치를 직접 고치는 경로. 검수 전 카탈로그에서
 *   작성자 보정을 권하는 것이 맞는지 판단이 필요하다.
 */

import { useCallback, useMemo, useState } from "react"
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { ConfirmExitModal } from "@/src/shared/components/ConfirmExitModal"
import { pickMultipleImages } from "@/src/features/recipe/services/imagePickerService"
import { imageUploadService } from "@/src/features/recipe/services/imageUploadService"
import { recipeWriteService } from "@/src/features/recipe/services/recipeWriteService"
import { useNutritionPreview } from "@/src/features/recipe/hooks/useNutritionPreview"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import type { NutrientHeadline } from "@/src/features/recipe/types/recipeWrite"

import { WriteSection } from "./WriteSection"
import { WriteChipGroup } from "./WriteChipGroup"
import { WriteTextField } from "./WriteTextField"
import { IngredientEditor } from "./IngredientEditor"
import { StepEditor } from "./StepEditor"
import { ServingsStepper } from "./ServingsStepper"
import { PhotoPickerRow } from "./PhotoPickerRow"
import { NutritionPreviewCard } from "./NutritionPreviewCard"
import { WriteSubmitBar } from "./WriteSubmitBar"
import {
  createEmptyRecipeWriteForm,
  emptyIngredientRow,
  emptyStepRow,
  evaluateRecipeWriteForm,
  hasAnyRecipeWriteContent,
  isFilledIngredient,
  isFilledStep,
  moveItem,
  nextRowId,
  toCreateRecipeRequest,
  toPreviewRequest,
  type PhotoRow,
  type RecipeWriteFormState,
  type RecipeWriteSectionId,
} from "./writeFormState"
import {
  CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
  MISSING_COPY_KEY,
  NUTRIENT_NAME_KEY,
  NUTRITION_TAG_OPTIONS,
  PROVENANCE_KEY,
  SECTION_STATE_KEY,
  SECTION_TITLE_KEY,
  STAGE_TAG_OPTIONS,
  SUCCESS_UNMATCHED_COPY_KEY,
} from "./writeCopy"
import { unmatchedNames } from "./nutritionPreviewView"

import { presentError } from "@/src/lib/errorMessage"
import { showSuccessToast } from "@/src/lib/toast"

interface RecipeWriteFormProps {
  onClose: () => void
}

export function RecipeWriteForm({ onClose }: RecipeWriteFormProps) {
  const { t } = useTranslation("recipe")
  const s = useSurface()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 16) : insets.bottom

  const [form, setForm] = useState<RecipeWriteFormState>(
    createEmptyRecipeWriteForm,
  )
  // 한 번에 한 섹션만 펴 둔다 — 접힌 머리글이 곧 진행 상황 목록이다.
  const [openSection, setOpenSection] = useState<RecipeWriteSectionId | null>(
    "basic",
  )
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [exitVisible, setExitVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const evaluation = useMemo(() => evaluateRecipeWriteForm(form), [form])
  const previewRequest = useMemo(() => toPreviewRequest(form), [form])
  const preview = useNutritionPreview(previewRequest)

  const patch = useCallback((next: Partial<RecipeWriteFormState>) => {
    setForm((prev) => ({ ...prev, ...next }))
  }, [])

  const toggleInList = useCallback((list: string[], value: string) => {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value]
  }, [])

  /* ── 사진: 고른 즉시 올린다 ── */

  const uploadPhoto = useCallback(async (id: string, localUri: string) => {
    try {
      const uploaded = await imageUploadService.uploadImage(localUri, "recipe")
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.map((photo) =>
          photo.id === id
            ? { ...photo, objectPath: uploaded.objectPath, status: "ready" }
            : photo,
        ),
      }))
    } catch {
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.map((photo) =>
          photo.id === id ? { ...photo, status: "failed" } : photo,
        ),
      }))
    }
  }, [])

  const handleAddPhotos = useCallback(async () => {
    const remaining = RECIPE_WRITE_LIMITS.imageMax - form.photos.length
    if (remaining <= 0) return
    const uris = await pickMultipleImages(remaining)
    if (uris.length === 0) return
    const added: PhotoRow[] = uris.map((localUri) => ({
      id: nextRowId("photo"),
      localUri,
      objectPath: null,
      status: "uploading",
    }))
    setForm((prev) => ({ ...prev, photos: [...prev.photos, ...added] }))
    for (const photo of added) void uploadPhoto(photo.id, photo.localUri)
  }, [form.photos.length, uploadPhoto])

  const handleRetryPhoto = useCallback(
    (id: string) => {
      const target = form.photos.find((photo) => photo.id === id)
      if (!target) return
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.map((photo) =>
          photo.id === id ? { ...photo, status: "uploading" } : photo,
        ),
      }))
      void uploadPhoto(id, target.localUri)
    },
    [form.photos, uploadPhoto],
  )

  /* ── 등록 ── */

  /**
   * 등록. **성공/실패는 `createRecipe` 하나만 결정한다.**
   *
   * 예전 구조(try 하나에 다 넣기)는 저장이 끝난 뒤의 일 — 캐시 무효화나 응답에서
   * 빠진 재료를 읽는 것 — 이 실패해도 "올리지 못했어요" 를 띄웠다. 그러면 사용자는
   * 이미 올라간 레시피를 한 번 더 올린다. 저장 뒤의 실패는 성공을 뒤집지 않는다.
   */
  const handleSubmit = useCallback(async () => {
    if (!evaluation.canSubmit || submitting) return
    setSubmitting(true)
    Keyboard.dismiss()

    let created
    try {
      created = await recipeWriteService.createRecipe(
        toCreateRecipeRequest(form),
      )
    } catch (error) {
      setSubmitting(false)
      // 폴백(`레시피를 올리지 못했어요 / 인터넷 연결을 확인…`)을 넘기지 않는다.
      // 실제로 여기 오는 것은 대부분 400 — 서버가 어느 값이 문제인지 알고 있다.
      presentError(error, { scope: "recipe-write-create" })
      return
    }
    setSubmitting(false)

    void queryClient.invalidateQueries({ queryKey: ["recipes"] })
    // 서버가 §3.6 대로 `unmatchedIngredients` 를 채워 보내면 그것을 말해 준다.
    // 필드가 없어도 등록은 성공이다 — 여기서 넘어져 실패 문구를 띄우지 않는다.
    const missed = Array.isArray(created.nutrition?.unmatchedIngredients)
      ? unmatchedNames(created.nutrition)
      : []
    // 등록은 이미 성공했다 — 확인을 누르게 붙잡지 않고 닫으면서 알린다.
    onClose()
    showSuccessToast(
      t("recipeWrite.result.successTitle"),
      missed.length > 0
        ? `${t("recipeWrite.result.successBody")}\n\n${t(
            SUCCESS_UNMATCHED_COPY_KEY,
            { n: missed.length },
          )}`
        : t("recipeWrite.result.successBody"),
    )
  }, [evaluation.canSubmit, form, onClose, queryClient, submitting, t])

  const handleClose = useCallback(() => {
    Keyboard.dismiss()
    if (hasAnyRecipeWriteContent(form)) setExitVisible(true)
    else onClose()
  }, [form, onClose])

  /* ── 버튼 위 한 줄 ── */

  const statusText = evaluation.photosUploading
    ? t("recipeWrite.submit.uploadingPhotos")
    : evaluation.missing.length > 0
      ? t(MISSING_COPY_KEY[evaluation.missing[0]])
      : t("recipeWrite.submit.ready")

  const sectionProps = (id: RecipeWriteSectionId) => ({
    title: t(SECTION_TITLE_KEY[id]),
    state: evaluation.sectionState[id],
    stateLabel: t(SECTION_STATE_KEY[evaluation.sectionState[id]]),
    expanded: openSection === id,
    onToggle: () => setOpenSection((prev) => (prev === id ? null : id)),
  })

  const filledIngredientCount =
    form.ingredients.filter(isFilledIngredient).length
  const filledStepCount = form.steps.filter(isFilledStep).length

  const nutrientName = useCallback(
    (key: NutrientHeadline["key"]) => t(NUTRIENT_NAME_KEY[key]),
    [t],
  )

  const categoryOption = CATEGORY_OPTIONS.find(
    (option) => option.value === form.category,
  )

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: s.canvas, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Ionicons name="close" size={24} color={s.textStrong} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: s.textStrong }]}>
          {t("recipeWrite.title")}
        </Text>
        <Text style={[styles.progress, { color: s.textMuted }]}>
          {t("recipeWrite.progress", {
            done: evaluation.doneCount,
            total: evaluation.totalCount,
          })}
        </Text>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={scrollEnabled}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        {/* 기본 정보 */}
        <WriteSection
          {...sectionProps("basic")}
          collapsedSummary={form.name.trim() || null}
        >
          <WriteTextField
            label={t("recipeWrite.field.name")}
            required
            value={form.name}
            onChangeText={(name) => patch({ name })}
            placeholder={t("recipeWrite.field.namePlaceholder")}
            maxLength={RECIPE_WRITE_LIMITS.nameMax}
          />
          <WriteTextField
            label={t("recipeWrite.field.summary")}
            value={form.summary}
            onChangeText={(summary) => patch({ summary })}
            placeholder={t("recipeWrite.field.summaryPlaceholder")}
            maxLength={RECIPE_WRITE_LIMITS.summaryMax}
            counterText={t("recipeWrite.field.counter", {
              length: form.summary.length,
              max: RECIPE_WRITE_LIMITS.summaryMax,
            })}
          />
          <PhotoPickerRow
            label={t("recipeWrite.photo.label")}
            photos={form.photos}
            onAdd={() => void handleAddPhotos()}
            onRemove={(id) =>
              patch({ photos: form.photos.filter((photo) => photo.id !== id) })
            }
            onRetry={handleRetryPhoto}
            copy={{
              add: t("recipeWrite.photo.add"),
              uploading: t("recipeWrite.photo.uploading"),
              failed: t("recipeWrite.photo.failed"),
              retry: t("recipeWrite.photo.retry"),
              remove: t("recipeWrite.photo.remove"),
              limitReached: t("recipeWrite.photo.limitReached", {
                max: RECIPE_WRITE_LIMITS.imageMax,
              }),
              optionalMark: t("recipeWrite.field.optionalMark"),
            }}
          />
          <WriteTextField
            label={t("recipeWrite.field.timeMin")}
            labelSuffix={t("recipeWrite.field.optionalMark")}
            value={form.timeMinText}
            onChangeText={(timeMinText) =>
              patch({ timeMinText: timeMinText.replace(/[^0-9]/gu, "") })
            }
            placeholder={t("recipeWrite.field.timeMinPlaceholder")}
            maxLength={4}
            keyboardType="number-pad"
            suffix={t("recipeWrite.field.timeMinUnit")}
          />
          <WriteChipGroup
            label={t("recipeWrite.field.difficulty")}
            hint={t("recipeWrite.field.optionalMark")}
            options={DIFFICULTY_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            selected={form.difficulty ? [form.difficulty] : []}
            onToggle={(value) =>
              patch({ difficulty: form.difficulty === value ? null : value })
            }
          />
        </WriteSection>

        {/* 분류 */}
        <WriteSection
          {...sectionProps("classify")}
          collapsedSummary={categoryOption ? t(categoryOption.labelKey) : null}
        >
          <WriteChipGroup
            label={t("recipeWrite.classify.categoryLabel")}
            hint={t("recipeWrite.classify.categoryHint")}
            options={CATEGORY_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            selected={form.category ? [form.category] : []}
            onToggle={(value) =>
              patch({ category: form.category === value ? "" : value })
            }
          />
          <WriteChipGroup
            label={t("recipeWrite.classify.nutritionLabel")}
            options={NUTRITION_TAG_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            selected={form.nutritionTags}
            onToggle={(value) =>
              patch({ nutritionTags: toggleInList(form.nutritionTags, value) })
            }
          />
          <WriteChipGroup
            label={t("recipeWrite.classify.stageLabel")}
            notice={t("recipeWrite.classify.stageNotice")}
            options={STAGE_TAG_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            selected={form.stageTags}
            onToggle={(value) =>
              patch({ stageTags: toggleInList(form.stageTags, value) })
            }
          />
        </WriteSection>

        {/* 재료 + 인분 + 영양 */}
        <WriteSection
          {...sectionProps("ingredients")}
          collapsedSummary={
            filledIngredientCount > 0
              ? t("curated.ingredientCount", { count: filledIngredientCount })
              : null
          }
        >
          <IngredientEditor
            rows={form.ingredients}
            onChangeRow={(id, rowPatch) =>
              patch({
                ingredients: form.ingredients.map((row) =>
                  row.id === id ? { ...row, ...rowPatch } : row,
                ),
              })
            }
            onRemoveRow={(id) => {
              const rest = form.ingredients.filter((row) => row.id !== id)
              patch({
                ingredients: rest.length > 0 ? rest : [emptyIngredientRow()],
              })
            }}
            onAddRow={() =>
              patch({
                ingredients: [...form.ingredients, emptyIngredientRow()],
              })
            }
            copy={{
              namePlaceholder: t("recipeWrite.ingredient.namePlaceholder"),
              amountPlaceholder: t("recipeWrite.ingredient.amountPlaceholder"),
              add: t("recipeWrite.ingredient.add"),
              removeLabel: (name) =>
                name.trim().length > 0
                  ? t("recipeWrite.ingredient.remove", { name })
                  : t("recipeWrite.ingredient.removeEmpty"),
              limitReached: t("recipeWrite.ingredient.limitReached", {
                max: RECIPE_WRITE_LIMITS.ingredientMax,
              }),
              hintMissing: t("recipeWrite.ingredient.hintMissing"),
              hintUnmeasurable: t("recipeWrite.ingredient.hintUnmeasurable"),
            }}
          />
          <ServingsStepper
            label={t("recipeWrite.field.servings")}
            valueText={t("recipeWrite.field.servingsValue", {
              value: form.servings,
            })}
            note={t("recipeWrite.field.servingsNote")}
            value={form.servings}
            onChange={(servings) => patch({ servings })}
            decreaseLabel={t("recipeWrite.field.servingsDecrease")}
            increaseLabel={t("recipeWrite.field.servingsIncrease")}
          />
          <NutritionPreviewCard
            data={preview.data}
            isEmpty={preview.isEmpty}
            isStale={preview.isStale}
            error={preview.error}
            onRetry={preview.refetch}
            copy={{
              title: t("recipeWrite.nutrition.title"),
              empty: t("recipeWrite.nutrition.empty"),
              calculating: t("recipeWrite.nutrition.calculating"),
              error: t("recipeWrite.nutrition.error"),
              retry: t("recipeWrite.nutrition.retry"),
              headline: (nutrient, amount, percent) =>
                t("recipeWrite.nutrition.headline", {
                  nutrient,
                  amount,
                  percent,
                }),
              headlineNoPercent: (nutrient, amount) =>
                t("recipeWrite.nutrition.headlineNoPercent", {
                  nutrient,
                  amount,
                }),
              percent: (percent) =>
                t("recipeWrite.nutrition.percent", { percent }),
              perServing: t("recipeWrite.nutrition.perServing"),
              noPercent: t("recipeWrite.nutrition.noPercent"),
              proteinNoWeight: t("recipeWrite.nutrition.proteinNoWeight"),
              provenanceBadge: t(
                PROVENANCE_KEY[
                  preview.data?.nutrition.provenance ??
                    "computed_from_ingredients"
                ],
              ),
              provenanceNote: t("recipeWrite.nutrition.provenanceNote"),
              nutrientName,
              unmatchedTitle: (n) =>
                t("recipeWrite.nutrition.unmatchedTitle", { n }),
              unmatchedItem: (name) =>
                t("recipeWrite.nutrition.unmatchedItem", { name }),
              unmatchedNotFound: (name) =>
                t("recipeWrite.nutrition.unmatchedNotFound", { name }),
              unmatchedHelp: t("recipeWrite.nutrition.unmatchedHelp"),
            }}
          />
        </WriteSection>

        {/* 조리 순서 */}
        <WriteSection
          {...sectionProps("steps")}
          collapsedSummary={
            filledStepCount > 0
              ? t("curated.stepCount", { count: filledStepCount })
              : null
          }
        >
          <StepEditor
            rows={form.steps}
            onChangeRow={(id, text) =>
              patch({
                steps: form.steps.map((row) =>
                  row.id === id ? { ...row, text } : row,
                ),
              })
            }
            onRemoveRow={(id) => {
              const rest = form.steps.filter((row) => row.id !== id)
              patch({ steps: rest.length > 0 ? rest : [emptyStepRow()] })
            }}
            onAddRow={() => patch({ steps: [...form.steps, emptyStepRow()] })}
            onReorder={(from, to) =>
              patch({ steps: moveItem(form.steps, from, to) })
            }
            onDragActiveChange={(active) => setScrollEnabled(!active)}
            copy={{
              placeholder: (index) =>
                t("recipeWrite.step.placeholder", { index }),
              add: t("recipeWrite.step.add"),
              removeLabel: (index) => t("recipeWrite.step.remove", { index }),
              limitReached: t("recipeWrite.step.limitReached", {
                max: RECIPE_WRITE_LIMITS.stepMax,
              }),
              dragHint: t("recipeWrite.step.dragHint"),
              dragHandleLabel: (index) =>
                t("recipeWrite.step.dragHandle", { index }),
              moveUp: t("recipeWrite.step.moveUp"),
              moveDown: t("recipeWrite.step.moveDown"),
            }}
          />
        </WriteSection>

        {/* 설명 */}
        <WriteSection {...sectionProps("description")} collapsedSummary={null}>
          <WriteTextField
            label={t("recipeWrite.field.description")}
            labelSuffix={t("recipeWrite.field.optionalMark")}
            value={form.description}
            onChangeText={(description) => patch({ description })}
            placeholder={t("recipeWrite.field.descriptionPlaceholder")}
            maxLength={RECIPE_WRITE_LIMITS.descriptionMax}
            counterText={t("recipeWrite.field.counter", {
              length: form.description.length,
              max: RECIPE_WRITE_LIMITS.descriptionMax,
            })}
            multiline
            minHeight={140}
          />
        </WriteSection>
      </KeyboardAwareScrollView>

      <WriteSubmitBar
        statusText={statusText}
        label={
          submitting
            ? t("recipeWrite.submit.submitting")
            : t("recipeWrite.submit.label")
        }
        onPress={() => void handleSubmit()}
        disabled={!evaluation.canSubmit || submitting}
        paddingBottom={bottomInset + 12}
      />

      <ConfirmExitModal
        visible={exitVisible}
        title={t("recipeWrite.exit.title")}
        description={t("recipeWrite.exit.body")}
        cancelLabel={t("action.keepWriting")}
        confirmLabel={t("action.exit")}
        onCancel={() => setExitVisible(false)}
        onConfirm={() => {
          setExitVisible(false)
          onClose()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: LAYOUT.screenX,
    height: LAYOUT.headerHeight,
    gap: 12,
  },
  headerTitle: { ...TYPE.sheetTitle, fontWeight: "600", flex: 1 },
  progress: { ...TYPE.caption },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: LAYOUT.screenX, paddingBottom: 24 },
})
