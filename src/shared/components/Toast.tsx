import { Pressable, StyleSheet, Text, View } from "react-native"
import RNToast, {
  type ToastConfig,
  type ToastConfigParams,
} from "react-native-toast-message"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Ionicons from "@expo/vector-icons/Ionicons"
import type { ToastProps } from "@/src/lib/toast"
import { aboveTabBarSpace } from "@/src/shared/utils/bottomSafeArea"

/**
 * 토스식 토스트 — 어두운 필 하나가 하단에 뜬다. 상단의 옅은 색 배너는
 * 시스템 알림처럼 읽히고 내비게이션 영역을 가린다.
 *
 * 제목(text1)만 크게 외치던 걸 고쳐 본문(text2)을 함께 그린다 —
 * 에러 메시지의 역할은 "실패했다"가 아니라 "다음에 뭘 하면 되는지"다.
 *
 * 그리고 그 "다음"이 한 번의 탭으로 끝나는 일이라면 **버튼으로 준다**. "로그인해
 * 주세요" 를 읽고 사용자가 스스로 로그인 화면을 찾아가게 하는 것과, 여기서 바로
 * 누르게 하는 것의 차이다.
 *
 * ## 버튼이 글줄 옆이 아니라 아래에 있는 이유
 *
 * 처음에는 텍스트와 버튼을 한 줄에 나란히 놓았다. 그러면 본문이 쓸 수 있는 폭이
 * 390pt 화면에서 284pt → **198pt** 로 줄어든다. 13pt 한글 기준 한 줄 21자가 15자가
 * 되고, 두 줄이면 끝나던 안내가 세 줄로 늘면서 **어절이 줄 끝에서 잘리는 자리가
 * 늘어난다.** 좁은 단이 만드는 들쭉날쭉한 오른쪽 끝이 한글에서는 특히 읽기 나쁘다.
 *
 * 버튼을 아래 줄로 내리면 글줄은 폭을 그대로 쓰고, 카드 높이는 대개 같거나 낮다.
 *
 * ## 줄바꿈
 *
 * `lineBreakStrategyIOS="hangul-word"` + `textBreakStrategy="balanced"` 는 이 앱의
 * 본문 텍스트 규약이다(설정·마이페이지 화면들이 이미 쓴다). 없으면 iOS 가 어절
 * 중간에서 끊는다 — `인증번호를 보낼 수 없어` / `요` 같은 줄이 실제로 나온다.
 * 오류 문구는 한 번 읽고 바로 행동해야 하는 글이라 여기서 특히 중요하다.
 */
function ToastBase({
  text1,
  text2,
  props,
  icon,
  iconColor,
}: ToastConfigParams<ToastProps> & {
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
}) {
  const action = props?.action
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name={icon} size={20} color={iconColor} style={styles.icon} />
        <View style={styles.texts}>
          {text1 ? (
            <Text
              style={styles.title}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
              numberOfLines={2}
            >
              {text1}
            </Text>
          ) : null}
          {text2 ? (
            <Text
              style={styles.message}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
              // 해결 방법이 잘리면 토스트가 하는 일이 없어진다. 넉넉히 두고,
              // 문구 길이는 `errors.json` 쪽에서 짧게 유지한다(최장 48자).
              numberOfLines={4}
            >
              {text2}
            </Text>
          ) : null}
        </View>
      </View>
      {action ? (
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              RNToast.hide()
              action.onPress()
            }}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [
              styles.action,
              pressed && styles.actionPressed,
            ]}
          >
            <Text style={styles.actionLabel} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

const toastConfig: ToastConfig = {
  error: (props) => (
    <ToastBase
      {...(props as ToastConfigParams<ToastProps>)}
      icon="alert-circle"
      iconColor="#FF6B5E"
    />
  ),
  success: (props) => (
    <ToastBase
      {...(props as ToastConfigParams<ToastProps>)}
      icon="checkmark-circle"
      iconColor="#34D399"
    />
  ),
  info: (props) => (
    <ToastBase
      {...(props as ToastConfigParams<ToastProps>)}
      icon="information-circle"
      iconColor="#9DA0A8"
    />
  ),
}

export function Toast() {
  const insets = useSafeAreaInsets()
  return (
    <RNToast
      config={toastConfig}
      position="bottom"
      /*
        하단 오프셋은 `bottomSafeArea` 의 탭바-위 규칙 하나에서 온다. 예전 상수 48 은
        홈 인디케이터(34pt)를 뺀 나머지가 14pt 뿐이라 **탭바(49pt)를 정확히 덮었다** —
        토스트가 내비게이션을 가리면 통보가 방해가 된다(실측 2026-08-05, 지도 화면).
        탭바가 없는 화면에서는 그만큼 위에 뜨는데, 토스트는 어차피 화면 아래 모서리가
        아니라 살짝 떠 있는 것이 정상 위치라 한 가지 규칙으로 통일한다.
      */
      bottomOffset={aboveTabBarSpace(insets.bottom)}
      visibilityTime={3500}
    />
  )
}

/** 아이콘 폭(20) + 아이콘과 글줄 사이(10). 버튼 줄을 글줄에 맞춰 들여쓸 때 쓴다. */
const TEXT_INDENT = 30

const styles = StyleSheet.create({
  // 라이트/다크 공용 다크 카드. 본문 위 어디에 떠도 한 가지 얼굴로 읽힌다.
  card: {
    marginHorizontal: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(28,29,34,0.96)",
  },
  // 아이콘은 제목 첫 줄에 맞춘다. 두세 줄짜리 안내에서 가운데 정렬하면
  // 아이콘이 본문 옆으로 내려가 제목과의 관계가 끊긴다.
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  icon: { flexShrink: 0, marginTop: 1 },
  texts: { flexShrink: 1, flexGrow: 1 },
  // 위계: 제목은 굵기(600)와 완전 불투명한 흰색으로, 본문은 크기(-2)와
  // 투명도(0.7)로 내린다. 크기만으로 나누면 어두운 배경에서 둘 다 강해 보인다.
  title: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
  },
  message: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 13,
    // 두세 줄이 되는 안내라 줄 사이를 18 → 19 로 벌린다.
    lineHeight: 19,
    letterSpacing: -0.26,
    fontWeight: "400",
    marginTop: 3,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    marginLeft: TEXT_INDENT,
  },
  // 어두운 필 위의 버튼이라 테두리 없이 옅은 면으로만 구분한다.
  action: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  actionPressed: { backgroundColor: "rgba(255,255,255,0.24)" },
  actionLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "600",
  },
})
