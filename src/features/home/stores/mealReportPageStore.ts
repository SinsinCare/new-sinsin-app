import { create } from "zustand"

import type { AnalyticsFoodRecordSource } from "@/src/features/analytics"
import type {
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
} from "@/src/types"
import type { MealType } from "../types"

/**
 * 식단 리포트 **페이지**가 받을 재료.
 *
 * 리포트는 2026-09-04 시안부터 바텀시트(RN Modal pageSheet)가 아니라 **별도 페이지**
 * (`app/meal-report.tsx`)다. 페이지는 라우트 파라미터로 분석 결과 전체를 실을 수 없고
 * (객체·콜백), 여는 쪽(홈 RecordView·통계 StatisticsView)이 결과와 콜백을 이미 들고
 * 있으므로, 여는 순간 여기 넣고 페이지가 꺼내 쓴다. 한 번에 한 리포트만 열린다.
 *
 * `onClose` 는 **여는 쪽의 정리**(신규 결과 닫기·복구 대기 비우기 등)다. 페이지를
 * 실제로 내리는 것(`router.back()`)은 페이지 자신이 한다.
 */
export interface MealReportPageParams {
  /** 어느 결과 화면인가 — 신규·저장·복구는 전환율이 다른 별개의 여정이다. */
  source: AnalyticsFoodRecordSource
  result: FoodCameraAnalyzeResult
  imageUri?: string
  mealType?: MealType
  onAddToRecord?: () => Promise<void> | void
  showAddButton?: boolean
  isUpdating?: boolean
  updateFoodAnalysis: (
    foodAnalysisResultId: number,
    body: FoodAnalysisUpdateRequest,
    sourceResult?: FoodCameraAnalyzeResult,
  ) => Promise<FoodAnalysisUpdateResult | undefined>
  diaryId?: number
  updateDiaryMealType?: (
    diaryId: number,
    mealType: string,
  ) => Promise<{ diaryId: number; mealType: string } | undefined>
  recordDate?: string
  /** 이 기록을 남긴 시각(서버 createdAt, naive UTC). 삭제 확인 미리보기가 쓴다. */
  recordedAt?: string
  onDiaryDeleted?: () => void
  onResultChange?: (result: FoodCameraAnalyzeResult) => void
  onMealTypeChange?: (change: {
    diaryId: number
    fromMealType: MealType
    toMealType: MealType
    imageUri: string | null
  }) => void
  /** 페이지가 닫힐 때 여는 쪽이 할 정리. */
  onClose?: () => void
}

interface MealReportPageState {
  params: MealReportPageParams | null
  /** 페이지를 밀어 넣기 직전에 재료를 둔다. */
  set: (params: MealReportPageParams) => void
  /** 여는 쪽이 재료를 갱신할 때(수정 반영 등). 열려 있지 않으면 무시한다. */
  patch: (partial: Partial<MealReportPageParams>) => void
  clear: () => void
}

export const useMealReportPageStore = create<MealReportPageState>()((set) => ({
  params: null,
  set: (params) => set({ params }),
  patch: (partial) =>
    set((state) =>
      state.params ? { params: { ...state.params, ...partial } } : state,
    ),
  clear: () => set({ params: null }),
}))
