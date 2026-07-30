import React from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
  Linking,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"

function useInfoColors() {
  const isDark = useAppColorScheme() === "dark"
  return {
    bg: isDark ? tokens.color.appBgDark.val : tokens.color.appBg.val,
    cardBg: isDark ? tokens.color.cardBgDark.val : "#FFF",
    text: isDark ? tokens.color.textDark.val : "#111",
    textSub: isDark ? tokens.color.textDarkSub.val : "#999",
    textValue: isDark ? tokens.color.textDark.val : "#333",
    icon: isDark ? tokens.color.textDarkSub.val : "#333",
    border: isDark ? tokens.color.borderDark.val : "#E0E0E0",
  }
}

export default function AppInfoScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useInfoColors()

  const InfoRow = ({
    label,
    value,
    onPress,
    isLast = false,
  }: {
    label: string
    value: string
    onPress?: () => void
    isLast?: boolean
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.infoRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.border,
        },
        pressed && onPress && styles.infoRowPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <ThemedText style={[styles.infoLabel, { color: c.textSub }]}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.infoValue, { color: c.textValue }]}>
        {value}
      </ThemedText>
    </Pressable>
  )

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={c.icon} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: c.text }]}>
          {t("settings.appInfo.title")}
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/MEDIOLOGY.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        {/* Customer Center Section */}
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: c.cardBg }]}>
            <ThemedText style={[styles.sectionTitle, { color: c.text }]}>
              {t("settings.appInfo.support")}
            </ThemedText>
            <InfoRow
              label={t("settings.appInfo.email")}
              value="contact@mediology.ai"
              onPress={() => Linking.openURL("mailto:contact@mediology.ai")}
            />
            <InfoRow
              label={t("settings.appInfo.website")}
              value="www.mediology.ai"
              onPress={() => Linking.openURL("https://www.mediology.ai")}
              isLast
            />
          </View>
        </View>

        {/* Company Footer */}
        <View style={styles.footer}>
          <ThemedText style={[styles.footerCompany, { color: c.textValue }]}>
            {t("settings.appInfo.company")}
          </ThemedText>
          <ThemedText style={[styles.footerText, { color: c.textSub }]}>
            {t("settings.appInfo.business")}
          </ThemedText>
          <ThemedText style={[styles.footerText, { color: c.textSub }]}>
            {t("settings.appInfo.address")}
          </ThemedText>
          <ThemedText style={[styles.footerText, { color: c.textSub }]}>
            {t("settings.appInfo.copyright")}
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 180,
    height: 48,
  },
  section: {
    marginBottom: 24,
  },
  sectionContent: {
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  infoRowPressed: {
    opacity: 0.6,
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  footerCompany: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
})
