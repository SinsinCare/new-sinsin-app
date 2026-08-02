/**
 * 라우터가 URL 을 보기 **전에** 거치는 관문.
 *
 * ## 왜 필요한가 — 리로드하면 그때 그 화면이 다시 뜨는 이유
 *
 * iOS 가 앱에 URL 을 넘기면 `expo-linking` 이 그것을 **네이티브 싱글턴**
 * (`ExpoLinkingRegistry.shared.initialURL`)에 담는다. JS 리로드는 JS VM 만 다시
 * 시작하므로 그 값은 살아남고, expo-router 는 앱이 뜰 때마다 그것을 시작 지점으로
 * 읽는다. 지우는 곳은 `expo-dev-launcher` 가 런처로 돌아갈 때 하나뿐이라
 * **평범한 리로드로는 지워지지 않는다.**
 *
 * 그래서 딥링크든 소셜 로그인 콜백이든 한 번 들어온 URL 이 리로드마다 되살아난다.
 * 자세한 경위와 판정 표는 `src/shared/navigation/entryIntent.ts` 머리말에 있다.
 *
 * ## `null` 은 "홈으로" 가 아니라 "이 URL 로는 아무 데도 안 간다"
 *
 * expo-router 는 falsy 반환을 그렇게 읽는다 — 부팅이면 `/`(진입 라우트)에서
 * 시작하고, 실행 중이면 화면을 옮기지 않는다. 홈으로 **보내지** 않는 것이 중요하다:
 * 카카오 로그인 콜백이 돌아온 순간에 홈으로 튕기면 로그인 흐름이 끊긴다.
 */
// 배럴(`@/src/shared/navigation`)이 아니라 파일을 직접 집는다 — 이 모듈은 라우터보다
// 먼저 로드되므로 훅 모듈까지 딸려 들어올 이유가 없다.
import { isRoutableEntryUrl } from "@/src/shared/navigation/entryIntent"

export function redirectSystemPath({
  path,
}: {
  path: string
  initial: boolean
}): string | null {
  try {
    return isRoutableEntryUrl(path) ? path : null
  } catch {
    // 여기서 던지면 앱이 아예 뜨지 않는다. 판단이 안 되면 라우팅하지 않는 쪽으로.
    return null
  }
}
