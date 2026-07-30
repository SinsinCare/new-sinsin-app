import { StyleSheet, Text, View } from "react-native"
import RNToast, {
  type ToastConfig,
  type ToastConfigParams,
} from "react-native-toast-message"
import Ionicons from "@expo/vector-icons/Ionicons"

/**
 * 토스식 토스트 — 어두운 필 하나가 하단에 뜬다. 상단의 옅은 색 배너는
 * 시스템 알림처럼 읽히고 내비게이션 영역을 가린다.
 *
 * 제목(text1)만 크게 외치던 걸 고쳐 본문(text2)을 함께 그린다 —
 * 에러 메시지의 역할은 "실패했다"가 아니라 "다음에 뭘 하면 되는지"다.
 */
function ToastBase({
  text1,
  text2,
  icon,
  iconColor,
}: ToastConfigParams<unknown> & {
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
}) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={20} color={iconColor} style={styles.icon} />
      <View style={styles.texts}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  )
}

const toastConfig: ToastConfig = {
  error: (props) => (
    <ToastBase {...props} icon="alert-circle" iconColor="#FF6B5E" />
  ),
  success: (props) => (
    <ToastBase {...props} icon="checkmark-circle" iconColor="#34D399" />
  ),
  info: (props) => (
    <ToastBase {...props} icon="information-circle" iconColor="#9DA0A8" />
  ),
}

export function Toast() {
  return (
    <RNToast
      config={toastConfig}
      position="bottom"
      bottomOffset={48}
      visibilityTime={3500}
    />
  )
}

const styles = StyleSheet.create({
  // 라이트/다크 공용 다크 카드. 본문 위 어디에 떠도 한 가지 얼굴로 읽힌다.
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(28,29,34,0.96)",
    gap: 10,
  },
  icon: { flexShrink: 0 },
  texts: { flexShrink: 1 },
  title: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
  },
  message: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    marginTop: 2,
  },
})
