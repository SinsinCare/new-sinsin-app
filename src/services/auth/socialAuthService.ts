import { AppState, Platform } from "react-native"
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin"
import * as AppleAuthentication from "expo-apple-authentication"
import {
  isKakaoTalkLoginAvailable,
  login as kakaoLogin,
} from "@react-native-kakao/user"
import { initializeKakaoSDK, getKeyHashAndroid } from "@react-native-kakao/core"
import { logger } from "@/src/lib/logger"
import type { SocialProvider } from "@/src/types"
import {
  consumeSocialReauthenticationIntent,
  isSocialReauthenticationRequired,
} from "./authService"
import { KAKAO_NATIVE_APP_KEY } from "@/src/config/kakaoConfig"

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
 * 카카오판 "이 빌드의 설정이 서버(카카오 콘솔)와 다르다".
 *
 * 안드로이드에서는 대개 **이 설치본을 서명한 키의 해시가 콘솔에 미등록**일 때 난다 —
 * 같은 앱이라도 debug/업로드/Play 재서명 세 해시가 전부 다르다(아래 keyHash 주석).
 * 웹 동의 화면까지는 정상으로 끝나고 SDK 토큰 발급에서 거절되므로, 사용자에게는
 * "카카오 로그인을 다 했는데 안 된다" 로 보인다(2026-08-25 실기기 보고).
 *
 * 구글의 `DEVELOPER_ERROR` 와 똑같은 이유로 번역이 필요하다: 날것으로 던지면
 * `isApiErrorLike` 도 오프라인 판정도 아니라서 마지막 폴백(`transport.unknown`,
 * "지금은 이 작업을 마치지 못했어요")으로 떨어진다 — 사용자가 고칠 수 없는 문제를
 * "잠시 뒤 다시 시도" 로 안내하는, 2026-08-04 구글 QA 와 동일한 오진이다.
 *
 * `Misconfigured` 는 RNCKakao 가 카카오 SDK 의 ClientError(reason=Misconfigured)를
 * 넘겨주는 코드이고(2026-08-24 에뮬레이터 실측: 미등록 해시에서
 * `{code:"Misconfigured", message:"Android keyHash validation failed."}`),
 * KOE 는 kauth 오류 페이지 계열이다.
 */
