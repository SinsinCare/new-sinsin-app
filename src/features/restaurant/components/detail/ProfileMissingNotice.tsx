import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * "프로필을 설정하면 내 기준으로 볼 수 있어요" 유도. 서버가 `profileMissing: true` 를
 * 준 순간에만 뜬다.
 *
 * ## 이것이 배지를 대신한다
 *
 * 프로필(신장 단계·투석 여부·하루 목표)이 없으면 `foodVerdict` 가 판정할 기준이 없어
 * 모든 메뉴가 `UNKNOWN` 으로 온다. 그때 초록 `안전` 배지를 그리면 신장 환자에게
 * 가장 위험한 방향의 거짓말이 된다. 그래서 배지를 **감추고** 이 안내로 자리를 바꾼다.
 * 회색 `정보 없음` 배지를 메뉴마다 다섯 개 세로로 세우는 것도 답이 아니다 —
 * 사용자가 할 수 있는 일(프로필 입력)을 한 번만 말하는 것이 맞다.
 *
 * 목적지는 실재하는 라우트다(`/kidney-profile-edit`). 눌러도 아무 일 없는 버튼을
 * 만들지 않기 위해 라우팅을 이 컴포넌트가 직접 들고 있다.
 */

import { Pressable, StyleSheet, View, type ViewStyle } from "react-native"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  radius,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"

export interface ProfileMissingNoticeProps {
  style?: ViewStyle
}

export function ProfileMissingNotice({ style }: ProfileMissingNoticeProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const router = useAppRouter()

  return (
    <Pressable
      onPress={() => router.push("/kidney-profile-edit")}
      accessibilityRole="button"
      accessibilityState={{ disabled: false }}
      accessibilityLabel={t("restaurant.safety.profileMissingAction")}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.primary.primaryWeak },
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.texts}>
        <Text
          style={[typography.label.small, { color: colors.primary.primary }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("restaurant.safety.profileMissingTitle")}
        </Text>
        <Text
          style={[typography.subtext.medium, { color: colors.label.neutral }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("restaurant.safety.profileMissingBody")}
        </Text>
      </View>
      <V2Icon
        name="chevronRight"
        size={iconSize.sm}
        color={colors.primary.primary}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[16],
    borderRadius: radius.lg,
  },
  texts: { flex: 1, gap: spacing[4] },
  // 카드형 누름 피드백.
  pressed: { opacity: 0.9 },
})
