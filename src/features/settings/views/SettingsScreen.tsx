import { afterSiblingModalsGone } from "@/src/shared/components/appModalGate"
import { setStatusBarStyle } from "expo-status-bar"
import { useThemeStore } from "@/src/stores/themeStore"
import { useRef, useState } from "react"
import { Appearance, ScrollView, StyleSheet, Switch, View } from "react-native"
import Constants from "expo-constants"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { useAppRouter } from "@/src/shared/navigation"
import { V2ScreenHeader } from "@/src/design-system-v2/components/V2ScreenHeader"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { ConfirmModal } from "@/src/shared/components/ConfirmModal"
import { AccountRow, AccountSection } from "../components/AccountPrimitives"
import { AccountPreferenceSheet } from "../components/AccountPreferenceSheet"
import { useSettingsScreen } from "../hooks/useSettingsScreen"
import type { ThemeMode } from "@/src/stores/themeStore"
import type { Language } from "@/src/i18n"

export function SettingsScreen() {
  const { t } = useTranslation("common")
  const { t: copy } = useTranslation("settings")
  const { colors } = useV2Theme()
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const model = useSettingsScreen()
  const [picker, setPicker] = useState<"theme" | "language">("theme")
  const [pickerVisible, setPickerVisible] = useState(false)
  const pickerRevision = useRef(0)
  const closePicker = () => {
    pickerRevision.current += 1
    setPickerVisible(false)
    void afterSiblingModalsGone().then(() => {
      const preference = useThemeStore.getState().themeMode
      const mode =
        preference === "system" ? Appearance.getColorScheme() : preference
      setStatusBarStyle(mode === "dark" ? "light" : "dark")
    })
  }
  const openPicker = (kind: typeof picker) => {
    pickerRevision.current += 1
    setPicker(kind)
    setPickerVisible(true)
  }
  const themeOptions = (["light", "dark", "system"] as const).map((value) => ({
    value,
    label: t(`settings.display.${value}`),
  }))
  const languageOptions = [
    { value: "ko", label: t("settings.language.korean") },
    { value: "en", label: t("settings.language.english") },
  ]
  const toggle = (
    label: string,
    value: boolean,
    onValueChange: (next: boolean) => Promise<void>,
  ) => (
    <Switch
      accessibilityLabel={label}
      accessibilityState={{ disabled: model.notificationDisabled }}
      disabled={model.notificationDisabled}
      value={value}
      onValueChange={(next) => void onValueChange(next)}
      trackColor={{ false: colors.fill.normal, true: colors.primary.primary }}
    />
  )

  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background.default }]}
    >
      <V2ScreenHeader
        title={t("settings.title")}
        onBack={() => router.back()}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <AccountSection title={copy("accountOverview.account")}>
          <AccountRow
            title={t("myPage.editProfile")}
            icon="person-outline"
            onPress={() => router.push("/(settings)/profile-edit")}
          />
          <AccountRow
            title={t("subscription.title", { ns: "billing" })}
            icon="card-outline"
            onPress={() => router.push("/(settings)/subscription")}
          />
        </AccountSection>
        <AccountSection title={copy("accountOverview.appPreferences")}>
          <AccountRow
            title={t("settings.display.section")}
            value={
              themeOptions.find((option) => option.value === model.themeMode)
                ?.label
            }
            onPress={() => openPicker("theme")}
          />
          <AccountRow
            title={t("settings.language.section")}
            value={
              languageOptions.find(
                (option) => option.value === model.currentLanguage,
              )?.label
            }
            disabled={model.languageChanging}
            onPress={() => openPicker("language")}
          />
        </AccountSection>
        <AccountSection title={copy("accountOverview.notifications")}>
          {model.notificationError != null && (
            <AccountRow
              title={copy("accountOverview.notificationError")}
              value={copy("accountOverview.retry")}
              onPress={() => void model.retryNotifications()}
            />
          )}
          <AccountRow
            title={t("settings.notifications.app")}
            description={t("settings.notifications.appDescription")}
            trailing={toggle(
              t("settings.notifications.app"),
              model.pushEnabled,
              model.handlePushToggle,
            )}
          />
          <AccountRow
            title={t("settings.notifications.detail")}
            onPress={() => router.push("/(settings)/notification-settings")}
          />
          <AccountRow
            title={t("settings.notifications.marketing")}
            description={t("settings.notifications.marketingDescription")}
            trailing={toggle(
              t("settings.notifications.marketing"),
              model.settings.categories.marketing.enabled,
              model.handleMarketingToggle,
            )}
          />
        </AccountSection>
        <AccountSection title={copy("accountOverview.about")}>
          <AccountRow
            title={t("settings.legal.terms")}
            onPress={() => router.push("/legal-document?type=terms-of-use")}
          />
          <AccountRow
            title={t("settings.legal.privacy")}
            onPress={() => router.push("/legal-document?type=privacy-policy")}
          />
          <AccountRow
            title={copy("accountOverview.appInfo")}
            value={Constants.expoConfig?.version}
            onPress={() => router.push("/(settings)/app-info")}
          />
        </AccountSection>
        <AccountSection title={copy("accountOverview.accountManagement")}>
          <AccountRow
            title={t("settings.account.logout")}
            onPress={() => model.setLogoutModalVisible(true)}
          />
          <AccountRow
            title={t("settings.account.withdraw")}
            onPress={() => router.push("/(settings)/withdrawal")}
          />
        </AccountSection>
      </ScrollView>
      <AccountPreferenceSheet
        visible={pickerVisible}
        title={t(
          picker === "theme"
            ? "settings.display.section"
            : "settings.language.section",
        )}
        options={picker === "theme" ? themeOptions : languageOptions}
        selected={picker === "theme" ? model.themeMode : model.currentLanguage}
        busy={model.languageChanging}
        onClose={closePicker}
        onSelect={(value) => {
          if (picker === "theme") {
            model.handleThemeChange(value as ThemeMode)
            closePicker()
          } else {
            const selection = pickerRevision.current
            void model.handleLanguageChange(value as Language).then((saved) => {
              if (saved && selection === pickerRevision.current) closePicker()
            })
          }
        }}
      />
      <ConfirmModal
        visible={model.logoutModalVisible}
        title={t("settings.account.logoutTitle")}
        description={t("settings.account.logoutBody")}
        confirmText={t("settings.account.logout")}
        onCancel={() => model.setLogoutModalVisible(false)}
        onConfirm={model.confirmLogout}
      />
    </View>
  )
}
const styles = StyleSheet.create({ screen: { flex: 1 } })
