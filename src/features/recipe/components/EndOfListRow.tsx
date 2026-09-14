import { borderWidth } from "@/src/design-system-v2/tokens/size"
/**
 * **목록의 끝 — 조용한 한 줄.**
 *
 * ─── 왜 필요했나 ───────────────────────────────────────────────────────────
 * 무한 목록의 끝은 여기까지 **아무 말도 하지 않았다.** 그래서 마지막 카드 아래에서
 * 화면이 멈추면 "이게 전부다" 와 "더 못 불러왔다" 가 **같은 그림**이었다. 다음에
 * 할 일이 정반대인 두 상태(그만 본다 / 다시 시도한다)를 화면이 구분해 주지 않으니,
 * 사용자는 끝난 목록을 몇 번씩 더 당겨 보게 된다.
 *
 * ─── 왜 카드가 아니라 선 하나인가 ─────────────────────────────────────────
 * 한국 앱들이 목록 끝에 세우는 것은 큰 카드나 배너가 아니라 **가는 선 + 짧은 말**이다.
 * 끝은 사건이 아니라 사실이다 — 스크롤을 멈춘 사람의 눈길을 다시 붙잡을 이유가 없다.
 * 실패 행(`NextPageErrorRow`)·"더 보기"(`LoadMoreRow`)와 톤이 달라야 하는 이유도
 * 그것이다: 저 둘은 **할 일이 남았다**고 말하고, 여기는 **할 일이 없다**고 말한다.
 *
 * 그래도 **길 하나는 같이 준다.** 끝에 닿은 사람이 다음으로 하는 일은 거의 언제나
 * 맨 위로 돌아가는 것이고, 긴 목록에서 손으로 스크롤해 올라가는 것은 그 자체로 벌이다.
 * 문구는 호출부가 고른다(피드 · 검색이 서로 다른 말을 한다 — `LoadMoreRow` 와 같은 규칙).
 *
 * ─── 접근성 ────────────────────────────────────────────────────────────────
 * 선은 글자가 없으므로 포커스 대상이 아니고, 문장과 버튼만 읽힌다. 버튼을 눌러 목록이
 * 맨 위로 가더라도 **포커스를 옮기지 않는다** — 스크린리더 커서를 코드가 끌고 가면
 * 사용자가 읽던 자리를 잃는다(탭 재탭 리셋과 같은 규칙 · `tabReset.ts`).
 */
import { Pressable, StyleSheet, View } from "react-native"

import { Text } from "@/src/shared/components/AppText"
/* 토큰은 **토큰 배럴에서** 가져온다(컴포넌트 배럴이 아니라). 컴포넌트 배럴을
   `jest.mock` 으로 갈아 끼우는 화면 테스트가 여럿이고, 그때 이 파일의 `StyleSheet.create`
   가 모듈 로드 시점에 `undefined[24]` 로 죽어 **남의 스위트를 통째로** 무너뜨린다.
   토큰 배럴은 순수 객체라 아무도 모킹하지 않는다. */
import { spacing, typography } from "@/src/design-system-v2/tokens"
import { useSurface } from "@/src/hooks/useSurface"

interface EndOfListRowProps {
  /** 끝났다는 사실 한 줄. 예: `마지막 글까지 다 봤어요`. */
  label: string
  /** 함께 주는 길 하나. 예: `맨 위로`. */
  actionLabel: string
  onPressAction: () => void
}

export function EndOfListRow({
  label,
  actionLabel,
  onPressAction,
}: EndOfListRowProps) {
  const surface = useSurface()
  return (
    <View style={styles.row}>
      <View style={styles.line}>
        <View style={[styles.rule, { backgroundColor: surface.border }]} />
        <Text
          style={[styles.label, { color: surface.textMuted }]}
          accessibilityRole="text"
          lineBreakStrategyIOS="hangul-word"
        >
          {label}
        </Text>
        <View style={[styles.rule, { backgroundColor: surface.border }]} />
      </View>
      <Pressable
        onPress={onPressAction}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={[styles.action, { color: surface.brand }]}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    paddingVertical: spacing[24],
    gap: spacing[12],
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: spacing[12],
    paddingHorizontal: spacing[16],
  },
  /** 글자 양옆의 가는 선 — 구분선이지 테두리가 아니다. 두께는 물리 헤어라인이 아니라
      `borderWidth.thin` = 1 논리 pt: 3x 화면에서 헤어라인은 1/3 pt 라 선이 안 보였다
      (docs/design/community-refresh-2026-09-05/PROFILE-REVIEW.md). */
  rule: {
    flex: 1,
    height: borderWidth.thin,
  },
  label: typography.subtext.medium,
  action: typography.label.xSmall,
})
