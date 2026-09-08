import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/src/hooks/useAuth"
import { useNotifications } from "@/src/hooks/useNotifications"
import { useThemeStore, type ThemeMode } from "@/src/stores/themeStore"
import { showOpenSettingsAlert } from "../utils/openAppSettings"
import { notificationService } from "@/src/services/notificationService"
import { getAppLanguage, setAppLanguage, type Language } from "@/src/i18n"
import { showErrorToast } from "@/src/lib/toast"
import { presentError } from "@/src/lib/errorMessage"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"

export function useSettingsScreen() {
  const { t } = useTranslation("common")
  const { signOut, isAuthenticated } = useAuth()
  const notifications = useNotifications(isAuthenticated)
  const { settings, updateSettings, pushEnabled, setPushConsent } =
    notifications

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
      return language === getAppLanguage()
    }
    languageChangeInFlightRef.current = true
    setLanguageChanging(true)
    try {
      await setAppLanguage(language)
    } catch {
      showErrorToast(
        t("settings.language.changeErrorTitle"),
        t("settings.language.changeErrorBody"),
      )
      return false
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
    return true
  }

  const notificationWriteRef = useRef(false)
  const [notificationChanging, setNotificationChanging] = useState(false)
  const handlePushToggle = async (value: boolean) => {
    if (notificationWriteRef.current || !notifications.isReady) return
    notificationWriteRef.current = true
    setNotificationChanging(true)
    try {
      const ok = await setPushConsent(value)
      if (value && !ok) {
        void showOpenSettingsAlert(
          t("settings.notifications.disabledTitle"),
          t("settings.notifications.disabledBody"),
        )
      }
    } catch (error) {
      // 오류를 버리고 고정 문구를 띄우던 자리. 푸시 동의 저장은 서버로 나가는 요청이라
      // 실패 원인이 세션 만료·요청 몰림일 때가 많은데, 둘 다 사용자가 할 일이 다르다.
      presentError(error, {
        scope: "push-consent",
        retry: () => void handlePushToggle(value),
      })
    } finally {
      notificationWriteRef.current = false
      setNotificationChanging(false)
    }
  }

  const handleMarketingToggle = async (value: boolean) => {
    if (notificationWriteRef.current || !notifications.isReady) return
    notificationWriteRef.current = true
    setNotificationChanging(true)
    try {
      await updateSettings({
        ...settings,
        categories: {
          ...settings.categories,
          marketing: { enabled: value },
        },
      })
    } catch (error) {
      presentError(error, { scope: "marketing-consent" })
    } finally {
      notificationWriteRef.current = false
      setNotificationChanging(false)
    }
  }

  return {
    themeMode,
    currentLanguage,
    languageChanging,
    handleThemeChange,
    handleLanguageChange,
    handlePushToggle,
    handleMarketingToggle,
    settings,
    pushEnabled,
    notificationDisabled: notificationChanging || !notifications.isReady,
    notificationError: notifications.error,
    retryNotifications: notifications.retry,
    logoutModalVisible,
    setLogoutModalVisible,
    confirmLogout: async () => {
      setLogoutModalVisible(false)
      await afterModalTransitions()
      await signOut("explicit")
    },
  }
}
