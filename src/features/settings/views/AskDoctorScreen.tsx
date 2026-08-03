import React, { useRef, useState } from "react"
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { V2DotLoader } from "@/src/design-system-v2"
import { ThemedView } from "@/components/themed-view"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import {
  type DoctorConnection,
  type DoctorDirectoryItem,
  enrollDoctor,
  listDoctorConnections,
  requestDoctorConnection,
  searchDoctors,
} from "@/src/services/doctorService"
import { tokens } from "@/src/theme/tokens"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { presentError } from "@/src/lib/errorMessage"

import { showErrorToast, showSuccessToast } from "@/src/lib/toast"

type Mode = "code" | "search"

const CONNECTIONS_QUERY_KEY = ["doctor-connections"]

const statusCopy: Record<
  string,
  {
    labelKey:
      | "doctor.status.approved"
      | "doctor.status.pending"
      | "doctor.status.rejected"
    color: string
    icon: keyof typeof Ionicons.glyphMap
  }
> = {
  APPROVED: {
    labelKey: "doctor.status.approved",
    color: tokens.color.sub7.val,
    icon: "checkmark-circle",
  },
  PENDING: {
    labelKey: "doctor.status.pending",
    color: "#C27803",
    icon: "time",
  },
  REJECTED: {
    labelKey: "doctor.status.rejected",
    color: tokens.color.error.val,
    icon: "close-circle",
  },
}

