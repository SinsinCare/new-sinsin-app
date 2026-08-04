import { useEffect, useState } from "react"
import {
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native"
import { Portal } from "@tamagui/portal"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { Download } from "@/src/shared/components/lucide"
import { Text, XStack, YStack } from "tamagui"

import { Button } from "@/src/shared/components"
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
  const { width } = useWindowDimensions()
  const [openError, setOpenError] = useState<string | null>(null)
  const cardWidth = Math.min(Math.max(width - 40, 280), 372)
  const message = policy.message?.trim() || t("mobilePolicy.recommendedBody")
  const storeUrl = policy.storeUrl ? normalizeStoreUrl(policy.storeUrl) : null

  // 네이티브 Modal 시절의 onRequestClose 와 같게, 안드로이드 뒤로가기는 닫기다.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [onClose])

  const handleOpenStore = async () => {
    if (!storeUrl) return
    try {
      await Linking.openURL(storeUrl)
      setOpenError(null)
    } catch {
      setOpenError(t("mobilePolicy.storeError"))
    }
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={StyleSheet.absoluteFill}
      // 뒤 화면 조작을 막는 게 딤의 역할 — 손잡이 없는 View 는 탭이 새므로 응답자를 자처한다.
      onStartShouldSetResponder={() => true}
    >
      <View style={styles.dim} accessibilityViewIsModal>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <YStack
            width={cardWidth}
            maxWidth="100%"
            gap="$5"
            paddingHorizontal="$5"
            paddingTop="$6"
            paddingBottom="$5"
            borderRadius="$8"
            backgroundColor="$cardBackground"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <XStack gap="$3" alignItems="center" width="100%" minWidth={0}>
              <YStack
                width={44}
                height={44}
                borderRadius="$12"
                alignItems="center"
                justifyContent="center"
                backgroundColor="$secondaryLight"
                flexShrink={0}
              >
                <Download size={22} color={tokens.color.sub7.val} />
              </YStack>
              <Text
                flex={1}
                flexShrink={1}
                minWidth={0}
                fontSize={19}
                lineHeight={25}
                fontWeight="700"
                color="$color"
                letterSpacing={0}
                maxFontSizeMultiplier={1.2}
              >
                {t("mobilePolicy.recommendedTitle")}
              </Text>
            </XStack>
            <YStack gap="$2" width="100%" minWidth={0}>
              <Text
                width="100%"
                flexShrink={1}
                fontSize={15}
                lineHeight={23}
                color="$colorSubtle"
                letterSpacing={0}
                maxFontSizeMultiplier={1.15}
              >
                {message}
              </Text>
            </YStack>
            <Button
              fullWidth
              buttonSize="large"
              disabled={!storeUrl}
              onPress={handleOpenStore}
            >
              {t("mobilePolicy.update")}
            </Button>
            {openError && (
              <Text
                fontSize={13}
                lineHeight={18}
                color="$danger"
                textAlign="center"
                width="100%"
                flexShrink={1}
                maxFontSizeMultiplier={1.15}
              >
                {openError}
              </Text>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.skipButtonPressed,
              ]}
              onPress={onClose}
            >
              <Text
                fontSize={14}
                fontWeight="600"
                color={tokens.color.grey5.val}
                textAlign="center"
                lineHeight={20}
              >
                {t("mobilePolicy.later")}
              </Text>
            </Pressable>
          </YStack>
        </ScrollView>
      </View>
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
