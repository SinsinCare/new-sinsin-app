/**
 * RevenueCat SDK 의 얇은 래퍼. **SDK 를 직접 부르는 곳은 이 파일 하나다.**
 *
 * ## 이 래퍼가 실제로 하는 일 세 가지
 *
 * **① 키가 없으면 조용히 꺼진다.** 결제 키 없이 켜진 빌드(개발 초기·목 모드)에서 SDK 를
 * 부르면 매 호출이 예외다. 여기서 한 번 막으면 위쪽 화면은 그 사정을 몰라도 된다.
 *
 * **② `configure` 는 프로세스당 한 번이다.** 두 번 부르면 SDK 가 던진다. 그래서 첫
 * 식별은 `configure`, 이후 계정 전환은 `logIn` 으로 갈라야 하는데 — 그 판단을 화면마다
 * 하면 언젠가 틀린다. 여기서 `configured` 플래그 하나로 흡수한다.
 *
 * **③ 부팅 시점에 설정하지 않는다.** 서버가 발급한 `appUserId` 를 받은 **뒤에만** 부른다.
 * 익명으로 먼저 설정하면 RC 에 익명 고객이 생기고, 나중에 `logIn` 할 때 그 익명 고객이
 * 우리 사용자로 별칭(alias)되면서 남의 구매가 섞여 들어올 여지가 생긴다.
 *
 * ## 여기서 권한을 판정하지 않는다
 *
 * `customerInfo.entitlements` 를 읽어 "프리미엄이다" 라고 결론 내리지 않는다. 그건
 * **서버가 한다**(`GET /billing/me`). SDK 의 값은 화면 힌트도 아니고 오직
 * **"서버에 다시 물어봐라" 는 신호**로만 쓴다 — `onCustomerInfoUpdate`.
 */

import { Platform } from "react-native"

import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases"

import {
  getRevenueCatApiKey,
  isRevenueCatConfigured,
} from "@/src/config/revenueCatConfig"
import { logger } from "@/src/lib/logger"

let configured = false
let configuredAppUserId: string | null = null

/** SDK 를 쓸 수 있는 상태인가. 키가 없거나 아직 식별 전이면 false. */
export function isPurchasesReady(): boolean {
  return configured
}

export function currentAppUserId(): string | null {
  return configuredAppUserId
}

/**
 * 서버가 발급한 식별자로 SDK 를 준비한다. **여러 번 불러도 안전하다.**
 *
 * 같은 id 로 다시 부르면 아무것도 하지 않고, 다른 id 면 `logIn` 으로 전환한다
 * (계정 전환). `configure` 는 첫 번째 호출에서만 돈다.
 */
export async function identify(appUserId: string): Promise<void> {
  if (!isRevenueCatConfigured() || appUserId === "") return
  if (configuredAppUserId === appUserId) return

  try {
    if (!configured) {
      Purchases.configure({
        apiKey: getRevenueCatApiKey(),
        appUserID: appUserId,
      })
      configured = true
    } else {
      await Purchases.logIn(appUserId)
    }
    configuredAppUserId = appUserId
  } catch (error) {
    /*
      실패해도 앱을 막지 않는다. 결제만 "준비 안 됨" 으로 남고 나머지는 그대로 돈다 —
      권한 판정은 어차피 서버가 하므로, SDK 가 없다고 사용자가 잠기지는 않는다.
    */
    logger.warn("[purchases] identify 실패", error)
  }
}

/**
 * 로그아웃. `configure` 를 되돌릴 수는 없으므로 `logOut` 으로 익명 상태로 돌린다.
 *
 * **이걸 빠뜨리면 다음에 로그인한 사람이 앞사람의 구매를 본다**(같은 기기, 다른 계정).
 * 그래서 세션 정리(`services/core/sessionCleanup.ts`)에 걸어 둔다.
 */
export async function forgetUser(): Promise<void> {
  if (!configured) return
  try {
    await Purchases.logOut()
  } catch (error) {
    // 이미 익명이면 SDK 가 던진다. 정리 경로라 삼킨다.
    logger.debug("[purchases] logOut 무시", error)
  }
  configuredAppUserId = null
}

export interface OfferingPackage {
  readonly id: string
  /** `$rc_monthly` · `$rc_annual` 같은 RC 표준 키. 화면이 월/연을 가르는 축이다. */
  readonly lookupKey: string
  /** **스토어가 현지화한 가격 문자열.** 숫자를 앱에서 만들지 않는다. */
  readonly priceString: string
  /** 비교·할인율 계산용 원시값. 표시에는 쓰지 않는다. */
  readonly price: number
  readonly currencyCode: string
  readonly productId: string
  readonly title: string
  readonly description: string
  /** 체험 기간이 붙어 있으면 그 설명(예: "7일 무료"). 없으면 null. */
  readonly introOffer: string | null
  readonly raw: PurchasesPackage
}

