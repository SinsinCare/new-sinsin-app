/**
 * 작성 스택. 헤더는 각 화면이 직접 그린다.
 *
 * ## 왜 화면마다 `gestureEnabled` 를 여기서 정하는가
 *
 * 작성 화면은 **잃을 것이 있는 화면**이다. 제목·본문 700자·올린 사진 다섯 장을 들고
 * 있는데, iOS 왼쪽 엣지 스와이프 한 번이면 확인창도 없이 통째로 사라진다. 화면 안의
 * `ConfirmExitModal` 은 ✕ 를 눌렀을 때만 뜬다 — 엣지 스와이프는 네이티브 스택이
 * 직접 화면을 팝해서 앱 코드를 거치지 않는다(`src/features/analytics/events.ts` 의
 * `nav_back` 머리말이 같은 사실을 적어 두었다).
 *
 * 식당 후기 작성(`app/restaurant/_layout.tsx`)이 같은 이유로 이미 `gestureEnabled: false`
 * 다. 여기도 같은 처방이다: **닫기는 ✕ 라는 의도적인 동작 하나로만.** 확인창은 그 ✕ 에서
 * 언제나 열리고, "계속 쓰기" 로 언제나 닫힌다 — 가둘 길이 없다.
 *
 * 초안이 비어 있으면 각 화면이 확인창을 건너뛰고 바로 나간다(`handleClose`). 그래서
 * 이 옵션이 "잃을 것 없는데 한 번 더 누르게" 만들지는 않는다.
 *
 * `recipe/edit/[id]` 는 폼이 아니라 "레시피 수정은 아직 없습니다" 안내 한 장이다.
 * 잃을 초안이 없으므로 제스처를 **그대로 둔다** — 여기서까지 스와이프를 막으면
 * 아무 이득 없이 뒤로가기만 불편해진다.
 *
 * ## 안드로이드 하드웨어 백은 여기서 못 막는다
 *
 * `gestureEnabled` 는 iOS 전용이다(react-navigation native-stack 이 안드로이드에서는
 * 이 값을 무조건 false 로 넘긴다 — 시스템 백을 JS 에서 처리하기 때문이다). 안드로이드
 * 하드웨어 백을 확인창으로 돌리려면 **화면 안에서** `usePreventRemove(hasDraft, …)` 를
 * 불러야 한다. 초안이 있는지는 각 폼만 알고, 여기서 조건 없이 막으면 빈 폼에도
 * 확인창이 뜬다(= 잃을 것 없는 사람을 한 번 더 누르게 하는 일). 그래서 그 한 줄은
 * 각 작성 화면(`FreePostEditor`·`RecipeWriteScreen`·`free/[id]`·`story/new`)의 몫이다.
 */

import { Stack } from "expo-router"

export default function WriteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerShadowVisible: false }}>
      <Stack.Screen name="free/new" options={{ gestureEnabled: false }} />
      <Stack.Screen name="free/[id]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="recipe/new" options={{ gestureEnabled: false }} />
      <Stack.Screen name="story/new" options={{ gestureEnabled: false }} />
      <Stack.Screen name="recipe/edit/[id]" />
    </Stack>
  )
}
