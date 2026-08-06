import React, { useState, useEffect } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import {
  V2DotLoader,
  V2Skeleton,
  V2SkeletonGroup,
} from "@/src/design-system-v2"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { nhisService } from "@/src/services/data/nhisService"
import { getErrorMessage, logRecoverableError } from "@/src/lib/errorUtils"
import type { AuthMethodRs } from "@/src/types/nhis"
import { refreshHealthData } from "../data/healthQueries"
import { useHealthTheme } from "../hooks/useHealthTheme"

export function NhisRequestScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { t } = useTranslation("health")
  const { healthColors } = useHealthTheme()

  const [authMethods, setAuthMethods] = useState<AuthMethodRs[]>([])
  const [loadingMethods, setLoadingMethods] = useState(true)

  const [resNm, setResNm] = useState("")
  const [mobileNo, setMobileNo] = useState("")
  const [resNo, setResNo] = useState("")
  const [selectedMethod, setSelectedMethod] = useState<AuthMethodRs | null>(
    null,
  )
  const [selectedTelecom, setSelectedTelecom] = useState("")

  const [requesting, setRequesting] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)

  useEffect(() => {
    nhisService
      .getAuthMethod()
      .then(setAuthMethods)
      // 목록이 빈 채로 남으면 CTA 가 영영 잠긴다. 화면 문구는 새 흐름
      // (`CheckupAuthScreen`)이 이미 갖고 있으므로, 여기서는 최소한 원인을 남긴다.
      .catch((error: unknown) =>
        logRecoverableError("[nhis] 인증수단 조회 실패", error),
      )
      .finally(() => setLoadingMethods(false))
  }, [])

  const isFormValid = () => {
    if (!resNm.trim() || !mobileNo.trim() || resNo.length !== 8) return false
    if (!selectedMethod) return false
    if (selectedMethod.requiresTelecom && !selectedTelecom) return false
    return true
  }

  const handleRequest = async () => {
    if (!selectedMethod || !isFormValid()) return
    setRequesting(true)
    setRequestError(null)
    try {
      const result = await nhisService.healthCheckRequest({
        loginOrgCd: selectedMethod.key,
        resNm: resNm.trim(),
        mobileNo: mobileNo.replace(/-/g, ""),
        resNo: resNo.trim(),
        mobileCo: selectedTelecom || null,
      })
      if (result.status === "SUCCESS") {
        await refreshHealthData(queryClient)
        router.replace("/(settings)/health-dashboard")
      } else if (result.status === "PENDING") {
        setRequestId(result.requestId)
      } else {
        setRequestError(t("nhis.requestRejected"))
      }
    } catch (error) {
      // 공단 점검(`HC_ERROR_005`)·인증 만료(`HC_ERROR_002`)가 대부분인 자리다.
      // 그걸 "인터넷 연결을 확인" 으로 말하면 사용자가 고칠 수 없는 것을 고치러 간다.
      setRequestError(getErrorMessage(error))
    } finally {
      setRequesting(false)
    }
  }

  const handleConfirm = () => {
    if (!requestId) return
    router.push({
      pathname: "/(settings)/health-nhis-confirm",
      params: { requestId },
    })
  }

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: healthColors.background }]}
    >
      <ScreenHeader
        title={t("nhis.requestTitle")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 개인 정보 */}
        <View
          style={[
            styles.section,
            { borderBottomColor: healthColors.lineSubtle },
          ]}
        >
          <ThemedText
            style={[styles.sectionTitle, { color: healthColors.text }]}
          >
            {t("nhis.personalInfo")}
          </ThemedText>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <ThemedText
                style={[
                  styles.fieldLabel,
                  { color: healthColors.textSecondary },
                ]}
              >
                {t("nhis.name")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: healthColors.text,
                    backgroundColor: healthColors.surfaceMuted,
                    borderColor: healthColors.line,
                  },
                ]}
                value={resNm}
                onChangeText={setResNm}
                placeholder={t("nhis.namePlaceholder")}
                placeholderTextColor={healthColors.textAssistive}
              />
            </View>
            <View style={styles.flex1}>
              <ThemedText
                style={[
                  styles.fieldLabel,
                  { color: healthColors.textSecondary },
                ]}
              >
                {t("nhis.phone")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: healthColors.text,
                    backgroundColor: healthColors.surfaceMuted,
                    borderColor: healthColors.line,
                  },
                ]}
                value={mobileNo}
                onChangeText={setMobileNo}
                placeholder="01012345678"
                placeholderTextColor={healthColors.textAssistive}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <ThemedText
              style={[styles.fieldLabel, { color: healthColors.textSecondary }]}
            >
              {t("nhis.birthDate")}
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: healthColors.text,
                  backgroundColor: healthColors.surfaceMuted,
                  borderColor: healthColors.line,
                },
              ]}
              value={resNo}
              onChangeText={setResNo}
              placeholder="19900101"
              placeholderTextColor={healthColors.textAssistive}
              keyboardType="number-pad"
              maxLength={8}
            />
          </View>
        </View>

        {/* 간편인증 수단 */}
        <View
          style={[
            styles.section,
            { borderBottomColor: healthColors.lineSubtle },
          ]}
        >
          <ThemedText
            style={[styles.sectionTitle, { color: healthColors.text }]}
          >
            {t("nhis.authMethod")}
          </ThemedText>

          {loadingMethods ? (
            // 인증 수단은 늘 같은 크기 카드 두 장이다. 링 대신 그 카드 모양을 미리 깔면
            // 목록이 도착해도 섹션 높이가 튀지 않는다.
            <V2SkeletonGroup
              style={[styles.methodRow, styles.methodSkeletonRow]}
            >
              {[0, 1].map((index) => (
                <V2Skeleton
                  key={index}
                  height={57}
                  radius="lg"
                  style={styles.methodSkeleton}
                />
              ))}
            </V2SkeletonGroup>
          ) : (
            <View style={styles.methodRow}>
              {authMethods.map((method) => {
                const isSelected = selectedMethod?.key === method.key
                const methodKey = method.key.toUpperCase()
                const methodName =
                  methodKey === "KAKAO"
                    ? t("nhis.methods.KAKAO")
                    : methodKey === "PASS"
                      ? t("nhis.methods.PASS")
                      : method.displayName
                return (
                  <Pressable
                    key={method.key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={methodName}
                    style={[
                      styles.methodCard,
                      {
                        backgroundColor: healthColors.surfaceMuted,
                        borderColor: healthColors.line,
                      },
                      isSelected && styles.methodCardSelected,
                    ]}
                    onPress={() => {
                      setSelectedMethod(method)
                      setSelectedTelecom("")
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.methodName,
                        { color: healthColors.textSecondary },
                        isSelected && styles.methodNameSelected,
                      ]}
                    >
                      {methodName}
                    </ThemedText>
                  </Pressable>
                )
              })}
            </View>
          )}

          {selectedMethod?.requiresTelecom && (
            <View style={styles.fieldBlock}>
              <ThemedText
                style={[
                  styles.fieldLabel,
                  { color: healthColors.textSecondary },
                ]}
              >
                {t("nhis.carrier")}
              </ThemedText>
              <View style={styles.telecomRow}>
                {selectedMethod.telecomOptions.map((t) => (
                  <Pressable
                    key={t.code}
                    style={[
                      styles.telecomChip,
                      {
                        backgroundColor: healthColors.surfaceMuted,
                        borderColor: healthColors.line,
                      },
                      selectedTelecom === t.code && styles.telecomChipSelected,
                    ]}
                    onPress={() => setSelectedTelecom(t.code)}
                  >
                    <ThemedText
                      style={[
                        styles.telecomChipText,
                        { color: healthColors.textSecondary },
                        selectedTelecom === t.code &&
                          styles.telecomChipTextSelected,
                      ]}
                    >
                      {t.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {requestError && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: healthColors.negativeWeak },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={healthColors.negative}
            />
            <ThemedText
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
              style={[styles.errorText, { color: healthColors.negative }]}
            >
              {requestError}
            </ThemedText>
          </View>
        )}

        {requestId && (
          <View
            style={[
              styles.pendingBox,
              {
                backgroundColor: healthColors.positiveWeak,
                borderColor: healthColors.positive,
              },
            ]}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={tokens.color.sub8.val}
            />
            <ThemedText
              style={[styles.pendingText, { color: healthColors.text }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("nhis.pendingInstructions")}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: healthColors.background,
            borderTopColor: healthColors.lineSubtle,
          },
        ]}
      >
        {requestId ? (
          <Pressable style={styles.confirmButton} onPress={handleConfirm}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#FFFFFF"
            />
            <ThemedText style={styles.buttonText}>
              {t("nhis.verified")}
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.requestButton,
              (!isFormValid() || requesting) && styles.buttonDisabled,
            ]}
            onPress={handleRequest}
            disabled={!isFormValid() || requesting}
          >
            {requesting ? (
              <V2DotLoader size="s" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.buttonText}>
                {t("nhis.startVerification")}
              </ThemedText>
            )}
          </Pressable>
        )}
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#17191C",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
  },
  flex1: {
    flex: 1,
    gap: 6,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#17191C",
    backgroundColor: "#FAFAFA",
  },
  methodRow: {
    flexDirection: "row",
    gap: 12,
  },
  methodSkeletonRow: { marginTop: 12 },
  // 실제 methodCard 와 같은 flex 배분 — 도착 후 폭이 그대로 이어진다.
  methodSkeleton: { flex: 1 },
  methodCard: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  methodCardSelected: {
    borderColor: tokens.color.sub6.val,
    backgroundColor: "#F0FDF9",
  },
  methodName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  methodNameSelected: {
    color: tokens.color.sub8.val,
  },
  telecomRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  telecomChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FAFAFA",
  },
  telecomChipSelected: {
    borderColor: tokens.color.sub6.val,
    backgroundColor: "#F0FDF9",
  },
  telecomChipText: {
    fontSize: 14,
    color: "#374151",
  },
  telecomChipTextSelected: {
    color: tokens.color.sub8.val,
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    flex: 1,
  },
  pendingBox: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: "#F0FDF9",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginTop: 16,
  },
  pendingText: {
    fontSize: 14,
    lineHeight: 20,
    color: tokens.color.sub8.val,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
  },
  requestButton: {
    backgroundColor: tokens.color.sub6.val,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButton: {
    backgroundColor: tokens.color.sub6.val,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: "#C5C8CE",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})