export function AskDoctorScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const c = useSettingsColors()
  const isDarkMode = useAppColorScheme() === "dark"
  const { t } = useTranslation("settings")

  const [mode, setMode] = useState<Mode>("code")
  const [doctorCode, setDoctorCode] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [name, setName] = useState("")
  const [hospital, setHospital] = useState("")
  const [department, setDepartment] = useState("")
  const [messageByDoctorId, setMessageByDoctorId] = useState<
    Record<string, string>
  >({})
  const [searchResult, setSearchResult] = useState<DoctorDirectoryItem[]>([])

  const inputRef = useRef<TextInput>(null)

  const connectionsQuery = useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: listDoctorConnections,
  })

  const enrollMutation = useMutation({
    mutationFn: enrollDoctor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY })
      setDoctorCode("")
      showSuccessToast(
        t("doctor.code.successTitle"),
        t("doctor.code.successBody"),
      )
    },
    onError: (error) => {
      // 코드 자체가 없거나 만료됐을 때 서버가 코드를 안 실어 주면, 여기서 유일하게
      // 남는 단서가 "6자리를 다시 확인하라" 다. 그때만 쓰인다(코드가 오면 코드가 이긴다).
      presentError(error, {
        scope: "doctor-enroll",
        fallback: t("doctor.code.error"),
        retry: submitCode,
      })
    },
  })

  const searchMutation = useMutation({
    mutationFn: searchDoctors,
    onSuccess: (result) => {
      setSearchResult(result.items)
    },
    onError: (error) => {
      // `DOCTOR_ERROR_001`(조건 미입력) · `DOCTOR_ERROR_002`(결과 없음)가 무엇을
      // 바꿔야 하는지까지 말해 준다. 예전 폴백은 "인터넷 연결을 확인" 이었다.
      presentError(error, { scope: "doctor-search", retry: submitSearch })
    },
  })

  const requestMutation = useMutation({
    mutationFn: requestDoctorConnection,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY })
      showSuccessToast(
        t("doctor.request.successTitle"),
        t("doctor.request.successBody"),
      )
    },
    onError: (error, variables) => {
      // `DOCTOR_ERROR_004`(승인 전 공유 설정) 처럼 재시도가 소용없는 실패에도
      // 카탈로그가 "선생님이 연결을 수락하면 알려 드릴게요" 를 준다.
      presentError(error, {
        scope: "doctor-request",
        retry: () => requestMutation.mutate(variables),
      })
    },
  })

  const connections = connectionsQuery.data?.items ?? []
  const canSubmitCode =
    doctorCode.length === 6 && agreed && !enrollMutation.isPending

  const submitCode = () => {
    enrollMutation.mutate(doctorCode)
  }

  const submitSearch = () => {
    const payload = {
      name: name.trim() || undefined,
      hospital: hospital.trim() || undefined,
      department: department.trim() || undefined,
    }
    if (!payload.name && !payload.hospital && !payload.department) {
      showErrorToast(
        t("doctor.search.missingTitle"),
        t("doctor.search.missingBody"),
      )
      return
    }
    Keyboard.dismiss()
    searchMutation.mutate(payload)
  }

  const existingConnectionFor = (doctorId: string) =>
    connections.find((connection) => connection.doctor?.id === doctorId)

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title={t("doctor.title")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                mode === "code" ? insets.bottom + 128 : insets.bottom + 32,
            },
          ]}
        >
          <ConnectionStatusSection
            colors={c}
            isLoading={connectionsQuery.isLoading}
            isRefreshing={connectionsQuery.isFetching}
            error={connectionsQuery.isError ? connectionsQuery.error : null}
            connections={connections}
            onRetry={() => {
              void connectionsQuery.refetch()
            }}
          />

          <View style={[styles.segmented, { backgroundColor: c.cardBg }]}>
            <SegmentButton
              label={t("doctor.tabs.code")}
              icon="keypad-outline"
              active={mode === "code"}
              colors={c}
              onPress={() => setMode("code")}
            />
            <SegmentButton
              label={t("doctor.tabs.search")}
              icon="search"
              active={mode === "search"}
              colors={c}
              onPress={() => setMode("search")}
            />
          </View>

          {mode === "code" ? (
            <>
              <View
                style={[
                  styles.mainCard,
                  {
                    backgroundColor: isDarkMode
                      ? tokens.color.cardBgDark.val
                      : "#EEFAF7",
                  },
                ]}
              >
                <ThemedText
                  style={[styles.cardTitle, { color: tokens.color.sub7.val }]}
                >
                  {t("doctor.code.title")}
                </ThemedText>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("doctor.code.inputAccessibility")}
                  style={styles.otpContainer}
                  onPress={() => inputRef.current?.focus()}
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.otpBox,
                        {
                          backgroundColor: isDarkMode
                            ? tokens.color.grey2.val
                            : "#FFFFFF",
                        },
                        doctorCode.length === i && styles.otpBoxActive,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.otpText,
                          {
                            color: doctorCode[i]
                              ? tokens.color.sub8.val
                              : c.textTertiary,
                          },
                        ]}
                      >
                        {doctorCode[i] || ""}
                      </ThemedText>
                    </View>
                  ))}
                </Pressable>

                <ThemedText
                  style={[styles.cardSubText, { color: c.textTertiary }]}
                >
                  {t("doctor.code.hint")}
                </ThemedText>
              </View>

              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={doctorCode}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6)
                  setDoctorCode(cleaned)
                  if (cleaned.length === 6) Keyboard.dismiss()
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                accessibilityLabel={t("doctor.code.sixDigitAccessibility")}
              />

              <AgreementSection
                colors={c}
                agreed={agreed}
                onToggle={() => setAgreed((prev) => !prev)}
                onOpenTerms={() => setShowTerms(true)}
              />
            </>
          ) : (
            <View style={styles.searchSection}>
              <SearchInput
                label={t("doctor.search.name")}
                value={name}
                colors={c}
                placeholder={t("doctor.search.namePlaceholder")}
                onChangeText={setName}
              />
              <SearchInput
                label={t("doctor.search.hospital")}
                value={hospital}
                colors={c}
                placeholder={t("doctor.search.hospitalPlaceholder")}
                onChangeText={setHospital}
              />
              <SearchInput
                label={t("doctor.search.department")}
                value={department}
                colors={c}
                placeholder={t("doctor.search.departmentPlaceholder")}
                onChangeText={setDepartment}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("doctor.search.accessibility")}
                style={[
                  styles.searchButton,
                  { opacity: searchMutation.isPending ? 0.7 : 1 },
                ]}
                disabled={searchMutation.isPending}
                onPress={submitSearch}
              >
                {searchMutation.isPending ? (
                  <V2DotLoader size="m" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.searchButtonText}>
                      {t("doctor.search.action")}
                    </ThemedText>
                  </>
                )}
              </Pressable>

              <View style={styles.resultsList}>
                {searchMutation.isSuccess && searchResult.length === 0 ? (
                  <ThemedText style={[styles.emptyText, { color: c.textSub }]}>
                    {t("doctor.search.empty")}
                  </ThemedText>
                ) : null}
                {searchResult.map((doctor) => {
                  const existing = existingConnectionFor(doctor.id)
                  const pendingThisDoctor =
                    requestMutation.isPending &&
                    requestMutation.variables?.doctorId === doctor.id
                  return (
                    <DoctorResultCard
                      key={doctor.id}
                      doctor={doctor}
                      existingConnection={existing}
                      message={messageByDoctorId[doctor.id] ?? ""}
                      colors={c}
                      isPending={pendingThisDoctor}
                      onChangeMessage={(text) =>
                        setMessageByDoctorId((prev) => ({
                          ...prev,
                          [doctor.id]: text,
                        }))
                      }
                      onRequest={() =>
                        requestMutation.mutate({
                          doctorId: doctor.id,
                          message: messageByDoctorId[doctor.id],
                        })
                      }
                    />
                  )
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {mode === "code" ? (
        <BottomActionBar
          label={t("doctor.code.connect")}
          disabled={!canSubmitCode}
          paddingBottom={insets.bottom + 16}
          onPress={submitCode}
        />
      ) : null}

      <TermsModal
        visible={showTerms}
        colors={c}
        bottomInset={insets.bottom}
        onClose={() => setShowTerms(false)}
      />
    </ThemedView>
  )
}

function SegmentButton({
  label,
  icon,
  active,
  colors,
  onPress,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  active: boolean
  colors: ReturnType<typeof useSettingsColors>
  onPress: () => void
}) {
  const { t } = useTranslation("settings")
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={t("doctor.tabs.accessibility", { label })}
      style={[
        styles.segmentButton,
        active && { backgroundColor: tokens.color.sub6.val },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={17}
        color={active ? "#FFFFFF" : colors.textSub}
      />
      <ThemedText
        style={[
          styles.segmentText,
          { color: active ? "#FFFFFF" : colors.textSub },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  )
}

function ConnectionStatusSection({
  colors,
  isLoading,
  isRefreshing,
  error,
  connections,
  onRetry,
}: {
  colors: ReturnType<typeof useSettingsColors>
  isLoading: boolean
  isRefreshing: boolean
  /** 실패했을 때의 오류. 문구는 여기서 짓지 않고 resolver 가 고른다. */
  error: unknown
  connections: DoctorConnection[]
  onRetry: () => void
}) {
  const { t } = useTranslation("settings")
  return (
    <View style={styles.statusSection}>
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          {t("doctor.status.title")}
        </ThemedText>
        {isLoading ? (
          <V2DotLoader size="s" color={tokens.color.sub6.val} />
        ) : null}
      </View>
      {error != null && !isLoading ? (
        // 아이콘이 `cloud-offline` 이었다. 목록 조회가 실패하는 대부분은 연결이 아니라
        // 세션 만료·권한이라, 구름 아이콘 자체가 이미 원인을 잘못 말하고 있었다.
        <ConnectionRefreshState
          colors={colors}
          icon="alert-circle-outline"
          message={getErrorMessage(error)}
          isRefreshing={isRefreshing}
          onRetry={onRetry}
        />
      ) : null}
      {error == null && connections.length === 0 && !isLoading ? (
        <ConnectionRefreshState
          colors={colors}
          icon="person-add-outline"
          message={t("doctor.status.empty")}
          isRefreshing={isRefreshing}
          onRetry={onRetry}
        />
      ) : null}
      {connections.length > 0
        ? connections.map((connection) => {
            const status = statusCopy[connection.status] ?? statusCopy.PENDING
            return (
              <View
                key={connection.id}
                style={[
                  styles.connectionRow,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.cardBg,
                  },
                ]}
              >
                <View style={styles.connectionInfo}>
                  <ThemedText
                    style={[styles.connectionName, { color: colors.text }]}
                  >
                    {connection.doctor?.name ?? t("doctor.status.unknownName")}
                  </ThemedText>
                  <ThemedText
                    style={[styles.connectionMeta, { color: colors.textSub }]}
                  >
                    {[
                      connection.doctor?.organizationName,
                      connection.doctor?.department,
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("doctor.status.unknownOrganization")}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${status.color}18` },
                  ]}
                >
                  <Ionicons name={status.icon} size={14} color={status.color} />
                  <ThemedText
                    style={[styles.statusText, { color: status.color }]}
                  >
                    {t(status.labelKey)}
                  </ThemedText>
                </View>
              </View>
            )
          })
        : null}
    </View>
  )
}

function ConnectionRefreshState({
  colors,
  icon,
  message,
  isRefreshing,
  onRetry,
}: {
  colors: ReturnType<typeof useSettingsColors>
  icon: keyof typeof Ionicons.glyphMap
  message: string
  isRefreshing: boolean
  onRetry: () => void
}) {
  const { t } = useTranslation("settings")
  return (
    <View
      style={[
        styles.emptyState,
        { borderColor: colors.border, backgroundColor: colors.cardBg },
      ]}
    >
      <View style={styles.emptyStateCopy}>
        <Ionicons name={icon} size={20} color={colors.textTertiary} />
        <ThemedText
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
          style={[styles.emptyText, { color: colors.textSub }]}
        >
          {message}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("doctor.status.retryAccessibility")}
        accessibilityState={{ disabled: isRefreshing }}
        disabled={isRefreshing}
        style={[styles.retryButton, isRefreshing && styles.retryButtonDisabled]}
        onPress={onRetry}
      >
        {isRefreshing ? (
          <V2DotLoader size="s" color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.retryButtonText}>
            {t("doctor.status.retry")}
          </ThemedText>
        )}
      </Pressable>
    </View>
  )
}

function AgreementSection({
  colors,
  agreed,
  onToggle,
  onOpenTerms,
}: {
  colors: ReturnType<typeof useSettingsColors>
  agreed: boolean
  onToggle: () => void
  onOpenTerms: () => void
}) {
  const { t } = useTranslation("settings")
  return (
    <View style={styles.agreementSection}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel={t("doctor.agreement.accessibility")}
        style={styles.checkboxRow}
        onPress={onToggle}
      >
        <Ionicons
          name={agreed ? "checkbox" : "square-outline"}
          size={22}
          color={agreed ? tokens.color.sub6.val : colors.textTertiary}
        />
        <ThemedText style={[styles.checkboxText, { color: colors.text }]}>
          {t("doctor.agreement.label")}
        </ThemedText>
      </Pressable>

      <ThemedText style={[styles.infoLabel, { color: colors.textTertiary }]}>
        {t("doctor.agreement.body")}
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        onPress={onOpenTerms}
        style={styles.termsLink}
      >
        <ThemedText
          style={[styles.termsLinkText, { color: colors.textTertiary }]}
        >
          {t("doctor.agreement.details")}
        </ThemedText>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.textTertiary}
        />
      </Pressable>
    </View>
  )
}

function SearchInput({
  label,
  value,
  placeholder,
  colors,
  onChangeText,
}: {
  label: string
  value: string
  placeholder: string
  colors: ReturnType<typeof useSettingsColors>
  onChangeText: (value: string) => void
}) {
  return (
    <View style={styles.fieldGroup}>
      <ThemedText style={[styles.fieldLabel, { color: colors.textSub }]}>
        {label}
      </ThemedText>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.searchInput,
          {
            color: colors.text,
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
          },
        ]}
        onChangeText={onChangeText}
        returnKeyType="search"
      />
    </View>
  )
}

function DoctorResultCard({
  doctor,
  existingConnection,
  message,
  colors,
  isPending,
  onChangeMessage,
  onRequest,
}: {
  doctor: DoctorDirectoryItem
  existingConnection?: DoctorConnection
  message: string
  colors: ReturnType<typeof useSettingsColors>
  isPending: boolean
  onChangeMessage: (value: string) => void
  onRequest: () => void
}) {
  const { t } = useTranslation("settings")
  const status = existingConnection
    ? statusCopy[existingConnection.status]
    : null
  const disabled = Boolean(existingConnection) || isPending

  return (
    <View
      style={[
        styles.resultCard,
        { borderColor: colors.border, backgroundColor: colors.cardBg },
      ]}
    >
      <View style={styles.resultHeader}>
        <View style={styles.resultAvatar}>
          <Ionicons name="medkit" size={18} color={tokens.color.sub7.val} />
        </View>
        <View style={styles.resultInfo}>
          <ThemedText style={[styles.resultName, { color: colors.text }]}>
            {doctor.name}
          </ThemedText>
          <ThemedText style={[styles.resultMeta, { color: colors.textSub }]}>
            {[doctor.organizationName, doctor.department || doctor.speciality]
              .filter(Boolean)
              .join(" · ") || t("doctor.status.unknownOrganization")}
          </ThemedText>
        </View>
        {status ? (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${status.color}18` },
            ]}
          >
            <Ionicons name={status.icon} size={14} color={status.color} />
            <ThemedText style={[styles.statusText, { color: status.color }]}>
              {t(status.labelKey)}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {!existingConnection ? (
        <TextInput
          value={message}
          placeholder={t("doctor.request.messagePlaceholder")}
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[
            styles.messageInput,
            { color: colors.text, borderColor: colors.border },
          ]}
          onChangeText={onChangeMessage}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          existingConnection
            ? t("doctor.request.alreadyAccessibility")
            : t("doctor.request.accessibility", { name: doctor.name })
        }
        style={[styles.requestButton, disabled && styles.requestButtonDisabled]}
        disabled={disabled}
        onPress={onRequest}
      >
        {isPending ? (
          <V2DotLoader size="s" color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.requestButtonText}>
            {existingConnection
              ? t("doctor.request.sent")
              : t("doctor.request.action")}
          </ThemedText>
        )}
      </Pressable>
    </View>
  )
}

function TermsModal({
  visible,
  colors,
  bottomInset,
  onClose,
}: {
  visible: boolean
  colors: ReturnType<typeof useSettingsColors>
  bottomInset: number
  onClose: () => void
}) {
  const { t } = useTranslation("settings")
  return (
    <AppModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.termsModal, { backgroundColor: colors.bg }]}>
        <View style={styles.termsHeader}>
          <ThemedText style={[styles.termsTitle, { color: colors.text }]}>
            {t("doctor.terms.title")}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("doctor.terms.closeAccessibility")}
            onPress={onClose}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={colors.textSub} />
          </Pressable>
        </View>

        <ScrollView
          bounces={false}
          overScrollMode="never"
          style={styles.termsScroll}
          contentContainerStyle={styles.termsContent}
        >
          <ThemedText style={[styles.termsSection, { color: colors.text }]}>
            {t("doctor.terms.sharingTitle")}
          </ThemedText>
          <ThemedText
            style={[styles.termsParagraph, { color: colors.textSub }]}
          >
            {t("doctor.terms.sharingBody")}
          </ThemedText>

          <ThemedText style={[styles.termsSection, { color: colors.text }]}>
            {t("doctor.terms.withdrawalTitle")}
          </ThemedText>
          <ThemedText
            style={[styles.termsParagraph, { color: colors.textSub }]}
          >
            {t("doctor.terms.withdrawalBody")}
          </ThemedText>

          <ThemedText style={[styles.termsSection, { color: colors.text }]}>
            {t("doctor.terms.supportTitle")}
          </ThemedText>
          <ThemedText
            style={[styles.termsParagraph, { color: colors.textSub }]}
          >
            {t("doctor.terms.supportBody")}
          </ThemedText>
        </ScrollView>

        <View style={[styles.termsBottom, { paddingBottom: bottomInset + 16 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("doctor.terms.confirmAccessibility")}
            style={styles.termsCloseButton}
            onPress={onClose}
          >
            <ThemedText style={styles.termsCloseText}>
              {t("doctor.terms.confirm")}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 18,
  },
  statusSection: {
    gap: 10,
  },
  sectionHeader: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  emptyStateCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  retryButton: {
    minWidth: 104,
    height: 36,
    alignSelf: "flex-start",
    marginLeft: 28,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.color.sub6.val,
  },
  retryButtonDisabled: {
    opacity: 0.65,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  connectionRow: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  connectionInfo: {
    flex: 1,
    gap: 4,
  },
  connectionName: {
    fontSize: 15,
    fontWeight: "700",
  },
  connectionMeta: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusBadge: {
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  segmented: {
    height: 48,
    borderRadius: 12,
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
  },
  mainCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(91, 197, 171, 0.2)",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  otpBox: {
    width: 42,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: tokens.color.textLight.val,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  otpBoxActive: {
    borderColor: tokens.color.sub6.val,
    borderWidth: 1.5,
  },
  otpText: {
    fontSize: 24,
    fontWeight: "800",
  },
  cardSubText: {
    fontSize: 13,
    fontWeight: "500",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  agreementSection: {
    paddingHorizontal: 4,
    gap: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkboxText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
  },
  infoLabel: {
    fontSize: 12,
    paddingLeft: 32,
    lineHeight: 18,
  },
  termsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingLeft: 32,
  },
  termsLinkText: {
    fontSize: 13,
    fontWeight: "400",
    textDecorationLine: "underline",
  },
  searchSection: {
    gap: 12,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "500",
  },
  searchButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: tokens.color.sub6.val,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resultsList: {
    gap: 12,
    paddingTop: 4,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  resultHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0FFF7",
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  resultName: {
    fontSize: 15,
    fontWeight: "800",
  },
  resultMeta: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  messageInput: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontWeight: "500",
    textAlignVertical: "top",
  },
  requestButton: {
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.color.sub6.val,
  },
  requestButtonDisabled: {
    backgroundColor: tokens.color.grey6.val,
  },
  requestButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  termsModal: {
    flex: 1,
  },
  termsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  termsScroll: {
    flex: 1,
  },
  termsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  termsSection: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 20,
    marginBottom: 8,
  },
  termsParagraph: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
  },
  termsBottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  termsCloseButton: {
    backgroundColor: tokens.color.sub6.val,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  termsCloseText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})
