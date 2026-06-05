import React from "react"
import Svg, {
  Path,
  Circle,
  Line,
  Rect,
  Text as SvgText,
} from "react-native-svg"

import { STATUS_COLORS } from "../data/dashboardMetrics"
import type { MetricSeries } from "../data/dashboardMetrics"

interface TrendChartProps {
  series: MetricSeries
  width: number
  height?: number
}

const PAD_L = 10
const PAD_R = 14
const PAD_T = 16
const PAD_B = 22

/**
 * 단일 지표의 시계열 라인 차트.
 * - 정상 범위는 초록 밴드로 시각화
 * - 각 측정점은 정상/주의/경고 색으로 표시
 */
export function TrendChart({ series, width, height = 150 }: TrendChartProps) {
  const { config, points } = series
  const plotL = PAD_L
  const plotR = width - PAD_R
  const plotT = PAD_T
  const plotB = height - PAD_B
  const plotW = Math.max(plotR - plotL, 1)
  const plotH = Math.max(plotB - plotT, 1)

  // y 도메인: 측정값 + 정상 범위 경계값을 모두 포함하도록
  const domainVals: number[] = points.map((p) => p.value)
  if (config.normalMin != null) domainVals.push(config.normalMin)
  if (config.normalMax != null) domainVals.push(config.normalMax)
  let yMin = Math.min(...domainVals)
  let yMax = Math.max(...domainVals)
  if (yMin === yMax) {
    yMin -= 1
    yMax += 1
  }
  const padY = (yMax - yMin) * 0.15
  yMin -= padY
  yMax += padY

  const yToPx = (v: number) => plotB - ((v - yMin) / (yMax - yMin)) * plotH
  const xToPx = (i: number) =>
    points.length === 1
      ? plotL + plotW / 2
      : plotL + (i / (points.length - 1)) * plotW

  // 정상 범위 밴드
  const bandTop =
    config.normalMax != null ? Math.max(yToPx(config.normalMax), plotT) : plotT
  const bandBottom =
    config.normalMin != null ? Math.min(yToPx(config.normalMin), plotB) : plotB

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xToPx(i)} ${yToPx(p.value)}`)
    .join(" ")

  // x축 라벨: 5개 이하면 전부, 많으면 처음/끝만
  const showAllLabels = points.length <= 5

  return (
    <Svg width={width} height={height}>
      {/* 정상 범위 밴드 */}
      {bandBottom > bandTop && (
        <Rect
          x={plotL}
          y={bandTop}
          width={plotW}
          height={bandBottom - bandTop}
          fill="#34D399"
          opacity={0.1}
        />
      )}
      {config.normalMax != null && bandTop > plotT && (
        <Line
          x1={plotL}
          y1={bandTop}
          x2={plotR}
          y2={bandTop}
          stroke="#34D399"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
        />
      )}
      {config.normalMin != null && bandBottom < plotB && (
        <Line
          x1={plotL}
          y1={bandBottom}
          x2={plotR}
          y2={bandBottom}
          stroke="#34D399"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
        />
      )}

      {/* 추세선 */}
      {points.length > 1 && (
        <Path
          d={linePath}
          stroke="#94A3B8"
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* 측정점 + 값/날짜 라벨 */}
      {points.map((p, i) => {
        const cx = xToPx(i)
        const cy = yToPx(p.value)
        const color = STATUS_COLORS[p.status].dot
        const showLabel = showAllLabels || i === 0 || i === points.length - 1
        return (
          <React.Fragment key={`${p.date}-${i}`}>
            <Circle cx={cx} cy={cy} r={5} fill="#FFFFFF" />
            <Circle cx={cx} cy={cy} r={4} fill={color} />
            <SvgText
              x={cx}
              y={cy - 9}
              fontSize={9}
              fontWeight="600"
              fill={STATUS_COLORS[p.status].text}
              textAnchor="middle"
            >
              {p.value}
            </SvgText>
            {showLabel && (
              <SvgText
                x={cx}
                y={height - 6}
                fontSize={9}
                fill="#94A3B8"
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            )}
          </React.Fragment>
        )
      })}
    </Svg>
  )
}
