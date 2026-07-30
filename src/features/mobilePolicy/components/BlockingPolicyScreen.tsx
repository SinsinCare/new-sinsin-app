import { useEffect, useState } from "react"
import { BackHandler, Linking, ScrollView, StyleSheet } from "react-native"
import { AlertTriangle } from "@/src/shared/components/lucide"
import { Text, YStack } from "tamagui"

import { Button } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import type { MobilePolicyResponse } from "../types"
import { useTranslation } from "react-i18next"

interface BlockingPolicyScreenProps {
  policy: MobilePolicyResponse
}

export function BlockingPolicyScreen({ policy }: BlockingPolicyScreenProps) {
  const { t } = useTranslation()
  const [openError, setOpenError] = useState<string | null>(null)
  const canOpenStore = Boolean(policy.storeUrl)
  const title =
    policy.decision === "maintenance"
      ? t("mobilePolicy.maintenanceTitle")
      : t("mobilePolicy.requiredTitle")
  const message =
    policy.message ||
    (policy.decision === "maintenance"
      ? t("mobilePolicy.maintenanceBody")
      : t("mobilePolicy.requiredBody"))

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
      setOpenError(t("mobilePolicy.storeError"))
    }
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        bounces={false}
        overScrollMode="never"
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
              {title}
            </Text>
            <Text
              fontSize={15}
              lineHeight={22}
              color="$colorSubtle"
              textAlign="center"
            >
              {message}
            </Text>
          </YStack>
          {policy.decision !== "maintenance" && (
            <Button
              fullWidth
              buttonSize="large"
              disabled={!canOpenStore}
              onPress={handleOpenStore}
            >
              {t("mobilePolicy.update")}
            </Button>
          )}
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
        </YStack>
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
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
})
