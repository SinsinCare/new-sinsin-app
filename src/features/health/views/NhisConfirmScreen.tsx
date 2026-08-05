import React, { useEffect, useState } from "react"
import { StyleSheet, View, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { nhisService } from "@/src/services/data/nhisService"
import type { HealthCheckConfirmStatus } from "@/src/types/nhis"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { refreshHealthData } from "../data/healthQueries"
import { useHealthTheme } from "../hooks/useHealthTheme"

/**
 * 화면 상태 = 로딩 + **서버가 말한 갈래 그대로**.
 *
 * 종전에는 서버 결과를 버리고 `failed`/`timeout` 둘로 뭉갰다. 그래서 "공단에 기록이
 * 없다"(인증은 성공)가 "인증을 확인하지 못했어요" 로 보였고, 이미 끝난 확인을 다시
 * 누르면 "시간이 지났어요" 가 떴다 — 둘 다 사실이 아니고 사용자를 재시도로 몰았다
 * (QA 2026-08-05). 갈래를 서버와 **같은 이름**으로 들고 있으면 그 어긋남이 안 생긴다.
 */
type ConfirmStatus = "loading" | HealthCheckConfirmStatus

/** 갈래 → 화면. **표 하나**라 갈래가 늘어도 고칠 곳이 여기뿐이다. */
const OUTCOME_VIEW: Readonly<
  Record<
    Exclude<ConfirmStatus, "loading" | "SUCCESS">,
    {
      icon: keyof typeof Ionicons.glyphMap
      tone: "negative" | "neutral"
      /** i18n 키가 리터럴 유니온이라 문자열이 아니라 호출로 담는다. */
      title: (t: TFunction<"health">) => string
    }
  >
> = {
  NO_RESULTS: {
    icon: "document-text-outline",
    // 기록이 없는 것은 **잘못이 아니다** — 실패색을 쓰지 않는다.
    tone: "neutral",
    title: (t) => t("nhis.noResultsTitle"),
  },
  TIMEOUT: {
    icon: "time-outline",
    tone: "negative",
    title: (t) => t("nhis.timeoutTitle"),
  },
  FAILED: {
    icon: "close-circle-outline",
    tone: "negative",
    title: (t) => t("nhis.failedTitle"),
  },
}

/**
 * 서버가 `message` 를 안 줄 때의 갈래별 기본 문구(구버전 서버 대비).
 * `t` 를 받는 함수로 두는 이유: i18n 키가 리터럴 유니온이라 `string` 으로는 못 부른다.
 */
const FALLBACK_MESSAGE: Readonly<
  Record<HealthCheckConfirmStatus, (t: TFunction<"health">) => string>
> = {
  SUCCESS: () => "",
  NO_RESULTS: (t) => t("nhis.noResultsDescription"),
  TIMEOUT: (t) => t("nhis.confirmTimeout"),
  FAILED: (t) => t("nhis.confirmFailed"),
}

/** 서버가 `retryable` 을 안 줄 때의 기본값. */
const DEFAULT_RETRYABLE: Readonly<Record<HealthCheckConfirmStatus, boolean>> = {
  SUCCESS: false,
  NO_RESULTS: false,
  TIMEOUT: true,
  FAILED: true,
}

export function NhisConfirmScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { t } = useTranslation("health")
  const { healthColors } = useHealthTheme()
  const { requestId } = useLocalSearchParams<{ requestId: string }>()

  const [status, setStatus] = useState<ConfirmStatus>("loading")
  const [errorMessage, setErrorMessage] = useState("")
  /** 재시도 버튼을 보일지 — **서버가 정한다**(화면이 갈래를 다시 해석하지 않는다). */
  const [retryable, setRetryable] = useState(true)

  const confirm = async () => {
    if (!requestId) return
    setStatus("loading")
    try {
      const result = await nhisService.healthCheckConfirm(requestId)
      if (result.status === "SUCCESS") {
        await refreshHealthData(queryClient)
        router.replace("/(settings)/health-dashboard")
        return
      }
      setStatus(result.status)
      /*
        **서버 문구를 먼저 쓴다.** 서버는 왜 그렇게 됐는지 알고, 화면은 모른다.
        폴백은 갈래별 기본 문구다(서버가 구버전이라 message 를 안 줄 때).
      */
      setErrorMessage(result.message ?? FALLBACK_MESSAGE[result.status](t))
      setRetryable(result.retryable ?? DEFAULT_RETRYABLE[result.status])
    } catch (error) {
      // 요청 자체가 실패했다(응답 없음·5xx). 이건 다시 해 볼 만하다.
      setStatus("FAILED")
      setRetryable(true)
      setErrorMessage(getErrorMessage(error))
    }
  }

  useEffect(() => {
    confirm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const outcome =
    status === "loading" || status === "SUCCESS" ? null : OUTCOME_VIEW[status]
  const outcomeTitle = outcome === null ? "" : outcome.title(t)

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
                name={outcome?.icon ?? "close-circle-outline"}
                size={52}
                color={
                  outcome?.tone === "neutral"
                    ? healthColors.textSecondary
                    : healthColors.negative
                }
              />
            </View>
            <ThemedText style={[styles.title, { color: healthColors.text }]}>
              {outcomeTitle}
            </ThemedText>
            <ThemedText
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
              style={[styles.subtitle, { color: healthColors.textSecondary }]}
            >
              {errorMessage}
            </ThemedText>
          </>
        )}
      </View>

      {outcome !== null && (
        <View style={styles.buttonArea}>
          {/*
            기록이 없을 때는 "본인인증 다시 하기" 를 권하지 않는다 — 같은 결과가
            나온다. 앱으로 돌아가는 길만 준다.
          */}
          {/*
            **재시도를 권할지 서버가 정한다.** 기록이 없는 경우 다시 인증해도 같은
            결과라, 그때는 앱으로 돌아가는 길만 준다.
          */}
          <Pressable
            style={styles.retryButton}
            onPress={() =>
              retryable
                ? router.back()
                : router.replace("/(settings)/health-dashboard")
            }
          >
            <ThemedText style={styles.retryButtonText}>
              {retryable ? t("nhis.retryVerification") : t("nhis.noResultsCta")}
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
