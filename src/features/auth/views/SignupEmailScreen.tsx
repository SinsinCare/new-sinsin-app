import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { useEffect, useRef } from "react"
import { Keyboard, StyleSheet, View } from "react-native"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ConfirmModal } from "@/src/shared/components"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { ResendCodeLink, StepHelperText, StepTextInput } from "../components"
import { useSignupEmail } from "../hooks"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_TYPE } from "../data/authSurface"
import type { EmailForm } from "../types"
import {
  isVerifiedEmailMatch,
  normalizeSignupEmail,
} from "../data/emailVerificationState"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 이메일 인증. 화면의 액션은 하단 CTA 하나다 — 이메일을 쓰면 "인증번호 받기",
 * 번호가 오면 "확인". 재전송은 코드 필드 아래 텍스트 링크로 낮춰 잡고,
 * 남은 시간은 필드 안 오른쪽에 둔다. 인증이 끝나면 바로 다음 스텝으로 넘어간다.
 */
export function SignupEmailScreen() {
  const { t } = useTranslation("auth")
  const {
    codeSent,
    codeInputVisible,
    sendError,
    codeVerified,
    verifiedEmail,
    timer,
    formattedTime,
    sendingCode,
    verifyingCode,
    emailLoginLinkRequired,
    emailLoginLinkMode,
    sendCode,
    verifyCode,
    resetVerificationState,
    handleNext,
    dismissEmailLoginLink,
    confirmEmailLoginLink,
  } = useSignupEmail()
  const surface = useAuthSurface()

  const { control, getValues, setValue } = useForm<EmailForm>({
    defaultValues: { email: "", code: "" },
    mode: "onChange",
  })
  const email = useWatch({ control, name: "email" })
  const code = useWatch({ control, name: "code" })
  const previousEmailRef = useRef(normalizeSignupEmail(email))
  const isCurrentEmailVerified =
    codeVerified && isVerifiedEmailMatch(verifiedEmail, email)

  useEffect(() => {
    const normalizedEmail = normalizeSignupEmail(email)
    if (previousEmailRef.current === normalizedEmail) return
    previousEmailRef.current = normalizedEmail
    setValue("code", "")
    resetVerificationState()
  }, [email, resetVerificationState, setValue])

  // 인증이 확인되는 순간 바로 다음 스텝으로 — "다음을 눌러주세요" 같은
  // 죽은 상태를 화면에 남기지 않는다. 이메일이 바뀌면 가드가 풀린다.
  const advancedRef = useRef(false)
  useEffect(() => {
    if (isCurrentEmailVerified && !advancedRef.current) {
      advancedRef.current = true
      handleNext(getValues("email"))
      return
    }
    if (!isCurrentEmailVerified) advancedRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentEmailVerified])

  const emailValid = EMAIL_PATTERN.test(email.trim())
  const awaitingCode = codeInputVisible && !isCurrentEmailVerified
  /*
    `awaitingCode` 가 조건에 들어 있어야 한다. 이메일 연결 모드의 **인증 성공** 분기가
    `setTimer(0)` 을 부르면서 `codeSent` 는 true 로 남기므로, 그 가드가 없으면 통과한
    사람이 만료로 찍힌다 — 화면은 이 값을 `awaitingCode` 블록 안에서만 읽어 안 드러났지만
    계측은 블록 밖이라 그대로 나갔다(지표가 뒤집히는 자리다).
  */
  const codeExpired = awaitingCode && !sendError && timer === 0 && codeSent

  /*
    3분 타이머가 끝날 때까지 번호를 못 넣은 사람. **메일 지연의 직접 증거**다.

    타이머는 매초 `timer` 를 갈아 끼우므로 렌더 본문에서 쏘면 한 번의 만료가 수십 행이
    된다. false→true 전이에서만 1회 쏜다 — 이메일을 바꾸면 `resetVerificationState` 가
    `codeSent` 를 내려 조건이 풀리고, 그 다음 만료는 다시 셀 수 있다.
  */
  const expiredTrackedRef = useRef(false)
  useEffect(() => {
    if (!codeExpired) {
      expiredTrackedRef.current = false
      return
    }
    if (expiredTrackedRef.current) return
    expiredTrackedRef.current = true
    trackAnalyticsEvent("auth_code_expired", {
      source: emailLoginLinkMode ? "email_link" : "signup",
    })
  }, [codeExpired, emailLoginLinkMode])

  const handleSendCode = async () => {
    Keyboard.dismiss()
    await sendCode(getValues("email"))
  }

  const handleVerifyCode = async () => {
    Keyboard.dismiss()
    const { email, code } = getValues()
    await verifyCode(email, code)
  }

  const ctaLabel = awaitingCode
    ? t("common.confirm")
    : t("emailVerification.sendCode")
  /* 번호 칸이 떠 있는 동안의 `sendError` 는 **재전송** 실패다(인증 실패는 토스트로
     나간다). 그때 확인 버튼까지 잠그면 "이미 보냈어요, 메일함을 확인해 주세요"
     (`OTP_ERROR_001`)를 읽은 사용자가 손에 든 번호를 넣지 못한다. */
  const ctaDisabled = awaitingCode
    ? code.length !== 6 || verifyingCode
    : !emailValid || sendingCode
  const onCtaPress = awaitingCode ? handleVerifyCode : handleSendCode

  return (
    <>
      <AuthScreenLayout
        title={t("signupEmail.title")}
        subtitle={t("signupEmail.subtitle")}
        buttonLabel={ctaLabel}
        buttonDisabled={ctaDisabled}
        buttonLoading={sendingCode || verifyingCode}
        onSubmit={onCtaPress}
        keyboardAvoiding
      >
        <View style={styles.body}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <View>
                <StepTextInput
                  autoFocus
                  label={t("fields.email")}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  onClear={() => field.onChange("")}
                  placeholder="example@email.com"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  hasError={!!field.value && !emailValid}
                />
                {field.value && !emailValid ? (
                  <StepHelperText
                    message={t("validation.emailInvalid")}
                    tone="error"
                  />
                ) : sendError && !codeInputVisible ? (
                  <StepHelperText message={sendError} tone="error" />
                ) : null}
              </View>
            )}
          />

          {awaitingCode && (
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <View>
                  <StepTextInput
                    autoFocus
                    label={t("fields.verificationCode")}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={t("fields.sixDigitCode")}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                    hasError={!!sendError || codeExpired}
                    trailing={
                      timer > 0 ? (
                        <Text style={[styles.timer, { color: surface.brand }]}>
                          {formattedTime}
                        </Text>
                      ) : null
                    }
                  />
                  {sendError ? (
                    <StepHelperText message={sendError} tone="error" />
                  ) : codeExpired ? (
                    <StepHelperText
                      message={t("emailVerification.expired")}
                      tone="error"
                    />
                  ) : null}
                  <ResendCodeLink
                    onPress={handleSendCode}
                    disabled={sendingCode}
                  />
                </View>
              )}
            />
          )}
        </View>
      </AuthScreenLayout>
      <ConfirmModal
        visible={!!emailLoginLinkRequired}
        title={t("signupEmail.linkTitle")}
        description={t("signupEmail.linkDescription")}
        cancelText={t("signupEmail.otherEmail")}
        confirmText={t("signupEmail.verifyIdentity")}
        onCancel={dismissEmailLoginLink}
        onConfirm={confirmEmailLoginLink}
      />
    </>
  )
}

const styles = StyleSheet.create({
  body: { marginTop: AUTH_LAYOUT.questionToField, gap: 20 },
  timer: {
    ...AUTH_TYPE.helper,
    fontVariant: ["tabular-nums"],
  },
})
