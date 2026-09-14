/**
 * 레시피 작성 — 홈 건강기록 6페이지와 **같은 시스템**으로 그린다(2026-09-12 통일).
 *
 * 뼈대는 `RecordPageShell`(큰 제목·안내문·하단 고정 CTA·키보드 도킹·키보드 내리기),
 * 텍스트는 키트 면의 `WriteTextField`, 숫자는 `RecordNumberField`, 고르는 것은
 * `RecordChoices`(음식 종류 하나) / `RecordMultiChoices`(영양 기준 여럿), 오류·상태는
 * `RecordFieldHint`. 치수·타이포는 `recordPageSpec` 한 벌에서만 온다 — 예전 화면은
 * 자체 헤더·4pt 띠·가로 칩 레일·전용 제출 바를 따로 들고 있어 홈과 다른 앱처럼 읽혔다.
 *
 * ## 시안에 없지만 남긴 것 넷
 * 사진 · 조리 시간 · 인분 · 예상 영양. 넷 다 화면 밖에 결과가 있다:
 *  - **사진** — 사용자 레시피 카드/상세의 유일한 이미지 출처다.
 *  - **조리 시간** — 서버가 끼니(아침/점심/저녁)를 이 값으로 분류한다.
 *  - **인분** — 서버가 영양을 이 값으로 **나눈다**. 컨트롤을 빼면 분모가 1 로 굳는다.
 *  - **예상 영양** — 작성자가 자기 레시피의 나트륨·칼륨·인을 처음 보는 자리다.
 * 인분과 영양 카드는 **재료 바로 아래**에 붙여 둔다.
 *
 * ## 버튼 위 상태 한 줄
 * 예전 제출 바의 상태 줄("제목을 적어 주세요" …)은 본문 끝의 `RecordFieldHint` 로
 * 옮겼다. "등록이 왜 회색인가" 를 말하는 자리는 이것 하나뿐이라 없앨 수 없다 —
 * **버튼을 막는 것과 같은 계산**(`evaluation`)에서 나와야 거짓말을 안 한다.
 *
 * ## 조리 순서는 시트
 * 접힌 칸(`StepSummaryField`)이 단계 수와 첫 단계를 말하고, 누르면 `StepSheet` 가 열린다.
 * 동작·훅(`useRecipeWriteScreen`)·API·초안 가드는 재설계 전과 같다.
 */

