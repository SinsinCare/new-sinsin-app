import { YStack, Text } from "tamagui"
import { useForm } from "react-hook-form"
import { FormTextField } from "@/src/shared/components"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { useNicknameSetup } from "../hooks"
import type { NicknameForm } from "../types"

export function NicknameSetupScreen() {
  const { isLoading, error, handleSubmit: submitNickname } = useNicknameSetup()

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<NicknameForm>({
    defaultValues: { nickname: "" },
    mode: "onChange",
  })

  return (
    <AuthScreenLayout
      title="닉네임을 설정해주세요."
      subtitle="한글, 영문, 숫자만 사용 가능 (2~8자)"
      buttonLabel="다음 단계"
      buttonDisabled={!isValid}
      buttonLoading={isLoading}
      onSubmit={handleSubmit(submitNickname)}
    >
      <YStack marginTop={56}>
        <FormTextField<NicknameForm>
          name="nickname"
          control={control}
          label="닉네임"
          placeholder="닉네임을 입력해주세요"
          rules={{
            required: "닉네임을 입력해주세요.",
            minLength: {
              value: 2,
              message: "닉네임은 2자 이상이어야 합니다.",
            },
            maxLength: {
              value: 8,
              message: "닉네임은 8자 이하여야 합니다.",
            },
            pattern: {
              value: /^[가-힣a-zA-Z0-9]+$/,
              message: "한글, 영문, 숫자만 사용 가능합니다.",
            },
          }}
        />

        {error ? (
          <Text
            fontSize={14}
            color="#FF3B30"
            letterSpacing={-0.28}
            marginTop={8}
          >
            {error}
          </Text>
        ) : null}
      </YStack>
    </AuthScreenLayout>
  )
}
