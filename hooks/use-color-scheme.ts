/**
 * 앱의 현재 모드.
 *
 * **`react-native` 의 `useColorScheme` 을 그대로 내보내지 않는다.** 앱에는 설정의
 * 테마 토글(`themeStore`: system / light / dark)이 있고 화면 대부분은
 * `useAppColorScheme`(→ 그 토글 + OS)를 본다. 여기만 OS 를 직접 보면 **한 화면에서
 * 두 모드가 갈린다** — 실제로 홈 루트(`ThemedView`)는 이 경로, 그 자식 `RecordView` 는
 * `useSurface`(themeStore)라서, 콜드스타트나 토글 직후 **본문은 다크인데 바닥만 라이트**인
 * 프레임이 떴다. `app/_layout.tsx` 의 `Appearance.setColorScheme` 이 둘을 잇고 있지만
 * 동기가 아니다 — JS 캐시만 갱신하고 change 이벤트를 쏘지 않아서, 실제 리렌더는
 * 네이티브 왕복(iOS traitCollectionDidChange / Android uiMode configChange) 뒤에 온다.
 *
 * 이 경로로 실제 픽셀이 결정되는 곳은 둘뿐이다 — `app/(tabs)/home.tsx` 와
 * `app/statistics.tsx`(둘 다 `ThemedView` 에 lightColor/darkColor 를 넘긴다).
 * 나머지 `ThemedView` 호출부는 `style` 로 배경을 덮어써서 이 값이 쓰이지 않는다.
 */
export { useAppColorScheme as useColorScheme } from "@/src/hooks/useAppColorScheme"
