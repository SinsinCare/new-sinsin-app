import { ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import Ionicons from "@expo/vector-icons/Ionicons"
import { V2Button, V2Text, useV2Theme } from "@/src/design-system-v2"
import { useGoBack } from "@/src/shared/navigation/useGoBack"
import { SettingsDetailHeader } from "@/src/features/settings/components/SettingsDetailHeader"
import { useSubscriptionScreen } from "../hooks/useSubscriptionScreen"
import {
  subscriptionAccess,
  subscriptionDate,
} from "../subscriptionPresentation"
import { openPaywall } from "../paywallHost"

export function SubscriptionScreen() {
  const { t } = useTranslation("billing")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const goBack = useGoBack()
  const m = useSubscriptionScreen()
  const { status } = m
  const paid = status?.plan === "premium" || status?.plan === "care_plus"
  const entitlement = status?.entitlement
  const until = subscriptionDate(entitlement?.expiresAt)
  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background.default }]}
    >
      <SettingsDetailHeader title={t("subscription.title")} onBack={goBack} />
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View
          style={[
            styles.overview,
            { backgroundColor: colors.fill.alternative },
          ]}
        >
          <View style={styles.overviewTop}>
            <V2Text token="subtext.medium" color={colors.label.neutral}>
              {t("subscription.currentPlan")}
            </V2Text>
            {status && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.background.default },
                ]}
              >
                <V2Text token="subtext.small" color={colors.label.normal}>
                  {t(
                    paid && entitlement?.willRenew === false
                      ? "plan.badge.cancelled"
                      : "plan.badge.active",
                  )}
                </V2Text>
              </View>
            )}
          </View>
          <V2Text token="title.small" color={colors.label.normal}>
            {status
              ? t(`plan.name.${status.plan}`)
              : t(m.isLoading ? "account.loading" : "subscription.loadError")}
          </V2Text>
          <V2Text token="subtext.medium" color={colors.label.neutral}>
            {t(
              status
                ? paid
                  ? "subscription.paidSummary"
                  : "subscription.freeSummary"
                : m.isLoading
                  ? "subscription.loadingBody"
                  : "subscription.loadErrorBody",
            )}
          </V2Text>
          {paid && until && (
            <View
              style={[styles.dateRow, { borderTopColor: colors.line.neutral }]}
            >
              <V2Text token="subtext.medium" color={colors.label.neutral}>
                {t(
                  entitlement?.willRenew
                    ? "subscription.nextRenewal"
                    : "subscription.accessUntil",
                )}
              </V2Text>
              <V2Text
                token="subtext.largeStrong"
                color={colors.label.normal}
                style={styles.number}
              >
                {until}
              </V2Text>
            </View>
          )}
        </View>

        {status && (
          <View style={styles.section}>
            <V2Text token="subtext.mediumStrong" color={colors.label.neutral}>
              {t("subscription.included")}
            </V2Text>
            {(
              [
                ["scan.unlimited", "scan", "scan-outline"],
                ["chat.unlimited", "consult", "chatbubbles-outline"],
              ] as const
            ).map(([key, label, icon]) => {
              const access = subscriptionAccess(status.capabilities[key])
              return (
                <View
                  key={key}
                  accessible
                  accessibilityLabel={[
                    t(`subscription.feature.${label}`),
                    access.kind === "quota"
                      ? t(
                          access.window === "day"
                            ? "subscription.dailyQuota"
                            : "subscription.monthlyQuota",
                          { limit: access.limit },
                        )
                      : t(`subscription.access.${access.kind}`),
                    access.kind === "quota"
                      ? t("subscription.remaining", {
                          remaining: access.remaining,
                        })
                      : "",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  style={[
                    styles.feature,
                    { borderBottomColor: colors.line.neutral },
                  ]}
                >
                  <Ionicons
                    accessible={false}
                    accessibilityElementsHidden
                    name={icon}
                    size={20}
                    color={colors.label.neutral}
                  />
                  <View style={styles.featureCopy}>
                    <V2Text
                      token="subtext.largeStrong"
                      color={colors.label.normal}
                    >
                      {t(`subscription.feature.${label}`)}
                    </V2Text>
                    <V2Text token="subtext.medium" color={colors.label.neutral}>
                      {access.kind === "quota"
                        ? t(
                            access.window === "day"
                              ? "subscription.dailyQuota"
                              : "subscription.monthlyQuota",
                            { limit: access.limit },
                          )
                        : t(`subscription.access.${access.kind}`)}
                    </V2Text>
                  </View>
                  {access.kind === "quota" && (
                    <V2Text
                      token="subtext.mediumStrong"
                      color={colors.label.normal}
                      style={styles.remaining}
                    >
                      {t("subscription.remaining", {
                        remaining: access.remaining,
                      })}
                    </V2Text>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {entitlement?.status === "in_billing_retry" && (
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.fill.alternative },
            ]}
          >
            <V2Text token="subtext.largeStrong" color={colors.status.negative}>
              {t("subscription.billingIssue")}
            </V2Text>
            <V2Text token="subtext.medium" color={colors.label.neutral}>
              {t("subscription.billingIssueBody")}
            </V2Text>
          </View>
        )}

        <View style={styles.section}>
          {status && (
            <V2Text token="subtext.mediumStrong" color={colors.label.neutral}>
              {t(
                paid ? "subscription.management" : "subscription.premiumTitle",
              )}
            </V2Text>
          )}
          {status && (
            <V2Text token="subtext.large" color={colors.label.normal}>
              {t(paid ? "subscription.manageBody" : "subscription.premiumBody")}
            </V2Text>
          )}
          <V2Button
            fullWidth
            multilineLabel
            size="l"
            disabled={m.busy !== null || m.isLoading}
            loading={m.busy === "manage"}
            onPress={() => {
              if (!status) void m.refresh().catch(() => undefined)
              else if (paid) void m.onManage()
              else openPaywall({ entry: "settings_subscription" })
            }}
          >
            {t(
              !status
                ? "subscription.retry"
                : paid
                  ? "subscription.manage"
                  : "subscription.upgrade",
            )}
          </V2Button>
        </View>

        <View style={[styles.restore, { borderTopColor: colors.line.neutral }]}>
          <View style={styles.featureCopy}>
            <V2Text token="subtext.largeStrong" color={colors.label.normal}>
              {t("subscription.restoreTitle")}
            </V2Text>
            <V2Text token="subtext.medium" color={colors.label.neutral}>
              {t("subscription.restoreBody")}
            </V2Text>
          </View>
          <V2Button
            variant="weak"
            color="neutral"
            size="m"
            multilineLabel
            disabled={m.busy !== null}
            loading={m.busy === "restore"}
            onPress={() => void m.onRestore()}
          >
            {t("subscription.restore")}
          </V2Button>
        </View>
        {m.notice && (
          <V2Text
            accessibilityLiveRegion="polite"
            token="subtext.medium"
            color={
              m.notice.error ? colors.status.negative : colors.label.neutral
            }
          >
            {t(m.notice.key)}
          </V2Text>
        )}
      </ScrollView>
    </View>
  )
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: 20, paddingTop: 20, gap: 28 },
  overview: { borderRadius: 18, padding: 20, gap: 8, minHeight: 132 },
  overviewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 16,
  },
  number: { fontVariant: ["tabular-nums"] },
  section: { gap: 12 },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureCopy: { flex: 1, gap: 4 },
  remaining: {
    maxWidth: "35%",
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  notice: { padding: 16, borderRadius: 12, gap: 6 },
  restore: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
})
