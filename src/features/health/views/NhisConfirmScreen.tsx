import React, { useEffect, useState } from "react"
import { StyleSheet, View, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { nhisService } from "@/src/services/data/nhisService"
import { refreshHealthData } from "../data/healthQueries"
import { useHealthTheme } from "../hooks/useHealthTheme"

type ConfirmStatus = "loading" | "failed" | "timeout"

export function NhisConfirmScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { t } = useTranslation("health")
  const { healthColors } = useHealthTheme()
  const { requestId } = useLocalSearchParams<{ requestId: string }>()

  const [status, setStatus] = useState<ConfirmStatus>("loading")
  const [errorMessage, setErrorMessage] = useState("")

  const confirm = async () => {
    if (!requestId) return
    setStatus("loading")
    try {
      const result = await nhisService.healthCheckConfirm(requestId)
      if (result.status === "SUCCESS") {
        await refreshHealthData(queryClient)
        router.replace("/(settings)/health-dashboard")
      } else if (result.status === "TIMEOUT") {
        setStatus("timeout")
        setErrorMessage(t("nhis.confirmTimeout"))
      } else {
        setStatus("failed")
        setErrorMessage(t("nhis.confirmFailed"))
      }
    } catch {
      setStatus("failed")
      setErrorMessage(t("nhis.confirmNetworkError"))
    }
  }

  useEffect(() => {
    confirm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const isError = status === "failed" || status === "timeout"

  return (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor: healthColors.background },
        { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.center}>
        {status === "loading" ? (
          <>
            <View style={styles.iconWrapper}>
              <Ionicons
                name="hourglass-outline"
                size={52}
                color={tokens.color.sub6.val}
              />
            </View>
            <ThemedText style={[styles.title, { color: healthColors.text }]}>
              {t("nhis.loadingTitle")}
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: healthColors.textSecondary }]}
            >
              {t("nhis.loadingDescription")}
            </ThemedText>
          </>
        ) : (
          <>
            <View style={styles.iconWrapper}>
              <Ionicons
                name={
                  status === "timeout" ? "time-outline" : "close-circle-outline"
                }
                size={52}
                color={healthColors.negative}
              />
            </View>
            <ThemedText style={[styles.title, { color: healthColors.text }]}>
              {status === "timeout"
                ? t("nhis.timeoutTitle")
                : t("nhis.failedTitle")}
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: healthColors.textSecondary }]}
            >
              {errorMessage}
            </ThemedText>
          </>
        )}
      </View>

      {isError && (
        <View style={styles.buttonArea}>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <ThemedText style={styles.retryButtonText}>
              {t("nhis.retryVerification")}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  iconWrapper: {
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#17191C",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
  },
  buttonArea: {
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: tokens.color.sub6.val,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})
