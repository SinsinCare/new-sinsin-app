import React, { useState } from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
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

export function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut } = useAuth()
  const c = useSettingsColors()

  const [pushEnabled, setPushEnabled] = useState(false)
  const [marketingEnabled, setMarketingEnabled] = useState(false)
  const [logoutModalVisible, setLogoutModalVisible] = useState(false)

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
        {/* 알림 설정 */}
        <ToggleItem
          title="앱 푸시 알림 동의"
          description="서비스와 관련된 모든 알림을 수신해요."
          value={pushEnabled}
          onValueChange={setPushEnabled}
        />
        <ToggleItem
          title="마케팅 알림 동의"
          description="마케팅 정보 수신에 동의해요."
          value={marketingEnabled}
          onValueChange={setMarketingEnabled}
        />

        <View style={[styles.sectionDivider, { backgroundColor: c.secondaryBg }]} />

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
            <ThemedText style={[styles.navItemTitle, { color: c.text }]}>{title}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
          </Pressable>
        ))}

        <View style={[styles.sectionDivider, { backgroundColor: c.secondaryBg }]} />

        {/* 계정 */}
        <Pressable
          style={({ pressed }) => [
            styles.navItem,
            pressed && { backgroundColor: c.pressedBg },
          ]}
          onPress={() => setLogoutModalVisible(true)}
        >
          <ThemedText style={[styles.navItemTitle, { color: c.text }]}>로그아웃</ThemedText>
          <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.navItem,
            pressed && { backgroundColor: c.pressedBg },
          ]}
          onPress={() => router.push("/(settings)/withdrawal")}
        >
          <ThemedText style={[styles.navItemTitle, { color: c.text }]}>회원탈퇴</ThemedText>
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
          signOut()
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
})
