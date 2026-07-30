import React from "react"
import { StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { clearClientSession } from "@/src/services/core/sessionCleanup"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

export function WithdrawalCompleteScreen() {
  const insets = useSafeAreaInsets()
  const c = useSettingsColors()
  const { t } = useTranslation("settings")

  const handleComplete = async () => {
    await clearClientSession()
    router.replace("/(auth)/login")
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.content, { paddingTop: insets.top + 80 }]}>
        <ThemedText style={[styles.title, { color: c.text }]}>
          {t("withdrawal.completeTitle")}
        </ThemedText>
        <ThemedText style={[styles.description, { color: c.textSub }]}>
          {t("withdrawal.completeBody")}
        </ThemedText>
      </View>

      <BottomActionBar
        label={t("withdrawal.signIn")}
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
