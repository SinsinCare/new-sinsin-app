import { useLocalSearchParams } from "expo-router"
import { TermsAgreementScreen } from "@/src/features/auth"

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default function TermsAgreement() {
  const params = useLocalSearchParams<{
    mode?: string | string[]
    socialSignupToken?: string | string[]
    authAttemptId?: string | string[]
  }>()
  const mode = getParamValue(params.mode) === "social" ? "social" : "email"
  const socialSignupToken = getParamValue(params.socialSignupToken)
  const authAttemptId = getParamValue(params.authAttemptId)

  return (
    <TermsAgreementScreen
      mode={mode}
      socialSignupToken={socialSignupToken}
      authAttemptId={authAttemptId}
    />
  )
}
