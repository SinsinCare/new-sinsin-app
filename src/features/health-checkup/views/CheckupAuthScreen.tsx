import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 건강검진 불러오기 — 본인인증 (시안 My Page Home-10).
 *
 * ## 실패를 삼키지 않는다
 *
 * 기존 `src/features/health/views/NhisRequestScreen.tsx` 는 인증수단 조회를
 * `.catch(() => {})` 로 삼킨다. 그러면 목록이 빈 채로 남고, 수단을 못 고르니 CTA 가
 * 영영 비활성인데 화면에는 아무 설명도 없다 — 사용자는 앱이 멈춘 줄 안다.
 * 여기서는 실패를 그대로 말하고 재시도를 준다.
 *
 * ## CTA 를 미리 잠그지 않는다
 *
 * 검증에 걸리면 버튼을 죽이는 대신 **눌렀을 때 어느 칸이 문제인지** 필드에 붙여 말한다.
 * 비활성 버튼은 "무엇이 모자란지" 를 말하지 못한다. 다만 인증수단을 못 불러온
 * 상태에서는 보낼 곳 자체가 없으므로 그때만 잠근다.
 *
 * ## PENDING 은 같은 화면에서 처리한다
 *
 * 기존 흐름은 `NhisConfirmScreen` 이라는 별도 화면으로 밀어내고, 거기서 confirm 을
 * **한 번만** 시도한다. 인증 앱에서 아직 안 눌렀거나 통신이 튀면 뒤로가기 말고 길이 없다.
 * 인증 앱을 오가는 동안 화면이 유지돼야 하므로 여기서는 단계만 바꾸고, confirm 은
 * 몇 번이든 다시 누를 수 있다.
 */

import { useCallback, useMemo, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { useTranslation } from "react-i18next"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  V2BottomCTA,
  V2Button,
  V2ScreenHeader,
  V2Skeleton,
  V2SkeletonGroup,
  V2TextField,
  spacing,
  typography,
  useLoadingVisible,
  useV2Theme,
} from "@/src/design-system-v2"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { useAppRouter } from "@/src/shared/navigation"
import { nhisService } from "@/src/services/data/nhisService"
import type { AuthMethodRs } from "@/src/types/nhis"

import { checkupKeys } from "../data/checkupQueries"
import { AuthChoiceCard } from "../components/AuthChoiceCard"

/** 화면 좌우 여백 — 배치 전체가 16 으로 맞춰져 있다. */
const SIDE = spacing[16]

/**
 * 입력 중에도 `010-1234-5678` 로 보이게 한다. 저장은 보이는 값 그대로 두고
 * 제출할 때만 숫자를 뽑는다 — 하이픈을 서버로 보내면 조회가 실패한다.
 * 국내 휴대폰은 11자리 하나뿐이라 3-4-4 로만 끊는다.
 */
function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 11)
  if (digits.length < 4) return digits
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

/** `2000-04-12` 표기. 서버로는 하이픈 없이 8자리(`resNo`)를 보낸다. */
function formatBirth(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8)
  if (digits.length < 5) return digits
  if (digits.length < 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

/**
 * 실제로 존재하는 날짜인지까지 본다.
 *
 * 기존 코드는 `resNo.length === 8` 만 봐서 `19901399` 가 통과하고, 그 값은 공단에서
 * 조회 실패로 돌아온다 — 사용자는 이유를 모른 채 "인증 실패" 만 본다.
 * `new Date(y, m, 0)` 은 m월의 마지막 날이라 윤년까지 엔진이 계산해 준다.
 */
function isRealBirthDate(digits: string): boolean {
  if (!/^\d{8}$/.test(digits)) return false
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  if (year < 1900) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > new Date(year, month, 0).getDate()) return false
  // 미래에 태어난 사람은 없다. 오타로 연도를 2900 으로 친 경우를 여기서 잡는다.
  return new Date(year, month - 1, day).getTime() <= Date.now()
}

type Phase = "form" | "pending"

