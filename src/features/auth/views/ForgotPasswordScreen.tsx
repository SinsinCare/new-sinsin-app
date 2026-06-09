import { useState, useRef, useCallback, useEffect } from "react"
import { Pressable, Keyboard } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { FormTextField } from "@/src/shared/components"
import { useForm } from "react-hook-form"
import { emailService } from "@/src/services"
import { passwordService } from "@/src/services"
import { passwordRules, confirmPasswordRules } from "../data/passwordValidation"
import { PasswordCriteriaText } from "../components"
import { useAuthColors } from "../hooks"
import { tokens } from "@/src/theme/tokens"

const TIMER_DURATION = 180
const BUTTON_WIDTH = 100

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

interface EmailOtpForm {
  email: string
  code: string
}

interface NewPasswordForm {
  password: string
  confirmPassword: string
}

type Step = "email" | "otp" | "password"

export function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets()
  const colors = useAuthColors()

  const [step, setStep] = useState<Step>("email")
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const emailOtpForm = useForm<EmailOtpForm>({
    defaultValues: { email: "", code: "" },
    mode: "onChange",
  })

  const passwordForm = useForm<NewPasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  })

  const password = passwordForm.watch("password")

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer(TIMER_DURATION)
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleSendCode = async () => {
    const valid = await emailOtpForm.trigger("email")
    if (!valid) return
    Keyboard.dismiss()
    setSendingCode(true)
    setSendError(null)
    try {
      await emailService.sendPasswordResetCode(emailOtpForm.getValues("email"))
      setCodeSent(true)
      setStep("otp")
      startTimer()
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "인증번호 전송에 실패했습니다. 재전송해 주세요.",
      )
    } finally {
      setSendingCode(false)
    }
  }

  const handleResendCode = async () => {
    Keyboard.dismiss()
    setSendingCode(true)
    setSendError(null)
    try {
      await emailService.sendPasswordResetCode(emailOtpForm.getValues("email"))
      startTimer()
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "인증번호 전송에 실패했습니다. 재전송해 주세요.",
      )
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    const valid = await emailOtpForm.trigger("code")
    if (!valid) return
    Keyboard.dismiss()
    setVerifyingCode(true)
    setSendError(null)
    try {
      const result = await emailService.verifyPasswordResetCode(
        emailOtpForm.getValues("email"),
        emailOtpForm.getValues("code"),
      )
      if (result.verified && result.resetToken) {
        setResetToken(result.resetToken)
        if (timerRef.current) clearInterval(timerRef.current)
        setStep("password")
      } else {
        setSendError("인증번호가 올바르지 않습니다. 다시 확인해주세요.")
      }
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "인증에 실패했습니다. 다시 시도해주세요.",
      )
    } finally {
      setVerifyingCode(false)
    }
  }

  const handleResetPassword = async (data: NewPasswordForm) => {
    if (!resetToken) return
    setResettingPassword(true)
    try {
      await passwordService.changePassword(data.password, resetToken)
      router.replace("/(auth)/login")
    } catch (error) {
      passwordForm.setError("password", {
        message:
          error instanceof Error
            ? error.message
            : "비밀번호 재설정에 실패했습니다. 다시 시도해주세요.",
      })
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <YStack flex={1} backgroundColor={colors.bg} paddingTop={insets.top}>
      {/* Header */}
      <YStack height={56} justifyContent="center">
        <Pressable
          onPress={() => router.back()}
          style={{ position: "absolute", left: 9, padding: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.icon} />
        </Pressable>
      </YStack>

      <YStack flex={1} paddingHorizontal={20} justifyContent="space-between">
        <YStack>
          <Text
            fontSize={22}
            fontWeight="600"
            color={colors.text}
            letterSpacing={-0.44}
            lineHeight={26.4}
            marginBottom={8}
          >
            비밀번호 찾기
          </Text>
          <Text
            fontSize={15}
            lineHeight={18}
            color={colors.textSub}
            marginBottom={48}
          >
            {step === "password"
              ? "새로운 비밀번호를 입력해주세요"
              : "가입한 이메일로 인증번호를 전송해드립니다"}
          </Text>

          {/* Step 1 & 2: 이메일 + OTP */}
          {step !== "password" && (
            <YStack gap={36}>
              {/* 이메일 필드 */}
              <YStack>
                <XStack gap={8}>
                  <YStack flex={1}>
                    <FormTextField<EmailOtpForm>
                      name="email"
                      control={emailOtpForm.control}
                      label="이메일"
                      placeholder="가입한 이메일 주소를 입력해주세요"
                      inputType="email"
                      autoFocus
                      rules={{
                        required: "이메일을 입력해주세요.",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "올바른 이메일 형식이 아닙니다.",
                        },
                      }}
                    />
                  </YStack>
                  <YStack
                    width={BUTTON_WIDTH}
                    justifyContent="flex-start"
                    paddingTop={28}
                  >
                    <Pressable
                      onPress={
                        step === "otp" ? handleResendCode : handleSendCode
                      }
                      disabled={sendingCode || (step === "otp" && timer > 0)}
                    >
                      <YStack
                        backgroundColor={
                          sendingCode || (step === "otp" && timer > 0)
                            ? colors.disabledBtn
                            : tokens.color.sub6.val
                        }
                        borderRadius={8}
                        height={52}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Text
                          color="white"
                          fontSize={14}
                          fontWeight="500"
                          letterSpacing={-0.28}
                        >
                          {codeSent ? "재전송" : "이메일 전송"}
                        </Text>
                      </YStack>
                    </Pressable>
                  </YStack>
                </XStack>
              </YStack>

              {/* 인증번호 필드 */}
              {step === "otp" && (
                <YStack>
                  <XStack gap={8}>
                    <YStack flex={1}>
                      <FormTextField<EmailOtpForm>
                        name="code"
                        control={emailOtpForm.control}
                        label="인증번호"
                        placeholder="인증번호 6자리를 입력해주세요"
                        inputType="number"
                        maxLength={6}
                        rules={{
                          required: "인증번호를 입력해주세요.",
                          minLength: {
                            value: 6,
                            message: "인증번호 6자리를 입력해주세요.",
                          },
                        }}
                      />
                    </YStack>
                    <YStack
                      width={BUTTON_WIDTH}
                      justifyContent="flex-start"
                      paddingTop={28}
                    >
                      <Pressable
                        onPress={handleVerifyCode}
                        disabled={verifyingCode}
                      >
                        <YStack
                          backgroundColor={
                            verifyingCode
                              ? colors.disabledBtn
                              : tokens.color.sub6.val
                          }
                          borderRadius={8}
                          height={52}
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Text
                            color="white"
                            fontSize={14}
                            fontWeight="500"
                            letterSpacing={-0.28}
                          >
                            확인
                          </Text>
                        </YStack>
                      </Pressable>
                    </YStack>
                  </XStack>
                  {sendError && (
                    <Text
                      fontSize={13}
                      color={tokens.color.error.val}
                      letterSpacing={-0.26}
                      paddingTop={8}
                    >
                      {sendError}
                    </Text>
                  )}
                  {!sendError && timer > 0 && (
                    <Text
                      fontSize={13}
                      color={tokens.color.error.val}
                      letterSpacing={-0.26}
                      paddingTop={8}
                    >
                      남은 시간 {formatTime(timer)}
                    </Text>
                  )}
                  {!sendError && timer === 0 && codeSent && (
                    <Text
                      fontSize={13}
                      color={tokens.color.error.val}
                      letterSpacing={-0.26}
                      paddingTop={8}
                    >
                      인증 시간이 만료되었습니다. 재전송해주세요.
                    </Text>
                  )}
                </YStack>
              )}
            </YStack>
          )}

          {/* Step 3: 새 비밀번호 입력 */}
          {step === "password" && (
            <YStack gap={36}>
              <YStack gap={10}>
                <FormTextField<NewPasswordForm>
                  name="password"
                  control={passwordForm.control}
                  label="새 비밀번호"
                  placeholder="비밀번호를 형식에 맞춰 입력해주세요"
                  inputType="password"
                  rules={passwordRules}
                />
                <PasswordCriteriaText password={password} />
              </YStack>
              <FormTextField<NewPasswordForm>
                name="confirmPassword"
                control={passwordForm.control}
                label="비밀번호 확인"
                placeholder="입력한 비밀번호를 다시 입력해주세요"
                inputType="password"
                rules={confirmPasswordRules(password)}
              />
            </YStack>
          )}
        </YStack>

        {/* 하단 버튼 */}
        {step === "password" && (
          <YStack paddingBottom={insets.bottom + 24}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss()
                passwordForm.handleSubmit(handleResetPassword)()
              }}
              disabled={!passwordForm.formState.isValid || resettingPassword}
            >
              <YStack
                backgroundColor={
                  passwordForm.formState.isValid && !resettingPassword
                    ? tokens.color.sub6.val
                    : tokens.color.sub6.val + "40"
                }
                paddingVertical={16}
                paddingHorizontal={24}
                borderRadius={8}
                alignItems="center"
                justifyContent="center"
              >
                <Text
                  color="white"
                  fontSize={16}
                  fontWeight="500"
                  letterSpacing={-0.3}
                  lineHeight={20}
                >
                  비밀번호 재설정
                </Text>
              </YStack>
            </Pressable>
          </YStack>
        )}
      </YStack>
    </YStack>
  )
}
