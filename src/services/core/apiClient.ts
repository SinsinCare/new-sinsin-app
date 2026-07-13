import axios, { type AxiosInstance, isAxiosError } from "axios"
import { ApiError } from "./apiError"
import { tokenService } from "./tokenService"
import { refreshAccessToken } from "./authSession"
import { logger } from "@/src/lib/logger"
import { reportError } from "../errorService"
import { getBackendUrl } from "../../config/appConfig"

const BASE_URL = getBackendUrl()
const API_TIMEOUT_MS = 10000

// 인증 불필요 엔드포인트용 (로그인, 회원가입, OTP 등)
export const publicApi = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
})

// 인증 필요 엔드포인트용
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT_MS,
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
        false,
        data.fieldErrors,
        data.result,
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
      const code = error.code || "NETWORK_ERROR"
      const message =
        error.message ||
        (code === "ECONNABORTED"
          ? "요청 시간이 초과되었습니다."
          : "네트워크 연결을 확인해주세요.")
      return Promise.reject(new ApiError(message, code, undefined, true))
    }
    const { status, data } = error.response
    if (status !== 401) {
      reportError({
        status_code: status,
        method: error.config?.method?.toUpperCase(),
        path: error.config?.url,
        error_code: data?.code,
        message: data?.message,
      })
    }
    if (data?.fieldErrors) {
      logger.debug("[api] fieldErrors", data.fieldErrors)
    }
    return Promise.reject(
      new ApiError(
        data?.message || "서버 오류가 발생했습니다.",
        data?.code || `HTTP_${status}`,
        status,
        false,
        data?.fieldErrors,
        data?.result,
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

// Response interceptor: 공용 갱신 큐를 통해 401 요청을 한 번만 재시도
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const newAccessToken = await refreshAccessToken()
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  },
)

// api: 401 interceptor 이후에 에러 변환 등록
addErrorInterceptor(api)
