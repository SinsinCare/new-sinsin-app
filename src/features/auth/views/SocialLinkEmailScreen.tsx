import { useEffect, useRef, useState } from "react"
import { Keyboard, Pressable } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useForm } from "react-hook-form"
import { Text, XStack, YStack } from "tamagui"
import { FormTextField } from "@/src/shared/components"
import { useAuth } from "@/src/hooks/useAuth"
import { showErrorToast } from "@/src/lib/toast"
import { tokens } from "@/src/theme/tokens"
import {
  getDestinationForAccountState,
  type AuthDestination,
} from "../utils/accountStateRoute"
import { AuthScreenLayout } from "./AuthScreenLayout"
import type { EmailForm } from "../types"
import type { SocialProvider } from "@/src/types"

const BUTTON_WIDTH = 100
const TIMER_DURATION = 180
const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: "Google",
  apple: "Apple",
  kakao: "카카오",
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

function isSocialProvider(value: unknown): value is SocialProvider {
  return value === "google" || value === "apple" || value === "kakao"
}

export function SocialLinkEmailScreen() {
  const { provider, socialLinkToken } = useLocalSearchParams<{
    provider?: string
    socialLinkToken?: string
  }>()
  const { sendSocialLinkEmailCode, verifySocialLinkEmailCode } = useAuth()

  const [codeSent, setCodeSent] = useState(false)
  const [codeInputVisible, setCodeInputVisible] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [timer, setTimer] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)
  const [nextRoute, setNextRoute] = useState<AuthDestination>("/onboarding")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const providerValue = isSocialProvider(provider) ? provider : null
  const tokenValue =
    typeof socialLinkToken === "string" && socialLinkToken.length > 0
      ? socialLinkToken
      : null
  const providerLabel = providerValue ? PROVIDER_LABELS[providerValue] : "소셜"

  const { control, getValues, trigger } = useForm<EmailForm>({
    defaultValues: { email: "", code: "" },
    mode: "onChange",
  })

  useEffect(() => {
    if (!providerValue || !tokenValue) {
      showErrorToast(
        "소셜 로그인 연결 정보가 만료되었습니다. 다시 시도해주세요.",
      )
      router.replace("/(auth)/login")
    }
  }, [providerValue, tokenValue])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startTimer = () => {
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
  }

  const handleSendCode = async () => {
    if (!tokenValue) return
    const valid = await trigger("email")
    if (!valid) return
    Keyboard.dismiss()
    setSendingCode(true)
    setSendError(null)
    setVerificationComplete(false)
    try {
      await sendSocialLinkEmailCode(tokenValue, getValues("email"))
      setCodeSent(true)
      setCodeInputVisible(true)
      startTimer()
    } catch (error) {
      if (!codeSent) setCodeInputVisible(false)
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
    if (!tokenValue) return
    const valid = await trigger("code")
    if (!valid) return
    Keyboard.dismiss()
    setVerifyingCode(true)
    setSendError(null)
    setVerificationComplete(false)
    try {
      const result = await verifySocialLinkEmailCode(
        tokenValue,
        getValues("email"),
        getValues("code"),
      )
      if (timerRef.current) clearInterval(timerRef.current)
      setTimer(0)
      setNextRoute(
        getDestinationForAccountState(
          result.accountState,
          result.requiresAdditionalInfo,
        ),
      )
      setVerificationComplete(true)
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

  const formattedTime = formatTime(timer)

  return (
    <AuthScreenLayout
      title={`${providerLabel} 로그인 계정을\n연결할 이메일을 입력해주세요`}
      subtitle={`입력한 이메일을 기준으로 계정이 생성됩니다. 이미 같은 이메일 계정이 있으면 해당 계정에 ${providerLabel} 로그인을 연결합니다.`}
      buttonLabel={verificationComplete ? "다음" : "로그인 화면으로"}
      onSubmit={() =>
        verificationComplete
          ? router.replace(nextRoute)
          : router.replace("/(auth)/login")
      }
    >
      <YStack gap={36} marginTop={48}>
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
                showValidState
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
              <Pressable onPress={handleSendCode} disabled={sendingCode}>
                <YStack
                  backgroundColor={
                    sendingCode ? tokens.color.grey7.val : tokens.color.sub6.val
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
                    {codeSent ? "재전송" : "인증번호 전송"}
                  </Text>
                </YStack>
              </Pressable>
            </YStack>
          </XStack>
          {sendError && !codeInputVisible && (
            <Text
              fontSize={13}
              color={tokens.color.error.val}
              letterSpacing={-0.26}
              paddingTop={8}
            >
              {sendError}
            </Text>
          )}
        </YStack>

        {codeInputVisible && (
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
                  maxLength={6}
                  showValidState
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
                  disabled={verifyingCode || verificationComplete}
                >
                  <YStack
                    backgroundColor={
                      verifyingCode || verificationComplete
                        ? tokens.color.grey7.val
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
                      {verificationComplete ? "완료" : "확인"}
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
            {verificationComplete && (
              <Text
                fontSize={13}
                color={tokens.color.sub6.val}
                letterSpacing={-0.26}
                paddingTop={8}
              >
                인증이 완료되었습니다. 다음을 눌러 진행해주세요.
              </Text>
            )}
            {!verificationComplete && !sendError && timer > 0 && (
              <Text
                fontSize={13}
                color={tokens.color.error.val}
                letterSpacing={-0.26}
                paddingTop={8}
              >
                남은 시간 {formattedTime}
              </Text>
            )}
            {!verificationComplete && !sendError && timer === 0 && codeSent && (
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
    </AuthScreenLayout>
  )
}
