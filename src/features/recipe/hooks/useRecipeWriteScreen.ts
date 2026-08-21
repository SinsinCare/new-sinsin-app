/**
 * 레시피 작성 화면의 **머리**. 폼 상태·사진 업로드·등록·이탈 확인을 전부 여기서 든다.
 *
 * ## 왜 뗐는가
 * `RecipeWriteForm.tsx`(지금의 `views/RecipeWriteScreen.tsx`)가 621줄이었다. `docs/mobile-frontend-architecture.md:84-104` 의
 * 250줄 기준을 한참 넘겼고, 그보다 나쁜 것은 **이 파일 안의 로직이 영원히 검증되지
 * 않았다는 것**이다 — 이 레포는 `jest.config.ts:3` 이 `testEnvironment: "node"` 이고
 * `react-native` 가 스텁이라 `.tsx` 를 렌더할 수단이 없다. 훅으로 떼어 내도 훅 자체는
 * 여전히 못 돌리지만, **떼는 과정에서 순수 함수로 내려간 것들**(`joinIngredientAmount`,
 * `summarizeSteps`, `evaluateRecipeWriteForm`)은 `writeFormState.ts` 에서 테스트된다.
 * 화면에 남는 것은 그 결과를 배치하는 일뿐이다.
 *
 * ## 여기 없는 것
 * 문구가 없다. `t()` 는 화면이 부른다 — 훅이 i18n 을 들면 같은 상태를 다른 문구로 쓰는
 * 화면(수정 화면 등)이 생길 때 훅을 복제하게 된다.
 */

import { useCallback, useMemo, useRef, useState } from "react"
import { Keyboard } from "react-native"
import { useQueryClient } from "@tanstack/react-query"

import { pickMultipleImages } from "@/src/features/recipe/services/imagePickerService"
import { imageUploadService } from "@/src/features/recipe/services/imageUploadService"
import { recipeWriteService } from "@/src/features/recipe/services/recipeWriteService"
import { useNutritionPreview } from "./useNutritionPreview"
import { useKidneyProfile } from "@/src/features/settings/hooks/useKidneyProfile"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"

import {
  createEmptyRecipeWriteForm,
  emptyIngredientRow,
  emptyStepRow,
  evaluateRecipeWriteForm,
  hasAnyRecipeWriteContent,
  moveItem,
  nextRowId,
  summarizeSteps,
  toCreateRecipeRequest,
  toPreviewRequest,
  type IngredientRow,
  type PhotoRow,
  type RecipeWriteFormState,
} from "@/src/features/recipe/components/write/writeFormState"
import { unmatchedNames } from "@/src/features/recipe/components/write/nutritionPreviewView"
import { deriveAuthorContextTags } from "@/src/features/recipe/components/write/authorContextTags"

/**
 * 등록 결과. 화면이 문구를 붙인다 — 훅은 "빠진 재료가 몇 개인가" 까지만 안다.
 * `unmatchedCount` 가 0 이면 그냥 성공이고, 0 보다 크면 성공 + 덧붙일 말이 있다는 뜻이다.
 */
export interface RecipeWriteSubmitResult {
  unmatchedCount: number
}

interface UseRecipeWriteScreenArgs {
  /** 등록에 성공했을 때. 화면이 닫고 토스트를 띄운다. */
  onSubmitted: (result: RecipeWriteSubmitResult) => void
  /** 등록 실패. `presentError` 로 보낼 원본 오류를 그대로 넘긴다. */
  onSubmitFailed: (error: unknown) => void
  /**
   * 수정할 레시피 id. 주면 **수정**(`PUT`), 없으면 **작성**(`POST`)이다.
   * 화면 구조는 같고 보내는 곳만 다르다 — 계약 §3.8 이 작성과 같은 본문을 받는다.
   */
  recipeId?: number
  /**
   * 폼 초기값. 수정 화면이 상세를 `recipeDetailToWriteForm` 으로 되돌려 넣는다.
   *
   * **한 번만 읽는다**(`useState` 초기화). 이후 서버가 다시 불려도 사용자가 고치던
   * 값을 덮어쓰지 않는다 — 입력 중에 글자가 되돌아가는 것만큼 나쁜 것이 없다.
   */
  initialForm?: RecipeWriteFormState
}

