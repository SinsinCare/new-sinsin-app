/**
 * 자사 분석 전송기 — Mixpanel SDK 를 대체하는 배칭 큐.
 *
 * 계약 (서버 `sinsin-be-bun/src/domains/analytics/routes.ts` 의 `/api/v1/analytics/batch`):
 *   { device: { anonymousId, appVersion, ... }, events: [{ eventUuid, sessionId, seq,
 *     type, name, screenName?, props?, clientTs }] } — 배치 최대 100건.
 *
 * 동작 원칙 (errorService 계보):
 *   - **절대 던지지 않는다.** 분석이 앱을 깨뜨리면 본말전도다. 실패는 큐에 남겨 재시도.
 *   - 전송 성공(2xx)한 이벤트만 큐에서 지운다. 서버가 event_uuid 로 중복을 걸러 주므로
 *     "응답을 못 받았는데 사실 저장됐다" 는 재전송이 안전하다.
 *   - 큐는 AsyncStorage 에 영속 — 앱이 죽어도 이벤트를 잃지 않는다. 상한 500건,
 *     넘치면 **오래된 것부터** 버린다(최근 행동이 더 값지다).
 *   - flush 조건: 50건 누적 · 15초 주기 · 백그라운드 진입 · 명시적 호출.
 *   - 인증 토큰이 있으면 붙인다(서버가 사용자를 귀속하고 과거 익명 행을 소급 연결).
 *     401 갱신 큐와 얽히지 않도록 axios 밖(fetchWithTimeout)에서 보낸다.
 *
 * 세션 규칙 (PostHog/Matomo 표준):
 *   - 마지막 활동에서 30분 넘게 지나면 새 세션. 백그라운드 갔다가 30분 안에 돌아오면
 *     같은 세션이다. 세션 id 는 클라이언트가 찍는다 — 오프라인 배칭에도 세션이 안 갈라지는
 *     유일한 방법이다.
 *   - 세션 상태도 영속 — 콜드 스타트가 30분 안이면 세션이 이어진다.
 */
import AsyncStorage from "@react-native-async-storage/async-storage"
import { appConfig, getBackendUrl } from "@/src/config/appConfig"
import { fetchWithTimeout } from "@/src/services/core/fetchWithTimeout"
import { tokenService } from "@/src/services/core/tokenService"
import { logger } from "@/src/lib/logger"
import { jitter } from "@/src/lib/backoff"
import { getDeviceContext } from "./deviceContext"

const ANON_ID_KEY = "sinsin.analytics.anonymousId"
const QUEUE_KEY = "sinsin.analytics.queue"
const SESSION_KEY = "sinsin.analytics.session"
const APP_VERSION_KEY = "sinsin.analytics.lastAppVersion"

const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const FLUSH_INTERVAL_MS = 15_000
/**
 * 배치 상한이 100 이라 50 은 **계약을 하나도 안 바꾼다**(서버 0줄). 20 → 50 은 같은
 * 이벤트 수를 요청 2.5배 적게 나눠 보낸다는 뜻이고, 그만큼 IP 레이트리밋에서 멀어진다.
 *
 * 그 한도가 실제 병목이다: `/api/v1/analytics/batch` 는 **IP당 5분 60회**이고 국내
 * CGNAT 은 다수가 한 공인 IP 를 쓴다. 429 를 맞으면 백오프가 150초까지 늘고, 그동안
 * 큐가 500 을 넘기면 **오래된 것부터** 버려진다 — 하필 세션 앞머리, 즉 퍼널 1스텝이다
 * (설계 §8 "먼저 깨지는 곳" 2위). 이벤트를 400개로 늘리는 작업과 같이 가는 값이다.
 *
 * 더 올리지 않는 이유는 유실 창이다. 임계값은 곧 "아직 안 보낸 최대치" 라서, 100 으로
 * 두면 앱이 죽는 순간 최대 100건이 다음 실행까지 미뤄진다(큐는 영속이라 잃지는 않는다).
 * 15초 주기와 백그라운드 flush 가 그 창을 닫아 주는 선에서 50 이 절충점이다.
 */
