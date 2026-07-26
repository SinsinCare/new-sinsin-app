import { StyleSheet, View } from "react-native"
import type { Control, FieldValues, Path } from "react-hook-form"
import { V2Button, spacing } from "@/src/design-system-v2"
import { V2AuthFormTextField } from "./V2AuthFormTextField"

type EmailOtpFieldGroupProps<T extends FieldValues> = {
  control: Control<T>
  emailName: Path<T>
  codeName: Path<T>
  codeInputVisible: boolean
  codeSent: boolean
  verified: boolean
  sendingCode: boolean
  verifyingCode: boolean
  canVerify: boolean
  onSendCode: () => void
  onVerifyCode: () => void
}

/**
 * Shared auth-owned composition for email OTP flows. It deliberately keeps
 * field ownership with react-hook-form while rendering through the V2 system.
 */
export function EmailOtpFieldGroup<T extends FieldValues>({
  control,
  emailName,
  codeName,
  codeInputVisible,
  codeSent,
  verified,
  sendingCode,
  verifyingCode,
  canVerify,
  onSendCode,
  onVerifyCode,
}: EmailOtpFieldGroupProps<T>) {
  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <V2AuthFormTextField<T>
          name={emailName}
          control={control}
          label="이메일"
          placeholder="이메일 주소를 입력해주세요"
          inputType="email"
          autoFocus
          autoComplete="email"
          textContentType="emailAddress"
          accessibilityLabel="이메일 주소"
          disabled={sendingCode || verifyingCode}
          style={styles.field}
          rules={{
            required: "이메일을 입력해주세요.",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "올바른 이메일 형식이 아닙니다.",
            },
          }}
        />
        <V2Button
          size="m"
          color="brand"
          disabled={verified || verifyingCode}
          loading={sendingCode}
          onPress={onSendCode}
          accessibilityLabel={codeSent ? "인증번호 재전송" : "인증번호 전송"}
        >
          {codeSent ? "재전송" : "인증번호 전송"}
        </V2Button>
      </View>

      {codeInputVisible && !verified ? (
        <View style={styles.row}>
          <V2AuthFormTextField<T>
            name={codeName}
            control={control}
            label="인증번호"
            placeholder="인증번호 6자리를 입력해주세요"
            inputType="number"
            autoFocus
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            accessibilityLabel="인증번호"
            maxLength={6}
            style={styles.field}
            rules={{
              required: "인증번호를 입력해주세요.",
              minLength: {
                value: 6,
                message: "인증번호 6자리를 입력해주세요.",
              },
            }}
          />
          <V2Button
            size="m"
            color="brand"
            disabled={!canVerify || sendingCode}
            loading={verifyingCode}
            onPress={onVerifyCode}
            accessibilityLabel="인증번호 확인"
          >
            확인
          </V2Button>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: spacing[16] },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing[8] },
  field: { flex: 1 },
})
