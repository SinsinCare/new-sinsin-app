import React from "react"
import { StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { clearClientSession } from "@/src/services/core/sessionCleanup"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

export function WithdrawalCompleteScreen() {
  const insets = useSafeAreaInsets()
  const c = useSettingsColors()

  const handleComplete = async () => {
    await clearClientSession()
    router.replace("/(auth)/login")
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.content, { paddingTop: insets.top + 80 }]}>
        <ThemedText style={[styles.title, { color: c.text }]}>
          탈퇴가 완료되었습니다
        </ThemedText>
        <ThemedText style={[styles.description, { color: c.textSub }]}>
          {
            "회원탈퇴 처리를 완료했습니다\n그동안 신신당부를 이용해 주셔서 감사합니다"
          }
        </ThemedText>
      </View>

      <BottomActionBar
        label="로그인 화면으로 가기"
        paddingBottom={insets.bottom + 16}
        onPress={handleComplete}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
  },
  description: {
    marginTop: 24,
    fontSize: 16,
    lineHeight: 28,
    fontWeight: "600",
  },
})
