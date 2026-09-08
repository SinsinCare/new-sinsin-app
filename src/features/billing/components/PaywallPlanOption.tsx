import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { V2Text, useV2Theme } from "@/src/design-system-v2"
import { hapticSelection } from "@/src/lib/haptics"
import type { OfferingPackage } from "../purchases/purchasesClient"
import { perDayPrice } from "../pricing"
import { annualSavings } from "../paywallPresentation"

export function PaywallPlanOption({
  item,
  monthly,
  selected,
  disabled,
  onSelect,
}: {
  item: OfferingPackage
  monthly: OfferingPackage | null
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation("billing")
  const { colors } = useV2Theme()
  const annual = item.lookupKey === "$rc_annual"
  const title = t(annual ? "paywall.annual" : "paywall.monthly")
  const discount = annualSavings(item, monthly)
  const dailyPrice = perDayPrice(item)
  const cadence = t(annual ? "paywall.annualCharge" : "paywall.monthlyCharge", {
    price: item.priceString,
  })
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={[
        title,
        dailyPrice ? t("paywall.perDay", { price: dailyPrice }) : null,
        cadence,
        discount ? t("paywall.discount", { percent: discount }) : null,
      ]
        .filter(Boolean)
        .join(", ")}
      disabled={disabled}
      onPress={() => {
        hapticSelection()
        onSelect()
      }}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: pressed
            ? colors.fill.normal
            : colors.background.default,
          borderColor: selected ? colors.primary.primary : colors.line.neutral,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.radio,
          {
            borderColor: selected
              ? colors.primary.primary
              : colors.label.assistive,
            backgroundColor: selected ? colors.primary.primary : "transparent",
          },
        ]}
      >
        {selected && (
          <Ionicons name="checkmark" size={13} color={colors.static.white} />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.top}>
          <V2Text color={colors.label.normal} token="subtext.largeStrong">
            {title}
          </V2Text>
          {discount !== null && (
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
          )}
          <View style={styles.spacer} />
          <V2Text
            color={colors.label.normal}
            token="title.xSmallWeak"
            style={styles.price}
          >
            {t(annual ? "paywall.annualPrice" : "paywall.monthlyPrice", {
              price: item.priceString,
            })}
          </V2Text>
        </View>
        <View style={styles.details}>
          <V2Text token="subtext.medium" color={colors.label.neutral}>
            {t(annual ? "paywall.billedAnnually" : "paywall.billedMonthly")}
          </V2Text>
          {dailyPrice && (
            <V2Text
              token="subtext.medium"
              color={colors.label.neutral}
              style={styles.price}
            >
              {t("paywall.dailyAverage", { price: dailyPrice })}
            </V2Text>
          )}
        </View>
      </View>
    </Pressable>
  )
}
const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 82,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, gap: 6 },
  price: { fontVariant: ["tabular-nums"], textAlign: "right" },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 3,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  spacer: { flexGrow: 1 },
  badge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
})