function isKakaoMisconfiguredError(e: unknown): boolean {
  const err = e as { code?: unknown; message?: unknown }
  const code = typeof err?.code === "string" ? err.code : ""
  const message = typeof err?.message === "string" ? err.message : ""
  return (
    code === "Misconfigured" ||
    message.includes("keyHash") ||
    message.includes("KOE")
  )
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

/*
  안드로이드 카카오 로그인의 고착 탈출구.

  카카오 인증 화면(커스텀 탭 또는 카톡 앱)에서 **완료하지도 닫지도 않고** 제스처·최근앱
  으로 그냥 앱에 돌아오면, `AuthCodeHandlerActivity` 가 결과를 전달하지 못한 채 파괴되고
  네이티브 `login()` 프라미스가 영원히 안 풀린다(2026-08-24 에뮬레이터 릴리즈 빌드로
  재현 — 로그캣에서 결과 없는 activity 파괴 확인, 90초+ 미정산). 그러면
  `socialLoading` 이 영구 true 로 남아 "Logging you in…" 오버레이가 로그인 화면 전체를
  잠근다 — 사용자에게는 "카카오 로그인이 안 된다"로 보인다. 탭의 ✕ 로 닫는 경로는
  SDK 가 취소를 정상 전달하므로, 깨진 것은 이 복귀 경로 하나다.

  처방은 V2BottomSheet 의 마감시한과 같은 계열이다: 앱이 포그라운드로 돌아온 뒤
  유예시간 안에 프라미스가 정산되지 않으면 취소로 판정한다. 유예를 두는 이유 —
  **정상 성공도 포그라운드에서 끝난다**: 리다이렉트가 오면 앱이 전면으로 오고 그 뒤에
  토큰 교환(네트워크)이 돈다. 유예가 짧으면 느린 네트워크의 성공을 자르므로 넉넉히
  잡는다. 다시 인증 화면으로 나가면(background) 시계를 멈춘다.

  취소(`code: "Cancelled"`)로 판정하는 것은 폴백이 아니라 사실의 기술이다 — 사용자는
  인증을 끝내지 않고 돌아왔다. `isUserCancelledError` 가 이 코드를 취소로 분류해
  조용히 버튼이 풀린다.
*/
const KAKAO_RETURN_SETTLE_GRACE_MS = 10_000

function withKakaoReturnDeadline<T>(promise: Promise<T>): Promise<T> {
  if (Platform.OS !== "android") return promise
  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let settled = false
    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (settled) return
      if (state !== "active") {
        // 다시 인증 화면으로 나갔다 — 사용자가 그쪽에서 진행 중이므로 시계를 멈춘다.
        clearTimer()
        return
      }
      clearTimer()
      timer = setTimeout(() => {
        if (settled) return
        settled = true
        subscription.remove()
        logger.error(
          "[Kakao SignIn] 인증 화면에서 복귀 후 미정산 — 취소로 처리",
          { graceMs: KAKAO_RETURN_SETTLE_GRACE_MS },
        )
        reject(
          Object.assign(
            new Error("kakao login unresolved after returning to app"),
            { code: "Cancelled" },
          ),
        )
      }, KAKAO_RETURN_SETTLE_GRACE_MS)
    })
    const finalize = () => {
      settled = true
      clearTimer()
      subscription.remove()
    }
    promise.then(
      (value) => {
        if (settled) return
        finalize()
        resolve(value)
      },
      (error: unknown) => {
        if (settled) return
        finalize()
        reject(error)
      },
    )
  })
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

  /*
    안드로이드에서 카카오 로그인이 막히는 원인은 거의 언제나 **키 해시 미등록**이다.
    그런데 이 빌드의 키 해시가 무엇인지 밖에서는 알 수 없다 —

      · EAS 내부 배포(APK)  → 업로드 키로 서명된다
      · Play 설치본          → 구글이 **Play 앱 서명 키로 다시 서명**한다 (다른 해시)
      · 로컬 디버그 빌드     → debug.keystore (또 다른 해시)

    같은 앱인데 셋의 해시가 전부 다르고, 셋 다 카카오 콘솔에 등록돼 있어야 한다.
    종전에는 이 값을 **구해 놓고 버렸다**(`await getKeyHashAndroid()` 뒤 결과 미사용).
    그래서 "안드에서 카카오 로그인이 안 된다"는 보고가 와도 어느 해시가 빠졌는지
    아무도 답할 수 없었고, 매번 키스토어를 뒤져 추측해야 했다.

    값을 로그로 남긴다. 실패 로그에도 함께 실어서, QA 가 문제가 난 **바로 그 기기**의
    해시를 그대로 읽어 콘솔에 넣을 수 있게 한다. 비밀이 아니다 — 인증서 공개키의
    지문이고 APK 를 받은 사람이면 누구나 계산할 수 있다.
  */
  let androidKeyHash: string | null = null
  if (Platform.OS === "android") {
    try {
      androidKeyHash = (await getKeyHashAndroid()) ?? null
      logger.debug("[Kakao SignIn] Android 키 해시", androidKeyHash)
    } catch (e) {
      logger.error("[Kakao SignIn] keyHash 조회 실패", e)
    }
  }

  let token
  try {
    if (requiresReauthentication) {
      token = await withKakaoReturnDeadline(
        kakaoLogin({
          useKakaoAccountLogin: true,
          prompts: ["SelectAccount"],
        }),
      )
    } else {
      let talkAvailable = false
      try {
        talkAvailable = await isKakaoTalkLoginAvailable()
      } catch (availabilityError) {
        // native login()도 같은 가용성 판정을 하므로 조회 실패만으로 로그인을 막지 않는다.
        logger.debug(
          "[Kakao SignIn] KakaoTalk 가용성 조회 실패",
          availabilityError,
        )
      }

      try {
        token = await withKakaoReturnDeadline(kakaoLogin())
      } catch (talkError) {
        if (!talkAvailable || isUserCancelledError(talkError)) throw talkError
        logger.debug(
          "[Kakao SignIn] KakaoTalk 로그인 실패 — Account 로그인으로 1회 전환",
          { fallback: "account" },
        )
        token = await withKakaoReturnDeadline(
          kakaoLogin({ useKakaoAccountLogin: true }),
        )
      }
    }
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
      // 실패한 그 기기의 키 해시. 미등록이면 이 값을 카카오 콘솔에 넣으면 끝난다.
      androidKeyHash,
    })
    // 구글 DEVELOPER_ERROR 와 같은 번역 — 근거는 isKakaoMisconfiguredError 머리말.
    if (isKakaoMisconfiguredError(e)) {
      throw createSocialConfigError("kakao")
    }
    throw e
  }

  const accessToken =
    typeof token.accessToken === "string" ? token.accessToken.trim() : ""
  if (!accessToken) {
    logger.error("[Kakao SignIn] accessToken 없음")
    throw Object.assign(
      new Error(
        "카카오에서 로그인 정보를 받지 못했어요. 다시 로그인해 주세요.",
      ),
      { code: "SOCIAL_PROVIDER_TOKEN_MISSING" },
    )
  }

  if (requiresReauthentication) {
    await consumeSocialReauthenticationIntent()
  }

  return {
    provider: "kakao",
    // 백엔드 필드명은 provider 공용 `idToken` 이지만, Kakao 계약은 access token 이다.
    idToken: accessToken,
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
