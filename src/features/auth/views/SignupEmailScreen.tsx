import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { useForm } from "react-hook-form"
import { FormTextField } from "@/src/shared/components"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { useSignupEmail } from "../hooks"
import type { EmailForm } from "../types"
import { tokens } from "@/src/theme/tokens"

const BUTTON_WIDTH = 100

export function SignupEmailScreen() {
  const {
    codeSent,
    codeInputVisible,
    emailError,
    sendError,
    codeVerified,
    timer,
    formattedTime,
    sendingCode,
    verifyingCode,
    sendCode,
    verifyCode,
    handleNext,
  } = useSignupEmail()

  const { control, getValues, trigger } = useForm<EmailForm>({
    defaultValues: { email: "", code: "" },
    mode: "onChange",
  })

  const handleSendCode = async () => {
    const valid = await trigger("email")
    if (!valid) return
    await sendCode(getValues("email"))
  }

  const handleVerifyCode = async () => {
    const valid = await trigger("code")
    if (!valid) return
    const { email, code } = getValues()
    await verifyCode(email, code)
  }

  const onNext = () => {
    handleNext(getValues("email"))
  }

  return (
    <AuthScreenLayout
      title="이메일을 입력해주세요"
      subtitle="이미 가입된 이메일로는 회원가입 할 수 없습니다"
      buttonLabel="다음 단계"
      buttonDisabled={!codeVerified}
      onSubmit={onNext}
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
                    codeVerified || sendingCode ? tokens.color.grey7.val : tokens.color.sub6.val
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
          {emailError && (
            <Text
              fontSize={12}
              color={tokens.color.error.val}
              letterSpacing={-0.3}
              paddingTop={6}
            >
              {emailError}
            </Text>
          )}
        </YStack>

        {codeInputVisible && !codeVerified && (
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
                    backgroundColor={sendError ? tokens.color.grey7.val : tokens.color.sub6.val}
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
                남은 시간 {formattedTime}
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

        {codeVerified && (
          <Text
            fontSize={14}
            color={tokens.color.sub8.val}
            fontWeight="500"
            letterSpacing={-0.28}
          >
            이메일 인증이 완료되었습니다.
          </Text>
        )}
      </YStack>
    </AuthScreenLayout>
  )
}
