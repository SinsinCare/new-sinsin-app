/**
 * 같은 화면이 **겹쳐 쌓이는 것**을 막는 빗장. `useAppRouter().push` 가 모든 push 를
 * 여기로 통과시킨다.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 실측된 결함
 *
 * 글·레시피 카드처럼 우→좌로 밀려 들어오는 상세 화면을 **전환이 끝나기 전에 여러 번
 * 누르면** 같은 상세가 여러 장 쌓인다. 한 번 눌렀는데도 그런 일이 있다 — Pressable
 * 이 두 번 발화하거나(안드로이드 빠른 탭·재마운트), 같은 핸들러가 두 경로에서
 * 호출되는 경우다. 사용자는 뒤로가기를 여러 번 눌러야 목록으로 돌아오고, 그 사이
 * 화면이 같은 것을 두 번 보여 준다.
 *
 * ■ 규칙: 같은 href 는 짧은 창 안에서 한 번만
 *
 * 직전에 허용한 push 와 **href 가 같고** 800ms 가 안 지났으면 버린다. 다른 href 는
 * 막지 않는다 — `push(a); push(b)` 로 스택을 쌓아 올리는 프로그램적 흐름(가입 뒤
 * 홈 → 온보딩 등)이 있어서, "아무 push 나 잠시 막기" 는 그것을 깨뜨린다.
 *
 * 왜 타이머인가 (`useGoBack` 은 focus 로 푼다): push 는 **새 화면이 뜨지 않는 경우**
 * 가 있다(가드에 막힘·같은 라우트로 판정·오류). 그때 focus/blur 는 오지 않고, 이벤트로
 * 푸는 빗장은 자물쇠가 된다. 800ms 는 전환 애니메이션(≈350ms)과 두 번째 탭 사이를
 * 넉넉히 덮으면서, "열었다가 바로 닫고 다시 여는" 정상 사용(≥1초)은 막지 않는 값이다.
 *
 * 객체 href 는 pathname 과 params 를 **키 정렬** 해서 비교한다 — 같은 곳을 가리키는
 * 두 객체가 필드 순서만 다른 일이 흔하다.
 */
import type { Href } from "expo-router"

export const DUPLICATE_PUSH_WINDOW_MS = 800

export function hrefKey(href: Href): string {
  if (typeof href === "string") return href
  const params = (href as { params?: Record<string, unknown> }).params
  const sorted = params
    ? Object.keys(params)
        .sort()
        .map((k) => `${k}=${String(params[k])}`)
        .join("&")
    : ""
  return `${String((href as { pathname: unknown }).pathname)}?${sorted}`
}

export interface PushGuard {
  /** 이 push 를 내보내도 되는가. 허용하면 그 사실을 기억한다. */
  allow(href: Href): boolean
  /** 테스트·로그아웃 등에서 기억을 지운다. */
  reset(): void
}

export function createPushGuard(
  now: () => number = Date.now,
  windowMs: number = DUPLICATE_PUSH_WINDOW_MS,
): PushGuard {
  let last: { key: string; at: number } | null = null
  return {
    allow(href) {
      const key = hrefKey(href)
      const at = now()
      if (last !== null && last.key === key && at - last.at < windowMs) {
        return false
      }
      last = { key, at }
      return true
    },
    reset() {
      last = null
    },
  }
}

/** 앱 전체가 공유하는 빗장 — 라우터 인스턴스가 하나이므로 빗장도 하나다. */
export const pushGuard: PushGuard = createPushGuard()
