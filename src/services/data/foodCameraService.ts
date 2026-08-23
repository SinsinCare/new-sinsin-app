import type {
  DateAnalysisResponse,
  DiaryAnalysisResult,
  DiaryExistenceResponse,
  ExtraWaterUpdateResponse,
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodAnalysisConfirmationRequest,
  FoodAnalysisConsumptionRequest,
  FoodAnalysisJob,
  FoodAnalysisMode,
  FoodCameraAnalyzeResult,
  FoodCameraDiaryRegisterResponse,
  FoodTitleUpdateResponse,
} from "../../types"
import { getBackendUrl, isMockMode } from "../../config/appConfig"
import { getAppLanguage } from "../../i18n"
import {
  normalizeFoodAnalysisResult,
  projectFoodAnalysisJobPresentation,
} from "../../shared/utils/foodAnalysisResult"
import { api, ApiError, authenticatedFetch } from "../core"
import { prepareImageUpload } from "../../shared/utils/preparedImageUpload"

const ANALYZE_TEXT_TIMEOUT_MS = 180000
const FOOD_ANALYSIS_UPDATE_TIMEOUT_MS = 180000

function unwrapResult<T>(data: { result?: T } | T): T {
  return ((data as { result?: T }).result ?? data) as T
}

function isUnsupportedV2Status(status: number): boolean {
  return status === 404 || status === 405
}

function createFoodAnalysisError(status: number, code?: string): ApiError {
  const isEnglish = getAppLanguage() === "en"
  const message =
    status >= 500
      ? isEnglish
        ? "We can’t analyze this photo right now. Try uploading it again in a moment."
        : "지금은 음식 사진을 살펴보기 어려워요. 잠시 후 다시 올려 주세요."
      : isEnglish
        ? "We couldn’t identify the food in this photo. Check the photo and upload it again."
        : "음식 사진을 읽지 못했어요. 사진을 확인하고 다시 올려 주세요."
  return new ApiError(message, code || `HTTP_${status}`, status)
}

type TransitionalFoodAnalysisJob = FoodAnalysisJob &
  Partial<FoodCameraAnalyzeResult>

function normalizeAnalysisJob(input: FoodAnalysisJob): FoodAnalysisJob {
  const transitional = input as TransitionalFoodAnalysisJob
  const topLevelResult =
    !transitional.result &&
    (transitional.revision || Array.isArray(transitional.foods))
      ? (transitional as FoodCameraAnalyzeResult)
      : null
  const result = transitional.result ?? topLevelResult
  const job: FoodAnalysisJob = {
    ...transitional,
    result,
    error: transitional.error ?? transitional.failureMessage ?? null,
  }
  const normalizedJob = result
    ? {
        ...job,
        result: normalizeFoodAnalysisResult({
          ...result,
          analysisId: result.analysisId ?? job.analysisId,
          requestId: result.requestId ?? job.requestId,
          status: result.status ?? job.status,
        }),
      }
    : job
  return projectFoodAnalysisJobPresentation(normalizedJob)
}

