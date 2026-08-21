/**
 * 접힌 `조리 순서` 칸. 눌리면 `StepSheet` 이 열린다.
 *
 * ## 왜 `TextInput` 이 아니라 `Pressable` 인가
 * 이 칸에는 아무것도 입력하지 않는다. 시안은 다른 입력 칸과 **똑같이 생긴 상자**를
 * 그려 놨는데, 진짜 `TextInput` 을 두면 두 가지가 깨진다. 첫째, 탭하는 순간 키패드가
 * 올라오고 그 위로 시트가 겹쳐 뜬다(같은 손짓에 두 가지가 반응한다). 둘째,
 * 스크린 리더가 "텍스트 입력" 이라고 읽어서, 실제로는 목록을 여는 버튼인 것을
 * 숨긴다. 생김새를 맞추는 것과 역할을 속이는 것은 다르다 — 여기서는 `Pressable` 에
 * `accessibilityRole="button"` 을 주고 상자만 같은 규격으로 그린다.
 *
 * ## 왜 요약이 "입력되었습니다" 가 아닌가
 * 이 화면에는 원래 조리순서 바텀시트가 있었고, 시트를 닫으면 폼에는 "조리 순서가
 * 입력되었습니다" 만 남았다. 그래서 등록 직전에 **무엇이 올라가는지 볼 수 없었고**,
 * 그게 시트를 통째로 걷어냈던 이유였다. 시트를 되살리는 조건은 이 칸이 내용을
 * 나르는 것이다 — 단계 수(`summary`)와 **첫 단계 본문**(`detail`) 한 줄.
 * 둘 다 호출부가 `summarizeSteps` 결과로 만들어 넘긴다(이 파일은 한국어를 모른다).
 *
 * ## 비었을 때 chevron 을 안 그리는 이유
 * 시안이 그렇다. 근거도 있다 — 빈 칸의 오른쪽 chevron 은 "펼칠 것이 있다" 는 신호인데
 * 아직 아무것도 없다. 대신 플레이스홀더 문장(`조리 순서를 입력해 주세요`)이
 * 눌러야 할 칸임을 말한다. 내용이 생기는 순간 chevron 이 붙어서 "여기 접혀 있다" 가
 * 된다.
 */

import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Text } from "@/src/shared/components/AppText"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

interface StepSummaryFieldProps {
  label: string
  /** 필수 표시 — 다른 필수 칸(`WriteTextField`)과 같은 브랜드색 `*`. */
  required?: boolean
  /** 아직 아무것도 없을 때 보여 줄 안내문. */
  placeholder: string
  /** `조리 순서 3단계` 처럼 이미 만들어진 문구. 비어 있으면 null. */
  summary: string | null
  /** 첫 단계 본문 한 줄. `summary` 가 있을 때만 그린다. */
  detail?: string | null
  onPress: () => void
  /**
   * 라벨만 넘긴다("조리 순서"). **값은 이 컴포넌트가 붙인다** — 호출부가 문장을
   * 조립하면 화면에 보이는 것과 읽히는 것이 갈라진다(둘을 따로 고치게 되므로).
   */
  accessibilityLabel: string
}

export function StepSummaryField({
  label,
  required = false,
  placeholder,
  summary,
  detail,
  onPress,
  accessibilityLabel,
}: StepSummaryFieldProps) {
  const s = useSurface()
  const filled = summary !== null && summary.length > 0

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: s.textStrong }]}>
        {label}
        {required ? <Text style={{ color: s.brand }}> *</Text> : null}
      </Text>

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        /*
          **값을 라벨에 싣는다.** 예전에는 "조리 순서" 만 읽어서, 비었을 때와 4단계를
          적어 둔 뒤가 스크린 리더에서 **똑같이 들렸다** — 눈으로 보면 상자 안이
          다른데 소리로는 구별할 방법이 없었다. 보이는 것을 그대로 읽어 준다.
        */
        accessibilityLabel={
          filled
            ? [accessibilityLabel, summary, detail]
                .filter((part) => part != null && part !== "")
                .join(", ")
            : `${accessibilityLabel}, ${placeholder}`
        }
        style={({ pressed }) => [
          styles.field,
          { backgroundColor: s.card, borderColor: s.border },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.body}>
          {filled ? (
            <>
              <Text
                numberOfLines={1}
                style={[styles.value, { color: s.textStrong }]}
              >
                {summary}
              </Text>
              {/*
                첫 단계는 **한 줄로 자른다.** 두 줄을 허용하면 단계가 길 때 이 칸이
                설명 입력만큼 자라서, 접어 둔 것이 접혀 있지 않게 된다.
              */}
              {detail ? (
                <Text
                  numberOfLines={1}
                  style={[styles.detail, { color: s.textMuted }]}
                >
                  {detail}
                </Text>
              ) : null}
            </>
          ) : (
            <Text
              numberOfLines={1}
              style={[styles.value, { color: s.textMuted }]}
            >
              {placeholder}
            </Text>
          )}
        </View>

        {filled ? (
          <Ionicons name="chevron-down" size={18} color={s.textMuted} />
        ) : null}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  // 라벨 → 칸 간격 8. `WriteTextField` 와 같은 리듬이어야 두 칸이 한 줄로 읽힌다.
  wrap: { gap: 8 },
  label: { ...TYPE.cardTitle, fontWeight: "700" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: LAYOUT.field.radius,
    // 보더는 늘 그린다. 두께를 상태에 따라 붙였다 떼면 안쪽 내용이 1pt 밀린다
    // (`WriteTextField` 머리말과 같은 규칙).
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    // 높이는 하우스 토큰(56)이다. 시안 실측 54 와 2pt 차이는 다른 입력 칸과
    // 밑변을 맞추는 쪽을 고른다 — 이 칸은 그 칸들과 같은 세로줄에 선다.
    minHeight: LAYOUT.field.height,
  },
  body: { flex: 1, gap: 2 },
  value: { ...TYPE.value },
  detail: { ...TYPE.caption, fontSize: 12, lineHeight: 17 },
})
