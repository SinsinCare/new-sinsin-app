/**
 * 레시피 작성 — 시안 `홈_레시피 작성`(2026-08) 의 구현.
 *
 * ## 아코디언을 걷어냈다
 * 이전 판은 다섯 섹션을 접어 두고 한 번에 하나만 폈다. 접힌 머리글이 곧 진행 목록이라는
 * 발상이었는데, 실제로는 **폼 하나를 다섯 번 여는 화면**이 됐다 — 재료를 적다가 분류를
 * 고치려면 재료가 접히고, 돌아오면 스크롤 위치를 잃는다.
 *
 * 지금은 평면 스크롤이고, 화면을 가르는 것은 **가로 전체를 지나는 4pt 띠**(`s.band`)다.
 * 띠는 선이 아니라 여백이라 "여기서 성격이 바뀐다" 만 말하고 아무것도 숨기지 않는다.
 * 시안 실측: 띠 4pt, 섹션 세로 여백 24, 가로 여백 20(= `LAYOUT.screenX`).
 *
 * ## 대신 잃은 것을 어디서 갚는가
 * 아코디언과 함께 헤더의 `필수 n/5` 도 사라졌다. 그러면 "등록이 왜 회색인가" 를 말하는
 * 자리가 하단 바 한 곳만 남는다 — `WriteSubmitBar` 의 상태 줄을 **시안에 없어도 유지하는**
 * 이유가 그것이다(그 파일 머리말 참고).
 *
 * ## 시안에 없지만 남긴 것 넷
 * 사진 · 조리 시간 · 인분 · 예상 영양. 시안은 작성 화면 한 장만 그렸고 이 넷은 그 장에
 * 없었지만, 넷 다 화면 밖에 결과가 있다:
 *  - **사진** — 사용자 레시피 카드/상세의 유일한 이미지 출처다. 빼면 그 자리가 영원히 빈다.
 *  - **조리 시간** — 서버가 끼니(아침/점심/저녁)를 이 값으로 분류한다. 빼면 홈 레일에서 빠진다.
 *  - **인분** — 서버가 영양을 이 값으로 **나눈다**. 컨트롤을 빼면 분모가 1 로 굳는다.
 *  - **예상 영양** — 작성자가 자기 레시피의 나트륨·칼륨·인을 처음 보는 자리다.
 * 인분과 영양 카드는 **재료 바로 아래**에 붙여 둔다. 분모와 결과가 떨어져 있으면
 * "왜 나트륨이 절반이지" 를 알 수 없다.
 *
 * 반대로 **난이도는 뺐다** — 상세의 메타 한 줄에만 쓰이는 자유 문자열이고 시안에도 없다.
 *
 * ## 조리 순서가 다시 시트로 간 이유
 * 이전 판은 시트를 지우고 인라인으로 폈다. 근거는 "접으면 무엇을 올리는지 못 본다" 였고
 * 그 자체는 맞다. 그래서 시안의 시트를 되살리되 **접힌 칸이 내용을 말하게** 했다 —
 * `조리 순서 4단계` + 첫 단계 한 줄(`StepSummaryField`). 시안의 "조리 순서가 입력되었습니다"
 * 는 단계 수도 내용도 없어서 원래의 결함을 그대로 되살린다.
 */

import { useCallback, useRef, useState } from "react"
import { useNavigation } from "expo-router"
import { Platform, StyleSheet, View, Pressable } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { usePreventRemove } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import { ConfirmExitModal } from "@/src/shared/components/ConfirmExitModal"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import type { NutrientHeadline } from "@/src/features/recipe/types/recipeWrite"

import { AuthorContextRow } from "@/src/features/recipe/components/write/AuthorContextRow"
import { WriteChipRail } from "@/src/features/recipe/components/write/WriteChipRail"
import { WriteTextField } from "@/src/features/recipe/components/write/WriteTextField"
import { IngredientEditor } from "@/src/features/recipe/components/write/IngredientEditor"
import { StepSummaryField } from "@/src/features/recipe/components/write/StepSummaryField"
import { StepSheet } from "@/src/features/recipe/components/write/StepSheet"
import { ServingsStepper } from "@/src/features/recipe/components/write/ServingsStepper"
import { PhotoPickerRow } from "@/src/features/recipe/components/write/PhotoPickerRow"
import { NutritionPreviewCard } from "@/src/features/recipe/components/write/NutritionPreviewCard"
import { WriteSubmitBar } from "@/src/features/recipe/components/write/WriteSubmitBar"
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