export const foodCameraService = {
  async createAnalysis(
    imageUri: string,
    requestId: string,
    mode: FoodAnalysisMode = "POST_MEAL",
  ): Promise<FoodAnalysisJob> {
    const language = getAppLanguage()
    if (isMockMode()) {
      const { mockFoodCameraService } = require("./mock/mockFoodCameraService") // eslint-disable-line @typescript-eslint/no-require-imports
      const result = await mockFoodCameraService.analyze()
      return normalizeAnalysisJob({
        analysisId: `mock-${requestId}`,
        requestId,
        status: "READY",
        result: { ...result, status: "READY", requestId },
      })
    }

    const prepared = await prepareImageUpload(imageUri, {
      width: 1024,
      compress: 0.5,
      cachePrefix: "food_tmp",
    })
    const baseURL = getBackendUrl()
    const fileName = `food_${Date.now()}.jpg`
    try {
      const response = await authenticatedFetch(
        `${baseURL}/food-analyses`,
        () => {
          const formData = new FormData()
          formData.append("image", {
            uri: prepared.uri,
            name: fileName,
            type: "image/jpeg",
          } as unknown as Blob)
          formData.append("requestId", requestId)
          formData.append("mode", mode)
          formData.append("language", language)
          return {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Idempotency-Key": requestId,
            },
            body: formData as unknown as RequestInit["body"],
          }
        },
      )

      if (isUnsupportedV2Status(response.status)) {
        const result = await this.analyze(imageUri, requestId)
        return {
          analysisId: String(result.foodAnalysisResultId),
          requestId,
          status: "READY",
          result: { ...result, status: "READY", requestId },
        }
      }

      const json = (await response.json()) as {
        isSuccess?: boolean
        message?: string
        code?: string
        result?: FoodAnalysisJob
      }
      if (!response.ok || json.isSuccess === false || !json.result) {
        throw createFoodAnalysisError(response.status, json.code)
      }
      return normalizeAnalysisJob(json.result)
    } finally {
      await prepared.cleanup()
    }
  },

  async fetchAnalysis(analysisId: string): Promise<FoodAnalysisJob> {
    const response = await api.get(`/food-analyses/${analysisId}`)
    return normalizeAnalysisJob(unwrapResult<FoodAnalysisJob>(response.data))
  },

  async fetchAnalysisByRequestId(
    requestId: string,
  ): Promise<FoodAnalysisJob | null> {
    try {
      const response = await api.get(
        `/food-analyses/by-request/${encodeURIComponent(requestId)}`,
      )
      const job = unwrapResult<FoodAnalysisJob | null>(response.data)
      return job ? normalizeAnalysisJob(job) : null
    } catch (err) {
      /*
        `api` 는 응답 인터셉터에서 **모든** HTTP 오류를 `ApiError` 로 바꿔 던진다
        (`apiClient.ts`). 그래서 예전의 `isAxiosError(err)` 는 **항상 거짓**이었고,
        이 폴백은 한 번도 실행되지 않았다 — v2 잡이 없는 레거시 분석(텍스트 등록이
        전부 그렇다)은 404 를 그대로 위로 던졌다. 복구 폴링이 같은 404 를 TTL(10분)
        내내 두드리기만 하고, 서버에 **이미 저장돼 있는** 결과를 못 찾던 자리다
        (2026-08-23 로그: 대기 6건 × 5초 간격 404).
      */
      const status = err instanceof ApiError ? (err.statusCode ?? 0) : 0
      if (isUnsupportedV2Status(status)) {
        const result = await this.fetchByRequestId(requestId)
        return result
          ? {
              analysisId: String(result.foodAnalysisResultId),
              requestId,
              status: "READY",
              result: { ...result, status: "READY", requestId },
            }
          : null
      }
      throw err
    }
  },

  async confirmAnalysis(
    analysisId: string,
    body: FoodAnalysisConfirmationRequest & { baseRevisionId?: string },
  ): Promise<FoodAnalysisJob> {
    const response = await api.post(
      `/food-analyses/${analysisId}/confirmation`,
      body,
    )
    return normalizeAnalysisJob(unwrapResult<FoodAnalysisJob>(response.data))
  },

  async updateConsumption(
    analysisId: string,
    body: FoodAnalysisConsumptionRequest,
  ): Promise<FoodAnalysisJob> {
    const response = await api.patch(
      `/food-analyses/${analysisId}/consumption`,
      body,
    )
    return normalizeAnalysisJob(unwrapResult<FoodAnalysisJob>(response.data))
  },

  async analyze(
    imageUri: string,
    requestId?: string,
  ): Promise<FoodCameraAnalyzeResult> {
    let result: FoodCameraAnalyzeResult
    const language = getAppLanguage()

    if (isMockMode()) {
      const { mockFoodCameraService } = require("./mock/mockFoodCameraService") // eslint-disable-line @typescript-eslint/no-require-imports
      result = await mockFoodCameraService.analyze()
    } else {
      const prepared = await prepareImageUpload(imageUri, {
        width: 1024,
        compress: 0.5,
        cachePrefix: "food_tmp",
      })

      const baseURL = getBackendUrl()
      const fileName = `food_${Date.now()}.jpg`
      try {
        const fetchResponse = await authenticatedFetch(
          `${baseURL}/food-camera/analyze`,
          () => {
            const formData = new FormData()
            formData.append("image", {
              uri: prepared.uri,
              name: fileName,
              type: "image/jpeg",
            } as unknown as Blob)
            if (requestId) {
              formData.append("requestId", requestId)
            }
            formData.append("language", language)
            return {
              method: "POST",
              headers: { Accept: "application/json" },
              body: formData as unknown as RequestInit["body"],
            }
          },
          { timeoutMs: 120_000 },
        )
        const json = (await fetchResponse.json()) as {
          isSuccess?: boolean
          message?: string
          code?: string
          result?: FoodCameraAnalyzeResult
        }
        if (!fetchResponse.ok || json?.isSuccess === false) {
          throw createFoodAnalysisError(fetchResponse.status, json?.code)
        }
        result = json.result as FoodCameraAnalyzeResult
      } finally {
        await prepared.cleanup()
      }
    }
    return normalizeFoodAnalysisResult(result)
  },

  async analyzeText(
    text: string,
    requestId?: string,
  ): Promise<FoodCameraAnalyzeResult> {
    let result: FoodCameraAnalyzeResult
    const language = getAppLanguage()

    if (isMockMode()) {
      const { mockFoodCameraService } = require("./mock/mockFoodCameraService") // eslint-disable-line @typescript-eslint/no-require-imports
      result = await mockFoodCameraService.analyze()
    } else {
      try {
        const response = await api.post(
          "/food-camera/analyze-text",
          {
            text,
            ...(requestId ? { requestId } : {}),
            language,
          },
          { timeout: ANALYZE_TEXT_TIMEOUT_MS },
        )
        result = response.data.result as FoodCameraAnalyzeResult
      } catch (err) {
        throw err
      }
    }
    return normalizeFoodAnalysisResult(result)
  },

  async fetchByRequestId(
    requestId: string,
  ): Promise<FoodCameraAnalyzeResult | null> {
    try {
      const response = await api.get("/food-camera/analysis-results", {
        params: { requestId },
      })
      const result =
        (response.data.result as FoodCameraAnalyzeResult | null) ?? null
      return result ? normalizeFoodAnalysisResult(result) : null
    } catch (err) {
      throw err
    }
  },

  async registerDiary(
    foodAnalysisResultId: number,
    date: string,
    mealType: string,
  ): Promise<FoodCameraDiaryRegisterResponse> {
    try {
      const response = await api.post(
        `/food-camera/analysis-results/${foodAnalysisResultId}/diary`,
        { date, mealType },
      )
      return response.data as FoodCameraDiaryRegisterResponse
    } catch (err) {
      throw err
    }
  },

  async skipMeal(date: string, mealType: string): Promise<void> {
    try {
      await api.post("/food-camera/skip-meal", { date, mealType })
    } catch (err) {
      throw err
    }
  },

  async fetchDateAnalysis(date: string): Promise<DateAnalysisResponse> {
    try {
      const response = await api.get(`/food-camera/date-analysis/${date}`)
      return response.data as DateAnalysisResponse
    } catch (err) {
      throw err
    }
  },

  async fetchDiaryExistence(
    startDate?: string,
    endDate?: string,
  ): Promise<DiaryExistenceResponse> {
    try {
      const response = await api.get(
        `/food-camera/statistics/diary-existence`,
        { params: { startDate, endDate } },
      )
      return response.data as DiaryExistenceResponse
    } catch (err) {
      throw err
    }
  },

  async updateExtraWater(
    date: string,
    deltaWater: number,
  ): Promise<ExtraWaterUpdateResponse> {
    try {
      const response = await api.patch(
        `/food-camera/date-analysis/${date}/extra-water`,
        { deltaWater },
      )
      return response.data as ExtraWaterUpdateResponse
    } catch (err) {
      throw err
    }
  },

  async fetchDiaryResult(diaryId: number): Promise<DiaryAnalysisResult> {
    try {
      const response = await api.get(`/food-camera/diaries/${diaryId}/analysis`)
      return normalizeFoodAnalysisResult(
        response.data.result as DiaryAnalysisResult,
      ) as DiaryAnalysisResult
    } catch (err) {
      throw err
    }
  },

  async updateFoodAnalysis(
    foodAnalysisResultId: number,
    body: FoodAnalysisUpdateRequest,
  ): Promise<FoodAnalysisUpdateResult> {
    try {
      const response = await api.patch(
        `/food-camera/analysis-results/${foodAnalysisResultId}`,
        { ...body, language: getAppLanguage() },
        { timeout: FOOD_ANALYSIS_UPDATE_TIMEOUT_MS },
      )
      return normalizeFoodAnalysisResult(
        response.data.result as FoodAnalysisUpdateResult,
      ) as FoodAnalysisUpdateResult
    } catch (err) {
      throw err
    }
  },

  async updateFoodTitle(
    foodAnalysisResultId: number,
    title: string,
  ): Promise<FoodTitleUpdateResponse> {
    try {
      const response = await api.patch(
        `/food-camera/analysis-results/${foodAnalysisResultId}/title`,
        { title },
      )
      return response.data.result as FoodTitleUpdateResponse
    } catch (err) {
      throw err
    }
  },

  async updateDiaryMealType(
    diaryId: number,
    mealType: string,
  ): Promise<{ diaryId: number; mealType: string }> {
    try {
      const response = await api.patch(
        `/food-camera/diaries/${diaryId}/meal-type`,
        { mealType },
      )
      return response.data.result
    } catch (err) {
      throw err
    }
  },

  async deleteDiary(diaryId: number): Promise<void> {
    try {
      await api.delete(`/food-camera/diaries/${diaryId}`)
    } catch (err) {
      throw err
    }
  },
}
