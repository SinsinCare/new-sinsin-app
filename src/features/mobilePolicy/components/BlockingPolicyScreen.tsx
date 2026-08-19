import { useEffect, useState } from "react"
import { BackHandler, Linking, ScrollView, StyleSheet } from "react-native"
import { AlertTriangle } from "@/src/shared/components/lucide"
import { useV2Theme, V2Text, V2VStack } from "@/src/design-system-v2"

import { Button } from "@/src/shared/components"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { tokens } from "@/src/theme/tokens"
import type { MobilePolicyResponse } from "../types"
import { useTranslation } from "react-i18next"
import { normalizeStoreUrl } from "@/src/shared/utils/externalUrl"

interface BlockingPolicyScreenProps {
  policy: MobilePolicyResponse
}

export function BlockingPolicyScreen({ policy }: BlockingPolicyScreenProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const [openError, setOpenError] = useState<string | null>(null)
  const storeUrl = policy.storeUrl ? normalizeStoreUrl(policy.storeUrl) : null
  const canOpenStore = Boolean(storeUrl)
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
    if (!storeUrl) return
    /* 계측은 try **밖**에서 한다. 안에 두면 발화가 던지는 날 스토어는 열렸는데 오류 문구가
       뜨고 이벤트가 두 번 나간다 — 지금 trackAnalyticsEvent 는 삼키지만, 그 사실에 화면
       동작을 기대게 두지 않는다.
       실패도 남긴다. 이 화면에서 스토어가 안 열리면 **나가는 길이 하나도 없다** —
       성공만 세면 그 사람들은 "버튼을 안 눌렀다" 와 같아 보인다. */
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
      blocked: true,
      result: opened ? "opened" : "failed",
    })
  }

  return (
    <V2VStack flex={1} style={{ backgroundColor: colors.background.default }}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <V2VStack
          align="center"
          gap={16}
          padding={24}
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: 12,
            backgroundColor: colors.background.default,
            borderWidth: 1,
            borderColor: colors.line.normal,
          }}
        >
          <V2VStack
            align="center"
            justify="center"
            style={{
              width: 64,
              height: 64,
              borderRadius: 48,
              backgroundColor: colors.accentForeground.redWeak,
            }}
          >
            <AlertTriangle size={30} color={tokens.color.primary8.val} />
          </V2VStack>
          <V2VStack gap={8} align="center">
            <V2Text
              color={colors.label.strong}
              style={{
                fontSize: 22,
                lineHeight: 30,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {title}
            </V2Text>
            <V2Text
              color={colors.label.neutral}
              style={{ fontSize: 15, lineHeight: 22, textAlign: "center" }}
            >
              {message}
            </V2Text>
          </V2VStack>
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
            <V2Text
              color={colors.status.negative}
              style={{ fontSize: 13, lineHeight: 18, textAlign: "center" }}
            >
              {openError}
            </V2Text>
          )}
        </V2VStack>
      </ScrollView>
    </V2VStack>
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