const FLUSH_THRESHOLD = 50
const MAX_QUEUE = 500
const MAX_BATCH = 100
const SEND_TIMEOUT_MS = 8_000
const RETRY_BASE_MS = 5_000
const RETRY_MAX_MS = 150_000

export type QueuedEventType = "track" | "screen" | "lifecycle" | "error"

interface QueuedEvent {
  readonly eventUuid: string
  readonly sessionId: string
  readonly seq: number
  readonly type: QueuedEventType
  readonly name: string
  readonly screenName: string | null
  readonly props: Record<string, unknown>
  readonly clientTs: string
}

interface SessionState {
  id: string
  seq: number
  lastActivityMs: number
}

/**
 * 배치 엔드포인트의 절대 URL.
 *
 * `EXPO_PUBLIC_BACKEND_URL` 은 **`/api/v1` 까지 포함한 값**이다(`.env.test` 의
 * `http://localhost:8100/api/v1`). 거기에 문자열로 `/api/v1/analytics/batch` 를 이으면
 * `/api/v1/api/v1/...` 이 되어 404 가 나는데, 이 전송기는 4xx 를 **계약 위반으로 보고 배치를
 * 버린다**(무한 재전송을 막으려고). 그래서 이 접두 하나 때문에 앱의 이벤트가 한 건도 도착하지
 * 못한 채 조용히 사라졌다 — 실측으로 확인했다(로컬 서버 도착 0건, 이중 경로 404 / 정상 경로 200).
 *
 * 그래서 base 에 이미 붙어 있는 `/api/vN` 을 걷어내고 한 번만 잇는다. base 가 오리진뿐이어도
 * (`https://host`) 같은 결과가 나온다. `new URL()` 을 안 쓰는 이유는 RN 의 URL 구현이
 * 환경마다 다르기 때문이다 — 계측 경로는 폴리필에 기대면 안 된다.
 */
export function analyticsBatchUrl(backendUrl: string): string {
  const origin = backendUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/v\d+$/, "")
  return `${origin}/api/v1/analytics/batch`
}

/** RN Hermes 에 crypto.randomUUID 폴리필이 없어 직접 만든다. 분석 id 라 암호 강도는 불필요. */
export function analyticsUuid(): string {
  let out = ""
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += "-"
    else if (i === 14) out += "4"
    else {
      const r = Math.floor(Math.random() * 16)
      out += (i === 19 ? (r & 3) | 8 : r).toString(16)
    }
  }
  return out
}

interface TransportState {
  anonymousId: string | null
  queue: QueuedEvent[]
  session: SessionState | null
  installedNow: boolean
  updatedFrom: string | null
}

const state: TransportState = {
  anonymousId: null,
  queue: [],
  session: null,
  installedNow: false,
  updatedFrom: null,
}

let hydration: Promise<void> | null = null
let flushTimer: ReturnType<typeof setInterval> | null = null
let sending = false
let retryDelayMs = RETRY_BASE_MS
let nextRetryAtMs = 0
let persistScheduled = false

/** 즉시 저장. 전송 직전·백그라운드 진입처럼 "지금 상태가 진실이어야 하는" 순간에 부른다. */
async function persistNow(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(state.queue))
    if (state.session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(state.session))
    }
  } catch {
    // 저장 실패는 무시한다 — 다음 성공 때 따라잡는다.
  }
}

/** 디바운스 저장 — 이벤트 유입 경로용. 마지막 창은 flushQueue 의 persistNow 가 닫는다. */
function schedulePersist(): void {
  if (persistScheduled) return
  persistScheduled = true
  setTimeout(() => {
    persistScheduled = false
    void persistNow()
  }, 500)
}

/** 영속 큐의 행 하나가 계약을 지키는지 — 깨진 한 행이 배치 전체를 400 으로 만들면 안 된다. */
function isQueuedEvent(row: unknown): row is QueuedEvent {
  if (typeof row !== "object" || row === null) return false
  const r = row as Record<string, unknown>
  return (
    typeof r["eventUuid"] === "string" &&
    typeof r["sessionId"] === "string" &&
    typeof r["seq"] === "number" &&
    typeof r["type"] === "string" &&
    typeof r["name"] === "string" &&
    typeof r["clientTs"] === "string" &&
    (r["screenName"] === null || typeof r["screenName"] === "string") &&
    typeof r["props"] === "object" &&
    r["props"] !== null
  )
}

