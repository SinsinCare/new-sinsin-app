import { useState } from "react"
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native"
import { Download } from "@/src/shared/components/lucide"
import { Text, XStack, YStack } from "tamagui"

import { Button } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import type { MobilePolicyResponse } from "../types"
import { useTranslation } from "react-i18next"

interface RecommendedUpdatePromptProps {
  policy: MobilePolicyResponse
}

export function RecommendedUpdatePrompt({
  policy,
}: RecommendedUpdatePromptProps) {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const [visible, setVisible] = useState(true)
  const [openError, setOpenError] = useState<string | null>(null)
  const cardWidth = Math.min(Math.max(width - 40, 280), 372)
  const message =
    policy.message?.trim() || t("mobilePolicy.recommendedBody")

  const handleOpenStore = async () => {
    if (!policy.storeUrl) return
    try {
      await Linking.openURL(policy.storeUrl)
      setOpenError(null)
    } catch {
      setOpenError(t("mobilePolicy.storeError"))
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.dim}>
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
              disabled={!policy.storeUrl}
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
              onPress={() => setVisible(false)}
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
    </Modal>
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
