import { useEffect, useRef } from "react"
import { Keyboard, StyleSheet, Text, View } from "react-native"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ConfirmModal } from "@/src/shared/components"
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
  const codeExpired = !sendError && timer === 0 && codeSent

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
  const ctaDisabled = awaitingCode
    ? code.length !== 6 || verifyingCode || !!sendError
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
