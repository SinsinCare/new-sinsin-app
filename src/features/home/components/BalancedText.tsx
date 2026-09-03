import { useState } from "react"
import type { TextLayoutEvent } from "react-native"
import { useWindowDimensions } from "react-native"
import { V2Text, type V2TextProps } from "@/src/design-system-v2"

import { balancedTextWidth, shouldRevert } from "./balanceTextWidth"

interface BalancedTextProps extends V2TextProps {
  /** 화면 폭에서 빼야 할 좌우 여백 합(부모 marginHorizontal × 2 등). */
  horizontalInset: number
}

interface Measurement {
  /** 원래 폭으로 그렸을 때의 줄 수. */
  readonly lineCount: number
  /** 좁혀 볼 폭. null 이면 손댈 것이 없다. */
  readonly width: number | null
}

/**
 * 줄 폭을 고르게 맞춘 글 — iOS 에 없는 `balanced` 줄바꿈의 대역.
 *
 * 1) 먼저 주어진 폭 그대로 그려서 글꼴이 실제로 만든 줄들을 잰다(`onTextLayout`).
 * 2) 그 줄 수를 유지한 채 각 줄이 비슷해지는 폭(`balancedTextWidth`)으로 다시 그린다.
 * 3) 다시 그린 결과가 줄이 더 늘었으면(긴 단어) 원래 폭으로 되돌린다.
 *
 * 쓸 수 있는 폭은 **화면 폭 − 여백**으로 받는다. 처음 버전은 감싼 View 의 `onLayout` 으로
 * 쟀는데, Fabric 은 `onTextLayout` 을 레이아웃 중에, `onLayout` 은 커밋 뒤에 보내므로
 * 첫 측정이 폭을 모른 채 버려지고 그 뒤로는 텍스트가 다시 레이아웃되지 않아 재측정도
 * 없었다(2026-09-02 리뷰). 이벤트 하나만 보면 순서 문제가 사라진다.
 *
 * 한 문단만 다룬다 — `\n` 이 든 글은 문단마다 따로 이 컴포넌트를 쓴다(`LoadingOverlay`).
 * 문단을 섞어 평균을 내면 짧은 문단이 긴 문단을 끌어내려 줄만 늘어난다.
 *
 * 부모가 `key` 로 다시 마운트하면 상태가 새로 시작된다 — 글이 바뀔 때마다 그렇게 쓴다.
 */
export function BalancedText({
  style,
  onTextLayout,
  horizontalInset,
  ...rest
}: BalancedTextProps) {
  const { width: windowWidth } = useWindowDimensions()
  const availableWidth = windowWidth - horizontalInset
  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const [outcome, setOutcome] = useState<"pending" | "kept" | "reverted">(
    "pending",
  )

  const handleTextLayout = (event: TextLayoutEvent) => {
    onTextLayout?.(event)
    const lines = event.nativeEvent.lines
    if (measurement === null) {
      const width = balancedTextWidth(lines, availableWidth)
      setMeasurement({ lineCount: lines.length, width })
      if (width === null) setOutcome("kept")
      return
    }
    // 좁힌 폭으로 그린 두 번째 측정 — 이 핸들러는 폭을 적용한 커밋의 것이라 measurement 가 보인다.
    if (outcome !== "pending") return
    setOutcome(
      shouldRevert(measurement.lineCount, lines.length) ? "reverted" : "kept",
    )
  }

  const width = outcome === "reverted" ? null : (measurement?.width ?? null)

  return (
    <V2Text
      {...rest}
      onTextLayout={handleTextLayout}
      style={[style, width !== null ? { width } : null]}
    />
  )
}
