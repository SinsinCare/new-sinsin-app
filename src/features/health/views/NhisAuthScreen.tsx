import { StyleSheet, View, Pressable, Text, ScrollView } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"

const TEAL = tokens.color.sub6.val
const TEAL_PRESSED = "#3A9E85"

const CHIPS = [
  { icon: "shield-checkmark" as const, labelKey: "nhis.chips.simpleAuth" },
  { icon: "documents-outline" as const, labelKey: "nhis.chips.allAtOnce" },
  { icon: "calendar-outline" as const, labelKey: "nhis.chips.tenYears" },
] as const

export function NhisAuthScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { t } = useTranslation(["health", "common"])
  const isDark = useAppColorScheme() === "dark"

  const bg = isDark ? tokens.color.appBgDark.val : "#FFFFFF"
  const textPrimary = isDark ? tokens.color.textDark.val : "#17191C"
  const textSub = isDark ? tokens.color.textDarkSub.val : "#64748B"
  const outerRing = isDark ? "#0A2318" : "#E6F9F3"
  const midRing = isDark ? "#0F3326" : "#C0EDE0"
  const chipBg = isDark ? "#0D2E25" : "#F0FDF9"
  const chipBorder = isDark ? "#1A4535" : "#BBE9D8"
  const nhisBg = isDark ? "#0D2E25" : "#F0FDF9"
  const nhisBorder = isDark ? "#1A4535" : "#D1FAE5"

  return (
    <View
      style={[styles.root, { backgroundColor: bg, paddingTop: insets.top }]}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={22} color={textSub} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {t("common:brand.name")}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 동심원 히어로 */}
        <View style={styles.heroSection}>
          <View style={[styles.outerRing, { backgroundColor: outerRing }]}>
            <View style={[styles.midRing, { backgroundColor: midRing }]}>
              <View style={styles.innerCircle}>
                <Ionicons name="shield-checkmark" size={38} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* 건강보험공단 배지 */}
          <View
            style={[
              styles.nhisBadge,
              { backgroundColor: nhisBg, borderColor: nhisBorder },
            ]}
          >
            <Ionicons name="business-outline" size={13} color={TEAL} />
            <Text style={[styles.nhisBadgeText, { color: TEAL }]}>
              {t("nhis.organization")}
            </Text>
          </View>
        </View>

        {/* 타이틀 */}
        <View style={styles.textSection}>
          <Text style={[styles.title, { color: textPrimary }]}>
            {t("nhis.authTitle")}
          </Text>
          <Text style={[styles.subtitle, { color: textSub }]}>
            {t("nhis.authDescription")}
          </Text>
        </View>

        {/* 특징 칩 3개 */}
        <View style={styles.chipRow}>
          {CHIPS.map((chip) => (
            <View
              key={chip.labelKey}
              style={[
                styles.chip,
                { backgroundColor: chipBg, borderColor: chipBorder },
              ]}
            >
              <Ionicons name={chip.icon} size={15} color={TEAL} />
              <Text style={[styles.chipLabel, { color: TEAL }]}>
                {t(chip.labelKey)}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA 버튼 */}
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: pressed ? TEAL_PRESSED : TEAL },
          ]}
          onPress={() => router.push("/(settings)/health-nhis-request")}
        >
          <View style={styles.startButtonIcon}>
            <Ionicons name="finger-print-outline" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.startButtonText}>
            {t("nhis.startVerification")}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="rgba(255,255,255,0.6)"
          />
        </Pressable>

        {/* 하단 안내 */}
        <Text style={[styles.privacyNote, { color: textSub }]}>
          {t("nhis.authNote")}
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerPlaceholder: { width: 36 },

  body: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },

  /* 히어로 */
  heroSection: {
    alignItems: "center",
    gap: 16,
  },
  outerRing: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  midRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  nhisBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  nhisBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* 텍스트 */
  textSection: {
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  /* 칩 */
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* CTA */
  startButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  startButtonIcon: {
    marginRight: 8,
  },
  startButtonText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },

  /* 하단 */
  privacyNote: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
})
