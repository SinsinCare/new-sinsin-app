import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { useTranslation } from "react-i18next"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_TYPE } from "../data/authSurface"

interface ResendCodeLinkProps {
  onPress: () => void
  disabled?: boolean
}

/**
 * 인증번호 재전송. 화면의 주 액션은 하단 CTA 하나뿐이라 재전송은 버튼이 아니라
 * 회색 텍스트 링크로 낮춰 잡는다 — 토스식 위계: 면을 차지하는 건 CTA 뿐이다.
 */
export function ResendCodeLink({ onPress, disabled }: ResendCodeLinkProps) {
  const surface = useAuthSurface()
  const { t } = useTranslation("auth")
  return (
    <View style={styles.row}>
      <Text
        style={[styles.hint, { color: surface.textWeak }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("emailVerification.resendPrompt")}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("emailVerification.resendA11y")}
        onPress={onPress}
        disabled={disabled}
        hitSlop={10}
      >
        <Text
          style={[
            styles.link,
            { color: disabled ? surface.textWeak : surface.text },
          ]}
        >
          {t("emailVerification.resend")}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  hint: AUTH_TYPE.helper,
  link: {
    ...AUTH_TYPE.helper,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
})
