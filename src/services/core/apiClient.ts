import { create, type AxiosInstance, isAxiosError } from "axios"
import { Platform } from "react-native"
import { ApiError } from "./apiError"
import { tokenService } from "./tokenService"
import { createSessionExpiredError, refreshAccessToken } from "./authSession"
import { clearClientSessionOn401 } from "./sessionCleanup"
import { logger } from "@/src/lib/logger"
import { reportError } from "../errorService"
import { getBackendUrl } from "../../config/appConfig"
import { getMobilePolicyRuntimeInfo } from "../../config/runtimeInfo"
import { getAppLanguage } from "@/src/i18n"

const BASE_URL = getBackendUrl()
const API_TIMEOUT_MS = 10000

function getStatusFallbackMessage(status?: number): string {
  const isEnglish = getAppLanguage() === "en"
  if (status === 404) {
    return isEnglish
      ? "We couldn’t find that. Go back and try again."
      : "요청한 내용을 찾지 못했어요. 이전 화면에서 다시 시작해 주세요."
  }
  if (status === 409) {
    return isEnglish
      ? "This may already be updated. Refresh the screen to check."
      : "이미 반영된 내용일 수 있어요. 화면을 새로고침해 확인해 주세요."
  }
  if (status === 429) {
    return isEnglish
      ? "We’re getting a lot of requests right now. Try again in a moment."
      : "이용이 잠시 몰리고 있어요. 잠시 뒤 다시 해 주세요."
  }
  if (status && status >= 500) {
    // 연결 문구를 쓰지 않는다. 5xx 는 우리 잘못이고, 사용자가 와이파이를 확인하러
    // 가게 만들면 안 된다. 연결 문구는 응답 자체가 없을 때(isNetworkError)만 쓴다.
    return isEnglish
      ? "Something went wrong on our side. Try again in a moment."
      : "서비스에 문제가 생겼어요. 잠시 후 다시 해 주세요."
  }
  return isEnglish
    ? "Check what you entered and try again."
    : "입력한 내용을 다시 확인해 주세요."
}

/**
 * 서버 봉투의 문구를 그대로 쓸지 판단한다.
 *
 * 코드가 함께 왔다면 백엔드가 큐레이션한 문구다 — 언어까지 맞춰 보내 주므로 그대로 쓴다.
 * 문구를 정규식으로 훑어 판단하면 두 방향 모두 틀린다. 실제로 그랬다:
 *  - `/(?:HTTP|API|…)/i` 의 `API` 가 경계 없이 걸려서 the**rapi**st·**rapi**d·c**api**tal
 *    같은 평범한 영어 단어를 품은 안내가 통째로 사라졌다.
 *  - `givesNoDirection` 은 한국어 문형만 알아서 한국어 13개를 지우고 영어는 0개를 지웠다.
 *    같은 뜻의 문구가 언어에 따라 다르게 취급됐다.
 */
function getSafeApiMessage(
  message: unknown,
  status?: number,
  code?: unknown,
): string {
  if (typeof message !== "string" || !message.trim()) {
    return getStatusFallbackMessage(status)
  }

  const isCurated =
    typeof code === "string" &&
    code.length > 0 &&
    code !== "UNKNOWN" &&
    !/^HTTP_\d+$/.test(code)
  if (isCurated) return message

  // 코드 없이 온 문구만 검사한다. 약어는 경계를 두고 대소문자를 지킨다.
  const exposesImplementation =
    /\b(?:HTTP|API|SQL)\b/.test(message) ||
    /\b(?:exception|traceback|database|undefined)\b/i.test(message) ||
    /axios|status code \d|\b\d+ms\b/i.test(message) ||
    /서버|엔드포인트|토큰/.test(message)
  const givesNoDirection =
    /(?:오류|에러|문제)가 발생|알 수 없는 오류|요청에 실패했습니다/.test(
      message,
    ) ||
    /\b(?:unknown|unexpected|internal)\s+error\b/i.test(message) ||
    /\bsomething went wrong\b/i.test(message)

  return exposesImplementation || givesNoDirection
    ? getStatusFallbackMessage(status)
    : message
}

