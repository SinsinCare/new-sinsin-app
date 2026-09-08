/**
 * 결제 상태를 앱 전체에 공급한다.
 *
 * ## 이 프로바이더가 지키는 것
 *
 * **① 판정은 서버 것을 그대로 쓴다.** `/billing/me` 가 capability 마다의 완성된 답을
 * 준다. 여기서 plan 을 보고 다시 계산하지 않는다.
 *
 * **② SDK 는 서버가 발급한 식별자를 받은 뒤에만 켠다.** 부팅 시 익명으로 켜면 RC 에
 * 익명 고객이 생기고, 나중에 별칭되면서 남의 구매가 섞일 여지가 생긴다.
 *
 * **③ SDK 의 구매 알림은 권한이 아니라 트리거다.** `customerInfo` 가 바뀌면 서버에
 * 다시 물어본다(`/billing/sync`). 그 값을 그대로 믿으면 변조 클라이언트가 프리미엄이 된다.
 *
 * ## 로그인 전에는 아무것도 하지 않는다
 *
 * 질의도, SDK 설정도 세션이 **완전히 열린 뒤**에만 돈다. 온보딩 중인 계정에 결제를
 * 물어보면 401 이 나고, 그 401 이 `apiClient` 의 세션 정리를 건드린다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/src/stores"
import { logger } from "@/src/lib/logger"
import { BILLING_QUERY_KEY, billingApi } from "./services/billingApi"
import { isBillingHidden } from "./billingVisibility"
import {
  forgetUser,
  identify,
  onCustomerInfoUpdate,
} from "./purchases/purchasesClient"
import type { BillingStatus, CapabilityKey, CapabilityState } from "./types"

interface BillingContextValue {
  readonly status: BillingStatus | null
  /** 아직 모른다(로딩·오류·로그인 전). **"무료" 와 다르다.** */
  readonly isLoading: boolean
  readonly isPremium: boolean
  capability(key: CapabilityKey): CapabilityState | null
  /** 서버에 다시 묻는다(캐시 무효화). */
  refresh(): Promise<void>
  /**
   * RC 에서 당겨 반영한 뒤 **새 상태를 돌려준다.**
   *
   * `void` 가 아니라 값을 돌려주는 이유: 호출부는 대개 `await syncNow()` 직후 결과를
   * 판단하는데, 그 시점의 `status` 는 **그 호출을 시작할 때 닫힌 클로저의 낡은 값**이다.
   * 그래서 복원에 성공하고도 "복원할 내역이 없어요" 를 띄우던 결함이 있었다.
   */
  syncNow(): Promise<BillingStatus | null>
}

const BillingContext = createContext<BillingContextValue>({
  status: null,
  isLoading: true,
  isPremium: false,
  capability: () => null,
  refresh: async () => undefined,
  syncNow: async () => null,
})

export function useBilling(): BillingContextValue {
  return useContext(BillingContext)
}

export function BillingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accountState = useAuthStore((state) => state.accountState)
  const requiresAdditionalInfo = useAuthStore(
    (state) => state.requiresAdditionalInfo,
  )

  /* 관문을 전부 통과한 상태에서만 묻는다(머리말). `app/_layout.tsx` 와 같은 조건이다. */
  // 결제 기능이 숨겨진 동안은 서버에 묻지도, SDK 를 켜지도 않는다 — `status` 가 null 이라
  // 모든 capability 가 "모른다 = 열림" 으로 판정된다(`useFeatureAccess` 머리말).
  const enabled =
    isAuthenticated &&
    accountState === "ACTIVE" &&
    !requiresAdditionalInfo &&
    !isBillingHidden()

  const query = useQuery({
    queryKey: BILLING_QUERY_KEY,
    queryFn: () => billingApi.getStatus(),
    enabled,
    /*
      쿼터 잔량이 들어 있어서 다른 화면보다 짧게 잡는다. 스캔 한 번 뒤 통계로 갔을 때
      "오늘 1회 남음" 이 그대로면 사용자는 우리가 안 센 줄 안다.
    */
    staleTime: 60 * 1000,
  })

  const syncMutation = useMutation({
    mutationFn: () => billingApi.sync(),
    onSuccess: (status) => queryClient.setQueryData(BILLING_QUERY_KEY, status),
  })

  const status = query.data ?? null

  /* SDK 식별 — 서버가 발급한 id 를 받은 뒤에만. */
  const appUserId = status?.appUserId ?? null
  useEffect(() => {
    /*
      **식별자만 본다.** `status` 전체를 넣으면 쿼터가 하나 줄 때마다(응답이 매번 새
      객체다) SDK 식별을 다시 부른다 — `identify` 가 같은 id 를 걸러 내긴 하지만,
      의도를 코드로 적어 두는 편이 낫다.
    */
    if (appUserId === null) return
    void identify(appUserId)
  }, [appUserId])

  /* 세션이 닫히면 SDK 도 잊는다. 안 하면 같은 기기의 다음 사용자가 앞사람 구매를 본다. */
  useEffect(() => {
    if (enabled) return
    void forgetUser()
  }, [enabled])

  /*
    SDK 가 구매 상태 변화를 알려 오면 **서버에 다시 묻는다.** 알림의 값을 그대로
    쓰지 않는 이유는 머리말 ③.
  */
  useEffect(() => {
    if (!enabled) return
    return onCustomerInfoUpdate(() => {
      syncMutation.mutate(undefined, {
        onError: (error) =>
          logger.debug("[billing] customerInfo 동기화 실패", error),
      })
    })
    /*
      **세션 상태에만 반응한다.** `syncMutation` 은 렌더마다 새 객체라, 넣으면 리스너를
      매 렌더 떼었다 붙인다 — 그 사이에 도착한 구매 알림이 조용히 사라진다.
      `mutate` 는 최신 클로저를 보므로 값이 낡을 위험은 없다.
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY })
  }, [queryClient])

  const syncNow = useCallback(async (): Promise<BillingStatus | null> => {
    /*
      **결과를 돌려준다.** 호출부가 `await` 뒤에 읽는 `status` 는 이 호출을 시작할 때
      닫힌 클로저의 값이라 아직 옛 것이다 — 그 값으로 판정하면 복원 성공을
      "복원할 내역 없음" 으로 안내하게 된다.
    */
    return syncMutation.mutateAsync()
  }, [syncMutation])

  const value = useMemo<BillingContextValue>(
    () => ({
      status,
      // **오류도 "모른다" 다.** 여기서 false 를 주면 장애가 "구독 없음" 으로 보인다.
      isLoading: enabled && (query.isPending || query.isError),
      isPremium: status !== null && status.plan !== "free",
      capability: (key) => status?.capabilities[key] ?? null,
      refresh,
      syncNow,
    }),
    [status, enabled, query.isPending, query.isError, refresh, syncNow],
  )

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  )
}
