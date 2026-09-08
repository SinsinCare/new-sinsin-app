import { Image, Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { V2Text, useV2Theme } from "@/src/design-system-v2"
import { openPaywall, useBilling } from "@/src/features/billing"
import { useAccountDailyPrice } from "@/src/features/billing/hooks/useAccountDailyPrice"
import { useAppRouter } from "@/src/shared/navigation"

export function AccountMembershipCard() {
  const { t } = useTranslation("billing")
  const { colors, mode } = useV2Theme()
  const { status, isLoading, refresh } = useBilling()
  const router = useAppRouter()
  const dailyQuote = useAccountDailyPrice(status)
  const paid = status?.plan === "premium" || status?.plan === "care_plus"
  const expiry = status?.entitlement?.expiresAt?.slice(0, 10)
  const date = expiry && /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry : null
  const title = status
    ? t(`plan.name.${status.plan}`)
    : t(isLoading ? "account.loading" : "account.unavailable")
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        t("plan.currentLabel"),
        title,
        dailyQuote ? t("paywall.perDay", { price: dailyQuote.text }) : null,
        dailyQuote ? t("paywall.heroTitle") : null,
        dailyQuote
          ? t(
              dailyQuote.pkg.lookupKey === "$rc_annual"
                ? "paywall.annualTotal"
                : "paywall.monthlyTotal",
              { price: dailyQuote.pkg.priceString },
            )
          : null,
        t(paid ? "plan.manage" : "account.viewBenefits"),
      ]
        .filter(Boolean)
        .join(", ")}
      disabled={isLoading && !status}
      onPress={() => {
        if (!status) {
          void refresh()
          return
        }
        if (paid) router.push("/(settings)/subscription")
        else openPaywall({ entry: "settings_subscription" })
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor:
            mode === "dark"
              ? colors.background.lower
              : colors.background.default,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.top}>
        <V2Text token="subtext.medium" color={colors.label.neutral}>
          {t("plan.currentLabel")}
        </V2Text>
        <View
          style={[styles.badge, { backgroundColor: colors.fill.alternative }]}
        >
          <V2Text color={colors.label.normal} token="subtext.small">
            {title}
          </V2Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.copy}>
          <View style={styles.promise}>
            <V2Text
              color={colors.label.normal}
              token={dailyQuote ? "title.small" : "title.xSmallWeak"}
              style={styles.price}
            >
              {dailyQuote
                ? t("paywall.dailyLead", { price: dailyQuote.text })
                : t(paid ? "account.paidTitle" : "account.freeTitle")}
            </V2Text>
            <V2Text
              token={dailyQuote ? "body.mediumStrong" : "subtext.medium"}
              color={dailyQuote ? colors.label.normal : colors.label.neutral}
            >
              {paid && date
                ? t(
                    status?.entitlement?.willRenew === false
                      ? "plan.activeUntil"
                      : "plan.renewsOn",
                    { date },
                  )
                : t(
                    dailyQuote
                      ? "paywall.heroTitle"
                      : paid
                        ? "account.paidBody"
                        : "account.freeBody",
                  )}
            </V2Text>
          </View>
          {dailyQuote && (
            <V2Text token="subtext.small" color={colors.label.neutral}>
              {t(
                dailyQuote.pkg.lookupKey === "$rc_annual"
                  ? "account.annualQuoteBasis"
                  : "account.monthlyQuoteBasis",
                { price: dailyQuote.pkg.priceString },
              )}
            </V2Text>
          )}
          <View style={styles.action}>
            <V2Text token="subtext.mediumStrong" color={colors.primary.primary}>
              {t(paid ? "plan.manage" : "account.viewBenefits")}
            </V2Text>
            <Ionicons
              accessible={false}
              name="chevron-forward"
              size={12}
              color={colors.primary.primary}
            />
          </View>
        </View>
        <Image
          accessible={false}
          source={require("@/assets/images/home-record-character.png")}
          style={styles.character}
        />
      </View>
    </Pressable>
  )
}
const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 20 },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 },
  price: { fontVariant: ["tabular-nums"] },
  promise: { gap: 2 },
  action: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  body: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    minHeight: 112,
  },
  copy: { flex: 1, gap: 8 },
  character: {
    width: 72,
    height: 80,
    resizeMode: "contain",
    marginRight: -4,
    marginLeft: 8,
  },
})