function toOfferingPackage(item: PurchasesPackage): OfferingPackage {
  const product = item.product
  const intro = product.introPrice
  return {
    id: item.identifier,
    lookupKey: item.identifier,
    priceString: product.priceString,
    price: product.price,
    currencyCode: product.currencyCode,
    productId: product.identifier,
    title: product.title,
    description: product.description,
    introOffer:
      intro === null || intro === undefined
        ? null
        : intro.periodNumberOfUnits > 0
          ? `${intro.periodNumberOfUnits}${intro.periodUnit}`
          : null,
    raw: item,
  }
}

export interface CurrentOffering {
  readonly id: string
  readonly packages: readonly OfferingPackage[]
  /**
   * 대시보드에서 붙인 메타데이터. **문구·순서를 앱 배포 없이 바꾸는 통로**다.
   * 모양을 강제하지 않는다 — 읽는 쪽이 자기가 아는 키만 본다.
   */
  readonly metadata: Readonly<Record<string, unknown>>
}

/**
 * 상품을 못 가져온 **이유**. `null` 하나로는 네 가지 서로 다른 사고가 구분되지 않는다 —
 * 실제로 그래서 스토어 연동을 뚫는 데 하루가 갔다(2026-09-01).
 *
 *   notConfigured  SDK 가 안 켜졌다. 키가 없거나 `identify` 전이다 → **앱 설정 문제**
 *   error          `getOfferings` 가 던졌다 → **네트워크·키 오류**
 *   noCurrent      RC 는 답했는데 current 오퍼링이 없다 → **대시보드 구성 문제**
 *   emptyPackages  오퍼링은 있는데 패키지가 0개다 → **스토어가 상품을 안 준다**
 *                  (계약 미활성·상품 미전파·번들 ID 불일치가 전부 여기로 떨어진다)
 */
export type OfferingDiagnostic =
  | { readonly kind: "ok"; readonly count: number }
  | { readonly kind: "notConfigured"; readonly keyPrefix: string }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "noCurrent"; readonly offeringIds: readonly string[] }
  | { readonly kind: "emptyPackages"; readonly offeringId: string }

let lastDiagnostic: OfferingDiagnostic = { kind: "ok", count: 0 }

/** 마지막 `loadCurrentOffering` 이 실패한 이유. 테스트 빌드 화면이 그대로 보여 준다. */
export function lastOfferingDiagnostic(): OfferingDiagnostic {
  return lastDiagnostic
}

/** 사람이 읽을 한 줄. **키 전체를 찍지 않는다** — 앞 9자만 신원 확인용으로 남긴다. */
export function formatOfferingDiagnostic(d: OfferingDiagnostic): string {
  switch (d.kind) {
    case "ok":
      return `상품 ${d.count}개`
    case "notConfigured":
      return `SDK 미설정 (키 ${d.keyPrefix || "없음"})`
    case "error":
      return `조회 실패: ${d.message}`
    case "noCurrent":
      return `current 오퍼링 없음 (전체: ${d.offeringIds.join(",") || "0개"})`
    case "emptyPackages":
      return `스토어가 상품을 안 줌 (오퍼링 ${d.offeringId}, 패키지 0개)`
  }
}

/**
 * 지금 보여 줄 상품들. 없으면 null(키 미설정·오프라인·오퍼링 미구성).
 *
 * **null 을 "무료 사용자" 로 읽으면 안 된다.** 상품을 못 가져온 것뿐이고, 그때 화면은
 * 페이월 대신 "잠시 후 다시" 를 그려야 한다. 왜 못 가져왔는지는
 * `lastOfferingDiagnostic()` 에 남는다.
 */
export async function loadCurrentOffering(): Promise<CurrentOffering | null> {
  if (!configured) {
    lastDiagnostic = {
      kind: "notConfigured",
      keyPrefix: getRevenueCatApiKey().slice(0, 9),
    }
    return null
  }
  try {
    const offerings = await Purchases.getOfferings()
    const current: PurchasesOffering | null = offerings.current
    if (current === null) {
      lastDiagnostic = {
        kind: "noCurrent",
        offeringIds: Object.keys(offerings.all ?? {}),
      }
      return null
    }
    const packages = current.availablePackages.map(toOfferingPackage)
    lastDiagnostic =
      packages.length === 0
        ? { kind: "emptyPackages", offeringId: current.identifier }
        : { kind: "ok", count: packages.length }
    return {
      id: current.identifier,
      packages,
      metadata: (current.metadata ?? {}) as Readonly<Record<string, unknown>>,
    }
  } catch (error) {
    logger.warn("[purchases] offerings 조회 실패", error)
    lastDiagnostic = { kind: "error", message: describeError(error) }
    return null
  }
}

