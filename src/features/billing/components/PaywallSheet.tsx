/**
 * 페이월. **왜 막혔는지를 먼저 말하고, 그 다음이 상품이다.**
 *
 * 기획서 §02 · §05 를 따른다. 이 화면이 지키는 것 다섯 가지:
 *
 *  1. **가격을 앱에 박지 않는다.** `priceString` 은 스토어가 현지화해 준 문자열이다.
 *     "9,900원" 을 코드에 적으면 가격이 바뀌는 날, 인상 심사가 끝나기 전에, 통화가
 *     다른 나라에서 — 세 갈래로 거짓말이 된다.
 *  2. **할인율도 계산한다.** "-33%" 를 상수로 적으면 같은 이유로 거짓말이 된다.
 *  3. **법정 표기가 구매 버튼과 같은 화면 안에 있다.** 스크롤해야 보이면 심사 위반 소지다.
 *  4. **복원 버튼이 있다.** iOS 심사 필수 항목이다.
 *  5. **상품을 못 가져오면 페이월 대신 안내를 그린다.** 빈 페이월을 보여 주고 결제를
 *     기다리는 것이 가장 나쁘다 — 사용자는 우리가 파는 게 없다고 읽는다.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2BottomSheet,
  V2Button,
  V2Text,
  useV2Theme,
  spacing,
  radius,
} from "@/src/design-system-v2"
import { isTestStoreKey } from "@/src/config/revenueCatConfig"
import { toDurationBucket, trackAnalyticsEvent } from "@/src/features/analytics"
import { showErrorToast, showInfoToast } from "@/src/lib/toast"
import { useBilling } from "../BillingProvider"
import {
  loadCurrentOffering,
  purchase,
  restore,
  type CurrentOffering,
  type OfferingPackage,
} from "../purchases/purchasesClient"
import type { PaywallRequest } from "../paywallHost"
import { didRestoreSomething } from "../restoreOutcome"
import { formatLikePrice, perDayPrice } from "../pricing"

/** RC 표준 패키지 키. 이 둘만 그린다 — 가격표에 평생 상품이 없다. */
const MONTHLY = "$rc_monthly"
const ANNUAL = "$rc_annual"

export interface PaywallSheetProps {
  readonly request: PaywallRequest | null
  readonly onClose: () => void
}

