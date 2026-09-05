/**
 * 식당 스택. 헤더는 각 화면이 직접 그린다(`V2ScreenHeader` 또는 화면 고유의 상단 바).
 *
 * ## 화면별 presentation 을 여기서 정하는 이유
 *
 * 후기 작성(-26/-27)·사진 뷰어(-16/-17)·미디어 피커(-28)는 목업에서 **우상단 ✕ 로 닫는
 * 화면**이다. `‹` 로 되돌아가는 화면과 애니메이션이 같으면 (아래에서 올라오지 않고 옆에서
 * 밀려 들어오면) ✕ 가 어색해진다 — 옆에서 온 것은 옆으로 돌아가야 한다. 그래서 그 둘만
 * modal 로 올린다.
 *
 * `gestureEnabled` 를 후기 작성에서 끄는 이유: 별점·키워드·사진·본문을 다 채운 상태에서
 * 스와이프 한 번에 초안이 날아간다. 닫기는 ✕ 라는 **의도적인 동작**만으로 하게 한다.
 */

import { Stack } from "expo-router"
import { setStatusBarStyle } from "expo-status-bar"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

export default function RestaurantLayout() {
  const colorScheme = useAppColorScheme()
  return (
    <Stack
      screenOptions={{ headerShown: false, headerShadowVisible: false }}
      screenListeners={{
        transitionEnd: () =>
          setStatusBarStyle(colorScheme === "dark" ? "light" : "dark"),
      }}
    >
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/photos" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="[id]/review"
        options={{ presentation: "modal", gestureEnabled: false }}
      />
      <Stack.Screen name="reviewer/[id]" />
      <Stack.Screen name="search" />
      <Stack.Screen name="list" />
      <Stack.Screen name="bookmarks" />
      <Stack.Screen name="report" />
    </Stack>
  )
}
