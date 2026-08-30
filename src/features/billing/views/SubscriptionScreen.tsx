/**
 * 구독 관리. 기획서 §05 의 "구독 관리" 화면.
 *
 * ## 해지는 여기서 처리하지 않는다
 *
 * **앱 안에서 해지 완료 처리를 하면 안 된다** — iOS·Android 모두 해지의 정본은
 * 스토어다. 우리가 자체 플래그로 "해지됨" 을 만들면, 스토어에서는 계속 청구되는데
 * 앱만 끊긴 상태가 만들어진다. 그래서 [스토어에서 관리] 로 딥링크를 보낸다.
 *
 * ## 무료 사용자에게도 의미가 있어야 한다
 *
 * 구독 중이 아닌 사람에게 이 화면이 빈 채로 열리면 "왜 들어왔지" 가 된다.
 * 지금 무엇을 쓸 수 있는지(하루 1회 · 월 10회)를 보여 주고 그다음이 제안이다.
 */

import { useCallback, useEffect, useState } from "react"
import { Linking, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2Button,
  V2Card,
  V2Screen,
  V2ScreenHeader,
  V2Text,
  spacing,
  useV2Theme,
} from "@/src/design-system-v2"
import { useGoBack } from "@/src/shared/navigation/useGoBack"
import { showInfoToast } from "@/src/lib/toast"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useBilling } from "../BillingProvider"
import { openPaywall } from "../paywallHost"
import { didRestoreSomething } from "../restoreOutcome"
import { managementUrl, restore } from "../purchases/purchasesClient"

export function SubscriptionScreen() {
  const { t } = useTranslation("billing")
  const { colors } = useV2Theme()
  const goBack = useGoBack()
  const { status, isLoading, isPremium, syncNow } = useBilling()

  const [manageUrl, setManageUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void managementUrl().then(setManageUrl)
  }, [status?.plan])

  const onRestore = useCallback(async () => {
    if (busy) return
    setBusy(true)
    const outcome = await restore()
    // 페이월과 같은 이유로 **동기화 결과**를 쓴다(그쪽 주석 참고).
    const synced =
      outcome.status === "purchased" ? await syncNow().catch(() => null) : null
    setBusy(false)
    const restored = didRestoreSomething(outcome.status, synced)
    trackAnalyticsEvent("restore_completed", { restored })
    showInfoToast(
      t(restored ? "subscription.restoreDone" : "subscription.restoreEmpty"),
    )
  }, [busy, syncNow, t])

  const entitlement = status?.entitlement ?? null

  return (
    <V2Screen scroll>
      <V2ScreenHeader title={t("subscription.title")} onBack={goBack} />

      <View style={styles.body}>
        <V2Card>
          <View style={styles.cardBody}>
            <V2Text token="subtext.small" color={colors.label.alternative}>
              {t("subscription.currentPlan")}
            </V2Text>
            <V2Text token="title.small" color={colors.label.normal}>
              {t(isPremium ? "plan.premium" : "plan.free")}
            </V2Text>

            {isLoading ? null : entitlement === null ? (
              <V2Text token="body.mediumWeak" color={colors.label.alternative}>
                {t("subscription.freeBody")}
              </V2Text>
            ) : (
              <>
                <V2Text
                  token="body.mediumWeak"
                  color={colors.label.alternative}
                >
                  {entitlement.expiresAt === null
                    ? ""
                    : t(
                        entitlement.willRenew
                          ? "subscription.renewsAt"
                          : "subscription.expiresAt",
                        {
                          date: formatDate(entitlement.expiresAt),
                        },
                      )}
                </V2Text>
                {entitlement.willRenew ? null : (
                  <V2Text token="subtext.small" color={colors.label.assistive}>
                    {t("subscription.willNotRenew")}
                  </V2Text>
                )}
              </>
            )}
          </View>
        </V2Card>

        {/*
          결제 실패 유예(기획서: 7일). 기능은 그대로 쓸 수 있다는 것을 **먼저** 말한다 —
          이 카드를 보고 사용자가 가장 먼저 걱정하는 것이 "지금 끊겼나" 다.
        */}
        {entitlement !== null && entitlement.status === "in_billing_retry" ? (
          <V2Card>
            <View style={styles.cardBody}>
              <V2Text token="title.xSmallWeak" color={colors.status.negative}>
                {t("subscription.billingIssue")}
              </V2Text>
              <V2Text token="body.mediumWeak" color={colors.label.alternative}>
                {t("subscription.billingIssueBody")}
              </V2Text>
            </View>
          </V2Card>
        ) : null}

        <View style={styles.actions}>
          {isPremium ? (
            /*
              **버튼을 숨기지 않는다.** `managementUrl()` 은 RC 가 주소를 못 줘도 스토어의
              구독 관리 화면으로 폴백한다 — 여기서 숨기면 SDK 설정에 실패한 프리미엄
              사용자가 구독을 관리할 방법이 사라진다(레드팀 검수의 막다른 길).
            */
            <V2Button
              fullWidth
              onPress={() => {
                if (manageUrl !== null) void Linking.openURL(manageUrl)
              }}
            >
              {t("subscription.manage")}
            </V2Button>
          ) : (
            <V2Button
              fullWidth
              onPress={() => openPaywall({ entry: "settings_subscription" })}
            >
              {t("subscription.upgrade")}
            </V2Button>
          )}

          {/* 복원은 **페이월과 여기 둘 다** 있어야 한다(iOS 심사 필수). */}
          <V2Button
            variant="weak"
            color="neutral"
            fullWidth
            onPress={() => void onRestore()}
          >
            {t("subscription.restore")}
          </V2Button>
        </View>
      </View>
    </V2Screen>
  )
}

/** 서버가 주는 naive UTC 문자열 → 사람이 읽는 날짜. 시각은 버린다(갱신일만 의미 있다). */
function formatDate(value: string): string {
  const parsed = new Date(`${value.replace(" ", "T")}Z`)
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10)
  return parsed.toLocaleDateString()
}

const styles = StyleSheet.create({
  body: { gap: spacing[12], paddingTop: spacing[12] },
  cardBody: { gap: spacing[4] },
  actions: { gap: spacing[8], paddingTop: spacing[8] },
})
