import { Platform } from "react-native"
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin"
import * as AppleAuthentication from "expo-apple-authentication"
import { logger } from "@/src/lib/logger"

export interface SocialAuthResult {
  provider: "google" | "apple"
  idToken: string
  email: string | null
  displayName: string | null
}

GoogleSignin.configure({
  iosClientId:
    "87899379852-eo6mf97djcrckpbqc748vcdcbl2m3ls4.apps.googleusercontent.com",
})

export async function signInWithGoogle(): Promise<SocialAuthResult> {
  logger.debug("[Google SignIn] 시작")
  try {
    await GoogleSignin.hasPlayServices()
    logger.debug("[Google SignIn] hasPlayServices 통과")
  } catch (e) {
    logger.error("[Google SignIn] hasPlayServices 실패", e)
    throw e
  }

  let response
  try {
    response = await GoogleSignin.signIn()
    logger.debug("[Google SignIn] signIn 완료")
  } catch (e) {
    logger.error("[Google SignIn] signIn 실패", e)
    if (isErrorWithCode(e)) {
      logger.debug("[Google SignIn] 에러 코드:", e.code)
    }
    throw e
  }

  if (!response.data?.idToken) {
    logger.error("[Google SignIn] idToken 없음")
    throw new Error("Google 로그인에서 ID 토큰을 받지 못했습니다.")
  }

  logger.debug("[Google SignIn] 성공")
  return {
    provider: "google",
    idToken: response.data.idToken,
    email: response.data.user.email ?? null,
    displayName: response.data.user.name ?? null,
  }
}

export async function signInWithApple(): Promise<SocialAuthResult> {
  logger.debug("[Apple SignIn] 시작")
  if (Platform.OS !== "ios") {
    throw new Error("Apple 로그인은 iOS에서만 지원됩니다.")
  }

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
    logger.error("[Apple SignIn] signInAsync 실패", e)
    if (e instanceof Error && "code" in e) {
      logger.debug("[Apple SignIn] 에러 코드:", (e as { code: string }).code)
    }
    throw e
  }

  if (!credential.identityToken) {
    logger.error("[Apple SignIn] identityToken 없음")
    throw new Error("Apple 로그인에서 ID 토큰을 받지 못했습니다.")
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
  return false
}
