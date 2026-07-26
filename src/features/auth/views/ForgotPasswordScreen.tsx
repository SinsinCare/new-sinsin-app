import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import {
  BackHandler,
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native"
import { router, useNavigation } from "expo-router"
import { useForm, useWatch } from "react-hook-form"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import {
  V2Screen,
  V2ScreenHeader,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { emailService, passwordService } from "@/src/services"
import { AuthPasswordFields } from "../components/AuthPasswordFields"
import { EmailOtpFieldGroup } from "../components/EmailOtpFieldGroup"
import { OtpVerificationStatus } from "../components/OtpVerificationStatus"
import {
  canStartPasswordResetSend,
  canVerifyPasswordResetOtp,
  createInitialPasswordResetFlowState,
  formatPasswordResetTimer,
  isPasswordResetEmailCurrent,
  normalizePasswordResetEmail,
  passwordResetFlowReducer,
  shouldResetPasswordResetFlowForEmailChange,
} from "../data/passwordResetFlow"
import type { EmailForm, PasswordForm } from "../types"
import { AuthScreenLayout } from "./AuthScreenLayout"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function ForgotPasswordScreen() {
  const navigation = useNavigation()
  const { colors } = useV2Theme()
  const [flow, dispatch] = useReducer(
    passwordResetFlowReducer,
    undefined,
    createInitialPasswordResetFlowState,
  )
  const [resettingPassword, setResettingPassword] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sendingCodeRef = useRef(false)
  const verifyingCodeRef = useRef(false)
  const resettingPasswordRef = useRef(false)
  const flowRef = useRef(flow)
  flowRef.current = flow

  const {
    control: emailOtpControl,
    getValues: getEmailOtpValues,
    setValue: setEmailOtpValue,
    trigger: triggerEmailOtp,
  } = useForm<EmailForm>({
    defaultValues: { email: "", code: "" },
    mode: "onChange",
    reValidateMode: "onChange",
  })
  const email = useWatch({ control: emailOtpControl, name: "email" })

  const {
    control: passwordControl,
    clearErrors: clearPasswordErrors,
    formState: { isValid: isPasswordValid },
    handleSubmit: handlePasswordFormSubmit,
    reset: resetPasswordForm,
    setError: setPasswordError,
  } = useForm<PasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
    reValidateMode: "onChange",
  })

  const stopTimer = useCallback(() => {
    if (!timerRef.current) return
    clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const startTimer = useCallback(() => {
    stopTimer()
    timerRef.current = setInterval(() => {
      if (flowRef.current.timer <= 0) {
        stopTimer()
        return
      }
      dispatch({ type: "timer_ticked" })
    }, 1000)
  }, [stopTimer])

  useEffect(() => {
    return stopTimer
  }, [stopTimer])

  useEffect(() => {
    if (flow.timer <= 0) stopTimer()
  }, [flow.timer, stopTimer])

  useEffect(() => {
    if (!shouldResetPasswordResetFlowForEmailChange(flow.requestedEmail, email))
      return
    stopTimer()
    setEmailOtpValue("code", "")
    dispatch({ type: "email_changed", email })
  }, [email, flow.requestedEmail, setEmailOtpValue, stopTimer])

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: flow.step === "email" })
    return () => navigation.setOptions({ gestureEnabled: true })
  }, [flow.step, navigation])

  const moveBack = useCallback(() => {
    if (
      sendingCodeRef.current ||
      verifyingCodeRef.current ||
      resettingPasswordRef.current
    )
      return

    Keyboard.dismiss()
    if (flow.step === "email") {
      if (router.canGoBack()) {
        router.back()
        return
      }
      router.replace("/(auth)/login")
      return
    }

    stopTimer()
    if (flow.step === "password") {
      resetPasswordForm()
    } else {
      setEmailOtpValue("code", "")
    }
    dispatch({ type: "back" })
  }, [flow.step, resetPasswordForm, setEmailOtpValue, stopTimer])

  useEffect(() => {
    if (flow.step === "email") return
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        moveBack()
        return true
      },
    )
    return () => subscription.remove()
  }, [flow.step, moveBack])

  const handleSendCode = async () => {
    if (
      sendingCodeRef.current ||
      verifyingCodeRef.current ||
      !canStartPasswordResetSend(flowRef.current)
    )
      return

    sendingCodeRef.current = true
    dispatch({ type: "send_started" })
    try {
      const valid = await triggerEmailOtp("email")
      if (!valid) {
        dispatch({ type: "request_cancelled", request: "send" })
        return
      }

      Keyboard.dismiss()
      const requestedEmail = getEmailOtpValues("email")
      setEmailOtpValue("code", "")
      await emailService.sendPasswordResetCode(requestedEmail)

      if (
        normalizePasswordResetEmail(getEmailOtpValues("email")) !==
        normalizePasswordResetEmail(requestedEmail)
      ) {
        dispatch({ type: "request_cancelled", request: "send" })
        return
      }

      dispatch({ type: "send_succeeded", email: requestedEmail })
      startTimer()
    } catch (error) {
      dispatch({
        type: "send_failed",
        error: getErrorMessage(
          error,
          "인증번호 전송에 실패했습니다. 재전송해 주세요.",
        ),
      })
    } finally {
      sendingCodeRef.current = false
    }
  }

  const handleVerifyCode = async () => {
    const currentEmail = getEmailOtpValues("email")
    if (
      verifyingCodeRef.current ||
      sendingCodeRef.current ||
      !canVerifyPasswordResetOtp(flowRef.current, currentEmail)
    )
      return

    verifyingCodeRef.current = true
    dispatch({ type: "verify_started", email: currentEmail })
    try {
      const valid = await triggerEmailOtp("code")
      if (!valid) {
        dispatch({ type: "request_cancelled", request: "verify" })
        return
      }

      const liveFlow = flowRef.current
      const liveEmail = getEmailOtpValues("email")
      if (
        liveFlow.timer <= 0 ||
        !isPasswordResetEmailCurrent(liveFlow.requestedEmail, liveEmail)
      ) {
        dispatch({ type: "request_cancelled", request: "verify" })
        return
      }

      Keyboard.dismiss()
      const result = await emailService.verifyPasswordResetCode(
        liveEmail,
        getEmailOtpValues("code"),
      )
      if (result.verified && result.resetToken) {
        stopTimer()
        dispatch({
          type: "verify_succeeded",
          resetToken: result.resetToken,
        })
        return
      }
      dispatch({
        type: "verify_failed",
        error: "인증번호가 올바르지 않습니다. 다시 확인해주세요.",
      })
    } catch (error) {
      dispatch({
        type: "verify_failed",
        error: getErrorMessage(
          error,
          "인증에 실패했습니다. 다시 시도해주세요.",
        ),
      })
    } finally {
      verifyingCodeRef.current = false
    }
  }

  const handleResetPassword = async (data: PasswordForm) => {
    if (resettingPasswordRef.current) return
    if (!flow.resetToken) {
      setPasswordError("password", {
        message:
          "인증 정보가 만료되었습니다. 이메일 인증부터 다시 진행해주세요.",
      })
      return
    }

    resettingPasswordRef.current = true
    setResettingPassword(true)
    clearPasswordErrors("password")
    try {
      await passwordService.changePassword(data.password, flow.resetToken)
      router.replace("/(auth)/login")
    } catch (error) {
      setPasswordError("password", {
        message: getErrorMessage(
          error,
          "비밀번호 재설정에 실패했습니다. 다시 시도해주세요.",
        ),
      })
    } finally {
      resettingPasswordRef.current = false
      setResettingPassword(false)
    }
  }

  const sendingCode = flow.activeOtpRequest === "send"
  const verifyingCode = flow.activeOtpRequest === "verify"
  const isPasswordStep = flow.step === "password"
  const canVerify = canVerifyPasswordResetOtp(flow, email)
  const submitPassword = handlePasswordFormSubmit(handleResetPassword)

  if (isPasswordStep) {
    return (
      <AuthScreenLayout
        title="새 비밀번호를 입력해주세요"
        subtitle="로그인에 사용할 새로운 비밀번호를 설정해주세요"
        buttonLabel="비밀번호 재설정"
        buttonDisabled={
          !flow.resetToken || !isPasswordValid || resettingPassword
        }
        buttonLoading={resettingPassword}
        onSubmit={submitPassword}
        onBack={moveBack}
        scrollable
        keyboardAvoiding
      >
        <AuthPasswordFields control={passwordControl} />
      </AuthScreenLayout>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <V2Screen padded={false} edges={["left", "right", "bottom"]}>
        <V2ScreenHeader onBack={moveBack} />
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.otpScrollContent}
          bottomOffset={spacing[24]}
          disableScrollOnKeyboardHide
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.otpBody}>
            <Text
              style={[typography.title.medium, { color: colors.label.strong }]}
            >
              비밀번호 찾기
            </Text>
            <Text
              style={[
                typography.subtext.large,
                styles.subtitle,
                { color: colors.label.alternative },
              ]}
            >
              가입한 이메일로 인증번호를 전송해드립니다
            </Text>
            <View style={styles.form}>
              <EmailOtpFieldGroup<EmailForm>
                control={emailOtpControl}
                emailName="email"
                codeName="code"
                codeInputVisible={flow.step === "otp" && flow.codeSent}
                codeSent={flow.codeSent}
                verified={false}
                sendingCode={sendingCode}
                verifyingCode={verifyingCode}
                canVerify={canVerify}
                onSendCode={handleSendCode}
                onVerifyCode={handleVerifyCode}
              />
              <OtpVerificationStatus
                codeSent={flow.codeSent}
                error={flow.error}
                formattedTime={formatPasswordResetTimer(flow.timer)}
                loading={sendingCode || verifyingCode}
                timer={flow.timer}
                verified={false}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
      </V2Screen>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  otpScrollContent: {
    flexGrow: 1,
    paddingBottom: spacing[24],
  },
  otpBody: {
    paddingHorizontal: spacing[20],
  },
  subtitle: { marginTop: spacing[8] },
  form: { marginTop: spacing[32] + spacing[16] },
})
