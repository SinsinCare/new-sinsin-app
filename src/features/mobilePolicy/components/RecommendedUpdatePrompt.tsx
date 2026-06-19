import { useState } from "react"
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { AlertTriangle } from "@tamagui/lucide-icons"
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <YStack
            width="100%"
            maxWidth={360}
            alignItems="center"
            gap="$4"
            padding="$6"
            borderRadius="$6"
            backgroundColor="$cardBackground"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <YStack
              width={64}
              height={64}
              borderRadius="$12"
              alignItems="center"
              justifyContent="center"
              backgroundColor="$dangerBackground"
            >
              <AlertTriangle size={30} color={tokens.color.primary8.val} />
            </YStack>
            <YStack gap="$2" alignItems="center">
              <Text
                fontSize={22}
                lineHeight={30}
                fontWeight="700"
                color="$color"
                textAlign="center"
              >
                업데이트를 권장합니다
              </Text>
              <Text
                fontSize={15}
                lineHeight={22}
                color="$colorSubtle"
                textAlign="center"
              >
                {policy.message ??
                  "더 안정적인 사용을 위해 최신 버전으로 업데이트해주세요."}
              </Text>
            </YStack>
            <Button
              fullWidth
              buttonSize="large"
              disabled={!policy.storeUrl}
              onPress={handleOpenStore}
            >
              업데이트하기
            </Button>
            {openError && (
              <Text
                fontSize={13}
                lineHeight={18}
                color="$danger"
                textAlign="center"
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
                나중에 하기
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
    paddingHorizontal: 24,
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
