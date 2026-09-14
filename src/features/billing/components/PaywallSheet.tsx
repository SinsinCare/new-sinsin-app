import { useCallback, useEffect } from "react"
import { StatusBar, setStatusBarStyle } from "expo-status-bar"
import {
  afterModalTransitions,
  afterSiblingModalsGone,
} from "@/src/shared/components/appModalGate"
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import {
  V2BottomSheet,
  V2Button,
  V2Text,
  useV2Theme,
} from "@/src/design-system-v2"
import { isTestStoreKey } from "@/src/config/revenueCatConfig"
import { usePaywallController } from "../hooks/usePaywallController"
import type { PaywallRequest } from "../paywallHost"
import { perDayPrice } from "../pricing"
import { PaywallPlanOption } from "./PaywallPlanOption"

// Match the sheet detent and its 44 pt drag handle. An explicit viewport also
// bounds the scroll view when native accessibility text grows its intrinsic size.
const PAYWALL_HEIGHT_RATIO = 0.92
const SHEET_HANDLE_HEIGHT = 44

export interface PaywallSheetProps {
  readonly request: PaywallRequest | null
  readonly onClose: () => void
}
/**
 * 결제 화면의 법적 링크 — App Store 심사 3.1.2(a): 자동 갱신 구독을 파는 화면에는 이용약관(EULA)과
 * 개인정보 처리방침으로 가는 **동작하는 링크**가 있어야 한다(2026-09-14 심사 거절 대응 — 앱 설명에도
 * 같은 링크를 넣었다). 약관은 Apple 표준 EULA, 개인정보 처리방침은 스토어 목록과 같은 공개 문서다.
 */
export const PAYWALL_TERMS_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
export const PAYWALL_PRIVACY_URL =
  "https://healthier.notion.site/2fe91d1eca7780a7877cfd2692b4be3f"

