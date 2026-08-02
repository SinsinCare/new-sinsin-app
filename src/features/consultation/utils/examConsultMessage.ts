/**
 * 건강검진 "질문하기" 메시지의 빌더와 파서.
 *
 * `foodConsultMessage.ts` 와 **같은 계약**이다: 빌더가 만든 텍스트가 곧 LLM 프롬프트이자
 * 서버에 저장되는 원문이고, 화면에는 그 원문을 그대로 보여주지 않고 파서가 복원한 구조를
 * `ExamConsultCard` 로 그린다. 히스토리를 다시 불러와도 서버에는 텍스트만 남아 있으므로
 * **빌더와 파서는 반드시 같은 포맷을 말해야 한다** — 포맷을 바꾸면 두 쪽을 함께 고치고
 * `tests/examConsultMessage.test.ts` 로 확인한다.
 *
 * ## 왜 수치를 실어 보내야 하는가
 *
 * 처음에는 "제 건강검진 결과에 대해 설명해 주세요" 라는 문장만 보냈다. 그랬더니 모델이
 * **"건강검진 결과지를 아직 보지 못해 구체적인 내용을 알기 어려워요"** 라고 되물었다.
 * 당연하다 — 상담 쪽 컨텍스트 빌더는 CKD 병기·동반질환·오늘 섭취량만 주입하고 검사 수치는
 * 넣지 않는다. 버튼이 화면에 있는 수치를 보고 있으면서 그걸 안 보내면 기능이 아니라 장식이다.
 */

export type ExamConsultTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string

export type ExamMetricStatus = "normal" | "caution" | "warning"

export interface ExamConsultMetric {
  label: string
  value: number
  unit: string
  status: ExamMetricStatus
  /** "60 이상", "90~120" 처럼 사람이 읽는 참고범위. 없으면 생략한다. */
  referenceText?: string
}

export interface ExamConsultContext {
  /** 검진일 원문("2026.05.21"). 표시용 라벨은 화면이 만들어 넣는다. */
  checkupDate?: string
  checkupDateLabel?: string
  counts?: { warning: number; caution: number; normal: number }
  metrics: ExamConsultMetric[]
}

/**
 * 프롬프트 길이 상한. 식사 쪽(4800)과 같은 이유 — 서버 저장 컬럼과 모델 입력 양쪽을 지킨다.
 * 검진 지표는 13개가 상한이라 실제로는 한참 못 미친다.
 */
export const EXAM_CONSULT_MESSAGE_MAX_LENGTH = 4800

/** 카드가 접기 전까지 보여 줄 지표 수. 넘으면 "N개 더보기". */
export const EXAM_CARD_PREVIEW_COUNT = 4

export function parseExamConsultContext(
  raw: string,
): ExamConsultContext | null {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    const metrics = (parsed as ExamConsultContext).metrics
    if (!Array.isArray(metrics)) return null
    return parsed as ExamConsultContext
  } catch {
    return null
  }
}

/** 숫자를 로케일 표기로. 소수점은 있는 만큼만 남긴다(1.24 는 1.24, 146 은 146). */
function formatValue(value: number, language: "ko" | "en"): string {
  if (!Number.isFinite(value)) return ""
  return value.toLocaleString(language === "en" ? "en-US" : "ko-KR", {
    maximumFractionDigits: 2,
  })
}

export function buildExamConsultMessage(
  context: ExamConsultContext,
  language: "ko" | "en",
  translate: ExamConsultTranslate,
): string {
  const dateLabel =
    context.checkupDateLabel?.trim() || context.checkupDate?.trim()

  const countsLine = context.counts
    ? (["warning", "caution", "normal"] as const)
        .filter((key) => (context.counts?.[key] ?? 0) > 0)
        .map(
          (key) =>
            `${translate(`consult.examStatus.${key}`)} ${context.counts?.[key]}`,
        )
        .join(" · ")
    : ""

  /*
    한 줄에 하나씩 "이름 값 단위 (상태, 참고범위 …)".
    상태를 괄호에 넣는 이유: 모델이 판정을 다시 하지 않고 **우리 판정을 근거로** 설명하게
    하려는 것이다. 참고범위까지 같이 줘야 "왜 그 판정인지" 를 말할 수 있다.
  */
  const metricLines = context.metrics
    .slice(0, 20)
    .map((metric) => {
      const value = formatValue(metric.value, language)
      const unit = metric.unit ? ` ${metric.unit}` : ""
      const status = translate(`consult.examStatus.${metric.status}`)
      const reference = metric.referenceText?.trim()
        ? `, ${translate("consult.examReference")} ${metric.referenceText.trim()}`
        : ""
      return `- ${metric.label} ${value}${unit} (${status}${reference})`
    })
    .join("\n")

  return [
    translate("consult.examPrompt"),
    "",
    dateLabel ? `[${translate("consult.examDate")}] ${dateLabel}` : null,
    countsLine ? `[${translate("consult.examSummary")}] ${countsLine}` : null,
    metricLines
      ? `[${translate("consult.examMetrics")}]\n${metricLines}`
      : null,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, EXAM_CONSULT_MESSAGE_MAX_LENGTH)
}