/** 시안 실측: 설명 입력 335 × 186. */
const DESCRIPTION_MIN_HEIGHT = 186

/**
 * 하단 바를 재기 전에 스크롤이 확보해 둘 여백. 첫 프레임에서 마지막 칸이 바에
 * 가려지는 것만 막으면 되므로 넉넉한 값 하나면 된다 — 실측이 오면 그것으로 바뀐다.
 */
const SUBMIT_BAR_FALLBACK = 140

interface RecipeWriteScreenProps {
  onClose: () => void
  /**
   * 주면 **수정** 화면이 된다(계약 §3.8). 화면 구조·검증·제출 바는 작성과 같고
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
    네임스페이스는 `recipe` 하나만 든다. 뒤로·지우기 같은 일반 동사는 `common` 에도
    있지만, 배열(`useTranslation(["recipe","common"])`)로 들면 `tests/i18nKeyExistence.test.ts`
    의 스캐너가 이 파일의 네임스페이스를 특정하지 못해 **키 오타를 잡아 주지 못한다.**
    문구 두 개를 `recipe.action.*` 에 두는 값보다 그 보호막이 크다.
  */
  const { t } = useTranslation("recipe")
  const s = useSurface()
  const insets = useSafeAreaInsets()
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 16) : insets.bottom

  /**
   * 하단 바는 스크롤 **위에 뜬다**(시안의 그라데이션 페이드가 값을 하려면 본문이 그
   * 아래로 지나가야 한다). 그래서 본문 끝 여백은 바의 실제 높이여야 하는데, 그 높이는
   * 상태 줄이 한 줄이냐 두 줄이냐·safe-area 가 얼마냐에 따라 달라진다. 숫자를 적어 두면
   * 기기마다 어긋나므로 **재서 쓴다.**
   */
  const [submitBarHeight, setSubmitBarHeight] = useState(SUBMIT_BAR_FALLBACK)

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
      // 초안 가드도 통과시킨다: 올린 레시피는 두고 나갈 초안이 아니다(아래 머리말).
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
        scope: recipeId === undefined ? "recipe-write-create" : "recipe-write-update",
      }),
  })

  const { form, evaluation, preview, stepSummary } = screen

  /*
    버튼 위 한 줄. **버튼을 막는 것과 같은 계산에서 나와야** 거짓말을 안 한다.
    조리 시간이 범위 밖일 때가 늦게 추가됐는데, 그 갈래를 빠뜨리면 9999 를 적은
    사람에게 "이제 등록할 수 있어요" 라고 적힌 채 버튼만 꺼진 막다른 길이 생긴다 —
    이 줄이 존재하는 이유가 정확히 그 결함이었다.

    순서: 사진 업로드 → 올리다 실패한 사진 → 못 적은 필수 → 범위 오류 → 준비됨.
    필수 미입력이 범위 오류보다 급하다(아직 못 적은 것이 먼저다).
  */
  const statusText = evaluation.photosUploading
    ? t("recipeWrite.submit.uploadingPhotos")
    : /*
        올리다 **실패한** 사진이 남아 있으면 등록을 막는다(`writeFormState` 의
        `photosFailed` 머리말 참고). 타일은 이미 "못 올렸어요" 를 띄우고 있는데
        버튼 위에서 "이제 등록할 수 있어요" 라고 말하면, 그 한 줄이 하지 않기로 한
        바로 그 거짓말이 된다. 사진이 한 장뿐이라 그냥 올리면 사진 없는 레시피가
        되돌릴 수 없게 확정된다.
      */
      evaluation.photosFailed
      ? t("recipeWrite.submit.photoFailed")
      : evaluation.missing.length > 0
        ? t(MISSING_COPY_KEY[evaluation.missing[0]])
        : evaluation.timeMinOutOfRange
          ? t("recipeWrite.field.timeMinRange")
          : t("recipeWrite.submit.ready")

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
    `gestureEnabled: false` 는 iOS 전용이라(네이티브 스택이 안드로이드에선 그 값을 무시한다)
    지금까지 안드로이드에서는 백 한 번에 초안이 **확인 없이** 사라졌다.
    그 레이아웃 머리말이 "그 한 줄은 각 작성 화면의 몫" 이라고 적어 뒀는데 실제로 부르는
    화면이 하나도 없었다 — 여기서 처음 부른다.

    조건을 `hasDraft` 로 두는 것이 요점이다. 무조건 막으면 빈 폼에서 나가려는 사람에게도
    확인창이 떠서, 잃을 것이 없는 사람을 한 번 더 누르게 한다.

    ── `allowExitRef` — 화면 **스스로** 나가는 길은 통과시킨다 ──────────────────
    가드는 이탈의 출처를 가리지 않는다. 확인창의 "나가기" 가 부르는 `onClose()` 도,
    등록 성공 뒤의 `onClose()` 도 초안이 남은 채로 나가는 길이라 같이 잡힌다 — 그대로
    두면 확인창이 되뜨어 화면을 영영 못 떠나고(가둠), 레시피를 등록하고 나서도
    "쓰던 걸 두고 나갈까요" 를 보게 된다. 나가기로 **결정한** 순간 깃발을 세우고,
    가드는 잡아 둔 그 동작을 그대로 다시 던진다(공식 처방
    `navigation.dispatch(data.action)` — 다시 던진 동작은 두 번 잡히지 않는다).
    `FreePostEditor` 가 같은 모양이다.
  */
  usePreventRemove(screen.hasDraft, ({ data }) => {
    if (allowExitRef.current) {
      navigation.dispatch(data.action)
      return
    }
    screen.setExitVisible(true)
  })

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: s.canvas, paddingTop: insets.top },
      ]}
    >
      {/* 뒤로 버튼은 흐름 밖에 둔다 — 제목을 화면 정가운데에 두려면 좌우가 대칭이어야
          하는데, 오른쪽에 놓을 것이 없어서 자리만 채우는 빈 상자를 만들게 된다. */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
          style={({ pressed }) => [
            styles.back,
            pressed ? { opacity: 0.6 } : null,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={LAYOUT.iconButton.size}
            color={s.textStrong}
          />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: s.textStrong }]}
          numberOfLines={1}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("recipeWrite.title")}
        </Text>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: submitBarHeight }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        {/* ── 기본 정보 ── */}
        <View style={styles.section}>
          <WriteTextField
            label={t("recipeWrite.field.name")}
            required
            variant="bordered"
            clearable
            clearAccessibilityLabel={t("action.clear")}
            value={form.name}
            onChangeText={(name) => screen.patch({ name })}
            placeholder={t("recipeWrite.field.namePlaceholder")}
            maxLength={RECIPE_WRITE_LIMITS.nameMax}
            /* 한줄 소개와 **같은 200자 칸**이다. 한쪽만 카운터가 없으면, 상한에
               걸린 사람이 그 칸에서만 글자가 사라지는 이유를 못 찾는다.
               `WriteTextField` 가 상한 근처(90%)에서만 그리므로 평소엔 안 보인다. */
            counterText={t("recipeWrite.field.counter", {
              length: form.name.length,
              max: RECIPE_WRITE_LIMITS.nameMax,
            })}
          />
          <WriteTextField
            label={t("recipeWrite.field.summary")}
            required
            variant="bordered"
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
          <WriteTextField
            label={t("recipeWrite.field.timeMin")}
            labelSuffix={t("recipeWrite.field.optionalMark")}
            variant="bordered"
            value={form.timeMinText}
            onChangeText={(timeMinText) =>
              screen.patch({ timeMinText: timeMinText.replace(/[^0-9]/gu, "") })
            }
            placeholder={t("recipeWrite.field.timeMinPlaceholder")}
            maxLength={4}
            keyboardType="number-pad"
            suffix={t("recipeWrite.field.timeMinUnit")}
          />
        </View>

        <View style={[styles.band, { backgroundColor: s.band }]} />

        {/* ── 분류 ── */}
        <View style={styles.section}>
          {/*
            **영양 기준에도 같은 안내가 붙는다.** 서버의 `CLINICAL_TAG_TOKENS` 는
            `저염`·`저단백`·`저칼륨`·`저인`·`고열량` 도 걸러 내므로(`locale.ts::displayTags`),
            이 줄에서 고른 태그도 카드에 안 나온다. 예전에는 병기에만 안내가 붙어 있어서,
            저염을 고른 사람은 자기 카드에 그게 뜰 거라고 믿을 수밖에 없었다.
            음식 종류(한식…)는 걸러지지 않으므로 그쪽에는 붙이지 않는다.
          */}
          <WriteChipRail
            label={t("recipeWrite.classify.nutritionLabel")}
            notice={t("recipeWrite.classify.searchOnlyNotice")}
            options={NUTRITION_TAG_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            selected={form.nutritionTags}
            onToggle={(value) => screen.toggleTag("nutritionTags", value)}
          />
          <WriteChipRail
            label={t("recipeWrite.classify.categoryLabel")}
            required
            hint={t("recipeWrite.classify.categoryHint")}
            options={CATEGORY_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            selected={form.category ? [form.category] : []}
            onToggle={screen.selectCategory}
          />
          {/*
            병기 칩 레일이 있던 자리다. 프로필에서 붙일 것이 하나도 없으면
            (병기 미등록 · CKD 1·2기 · 투석 아님 · 동반 질환 없음) **아예 안 그린다** —
            켜도 아무 태그가 안 붙는 컨트롤은 없는 것보다 나쁘다.
          */}
          {screen.authorContext.tags.length > 0 ? (
            <AuthorContextRow
              /*
                **`labelKey` 를 거쳐 그린다.** 예전에는 파생 태그(한국어 리터럴)를
                그대로 이어 붙였는데, 그러면 영어 로케일에서 "Written for my own
                needs (CKD 5기 · 당뇨 동반)" 이 된다. 값(서버로 가는 것)과 문구
                (화면에 뜨는 것)는 다른 축이다.
                보간 이름이 `context` 가 아닌 이유: i18next 가 그 이름을 문맥
                키(`key_male` 등)로 예약해 둬서 타입이 충돌한다.
              */
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
        </View>

        <View style={[styles.band, { backgroundColor: s.band }]} />

        {/* ── 재료 · 인분 · 영양 · 조리 순서 ── */}
        <View style={styles.section}>
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
        </View>

        <View style={[styles.band, { backgroundColor: s.band }]} />

        {/* ── 설명 ── */}
        <View style={styles.section}>
          <WriteTextField
            label={t("recipeWrite.field.description")}
            labelSuffix={t("recipeWrite.field.optionalMark")}
            variant="sunken"
            value={form.description}
            onChangeText={(description) => screen.patch({ description })}
            placeholder={t("recipeWrite.field.descriptionPlaceholder")}
            maxLength={RECIPE_WRITE_LIMITS.descriptionMax}
            counterText={t("recipeWrite.field.counter", {
              length: form.description.length,
              max: RECIPE_WRITE_LIMITS.descriptionMax,
            })}
            multiline
            minHeight={DESCRIPTION_MIN_HEIGHT}
          />
        </View>
      </KeyboardAwareScrollView>

      <View
        style={styles.submitBar}
        onLayout={(event) =>
          setSubmitBarHeight(event.nativeEvent.layout.height)
        }
      >
        <WriteSubmitBar
          statusText={statusText}
          label={
            screen.submitting
              ? t("recipeWrite.submit.submitting")
              : t("recipeWrite.submit.label")
          }
          onPress={() => void screen.submit()}
          disabled={!evaluation.canSubmit || screen.submitting}
          paddingBottom={bottomInset + 20}
        />
      </View>

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
            나가기는 **가드를 내린 뒤** 위 이펙트가 실행한다(그 머리말) — 거기서
            `afterModalTransitions()` 로 모달 dismiss 전이와 화면 pop 이 겹치지 않게
            한다. iOS 에서 두 전환이 겹치면 앱 전체 터치가 죽는 계열의 사고가 있었고,
            그래서 `appModalGate` 가 "라우터 push/pop 은 `afterModalTransitions()`
            뒤에" 를 못 박아 두었다.
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
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: LAYOUT.headerHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  /**
   * 아이콘 상자의 왼쪽 모서리를 `screenX` 에 맞추면서 터치 44 를 지키는 정본 패턴
   * (`LAYOUT.iconButton` 머리말). padding 을 주고 같은 값을 음수 마진으로 되돌린다.
   */
  back: {
    position: "absolute",
    left: LAYOUT.screenX - LAYOUT.iconButton.pad,
    padding: LAYOUT.iconButton.pad,
  },
  headerTitle: { ...TYPE.sheetTitle, fontWeight: "600" },
  scroll: { flex: 1 },
  /** 시안 실측: 가로 20 / 세로 24, 칸 사이 20. 면은 화면 바닥과 같다(흰 블록). */
  section: {
    paddingHorizontal: LAYOUT.screenX,
    paddingVertical: 24,
    gap: 20,
  },
  /** 화면을 가르는 띠. full-bleed 라 섹션 여백 밖에 있다. */
  band: { height: 4 },
  submitBar: { position: "absolute", left: 0, right: 0, bottom: 0 },
})
