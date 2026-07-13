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
import { isMockMode } from "../../config/appConfig"
import { api } from "../core"
import { tokenService } from "../core/tokenService"
import { isAxiosError } from "axios"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import * as FileSystem from "expo-file-system/legacy"

const ANALYZE_TEXT_TIMEOUT_MS = 180000
const FOOD_ANALYSIS_UPDATE_TIMEOUT_MS = 180000

function unwrapResult<T>(data: { result?: T } | T): T {
  return ((data as { result?: T }).result ?? data) as T
}

function isUnsupportedV2Status(status: number): boolean {
  return status === 404 || status === 405
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
  if (!result?.revision || result.foods) return job

  const consumptionByItem = new Map(
    (result.consumptionRevision?.items ?? []).map((item) => [
      item.analysisItemId,
      item,
    ]),
  )
  const foods = result.revision.items.map((item) => {
    const consumption = consumptionByItem.get(item.analysisItemId)
    const nutrients = consumption?.nutrients ?? item.fullNutrients
    return {
      analysisItemId: item.analysisItemId,
      canonicalFoodId: item.canonicalFoodId,
      name: item.name,
      restrictionLevel: "",
      servingSizeValue: item.analyzedGrams,
      servingSizeUnit: "g",
      analyzedGrams: item.analyzedGrams,
      consumedGrams: consumption?.consumedGrams,
      confidence: item.confidence,
      provenance: item.provenance,
      ...nutrients,
    }
  })
  const total =
    result.consumptionRevision?.consumedTotal ?? result.revision.fullTotal

  return {
    ...job,
    result: {
      ...result,
      analysisId: job.analysisId,
      requestId: job.requestId,
      status: job.status,
      revisionId: result.revision.revisionId,
      catalogSnapshotId: result.revision.catalogSnapshotId,
      policyVersion: result.revision.policyVersion,
      coverage:
        result.consumptionRevision?.coverage ?? result.revision.coverage,
      foodAnalysisResultId: result.foodAnalysisResultId ?? 0,
      servings: result.servings ?? 1,
      eatenPercentage: result.eatenPercentage ?? 100,
      title: result.title ?? foods.map((food) => food.name).join(", "),
      imageUrl: result.imageUrl ?? null,
      foods,
      total,
      evaluation:
        result.consumptionRevision?.evaluation ?? result.revision.evaluation,
    },
  }
}

async function compressImage(uri: string): Promise<string> {
  try {
    let sourceUri = uri

    // file:// 카메라 URI는 expo-image-manipulator 접근 권한 문제로
    // 캐시 디렉토리에 복사 후 처리
    if (uri.startsWith("file://")) {
      const dest = `${FileSystem.cacheDirectory}food_tmp_${Date.now()}.jpg`
      await FileSystem.copyAsync({ from: uri, to: dest })
      sourceUri = dest
    }

    const context = ImageManipulator.manipulate(sourceUri)
    context.resize({ width: 1024 })
    const image = await context.renderAsync()
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.5,
    })
    context.release()
    image.release()
    return result.uri
  } catch {
    return uri
  }
}

export const foodCameraService = {
  async createAnalysis(
    imageUri: string,
    requestId: string,
    mode: FoodAnalysisMode = "POST_MEAL",
  ): Promise<FoodAnalysisJob> {
    if (isMockMode()) {
      const { mockFoodCameraService } = require("./mock/mockFoodCameraService") // eslint-disable-line @typescript-eslint/no-require-imports
      const result = await mockFoodCameraService.analyze()
      return {
        analysisId: `mock-${requestId}`,
        requestId,
        status: "READY",
        result: { ...result, status: "READY", requestId },
      }
    }

    const compressedUri = await compressImage(imageUri)
    const formData = new FormData()
    formData.append("image", {
      uri: compressedUri,
      name: `food_${Date.now()}.jpg`,
      type: "image/jpeg",
    } as unknown as Blob)
    formData.append("requestId", requestId)
    formData.append("mode", mode)

    const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL
    const token = await tokenService.getAccessToken()
    const response = await fetch(`${baseURL}/food-analyses`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/json",
        "Idempotency-Key": requestId,
      },
      body: formData as unknown as RequestInit["body"],
    })

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
      result?: FoodAnalysisJob
    }
    if (!response.ok || json.isSuccess === false || !json.result) {
      throw new Error(json.message || `HTTP ${response.status}`)
    }
    return normalizeAnalysisJob(json.result)
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
      if (
        isAxiosError(err) &&
        isUnsupportedV2Status(err.response?.status ?? 0)
      ) {
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
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
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

    if (isMockMode()) {
      const { mockFoodCameraService } = require("./mock/mockFoodCameraService") // eslint-disable-line @typescript-eslint/no-require-imports
      result = await mockFoodCameraService.analyze()
    } else {
      const compressedUri = await compressImage(imageUri)

      const formData = new FormData()
      formData.append("image", {
        uri: compressedUri,
        name: `food_${Date.now()}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob)
      if (requestId) {
        formData.append("requestId", requestId)
      }

      const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL
      const token = await tokenService.getAccessToken()
      const fetchResponse = await fetch(`${baseURL}/food-camera/analyze`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
        },
        body: formData as unknown as RequestInit["body"],
      })
      const json = (await fetchResponse.json()) as {
        isSuccess?: boolean
        message?: string
        result?: FoodCameraAnalyzeResult
      }
      if (!fetchResponse.ok || json?.isSuccess === false) {
        throw new Error(json?.message || `HTTP ${fetchResponse.status}`)
      }
      result = json.result as FoodCameraAnalyzeResult
    }
    return result
  },

  async analyzeText(
    text: string,
    requestId?: string,
  ): Promise<FoodCameraAnalyzeResult> {
    let result: FoodCameraAnalyzeResult

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
          },
          { timeout: ANALYZE_TEXT_TIMEOUT_MS },
        )
        result = response.data.result as FoodCameraAnalyzeResult
      } catch (err) {
        if (isAxiosError(err) && err.response?.data?.message) {
          throw new Error(err.response.data.message)
        }
        throw err
      }
    }
    return result
  },

  async fetchByRequestId(
    requestId: string,
  ): Promise<FoodCameraAnalyzeResult | null> {
    try {
      const response = await api.get("/food-camera/analysis-results", {
        params: { requestId },
      })
      return (response.data.result as FoodCameraAnalyzeResult | null) ?? null
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
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
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
      throw err
    }
  },

  async skipMeal(date: string, mealType: string): Promise<void> {
    try {
      await api.post("/food-camera/skip-meal", { date, mealType })
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
      throw err
    }
  },

  async fetchDateAnalysis(date: string): Promise<DateAnalysisResponse> {
    try {
      const response = await api.get(`/food-camera/date-analysis/${date}`)
      return response.data as DateAnalysisResponse
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
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
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
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
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
      throw err
    }
  },

  async fetchDiaryResult(diaryId: number): Promise<DiaryAnalysisResult> {
    try {
      const response = await api.get(`/food-camera/diaries/${diaryId}/analysis`)
      return response.data.result as DiaryAnalysisResult
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
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
        body,
        { timeout: FOOD_ANALYSIS_UPDATE_TIMEOUT_MS },
      )
      return response.data.result as FoodAnalysisUpdateResult
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
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
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
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
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
      throw err
    }
  },
}
