/**
 * 작성 중 실시간 영양 미리보기 — 계약 §3.5.
 *
 * ## 왜 디바운스가 400ms 인가
 * 계약이 못 박은 값이다("앱은 입력 정지 400ms 후 1회 호출한다"). 재료 50개 × 글자마다
 * 호출하면 서버가 매번 식품표를 조회한다. 서버 쪽 배치 매칭이 재료 수와 무관하게
 * 쿼리 4개로 끝나도, 호출 횟수는 앱만 줄일 수 있다.
 *
 * ## 왜 "계산 중" 과 "기다리는 중" 을 구분하는가
 * 디바운스가 도는 400ms 동안 화면에 이전 결과가 그대로 남아 있으면, 사용자는 방금
 * 고친 재료가 반영된 숫자라고 읽는다. 신장 환자의 나트륨에서 그 오해는 위험하다.
 * 그래서 `isStale`(보이는 숫자가 지금 입력과 다르다)을 따로 내보내고, 화면은 그동안
 * 수치를 흐리게 하고 "계산하는 중" 을 붙인다.
 *
 * ## 오류는 숨긴다? 아니다
 * 실패하면 이전 수치를 그대로 두지 않고 `error` 를 올린다. 옛 숫자를 새 재료 옆에
 * 남겨 두는 것이 빈 자리보다 나쁘다.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { recipeWriteService } from "@/src/features/recipe/services/recipeWriteService"
import {
  NUTRITION_PREVIEW_DEBOUNCE_MS,
  type NutritionPreviewRequest,
  type NutritionPreviewResponse,
} from "@/src/features/recipe/types/recipeWrite"

/** 요청을 캐시 키 하나로 만든다. 같은 재료·같은 인분이면 다시 부르지 않는다. */
function requestKey(request: NutritionPreviewRequest | null): string {
  if (request === null) return ""
  return JSON.stringify([
    request.servings,
    request.ingredients.map((i) => [i.name, i.amountText]),
  ])
}

export interface NutritionPreviewState {
  data: NutritionPreviewResponse | undefined
  /** 보이는 데이터가 지금 입력과 다르다(디바운스 대기 중이거나 요청 중). */
  isStale: boolean
  isLoading: boolean
  error: unknown
  /** 보낼 재료가 하나도 없다 — 화면은 "재료를 적으면 계산해요" 를 띄운다. */
  isEmpty: boolean
  refetch: () => void
}

export function useNutritionPreview(
  request: NutritionPreviewRequest | null,
): NutritionPreviewState {
  const key = requestKey(request)
  const [debouncedKey, setDebouncedKey] = useState(key)
  // 확정된 키에 대응하는 본문. 키만 상태로 두면 렌더 타이밍에 따라 옛 본문이 나갈 수 있다.
  const pending = useRef<NutritionPreviewRequest | null>(request)
  const [settled, setSettled] = useState<NutritionPreviewRequest | null>(
    request,
  )

  // 렌더 중에 ref 를 건드리지 않는다(StrictMode 의 두 번 렌더에서 순서가 갈린다).
  // 이 효과가 아래 타이머 효과보다 먼저 돌아서, 타이머가 걸릴 때 최신 본문이 들어 있다.
  useEffect(() => {
    pending.current = request
  }, [request])

  useEffect(() => {
    if (key === debouncedKey) return
    const timer = setTimeout(() => {
      setSettled(pending.current)
      setDebouncedKey(key)
    }, NUTRITION_PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [key, debouncedKey])

  const query = useQuery({
    queryKey: ["recipeNutritionPreview", debouncedKey],
    queryFn: () => {
      // enabled 가 막아 주지만 타입을 좁히기 위해 한 번 더 본다.
      if (settled === null) throw new Error("no ingredients to preview")
      return recipeWriteService.previewNutrition(settled)
    },
    enabled: settled !== null && debouncedKey !== "",
    // 작성 중 화면이다. 재료가 그대로면 다시 부르지 않는다.
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return useMemo(
    () => ({
      data: request === null ? undefined : query.data,
      isStale: key !== debouncedKey || query.isFetching,
      isLoading: query.isLoading,
      error: query.error,
      isEmpty: request === null,
      refetch: () => void query.refetch(),
    }),
    [request, key, debouncedKey, query],
  )
}
