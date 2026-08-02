/**
 * 목 모드용 검진 분석기.
 *
 * 정본은 **서버**(`sinsin-be-bun` 의 `POST /health-check/analysis`)다. 이 파일은 서버가 없는
 * 목 모드에서 같은 모양의 응답을 만들어 화면을 완성하기 위한 것이다.
 *
 * 임계값을 여기에 **다시 적지 않는다.** `src/features/health/data/dashboardMetrics.ts` 의
 * `DASHBOARD_MODULES` 를 그대로 가져다 쓴다 — 임상 숫자를 두 곳에 적으면 반드시 갈리고,
 * 갈린 걸 아무도 눈치채지 못한다. 서비스 계층이 feature 를 import 하는 건 이 저장소의
 * 통상적인 방향은 아니지만, 숫자를 복제하는 쪽이 더 나쁘다.
 *
 * AI 문장은 만들지 않는다. 목의 요약은 항상 `source: "FALLBACK"` 이다 — 규칙으로 만든
 * 문장이라는 뜻이고, 실제 서버도 LLM 이 없을 때 같은 값을 준다.
 */

import {
  DASHBOARD_MODULES,
  type MetricConfig,
} from "@/src/features/health/data/dashboardMetrics"
import type { HealthCheckResultDetailRs } from "@/src/types/nhis"
import type {
  AnalysisMetric,
  CalendarDay,
  HealthAnalysis,
  MetricStatus,
  ProseSegment,
  TimelineEntry,
  TimelineItem,
} from "@/src/types/healthAnalysis"

const ALL_METRICS: MetricConfig[] = DASHBOARD_MODULES.flatMap((m) => m.metrics)

function parseValue(raw: string | undefined | null): number | null {
  if (raw == null) return null
  const text = String(raw).trim()
  if (text === "") return null
  const n = Number(text.replace(/[^0-9.\-]/g, ""))
  return Number.isFinite(n) ? n : null
}

function referenceText(config: MetricConfig): string {
  const { normalMin, normalMax } = config
  if (normalMin != null && normalMax != null) return `${normalMin}~${normalMax}`
  if (normalMin != null) return `${normalMin} 이상`
  if (normalMax != null) return `${normalMax} 이하`
  return ""
}

