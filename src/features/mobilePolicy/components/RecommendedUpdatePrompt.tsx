import { useState } from "react"
import { Linking, Modal, Pressable, StyleSheet, View } from "react-native"
import { Text, YStack } from "tamagui"

import { Button } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import type { MobilePolicyResponse } from "../types"

interface RecommendedUpdatePromptProps {
  policy: MobilePolicyResponse
}

export function RecommendedUpdatePrompt({
  policy,
}: RecommendedUpdatePromptProps) {
  const [visible, setVisible] = useState(true)
  const [openError, setOpenError] = useState<string | null>(null)

  const handleOpenStore = async () => {
    if (!policy.storeUrl) return
    try {
      await Linking.openURL(policy.storeUrl)
      setOpenError(null)
    } catch {
      setOpenError("스토어를 열 수 없습니다. 잠시 후 다시 시도해주세요.")
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
        <YStack
          width="100%"
          maxWidth={360}
          gap="$4"
          padding="$5"
          borderRadius="$6"
          backgroundColor="$cardBackground"
        >
          <YStack gap="$2">
            <Text fontSize={20} lineHeight={28} fontWeight="700" color="$color">
              업데이트를 권장합니다
            </Text>
            <Text fontSize={15} lineHeight={22} color="$colorSubtle">
              {policy.message ??
                "더 안정적인 사용을 위해 최신 버전으로 업데이트해주세요."}
            </Text>
          </YStack>
          <YStack gap="$2">
            {openError && (
              <Text fontSize={13} color="$danger">
                {openError}
              </Text>
            )}
            <Button
              fullWidth
              disabled={!policy.storeUrl}
              onPress={handleOpenStore}
            >
              업데이트하기
            </Button>
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
              >
                나중에 하기
              </Text>
            </Pressable>
          </YStack>
        </YStack>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: "#0000006B",
  },
  skipButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonPressed: {
    opacity: 0.6,
  },
})
