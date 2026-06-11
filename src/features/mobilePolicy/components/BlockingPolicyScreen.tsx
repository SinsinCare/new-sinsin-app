import { useEffect, useState } from "react"
import { BackHandler, Linking } from "react-native"
import { AlertTriangle } from "@tamagui/lucide-icons"
import { Text, YStack } from "tamagui"

import { Button } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import type { MobilePolicyResponse } from "../types"

interface BlockingPolicyScreenProps {
  policy: MobilePolicyResponse
}

function getTitle(policy: MobilePolicyResponse): string {
  if (policy.decision === "maintenance") return "서비스 점검 중입니다"
  return "최신 버전으로 업데이트해주세요"
}

function getMessage(policy: MobilePolicyResponse): string {
  if (policy.message) return policy.message
  if (policy.decision === "maintenance") {
    return "안정적인 서비스 제공을 위해 잠시 점검 중입니다."
  }
  return "앱을 계속 사용하려면 최신 버전으로 업데이트가 필요합니다."
}

export function BlockingPolicyScreen({ policy }: BlockingPolicyScreenProps) {
  const [openError, setOpenError] = useState<string | null>(null)
  const canOpenStore = Boolean(policy.storeUrl)

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    )
    return () => subscription.remove()
  }, [])

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
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="$6"
      gap="$5"
      backgroundColor="$background"
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
            {getTitle(policy)}
          </Text>
          <Text
            fontSize={15}
            lineHeight={22}
            color="$colorSubtle"
            textAlign="center"
          >
            {getMessage(policy)}
          </Text>
        </YStack>
        {policy.decision !== "maintenance" && (
          <Button
            fullWidth
            buttonSize="large"
            disabled={!canOpenStore}
            onPress={handleOpenStore}
          >
            업데이트하기
          </Button>
        )}
        {openError && (
          <Text fontSize={13} color="$danger" textAlign="center">
            {openError}
          </Text>
        )}
      </YStack>
    </YStack>
  )
}