// === 파서 — 위 빌더가 만든 텍스트를 카드용 구조로 되돌린다 ===

export interface ParsedExamMetric {
  label: string
  /** 원문 표기 그대로("1.24"). 다시 포맷하지 않는다. */
  value: string
  unit: string
  status: ExamMetricStatus | null
  referenceText: string | null
}

export interface ExamConsultCardData {
  prompt: string
  dateLabel: string | null
  countsLabel: string | null
  metrics: ParsedExamMetric[]
}

const SECTION_LINE_RE = /^\[([^\]]+)\]\s*(.*)$/
/** "- 수축기 혈압 146 mmHg (위험, 참고범위 90~120)" */
const METRIC_LINE_RE = /^-\s*(.+?)\s+([\d.,]+)\s*([^\s(]*)\s*\(([^)]*)\)\s*$/

/**
 * 상태 라벨 → 키. 로케일마다 문자열이 다르므로 **번역기를 통해 만든 표**로 되돌린다.
 * 하드코딩하면 영어 대화를 다시 열었을 때 상태 배지가 전부 사라진다.
 */
function statusFromLabel(
  label: string,
  translate: ExamConsultTranslate,
): ExamMetricStatus | null {
  const trimmed = label.trim()
  for (const key of ["warning", "caution", "normal"] as const) {
    if (translate(`consult.examStatus.${key}`).trim() === trimmed) return key
  }
  return null
}

/**
 * 빌더가 만든 원문이면 카드 데이터를, 아니면 null 을 준다.
 *
 * 판별 기준은 **검진 지표 섹션이 실제로 파싱되는가** 다. 사용자가 손으로 비슷한 글을 써도
 * 이 포맷을 정확히 맞추기는 어렵고, 못 맞추면 그냥 평범한 말풍선으로 보인다(안전한 실패).
 */
export function parseExamConsultMessage(
  raw: string,
  translate: ExamConsultTranslate,
): ExamConsultCardData | null {
  if (!raw.includes("[")) return null

  const lines = raw.split("\n")
  const promptParts: string[] = []
  let dateLabel: string | null = null
  let countsLabel: string | null = null
  const metrics: ParsedExamMetric[] = []

  const dateKey = translate("consult.examDate").trim()
  const summaryKey = translate("consult.examSummary").trim()
  const metricsKey = translate("consult.examMetrics").trim()
  const referenceWord = translate("consult.examReference").trim()

  let seenSection = false
  for (const line of lines) {
    const section = SECTION_LINE_RE.exec(line.trim())
    if (section) {
      seenSection = true
      const [, name, value] = section
      const key = name.trim()
      if (key === dateKey) dateLabel = value.trim() || null
      else if (key === summaryKey) countsLabel = value.trim() || null
      continue
    }

    const metric = METRIC_LINE_RE.exec(line.trim())
    if (metric) {
      const [, label, value, unit, meta] = metric
      const [statusPart, ...rest] = meta.split(",")
      const reference = rest.join(",").trim()
      metrics.push({
        label: label.trim(),
        value: value.trim(),
        unit: unit.trim(),
        status: statusFromLabel(statusPart, translate),
        referenceText: reference.startsWith(referenceWord)
          ? reference.slice(referenceWord.length).trim() || null
          : reference || null,
      })
      continue
    }

    if (!seenSection && line.trim() !== "") promptParts.push(line.trim())
  }

  // 지표가 하나도 없으면 이 포맷이 아니다. 빈 카드를 그리느니 평범한 버블이 낫다.
  if (metrics.length === 0 && !dateLabel && !countsLabel) return null
  // `metricsKey` 는 섹션 존재 확인용으로만 쓴다(라벨 자체는 카드가 자기 문구를 쓴다).
  void metricsKey

  return {
    prompt: promptParts.join(" "),
    dateLabel,
    countsLabel,
    metrics,
  }
}