import { useCallback, useRef } from "react"
import { useNavigation } from "expo-router"
import { StyleSheet, View } from "react-native"
import type { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { usePreventRemove } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"
import { V2Text } from "@/src/design-system-v2"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import { ConfirmExitModal } from "@/src/shared/components/ConfirmExitModal"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import type { NutrientHeadline } from "@/src/features/recipe/types/recipeWrite"

import { RecordPageShell } from "@/src/features/home/components/record/pages/RecordPageShell"
import { RecordNumberField } from "@/src/features/home/components/record/pages/RecordNumberField"
import {
  RecordChoices,
  RecordMultiChoices,
} from "@/src/features/home/components/record/pages/RecordChoices"
import { RecordFieldHint } from "@/src/features/home/components/record/pages/RecordFieldHint"
import {
  FORM,
  PAGE_X,
} from "@/src/features/home/components/record/pages/recordPageSpec"

import { AuthorContextRow } from "@/src/features/recipe/components/write/AuthorContextRow"
import { WriteTextField } from "@/src/features/recipe/components/write/WriteTextField"
import { IngredientEditor } from "@/src/features/recipe/components/write/IngredientEditor"
import { StepSummaryField } from "@/src/features/recipe/components/write/StepSummaryField"
import { StepSheet } from "@/src/features/recipe/components/write/StepSheet"
import { ServingsStepper } from "@/src/features/recipe/components/write/ServingsStepper"
import { PhotoPickerRow } from "@/src/features/recipe/components/write/PhotoPickerRow"
import { NutritionPreviewCard } from "@/src/features/recipe/components/write/NutritionPreviewCard"
import { useRecipeWriteScreen } from "@/src/features/recipe/hooks/useRecipeWriteScreen"
import type { RecipeWriteFormState } from "@/src/features/recipe/components/write/writeFormState"
import {
  CATEGORY_OPTIONS,
  MISSING_COPY_KEY,
  NUTRIENT_NAME_KEY,
  NUTRITION_TAG_OPTIONS,
  PROVENANCE_KEY,
  SUCCESS_UNMATCHED_COPY_KEY,
} from "@/src/features/recipe/components/write/writeCopy"

import { presentError } from "@/src/lib/errorMessage"
import { showSuccessToast } from "@/src/lib/toast"

interface RecipeWriteScreenProps {
  onClose: () => void
  /**
   * 주면 **수정** 화면이 된다(계약 §3.8). 화면 구조·검증·제출은 작성과 같고
   * 보내는 곳만 `PUT` 으로 바뀐다 — 두 화면을 따로 만들면 상한과 문구가 갈라진다.
   */
  recipeId?: number
  /** 수정일 때 폼 초기값(`recipeDetailToWriteForm`). */
  initialForm?: RecipeWriteFormState
}

export function RecipeWriteScreen({
  onClose,
  recipeId,
  initialForm,
}: RecipeWriteScreenProps) {
  /*
    네임스페이스는 `recipe` 하나만 든다. 배열로 들면 `tests/i18nKeyExistence.test.ts`
    의 스캐너가 이 파일의 네임스페이스를 특정하지 못해 키 오타를 잡아 주지 못한다.
  */
  const { t } = useTranslation("recipe")
  const s = useSurface()
  const timeMinRef = useRef<TextInput>(null)

  /*
    초안 가드(아래 `usePreventRemove`)를 통과시키는 깃발. 거기서 선언하면 등록 성공
    콜백(`onSubmitted`)이 자기보다 뒤에 선언된 것을 붙잡게 되므로 여기 둔다.
  */
  const navigation = useNavigation()
  const allowExitRef = useRef(false)

  const screen = useRecipeWriteScreen({
    recipeId,
    initialForm,
    onSubmitted: ({ unmatchedCount }) => {
      // 등록은 이미 성공했다 — 확인을 누르게 붙잡지 않고 닫으면서 알린다.
      // 초안 가드도 통과시킨다: 올린 레시피는 두고 나갈 초안이 아니다.
      allowExitRef.current = true
      onClose()
      showSuccessToast(
        // 수정인데 "올렸어요" 라고 하면 거짓이다. 본문(빠진 재료 안내)은 양쪽 같다.
        recipeId === undefined
          ? t("recipeWrite.result.successTitle")
          : t("recipeWrite.editSubmitted"),
        unmatchedCount > 0
          ? `${t("recipeWrite.result.successBody")}\n\n${t(
              SUCCESS_UNMATCHED_COPY_KEY,
              { n: unmatchedCount },
            )}`
          : t("recipeWrite.result.successBody"),
      )
    },
    onSubmitFailed: (error) =>
      presentError(error, {
        scope:
          recipeId === undefined
            ? "recipe-write-create"
            : "recipe-write-update",
      }),
  })

  const { form, evaluation, preview, stepSummary } = screen

  /*
    버튼 위 한 줄. **버튼을 막는 것과 같은 계산에서 나와야** 거짓말을 안 한다.
    순서: 사진 업로드 → 올리다 실패한 사진 → 못 적은 필수 → 범위 오류 → 준비됨.
    필수 미입력이 범위 오류보다 급하다(아직 못 적은 것이 먼저다).
  */
  const statusText = evaluation.photosUploading
    ? t("recipeWrite.submit.uploadingPhotos")
    : evaluation.photosFailed
      ? t("recipeWrite.submit.photoFailed")
      : evaluation.missing.length > 0
        ? t(MISSING_COPY_KEY[evaluation.missing[0]])
        : evaluation.timeMinOutOfRange
          ? t("recipeWrite.field.timeMinRange")
          : t("recipeWrite.submit.ready")
  const statusIsError = evaluation.photosFailed || evaluation.timeMinOutOfRange

  const nutrientName = useCallback(
    (key: NutrientHeadline["key"]) => t(NUTRIENT_NAME_KEY[key]),
    [t],
  )

  const handleBack = useCallback(
    () => screen.requestClose(onClose),
    [onClose, screen],
  )

  /*
    **안드로이드 하드웨어 백**은 헤더의 ‹ 를 거치지 않는다. `app/(write)/_layout.tsx` 의
    `gestureEnabled: false` 는 iOS 전용이라 안드로이드에서는 백 한 번에 초안이 확인 없이
    사라졌다 — 그래서 화면이 직접 막는다. 조건을 `hasDraft` 로 두는 것이 요점이다.

    `allowExitRef` — 화면 **스스로** 나가는 길(확인창의 나가기 · 등록 성공)은 통과시킨다.
    가드는 잡아 둔 동작을 그대로 다시 던진다(`navigation.dispatch(data.action)` —
    다시 던진 동작은 두 번 잡히지 않는다). `FreePostEditor` 가 같은 모양이다.
  */
  usePreventRemove(screen.hasDraft, ({ data }) => {
    if (allowExitRef.current) {
      navigation.dispatch(data.action)
      return
    }
    screen.setExitVisible(true)
  })

  return (
    <>
      <RecordPageShell
        navigationTitle={t("recipeWrite.navigationTitle")}
        title={t("recipeWrite.title")}
        intro={t("recipeWrite.intro")}
        onBack={handleBack}
        ctaLabel={t("recipeWrite.submit.label")}
        ctaLoading={screen.submitting}
        ctaDisabled={!evaluation.canSubmit}
        onCtaPress={() => void screen.submit()}
      >
        <View style={styles.content}>
          {/* ── 기본 정보 ── */}
          <WriteTextField
            label={t("recipeWrite.field.name")}
            required
            clearable
            clearAccessibilityLabel={t("action.clear")}
            value={form.name}
            onChangeText={(name) => screen.patch({ name })}
            placeholder={t("recipeWrite.field.namePlaceholder")}
            maxLength={RECIPE_WRITE_LIMITS.nameMax}
            counterText={t("recipeWrite.field.counter", {
              length: form.name.length,
              max: RECIPE_WRITE_LIMITS.nameMax,
            })}
          />
          <WriteTextField
            label={t("recipeWrite.field.summary")}
            required
            clearable
            clearAccessibilityLabel={t("action.clear")}
            value={form.summary}
            onChangeText={(summary) => screen.patch({ summary })}
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
            onAdd={() => void screen.photos.add()}
            onRemove={screen.photos.remove}
            onRetry={screen.photos.retry}
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

          {/* ── 조리 시간(선택) ── */}
          <View style={styles.group}>
            <View style={styles.labelRow}>
              <V2Text style={styles.label} color={s.textStrong}>
                {t("recipeWrite.field.timeMin")}
              </V2Text>
              <V2Text style={styles.hint} color={s.text}>
                {t("recipeWrite.field.optionalMark")}
              </V2Text>
            </View>
            <RecordNumberField
              inputRef={timeMinRef}
              label={t("recipeWrite.field.timeMin")}
              unit={t("recipeWrite.field.timeMinUnit")}
              value={form.timeMinText}
              onChangeText={(timeMinText) =>
                screen.patch({
                  timeMinText: timeMinText.replace(/[^0-9]/gu, ""),
                })
              }
              placeholder={t("recipeWrite.field.timeMinPlaceholder")}
              maxLength={4}
              keyboardType="number-pad"
              invalid={evaluation.timeMinOutOfRange}
            />
            {evaluation.timeMinOutOfRange ? (
              <RecordFieldHint error>
                {t("recipeWrite.field.timeMinRange")}
              </RecordFieldHint>
            ) : null}
          </View>

          {/* ── 분류 ── */}
          {/*
            영양 기준에도 "검색에만 쓴다" 안내가 붙는다. 서버의 `CLINICAL_TAG_TOKENS` 는
            `저염`·`저단백`·`저칼륨`·`저인`·`고열량` 도 걸러 내므로 여기서 고른 태그도
            카드에 안 나온다. 음식 종류(한식…)는 걸러지지 않으므로 그쪽에는 붙이지 않는다.
          */}
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("recipeWrite.classify.nutritionLabel")}
            </V2Text>
            <V2Text style={styles.hint} color={s.text}>
              {t("recipeWrite.classify.searchOnlyNotice")}
            </V2Text>
            <RecordMultiChoices
              values={form.nutritionTags}
              onToggle={(value) => screen.toggleTag("nutritionTags", value)}
              options={NUTRITION_TAG_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
            />
          </View>
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("recipeWrite.classify.categoryLabel")}
              <V2Text color={s.brand}> *</V2Text>
            </V2Text>
            <V2Text style={styles.hint} color={s.text}>
              {t("recipeWrite.classify.categoryHint")}
            </V2Text>
            <RecordChoices
              value={form.category.length > 0 ? form.category : null}
              onChange={screen.selectCategory}
              options={CATEGORY_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
            />
          </View>
          {/*
            프로필에서 붙일 것이 하나도 없으면(병기 미등록 · CKD 1·2기 · 투석 아님 ·
            동반 질환 없음) **아예 안 그린다** — 켜도 아무 태그가 안 붙는 컨트롤은
            없는 것보다 나쁘다. 문구는 `labelKey` 를 거친다(값과 문구는 다른 축).
            보간 이름이 `context` 가 아닌 이유: i18next 가 그 이름을 예약해 둔다.
          */}
          {screen.authorContext.tags.length > 0 ? (
            <AuthorContextRow
              label={t("recipeWrite.authorContext.label", {
                tags: screen.authorContext.tags
                  .map((tag) => t(tag.labelKey))
                  .join(" · "),
              })}
              notice={t("recipeWrite.classify.searchOnlyNotice")}
              selected={screen.authorContext.applied}
              onToggle={screen.authorContext.toggle}
            />
          ) : null}

          {/* ── 재료 · 인분 · 영양 · 조리 순서 ── */}
          <IngredientEditor
            rows={form.ingredients}
            onChangeRow={screen.ingredients.change}
            onRemoveRow={screen.ingredients.remove}
            onAddRow={screen.ingredients.add}
            copy={{
              label: t("recipeWrite.ingredient.label"),
              namePlaceholder: t("recipeWrite.ingredient.namePlaceholder"),
              unitPlaceholder: t("recipeWrite.ingredient.unitPlaceholder"),
              countPlaceholder: t("recipeWrite.ingredient.countPlaceholder"),
              unitLabel: t("recipeWrite.ingredient.unitLabel"),
              countLabel: t("recipeWrite.ingredient.countLabel"),
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
            onChange={(servings) => screen.patch({ servings })}
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
          <StepSummaryField
            label={t("recipeWrite.step.fieldLabel")}
            required
            placeholder={t("recipeWrite.step.fieldPlaceholder")}
            summary={
              stepSummary.count > 0
                ? t("recipeWrite.step.fieldSummary", {
                    count: stepSummary.count,
                  })
                : null
            }
            detail={stepSummary.firstText}
            onPress={() => screen.setStepSheetVisible(true)}
            accessibilityLabel={t("recipeWrite.step.fieldLabel")}
          />

          {/* ── 설명(선택) ── */}
          <WriteTextField
            label={t("recipeWrite.field.description")}
            labelSuffix={t("recipeWrite.field.optionalMark")}
            value={form.description}
            onChangeText={(description) => screen.patch({ description })}
            placeholder={t("recipeWrite.field.descriptionPlaceholder")}
            maxLength={RECIPE_WRITE_LIMITS.descriptionMax}
            counterText={t("recipeWrite.field.counter", {
              length: form.description.length,
              max: RECIPE_WRITE_LIMITS.descriptionMax,
            })}
            multiline
          />

          {/* 버튼 위 상태 한 줄 — 등록이 왜 막혀 있는지 말하는 유일한 자리. */}
          <RecordFieldHint error={statusIsError}>{statusText}</RecordFieldHint>
        </View>
      </RecordPageShell>

      <ConfirmExitModal
        surface="recipe_write"
        hasDraft={screen.hasDraft}
        visible={screen.exitVisible}
        title={t("recipeWrite.exit.title")}
        description={t("recipeWrite.exit.body")}
        cancelLabel={t("action.keepWriting")}
        confirmLabel={t("action.exit")}
        onCancel={() => screen.setExitVisible(false)}
        onConfirm={() => {
          /*
            나가기는 **가드를 내린 뒤** 실행한다 — `afterModalTransitions()` 로 모달
            dismiss 전이와 화면 pop 이 겹치지 않게 한다(iOS 에서 두 전환이 겹치면 앱
            전체 터치가 죽는 계열의 사고가 있었다; `appModalGate` 머리말).
          */
          allowExitRef.current = true
          screen.setExitVisible(false)
          void afterModalTransitions().then(onClose)
        }}
      />

      {/* 항상 그린다. `V2BottomSheet` 이 자기 닫힘 애니메이션을 끝까지 보여 주려고
          마운트 수명을 스스로 들기 때문에, 조건부로 감싸면 닫을 때 툭 사라진다. */}
      <StepSheet
        visible={screen.stepSheetVisible}
        onClose={() => screen.setStepSheetVisible(false)}
        rows={form.steps}
        onChangeRow={screen.steps.change}
        onAddRow={screen.steps.add}
        onRemoveRow={screen.steps.remove}
        onReorder={screen.steps.reorder}
        copy={{
          title: t("recipeWrite.step.sheetTitle"),
          confirm: t("recipeWrite.step.sheetConfirm"),
          placeholder: (index) => t("recipeWrite.step.placeholder", { index }),
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
    </>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: PAGE_X, gap: FORM.sectionGap },
  group: { gap: FORM.labelGap },
  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: FORM.labelGap,
  },
  label: FORM.label,
  hint: FORM.hint,
})
