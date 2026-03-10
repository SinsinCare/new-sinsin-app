import { useState, useRef, useCallback, useEffect } from "react"
import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { FormTextField } from "@/src/shared/components"
import { useForm } from "react-hook-form"
import { emailService } from "@/src/services"

const TIMER_DURATION = 180
const BUTTON_WIDTH = 100

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

interface ForgotPasswordForm {
  email: string
  code: string
}

export function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets()

  const [codeSent, setCodeSent] = useState(false)
  const [codeInputVisible, setCodeInputVisible] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { control, getValues, trigger } = useForm<ForgotPasswordForm>({
    defaultValues: { email: "", code: "" },
    mode: "onChange",
  })

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
    const valid = await trigger("email")
    if (!valid) return
    setSendingCode(true)
    setSendError(null)
    setEmailError(null)
    setCodeInputVisible(true)
    try {
      await emailService.sendVerificationCode(getValues("email"))
      setCodeSent(true)
      setCodeVerified(false)
      startTimer()
    } catch {
      setSendError("인증번호 전송에 실패했습니다. 재전송해 주세요.")
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    const valid = await trigger("code")
    if (!valid) return
    setVerifyingCode(true)
    try {
      const result = await emailService.verifyCode(
        getValues("email"),
        getValues("code"),
      )
      if (result.verified) {
        setCodeVerified(true)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } catch {
      setSendError("인증에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setVerifyingCode(false)
    }
  }

  const canProceed = codeVerified

  return (
    <YStack flex={1} backgroundColor="white" paddingTop={insets.top}>
      {/* Header */}
      <YStack height={56} justifyContent="center">
        <Pressable
          onPress={() => router.back()}
          style={{ position: "absolute", left: 9, padding: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color="#17191C" />
        </Pressable>
      </YStack>

      <YStack flex={1} paddingHorizontal={20} justifyContent="space-between">
        <YStack>
          <Text
            fontSize={22}
            fontWeight="600"
            color="#17191C"
            letterSpacing={-0.44}
            lineHeight={26.4}
            marginBottom={8}
          >
            비밀번호 찾기
          </Text>
          <Text fontSize={15} lineHeight={18} color="#787C83" marginBottom={48}>
            가입한 이메일로 인증번호를 전송해드립니다
          </Text>

          <YStack gap={36}>
            {/* 이메일 필드 */}
            <YStack>
              <XStack gap={8}>
                <YStack flex={1}>
                  <FormTextField<ForgotPasswordForm>
                    name="email"
                    control={control}
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
                    onPress={handleSendCode}
                    disabled={sendingCode || codeVerified}
                  >
                    <YStack
                      backgroundColor={
                        codeVerified || sendingCode ? "#C5C8CE" : "#34D399"
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
              {emailError && (
                <Text
                  fontSize={12}
                  color="#FF3B30"
                  letterSpacing={-0.3}
                  paddingTop={6}
                >
                  {emailError}
                </Text>
              )}
            </YStack>

            {/* 인증번호 필드 */}
            {codeInputVisible && !codeVerified && (
              <YStack>
                <XStack gap={8}>
                  <YStack flex={1}>
                    <FormTextField<ForgotPasswordForm>
                      name="code"
                      control={control}
                      label="인증번호"
                      placeholder="인증번호 6자리를 입력해주세요"
                      inputType="number"
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
                      disabled={verifyingCode || !!sendError}
                    >
                      <YStack
                        backgroundColor={sendError ? "#C5C8CE" : "#34D399"}
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
                    color="#FF3B30"
                    letterSpacing={-0.26}
                    paddingTop={8}
                  >
                    {sendError}
                  </Text>
                )}
                {!sendError && timer > 0 && (
                  <Text
                    fontSize={13}
                    color="#FF3B30"
                    letterSpacing={-0.26}
                    paddingTop={8}
                  >
                    남은 시간 {formatTime(timer)}
                  </Text>
                )}
                {!sendError && timer === 0 && codeSent && (
                  <Text
                    fontSize={13}
                    color="#FF3B30"
                    letterSpacing={-0.26}
                    paddingTop={8}
                  >
                    인증 시간이 만료되었습니다. 재전송해주세요.
                  </Text>
                )}
              </YStack>
            )}

            {codeVerified && (
              <Text
                fontSize={14}
                color="#34C759"
                fontWeight="500"
                letterSpacing={-0.28}
              >
                이메일 인증이 완료되었습니다.
              </Text>
            )}
          </YStack>
        </YStack>

        {/* 다음 단계 버튼 */}
        <YStack paddingBottom={insets.bottom + 24}>
          <Pressable
            onPress={() => router.push("/(auth)/reset-password")}
            disabled={!canProceed}
          >
            <YStack
              backgroundColor={canProceed ? "#34D399" : "#34D39940"}
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
                다음 단계
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </YStack>
  )
}
