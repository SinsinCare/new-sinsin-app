/**
 * 접을 수 있는 작성 섹션.
 *
 * ## 왜 접는가
 * 시안은 필수 5개 + 태그 3그룹 + 재료 반복 + 조리순서 + 설명을 한 화면에 쌓아서,
 * 스크롤 중간에 있으면 **지금 어디까지 했는지** 알 수 없었다. 접으면 머리글만 남고,
 * 머리글이 그 섹션의 상태(다 적었어요 / 남았어요 / 선택)를 말한다. 그래서 접힌 상태가
 * 곧 진행 상황 목록이 된다.
 *
 * ## 왜 단계(스텝)로 나누지 않았는가
 * 재료를 적는 동안 영양이 실시간으로 바뀌는 것이 이 화면의 핵심이다. 단계로 끊으면
 * 재료 단계에서만 영양이 보이고, 인분을 고치러 앞 단계로 돌아가면 그 연결이 끊긴다.
 * 한 스크롤 안에 두고 접는 쪽이 "재료 ↔ 영양" 을 붙여 둔다.
 */

import { useCallback } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"

export type WriteSectionState = "done" | "incomplete" | "optional"

interface WriteSectionProps {
  title: string
  /** "다 적었어요" / "남았어요" / "선택" — 접힌 상태에서도 보이는 유일한 신호다. */
  stateLabel: string
  state: WriteSectionState
  expanded: boolean
  onToggle: () => void
  /** 접혔을 때 머리글 아래 한 줄로 요약(예: "재료 4개"). 없으면 안 그린다. */
  collapsedSummary?: string | null
  children: React.ReactNode
}

export function WriteSection({
  title,
  stateLabel,
  state,
  expanded,
  onToggle,
  collapsedSummary,
  children,
}: WriteSectionProps) {
  const s = useSurface()
  const handlePress = useCallback(() => onToggle(), [onToggle])

  // 완료는 브랜드색, 남은 것은 본문 회색. 남은 것을 빨강으로 칠하지 않는다 —
  // 아직 안 적은 것은 오류가 아니다.
  const stateColor = state === "done" ? s.brand : s.textMuted

  return (
    <View style={[styles.wrap, { borderBottomColor: s.hairline }]}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${stateLabel}`}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.6 }]}
      >
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: s.textStrong }]}>{title}</Text>
          <Text style={[styles.state, { color: stateColor }]}>
            {stateLabel}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={s.textWeak}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.body}>{children}</View>
      ) : collapsedSummary ? (
        <Text style={[styles.summary, { color: s.textMuted }]}>
          {collapsedSummary}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  headerText: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexShrink: 1,
  },
  title: {
    ...TYPE.sectionTitle,
    fontWeight: "600",
  },
  state: {
    ...TYPE.caption,
  },
  body: {
    paddingBottom: 20,
    gap: 16,
  },
  summary: {
    ...TYPE.caption,
    paddingBottom: 16,
  },
})