/** "2026.05.21" → "2026-05-21". 캘린더 키와 정렬에 쓴다. */
function isoDate(checkupDate: string): string {
  const digits = (checkupDate ?? "").replace(/[^0-9]/g, "")
  if (digits.length < 8) return checkupDate ?? ""
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

const LABELS: Record<string, string> = {
  gfr: "eGFR 신장 수치",
  serumCreatinine: "크레아티닌",
  bloodPressureSystolic: "수축기 혈압",
  bloodPressureDiastolic: "이완기 혈압",
  fastingBloodSugar: "공복 혈당",
  totalCholesterol: "총콜레스테롤",
  ldlCholesterol: "LDL 콜레스테롤",
  hdlCholesterol: "HDL 콜레스테롤",
  triglyceride: "중성지방",
  hemoglobin: "혈색소",
  astSgot: "AST",
  altSgpt: "ALT",
  gammaGtp: "감마지티피",
}

function labelOf(config: MetricConfig): string {
  return LABELS[config.key as string] ?? String(config.key)
}

/**
 * 한국어 주격 조사를 받침에 맞춰 고른다.
 *
 * "이(가)" 를 그대로 내보내면 화면에 괄호가 노출된다 — 실제로 그렇게 나왔었다.
 * 한글 음절은 `0xAC00 + (초성×21 + 중성)×28 + 종성` 이라, `(code - 0xAC00) % 28 !== 0`
 * 이면 받침이 있다. 라벨 끝이 한글이 아니면(예: "AST", "LDL 콜레스테롤" 은 한글로 끝나지만
 * "eGFR" 로 끝나는 경우) 판단할 수 없으므로 받침 없음으로 본다 — 영문 약어는 읽을 때
 * 대개 모음으로 끝난다("AST" → 에이에스티).
 */
function subjectParticle(word: string): string {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3
  if (!isHangulSyllable) return "가"
  return (code - 0xac00) % 28 !== 0 ? "이" : "가"
}

/**
 * 요약 문장.
 *
 * 형광 하이라이트가 걸릴 구절만 `emphasis: true` 로 떼어 낸다. 디자인의 예시와 같은 모양이다 —
 * "크레아티닌 수치는 정상범위이나, <mark>사구체 여과율(eGFR)이 낮아</mark> 주의가 필요합니다."
 */
function buildSummary(metrics: AnalysisMetric[]): ProseSegment[] {
  const worst = metrics.find((m) => m.status === "warning")
  const caution = metrics.find((m) => m.status === "caution")
  const focus = worst ?? caution

  if (!focus) {
    return [{ text: "검사 항목이 모두 참고범위 안에 있어요.", emphasis: false }]
  }

  const normalCount = metrics.filter((m) => m.status === "normal").length
  const tail =
    focus.status === "warning" ? "확인이 필요합니다." : "주의가 필요합니다."

  if (normalCount > 0) {
    return [
      { text: `${normalCount}개 항목은 정상범위이나, `, emphasis: false },
      {
        text: `${focus.label}${subjectParticle(focus.label)} 참고범위를 벗어나 `,
        emphasis: true,
      },
      { text: tail, emphasis: false },
    ]
  }
  return [
    {
      text: `${focus.label}${subjectParticle(focus.label)} 참고범위를 벗어나 `,
      emphasis: true,
    },
    { text: tail, emphasis: false },
  ]
}

/** 검진이 2회 이상일 때만, 가장 많이 악화된 지표 하나로 추세 문장을 만든다. */
function buildTrend(timeline: TimelineEntry[]): ProseSegment[] | null {
  if (timeline.length < 2) return null
  const latest = timeline[timeline.length - 1]
  let worst: TimelineItem | null = null
  for (const item of latest.items) {
    if (item.delta == null || item.status === "normal") continue
    if (!worst || Math.abs(item.delta) > Math.abs(worst.delta ?? 0))
      worst = item
  }
  if (!worst || worst.delta == null) return null
  const direction = worst.deltaDirection === "down" ? "감소" : "증가"
  return [
    { text: "최근 검사 결과 대비 ", emphasis: false },
    {
      text: `${worst.label}${subjectParticle(worst.label)} ${direction}되는 추세`,
      emphasis: true,
    },
    { text: "예요", emphasis: false },
  ]
}

/** 서버 응답과 **같은 모양**을 만든다. 화면은 목인지 실서버인지 구분하지 못해야 한다. */
export function analyzeLocally(
  ascendingDetails: HealthCheckResultDetailRs[],
): HealthAnalysis {
  const metrics: AnalysisMetric[] = []
  const timeline: TimelineEntry[] = []
  const calendarMap = new Map<string, CalendarDay>()
  // 지표별 직전 값. 델타를 내려면 오름차순 순회 중에 들고 있어야 한다.
  const previous = new Map<string, number>()

  ascendingDetails.forEach((detail, index) => {
    const isLatest = index === ascendingDetails.length - 1
    const date = isoDate(detail.checkupDate)
    const items: TimelineItem[] = []
    const day: CalendarDay = { date, warning: 0, caution: 0, normal: 0 }

    for (const config of ALL_METRICS) {
      const value = parseValue(detail[config.key] as string | undefined)
      if (value == null) continue
      const status: MetricStatus = config.evaluate(value)
      const label = labelOf(config)
      const prev = previous.get(String(config.key))
      const delta = prev == null ? null : Number((value - prev).toFixed(2))

      items.push({
        key: String(config.key),
        label,
        value,
        unit: config.unit,
        status,
        delta,
        deltaDirection:
          delta == null || delta === 0 ? null : delta > 0 ? "up" : "down",
      })
      day[status] += 1
      previous.set(String(config.key), value)

      // 요약 타일과 "건강 수치" 목록은 **최근 회차**만 본다.
      if (isLatest) {
        metrics.push({
          key: String(config.key),
          label,
          value,
          unit: config.unit,
          status,
          referenceText: referenceText(config),
          resultId: detail.resultId,
          checkupDate: detail.checkupDate,
        })
      }
    }

    timeline.push({ date, isLatest, items })
    calendarMap.set(date, day)
  })

  const counts = {
    warning: metrics.filter((m) => m.status === "warning").length,
    caution: metrics.filter((m) => m.status === "caution").length,
    normal: metrics.filter((m) => m.status === "normal").length,
  }

  // 화면은 위험 → 주의 → 정상 순으로 읽히는 게 낫다. 문제 수치가 먼저 보여야 한다.
  const order: Record<MetricStatus, number> = {
    warning: 0,
    caution: 1,
    normal: 2,
  }
  metrics.sort((a, b) => order[a.status] - order[b.status])

  const trend = buildTrend(timeline)
  return {
    counts,
    summary: { segments: buildSummary(metrics), source: "FALLBACK" },
    trendInsight: trend ? { segments: trend } : null,
    metrics,
    timeline,
    calendar: [...calendarMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  }
}