async function hydrate(): Promise<void> {
  if (hydration) return hydration
  hydration = (async () => {
    try {
      const [anonId, rawQueue, rawSession, lastVersion] = await Promise.all([
        AsyncStorage.getItem(ANON_ID_KEY),
        AsyncStorage.getItem(QUEUE_KEY),
        AsyncStorage.getItem(SESSION_KEY),
        AsyncStorage.getItem(APP_VERSION_KEY),
      ])

      if (anonId && anonId.length >= 8) {
        state.anonymousId = anonId
      } else {
        state.anonymousId = analyticsUuid()
        state.installedNow = true
        await AsyncStorage.setItem(ANON_ID_KEY, state.anonymousId)
      }

      if (rawQueue) {
        try {
          const parsed: unknown = JSON.parse(rawQueue)
          if (Array.isArray(parsed)) {
            state.queue = parsed.filter(isQueuedEvent).slice(-MAX_QUEUE)
          }
        } catch {
          // 깨진 저장분은 버린다.
        }
      }

      if (rawSession) {
        try {
          const parsed = JSON.parse(rawSession) as SessionState
          if (
            typeof parsed?.id === "string" &&
            typeof parsed?.lastActivityMs === "number"
          ) {
            state.session = parsed
          }
        } catch {
          state.session = null
        }
      }

      const currentVersion = getDeviceContext().appVersion
      if (currentVersion) {
        if (lastVersion !== null && lastVersion !== currentVersion)
          state.updatedFrom = lastVersion
        if (lastVersion !== currentVersion) {
          await AsyncStorage.setItem(APP_VERSION_KEY, currentVersion)
        }
      }
    } catch (error) {
      logger.debug("[analytics] hydrate failed", error)
      // 영속화 없이도 세션 안에서는 동작한다.
      state.anonymousId ??= analyticsUuid()
    }
  })()
  return hydration
}

/** 활동 시각 기준으로 세션을 얻거나 굴린다. 새 세션이면 true 를 함께 알린다. */
function rollSession(nowMs: number): { session: SessionState; isNew: boolean } {
  const current = state.session
  if (current && nowMs - current.lastActivityMs <= SESSION_TIMEOUT_MS) {
    current.lastActivityMs = nowMs
    return { session: current, isNew: false }
  }
  const fresh: SessionState = {
    id: analyticsUuid(),
    seq: 0,
    lastActivityMs: nowMs,
  }
  state.session = fresh
  return { session: fresh, isNew: true }
}

export interface EnqueueOptions {
  readonly type: QueuedEventType
  readonly name: string
  readonly screenName?: string | null
  readonly props?: Record<string, unknown>
}

/** 세션 굴림의 부수 이벤트(app_opened 등)를 호출부가 만들 수 있도록 알린다. */
export type SessionRollListener = (info: { fromColdStart: boolean }) => void
let sessionRollListener: SessionRollListener | null = null
let coldStart = true

export function onSessionRolled(listener: SessionRollListener): void {
  sessionRollListener = listener
}

export async function enqueueEvent(options: EnqueueOptions): Promise<void> {
  if (appConfig.analyticsDisabled) return
  await hydrate()
  const nowMs = Date.now()
  const { session, isNew } = rollSession(nowMs)
  if (isNew && sessionRollListener) {
    const wasColdStart = coldStart
    coldStart = false
    // 리스너가 같은 세션으로 lifecycle 이벤트를 넣도록 먼저 알린다 — 재귀 진입은
    // rollSession 이 같은 세션을 돌려주므로 안전하다.
    sessionRollListener({ fromColdStart: wasColdStart })
  }
  coldStart = false

  session.seq += 1
  const event: QueuedEvent = {
    eventUuid: analyticsUuid(),
    sessionId: session.id,
    seq: session.seq,
    type: options.type,
    name: options.name,
    screenName: options.screenName ?? null,
    props: options.props ?? {},
    clientTs: new Date(nowMs).toISOString(),
  }

  state.queue.push(event)
  if (state.queue.length > MAX_QUEUE)
    state.queue.splice(0, state.queue.length - MAX_QUEUE)
  schedulePersist()

  if (state.queue.length >= FLUSH_THRESHOLD) void flushQueue()
  ensureTimer()
}