// 인증 불필요 엔드포인트용 (로그인, 회원가입, OTP 등)
export const publicApi = create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
})

// 인증 필요 엔드포인트용
export const api = create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
})

function addLanguageInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    config.headers["Accept-Language"] =
      getAppLanguage() === "en" ? "en-US" : "ko-KR"
    return config
  })
}

let cachedRuntimeHeaders: Readonly<Record<string, string>> | null = null

function getRuntimeHeaders(): Readonly<Record<string, string>> {
  if (cachedRuntimeHeaders) return cachedRuntimeHeaders
  const runtime = getMobilePolicyRuntimeInfo()
  const requestPlatform =
    Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : "web"
  cachedRuntimeHeaders = {
    "X-App-Version": runtime.appVersion,
    "X-App-Build": String(runtime.buildNumber),
    "X-App-Env": runtime.environment,
    // mobile-policy는 네이티브 두 플랫폼만 다루지만 API client는 Expo web도 돈다.
    "X-App-Platform": requestPlatform,
  }
  return cachedRuntimeHeaders
}

function addRuntimeInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    for (const [name, value] of Object.entries(getRuntimeHeaders())) {
      config.headers[name] = value
    }
    return config
  })
}

addLanguageInterceptor(publicApi)
addLanguageInterceptor(api)
addRuntimeInterceptor(publicApi)
addRuntimeInterceptor(api)

// isSuccess 체크: HTTP 200이지만 비즈니스 에러인 경우 ApiError throw
function addIsSuccessInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use((response) => {
    const data = response.data
    if (data && typeof data.isSuccess === "boolean" && !data.isSuccess) {
      throw new ApiError(
        getSafeApiMessage(data.message, response.status, data.code),
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
      const isEnglish = getAppLanguage() === "en"
      const message =
        code === "ECONNABORTED"
          ? isEnglish
            ? "The response is taking longer than expected. Try again in a moment."
            : "응답이 늦어지고 있어요. 잠시 후 다시 해 주세요."
          : isEnglish
            ? "Check your internet connection and try again."
            : "인터넷 연결을 확인한 뒤 다시 해 주세요."
      return Promise.reject(new ApiError(message, code, undefined, true))
    }
    const { status, data } = error.response
    if (status >= 500) {
      void reportError({
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
        getSafeApiMessage(data?.message, status, data?.code),
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
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error)
    }

    /*
      401 이 전부 "세션이 죽었다" 는 아니다. `PATCH /user/password` 는 현재 비밀번호가
      틀리면 `LOGIN_ERROR_001`(401) 을 준다 — 세션은 멀쩡한데 이 갈래로 들어오면 토큰을
      갱신하고 재시도한 뒤(또 401) 세션을 지워 **오타 한 번에 로그아웃**됐다(2026-09-01
      실측). 서버가 코드를 붙여 보냈고 그것이 토큰 오류(`TOKEN_ERROR_*`)가 아니면 세션
      문제가 아니므로 그대로 올린다 — 화면이 자기 말로 답한다. 코드가 없는 401(게이트웨이
      등)은 예전처럼 갱신을 시도한다.
    */
    const responseCode: unknown = error.response?.data?.code
    if (
      typeof responseCode === "string" &&
      responseCode !== "" &&
      !responseCode.startsWith("TOKEN_ERROR_")
    ) {
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      // 목 인증에서는 지우지 않는다 — clearClientSessionOn401 머리말.
      await clearClientSessionOn401()
      return Promise.reject(createSessionExpiredError())
    }

    originalRequest._retry = true
    originalRequest.headers ??= {}

    try {
      const currentAccessToken = await tokenService.getAccessToken()
      const sentAuthorization =
        typeof originalRequest.headers?.get === "function"
          ? originalRequest.headers.get("Authorization")
          : originalRequest.headers?.Authorization
      if (
        currentAccessToken &&
        sentAuthorization !== `Bearer ${currentAccessToken}`
      ) {
        originalRequest.headers.Authorization = `Bearer ${currentAccessToken}`
        return api(originalRequest)
      }

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
