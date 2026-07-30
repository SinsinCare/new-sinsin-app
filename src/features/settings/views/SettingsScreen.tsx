import React, { useRef, useState } from "react"
import { StyleSheet, View, ScrollView, Pressable, Alert } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { ConfirmModal } from "@/src/shared/components/ConfirmModal"
import { ToggleItem } from "@/src/features/settings/components"
import { useAuth } from "@/src/hooks/useAuth"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { useNotifications } from "@/src/hooks/useNotifications"
import { useThemeStore, type ThemeMode } from "@/src/stores/themeStore"
import { showOpenSettingsAlert } from "@/src/features/settings/utils/openAppSettings"
import { notificationService } from "@/src/services/notificationService"
import { tokens } from "@/src/theme/tokens"
import { getAppLanguage, setAppLanguage, type Language } from "@/src/i18n"

export function SettingsScreen() {
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut, isAuthenticated } = useAuth()
  const c = useSettingsColors()
  const { settings, updateSettings, pushEnabled, setPushConsent } =
    useNotifications(isAuthenticated)

  const { themeMode, setThemeMode } = useThemeStore()
  const [logoutModalVisible, setLogoutModalVisible] = useState(false)
  const [languageChanging, setLanguageChanging] = useState(false)
  const languageChangeInFlightRef = useRef(false)
  const currentLanguage = getAppLanguage()

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode)
  }

  const handleLanguageChange = async (language: Language) => {
    if (languageChangeInFlightRef.current || language === getAppLanguage()) {
      return
    }
    languageChangeInFlightRef.current = true
    setLanguageChanging(true)
    try {
      await setAppLanguage(language)
    } catch {
      Alert.alert(
        t("settings.language.changeErrorTitle"),
        t("settings.language.changeErrorBody"),
      )
      return
    } finally {
      // 알림 재등록은 아래에서 이어지므로 성공 시에는 아직 잠금을 풀지 않는다.
      if (getAppLanguage() !== language) {
        languageChangeInFlightRef.current = false
        setLanguageChanging(false)
      }
    }

    // 이미 예약된 로컬 알림과 서버에 등록된 푸시 토큰의 언어도 함께 바꾼다.
    // 알림 재등록 실패가 이미 끝난 화면 언어 변경을 실패로 되돌리지는 않는다.
    await Promise.allSettled([
      notificationService.scheduleAll(settings),
      ...(pushEnabled ? [notificationService.registerPushToken()] : []),
    ])
    languageChangeInFlightRef.current = false
    setLanguageChanging(false)
  }

  const handlePushToggle = async (value: boolean) => {
    try {
      const ok = await setPushConsent(value)
      if (value && !ok) {
        showOpenSettingsAlert(
          t("settings.notifications.disabledTitle"),
          t("settings.notifications.disabledBody"),
        )
      }
    } catch {
      Alert.alert(
        t("settings.notifications.saveErrorTitle"),
        t("settings.notifications.saveErrorBody"),
      )
    }
  }

  const handleMarketingToggle = async (value: boolean) => {
    await updateSettings({
      ...settings,
      categories: {
        ...settings.categories,
        marketing: { enabled: value },
      },
    })
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title={t("settings.title")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
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
        {/* 화면 모드 */}
        <ThemedText style={[styles.sectionTitle, { color: c.textTertiary }]}>
          {t("settings.display.section")}
        </ThemedText>
        {(
          [
            {
              mode: "light",
              icon: "sunny-outline",
              label: t("settings.display.light"),
            },
            {
              mode: "dark",
              icon: "moon-outline",
              label: t("settings.display.dark"),
            },
            {
              mode: "system",
              icon: "phone-portrait-outline",
              label: t("settings.display.system"),
            },
          ] as const
        ).map(({ mode, icon, label }) => (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityState={{ selected: themeMode === mode }}
            accessibilityLabel={label}
            style={({ pressed }) => [
              styles.themeOption,
              pressed && { backgroundColor: c.pressedBg },
            ]}
            onPress={() => handleThemeChange(mode)}
          >
            <View style={styles.themeOptionLeft}>
              <Ionicons
                name={icon}
                size={20}
                color={c.icon}
                style={styles.themeIcon}
              />
              <ThemedText style={[styles.themeOptionLabel, { color: c.text }]}>
                {label}
              </ThemedText>
            </View>
            {themeMode === mode && (
              <Ionicons
                name="checkmark"
                size={20}
                color={tokens.color.sub6.val}
              />
            )}
          </Pressable>
        ))}

        <View
          style={[styles.sectionDivider, { backgroundColor: c.secondaryBg }]}
        />

        <ThemedText style={[styles.sectionTitle, { color: c.textTertiary }]}>
          {t("settings.language.section")}
        </ThemedText>
        {(
          [
            { language: "ko", label: t("settings.language.korean") },
            { language: "en", label: t("settings.language.english") },
          ] as const
        ).map(({ language, label }) => (
          <Pressable
            key={language}
            accessibilityRole="radio"
            accessibilityState={{
              selected: currentLanguage === language,
              disabled: languageChanging,
            }}
            accessibilityLabel={label}
            disabled={languageChanging}
            style={({ pressed }) => [
              styles.themeOption,
              pressed && { backgroundColor: c.pressedBg },
              languageChanging && styles.languageOptionDisabled,
            ]}
            onPress={() => void handleLanguageChange(language)}
          >
            <ThemedText style={[styles.themeOptionLabel, { color: c.text }]}>
              {label}
            </ThemedText>
            {currentLanguage === language && (
              <Ionicons
                name="checkmark"
                size={20}
                color={tokens.color.sub6.val}
              />
            )}
          </Pressable>
        ))}

        <View
          style={[styles.sectionDivider, { backgroundColor: c.secondaryBg }]}
        />

        {/* 알림 설정 */}
        <ToggleItem
          title={t("settings.notifications.app")}
          description={t("settings.notifications.appDescription")}
          value={pushEnabled}
          onValueChange={handlePushToggle}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings.notifications.detail")}
          style={({ pressed }) => [
            styles.navItem,
            pressed && { backgroundColor: c.pressedBg },
          ]}
          onPress={() => router.push("/(settings)/notification-settings")}
        >
          <ThemedText style={[styles.navItemTitle, { color: c.text }]}>
            {t("settings.notifications.detail")}
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
        </Pressable>
        <ToggleItem
          title={t("settings.notifications.marketing")}
          description={t("settings.notifications.marketingDescription")}
          value={settings.categories.marketing.enabled}
          onValueChange={handleMarketingToggle}
        />

        <View
          style={[styles.sectionDivider, { backgroundColor: c.secondaryBg }]}
        />

        {/* 약관 */}
        {[
          {
            title: t("settings.legal.terms"),
            onPress: () => router.push("/legal-document"),
          },
          {
            title: t("settings.legal.privacy"),
            onPress: () => router.push("/privacy-settings"),
          },
        ].map(({ title, onPress }) => (
          <Pressable
            key={title}
            accessibilityRole="button"
            accessibilityLabel={title}
            style={({ pressed }) => [
              styles.navItem,
              pressed && { backgroundColor: c.pressedBg },
            ]}
            onPress={onPress}
          >
            <ThemedText style={[styles.navItemTitle, { color: c.text }]}>
              {title}
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
          </Pressable>
        ))}

        <View
          style={[styles.sectionDivider, { backgroundColor: c.secondaryBg }]}
        />

        {/* 계정 */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings.account.logout")}
          style={({ pressed }) => [
            styles.navItem,
            pressed && { backgroundColor: c.pressedBg },
          ]}
          onPress={() => setLogoutModalVisible(true)}
        >
          <ThemedText style={[styles.navItemTitle, { color: c.text }]}>
            {t("settings.account.logout")}
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings.account.withdraw")}
          style={({ pressed }) => [
            styles.navItem,
            pressed && { backgroundColor: c.pressedBg },
          ]}
          onPress={() => router.push("/(settings)/withdrawal")}
        >
          <ThemedText style={[styles.navItemTitle, { color: c.text }]}>
            {t("settings.account.withdraw")}
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
        </Pressable>
      </ScrollView>

      <ConfirmModal
        visible={logoutModalVisible}
        title={t("settings.account.logoutTitle")}
        description={t("settings.account.logoutBody")}
        confirmText={t("settings.account.logout")}
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={() => {
          setLogoutModalVisible(false)
          signOut("explicit")
        }}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionDivider: {
    height: 12,
    marginHorizontal: -20,
    marginVertical: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: -20,
  },
  navItemTitle: {
    fontSize: 16,
    lineHeight: 16 * 1.4,
    fontWeight: "400",
  },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
    paddingTop: 20,
    paddingBottom: 4,
  },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: -20,
  },
  themeOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  themeIcon: {
    width: 20,
  },
  themeOptionLabel: {
    fontSize: 16,
    lineHeight: 16 * 1.4,
    fontWeight: "400",
  },
  languageOptionDisabled: { opacity: 0.55 },
})
