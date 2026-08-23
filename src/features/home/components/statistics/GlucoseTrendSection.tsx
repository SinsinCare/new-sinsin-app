import { useMemo } from "react"
import { StyleSheet, View, useWindowDimensions } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Svg, { Circle, Line, Path, Rect } from "react-native-svg"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"
import { tokens } from "@/src/theme/tokens"
import { TYPE } from "@/src/theme/surface"
import type { BloodGlucoseRangeRecord } from "@/src/types/bloodMetrics"
import {
  buildGlucoseTrend,
  type GlucoseAxisCell,
  type GlucoseTrendModel,
} from "../../utils/glucoseTrendModel"

/**
 * 통계 · 혈당 추이 — **하루의 차례를 x축에 둔 겹쳐 그리기.**
 *
 * QA(2026-08-05): "혈당은 하루에 여러 번 측정하고 그래프 추이가 중요하다."
 * 그 말대로 그리려면 두 가지가 먼저 있어야 했다 — 하루에 여러 번을 **저장할 수 있는
 * 표**(서버 마이그레이션 081)와, 그 여러 번을 **줄 세우는 규칙**(`glucoseTrendModel.ts`).
 * 이 파일은 그 모델을 좌표로 옮기기만 한다. 판정·평균·목표 구간은 여기서 만들지 않는다.
 *
 * 그리는 것:
 *  - 칸마다 다른 **목표 띠**(식전·공복 70–99 / 식후 90–180)라 계단 모양이다.
 *  - 그 주의 날들이 옅은 선으로 깔리고, **선택한 날만 진하다.**
 *  - 목표를 벗어난 점은 속을 채워 표시한다 — 값 자체보다 "어느 칸이" 가 읽을 것이다.
 */

/** 카드 안쪽 여백까지 뺀 그림 영역. 축 라벨 자리를 아래에 남긴다. */
const CHART_HEIGHT = 168
const PADDING = { top: 12, right: 8, bottom: 22, left: 34 }

interface GlucoseTrendSectionProps {
  records: BloodGlucoseRangeRecord[] | undefined
  /** 진하게 그릴 날("YYYY-MM-DD"). */
  selectedDate: string
  isLoading: boolean
}

export function GlucoseTrendSection({
  records,
  selectedDate,
  isLoading,
}: GlucoseTrendSectionProps) {
  const { t } = useTranslation()
  const surface = useSurface()
  const { width: windowWidth } = useWindowDimensions()
  const model = useMemo(() => buildGlucoseTrend(records ?? []), [records])

  // 화면 좌우 16 + 카드 좌우 16 = 64.
  const chartWidth = Math.max(240, windowWidth - 64)

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: surface.textStrong }]}>
        {t("stats.glucose.title")}
      </Text>

      <View style={[styles.card, { backgroundColor: surface.surface }]}>
        {model.summary.count === 0 ? (
          <Text
            style={[styles.empty, { color: surface.textWeak }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t(isLoading ? "stats.glucose.loading" : "stats.glucose.empty")}
          </Text>
        ) : (
          <>
            <SummaryRow model={model} />
            <TrendChart
              model={model}
              width={chartWidth}
              selectedDate={selectedDate}
              isDark={surface.isDark}
            />
            <AxisLabels axis={model.axis} width={chartWidth} />
            <Caption model={model} />
          </>
        )}
      </View>
    </View>
  )
}

