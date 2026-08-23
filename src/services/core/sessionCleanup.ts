import { useAuthStore, useSignupStore, useUserStore } from "@/src/stores"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { isMockUser } from "@/src/config/appConfig"
import { queryClient } from "./queryClient"
import { tokenService } from "./tokenService"

const SOCIAL_REAUTHENTICATION_INTENT_KEY =
  "@sinsin/next-social-login-reauthentication"
const SOCIAL_REAUTHENTICATION_INTENT_VALUE = "required"

export type ClearClientSessionOptions = {
  requireFreshSocialProviderSelection?: boolean
}

export function clearClientSessionState(): void {
  useUserStore.getState().reset()
  useAuthStore.getState().reset()
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
