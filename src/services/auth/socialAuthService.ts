import { Platform } from "react-native"
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin"
import * as AppleAuthentication from "expo-apple-authentication"
import { login as kakaoLogin } from "@react-native-kakao/user"
import { initializeKakaoSDK, getKeyHashAndroid } from "@react-native-kakao/core"
import { logger } from "@/src/lib/logger"
import type { SocialProvider } from "@/src/types"
import {
  consumeSocialReauthenticationIntent,
  isSocialReauthenticationRequired,
} from "./authService"

const KAKAO_NATIVE_APP_KEY = "709c22f6c6227095a316851f1f902189"
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
  "87899379852-pepl4lt3g4k4hunof8h7rvb4hougrskt.apps.googleusercontent.com"
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
  "87899379852-eo6mf97djcrckpbqc748vcdcbl2m3ls4.apps.googleusercontent.com"

export interface SocialAuthResult {
  provider: SocialProvider
  idToken: string
  email: string | null
  displayName: string | null
}

function createGoogleCancelledError() {
  return Object.assign(new Error("Google 로그인을 취소했어요."), {
    code: statusCodes.SIGN_IN_CANCELLED,
  })
}

/**
 * 구글의 `DEVELOPER_ERROR` — **앱 설정이 서버(GCP)에 등록된 것과 다르다**는 뜻이다.
 * 안드로이드에서는 대개 이 빌드를 서명한 키의 SHA-1 지문이 OAuth 클라이언트에
 * 등록돼 있지 않을 때 난다. 계정 선택창까지는 시스템이 띄우므로 **로그인이 되는
 * 것처럼 보이다가** 그 다음에 실패한다.
 *
 * 안드로이드 네이티브 모듈은 코드를 숫자 문자열로 준다
 * (`String.valueOf(CommonStatusCodes.DEVELOPER_ERROR)` = `"10"`). 메시지 쪽도 함께
 * 보는 이유는 iOS·버전에 따라 이름 문자열로 오는 경우가 있어서다.
 */
function isGoogleDeveloperError(e: unknown): boolean {
  const err = e as { code?: unknown; message?: unknown }
  const code = typeof err?.code === "string" ? err.code : ""
  const message = typeof err?.message === "string" ? err.message : ""
  return code === "10" || message.includes("DEVELOPER_ERROR")
}

/**
 * 설정 오류를 **설정 오류라고** 말하는 에러.
 *
 * 이걸 세우지 않으면 SDK 원본 에러(`{message, code}`)가 그대로 올라가는데, 그 모양이
 * `isApiErrorLike` 를 통과해 "응답 없음 = 오프라인" 으로 분류됐다. 와이파이가 멀쩡한
 * 사용자에게 "와이파이를 확인해 주세요" 라고 말하는, 사용자가 절대 고칠 수 없는
 * 안내였다(2026-08-04 QA). 코드는 카탈로그(`errors.json`)가 문구를 갖는 열쇠다.
 */
function createSocialConfigError(provider: "google" | "kakao") {
  return Object.assign(
    new Error(`${provider} sign-in is not configured for this build`),
    { code: "SOCIAL_CONFIG_ERROR" },
  )
}

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
})

async function clearGoogleSigninSession(): Promise<void> {
  await GoogleSignin.signOut()
  logger.debug("[Google SignIn] 기존 Google 세션 초기화 완료")
}

export async function signInWithGoogle(): Promise<SocialAuthResult> {
  logger.debug("[Google SignIn] 시작")
  const requiresReauthentication = await isSocialReauthenticationRequired()
  try {
    await GoogleSignin.hasPlayServices()
    logger.debug("[Google SignIn] hasPlayServices 통과")
  } catch (e) {
    logger.error("[Google SignIn] hasPlayServices 실패", e)
    throw e
  }

  if (requiresReauthentication) {
    try {
      await clearGoogleSigninSession()
    } catch (e) {
      logger.error("[Google SignIn] 기존 Google 세션 초기화 실패", e)
      throw e
    }
  }

  let response
  try {
    response = await GoogleSignin.signIn()
  } catch (e) {
    // 사용자가 창을 닫은 것은 정상 흐름입니다. error 로 찍으면 개발 중 LogBox 가 뜨고
    // 운영에서는 에러 로그로 집계돼 실제 장애를 가립니다.
    if (isUserCancelledError(e)) {
      logger.debug("[Google SignIn] 사용자가 취소")
    } else {
      logger.error("[Google SignIn] signIn 실패", e)
      if (isErrorWithCode(e)) {
        logger.debug("[Google SignIn] 에러 코드:", e.code)
      }
      if (isGoogleDeveloperError(e)) {
        throw createSocialConfigError("google")
      }
    }
    throw e
  }

  if (isCancelledResponse(response)) {
    logger.debug("[Google SignIn] 사용자가 취소")
    throw createGoogleCancelledError()
  }

  if (requiresReauthentication) {
    await consumeSocialReauthenticationIntent()
  }

  logger.debug("[Google SignIn] signIn 완료")
  let idToken = response.data.idToken
  if (!idToken) {
    try {
      idToken = (await GoogleSignin.getTokens()).idToken
      logger.debug("[Google SignIn] getTokens idToken 회수", {
        hasIdToken: !!idToken,
      })
    } catch (e) {
      logger.error("[Google SignIn] getTokens 실패", e)
    }
  }

  if (!idToken) {
    logger.error("[Google SignIn] idToken 없음")
    throw new Error(
      "Google에서 로그인 정보를 받지 못했어요. 다시 로그인해 주세요.",
    )
  }

  logger.debug("[Google SignIn] 성공")
  return {
    provider: "google",
    idToken,
    email: response.data.user.email ?? null,
    displayName: response.data.user.name ?? null,
  }
}