export function PaywallSheet({ request, onClose }: PaywallSheetProps) {
  const { t } = useTranslation("billing")
  const { colors, mode } = useV2Theme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const finishClose = useCallback(() => {
    onClose()
    void afterSiblingModalsGone().then(() =>
      setStatusBarStyle(mode === "dark" ? "light" : "dark"),
    )
  }, [mode, onClose])
  const state = usePaywallController(request, finishClose)
  useEffect(() => {
    if (!request) return
    let active = true
    void afterModalTransitions().then(() => {
      if (active) setStatusBarStyle(mode === "dark" ? "light" : "dark")
    })
    return () => {
      active = false
    }
  }, [request, mode])
  const headline = useHeadline(request)
  const chosen = state.loading ? null : state.chosen
  const dailyPrice = chosen ? perDayPrice(chosen) : null
  return (
    <V2BottomSheet
      surface="billing_paywall"
      visible={request !== null}
      onClose={state.close}
      showClose
      layout="fill"
      snapPoints={["92%"]}
    >
      <View
        style={{ height: height * PAYWALL_HEIGHT_RATIO - SHEET_HANDLE_HEIGHT }}
      >
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <V2Text
                token="subtext.mediumStrong"
                color={colors.primary.primary}
              >
                {t("plan.premium")}
              </V2Text>
              <View style={styles.promise}>
                {!request?.reason && dailyPrice && (
                  <V2Text
                    color={colors.label.normal}
                    token="title.small"
                    style={styles.dailyHeadline}
                  >
                    {t("paywall.dailyLead", { price: dailyPrice })}
                  </V2Text>
                )}
                <V2Text color={colors.label.normal} token="title.small">
                  {request?.reason ? headline.title : t("paywall.heroTitle")}
                </V2Text>
              </View>
              {request?.reason && headline.subTitle && (
                <V2Text token="subtext.medium" color={colors.label.neutral}>
                  {headline.subTitle}
                </V2Text>
              )}
              {!request?.reason && (
                <V2Text token="subtext.small" color={colors.label.neutral}>
                  {dailyPrice && chosen
                    ? t(
                        chosen.lookupKey === "$rc_annual"
                          ? "paywall.annualBasis"
                          : "paywall.monthlyBasis",
                      )
                    : t("paywall.heroBody")}
                </V2Text>
              )}
            </View>
            <Image
              accessible={false}
              source={require("@/assets/images/home-record-character.png")}
              style={styles.character}
            />
          </View>
          <View
            style={[
              styles.benefits,
              { borderBottomColor: colors.line.neutral },
            ]}
          >
            {(["scan", "consult", "records"] as const).map((key, index) => (
              <View key={key} style={styles.benefit}>
                <View
                  style={[
                    styles.icon,
                    { backgroundColor: colors.fill.alternative },
                  ]}
                >
                  <Ionicons
                    accessible={false}
                    name={
                      (
                        [
                          "scan-outline",
                          "chatbubbles-outline",
                          "stats-chart-outline",
                        ] as const
                      )[index]
                    }
                    size={19}
                    color={colors.label.normal}
                  />
                </View>
                <View style={styles.benefitCopy}>
                  <V2Text
                    color={colors.label.normal}
                    token="subtext.largeStrong"
                  >
                    {t(`paywall.features.${key}.title`)}
                  </V2Text>
                  <V2Text token="subtext.medium" color={colors.label.neutral}>
                    {t(`paywall.features.${key}.body`)}
                  </V2Text>
                </View>
              </View>
            ))}
          </View>
          <V2Text token="subtext.mediumStrong" color={colors.label.neutral}>
            {t("paywall.choosePlan")}
          </V2Text>
          <View style={styles.plans}>
            {state.loading ? (
              <View
                accessibilityLabel={t("paywall.loading")}
                accessibilityState={{ busy: true }}
                style={styles.loading}
              >
                {[0, 1].map((key) => (
                  <View
                    key={key}
                    style={[
                      styles.skeleton,
                      { backgroundColor: colors.fill.alternative },
                    ]}
                  />
                ))}
                <V2Text token="subtext.medium" color={colors.label.neutral}>
                  {t("paywall.loading")}
                </V2Text>
              </View>
            ) : state.packages.length ? (
              state.packages.map((item) => (
                <PaywallPlanOption
                  key={item.id}
                  item={item}
                  monthly={
                    state.packages.find(
                      (pkg) => pkg.lookupKey === "$rc_monthly",
                    ) ?? null
                  }
                  selected={item.lookupKey === state.selected}
                  disabled={state.busy}
                  onSelect={() => state.setSelected(item.lookupKey)}
                />
              ))
            ) : (
              <View
                style={[
                  styles.unavailable,
                  { backgroundColor: colors.fill.alternative },
                ]}
              >
                <V2Text color={colors.label.normal} token="subtext.largeStrong">
                  {t("paywall.unavailable")}
                </V2Text>
                <V2Text token="subtext.medium" color={colors.label.neutral}>
                  {t("paywall.unavailableBody")}
                </V2Text>
                <V2Button
                  variant="weak"
                  color="neutral"
                  size="s"
                  onPress={state.retry}
                >
                  {t("paywall.retry")}
                </V2Button>
              </View>
            )}
          </View>
        </ScrollView>
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background.default,
              borderTopColor: colors.line.neutral,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {chosen && (
            <V2Text
              color={colors.label.normal}
              token="subtext.mediumStrong"
              style={styles.center}
            >
              {t(
                chosen.lookupKey === "$rc_annual"
                  ? "paywall.annualCharge"
                  : "paywall.monthlyCharge",
                { price: chosen.priceString },
              )}
            </V2Text>
          )}
          <V2Button
            fullWidth
            multilineLabel
            size="xl"
            loading={state.busy}
            disabled={state.loading || !chosen}
            onPress={() => void state.onBuy()}
          >
            {t(
              chosen
                ? chosen.lookupKey === "$rc_annual"
                  ? "paywall.ctaAnnual"
                  : "paywall.ctaMonthly"
                : "paywall.cta",
            )}
          </V2Button>
          <V2Text
            token="subtext.small"
            color={colors.label.neutral}
            style={styles.center}
          >
            {t("paywall.legal")}
          </V2Text>
          <View style={styles.restoreRow}>
            <Pressable
              accessibilityRole="button"
              disabled={state.busy}
              accessibilityState={{ disabled: state.busy }}
              onPress={() => void state.onRestore()}
              style={styles.restore}
            >
              <V2Text token="subtext.medium" color={colors.label.neutral}>
                {t("paywall.restore")}
              </V2Text>
            </Pressable>
            {isTestStoreKey() && (
              <V2Text token="subtext.small" color={colors.label.neutral}>
                {t("paywall.testStore")}
              </V2Text>
            )}
          </View>
          {/* 이용약관 · 개인정보 처리방침 — 위 머리말(3.1.2). 시트 위에서 바로 브라우저로 연다. */}
          <View style={styles.legalRow}>
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(PAYWALL_TERMS_URL)}
              style={styles.legalLink}
            >
              <V2Text token="subtext.small" color={colors.label.neutral}>
                {t("paywall.termsLink")}
              </V2Text>
            </Pressable>
            <V2Text token="subtext.small" color={colors.label.assistive}>
              ·
            </V2Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(PAYWALL_PRIVACY_URL)}
              style={styles.legalLink}
            >
              <V2Text token="subtext.small" color={colors.label.neutral}>
                {t("paywall.privacyLink")}
              </V2Text>
            </Pressable>
          </View>
        </View>
      </View>
    </V2BottomSheet>
  )
}
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

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0, flexShrink: 1 },
  body: { paddingHorizontal: 24, paddingBottom: 20, gap: 12 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
  },
  heroCopy: { flex: 1, gap: 8, minHeight: 116, justifyContent: "center" },
  promise: { gap: 2 },
  dailyHeadline: {
    fontSize: 24,
    lineHeight: 32,
    fontVariant: ["tabular-nums"],
  },
  character: {
    width: 76,
    height: 94,
    resizeMode: "contain",
    marginLeft: 4,
    marginRight: -8,
  },
  benefits: {
    gap: 12,
    paddingBottom: 16,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  benefit: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitCopy: { flex: 1, gap: 4 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  plans: { gap: 8, minHeight: 164 },
  loading: { gap: 8 },
  skeleton: { height: 66, borderRadius: 16 },
  unavailable: { minHeight: 164, borderRadius: 16, padding: 16, gap: 10 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  center: { textAlign: "center" },
  restoreRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 12,
    marginVertical: -8,
  },
  restore: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    columnGap: 8,
    marginTop: -8,
  },
  legalLink: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
})
