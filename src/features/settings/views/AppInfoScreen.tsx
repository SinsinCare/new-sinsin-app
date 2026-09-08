import { SettingsDetailHeader } from "../components/SettingsDetailHeader"
import { useV2Theme } from "@/src/design-system-v2"
import React from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
  Linking,
} from "react-native"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import Constants from "expo-constants"
import { resolveBuildNumber } from "@/src/config/runtimeInfo"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { useTranslation } from "react-i18next"

function useInfoColors() {
  const { colors } = useV2Theme()
  return {
    bg: colors.background.default,
    cardBg: colors.background.default,
    text: colors.label.normal,
    textSub: colors.label.neutral,
    textValue: colors.label.normal,
    border: colors.line.neutral,
  }
}

export function AppInfoScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const c = useInfoColors()

  const buildNumber = resolveBuildNumber(
    Platform.OS === "android" ? "android" : "ios",
  )

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
      accessibilityRole={onPress ? "link" : undefined}
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
      <SettingsDetailHeader
        title={t("settings.appInfo.title")}
        onBack={router.back}
      />

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
            source={require("@/assets/branding/app_icon_260720.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText style={[styles.appName, { color: c.text }]}>
            {t("brand.name")}
          </ThemedText>
        </View>

        {/* Customer Center Section */}
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: c.cardBg }]}>
            <ThemedText
              style={[styles.sectionTitle, { color: c.text }]}
              lineBreakStrategyIOS="hangul-word"
            >
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
            />
            {/*
              **버전은 사용자가 읽을 수 있어야 한다.** 예전에는 앱 어디에도 없어서
              "안 돼요" 라는 제보를 받을 때마다 어느 빌드인지 되물어야 했고, 사용자는
              답할 방법이 없었다. 2026-08-30 에 그 확인 한 번에 40분이 갔다.
              빌드 번호는 정책 게이트·분석과 같은 함수로 읽는다 — 세 곳이 다른 값을
              말하면 이 화면을 읽어 준 사람의 말이 로그와 안 맞는다.
            */}
            <InfoRow
              label={t("settings.appInfo.version")}
              value={`${Constants.expoConfig?.version ?? "-"} (${buildNumber > 0 ? buildNumber : "-"})`}
              isLast
            />
          </View>
        </View>

        {/* Company Footer */}
        <View style={styles.footer}>
          <ThemedText
            style={[styles.footerCompany, { color: c.textValue }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("settings.appInfo.company")}
          </ThemedText>
          <ThemedText
            style={[styles.footerText, { color: c.textSub }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("settings.appInfo.business")}
          </ThemedText>
          <ThemedText
            style={[styles.footerText, { color: c.textSub }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("settings.appInfo.address")}
          </ThemedText>
          <ThemedText
            style={[styles.footerText, { color: c.textSub }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  appName: { fontSize: 17, lineHeight: 24, fontWeight: "600" },
  section: {
    marginBottom: 24,
  },
  sectionContent: { paddingTop: 12, paddingBottom: 4 },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: 12,
  },
  infoRowPressed: {
    opacity: 0.6,
  },
  infoLabel: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "right",
    flexShrink: 1,
    maxWidth: "70%",
    fontWeight: "500",
  },
  footer: {
    alignItems: "flex-start",
    paddingVertical: 24,
  },
  footerCompany: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  footerText: {
    fontSize: 13,
    textAlign: "left",
    lineHeight: 20,
  },
})
