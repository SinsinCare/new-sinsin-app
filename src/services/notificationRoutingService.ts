/**
 * 푸시 `data.type` → 앱 안 목적지. 서버는 앱 내부 경로를 모른다(`app/_layout.tsx`).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 홈 탭으로 갈 때 `push` 를 쓰면 안 된다 — 탭 네비게이터가 한 벌 더 쌓인다
 *
 * `(tabs)` 는 루트 Stack 의 **화면 하나**다. 푸시는 어느 화면에서든 눌릴 수 있으므로
 * 그때 스택은 `["(tabs)", "(settings)"]`·`["(tabs)", "post/[id]"]` 처럼 탭 **밖**일 수
 * 있고, 그러면 expo-router 의 `findDivergentState` 가 루트 Stack 에서 갈라진다고 보고
 * 화면 이름 `(tabs)` 로 액션을 만든다:
 *
 * ```
 * 루트 스택 = ["(tabs)", "(settings)"]
 *   push     → {type:"PUSH",   name:"(tabs)"} → ["(tabs)","(settings)","(tabs)"]
 *   navigate → {type:"NAVIGATE",name:"(tabs)"} → ["(tabs)","(settings)","(tabs)"]   ← 똑같이 쌓인다
 *   dismissTo→ {type:"POP_TO", name:"(tabs)"} → ["(tabs)"]
 * ```
 *
 * `navigate` 도 쌓인다는 것이 핵심이다 — StackRouter 의 NAVIGATE 갈래는 **지금 떠 있는
 * 화면과 이름이 같을 때**(또는 `getId`/`payload.pop` 이 있을 때)만 기존 라우트를
 * 재사용하는데, expo-router 는 둘 다 주지 않는다. 겹쳐 쌓이면 탭 바는 멀쩡해 보이지만
 * 탭을 눌러도 아무 일이 없고 안드로이드는 쌓인 수만큼 뒤로가기를 눌러야 나온다.
 *
 * ■ 그런데 `dismissTo` **하나로 통일할 수도 없다**
 *
 * 이미 탭 안(`["(tabs)"]`)에서 눌렸다면 갈라지는 지점이 루트 Stack 이 아니라 **탭
 * 네비게이터**다. 그때 액션은 `{type:"POP_TO", target: 탭키, name:"home"}` 가 되는데,
 * `TabRouter` 에는 POP_TO 갈래가 없어서 `getStateForAction` 이 `null` 을 돌려준다.
 * 그리고 **target 이 박힌 액션은 처리하지 못해도 위로 올라가지 않는다** —
 * `@react-navigation/core` 의 `useOnAction` 이
 * `result === null && action.target === state.key ? state : result` 로 "처리했다"고
 * 삼켜 버린다. 즉 `dismissTo` 한 벌로 통일하면 **탭 안에서 누른 푸시가 조용히 무반응**이
 * 된다. (두 패키지를 실제로 돌려 확인했다. 회귀 검사는 `tests/tabRouteNavigation.test.ts`
 * 가 가짜 라우터로 두 갈래를 모두 부른다.)
 *
 * 그래서 "위에 접을 것이 있는가" 로 갈라 부른다. 탭 화면들은 중첩 스택이 아니므로
 * (`app/(tabs)/*.tsx` 는 전부 잎이다) `canDismiss()` 는 정확히 "탭 위에 무언가 얹혀
 * 있는가" 를 뜻한다.
 *
 * ■ 설정 스택(`(settings)`)은 왜 그대로 `push` 인가
 *
 * 목적지가 **탭 라우트가 아니라서** 갈라지는 지점이 다르다. `["(tabs)"]` 에서
 * `/(settings)/announcements` 로 가면 루트 Stack 에 `(settings)` 가 없으므로 PUSH 가
 * 맞는 동작이고(한 벌 더 쌓일 `(tabs)` 가 애초에 없다), 공지를 보고 뒤로 나오면 원래
 * 있던 곳으로 돌아가야 한다.
 */
import type { Href, Router } from "expo-router"

type PushData = Record<string, unknown>

/**
 * **탭 라우트**로 간다. 탭 밖이면 쌓인 것을 접으면서(POP_TO), 이미 탭 안이면
 * 탭만 바꾼다(NAVIGATE→JUMP_TO). 이유는 이 파일 머리말.
 */
function goToTabRoute(router: Router, href: Href): void {
  if (router.canDismiss()) {
    router.dismissTo(href)
    return
  }
  router.navigate(href)
}

export function routeFromPushData(
  data: PushData | null | undefined,
  router: Router,
): boolean {
  const type = typeof data?.type === "string" ? data.type : undefined

  if (type === "food_analysis_complete") {
    goToTabRoute(router, "/(tabs)/home")
    return true
  }

  if (type === "announcement") {
    const noticeId = data?.noticeId
    if (typeof noticeId === "string" || typeof noticeId === "number") {
      router.push({
        pathname: "/(settings)/announcement-detail",
        params: { id: String(noticeId) },
      })
    } else {
      router.push("/(settings)/announcements")
    }
    return true
  }

  goToTabRoute(router, "/(tabs)/home")
  return false
}
