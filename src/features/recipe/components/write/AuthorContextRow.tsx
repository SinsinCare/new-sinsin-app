/**
 * "내 기준(CKD 5기 · 당뇨 동반)으로 적었어요" — 프로필에서 파생한 태그를 한 번에
 * 켜고 끄는 체크 행. 값(서버로 가는 태그)과 문구(화면)는 다른 축이라 호출부가
 * `labelKey` 를 거쳐 문장을 만든다.
 *
 * 선택 규칙은 키트 칩(`RecordChoice`)과 같다 — **중성 바탕 + 진한 테두리**.
 * 오렌지 틴트 바탕은 쓰지 않는다.
 */

import { StyleSheet, View, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { recordFieldLabel } from "@/src/features/home/components/record/pages/recordInk"
import {
  FORM,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"

interface AuthorContextRowProps {
  label: string
  notice?: string | null
  selected: boolean
  onToggle: () => void
}

export function AuthorContextRow({
  label,
  notice,
  selected,
  onToggle,
}: AuthorContextRowProps) {
  const s = useSurface()
  return (
    <View style={styles.group}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? s.surfacePressed : s.surfaceSunken,
            borderColor: selected ? s.textStrong : s.surfaceSunken,
          },
        ]}
      >
        <Ionicons
          name={selected ? "checkbox" : "square-outline"}
          size={20}
          color={selected ? s.textStrong : s.textWeak}
        />
        <V2Text
          style={styles.label}
          color={selected ? s.textStrong : recordFieldLabel(s)}
          lineBreakStrategyIOS="hangul-word"
        >
          {label}
        </V2Text>
      </Pressable>
      {notice ? (
        <V2Text style={styles.hint} color={s.text}>
          {notice}
        </V2Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: FORM.labelGap },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
    minHeight: FORM.choiceHeight,
    paddingHorizontal: S[3],
    paddingVertical: S[3],
    borderRadius: FORM.choiceRadius,
    borderWidth: 1,
  },
  label: { ...FORM.option, flex: 1 },
  hint: FORM.hint,
})