/**
 * 이벤트 없이 세션만 굴린다 — 포그라운드 복귀용. 30분 넘게 쉬다 **같은 화면**으로
 * 돌아오면 화면 dedupe 가 screen_viewed 를 삼켜 어떤 이벤트도 안 생기고, 그러면
 * 세션 굴림 리스너(app_opened)도 안 돈다. 복귀 시점에 이걸 불러 세션 경계를 세운다.
 */
export async function touchSession(): Promise<void> {
  if (appConfig.analyticsDisabled) return
  await hydrate()
  const { isNew } = rollSession(Date.now())
  if (isNew && sessionRollListener) {
    const wasColdStart = coldStart
    coldStart = false
    sessionRollListener({ fromColdStart: wasColdStart })
  }
  schedulePersist()
}

/** 첫 설치·버전 갱신 신호 — hydrate 후 한 번만 읽는 소비성 값이다. */
export async function consumeInstallSignals(): Promise<{
  installed: boolean
  updatedFrom: string | null
}> {
  await hydrate()
  const signals = {
    installed: state.installedNow,
    updatedFrom: state.updatedFrom,
  }
  state.installedNow = false
  state.updatedFrom = null
  return signals
}

function ensureTimer(): void {
  if (flushTimer !== null) return
  flushTimer = setInterval(() => {
    if (state.queue.length === 0) {
      if (flushTimer !== null) {
        clearInterval(flushTimer)
        flushTimer = null
      }
      return
    }
    void flushQueue()
  }, FLUSH_INTERVAL_MS)
}

/**
 * 배치 응답의 접수 결과. 봉투(`{ isSuccess, code, message, result, timestamp }`)의
 * `result` 안에 있지만, 껍데기가 바뀌어도 조용히 눈이 머는 일이 없도록 최상위도 본다.
 * 모양이 다르면 `null` — **모르는 것을 0 으로 적지 않는다**(0 은 "다 버렸다" 는 뜻이다).
 */
export function readBatchCounts(
  body: unknown,
): { accepted: number; rejected: number } | null {
  if (typeof body !== "object" || body === null) return null
  const envelope = body as Record<string, unknown>
  const inner = envelope["result"]
  const payload = (
    typeof inner === "object" && inner !== null ? inner : envelope
  ) as Record<string, unknown>
  const accepted = payload["accepted"]
  const rejected = payload["rejected"]
  if (typeof accepted !== "number" || typeof rejected !== "number") return null
  return { accepted, rejected }
}

/**
 * 관측의 관측 (설계 §8). 서버는 **200 을 주면서도 행을 버릴 수 있다** — 계약 위반
 * (이름·세션 id 모양, 금지된 속성 키)이나 적재 폭주가 그 경로다. 지금까지 클라이언트는
 * `response.ok` 만 봤기 때문에 "안 찍힌 것" 과 "서버가 버린 것" 이 구분되지 않았다.
 * `rejected > 0` 이 보이면 계측 계약이 조용히 깨지고 있다는 뜻이다.
 *
 * **전송 성공 처리와 절대 얽히지 않는다.** 본문 파싱은 여기 안에서 끝나고, 실패해도
 * 아무것도 던지지 않는다 — 이걸 바깥 try 에 두면 JSON 한 글자 때문에 이미 성공한
 * 배치가 네트워크 실패로 오인되어 백오프에 들어간다.
 */
async function logBatchOutcome(
  response: Response,
  sent: number,
): Promise<void> {
  try {
    const counts = readBatchCounts(await response.json())
    if (counts === null) {
      logger.debug("[analytics] batch sent", { sent })
      return
    }
    logger.debug("[analytics] batch sent", { sent, ...counts })
  } catch {
    // 본문을 못 읽는 것은 전송 실패가 아니다.
  }
}

