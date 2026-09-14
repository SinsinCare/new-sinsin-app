import { Pressable, StyleSheet, View } from "react-native"

import { V2Icon, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { FORM, MIN, S } from "./recordPageSpec"

export const RECORD_RATING_MAX = 5
const STAR_ICON = 36

/**
 * 별점 — 별 다섯 개를 탭한다(2026-09-12). 후기 화면 둘(식당·레시피)이 같이 쓴다.
 *
 * 예전엔 `RecordChoices` 로 "1점 · 2점 · … · 5점" 칸을 나열했다. 수치를 선택지 버튼으로
 * 펼치는 건 숫자의 순서·크기 감각을 버리는 일이라, 배민·쿠팡·당근 후기가 전부 별 행인
 * 이유가 있다. 채운 별은 `brand`, 빈 별은 `textWeak`. 고른 점수의 말(`words`)이 아래 한 줄로
 * 따라온다 — 별만으로는 3점이 "괜찮다" 인지 "별로" 인지 사람마다 다르게 읽는다.
 *
 * 접근성: 행 하나가 `adjustable` 이라 스와이프로 올리고 내리고, 별 하나하나도 버튼이다.
 */
export function RecordRating({
  value,
  onChange,
  disabled = false,
  words,
  starLabel,
  emptyWord,
}: {
  /** 0 이면 아직 안 고름. */
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  /** 점수별 말(1~5). 없으면 말 줄을 그리지 않는다. */
  words?: Record<number, string>
  /** 별 하나의 접근성 라벨 — "3점 주기". */
  starLabel: (star: number) => string
  /** 아직 안 골랐을 때 말 줄 자리에 둘 문구(자리 유지용). */
  emptyWord?: string
}) {
  const s = useSurface()
  const stars = Array.from({ length: RECORD_RATING_MAX }, (_, i) => i + 1)
  const word = value > 0 ? words?.[value] : emptyWord

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 0,
        max: RECORD_RATING_MAX,
        now: value,
        text: value > 0 ? starLabel(value) : undefined,
      }}
      accessibilityState={{ disabled }}
      onAccessibilityAction={(event) => {
        if (disabled) return
        if (event.nativeEvent.actionName === "increment")
          onChange(Math.min(RECORD_RATING_MAX, value + 1))
        if (event.nativeEvent.actionName === "decrement")
          onChange(Math.max(1, value - 1))
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
    >
      <View style={styles.row}>
        {stars.map((star) => {
          const filled = star <= value
          return (
            <Pressable
              key={star}
              disabled={disabled}
              onPress={() => onChange(star)}
              accessibilityRole="button"
              accessibilityLabel={starLabel(star)}
              accessibilityState={{ selected: filled, disabled }}
              style={({ pressed }) => [
                styles.star,
                { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
              ]}
            >
              <V2Icon
                name={filled ? "starFilled" : "star"}
                size={STAR_ICON}
                color={filled ? s.brand : s.textWeak}
              />
            </Pressable>
          )
        })}
      </View>
      {words || emptyWord ? (
        <V2Text
          style={styles.word}
          color={value > 0 ? s.textStrong : s.textMuted}
          accessibilityLiveRegion="polite"
        >
          {word ?? " "}
        </V2Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  /* 별 사이 8(44 상자라 시각 간격은 그보다 넓다), 별 줄과 말 줄은 12. 왼쪽 별은 PAGE_X 정렬선에서 (44-36)/2 안쪽 — 그만큼 당겨 맞춘다. */
  wrap: { gap: S[3] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
    marginLeft: -(MIN.TOUCH - STAR_ICON) / 2,
  },
  star: {
    width: MIN.TOUCH,
    height: MIN.TOUCH,
    alignItems: "center",
    justifyContent: "center",
  },
  word: FORM.body,
})
