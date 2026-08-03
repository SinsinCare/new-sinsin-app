/**
 * 태그·카테고리 칩 한 그룹.
 *
 * ## 색
 * 고른 칩만 브랜드 면(`s.brand`)이고 나머지는 회색 면이다. 기존 `FilterChip` 은
 * 테마마다 다른 코랄·틸을 갖고 있어서 한 화면에 세 그룹을 놓으면 강조가 세 개가 된다
 * (계약 §6.4: 한 화면에 강조는 하나, `safe*` 틸은 레시피에서 쓰지 않는다).
 *
 * ## 안내 문구
 * `notice` 는 병기 태그에 쓴다 — 고른 태그가 카드에 안 나온다는 사실을 고르는 자리에서
 * 말해야 한다(계약 §1.2 로 화면 태그에서 걸러지기 때문이다). 나중에 카드에서 못 찾고
 * "안 저장됐나?" 하게 만들지 않는다.
 *
 * ## 위계
 * 그룹 라벨("음식 종류")은 자기 칩("한식")보다 **커야** 한다. 예전에는 라벨 13 / 칩 15 라
 * 부모가 자식보다 작았고, 세 그룹을 세로로 쌓으면 어디서 갈리는지 읽히지 않았다
 * (실사용 피드백: "분류 제목이 항목보다 작으니 어색"). 라벨을 15/700 으로 올리고
 * 칩 글자를 14 로 내려 한 단계를 확실히 벌린다 — 칩 자체를 키우면 줄이 밀린다.
 */

import { StyleSheet, Text, View, Pressable } from "react-native"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

interface WriteChipGroupProps {
  label: string
  /** 라벨 옆 한 줄(예: "하나만 고를 수 있어요"). */
  hint?: string | null
  /** 그룹 아래 안내(병기 태그의 표시 규칙 등). */
  notice?: string | null
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
}

export function WriteChipGroup({
  label,
  hint,
  notice,
  options,
  selected,
  onToggle,
}: WriteChipGroupProps) {
  const s = useSurface()

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: s.textStrong }]}>{label}</Text>
        {hint ? (
          <Text style={[styles.hint, { color: s.textWeak }]}>{hint}</Text>
        ) : null}
      </View>
      <View style={styles.chips}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value)
          return (
            <Pressable
              key={option.value}
              onPress={() => onToggle(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? s.brand : s.surface,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? s.onBrand : s.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {notice ? (
        <Text style={[styles.notice, { color: s.textMuted }]}>{notice}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  labelRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  label: { ...TYPE.cardTitle, fontWeight: "700" },
  hint: { ...TYPE.caption, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: LAYOUT.chip.height,
    borderRadius: LAYOUT.chip.radius,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { ...TYPE.value, fontSize: 14, fontWeight: "500" },
  notice: { ...TYPE.caption, fontSize: 12, lineHeight: 17 },
})
