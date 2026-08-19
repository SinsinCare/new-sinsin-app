import { useEffect, useRef, useState } from "react"
import {
  useV2Theme,
  V2Box,
  V2HStack,
  V2Text,
  V2VStack,
} from "@/src/design-system-v2"
import {
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native"
import { Portal } from "@/src/shared/components/Portal"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { Download } from "@/src/shared/components/lucide"

import { Button } from "@/src/shared/components"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { tokens } from "@/src/theme/tokens"
import type { MobilePolicyResponse } from "../types"
import { useTranslation } from "react-i18next"
import { normalizeStoreUrl } from "@/src/shared/utils/externalUrl"

interface RecommendedUpdatePromptProps {
  policy: MobilePolicyResponse
}

/**
 * 권장 업데이트 안내.
 *
 * **RN Modal 이 아니다 — 일부러.** 마운트 즉시 뜨는 앱 시작 팝업이라, 같은 시점에
 * 홈의 공지 팝업·복구된 분석 결과(pageSheet)와 present 가 겹칠 수 있다. iOS 에서
 * 네이티브 모달 전환 둘이 겹치면 앱 전체 터치가 죽는다(LoadingOverlay 머리말).
 * 루트 포털 JS 오버레이로 그려 시작 시점 경쟁에서 빠진다.
 */
export function RecommendedUpdatePrompt({
  policy,
}: RecommendedUpdatePromptProps) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <Portal>
      <RecommendedUpdateCard
        policy={policy}
        onClose={() => setVisible(false)}
      />
    </Portal>
  )
}

function RecommendedUpdateCard({
  policy,
  onClose,
}: RecommendedUpdatePromptProps & { onClose: () => void }) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const { width } = useWindowDimensions()
  const [openError, setOpenError] = useState<string | null>(null)
  const cardWidth = Math.min(Math.max(width - 40, 280), 372)
  const message = policy.message?.trim() || t("mobilePolicy.recommendedBody")
  const storeUrl = policy.storeUrl ? normalizeStoreUrl(policy.storeUrl) : null

  /* 이 카드는 보일 때만 마운트된다(부모가 `visible` 로 갈아끼운다) — 마운트당 한 번.
     렌더 본문에서 쏘면 리렌더마다 같은 안내가 여러 번 세어진다(설계 §2 P3). */
  const viewReportedRef = useRef(false)
  useEffect(() => {
    if (viewReportedRef.current) return
    viewReportedRef.current = true
    trackAnalyticsEvent("app_update_prompt_viewed", {})
  }, [])

  // 네이티브 Modal 시절의 onRequestClose 와 같게, 안드로이드 뒤로가기는 닫기다.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      trackAnalyticsEvent("app_update_prompt_dismissed", { mode: "back" })
      onClose()
      return true
    })
    return () => sub.remove()
  }, [onClose])

  const handleOpenStore = async () => {
    if (!storeUrl) return
    // 계측은 try 밖에서 — 이유는 BlockingPolicyScreen 의 같은 자리 주석에 있다.
    let opened = false
    try {
      await Linking.openURL(storeUrl)
      opened = true
      setOpenError(null)
    } catch {
      setOpenError(t("mobilePolicy.storeError"))
    }
    trackAnalyticsEvent("app_policy_store_opened", {
      decision: policy.decision,
      blocked: false,
      result: opened ? "opened" : "failed",
    })
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={StyleSheet.absoluteFill}
      // 뒤 화면 조작을 막는 게 딤의 역할 — 손잡이 없는 View 는 탭이 새므로 응답자를 자처한다.
      onStartShouldSetResponder={() => true}
    >
      <V2Box accessibilityViewIsModal style={styles.dim}>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <V2VStack
            gap={20}
            paddingHorizontal={20}
            paddingTop={24}
            paddingBottom={20}
            style={{
              width: cardWidth,
              maxWidth: "100%",
              borderRadius: 16,
              backgroundColor: colors.background.lower,
              borderWidth: 1,
              borderColor: colors.line.normal,
            }}
          >
            <V2HStack
              gap={12}
              align="center"
              style={{ width: "100%", minWidth: 0 }}
            >
              <V2VStack
                align="center"
                justify="center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 48,
                  backgroundColor: colors.accentForeground.greenWeak,
                  flexShrink: 0,
                }}
              >
                <Download size={22} color={tokens.color.sub7.val} />
              </V2VStack>
              <V2Text
                color={colors.label.normal}
                maxFontSizeMultiplier={1.2}
                lineBreakStrategyIOS="hangul-word"
                style={{
                  flex: 1,
                  flexShrink: 1,
                  minWidth: 0,
                  fontSize: 19,
                  lineHeight: 25,
                  fontWeight: "700",
                  letterSpacing: 0,
                }}
              >
                {t("mobilePolicy.recommendedTitle")}
              </V2Text>
            </V2HStack>
            <V2VStack gap={8} style={{ width: "100%", minWidth: 0 }}>
              <V2Text
                color={colors.label.alternative}
                maxFontSizeMultiplier={1.15}
                lineBreakStrategyIOS="hangul-word"
                style={{
                  width: "100%",
                  flexShrink: 1,
                  fontSize: 15,
                  lineHeight: 23,
                  letterSpacing: 0,
                }}
              >
                {message}
              </V2Text>
            </V2VStack>
            <Button
              fullWidth
              buttonSize="large"
              disabled={!storeUrl}
              onPress={handleOpenStore}
            >
              {t("mobilePolicy.update")}
            </Button>
            {openError && (
              <V2Text
                color={colors.status.negative}
                maxFontSizeMultiplier={1.15}
                lineBreakStrategyIOS="hangul-word"
                textBreakStrategy="balanced"
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  textAlign: "center",
                  width: "100%",
                  flexShrink: 1,
                }}
              >
                {openError}
              </V2Text>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.skipButtonPressed,
              ]}
              onPress={() => {
                trackAnalyticsEvent("app_update_prompt_dismissed", {
                  mode: "later",
                })
                onClose()
              }}
            >
              <V2Text
                color={tokens.color.grey5.val}
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {t("mobilePolicy.later")}
              </V2Text>
            </Pressable>
          </V2VStack>
        </ScrollView>
      </V2Box>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: "#0000006B",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  skipButton: {
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  skipButtonPressed: {
    opacity: 0.6,
  },
})
