/**
 * **`더보기` 필** — `댓글 더보기` · `게시글 더보기` · `인기글 더보기` · `더보기`.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.7 · `detail-drag.md` §4.6 (WBS 1.4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 폭은 박지 않는다
 *
 * 시안은 100 / 111 / 74 세 폭을 그렸지만 그건 **카피 길이의 결과**다. 폭을 상수로 박으면
 * 번역(en)에서 글자가 잘리거나 필 안이 텅 빈다. 가로 여백 12 + 라벨↔아이콘 4 + chevron 16
 * 이면 실측 잉크폭(57.1 / 68.9)에서 101 / 113 이 나온다 — 1~2px 차이이고, 그 차이는
 * 스페이싱 사다리에 11·13 이 없어서 생긴 것이다(`spacing.ts` 머리말: 원오프는 인접 토큰으로 스냅).
 *
 * ■ 위·아래 여백 16 은 이 컴포넌트가 갖는다
 *
 * 필은 언제나 목록 **뒤에 혼자** 놓이고, 그 여백을 부모가 갖게 하면 목록마다 값이 갈린다.
 */
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import { V2Icon } from "@/src/design-system-v2/components/V2Icon"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { borderWidth, controlHeight } from "@/src/design-system-v2/tokens/size"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

export type MorePillProps = {
  /** `t()` 로 만든 카피. 13 Medium(`label.xSmallWeak`). */
  label: string
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export function MorePill({ label, onPress, style }: MorePillProps) {
  const { colors } = useV2Theme()

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: pressed
              ? colors.fill.normal
              : colors.background.default,
            borderColor: colors.line.normal,
          },
        ]}
      >
        <V2Text token="label.xSmallWeak" color={colors.label.neutral}>
          {label}
        </V2Text>
        <V2Icon name="chevronRight" size="xs" color={colors.label.neutral} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginVertical: spacing[16],
  },
  pill: {
    height: controlHeight.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingHorizontal: spacing[12],
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
})
