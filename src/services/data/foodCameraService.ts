import type {
  DateAnalysisResponse,
  DiaryAnalysisResult,
  DiaryExistenceResponse,
  ExtraWaterUpdateResponse,
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
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
        const response = await api.post("/food-camera/analyze-text", {
          text,
          ...(requestId ? { requestId } : {}),
        })
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
}