/**
 * 전송 성공분을 **자리(index)가 아니라 정체(eventUuid)로** 지운다.
 * 전송이 나는 동안(최대 8초) enqueue 의 오버플로 트림이 큐 머리를 깎을 수 있어,
 * 위치 기반 splice 는 한 번도 안 보낸 이벤트를 지운다(리뷰에서 실증된 유실 경로).
 */
function removeBatch(batch: readonly QueuedEvent[]): void {
  const sent = new Set(batch.map((event) => event.eventUuid))
  state.queue = state.queue.filter((event) => !sent.has(event.eventUuid))
}

export async function flushQueue(): Promise<void> {
  // 가드는 await 앞에서 **동기로** 세운다 — await 뒤에 세우면 같은 마이크로태스크
  // 드레인에 들어온 두 호출이 모두 통과해 같은 배치를 두 번 지운다(실증된 레이스).
  if (sending) return
  sending = true
  try {
    await hydrate()
    if (state.queue.length === 0 || state.anonymousId === null) return
    if (Date.now() < nextRetryAtMs) return

    let backendUrl: string
    try {
      backendUrl = getBackendUrl()
    } catch {
      return // env 미설정 빌드 — 조용히 보류.
    }

    while (state.queue.length > 0) {
      const batch = state.queue.slice(0, MAX_BATCH)
      // 서버에 나갈 seq 가 영속본보다 앞서지 않게 — 죽었다 살아난 세션이 같은
      // (sessionId, seq) 를 다시 쓰는 중복 축을 여기서 닫는다.
      await persistNow()
      const token = await tokenService.getAccessToken().catch(() => null)
      const device = getDeviceContext()

      const response = await fetchWithTimeout(
        analyticsBatchUrl(backendUrl),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            device: {
              anonymousId: state.anonymousId,
              appVersion: device.appVersion,
              appBuild: device.appBuild,
              osName: device.osName,
              osVersion: device.osVersion,
              deviceModel: device.deviceModel,
              locale: device.locale,
              appEnv: device.appEnv,
            },
            events: batch,
          }),
        },
        SEND_TIMEOUT_MS,
      )

      if (!response.ok) {
        // 4xx 는 재시도해도 같은 결과다 — 계약 위반 배치는 버려서 무한 재전송을 막는다.
        // (레이트리밋 429 만은 남겨서 다음 주기에 다시 시도한다.)
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          removeBatch(batch)
          schedulePersist()
          continue
        }
        throw new Error(`analytics flush ${response.status}`)
      }

      removeBatch(batch)
      schedulePersist()
      retryDelayMs = RETRY_BASE_MS
      nextRetryAtMs = 0
      await logBatchOutcome(response, batch.length)
    }
  } catch (error) {
    /*
      네트워크 실패 — 큐에 남겨 두고 지수 백오프. **지터를 씌운다.**

      이 코드는 우리가 가진 재시도 중 **주체가 가장 많다**(서버 인스턴스는 몇 대지만
      앱은 설치 수만큼이다). 고정 간격이면 우리 서버가 5분 죽었다 살아나는 순간
      설치 기반 전체가 같은 시점에 동시에 돌아온다 — 살아나자마자 다시 넘어지고,
      그 다음 재시도도 여전히 정렬돼 있다.

      상한(`retryDelayMs`)은 그대로 두 배씩 자라고, **기다리는 시간에만** 지터를
      씌운다(`[d/2, d]`). 그래야 "최대 150초" 라는 계약이 유지된다.
    */
    nextRetryAtMs = Date.now() + jitter(retryDelayMs)
    retryDelayMs = Math.min(RETRY_MAX_MS, retryDelayMs * 2)
    logger.debug("[analytics] flush deferred", error)
  } finally {
    sending = false
  }
}

/** 테스트·디버그 화면용 상태 노출. */
export function analyticsQueueDepth(): number {
  return state.queue.length
}
