/**
 * 마이페이지의 구독 카드 — **지금 무슨 플랜인지**와 **올리는 길**.
 *
 * ## 왜 마이페이지에 있어야 하나
 *
 * 페이월은 **막혔을 때만** 열린다. 그래서 아직 한도에 안 닿은 사람은 프리미엄이 있다는
 * 것조차 모르고, 이미 결제한 사람은 자기가 무엇을 샀는지 확인할 곳이 없다.
 * 이 카드가 그 둘을 동시에 메운다.
 *
 * ## 가격 문구는 계산해서 만든다
 *
 * "하루 216원" 은 상수가 아니라 스토어 가격에서 나온다(`pricing.ts`). 상품을 못 가져오면
 * **가격 줄을 통째로 안 그린다** — 모르는 값을 그럴듯하게 채우면 사용자가 그것을 사실로
 * 읽는다. CTA 는 그대로 두므로 결제 경로는 살아 있다.
 *
 * ## 결제한 사람에게는 팔지 않는다
 *
 * 이미 프리미엄이면 후킹 문구도 CTA 도 안 그린다. 대신 갱신일과 관리 경로를 준다 —
 * 돈을 낸 사람에게 계속 광고를 보여 주는 것은 그 자체로 나쁜 경험이다.
 */

import { useEffect, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Ionicons } from "@expo/vector-icons"

import { V2Text, useV2Theme } from "@/src/design-system-v2"
import { openPaywall } from "../paywallHost"
import { cheapestPerDay } from "../pricing"
import {
  loadCurrentOffering,
  type CurrentOffering,
} from "../purchases/purchasesClient"
import type { BillingStatus } from "../types"

export interface PlanCardProps {
  /** 서버 판정. `null` 이면 아직 모르는 상태라 카드를 안 그린다. */
  readonly status: BillingStatus | null
  /** 구독 상세로 가는 길. 안 주면 그 줄을 안 그린다. */
  readonly onManagePress?: () => void
}

export function PlanCard({ status, onManagePress }: PlanCardProps) {
  const { t } = useTranslation("billing")
  const { colors } = useV2Theme()
  const [offering, setOffering] = useState<CurrentOffering | null>(null)

  const plan = status?.plan ?? null
  const isPaid = plan === "premium" || plan === "care_plus"

  useEffect(() => {
    /*
      결제한 사람에게는 상품을 부르지 않는다 — 쓸 데가 없고, SDK 왕복만 는다.
      취소된 뒤에도 화면이 살아 있을 수 있으므로 `cancelled` 로 늦은 응답을 버린다.
    */
    if (status === null || isPaid) return
    let cancelled = false
    void loadCurrentOffering().then((value) => {
      if (!cancelled) setOffering(value)
    })
    return () => {
      cancelled = true
    }
  }, [status, isPaid])

  // 서버 판정을 모르는 동안에는 아무것도 안 그린다. 빈 카드나 "무료" 를 먼저 그리면
  // 결제한 사람이 잠깐 무료로 보이고, 그 깜빡임이 곧 불신이 된다.
  if (status === null || plan === null) return null

  const perDay = isPaid ? null : cheapestPerDay(offering?.packages ?? [])

  return (
    <View style={[styles.card, { backgroundColor: colors.background.floated }]}>
      <View style={styles.row}>
        <View style={styles.labelColumn}>
          <V2Text token="subtext.small" color={colors.label.alternative}>
            {t("plan.currentLabel")}
          </V2Text>
          <V2Text token="title.small" color={colors.label.normal}>
            {t(`plan.name.${plan}`)}
          </V2Text>
        </View>

        {isPaid ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.primary.primaryWeak },
            ]}
          >
            <V2Text token="subtext.small" color={colors.primary.primary}>
              {status.entitlement?.willRenew === false
                ? t("plan.badge.cancelled")
                : t("plan.badge.active")}
            </V2Text>
          </View>
        ) : null}
      </View>

      {isPaid ? (
        <PaidDetail status={status} onManagePress={onManagePress} />
      ) : (
        <Upgrade perDayText={perDay?.text ?? null} />
      )}
    </View>
  )
}

/** 결제한 사람에게 보이는 것 — 갱신 상태와 관리 경로. 광고는 없다. */
function PaidDetail({
  status,
  onManagePress,
}: {
  readonly status: BillingStatus
  readonly onManagePress?: () => void
}) {
  const { t } = useTranslation("billing")
  const { colors } = useV2Theme()
  const entitlement = status.entitlement
  const until = formatUntil(entitlement?.expiresAt ?? null)

  return (
    <>
      {until !== null ? (
        <V2Text token="subtext.small" color={colors.label.alternative}>
          {/*
            해지한 사람에게는 "갱신" 이 아니라 "언제까지 쓸 수 있는가" 를 말해야 한다.
            돈을 냈으니 그 기간은 그의 것이고, 그 사실이 가장 궁금한 정보다.
          */}
          {entitlement?.willRenew === false
            ? t("plan.activeUntil", { date: until })
            : t("plan.renewsOn", { date: until })}
        </V2Text>
      ) : null}

      {onManagePress !== undefined ? (
        <Pressable
          onPress={onManagePress}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.manageRow}
        >
          <V2Text token="subtext.small" color={colors.primary.primary}>
            {t("plan.manage")}
          </V2Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.primary.primary}
          />
        </Pressable>
      ) : null}
    </>
  )
}

/** 무료 사용자에게 보이는 것 — 후킹 한 줄과 CTA. */
function Upgrade({ perDayText }: { readonly perDayText: string | null }) {
  const { t } = useTranslation("billing")
  const { colors } = useV2Theme()

  return (
    <>
      {/*
        후킹은 **가격을 알 때만** 그린다. 상품을 못 가져왔으면(오프라인·미설정) 이 줄이
        통째로 빠지고 CTA 만 남는다 — 결제 경로는 살아 있고 거짓 숫자는 안 나간다.
      */}
      {perDayText !== null ? (
        <V2Text token="subtext.small" color={colors.label.normal}>
          {t("plan.perDayHook", { price: perDayText })}
        </V2Text>
      ) : null}

      <Pressable
        onPress={() => openPaywall({ entry: "settings_subscription" })}
        accessibilityRole="button"
        style={[styles.cta, { backgroundColor: colors.primary.primary }]}
      >
        <V2Text token="body.mediumWeak" color={colors.static.white}>
          {t("plan.upgradeCta")}
        </V2Text>
      </Pressable>
    </>
  )
}

/**
 * `YYYY-MM-DD` 만 뽑는다. 시각까지 보여 줄 이유가 없고, 시간대 해석이 끼면 하루가 밀린다.
 * 서버가 주는 값은 ISO 문자열이다.
 */
function formatUntil(iso: string | null): string | null {
  if (iso === null || iso.length < 10) return null
  const date = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/u.test(date) ? date : null
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelColumn: { gap: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
  },
  cta: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
})