export function CheckupAuthScreen({ onDone }: { onDone?: () => void }) {
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { t } = useTranslation("health")
  const { t: tCommon } = useTranslation("common")
  const { colors } = useV2Theme()

  const methodsQuery = useQuery({
    // `checkupKeys.all` 아래에 붙여 둔다 — 검진 관련 캐시를 한 번에 비울 수 있게.
    queryKey: [...checkupKeys.all, "auth-methods"],
    queryFn: () => nhisService.getAuthMethod(),
  })
  const methods: AuthMethodRs[] = useMemo(
    () => methodsQuery.data ?? [],
    [methodsQuery.data],
  )
  const showMethodsSkeleton = useLoadingVisible(methodsQuery.isLoading, {
    surface: "checkup_auth",
  })

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [birth, setBirth] = useState("")
  const [methodKey, setMethodKey] = useState<string | null>(null)
  const [telecom, setTelecom] = useState<string | null>(null)

  // 검증 결과는 **제출을 눌러 본 뒤에만** 보여 준다. 타이핑 첫 글자부터 빨간 글씨가
  // 붙으면 아직 다 쓰지도 않은 사람을 나무라는 꼴이 된다.
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [phase, setPhase] = useState<Phase>("form")
  const [requestId, setRequestId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const selectedMethod = methods.find((m) => m.key === methodKey) ?? null
  const needsTelecom = selectedMethod?.requiresTelecom ?? false
  const phoneDigits = phone.replace(/\D/g, "")
  const birthDigits = birth.replace(/\D/g, "")

  const errors = {
    name: name.trim().length === 0 ? t("checkup.auth.errorName") : null,
    phone: phoneDigits.length !== 11 ? t("checkup.auth.errorPhone") : null,
    birth: !isRealBirthDate(birthDigits) ? t("checkup.auth.errorBirth") : null,
    method: selectedMethod == null ? t("checkup.auth.errorMethod") : null,
    telecom:
      needsTelecom && telecom == null ? t("checkup.auth.errorTelecom") : null,
  }
  const hasError = Object.values(errors).some((message) => message != null)

  const finish = useCallback(async () => {
    // 새로 불러온 검진이 목록에 바로 보이게 한다. 안 하면 뒤로 갔을 때 이전 목록이 남는다.
    await queryClient.invalidateQueries({ queryKey: checkupKeys.results() })
    if (onDone) onDone()
    else router.back()
  }, [onDone, queryClient, router])

  const handleSubmit = useCallback(async () => {
    setSubmitted(true)
    setSubmitError(null)
    if (hasError || !selectedMethod) return

    setSubmitting(true)
    try {
      const result = await nhisService.healthCheckRequest({
        loginOrgCd: selectedMethod.key,
        resNm: name.trim(),
        resNo: birthDigits,
        mobileNo: phoneDigits,
        // PASS 가 아닌 수단에 통신사를 실어 보내면 공단 쪽에서 거절한다.
        mobileCo: selectedMethod.requiresTelecom ? telecom : null,
      })
      if (result.status === "SUCCESS") {
        await finish()
        return
      }
      if (result.status === "PENDING") {
        setRequestId(result.requestId)
        setConfirmError(null)
        setPhase("pending")
        return
      }
      setSubmitError(t("nhis.requestRejected"))
    } catch (error) {
      // 여기서 오는 실패는 대부분 연결이 아니다 — 공단 점검(`HC_ERROR_005`), 인증
      // 만료(`HC_ERROR_002`), 인증 앱 미응답(`HC_ERROR_003`). 예전에는 셋 다
      // "인터넷 연결을 확인한 뒤 다시 눌러 주세요" 로 나갔고, 서버가 준 원문은
      // `CODEF 요청에 실패했습니다.` 라 그대로 쓸 수도 없었다.
      setSubmitError(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }, [
    birthDigits,
    finish,
    hasError,
    name,
    phoneDigits,
    selectedMethod,
    t,
    telecom,
  ])

  const handleConfirm = useCallback(async () => {
    if (requestId == null) return
    setConfirming(true)
    setConfirmError(null)
    try {
      const result = await nhisService.healthCheckConfirm(requestId)
      if (result.status === "SUCCESS") {
        await finish()
        return
      }
      // 실패해도 단계를 되돌리지 않는다 — 인증 앱에서 아직 안 눌렀을 뿐일 수 있고,
      // 그때 폼으로 튕겨 보내면 입력을 다시 시작해야 한다.
      setConfirmError(
        result.status === "TIMEOUT"
          ? t("nhis.timeoutTitle")
          : t("nhis.failedTitle"),
      )
    } catch (error) {
      setConfirmError(getErrorMessage(error))
    } finally {
      setConfirming(false)
    }
  }, [finish, requestId, t])

  // 빈 배열도 실패로 친다 — 고를 수단이 하나도 없으면 사용자가 할 수 있는 일이 없는데,
  // 성공으로 취급하면 아무 설명 없이 빈 자리만 남는다(기존 화면이 그랬다).
  const methodsFailed =
    methodsQuery.isError || (!methodsQuery.isPending && methods.length === 0)

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <V2ScreenHeader
        title={t("checkup.auth.title")}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {phase === "pending" ? (
            <View style={styles.pending}>
              <Text
                style={[typography.title.small, { color: colors.label.normal }]}
              >
                {t("checkup.auth.pendingTitle")}
              </Text>
              <Text
                style={[
                  typography.body.mediumWeak,
                  { color: colors.label.alternative },
                ]}
              >
                {t("checkup.auth.pendingBody")}
              </Text>
              {confirmError != null && (
                <Text
                  lineBreakStrategyIOS="hangul-word"
                  textBreakStrategy="balanced"
                  style={[
                    typography.subtext.large,
                    { color: colors.status.negative },
                  ]}
                >
                  {confirmError}
                </Text>
              )}
            </View>
          ) : (
            <>
              <V2TextField
                label={t("checkup.auth.nameLabel")}
                placeholder={t("checkup.auth.namePlaceholder")}
                value={name}
                onChangeText={setName}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                error={submitted ? (errors.name ?? false) : false}
              />

              <V2TextField
                label={t("checkup.auth.phoneLabel")}
                placeholder={t("checkup.auth.phonePlaceholder")}
                value={phone}
                onChangeText={(next) => setPhone(formatPhone(next))}
                keyboardType="number-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={13} // 010-0000-0000
                error={submitted ? (errors.phone ?? false) : false}
              />

              <V2TextField
                label={t("checkup.auth.birthLabel")}
                placeholder={t("checkup.auth.birthPlaceholder")}
                value={birth}
                onChangeText={(next) => setBirth(formatBirth(next))}
                keyboardType="number-pad"
                maxLength={10} // YYYY-MM-DD
                error={submitted ? (errors.birth ?? false) : false}
              />

              <View style={styles.section}>
                <Text
                  style={[
                    typography.subtext.mediumStrong,
                    { color: colors.label.normal },
                  ]}
                >
                  {t("checkup.auth.methodLabel")}
                </Text>

                {showMethodsSkeleton ? (
                  <V2SkeletonGroup style={styles.row}>
                    {/* 폭은 감싼 View 가 나눈다 — V2Skeleton 자체는 100% 를 채운다. */}
                    <View style={styles.flex}>
                      <V2Skeleton height={72} radius="lg" />
                    </View>
                    <View style={styles.flex}>
                      <V2Skeleton height={72} radius="lg" />
                    </View>
                  </V2SkeletonGroup>
                ) : methodsFailed ? (
                  <View style={styles.inlineError}>
                    <Text
                      lineBreakStrategyIOS="hangul-word"
                      textBreakStrategy="balanced"
                      style={[
                        typography.subtext.large,
                        { color: colors.status.negative },
                      ]}
                    >
                      {/* 빈 목록은 오류 객체가 없다 — 그때만 화면이 문구를 짓는다. */}
                      {methodsQuery.error
                        ? getErrorMessage(methodsQuery.error)
                        : t("checkup.auth.methodsLoadError")}
                    </Text>
                    <V2Button
                      size="s"
                      color="neutral"
                      variant="weak"
                      onPress={() => void methodsQuery.refetch()}
                    >
                      {tCommon("action.retry")}
                    </V2Button>
                  </View>
                ) : (
                  <View style={styles.row}>
                    {methods.map((method) => (
                      <AuthChoiceCard
                        key={method.key}
                        label={method.displayName}
                        selected={method.key === methodKey}
                        onPress={() => {
                          setMethodKey(method.key)
                          // 수단을 바꾸면 이전 통신사 선택은 의미가 없다.
                          setTelecom(null)
                        }}
                      />
                    ))}
                  </View>
                )}

                {submitted && errors.method != null && !methodsFailed && (
                  <Text
                    style={[
                      typography.subtext.medium,
                      { color: colors.status.negative },
                    ]}
                  >
                    {errors.method}
                  </Text>
                )}
              </View>

              {/* 통신사는 PASS 처럼 `requiresTelecom` 인 수단에서만 필요하다.
                  항상 띄우면 카카오 사용자에게는 고를 이유 없는 줄이 하나 는다. */}
              {needsTelecom && selectedMethod != null && (
                <View style={styles.section}>
                  <Text
                    style={[
                      typography.subtext.mediumStrong,
                      { color: colors.label.normal },
                    ]}
                  >
                    {t("checkup.auth.telecomLabel")}
                  </Text>
                  <View style={styles.row}>
                    {selectedMethod.telecomOptions.map((option) => (
                      <AuthChoiceCard
                        key={option.code}
                        compact
                        label={option.label}
                        selected={option.code === telecom}
                        onPress={() => setTelecom(option.code)}
                      />
                    ))}
                  </View>
                  {submitted && errors.telecom != null && (
                    <Text
                      style={[
                        typography.subtext.medium,
                        { color: colors.status.negative },
                      ]}
                    >
                      {errors.telecom}
                    </Text>
                  )}
                </View>
              )}

              {submitError != null && (
                <Text
                  lineBreakStrategyIOS="hangul-word"
                  textBreakStrategy="balanced"
                  style={[
                    typography.subtext.large,
                    { color: colors.status.negative },
                  ]}
                >
                  {submitError}
                </Text>
              )}
            </>
          )}
        </ScrollView>

        {phase === "pending" ? (
          <V2BottomCTA
            primaryLabel={t("checkup.auth.pendingConfirm")}
            onPrimary={() => void handleConfirm()}
            primaryProps={{ loading: confirming, disabled: confirming }}
          />
        ) : (
          <V2BottomCTA
            primaryLabel={t("checkup.auth.submit")}
            onPrimary={() => void handleSubmit()}
            primaryProps={{
              loading: submitting,
              // 인증수단을 못 불러왔으면 보낼 곳이 없다. 그 외에는 잠그지 않는다.
              disabled: submitting || methods.length === 0,
            }}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: SIDE,
    paddingTop: spacing[32],
    paddingBottom: spacing[32],
    gap: spacing[24],
  },
  section: { gap: spacing[8] },
  row: { flexDirection: "row", gap: spacing[8] },
  flex: { flex: 1 },
  inlineError: {
    alignItems: "flex-start",
    gap: spacing[8],
  },
  pending: {
    paddingTop: spacing[32],
    gap: spacing[8],
  },
})
