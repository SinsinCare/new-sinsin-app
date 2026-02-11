import { useState, useEffect, useCallback, useRef } from "react"
import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useForm } from "react-hook-form"
import { Ionicons } from "@expo/vector-icons"
import { FormTextField } from "../../src/shared/components"
import { emailService } from "../../src/services/emailService"
import { useSignupStore } from "../../src/stores/signupStore"

interface EmailForm {
  email: string
  code: string
}

const TIMER_DURATION = 180
const BUTTON_WIDTH = 100

export default function SignupEmailScreen() {
  const insets = useSafeAreaInsets()
  const setSignupEmail = useSignupStore((s) => s.setEmail)

  const [codeSent, setCodeSent] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [timer, setTimer] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { control, getValues, trigger } = useForm<EmailForm>({
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleSendCode = async () => {
    const valid = await trigger("email")
    if (!valid) return

    const email = getValues("email")
    setSendingCode(true)
    try {
      const available = await emailService.checkEmailAvailability(email)
      if (!available) {
        // TODO: 이미 가입된 이메일 에러 표시
        return
      }
      await emailService.sendVerificationCode(email)
      setCodeSent(true)
      setCodeVerified(false)
      startTimer()
    } catch {
      // TODO: 에러 처리
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    const valid = await trigger("code")
    if (!valid) return

    const { email, code } = getValues()
    setVerifyingCode(true)
    try {
      const verified = await emailService.verifyCode(email, code)
      if (verified) {
        setCodeVerified(true)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } catch {
      // TODO: 에러 처리
    } finally {
      setVerifyingCode(false)
    }
  }

  const handleNext = () => {
    const email = getValues("email")
    setSignupEmail(email)
    router.push("/(auth)/signup-password")
  }

  return (
    <YStack flex={1} backgroundColor="white" paddingTop={insets.top}>
      {/* Top Navigation */}
      <YStack height={56} justifyContent="center">
        <Pressable
          onPress={() => router.back()}
          style={{ position: "absolute", left: 9, padding: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color="#17191C" />
        </Pressable>
      </YStack>

      {/* Content */}
      <YStack flex={1} paddingHorizontal={20} justifyContent="space-between">
        <YStack gap={48}>
          <Text
            fontSize={22}
            fontWeight="600"
            color="#17191C"
            letterSpacing={-0.44}
            lineHeight={26.4}
          >
            이메일 인증
          </Text>

          <YStack gap={36}>
            {/* 이메일 입력 + 인증번호 전송 */}
            <YStack>
              <XStack gap={8}>
                <YStack flex={1}>
                  <FormTextField<EmailForm>
                    name="email"
                    control={control}
                    label="이메일"
                    placeholder="이메일 주소를 입력해주세요"
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
                <YStack width={BUTTON_WIDTH} justifyContent="flex-end">
                  <Pressable
                    onPress={handleSendCode}
                    disabled={sendingCode || codeVerified}
                  >
                    <YStack
                      backgroundColor={codeVerified ? "#C5C8CE" : "#5464F2"}
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
                        {codeSent ? "재전송" : "인증번호 전송"}
                      </Text>
                    </YStack>
                  </Pressable>
                </YStack>
              </XStack>
            </YStack>

            {/* 인증번호 입력 + 확인 */}
            {codeSent && !codeVerified && (
              <YStack>
                <XStack gap={8}>
                  <YStack flex={1}>
                    <FormTextField<EmailForm>
                      name="code"
                      control={control}
                      label="인증번호"
                      placeholder="인증번호 6자리를 입력해주세요"
                      inputType="number"
                      autoFocus
                      rules={{
                        required: "인증번호를 입력해주세요.",
                        minLength: {
                          value: 6,
                          message: "인증번호 6자리를 입력해주세요.",
                        },
                      }}
                    />
                  </YStack>
                  <YStack width={BUTTON_WIDTH} justifyContent="flex-end">
                    <Pressable
                      onPress={handleVerifyCode}
                      disabled={verifyingCode}
                    >
                      <YStack
                        backgroundColor="#5464F2"
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
                {/* Timer */}
                {timer > 0 && (
                  <Text
                    fontSize={13}
                    color="#FF3B30"
                    letterSpacing={-0.26}
                    paddingTop={8}
                  >
                    남은 시간 {formatTime(timer)}
                  </Text>
                )}
                {timer === 0 && codeSent && (
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

            {/* 인증 완료 메시지 */}
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
          <Pressable onPress={handleNext} disabled={!codeVerified}>
            <YStack
              backgroundColor={codeVerified ? "#5464F2" : "#5464F247"}
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
