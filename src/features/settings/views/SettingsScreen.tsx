import React, { useState } from "react"
import { StyleSheet, View, ScrollView, Pressable, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { ConfirmModal } from "@/src/shared/components/ConfirmModal"
import { ToggleItem } from "@/src/features/settings/components"
import { useAuth } from "@/src/hooks/useAuth"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { useNotifications } from "@/src/hooks/useNotifications"
import { useThemeStore, type ThemeMode } from "@/src/stores/themeStore"

export function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut, isAuthenticated } = useAuth()
  const c = useSettingsColors()
  const {
    settings,
    updateSettings,
    pushEnabled,
    setPushConsent,
    setNightPushConsent,
  } = useNotifications(isAuthenticated)

  const { themeMode, setThemeMode } = useThemeStore()
  const [logoutModalVisible, setLogoutModalVisible] = useState(false)

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode)
  }

  const handlePushToggle = async (value: boolean) => {
    try {
      const ok = await setPushConsent(value)
      if (value && !ok) {
        Alert.alert(
          "알림 권한 필요",
          "설정 앱에서 신신당부 알림 권한을 허용해주세요.",
        )
      }
    } catch {
      Alert.alert("알림 설정 실패", "잠시 후 다시 시도해주세요.")
    }
  }

  const handleMarketingToggle = async (value: boolean) => {
    await updateSettings({
      ...settings,
      nightPushConsent: value ? settings.nightPushConsent : false,
      categories: {
        ...settings.categories,
        marketing: { enabled: value },
      },
    })
  }

  const handleNightPushToggle = async (value: boolean) => {
    try {
      const ok = await setNightPushConsent(value)
      if (value && !ok) {
        Alert.alert(
          "앱 푸시 알림 필요",
          "먼저 앱 푸시 알림 동의와 기기 알림 권한을 켜주세요.",
        )
      }
    } catch {
      Alert.alert("알림 설정 실패", "잠시 후 다시 시도해주세요.")
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title="환경설정"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 화면 모드 */}
        <ThemedText style={[styles.sectionTitle, { color: c.textTertiary }]}>
          화면 모드
        </ThemedText>
        {(
          [
            { mode: "light", icon: "sunny-outline", label: "라이트 모드" },
            { mode: "dark", icon: "moon-outline", label: "다크 모드" },
            {
              mode: "system",
              icon: "phone-portrait-outline",
              label: "시스템 설정",
            },
          ] as const
        ).map(({ mode, icon, label }) => (
          <Pressable
            key={mode}
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
              <Ionicons name="checkmark" size={20} color="#34D399" />
            )}
          </Pressable>
        ))}

        <View
          style={[styles.sectionDivider, { backgroundColor: c.secondaryBg }]}
        />

        {/* 알림 설정 */}
        <ToggleItem
          title="앱 푸시 알림 동의"
          description="분석 완료와 공지 등 앱 푸시 알림을 수신해요."
          value={pushEnabled}
          onValueChange={handlePushToggle}
        />
        <Pressable
          style={({ pressed }) => [
            styles.navItem,
            pressed && { backgroundColor: c.pressedBg },
          ]}
          onPress={() => router.push("/(settings)/notification-settings")}
        >
          <ThemedText style={[styles.navItemTitle, { color: c.text }]}>
            알림 설정
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
        </Pressable>
        <ToggleItem
          title="마케팅 알림 동의"
          description="마케팅 정보 수신에 동의해요."
          value={settings.categories.marketing.enabled}
          onValueChange={handleMarketingToggle}
        />
        <ToggleItem
          title="야간 광고성 알림 동의"
          description="21:00~08:00 사이 광고성 알림을 수신해요."
          value={settings.nightPushConsent}
          onValueChange={handleNightPushToggle}
          disabled={!pushEnabled || !settings.categories.marketing.enabled}
        />

        <View
          style={[styles.sectionDivider, { backgroundColor: c.secondaryBg }]}
        />

        {/* 약관 */}
        {[
          {
            title: "회원 이용약관",
            onPress: () => router.push("/legal-document"),
          },
          {
            title: "개인정보 처리방침",
            onPress: () => router.push("/privacy-settings"),
          },
        ].map(({ title, onPress }) => (
          <Pressable
            key={title}
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
          style={({ pressed }) => [
            styles.navItem,
            pressed && { backgroundColor: c.pressedBg },
          ]}
          onPress={() => setLogoutModalVisible(true)}
        >
          <ThemedText style={[styles.navItemTitle, { color: c.text }]}>
            로그아웃
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.navItem,
            pressed && { backgroundColor: c.pressedBg },
          ]}
          onPress={() => router.push("/(settings)/withdrawal")}
        >
          <ThemedText style={[styles.navItemTitle, { color: c.text }]}>
            회원탈퇴
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
        </Pressable>
      </ScrollView>

      <ConfirmModal
        visible={logoutModalVisible}
        title="로그아웃 하시겠습니까?"
        description="정말 로그아웃 하시겠습니까?"
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
})
