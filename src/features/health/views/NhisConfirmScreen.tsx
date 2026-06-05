import React, { useEffect, useState } from "react"
import { StyleSheet, View, Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { nhisService } from "@/src/services/data/nhisService"

type ConfirmStatus = "loading" | "failed" | "timeout"

export function NhisConfirmScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { requestId } = useLocalSearchParams<{ requestId: string }>()

  const [status, setStatus] = useState<ConfirmStatus>("loading")
  const [errorMessage, setErrorMessage] = useState("")

  const confirm = async () => {
    if (!requestId) return
    setStatus("loading")
    try {
      const result = await nhisService.healthCheckConfirm(requestId)
      if (result.status === "SUCCESS") {
        router.replace("/(settings)/health-results")
      } else if (result.status === "TIMEOUT") {
        setStatus("timeout")
        setErrorMessage("인증 시간이 초과되었습니다. 다시 시도해 주세요.")
      } else {
        setStatus("failed")
        setErrorMessage(result.message || "인증에 실패했습니다.")
      }
    } catch {
      setStatus("failed")
      setErrorMessage("네트워크 오류가 발생했습니다.")
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
        { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.center}>
        {status === "loading" ? (
          <>
            <View style={styles.iconWrapper}>
              <Ionicons name="hourglass-outline" size={52} color={tokens.color.sub6.val} />
            </View>
            <ThemedText style={styles.title}>결과를 불러오고 있습니다</ThemedText>
            <ThemedText style={styles.subtitle}>잠시만 기다려 주세요.</ThemedText>
          </>
        ) : (
          <>
            <View style={styles.iconWrapper}>
              <Ionicons
                name={status === "timeout" ? "time-outline" : "close-circle-outline"}
                size={52}
                color="#DC2626"
              />
            </View>
            <ThemedText style={styles.title}>
              {status === "timeout" ? "인증 시간 초과" : "인증 실패"}
            </ThemedText>
            <ThemedText style={styles.subtitle}>{errorMessage}</ThemedText>
          </>
        )}
      </View>

      {isError && (
        <View style={styles.buttonArea}>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <ThemedText style={styles.retryButtonText}>다시 시도</ThemedText>
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
