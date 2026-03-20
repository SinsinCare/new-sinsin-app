import React, { useEffect, useRef, useState } from "react"
import { StyleSheet, View, Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { nhisService } from "@/src/services/data/nhisService"

type PollStatus = "polling" | "failed" | "timeout"

export function NhisConfirmScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { requestId, pollIntervalMs } = useLocalSearchParams<{
    requestId: string
    pollIntervalMs: string
  }>()

  const [status, setStatus] = useState<PollStatus>("polling")
  const [errorMessage, setErrorMessage] = useState("")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = async () => {
    if (!requestId) return
    try {
      const result = await nhisService.healthCheckConfirm(requestId)
      if (result.status === "SUCCESS") {
        if (intervalRef.current) clearInterval(intervalRef.current)
        router.replace("/(settings)/health-results")
      } else if (result.status === "FAILED") {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setStatus("failed")
        setErrorMessage(result.message || "인증에 실패했습니다.")
      } else if (result.status === "TIMEOUT") {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setStatus("timeout")
        setErrorMessage("인증 시간이 초과되었습니다. 다시 시도해 주세요.")
      }
      // PENDING: continue polling
    } catch {
      // keep polling on network error
    }
  }

  useEffect(() => {
    const interval = Number(pollIntervalMs) || 3000
    poll()
    intervalRef.current = setInterval(poll, interval)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
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
        {status === "polling" ? (
          <>
            <View style={styles.spinnerWrapper}>
              <Ionicons name="hourglass-outline" size={52} color="#44AF94" />
            </View>
            <ThemedText style={styles.title}>
              검사 결과를 불러오고 있습니다
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {"인증 앱에서 인증을 완료하면\n자동으로 결과를 가져옵니다."}
            </ThemedText>
          </>
        ) : (
          <>
            <View style={styles.errorIconWrapper}>
              <Ionicons
                name={
                  status === "timeout" ? "time-outline" : "close-circle-outline"
                }
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
  spinnerWrapper: {
    marginBottom: 8,
  },
  errorIconWrapper: {
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
    backgroundColor: "#44AF94",
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