function SummaryRow({ model }: { model: GlucoseTrendModel }) {
  const { t } = useTranslation()
  const surface = useSurface()
  const { average, inTargetRatio, days } = model.summary
  const items = [
    { label: t("stats.glucose.average"), value: `${average} mg/dL` },
    {
      label: t("stats.glucose.inTarget"),
      value:
        inTargetRatio === null ? "—" : `${Math.round(inTargetRatio * 100)}%`,
    },
    {
      label: t("stats.glucose.recordedDays"),
      value: t("stats.glucose.daysValue", { count: days }),
    },
  ]
  return (
    <View style={styles.summaryRow}>
      {items.map((item) => (
        <View key={item.label} style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: surface.textStrong }]}>
            {item.value}
          </Text>
          <Text style={[styles.summaryLabel, { color: surface.textWeak }]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function TrendChart({
  model,
  width,
  selectedDate,
  isDark,
}: {
  model: GlucoseTrendModel
  width: number
  selectedDate: string
  isDark: boolean
}) {
  const innerWidth = width - PADDING.left - PADDING.right
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const columns = model.axis.length
  const step = columns > 1 ? innerWidth / (columns - 1) : 0

  const x = (index: number) => PADDING.left + index * step
  const y = (value: number) => {
    const ratio = (value - model.yMin) / (model.yMax - model.yMin)
    return PADDING.top + innerHeight - ratio * innerHeight
  }

  const brand = tokens.color.primary.val
  const bandColor = isDark ? "rgba(52,211,153,0.16)" : "rgba(52,211,153,0.14)"
  const gridColor = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)"
  const otherLine = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.14)"

  /** y축 눈금. 목표 띠 위아래를 읽을 수 있는 최소한만 둔다. */
  const ticks = [model.yMin, (model.yMin + model.yMax) / 2, model.yMax].map(
    (value) => Math.round(value),
  )

  const linePath = (points: { index: number; value: number }[]) =>
    points
      .map(
        (point, order) =>
          `${order === 0 ? "M" : "L"}${x(point.index).toFixed(1)} ${y(point.value).toFixed(1)}`,
      )
      .join(" ")

  const selected = model.lines.find((line) => line.date === selectedDate)
  const others = model.lines.filter((line) => line.date !== selectedDate)

  return (
    <Svg width={width} height={CHART_HEIGHT}>
      {/* 칸마다 목표가 다르므로 띠는 칸 하나씩 그린다(계단 모양). */}
      {model.axis.map((cell, index) => {
        const left = index === 0 ? x(0) : x(index) - step / 2
        const right =
          index === columns - 1 ? x(columns - 1) : x(index) + step / 2
        return (
          <Rect
            key={`band-${index}`}
            x={left}
            y={y(cell.targetMax)}
            width={Math.max(0, right - left)}
            height={Math.max(0, y(cell.targetMin) - y(cell.targetMax))}
            fill={bandColor}
          />
        )
      })}

      {ticks.map((tick) => (
        <Line
          key={`grid-${tick}`}
          x1={PADDING.left}
          x2={width - PADDING.right}
          y1={y(tick)}
          y2={y(tick)}
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}

      {/* 다른 날들 — 오늘이 평소와 어디서 갈리는지의 배경이다. */}
      {others.map((line) => (
        <Path
          key={line.date}
          d={linePath(line.points)}
          stroke={otherLine}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}

      {selected ? (
        <>
          <Path
            d={linePath(selected.points)}
            stroke={brand}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {selected.points.map((point) => (
            <Circle
              key={`${selected.date}-${point.index}`}
              cx={x(point.index)}
              cy={y(point.value)}
              r={point.outOfTarget ? 4.5 : 3.5}
              // 목표를 벗어난 점만 속을 채운다 — 훑어볼 때 걸리는 것이 그것이어야 한다.
              fill={point.outOfTarget ? brand : isDark ? "#1F1F21" : "#FFFFFF"}
              stroke={brand}
              strokeWidth={2}
            />
          ))}
        </>
      ) : null}
    </Svg>
  )
}

/**
 * x축 라벨. SVG 안에 `Text` 를 두지 않는 이유는 폰트(Pretendard)가 네이티브 텍스트에서만
 * 일관되게 잡히기 때문이다 — 두 방식이 섞이면 안드로이드에서 자간이 갈린다.
 */
function AxisLabels({
  axis,
  width,
}: {
  axis: GlucoseAxisCell[]
  width: number
}) {
  const { t } = useTranslation()
  const surface = useSurface()
  const innerWidth = width - PADDING.left - PADDING.right
  return (
    <View style={[styles.axisRow, { width, marginTop: -18 }]}>
      {axis.map((cell, index) => (
        <Text
          key={`${cell.slot}-${cell.timing}`}
          numberOfLines={1}
          style={[
            styles.axisLabel,
            {
              color: surface.textWeak,
              width: innerWidth / axis.length,
              left:
                PADDING.left +
                (index * innerWidth) / (axis.length - 1) -
                innerWidth / axis.length / 2,
            },
          ]}
        >
          {cell.slot === ""
            ? t("home.bloodGlucose.timing.FASTING")
            : `${t(`meal.${cell.slot}`).slice(0, 2)}${t(
                `stats.glucose.timingShort.${cell.timing}`,
              )}`}
        </Text>
      ))}
    </View>
  )
}

function Caption({ model }: { model: GlucoseTrendModel }) {
  const { t } = useTranslation()
  const surface = useSurface()
  const { worstCell, min, max } = model.summary

  const worstLabel = worstCell
    ? [
        worstCell.slot ? t(`meal.${worstCell.slot}`) : null,
        t(`home.bloodGlucose.timing.${worstCell.timing}`),
      ]
        .filter(Boolean)
        .join(" ")
    : null

  return (
    <View style={styles.captionBlock}>
      <Text
        style={[styles.caption, { color: surface.textWeak }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("stats.glucose.range", { min, max })}
      </Text>
      {worstLabel ? (
        <Text
          style={[styles.caption, { color: surface.textWeak }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("stats.glucose.worstCell", {
            cell: worstLabel,
            count: worstCell?.overCount ?? 0,
          })}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { paddingVertical: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  card: { borderRadius: 16, padding: 16, gap: 12, overflow: "hidden" },
  empty: { ...TYPE.cardSub, paddingVertical: 24, textAlign: "center" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryItem: { flex: 1, gap: 2 },
  summaryValue: { fontSize: 17, fontWeight: "700" },
  summaryLabel: { ...TYPE.cardSub },
  axisRow: { height: 18, marginLeft: -16 },
  axisLabel: { position: "absolute", fontSize: 10, textAlign: "center" },
  captionBlock: { gap: 2, marginTop: 4 },
  caption: { ...TYPE.cardSub },
})
