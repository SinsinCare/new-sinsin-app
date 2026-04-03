import axios, { type AxiosInstance, isAxiosError } from "axios"
import { ApiError } from "./apiError"
import { tokenService } from "./tokenService"
import { logger } from "@/src/lib/logger"

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL

// 인증 불필요 엔드포인트용 (로그인, 회원가입, OTP 등)
export const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
})

// 인증 필요 엔드포인트용
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
})

// isSuccess 체크: HTTP 200이지만 비즈니스 에러인 경우 ApiError throw
function addIsSuccessInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use((response) => {
    const data = response.data
    if (data && typeof data.isSuccess === "boolean" && !data.isSuccess) {
      throw new ApiError(
        data.message || "요청에 실패했습니다.",
        data.code || "UNKNOWN",
        response.status,
      )
    }
    return response
  })
}

// HTTP/네트워크 에러 → ApiError 변환 (가장 마지막에 등록)
function addErrorInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(undefined, (error) => {
    if (isAxiosError(error)) {
      logger.debug(
        "[api]",
        error.config?.method?.toUpperCase(),
        error.config?.url,
        error.response?.status,
        error.message,
      )
    } else {
      logger.debug("[api] response error", error)
    }
    if (error instanceof ApiError) {
      return Promise.reject(error)
    }
    if (!error.response) {
      return Promise.reject(
        new ApiError(
          "네트워크 연결을 확인해주세요.",
          "NETWORK_ERROR",
          undefined,
          true,
        ),
      )
    }
    const { status, data } = error.response
    return Promise.reject(
      new ApiError(
        data?.message || "서버 오류가 발생했습니다.",
        data?.code || `HTTP_${status}`,
        status,
      ),
    )
  })
}

// publicApi: isSuccess 체크 → 에러 변환
addIsSuccessInterceptor(publicApi)
addErrorInterceptor(publicApi)

// api: isSuccess 체크만 (에러 변환은 401 interceptor 이후에 등록)
addIsSuccessInterceptor(api)

// Request interceptor: Bearer 토큰 추가
api.interceptors.request.use(async (config) => {
  const token = await tokenService.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: 401 시 토큰 갱신 후 재시도
let isRefreshing = false
let failedQueue: {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}[] = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve(token!)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const refreshToken = await tokenService.getRefreshToken()
      if (!refreshToken) {
        throw new Error("No refresh token")
      }

      const { data } = await publicApi.post("/auth/tokens/refresh", {
        refreshToken,
      })

      const newAccessToken = data.result.accessToken
      const newRefreshToken = data.result.refreshToken
      await tokenService.setTokens(newAccessToken, newRefreshToken)

      processQueue(null, newAccessToken)
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      // 갱신 실패 → 로그아웃 처리
      await tokenService.clearTokens()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

// api: 401 interceptor 이후에 에러 변환 등록
addErrorInterceptor(api)
