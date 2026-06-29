import React, { useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { ThemedText } from "@/components/themed-text"
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

type Mode = "code" | "search"

const CONNECTIONS_QUERY_KEY = ["doctor-connections"]

const statusCopy: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  APPROVED: { label: "연결됨", color: tokens.color.sub7.val, icon: "checkmark-circle" },
  PENDING: { label: "승인 대기", color: "#C27803", icon: "time" },
  REJECTED: { label: "거절됨", color: tokens.color.error.val, icon: "close-circle" },
}

export function AskDoctorScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const queryClient = useQueryClient()
  const c = useSettingsColors()
  const isDarkMode = useAppColorScheme() === "dark"

  const [mode, setMode] = useState<Mode>("code")
  const [doctorCode, setDoctorCode] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [name, setName] = useState("")
  const [hospital, setHospital] = useState("")
  const [department, setDepartment] = useState("")
  const [messageByDoctorId, setMessageByDoctorId] = useState<Record<string, string>>({})
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
      Alert.alert("등록 완료", "담당 의사가 연결되었습니다.")
    },
    onError: (error) => {
      Alert.alert("등록 실패", error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.")
    },
  })

  const searchMutation = useMutation({
    mutationFn: searchDoctors,
    onSuccess: (result) => {
      setSearchResult(result.items)
    },
    onError: (error) => {
      Alert.alert("검색 실패", error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.")
    },
  })

  const requestMutation = useMutation({
    mutationFn: requestDoctorConnection,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY })
      Alert.alert("요청 완료", "의사의 승인 후 연결됩니다.")
    },
    onError: (error) => {
      Alert.alert("요청 실패", error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.")
    },
  })

  const connections = connectionsQuery.data?.items ?? []
  const canSubmitCode = doctorCode.length === 6 && agreed && !enrollMutation.isPending

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
      Alert.alert("검색어 필요", "이름, 병원, 진료과 중 하나를 입력해주세요.")
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
        title="의사 연결하기"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: mode === "code" ? insets.bottom + 128 : insets.bottom + 32 },
          ]}
        >
          <ConnectionStatusSection
            colors={c}
            isLoading={connectionsQuery.isLoading}
            connections={connections}
          />

          <View style={[styles.segmented, { backgroundColor: c.cardBg }]}>
            <SegmentButton
              label="코드"
              icon="keypad-outline"
              active={mode === "code"}
              colors={c}
              onPress={() => setMode("code")}
            />
            <SegmentButton
              label="검색"
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
                    backgroundColor: isDarkMode ? tokens.color.cardBgDark.val : "#EEFAF7",
                  },
                ]}
              >
                <ThemedText style={[styles.cardTitle, { color: tokens.color.sub7.val }]}>
                  초대 코드 등록
                </ThemedText>

                <Pressable style={styles.otpContainer} onPress={() => inputRef.current?.focus()}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.otpBox,
                        { backgroundColor: isDarkMode ? tokens.color.grey2.val : "#FFFFFF" },
                        doctorCode.length === i && styles.otpBoxActive,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.otpText,
                          { color: doctorCode[i] ? tokens.color.sub8.val : c.textTertiary },
                        ]}
                      >
                        {doctorCode[i] || ""}
                      </ThemedText>
                    </View>
                  ))}
                </Pressable>

                <ThemedText style={[styles.cardSubText, { color: c.textTertiary }]}>
                  병원에서 전달받은 6자리 코드를 입력해주세요
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
                label="이름"
                value={name}
                colors={c}
                placeholder="의사 이름"
                onChangeText={setName}
              />
              <SearchInput
                label="병원"
                value={hospital}
                colors={c}
                placeholder="병원명"
                onChangeText={setHospital}
              />
              <SearchInput
                label="진료과"
                value={department}
                colors={c}
                placeholder="예: 신장내과"
                onChangeText={setDepartment}
              />

              <Pressable
                style={[
                  styles.searchButton,
                  { opacity: searchMutation.isPending ? 0.7 : 1 },
                ]}
                disabled={searchMutation.isPending}
                onPress={submitSearch}
              >
                {searchMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.searchButtonText}>검색</ThemedText>
                  </>
                )}
              </Pressable>

              <View style={styles.resultsList}>
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
                        setMessageByDoctorId((prev) => ({ ...prev, [doctor.id]: text }))
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
          label="등록하기"
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
  return (
    <Pressable
      style={[
        styles.segmentButton,
        active && { backgroundColor: tokens.color.sub6.val },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={17} color={active ? "#FFFFFF" : colors.textSub} />
      <ThemedText style={[styles.segmentText, { color: active ? "#FFFFFF" : colors.textSub }]}>
        {label}
      </ThemedText>
    </Pressable>
  )
}

function ConnectionStatusSection({
  colors,
  isLoading,
  connections,
}: {
  colors: ReturnType<typeof useSettingsColors>
  isLoading: boolean
  connections: DoctorConnection[]
}) {
  return (
    <View style={styles.statusSection}>
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>연결 상태</ThemedText>
        {isLoading ? <ActivityIndicator size="small" color={tokens.color.sub6.val} /> : null}
      </View>
      {connections.length === 0 && !isLoading ? (
        <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
          <Ionicons name="person-add-outline" size={20} color={colors.textTertiary} />
          <ThemedText style={[styles.emptyText, { color: colors.textSub }]}>
            연결된 의사가 없습니다.
          </ThemedText>
        </View>
      ) : (
        connections.map((connection) => {
          const status = statusCopy[connection.status] ?? statusCopy.PENDING
          return (
            <View
              key={connection.id}
              style={[styles.connectionRow, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
            >
              <View style={styles.connectionInfo}>
                <ThemedText style={[styles.connectionName, { color: colors.text }]}>
                  {connection.doctor?.name ?? "의사 정보 없음"}
                </ThemedText>
                <ThemedText style={[styles.connectionMeta, { color: colors.textSub }]}>
                  {[connection.doctor?.organizationName, connection.doctor?.department]
                    .filter(Boolean)
                    .join(" · ") || "소속 정보 없음"}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${status.color}18` }]}>
                <Ionicons name={status.icon} size={14} color={status.color} />
                <ThemedText style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </ThemedText>
              </View>
            </View>
          )
        })
      )}
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
  return (
    <View style={styles.agreementSection}>
      <Pressable style={styles.checkboxRow} onPress={onToggle}>
        <Ionicons
          name={agreed ? "checkbox" : "square-outline"}
          size={22}
          color={agreed ? tokens.color.sub6.val : colors.textTertiary}
        />
        <ThemedText style={[styles.checkboxText, { color: colors.text }]}>
          담당 의사에게 건강 데이터 열람 및 공유를 동의합니다
        </ThemedText>
      </Pressable>

      <ThemedText style={[styles.infoLabel, { color: colors.textTertiary }]}>
        동의 시 의사가 환자님의 건강 기록을 모니터링할 수 있습니다.
      </ThemedText>

      <Pressable onPress={onOpenTerms} style={styles.termsLink}>
        <ThemedText style={[styles.termsLinkText, { color: colors.textTertiary }]}>
          데이터 공유 약관 보기
        </ThemedText>
        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
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
      <ThemedText style={[styles.fieldLabel, { color: colors.textSub }]}>{label}</ThemedText>
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
  const status = existingConnection ? statusCopy[existingConnection.status] : null
  const disabled = Boolean(existingConnection) || isPending

  return (
    <View style={[styles.resultCard, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
      <View style={styles.resultHeader}>
        <View style={styles.resultAvatar}>
          <Ionicons name="medkit" size={18} color={tokens.color.sub7.val} />
        </View>
        <View style={styles.resultInfo}>
          <ThemedText style={[styles.resultName, { color: colors.text }]}>{doctor.name}</ThemedText>
          <ThemedText style={[styles.resultMeta, { color: colors.textSub }]}>
            {[doctor.organizationName, doctor.department || doctor.speciality].filter(Boolean).join(" · ") ||
              "소속 정보 없음"}
          </ThemedText>
        </View>
        {status ? (
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}18` }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <ThemedText style={[styles.statusText, { color: status.color }]}>{status.label}</ThemedText>
          </View>
        ) : null}
      </View>

      {!existingConnection ? (
        <TextInput
          value={message}
          placeholder="전달할 메시지"
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
        style={[styles.requestButton, disabled && styles.requestButtonDisabled]}
        disabled={disabled}
        onPress={onRequest}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.requestButtonText}>
            {existingConnection ? "요청됨" : "연결 요청"}
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
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.termsModal, { backgroundColor: colors.bg }]}>
        <View style={styles.termsHeader}>
          <ThemedText style={[styles.termsTitle, { color: colors.text }]}>데이터 공유 약관</ThemedText>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textSub} />
          </Pressable>
        </View>

        <ScrollView style={styles.termsScroll} contentContainerStyle={styles.termsContent}>
          <ThemedText style={[styles.termsSection, { color: colors.text }]}>
            의사 연결 및 데이터 공유
          </ThemedText>
          <ThemedText style={[styles.termsParagraph, { color: colors.textSub }]}>
            연결된 의사는 사용자의 식단 기록, 영양소 섭취 기록, 수분 기록, 체중 및 부종 기록을 열람할 수 있습니다.
          </ThemedText>

          <ThemedText style={[styles.termsSection, { color: colors.text }]}>
            동의 철회 및 삭제
          </ThemedText>
          <ThemedText style={[styles.termsParagraph, { color: colors.textSub }]}>
            사용자는 데이터 공유 중단 또는 삭제를 요청할 수 있으며, 회원 탈퇴 시 공유된 데이터도 처리 정책에 따라 삭제됩니다.
          </ThemedText>

          <ThemedText style={[styles.termsSection, { color: colors.text }]}>문의</ThemedText>
          <ThemedText style={[styles.termsParagraph, { color: colors.textSub }]}>
            데이터 공유와 삭제에 관한 문의는 앱 내 문의하기 기능 또는 고객센터를 통해 접수할 수 있습니다.
          </ThemedText>
        </ScrollView>

        <View style={[styles.termsBottom, { paddingBottom: bottomInset + 16 }]}>
          <Pressable style={styles.termsCloseButton} onPress={onClose}>
            <ThemedText style={styles.termsCloseText}>확인</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
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