export async function signInWithApple(): Promise<SocialAuthResult> {
  logger.debug("[Apple SignIn] 시작")
  if (Platform.OS !== "ios") {
    throw new Error("Apple 로그인은 iPhone에서 이용할 수 있어요.")
  }

  const requiresReauthentication = await isSocialReauthenticationRequired()
  let credential
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
    logger.debug("[Apple SignIn] credential 수신", !!credential.identityToken)
  } catch (e) {
    if (isUserCancelledError(e)) {
      logger.debug("[Apple SignIn] 사용자가 취소")
    } else {
      logger.error("[Apple SignIn] signInAsync 실패", e)
      if (e instanceof Error && "code" in e) {
        logger.debug("[Apple SignIn] 에러 코드:", (e as { code: string }).code)
      }
    }
    throw e
  }

  if (!credential.identityToken) {
    logger.error("[Apple SignIn] identityToken 없음")
    throw new Error(
      "Apple에서 로그인 정보를 받지 못했어요. 다시 로그인해 주세요.",
    )
  }

  if (requiresReauthentication) {
    await consumeSocialReauthenticationIntent()
  }

  const displayName =
    credential.fullName?.givenName && credential.fullName?.familyName
      ? `${credential.fullName.familyName}${credential.fullName.givenName}`
      : null

  logger.debug("[Apple SignIn] 성공")
  return {
    provider: "apple",
    idToken: credential.identityToken,
    email: credential.email ?? null,
    displayName,
  }
}

export async function signInWithKakao(): Promise<SocialAuthResult> {
  logger.debug("[Kakao SignIn] 시작")
  const requiresReauthentication = await isSocialReauthenticationRequired()

  try {
    await initializeKakaoSDK(KAKAO_NATIVE_APP_KEY)
    logger.debug("[Kakao SignIn] SDK 초기화 완료")
  } catch (e) {
    logger.error("[Kakao SignIn] SDK 초기화 실패", e)
    throw e
  }

  if (Platform.OS === "android") {
    try {
      await getKeyHashAndroid()
      logger.debug("[Kakao SignIn] Android 키 해시 확인 완료")
    } catch (e) {
      logger.error("[Kakao SignIn] keyHash 조회 실패", e)
    }
  }

  let token
  try {
    token = requiresReauthentication
      ? await kakaoLogin({
          useKakaoAccountLogin: true,
          prompts: ["SelectAccount"],
        })
      : await kakaoLogin()
    logger.debug("[Kakao SignIn] login 완료", {
      hasAccessToken: !!token.accessToken,
      hasIdToken: !!token.idToken,
    })
  } catch (e: unknown) {
    if (isUserCancelledError(e)) {
      logger.debug("[Kakao SignIn] 사용자가 취소")
      throw e
    }
    const err = e as Record<string, unknown>
    logger.error("[Kakao SignIn] login 실패", {
      name: e instanceof Error ? e.name : "unknown",
      code: err?.code,
      domain: err?.domain,
    })
    throw e
  }

  if (requiresReauthentication) {
    await consumeSocialReauthenticationIntent()
  }

  return {
    provider: "kakao",
    idToken: token.accessToken,
    email: null,
    displayName: null,
  }
}

const socialSignInByProvider: Record<
  SocialProvider,
  () => Promise<SocialAuthResult>
> = {
  google: signInWithGoogle,
  apple: signInWithApple,
  kakao: signInWithKakao,
}

export function signInWithSocialProvider(
  provider: SocialProvider,
): Promise<SocialAuthResult> {
  return socialSignInByProvider[provider]()
}

export function isUserCancelledError(error: unknown): boolean {
  // Google cancel
  if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
    return true
  }
  // Apple cancel
  if (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "ERR_REQUEST_CANCELED"
  ) {
    return true
  }
  // Kakao cancel (사용자가 카카오 로그인 화면을 닫음)
  // SDK 가 code: "Cancelled" 를 주므로 이걸 먼저 봅니다.
  // 아래 메시지 검사는 문구가 바뀌었을 때를 위한 보조 수단인데,
  // "cancel" 이 들어간 무관한 에러까지 삼킬 수 있어 코드 검사를 우선합니다.
  if (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: unknown }).code === "Cancelled"
  ) {
    return true
  }
  if (
    error instanceof Error &&
    (error.message.includes("cancel") || error.message.includes("Cancel"))
  ) {
    return true
  }
  return false
}
