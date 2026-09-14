import { useAuthStore, useSignupStore } from "@/src/stores"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { isMockUser } from "@/src/config/appConfig"
import { queryClient } from "./queryClient"
/*
  배럴(`@/src/features/billing`)이 아니라 **좁은 경로로** 들여온다.

  배럴은 `BillingProvider` → `billingApi` → `services/core` 를 끌고 오는데, 이 파일이
  바로 `services/core` 안에 있다 — 순환이다. 실제로 `apiClient` 가 모듈 로드 시점에
  `getBackendUrl()` 을 부르므로, 그 순환이 닿는 순간 **env 없는 어떤 실행에서도
  세션 정리 모듈이 통째로 죽는다**(테스트 4스위트가 그렇게 넘어갔다).

  `purchasesClient` 는 SDK 와 설정만 본다. 여기서 필요한 것도 그것뿐이다.
*/
import { forgetUser as forgetPurchasesUser } from "@/src/features/billing/purchases/purchasesClient"
import { tokenService } from "./tokenService"

const SOCIAL_REAUTHENTICATION_INTENT_KEY =
  "@sinsin/next-social-login-reauthentication"
const SOCIAL_REAUTHENTICATION_INTENT_VALUE = "required"

export type ClearClientSessionOptions = {
  requireFreshSocialProviderSelection?: boolean
}

export function clearClientSessionState(): void {
  useAuthStore.getState().reset()
  /*
    결제 SDK 도 잊는다.

    **안 하면 같은 기기의 다음 사용자가 앞사람의 구매를 본다.** RevenueCat 은
    `configure` 한 app_user_id 를 로컬에 캐시하고, 로그아웃해도 그 상태가 남는다.
    권한 판정 자체는 서버가 하므로 실제로 프리미엄이 열리지는 않지만, 페이월이
    "이미 구독 중" 으로 뜨는 등 화면이 앞사람 것을 보여 준다.

    `void` 로 흘린다 — 세션 정리가 SDK 응답을 기다릴 이유가 없고, 실패해도
    (이미 익명이면 SDK 가 던진다) 정리는 계속돼야 한다.
  */
  void forgetPurchasesUser()
  /*
    가입 중간 상태도 같이 버린다.

    `signupStore` 는 온보딩을 끝까지 마쳐야 비워졌다. 그래서 소셜로 가입한 뒤 로그아웃하고
    다시 `회원가입` 으로 들어오면 이메일 인증(`signupToken`)·비밀번호가 빈 채로 남은 스토어를
    그대로 물려받았고, 여섯 스텝을 다 채운 뒤 마지막에 서버가 400 을 돌려줬다
    (2026-08-19: 화면에는 마지막 스텝인 "알게 된 경로" 아래에 오류가 떠서 경로 입력이
    고장난 것처럼 보였다). 세션이 끝나면 가입 중이던 흔적도 끝난 것이다.
  */
  useSignupStore.getState().reset()
  queryClient.clear()
}

export async function clearClientSession(
  options: ClearClientSessionOptions = {},
): Promise<void> {
  if (options.requireFreshSocialProviderSelection) {
    try {
      await AsyncStorage.setItem(
        SOCIAL_REAUTHENTICATION_INTENT_KEY,
        SOCIAL_REAUTHENTICATION_INTENT_VALUE,
      )
    } catch {
      // A storage failure must not leave an invalid client session active.
    }
  }
  try {
    await tokenService.clearTokens()
  } finally {
    // SecureStore 삭제 자체가 실패해도 메모리 사용자 상태와 민감 쿼리 캐시는 남기지 않는다.
    clearClientSessionState()
  }
}

/**
 * 서버가 401 로 세션을 끝냈을 때의 정리. **목 인증에서는 아무것도 지우지 않는다.**
 *
 * 목 로그인은 서버가 모르는 사용자라 refresh 가 반드시 실패하고, 목이 안 걸린 엔드포인트는
 * 전부 401 로 온다. 거기서 세션을 지우면 앱을 켠 직후 로그인 화면으로 튕겨 **목 모드로는 앱
 * 안쪽을 아예 못 본다** — 2026-08-17 에 기록 시트를 손으로 확인하려다 여기서 막혔다. 목이 안
 * 걸린 화면은 401 을 그냥 에러로 받아 빈 상태를 그리면 되고, 그게 "서버 없이도 화면을 본다"는
 * 목 모드의 목적에 맞다. `useMockAuth` 는 gitignored env 로만 켜지므로 출시 빌드에는 이 분기가
 * 없다.
 *
 * 사용자가 직접 끝내는 세션(로그아웃·탈퇴)은 그대로 `clearClientSession` 을 쓴다.
 */
export async function clearClientSessionOn401(): Promise<void> {
  if (isMockUser()) return
  await clearClientSession({ requireFreshSocialProviderSelection: true }).catch(
    () => undefined,
  )
}