export type PurchaseOutcome =
  | { readonly status: "purchased" }
  /** 사용자가 결제창을 닫았다. **오류가 아니다** — 아무것도 그리지 않는다. */
  | { readonly status: "cancelled" }
  | { readonly status: "failed"; readonly message: string }

/** 결제창을 연다. 사용자 취소를 오류와 **반드시** 구분한다. */
export async function purchase(
  item: OfferingPackage,
): Promise<PurchaseOutcome> {
  if (!configured) return { status: "failed", message: "purchases_not_ready" }
  try {
    await Purchases.purchasePackage(item.raw)
    return { status: "purchased" }
  } catch (error) {
    if (isUserCancelled(error)) return { status: "cancelled" }
    logger.warn("[purchases] 결제 실패", error)
    return { status: "failed", message: describeError(error) }
  }
}

/** 복원. iOS 심사 필수 항목이라 페이월과 구독 관리 **양쪽**에 버튼이 있어야 한다. */
export async function restore(): Promise<PurchaseOutcome> {
  if (!configured) return { status: "failed", message: "purchases_not_ready" }
  try {
    await Purchases.restorePurchases()
    return { status: "purchased" }
  } catch (error) {
    if (isUserCancelled(error)) return { status: "cancelled" }
    return { status: "failed", message: describeError(error) }
  }
}

/**
 * SDK 가 구매 상태 변화를 알려 온다. **이 값을 권한으로 쓰지 않는다** —
 * 서버에 다시 물어보라는 신호로만 쓴다(머리말).
 */
export function onCustomerInfoUpdate(handler: () => void): () => void {
  if (!configured) return () => undefined
  const listener = (_info: CustomerInfo): void => handler()
  Purchases.addCustomerInfoUpdateListener(listener)
  return () => Purchases.removeCustomerInfoUpdateListener(listener)
}

/**
 * 스토어별 구독 관리 화면. **해지는 앱 안에서 처리하면 안 된다**(스토어가 정본이다).
 *
 * RC 가 주는 `managementURL` 은 구독이 있고 SDK 가 설정됐을 때만 나온다. 그 둘 중
 * 하나라도 아니면 null 인데, 거기서 화면이 버튼을 숨기면 **프리미엄 사용자가 구독을
 * 관리할 방법이 사라진다**(레드팀 검수에서 나온 막다른 길). 고정 딥링크가 그 자리를 메운다.
 */
const PLAY_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions"

/**
 * **모듈 로드 시점에 `Platform` 을 읽지 않는다.**
 *
 * 이 파일은 `services/core/sessionCleanup` 이 들여오고, 그 세션 정리는 결제와 무관한
 * 스위트가 잔뜩 들여온다. 그중에는 `react-native` 를 자기 필요한 부분만 목으로
 * 바꾸는 테스트가 있어서(`Platform` 이 없는 목), 최상위에서 `Platform.select` 를 부르면
 * 그 스위트들이 **로드 단계에서 통째로 죽는다** — 실제로 그렇게 깨졌다.
 *
 * 함수 안에서 읽으면 그 위험이 사라지고, 값도 어차피 호출 시점에만 필요하다.
 */
function storeSubscriptionsUrl(): string {
  return Platform.OS === "ios"
    ? "itms-apps://apps.apple.com/account/subscriptions"
    : PLAY_SUBSCRIPTIONS_URL
}

export async function managementUrl(): Promise<string> {
  const fallback = storeSubscriptionsUrl()
  if (!configured) return fallback
  try {
    // RC 가 주는 것이 더 정확하다 — 그 사용자의 **그 구독**으로 바로 간다.
    return (await Purchases.getCustomerInfo()).managementURL ?? fallback
  } catch {
    return fallback
  }
}

function isUserCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const candidate = error as { userCancelled?: unknown; code?: unknown }
  if (candidate.userCancelled === true) return true
  // 신형 SDK 는 코드로 준다(`userCancelled` 는 deprecated).
  return String(candidate.code ?? "") === "1"
}

function describeError(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown"
  const candidate = error as { code?: unknown; message?: unknown }
  return String(candidate.code ?? candidate.message ?? "unknown")
}

/** 테스트가 상태를 되돌린다. 프로덕션 경로에서는 부르지 않는다. */
export function resetPurchasesClientForTest(): void {
  configured = false
  configuredAppUserId = null
}
