import { Platform } from "react-native"
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin"
import * as AppleAuthentication from "expo-apple-authentication"

export interface SocialAuthResult {
  provider: "google" | "apple"
  idToken: string
  email: string | null
  displayName: string | null
}

GoogleSignin.configure({
  iosClientId:
    "926672692459-bu9prea2bmp18gmbmmjv6ul3290kvu7a.apps.googleusercontent.com",
})

export async function signInWithGoogle(): Promise<SocialAuthResult> {
  console.log("[Google SignIn] 시작")
  try {
    await GoogleSignin.hasPlayServices()
    console.log("[Google SignIn] hasPlayServices 통과")
  } catch (e) {
    console.error("[Google SignIn] hasPlayServices 실패:", e)
    throw e
  }

  let response
  try {
    response = await GoogleSignin.signIn()
    console.log("[Google SignIn] signIn 응답:", JSON.stringify(response, null, 2))
  } catch (e) {
    console.error("[Google SignIn] signIn 실패:", e)
    if (isErrorWithCode(e)) {
      console.error("[Google SignIn] 에러 코드:", e.code)
    }
    throw e
  }

  if (!response.data?.idToken) {
    console.error("[Google SignIn] idToken 없음. response.data:", response.data)
    throw new Error("Google 로그인에서 ID 토큰을 받지 못했습니다.")
  }

  console.log("[Google SignIn] 성공 - email:", response.data.user.email)
  return {
    provider: "google",
    idToken: response.data.idToken,
    email: response.data.user.email ?? null,
    displayName: response.data.user.name ?? null,
  }
}

export async function signInWithApple(): Promise<SocialAuthResult> {
  console.log("[Apple SignIn] 시작")
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
    console.log("[Apple SignIn] credential:", JSON.stringify({
      user: credential.user,
      email: credential.email,
      fullName: credential.fullName,
      hasIdentityToken: !!credential.identityToken,
      authorizationCode: credential.authorizationCode ? "있음" : "없음",
    }, null, 2))
  } catch (e) {
    console.error("[Apple SignIn] signInAsync 실패:", e)
    if (e instanceof Error) {
      console.error("[Apple SignIn] 에러 메시지:", e.message)
      if ("code" in e) {
        console.error("[Apple SignIn] 에러 코드:", (e as { code: string }).code)
      }
    }
    throw e
  }

  if (!credential.identityToken) {
    console.error("[Apple SignIn] identityToken 없음")
    throw new Error("Apple 로그인에서 ID 토큰을 받지 못했습니다.")
  }

  const displayName =
    credential.fullName?.givenName && credential.fullName?.familyName
      ? `${credential.fullName.familyName}${credential.fullName.givenName}`
      : null

  console.log("[Apple SignIn] 성공 - email:", credential.email, "displayName:", displayName)
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
