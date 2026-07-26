import { StyleSheet, Text, View } from "react-native"
import {
  V2LoadingState,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { getEmailOtpVerificationStatus } from "../data/emailVerificationState"

type OtpVerificationStatusProps = {
  codeSent: boolean
  error: string | null
  formattedTime: string
  loading: boolean
  timer: number
  verified: boolean
}

/** Auth-level status text for the V2 OTP field composition. */
export function OtpVerificationStatus({
  codeSent,
  error,
  formattedTime,
  loading,
  timer,
  verified,
}: OtpVerificationStatusProps) {
  const { colors } = useV2Theme()
  const status = getEmailOtpVerificationStatus({
    codeSent,
    timer,
    error,
    verified,
  })

  if (loading) {
    return (
      <V2LoadingState
        size="small"
        message="인증 요청을 처리하고 있어요."
        style={styles.loading}
      />
    )
  }

  if (status === "idle") return null

  const message =
    status === "verified"
      ? "인증이 완료되었습니다. 다음을 눌러 진행해주세요."
      : status === "expired"
        ? "인증 시간이 만료되었습니다. 재전송해주세요."
        : status === "active"
          ? `남은 시간 ${formattedTime}`
          : error

  const color =
    status === "verified"
      ? colors.primary.primary
      : status === "active"
        ? colors.label.alternative
        : colors.status.negative

  return (
    <View accessibilityLiveRegion="polite">
      <Text style={[typography.subtext.medium, styles.message, { color }]}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: { alignItems: "flex-start", padding: 0 },
  message: { marginTop: spacing[8] },
})
