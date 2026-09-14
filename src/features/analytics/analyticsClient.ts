/**
 * 분석 클라이언트 — 공개 API 는 Mixpanel 시절과 동일하다(호출부 ~30곳 무수정).
 * 내부만 자사 백엔드 전송기(`transport.ts`)로 갈아끼웠다.
 *
 * 화면 이벤트의 이중 표현: 호출부는 여전히 `trackAnalyticsEvent("screen_viewed",
 * {screen})` 를 부르지만, 서버의 경로 분석(퍼널·생키)은 `type='screen'` +
 * `screen_name` 컬럼을 본다. 여기서 그 변환을 한 번만 한다 — 호출부와 서버 어느 쪽도
 * 상대의 표현을 알 필요가 없다.
 *
 * 수명주기 자동 수집 (Mixpanel 은 네이티브가 하던 것을 JS 로 직접):
 *   - app_installed   첫 실행(익명 id 최초 생성)
 *   - app_updated     저장된 버전과 다른 버전으로 실행
 *   - app_opened      세션 시작마다 { from_background } — 세션 굴림 리스너가 쏜다
 *   - app_backgrounded 백그라운드 진입(+ 즉시 flush)
 */
import { logger } from "@/src/lib/logger"
import {
  sanitizeAnalyticsProperties,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from "./events"
import {
  consumeInstallSignals,
  enqueueEvent,
  flushQueue,
  onSessionRolled,
  touchSession,
} from "./transport"

let identityState: string | null | undefined
let operationQueue: Promise<void> = Promise.resolve()
let lifecycleInitialized = false
let currentScreen: string | null = null

/** 직렬 큐 — identify 전에 이벤트가 앞질러 나가는 순서 역전을 막는다(기존 계약 유지). */
function enqueue(operation: () => Promise<void> | void): void {
  operationQueue = operationQueue
    .then(operation)
    .catch((error) => logger.debug("[analytics] operation failed", error))
}

/**
 * 세션이 새로 열릴 때마다 app_opened 를 그 세션의 첫 이벤트로 넣는다. 여기서는 행의
 * **내용만** 돌려준다 — 직접 `enqueueEvent` 를 부르면 그 호출이 `await hydrate()` 에서
 * 한 번 멈춰 세션을 굴린 원래 이벤트가 먼저 번호를 받는다. 순번은 전송기가 원래 이벤트
 * 앞에 매긴다(`transport.ts` 의 `openSession`).
 */
onSessionRolled(({ fromColdStart }) => ({
  type: "lifecycle",
  name: "app_opened",
  screenName: currentScreen,
  props: { from_background: !fromColdStart },
}))

/** 콜드 스타트 1회 — 설치·업데이트 신호를 이벤트로 바꾼다. RootLayoutNav 가 부른다. */
export function initAnalyticsLifecycle(): void {
  if (lifecycleInitialized) return
  lifecycleInitialized = true
  enqueue(async () => {
    const signals = await consumeInstallSignals()
    if (signals.installed) {
      await enqueueEvent({
        type: "lifecycle",
        name: "app_installed",
        props: {},
      })
    }
    if (signals.updatedFrom !== null) {
      await enqueueEvent({
        type: "lifecycle",
        name: "app_updated",
        props: { previous_version: signals.updatedFrom },
      })
    }
  })
}

/**
 * 포그라운드 복귀 — 이벤트를 만들지 않고 세션 경계만 세운다. 30분 넘게 쉬었다면
 * 여기서 새 세션이 열리고 리스너가 app_opened 를 그 세션의 첫 이벤트로 넣는다.
 */
export function notifyAppForegrounded(): void {
  enqueue(async () => {
    await touchSession()
  })
}

/** 백그라운드 진입 — 수명주기 이벤트를 남기고 큐를 즉시 내보낸다. */
export function notifyAppBackgrounded(): void {
  enqueue(async () => {
    await enqueueEvent({
      type: "lifecycle",
      name: "app_backgrounded",
      screenName: currentScreen,
      props: {},
    })
    await flushQueue()
  })
}

export function trackAnalyticsEvent<Event extends AnalyticsEventName>(
  event: Event,
  properties: AnalyticsEventProperties[Event],
): void {
  enqueue(async () => {
    const props = sanitizeAnalyticsProperties(
      properties as Record<string, unknown>,
    )

    if (event === "screen_viewed") {
      const screen =
        typeof props["screen"] === "string" ? props["screen"] : null
      currentScreen = screen
      await enqueueEvent({
        type: "screen",
        name: event,
        screenName: screen,
        props,
      })
      return
    }

    await enqueueEvent({
      type: "track",
      name: event,
      screenName: currentScreen,
      props,
    })
  })
}

/**
 * 사용자 귀속은 서버가 Bearer 토큰으로 한다 — 클라이언트는 uid 를 싣지 않는다.
 * 이 함수가 남아 있는 이유는 (a) 호출부 계약 유지, (b) 로그인 직후 큐에 남은 익명
 * 이벤트를 토큰이 실린 채로 내보내는 flush 트리거.
 */
export function identifyAnalyticsUser(userId: string): void {
  if (!userId || identityState === userId) return
  identityState = userId
  enqueue(async () => {
    await flushQueue()
  })
}

export function resetAnalyticsIdentity(): void {
  if (identityState === null) return
  identityState = null
  // 익명 id 는 기기 축이라 유지한다 — 서버의 소급 귀속이 기기 축으로 동작한다.
}
