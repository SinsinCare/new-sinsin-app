import { Text } from "@/src/design-system-v2/primitives/NativeText"
// Design System v2 — EmptyState
// 빈 상태 플레이스홀더. 세로 중앙 정렬 스택으로
// (옵션)아이콘 → 제목 → (옵션)설명 → (옵션)액션 버튼을 조립한다.
// Figma 스펙 없음 — 설명 + 토큰으로 설계. 조립은 직접 경로(V2Icon/V2Button).
//
// ─────────────────────────────────────────────────────────────────────────────
// ■ `tone` — 이 빈칸이 **얼마나 말을 거는가**
//
//   `loud`  (기본) 20 Bold 제목 + 17 설명 + 액션. 화면 전체가 비었을 때.
//   `quiet`        제목 없음 · 15 Medium 보조 설명 한 덩어리. 화면의 **한 구획**만
//                  비었을 때(댓글 0건처럼 옆에 이미 콘텐츠가 있는 자리). 제목까지
//                  크게 외치면 그 구획이 화면의 주인공처럼 읽힌다.
//
//   조용한 것과 **안 보이는 것**은 다르다. `quiet` 의 설명은 `label.assistive` 였는데,
//   그 값은 라이트의 어떤 면 위에서도 1.7:1 이라(흰 면 1.68 · 앱 바닥 1.66) 글자가
//   있다는 사실 자체가 안 읽혔다 — 스토리 빈 레일의 한 줄이 그렇게 사라져 있었다
//   (2026-08-21 사용자 지적). 색은 `loud` 와 같은 `label.neutral`(라이트 5.2 · 다크 5.8)
//   로 올리고, **목소리 크기는 색이 아니라 크기·굵기·제목 유무가 말한다** —
//   15 Medium · 제목 없음은 그대로다. 계산은 `tests/lightContrastAudit.test.ts`.
//
// `quiet` 에는 제목 슬롯이 아예 없다(`title?: never`). "조용한데 제목은 있는" 중간
// 상태를 열어 두면 화면마다 다른 타협이 생기고, 그러면 톤 축이 있으나 마나다.
//
// ■ `illustration` — 40px 캡을 벗어나는 자리
//
// `icon` 은 `V2Icon size="2xl"`(40) 고정이다. 시안의 조용한 빈상태는 71×69 아웃라인
// 그림이라 그 캡에 안 들어간다. 그래서 아이콘 자리를 통째로 넘겨받는 슬롯을 둔다 —
// 크기·색은 넘기는 쪽이 소유한다(둘 다 주면 `illustration` 이 이긴다).

import { type ReactNode, useEffect, useRef } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
import {
  trackAnalyticsEvent,
  type AnalyticsSurface,
} from "@/src/features/analytics"
import { spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"
import type { V2IconName } from "../icons"
import { V2Button } from "./V2Button"

/** 빈칸의 목소리 크기. 자세한 것은 파일 머리말 §tone. */
export type V2EmptyStateTone = "loud" | "quiet"

type V2EmptyStateBaseProps = {
  /**
   * 이 빈 상태가 사는 자리 (필수). `empty_state_viewed` 의 유일한 구분축이라 기본값을
   * 두지 않는다 — 안 주면 컴파일이 막히고, 기본값을 두면 새 화면이 전부 한 칸에 뭉친다.
   */
  surface: AnalyticsSurface
  /** 상단 일러스트 아이콘 (기본 없음). 있으면 size 2xl(40) + label.assistive 색 */
  icon?: V2IconName
  /**
   * 아이콘 자리를 대신할 그림 (옵션). 40px 캡을 안 받는다 — 크기·색은 넘기는 쪽 소유.
   * `icon` 과 함께 주면 이쪽이 그려진다.
   */
  illustration?: ReactNode
  /**
   * 보조 설명 (옵션). 가운데정렬, 여러 줄 wrap.
   * loud=body.mediumWeak(17 Regular) · quiet=label.smallWeak(15 Medium). 색은 둘 다
   * `label.neutral` — 위 §tone 의 마지막 문단이 이유다.
   */
  description?: string
  /** 액션 버튼 라벨 (옵션). onAction과 함께 있어야 버튼 노출 */
  actionLabel?: string
  /** 액션 콜백 (옵션). actionLabel과 함께 brand/fill/m 버튼 조립 */
  onAction?: () => void
  style?: ViewStyle
}

export type V2EmptyStateProps =
  | (V2EmptyStateBaseProps & {
      tone?: "loud"
      /** 제목 (필수). title.small(20 Bold) 가운데정렬 */
      title: string
    })
  | (V2EmptyStateBaseProps & {
      tone: "quiet"
      /** `quiet` 에는 제목이 없다 (머리말 §tone) */
      title?: never
    })

export function V2EmptyState(props: V2EmptyStateProps) {
  const {
    surface,
    icon,
    illustration,
    title,
    description,
    actionLabel,
    onAction,
    tone = "loud",
    style,
  } = props
  const { colors } = useV2Theme()
  const isQuiet = tone === "quiet"
  // 라벨과 콜백이 모두 있을 때만 액션 노출
  const showAction = Boolean(actionLabel && onAction)

  /* 마운트당 한 번. 렌더 본문에서 쏘면 부모가 다시 그릴 때마다 같은 빈 상태가
     여러 번 세어진다(설계 §2 P3 — 이 유형의 결함이 검증에서 세 건 잡혔다). */
  const reported = useRef(false)
  useEffect(() => {
    if (reported.current) return
    reported.current = true
    trackAnalyticsEvent("empty_state_viewed", { surface })
  }, [surface])

  return (
    <View style={[styles.container, isQuiet && styles.containerQuiet, style]}>
      {illustration ??
        (icon ? (
          <V2Icon name={icon} size="2xl" color={colors.label.assistive} />
        ) : null)}

      {title != null && (
        <Text
          style={[
            typography.title.small,
            styles.title,
            { color: colors.label.normal },
          ]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {title}
        </Text>
      )}

      {description && (
        <Text
          style={[
            isQuiet ? typography.label.smallWeak : typography.body.mediumWeak,
            styles.description,
            // 톤이 갈라도 색은 하나다 — 위 §tone. 크기·굵기가 위계를 말한다.
            { color: colors.label.neutral },
          ]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {description}
        </Text>
      )}

      {showAction && (
        <View style={styles.action}>
          <V2Button color="brand" variant="fill" size="m" onPress={onAction}>
            {actionLabel}
          </V2Button>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[12],
    padding: spacing[24],
  },
  // quiet: 덩어리가 둘뿐이라(그림 + 한 문장) 사이를 16 으로 벌린다(시안 실측).
  containerQuiet: { gap: spacing[16] },
  title: { textAlign: "center" },
  description: { textAlign: "center" },
  // 액션은 스택 gap 위에 추가 상단 여백을 얹어 시각적으로 분리
  action: { marginTop: spacing[8] },
})