export function PaywallSheet({ request, onClose }: PaywallSheetProps) {
  const { t } = useTranslation("billing")
  const { colors } = useV2Theme()
  const { status, syncNow } = useBilling()

  const [offering, setOffering] = useState<CurrentOffering | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string>(ANNUAL)
  const [busy, setBusy] = useState(false)
  const [openedAt, setOpenedAt] = useState<number | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const visible = request !== null
  const entry = request?.entry ?? "server_gate"

  useEffect(() => {
    if (!visible) {
      setOpenedAt(null)
      return
    }
    setOpenedAt(Date.now())
    trackAnalyticsEvent("paywall_shown", {
      entry,
      plan: status?.plan ?? "free",
      reason: request?.reason?.reason ?? "browse",
      capability: request?.reason?.capability ?? request?.capability ?? "none",
    })
    /*
      **요청 객체 하나에만 반응한다.** 호스트는 페이월을 열 때마다 새 객체를 넣으므로,
      이미 열려 있는 상태에서 다른 잠금이 열려도(예: 페이월 위에서 다른 API 가 402)
      계측과 상품 선택이 새 요청 기준으로 다시 잡힌다.

      `status?.plan` 을 넣지 않는 이유: 구매 직후 plan 이 바뀌는데, 그때 이 훅이 다시
      돌면 **방금 결제한 사람에게 `paywall_shown` 이 한 번 더 찍힌다.**
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  /*
    상품 로드는 계측과 별도 이펙트다 — [다시 시도]가 로드만 다시 돌려야
    `paywall_shown` 이 중복으로 찍히지 않는다.
  */
  useEffect(() => {
    if (!visible) return
    let cancelled = false
    setLoading(true)
    void loadCurrentOffering().then((result) => {
      if (cancelled) return
      setOffering(result)
      setLoading(false)
      // 연간이 있으면 연간을 고른 채로 연다(기획서 §05 "연간이 기본 선택").
      const hasAnnual =
        result?.packages.some((item) => item.lookupKey === ANNUAL) ?? false
      setSelected(hasAnnual ? ANNUAL : MONTHLY)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, reloadToken])

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  const close = useCallback(() => {
    if (openedAt !== null) {
      trackAnalyticsEvent("paywall_dismissed", {
        entry,
        dwell_bucket: toDurationBucket((Date.now() - openedAt) / 1000),
      })
    }
    onClose()
  }, [entry, onClose, openedAt])

  const packages = useMemo(() => {
    const all = offering?.packages ?? []
    // 순서를 여기서 정한다 — 연간이 위다. RC 의 배열 순서에 기대지 않는다.
    return [ANNUAL, MONTHLY]
      .map((key) => all.find((item) => item.lookupKey === key))
      .filter((item): item is OfferingPackage => item !== undefined)
  }, [offering])

  const chosen =
    packages.find((item) => item.lookupKey === selected) ?? packages[0] ?? null

  const onBuy = useCallback(async () => {
    if (chosen === null || busy) return
    setBusy(true)
    trackAnalyticsEvent("purchase_started", {
      entry,
      packageType: chosen.lookupKey,
    })
    const outcome = await purchase(chosen)
    if (outcome.status === "purchased") {
      trackAnalyticsEvent("purchase_completed", {
        entry,
        packageType: chosen.lookupKey,
      })
      /*
        **서버에 반영될 때까지 기다린다.** 여기서 바로 닫으면 사용자는 결제 직후
        여전히 잠긴 화면으로 돌아간다 — 웹훅이 도착할 때까지 몇 초에서 몇 분이다.
      */
      await syncNow().catch(() => undefined)
      setBusy(false)
      onClose()
      return
    }
    setBusy(false)
    trackAnalyticsEvent("purchase_failed", {
      entry,
      packageType: chosen.lookupKey,
      kind:
        outcome.status === "cancelled"
          ? "cancelled"
          : failureKind(outcome.message),
    })
    // **취소는 실패가 아니다.** 아무것도 그리지 않는다.
    if (outcome.status === "failed") showErrorToast(t("paywall.unavailable"))
  }, [chosen, busy, entry, onClose, syncNow, t])

  const onRestore = useCallback(async () => {
    if (busy) return
    setBusy(true)
    const outcome = await restore()
    /*
      **동기화가 돌려준 값으로 판정한다.** 여기서 `status` 를 읽으면 이 콜백이 만들어질
      때 닫힌 낡은 값이라, 복원에 성공해도 "복원할 내역이 없어요" 가 뜬다.
    */
    const synced =
      outcome.status === "purchased" ? await syncNow().catch(() => null) : null
    setBusy(false)
    const restored = didRestoreSomething(outcome.status, synced)
    trackAnalyticsEvent("restore_completed", { restored })
    showInfoToast(
      t(restored ? "subscription.restoreDone" : "subscription.restoreEmpty"),
    )
    if (restored) onClose()
  }, [busy, onClose, syncNow, t])

  const headline = useHeadline(request)

  return (
    <V2BottomSheet
      surface="billing_paywall"
      visible={visible}
      onClose={close}
      showClose
      title={headline.title}
      subTitle={headline.subTitle}
      primaryLabel={packages.length > 0 ? t("paywall.cta") : undefined}
      onPrimary={packages.length > 0 ? () => void onBuy() : undefined}
    >
      <View style={styles.body}>
        {loading ? (
          <View style={styles.center}>
            {/* 링 스피너를 쓰지 않는 것이 이 저장소 규칙이지만, 여기는 **상품을
                기다리는 잠깐**이라 스켈레톤이 오히려 가짜 가격처럼 보인다. */}
            <ActivityIndicator color={colors.label.assistive} />
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.center}>
            <V2Text token="title.small" color={colors.label.normal}>
              {t("paywall.unavailable")}
            </V2Text>
            <V2Text
              token="body.mediumWeak"
              color={colors.label.alternative}
              style={styles.centerText}
            >
              {t("paywall.unavailableBody")}
            </V2Text>
            <V2Button
              variant="weak"
              color="neutral"
              size="s"
              onPress={retry}
              style={styles.retryButton}
            >
              {t("paywall.retry")}
            </V2Button>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.benefits,
                { backgroundColor: colors.fill.alternative },
              ]}
            >
              <V2Text token="subtext.small" color={colors.label.assistive}>
                {t("paywall.benefitsTitle")}
              </V2Text>
              {(["unlimited", "trend", "history"] as const).map((key) => (
                <View key={key} style={styles.benefitRow}>
                  <View
                    style={[
                      styles.benefitDot,
                      { backgroundColor: colors.primary.primary },
                    ]}
                  />
                  <V2Text token="body.mediumWeak" color={colors.label.normal}>
                    {t(`paywall.benefits.${key}`)}
                  </V2Text>
                </View>
              ))}
            </View>

            <View style={styles.plans}>
              {packages.map((item) => (
                <PlanRow
                  key={item.id}
                  item={item}
                  monthly={
                    packages.find(
                      (entryItem) => entryItem.lookupKey === MONTHLY,
                    ) ?? null
                  }
                  selected={item.lookupKey === selected}
                  onSelect={() => setSelected(item.lookupKey)}
                />
              ))}
            </View>

            <V2Button
              variant="weak"
              color="neutral"
              size="s"
              onPress={() => void onRestore()}
            >
              {t("paywall.restore")}
            </V2Button>

            {/* 법정 표기 — **구매 버튼과 같은 화면 안**이어야 한다(기획서 §05). */}
            <V2Text token="subtext.small" color={colors.label.assistive}>
              {t("paywall.legal")}
            </V2Text>
            {isTestStoreKey() ? (
              <V2Text token="subtext.small" color={colors.status.negative}>
                {t("paywall.testStore")}
              </V2Text>
            ) : null}
          </>
        )}
      </View>
    </V2BottomSheet>
  )
}

/** 왜 막혔는지 → 헤드라인. **상품보다 먼저 나오는 문장이다.** */
function useHeadline(request: PaywallRequest | null): {
  title: string
  subTitle?: string
} {
  const { t } = useTranslation("billing")
  const reason = request?.reason ?? null
  if (reason === null) return { title: t("paywall.title") }

  if (reason.reason === "quota_exhausted" && reason.limit !== undefined) {
    // 기간 축은 서버가 주지 않는다 — 한도 값으로 갈라도 문구는 맞는다(일 1회 · 월 10회).
    const key =
      reason.limit <= 1
        ? "paywall.reason.quotaDay"
        : "paywall.reason.quotaMonth"
    return {
      title: t(key, { label: reason.label, limit: reason.limit }),
      subTitle: t("paywall.title"),
    }
  }
  return {
    title: t("paywall.reason.subscription", { label: reason.label }),
    subTitle: t("paywall.title"),
  }
}

function PlanRow({
  item,
  monthly,
  selected,
  onSelect,
}: {
  item: OfferingPackage
  monthly: OfferingPackage | null
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation("billing")
  const { colors } = useV2Theme()
  const isAnnual = item.lookupKey === ANNUAL

  /*
    할인율을 **계산한다.** 상수로 적으면 가격이 바뀌는 날 화면이 거짓말을 한다.
    월간 상품이 없으면 비교 대상이 없으므로 배지를 아예 그리지 않는다 —
    모르는 것을 0% 로 그리지 않는다.
  */
  const discount =
    isAnnual && monthly !== null && monthly.price > 0
      ? Math.round((1 - item.price / 12 / monthly.price) * 100)
      : null
  const perMonth =
    isAnnual && item.price > 0
      ? formatLikePrice(item.priceString, item.price / 12)
      : null
  /*
    **하루 얼마꼴.** 마케팅이 강조하는 축이라 상품마다 같이 보여 준다.
    계산할 수 없으면(주기를 모르거나 가격이 0) null 이고 그 줄을 안 그린다 —
    모르는 값을 그럴듯하게 채우면 사용자가 그것을 사실로 읽는다.
  */
  const perDay = perDayPrice(item)

  /*
    환산가는 가격 **아랫줄**에 모아 그린다. 배지·환산가·가격을 한 줄에 다 넣으면
    연간 행이 좁은 화면 폭에서 줄바꿈으로 무너진다(390pt 에서 재현됨).
  */
  const equivalents = [
    perDay !== null ? t("paywall.perDay", { price: perDay }) : null,
    perMonth !== null
      ? t("paywall.monthlyEquivalent", { price: perMonth })
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ")

  return (
    <V2Button
      variant={selected ? "fill" : "weak"}
      color={selected ? "brand" : "neutral"}
      onPress={onSelect}
      style={styles.planButton}
    >
      <View style={styles.planRow}>
        <V2Text
          token="title.xSmallWeak"
          color={selected ? colors.static.white : colors.label.normal}
        >
          {item.title}
        </V2Text>
        <View style={styles.planPrices}>
          <View style={styles.planPriceRow}>
            {discount !== null && discount > 0 ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.primary.primaryWeak },
                ]}
              >
                <V2Text token="subtext.small" color={colors.primary.primary}>
                  {t("paywall.discount", { percent: discount })}
                </V2Text>
              </View>
            ) : null}
            <V2Text
              token="title.xSmallWeak"
              color={selected ? colors.static.white : colors.label.normal}
            >
              {item.priceString}
            </V2Text>
          </View>
          {equivalents.length > 0 ? (
            <V2Text
              token="subtext.small"
              color={selected ? colors.static.white : colors.label.alternative}
            >
              {equivalents}
            </V2Text>
          ) : null}
        </View>
      </View>
    </V2Button>
  )
}

function failureKind(message: string): "store" | "network" | "unknown" {
  if (message.includes("NETWORK") || message.includes("OFFLINE"))
    return "network"
  return message === "unknown" ? "unknown" : "store"
}

const styles = StyleSheet.create({
  body: { gap: spacing[16], paddingBottom: spacing[8] },
  center: {
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[24],
  },
  centerText: { textAlign: "center" },
  benefits: {
    gap: spacing[6],
    padding: spacing[16],
    borderRadius: radius.xl,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  retryButton: { marginTop: spacing[4] },
  benefitDot: { width: 6, height: 6, borderRadius: 3 },
  plans: { gap: spacing[8] },
  planButton: { height: "auto", paddingVertical: spacing[12] },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
  },
  planPrices: { alignItems: "flex-end", gap: spacing[2] },
  planPriceRow: { flexDirection: "row", alignItems: "center", gap: spacing[6] },
  badge: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: radius.xs,
  },
})