export function useRecipeWriteScreen({
  onSubmitted,
  onSubmitFailed,
  recipeId,
  initialForm,
}: UseRecipeWriteScreenArgs) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState<RecipeWriteFormState>(
    () => initialForm ?? createEmptyRecipeWriteForm(),
  )
  const [submitting, setSubmitting] = useState(false)
  /*
    `submitting` 은 **그리기 위한** 값이고, 이건 **막기 위한** 값이다.
    상태만으로 막으면 같은 틱에 들어온 두 번째 탭이 아직 `false` 를 본다 —
    React 는 이 핸들러가 끝난 뒤에야 다시 그리기 때문이다. 그 틈으로 `POST /recipes`
    가 두 번 나가면 사용자에게는 **레시피가 두 개 올라간다.** 이제 `DELETE`(계약 §3.8)
    가 있어 지울 수는 있지만, 사용자가 두 개를 발견하고 하나를 지우는 일 자체가
    우리가 만든 일이다. ref 는 대입 즉시 보이므로 그 틈이 없다.
    (수정은 같은 id 를 덮어쓰므로 두 번 나가도 결과가 같다 — 잠금은 작성 때문이다.)
  */
  const submitLockRef = useRef(false)
  const [exitVisible, setExitVisible] = useState(false)
  const [stepSheetVisible, setStepSheetVisible] = useState(false)

  const evaluation = useMemo(() => evaluateRecipeWriteForm(form), [form])
  const previewRequest = useMemo(() => toPreviewRequest(form), [form])
  const preview = useNutritionPreview(previewRequest)
  const stepSummary = useMemo(() => summarizeSteps(form.steps), [form.steps])

  /*
    작성자의 신장 상태에서 나오는 태그. 프로필이 아직 안 왔거나 붙일 것이 없으면
    빈 배열이고, 그때 화면은 그 줄을 안 그린다(`authorContextTags.ts` 머리말).

    **기본값은 꺼짐이다.** 프로필에 있다는 이유로 태그가 저절로 붙으면, 작성자는
    자기가 무엇을 붙였는지 모른 채 올리게 된다. 이 줄은 묻는 것이지 아는 척하는
    것이 아니다.
  */
  const kidneyProfile = useKidneyProfile()
  const authorContextTags = useMemo(
    () => deriveAuthorContextTags(kidneyProfile.data),
    [kidneyProfile.data],
  )
  /*
    `stageTags` 는 **서버로 나가는 값**(`투석환자`·`CKD3` — 어휘 정본은
    `recipeTags.ts::STAGE_TAGS`)이고, 파생 태그는 그 값과 화면 문구 열쇠를 함께 든다.
    그래서 비교·저장은 `value` 축으로만 한다 — 화면이 `labelKey` 로 로케일을 타는 것과
    서로 간섭하지 않는다.

    사용자가 보는 `CKD 3기` 는 이 축에 없다. 그건 `labelKey`(`category.stage.ckd3`)가
    로케일에서 꺼내는 문구고, en 에서는 같은 값이 `CKD stage 3` 으로 읽힌다. 문구를
    저장·비교에 쓰면 로케일을 바꾼 사람의 태그가 서버 검색 어휘에서 빠진다.
  */
  /*
    `Set<string>` 으로 넓혀 든다. `tag.value` 는 좁은 리터럴 유니온(`StageTag`)인데
    `form.stageTags` 는 `string[]` 이라, 좁은 배열의 `includes(넓은 값)` 는 타입이
    안 맞는다. 여기서 한 번 넓히면 아래 비교·필터가 전부 같은 축에서 돈다.
  */
  const authorContextValues = useMemo<ReadonlySet<string>>(
    () => new Set<string>(authorContextTags.map((tag) => tag.value)),
    [authorContextTags],
  )
  const authorContextApplied = useMemo(
    () =>
      authorContextValues.size > 0 &&
      [...authorContextValues].every((value) => form.stageTags.includes(value)),
    [authorContextValues, form.stageTags],
  )
  const toggleAuthorContext = useCallback(() => {
    setForm((prev) => {
      const on = [...authorContextValues].every((value) =>
        prev.stageTags.includes(value),
      )
      return {
        ...prev,
        stageTags: on
          ? prev.stageTags.filter((value) => !authorContextValues.has(value))
          : // 중복을 걷어낸다 — 프로필이 다시 불려 파생 목록이 바뀌면 예전 값이
            // 남은 채 새 값이 더해져 같은 태그가 두 번 실릴 수 있다.
            [...new Set([...prev.stageTags, ...authorContextValues])],
      }
    })
  }, [authorContextValues])

  const patch = useCallback((next: Partial<RecipeWriteFormState>) => {
    setForm((prev) => ({ ...prev, ...next }))
  }, [])

  /** 다중 선택 칩 한 개를 뒤집는다. 값이 무엇인지는 몰라도 된다. */
  const toggleTag = useCallback(
    /*
      `stageTags` 갈래를 뺐다. 병기 칩 레일이 파생 줄(`AuthorContextRow`)로 바뀌면서
      그 축을 이 함수로 뒤집는 곳이 0개가 됐다 — `stageTags` 는 이제
      `toggleAuthorContext` 만 건드린다. 유니온에 남겨 두면 "여기로도 켤 수 있다" 는
      거짓 신호가 된다.
    */
    (key: "nutritionTags", value: string) => {
      setForm((prev) => {
        const list = prev[key]
        return {
          ...prev,
          [key]: list.includes(value)
            ? list.filter((item) => item !== value)
            : [...list, value],
        }
      })
    },
    [],
  )

  /** 음식 종류는 하나만 고른다. 같은 것을 다시 누르면 해제다. */
  const selectCategory = useCallback((value: string) => {
    setForm((prev) => ({
      ...prev,
      category: prev.category === value ? "" : value,
    }))
  }, [])

  /* ══════════════════════════ 사진 ══════════════════════════ */

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

  const addPhotos = useCallback(async () => {
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

  const retryPhoto = useCallback(
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

  const removePhoto = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((photo) => photo.id !== id),
    }))
  }, [])

  /* ══════════════════════════ 재료 ══════════════════════════ */

  const changeIngredient = useCallback(
    (id: string, rowPatch: Partial<Omit<IngredientRow, "id">>) => {
      setForm((prev) => ({
        ...prev,
        ingredients: prev.ingredients.map((row) =>
          row.id === id ? { ...row, ...rowPatch } : row,
        ),
      }))
    },
    [],
  )

  /**
   * 마지막 한 줄은 지워도 **빈 줄 하나가 남는다.** 재료 칸이 통째로 사라지면
   * 다시 적을 곳이 없어 사용자가 화면을 나갔다 들어와야 한다.
   */
  const removeIngredient = useCallback((id: string) => {
    setForm((prev) => {
      const rest = prev.ingredients.filter((row) => row.id !== id)
      return {
        ...prev,
        ingredients: rest.length > 0 ? rest : [emptyIngredientRow()],
      }
    })
  }, [])

  const addIngredient = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, emptyIngredientRow()],
    }))
  }, [])

  /* ══════════════════════════ 조리 순서 ══════════════════════════ */

  const changeStep = useCallback((id: string, text: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((row) => (row.id === id ? { ...row, text } : row)),
    }))
  }, [])

  const removeStep = useCallback((id: string) => {
    setForm((prev) => {
      const rest = prev.steps.filter((row) => row.id !== id)
      return { ...prev, steps: rest.length > 0 ? rest : [emptyStepRow()] }
    })
  }, [])

  const addStep = useCallback(() => {
    setForm((prev) => ({ ...prev, steps: [...prev.steps, emptyStepRow()] }))
  }, [])

  const reorderSteps = useCallback((from: number, to: number) => {
    setForm((prev) => ({ ...prev, steps: moveItem(prev.steps, from, to) }))
  }, [])

  /* ══════════════════════════ 등록 ══════════════════════════ */

  /**
   * 등록. **성공/실패는 `createRecipe` 하나만 결정한다.**
   *
   * 예전 구조(try 하나에 다 넣기)는 저장이 끝난 뒤의 일 — 캐시 무효화나 응답에서
   * 빠진 재료를 읽는 것 — 이 실패해도 "올리지 못했어요" 를 띄웠다. 그러면 사용자는
   * 이미 올라간 레시피를 한 번 더 올린다. 저장 뒤의 실패는 성공을 뒤집지 않는다.
   */
  const submit = useCallback(async () => {
    if (!evaluation.canSubmit || submitLockRef.current) return
    submitLockRef.current = true
    setSubmitting(true)
    Keyboard.dismiss()

    let created
    try {
      const request = toCreateRecipeRequest(form)
      created =
        recipeId === undefined
          ? await recipeWriteService.createRecipe(request)
          : await recipeWriteService.updateRecipe(recipeId, request)
    } catch (error) {
      submitLockRef.current = false
      setSubmitting(false)
      // 폴백(`레시피를 올리지 못했어요 / 인터넷 연결을 확인…`)을 넘기지 않는다.
      // 실제로 여기 오는 것은 대부분 400 — 서버가 어느 값이 문제인지 알고 있다.
      onSubmitFailed(error)
      return
    }
    /*
      성공 뒤에는 잠금을 **풀지 않는다.** 이 화면은 곧 닫히고, 그 사이에 한 번 더
      눌리면 같은 레시피가 두 번 올라간다. 버튼 모양만 되돌린다.
    */
    setSubmitting(false)

    void queryClient.invalidateQueries({ queryKey: ["recipes"] })
    // 서버가 §3.6 대로 `unmatchedIngredients` 를 채워 보내면 그것을 말해 준다.
    // 필드가 없어도 등록은 성공이다 — 여기서 넘어져 실패 문구를 띄우지 않는다.
    const unmatchedCount = Array.isArray(
      created.nutrition?.unmatchedIngredients,
    )
      ? unmatchedNames(created.nutrition).length
      : 0
    onSubmitted({ unmatchedCount })
  }, [evaluation.canSubmit, form, onSubmitFailed, onSubmitted, queryClient])

  /* ══════════════════════════ 이탈 ══════════════════════════ */

  const hasDraft = useMemo(() => hasAnyRecipeWriteContent(form), [form])

  /** 뒤로/닫기. 적은 것이 있으면 확인을 받고, 없으면 그냥 나간다. */
  const requestClose = useCallback(
    (leave: () => void) => {
      Keyboard.dismiss()
      if (hasDraft) setExitVisible(true)
      else leave()
    },
    [hasDraft],
  )

  return {
    form,
    patch,
    toggleTag,
    selectCategory,

    evaluation,
    preview,
    authorContext: {
      tags: authorContextTags,
      applied: authorContextApplied,
      toggle: toggleAuthorContext,
    },
    stepSummary,
    hasDraft,

    photos: { add: addPhotos, retry: retryPhoto, remove: removePhoto },
    ingredients: {
      change: changeIngredient,
      remove: removeIngredient,
      add: addIngredient,
    },
    steps: {
      change: changeStep,
      remove: removeStep,
      add: addStep,
      reorder: reorderSteps,
    },

    submitting,
    submit,

    exitVisible,
    setExitVisible,
    requestClose,

    stepSheetVisible,
    setStepSheetVisible,
  }
}
