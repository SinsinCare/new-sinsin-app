/**
 * 진입 URL 을 **정확히 한 번만** 쓰이게 한다.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 고치는 증상: 리로드하면 홈이 아니라 아까 그 화면이 뜬다
 *
 * iOS 가 앱에 URL 을 넘기면 `expo-linking` 이 그것을 네이티브 싱글턴에 담는다:
 *
 * ```swift
 * // expo-linking/ios/LinkingAppDelegateSubscriber.swift
 * public func application(_ app: UIApplication, open url: URL, ...) -> Bool {
 *   ExpoLinkingRegistry.shared.initialURL = url     // ← 네이티브 static
 * }
 * ```
 *
 * JS 리로드(⌘R · Metro `r` · LogBox 의 Reload)는 **JS VM 만** 다시 시작한다.
 * 네이티브 프로세스는 그대로라 저 값도 그대로 남고, expo-router 는 앱이 뜰 때마다
 * 그것을 시작 지점으로 읽는다:
 *
 * ```
 * getInitialURL() → Linking.getLinkingURL() → ExpoLinkingRegistry.shared.initialURL
 *                 → router-store 가 곧바로 initialState 로 변환
 * ```
 *
 * 그래서 딥링크를 **한 번** 열면, 앱을 완전히 종료하거나 dev 런처로 나가기 전까지
 * 리로드할 때마다 같은 화면에서 시작한다. 지우는 곳이 앱 전체에 하나뿐이기
 * 때문이다 — `expo-dev-launcher` 가 React 호스트를 버릴 때
 * (`EXDevLauncherController.m`, 주석: "so the next React host doesn't pick up the
 * deep link that originally launched the previous app"). **평범한 리로드는 거기를
 * 지나지 않는다.**
 *
 * ■ 무엇을 하는가
 *
 * 라우터가 URL 을 이미 소비한 뒤(= 이 훅의 effect 가 도는 시점) 싱글턴을 비운다.
 * 링크는 **그 부팅에서 정상 동작하고**, 그 다음 리로드는 깨끗한 진입(`/`)에서
 * 시작한다.
 *
 * ■ 콜드 스타트 딥링크는 영향받지 않는다
 *
 * 새 프로세스는 `initialURL = nil` 로 시작하고, 그것을 채우는 것은 이번 실행의
 * 런치 URL 이다. 즉 여기서 비우는 것은 **이전 JS 인스턴스가 이미 쓴 값**뿐이다.
 *
 * 실행 중에 들어오는 딥링크도 영향받지 않는다 — 그쪽은 `getLinkingURL()` 이 아니라
 * `Linking.addEventListener("url")` 로 오고, expo-router 의 `subscribe` 가 받는다.
 */
import { useEffect } from "react"
import * as Linking from "expo-linking"

export function useConsumeEntryUrl(): void {
  useEffect(() => {
    /* 라우터는 이 훅보다 위(`ExpoRoot` → `ContextNavigator` → `useStore`)에서
       렌더 중에 이미 URL 을 읽었다. 그러므로 여기서 비워도 이번 진입은 멀쩡하다. */
    Linking.clearInitialURL()
  }, [])
}
