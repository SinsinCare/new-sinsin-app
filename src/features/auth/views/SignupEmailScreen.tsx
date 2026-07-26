import { useEffect, useRef } from "react"
import { Keyboard, StyleSheet, View } from "react-native"
import { useForm, useWatch } from "react-hook-form"
import { ConfirmModal } from "@/src/shared/components"
import { spacing } from "@/src/design-system-v2"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { useSignupEmail } from "../hooks"
import type { EmailForm } from "../types"
import {
  canVerifyEmailOtp,
  isVerifiedEmailMatch,
  normalizeSignupEmail,
} from "../data/emailVerificationState"
import { EmailOtpFieldGroup } from "../components/EmailOtpFieldGroup"
import { OtpVerificationStatus } from "../components/OtpVerificationStatus"

export function SignupEmailScreen() {
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
    emailLoginLinkProviderLabel,
    sendCode,
    verifyCode,
    resetVerificationState,
    handleNext,
    dismissEmailLoginLink,
    confirmEmailLoginLink,
  } = useSignupEmail()

  const { control, getValues, trigger, setValue } = useForm<EmailForm>({
    defaultValues: { email: "", code: "" },
    mode: "onChange",
  })
  const email = useWatch({ control, name: "email" })
  const previousEmailRef = useRef(normalizeSignupEmail(email))
  const isCurrentEmailVerified =
    codeVerified && isVerifiedEmailMatch(verifiedEmail, email)
  const canVerify = canVerifyEmailOtp({
    codeSent,
    timer,
    error: sendError,
    verified: isCurrentEmailVerified,
  })

  useEffect(() => {
    const normalizedEmail = normalizeSignupEmail(email)
    if (previousEmailRef.current === normalizedEmail) return
    previousEmailRef.current = normalizedEmail
    setValue("code", "")
    resetVerificationState()
  }, [email, resetVerificationState, setValue])

  const handleSendCode = async () => {
    const valid = await trigger("email")
    if (!valid) return
    Keyboard.dismiss()
    setValue("code", "")
    await sendCode(getValues("email"))
  }

  const handleVerifyCode = async () => {
    const valid = await trigger("code")
    if (!valid) return
    Keyboard.dismiss()
    const { email, code } = getValues()
    await verifyCode(email, code)
  }

  const onNext = () => {
    handleNext(getValues("email"))
  }

  return (
    <>
      <AuthScreenLayout
        title="이메일을 입력해주세요"
        subtitle="회원가입을 위해 이메일 인증을 진행해주세요"
        buttonLabel={isCurrentEmailVerified ? "다음" : "다음 단계"}
        buttonDisabled={!isCurrentEmailVerified}
        onSubmit={onNext}
      >
        <View style={styles.form}>
          <EmailOtpFieldGroup<EmailForm>
            control={control}
            emailName="email"
            codeName="code"
            codeInputVisible={codeInputVisible}
            codeSent={codeSent}
            verified={isCurrentEmailVerified}
            sendingCode={sendingCode}
            verifyingCode={verifyingCode}
            canVerify={canVerify}
            onSendCode={handleSendCode}
            onVerifyCode={handleVerifyCode}
          />
          <OtpVerificationStatus
            codeSent={codeSent}
            error={sendError}
            formattedTime={formattedTime}
            loading={sendingCode || verifyingCode}
            timer={timer}
            verified={isCurrentEmailVerified}
          />
        </View>
      </AuthScreenLayout>
      <ConfirmModal
        visible={!!emailLoginLinkRequired}
        title="이미 가입된 이메일입니다"
        description={`이미 ${emailLoginLinkProviderLabel} 로그인으로 가입된 이메일입니다.\n이메일 로그인도 연결하시겠습니까?`}
        cancelText="취소"
        confirmText="연결하기"
        onCancel={dismissEmailLoginLink}
        onConfirm={confirmEmailLoginLink}
      />
    </>
  )
}

const styles = StyleSheet.create({
  form: { marginTop: spacing[32] + spacing[16] },
})
