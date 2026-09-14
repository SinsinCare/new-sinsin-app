import { useEffect, useState } from "react"
import { AppState, AppStateStatus } from "react-native"
import { notificationService } from "@/src/services/notificationService"
import { notificationSettingsService } from "@/src/services/data/notificationSettingsService"
import type { NotificationSettings } from "@/src/types/notification"
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/src/types/notification"

/*
  상태와 동기화는 **모듈에 한 벌**만 산다.

  이 훅은 셋이 동시에 부른다 — `app/_layout.tsx`, 설정 화면(`useSettingsScreen`),
  알림 설정 화면. 종전에는 인스턴스마다 제 상태와 제 AppState 리스너를 가져서,
  포그라운드로 돌아올 때마다 GET /user/notification-settings 와 AsyncStorage 쓰기,
  scheduleAll(전부 취소 후 재예약), 푸시 토큰 등록이 인스턴스 수만큼 겹쳤다.
  여기서는 진행 중인 동기화 한 건을 모두가 공유하고 값도 하나만 둔다 — 그래야
  두 화면이 서로 다른 설정값을 보여 주는 일도 없다.
*/

interface SharedNotificationState {
  settings: NotificationSettings
  osPermissionGranted: boolean
  isReady: boolean
  error: unknown
}

const INITIAL_STATE: SharedNotificationState = {
  settings: DEFAULT_NOTIFICATION_SETTINGS,
  osPermissionGranted: false,
  isReady: false,
  error: null,
}

let state: SharedNotificationState = INITIAL_STATE
const listeners = new Set<() => void>()

function publish(next: SharedNotificationState): void {
  state = next
  listeners.forEach((listener) => listener())
}

function patchState(patch: Partial<SharedNotificationState>): void {
  publish({ ...state, ...patch })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 인증 상태로 붙어 있는 인스턴스 수. 0→1 에서 AppState 리스너를 걸고 1→0 에서 뗀다. */
let authenticatedConsumers = 0
let appStateSubscription: { remove: () => void } | null = null
/** 쓰기(update·setPushConsent)가 올린다. 그 전에 떠난 읽기의 응답은 버린다. */
let revision = 0
let writing = false
let inFlightSync: Promise<void> | null = null
/**
 * 이 JS 세션에서 서버에 올린 푸시 토큰. 토큰은 세션 안에서 바뀌지 않으므로
 * 포그라운드마다 다시 보내지 않는다. 로그아웃·동의 해제가 비운다.
 */
let registeredPushToken: string | null = null
/** 비인증 정리(cancelAll)는 인스턴스마다가 아니라 로그아웃 한 번에 한 번이다. */
let signedOutHandled = false

async function registerPushTokenOnce(): Promise<void> {
  if (registeredPushToken) return
  registeredPushToken = await notificationService.registerPushToken()
}

async function runSync(): Promise<void> {
  const request = ++revision
  try {
    const [fetched, granted] = await Promise.all([
      notificationSettingsService.get(),
      notificationService.hasPermission(),
    ])
    if (request !== revision) return
    patchState({
      settings: fetched,
      osPermissionGranted: granted,
      isReady: true,
      error: null,
    })
    await Promise.allSettled([
      notificationService.scheduleAll(fetched),
      ...(fetched.pushConsent && granted ? [registerPushTokenOnce()] : []),
    ])
  } catch (cause) {
    if (request !== revision) return
    patchState({ error: cause, isReady: false })
  }
}

/** 진행 중인 동기화가 있으면 그것을 돌려준다. 실패해도 거부하지 않고 `error` 에 싣는다. */
function syncFromServer(): Promise<void> {
  if (authenticatedConsumers === 0 || writing) return Promise.resolve()
  if (!inFlightSync) {
    inFlightSync = runSync().finally(() => {
      inFlightSync = null
    })
  }
  return inFlightSync
}

function resetSharedState(): void {
  revision += 1
  registeredPushToken = null
  publish(INITIAL_STATE)
}

function attachAuthenticatedConsumer(): () => void {
  authenticatedConsumers += 1
  signedOutHandled = false
  if (authenticatedConsumers === 1) {
    appStateSubscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (next === "active") void syncFromServer()
      },
    )
  }
  void syncFromServer()
  return () => {
    authenticatedConsumers -= 1
    if (authenticatedConsumers > 0) return
    appStateSubscription?.remove()
    appStateSubscription = null
    resetSharedState()
  }
}

function handleSignedOut(): void {
  if (signedOutHandled) return
  signedOutHandled = true
  resetSharedState()
  void notificationService.cancelAll().catch(() => {})
}

async function updateSettings(next: NotificationSettings): Promise<void> {
  writing = true
  const request = ++revision
  try {
    await notificationSettingsService.update(next)
    if (request !== revision) return
    patchState({ settings: next })
    // Consent is already saved; scheduling failure must not undo its displayed value.
    await Promise.allSettled([notificationService.scheduleAll(next)])
  } finally {
    writing = false
  }
}

async function requestAndEnable(): Promise<boolean> {
  const granted = await notificationService.requestPermissions()
  patchState({ osPermissionGranted: granted })
  return granted
}

async function setPushConsent(enabled: boolean): Promise<boolean> {
  writing = true
  const request = ++revision
  try {
    if (enabled) {
      const granted = await notificationService.requestPermissions()
      patchState({ osPermissionGranted: granted })
      if (!granted) return false
      // 명시적 동의는 늘 새로 올린다 — 해제 때 서버가 토큰을 지웠을 수 있다.
      registeredPushToken = await notificationService.registerPushToken()
      const next = await notificationSettingsService.setPushConsent(true)
      if (request === revision) patchState({ settings: next })
      return true
    }

    const next = await notificationSettingsService.setPushConsent(false)
    if (request === revision) patchState({ settings: next })
    await notificationService.unregisterPushToken()
    registeredPushToken = null
    const granted = await notificationService.hasPermission()
    patchState({ osPermissionGranted: granted })
    return true
  } finally {
    writing = false
  }
}

export function useNotifications(isAuthenticated: boolean) {
  const [snapshot, setSnapshot] = useState(() => state)

  useEffect(() => {
    const update = () => setSnapshot(state)
    // 첫 렌더와 구독 사이에 바뀐 값을 놓치지 않는다.
    update()
    return subscribe(update)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      handleSignedOut()
      return
    }
    return attachAuthenticatedConsumer()
  }, [isAuthenticated])

  return {
    settings: snapshot.settings,
    isReady: snapshot.isReady,
    error: snapshot.error,
    retry: syncFromServer,
    osPermissionGranted: snapshot.osPermissionGranted,
    pushEnabled: snapshot.settings.pushConsent && snapshot.osPermissionGranted,
    updateSettings,
    requestAndEnable,
    setPushConsent,
  }
}
