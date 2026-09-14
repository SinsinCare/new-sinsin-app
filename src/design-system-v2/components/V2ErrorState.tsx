import { Text } from "@/src/design-system-v2/primitives/NativeText"
// Design System v2 — ErrorState (오류 상태)
// No Figma spec — 설명 + 토큰으로 설계.
//
// 데이터 로드 실패·예외 등 오류 상황을 세로 중앙 스택으로 안내:
//   아이콘(기본 caution) → 제목 → (옵션)설명 → (옵션)재시도 버튼.
// 재시도(onRetry)가 있을 때만 하단에 V2Button을 노출한다.

import { useEffect, useRef } from "react"
import { type ViewStyle, StyleSheet, View } from "react-native"
import {
  trackAnalyticsEvent,
  type AnalyticsSurface,
} from "@/src/features/analytics"
import { spacing, typography } from "../tokens"
import { type V2IconName } from "../icons"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Button } from "./V2Button"
import { V2Icon } from "./V2Icon"

type V2ErrorStateBaseProps = {
  /**
   * 이 오류 상태가 사는 자리 (필수). `error_state_viewed` 의 유일한 구분축이다 —
   * 기본값을 두면 새 화면이 조용히 남의 칸으로 들어간다.
   */
  surface: AnalyticsSurface
  /** 상단 아이콘. 기본 'caution' */
  icon?: V2IconName
  /**
   * 아이콘의 감정 온도. 기본 'negative'(빨강)는 데이터 유실·권한 거부처럼
   * 사용자가 무언가 잃을 수 있는 상황용이다. 지도 로드 실패·일시적 네트워크
   * 문제처럼 **다시 시도하면 그만인 상태**는 'quiet'(그레이) — 빨간 경고는
   * 그 화면을 사고 현장처럼 읽히게 한다(QA 2026-08-06, 식당 지도).
   */
  tone?: "negative" | "quiet"
  /** 사용자가 처한 상황을 구체적으로 설명하는 제목 */
  title: string
  /** 부가 설명 (옵션) */
  description?: string
  style?: ViewStyle
}

/**
 * 재시도 버튼은 **둘 다 있거나 둘 다 없거나**다 — 핸들러만 있으면 라벨 없는 버튼이,
 * 라벨만 있으면 눌리지 않는 버튼이 나온다. 그래서 한 쌍으로 묶은 유니온이다.
 *
 * 이름을 붙여 export 하는 이유: 재시도 가능 여부가 **런타임에 정해지는** 호출부
 * (`resolveError().retryable`)는 조건부 스프레드로 넘길 수밖에 없는데,
 *
 * ```tsx
 * <V2ErrorState {...(retryable ? { onRetry, retryLabel } : {})} />
 * ```
 *
 * 이렇게 쓰면 TS 가 삼항의 결과를 `{onRetry?: …; retryLabel?: …}` 로 **합쳐 버려서**
 * 유니온의 어느 쪽도 만족하지 못한다(둘 다 옵셔널인 모양은 "핸들러 없이 라벨만" 을
 * 허용하므로 당연히 거절된다). 호출부에서 이 타입으로 변수를 선언하면 유니온이
 * 유지되어 그대로 통과한다:
 *
 * ```tsx
 * const retry: V2ErrorStateRetry = retryable ? { onRetry, retryLabel } : {}
 * <V2ErrorState {...retry} />
 * ```
 */
export type V2ErrorStateRetry =
  | {
      /** 사용자가 이 화면에서 바로 복구할 수 있을 때만 제공 */
      onRetry: () => void
      /** 실제 행동을 나타내는 라벨. 예: "다시 불러오기" */
      retryLabel: string
    }
  | {
      onRetry?: undefined
      retryLabel?: undefined
    }

export type V2ErrorStateProps = V2ErrorStateBaseProps &
  V2ErrorStateRetry & {
    /** gorhom 시트 안(식당 지도 실패 상태)에서 켠다 — 이유는 V2Button.gestureHandler 주석. */
    retryGestureHandler?: boolean
  }

export function V2ErrorState(props: V2ErrorStateProps) {
  const {
    surface,
    icon = "caution",
    tone = "negative",
    title,
    description,
    onRetry,
    retryLabel,
    retryGestureHandler = false,
    style,
  } = props
  const { colors } = useV2Theme()

  /* 마운트당 한 번(설계 §2 P3). `onRetry` 는 대개 인라인 화살표라 의존성에 넣으면
     매 렌더가 새 값이 되므로, 재시도 가능 여부는 첫 그림의 것으로 고정한다. */
  const retryable = Boolean(onRetry)
  const reported = useRef(false)
  useEffect(() => {
    if (reported.current) return
    reported.current = true
    trackAnalyticsEvent("error_state_viewed", { surface, retryable })
  }, [surface, retryable])

  return (
    <View style={[styles.root, style]}>
      {/* 아이콘: 2xl(40). negative=부정 상태색, quiet=보조 그레이 */}
      <V2Icon
        name={icon}
        size="2xl"
        color={
          tone === "quiet" ? colors.label.assistive : colors.status.negative
        }
      />

      {/* 가운데 정렬은 줄바꿈 위치가 그대로 실루엣이 된다 — 어절 중간에서 끊기면
          양쪽 여백이 들쭉날쭉해져 문장보다 먼저 눈에 띈다. 그래서 한글 어절 단위로
          끊고(iOS), 줄 길이를 고르게 맞춘다(Android). */}
      <Text
        style={[styles.title, { color: colors.label.normal }]}
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
      >
        {title}
      </Text>

      {description ? (
        <Text
          style={[styles.description, { color: colors.label.neutral }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {description}
        </Text>
      ) : null}

      {onRetry ? (
        // 재시도 버튼: neutral/weak/m. 스택 gap(12) 위에 8을 더해 여백 확보.
        <View style={styles.retry}>
          <V2Button
            color="neutral"
            variant="weak"
            size="m"
            onPress={onRetry}
            gestureHandler={retryGestureHandler}
          >
            {retryLabel}
          </V2Button>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[12],
    padding: spacing[24],
  },
  title: {
    ...typography.title.small, // 20 Bold
    textAlign: "center",
  },
  description: {
    ...typography.body.mediumWeak, // 17 Regular
    textAlign: "center",
  },
  // 재시도 버튼 위 추가 여백 (스택 gap 위에 +8)
  retry: {
    marginTop: spacing[8],
  },
})
