/**
 * 빌더 ↔ 파서 왕복.
 *
 * 서버에는 **텍스트만** 저장된다. 대화를 다시 열면 그 텍스트를 파서가 되돌려 카드를 그리므로,
 * 둘 중 하나만 바뀌면 카드가 조용히 평범한 말풍선으로 퇴화한다(오류도 안 난다).
 * 그 조용한 퇴화를 여기서 잡는다.
 */

import {
  buildExamConsultMessage,
  parseExamConsultMessage,
  type ExamConsultContext,
} from "@/src/features/consultation/utils/examConsultMessage"

/** 실제 i18n 대신 쓰는 최소 번역기. 키가 곧 값이 되지 않도록 한국어 문구를 준다. */
const KO: Record<string, string> = {
  "consult.examPrompt": "제 건강검진 결과를 함께 봐주세요.",
  "consult.examDate": "검진일",
  "consult.examSummary": "요약",
  "consult.examMetrics": "검사 수치",
  "consult.examReference": "참고범위",
  "consult.examStatus.warning": "위험",
  "consult.examStatus.caution": "주의",
  "consult.examStatus.normal": "정상",
}
const EN: Record<string, string> = {
  "consult.examPrompt": "Please look at my results.",
  "consult.examDate": "Screening date",
  "consult.examSummary": "Summary",
  "consult.examMetrics": "Lab values",
  "consult.examReference": "reference",
  "consult.examStatus.warning": "At risk",
  "consult.examStatus.caution": "Caution",
  "consult.examStatus.normal": "Normal",
}
const translateWith = (table: Record<string, string>) => (key: string) =>
  table[key] ?? key

const CONTEXT: ExamConsultContext = {
  checkupDate: "2026.05.21",
  checkupDateLabel: "2026년 5월",
  counts: { warning: 2, caution: 5, normal: 1 },
  metrics: [
    {
      label: "수축기 혈압",
      value: 146,
      unit: "mmHg",
      status: "warning",
      referenceText: "90~120",
    },
    {
      label: "혈청 크레아티닌",
      value: 1.24,
      unit: "mg/dL",
      status: "caution",
      referenceText: "0.5~1.2",
    },
    { label: "혈색소", value: 12.9, unit: "g/dL", status: "normal" },
  ],
}

describe("건강검진 상담 메시지", () => {
  it("빌더가 만든 텍스트를 파서가 그대로 되돌린다", () => {
    const t = translateWith(KO)
    const text = buildExamConsultMessage(CONTEXT, "ko", t)
    const parsed = parseExamConsultMessage(text, t)

    expect(parsed).not.toBeNull()
    expect(parsed?.dateLabel).toBe("2026년 5월")
    expect(parsed?.countsLabel).toBe("위험 2 · 주의 5 · 정상 1")
    expect(parsed?.metrics).toHaveLength(3)

    const [systolic, creatinine, hemoglobin] = parsed!.metrics
    expect(systolic).toMatchObject({
      label: "수축기 혈압",
      value: "146",
      unit: "mmHg",
      status: "warning",
      referenceText: "90~120",
    })
    // 소수점이 있는 값은 표기가 보존돼야 한다 — 다시 반올림하면 화면과 대화가 달라진다.
    expect(creatinine.value).toBe("1.24")
    expect(creatinine.status).toBe("caution")
    // 참고범위가 없는 항목은 null 이지 빈 문자열이 아니다.
    expect(hemoglobin.referenceText).toBeNull()
    expect(hemoglobin.status).toBe("normal")
  })

  it("영어에서도 왕복한다 (상태 라벨을 하드코딩하지 않는다)", () => {
    const t = translateWith(EN)
    const text = buildExamConsultMessage(CONTEXT, "en", t)
    const parsed = parseExamConsultMessage(text, t)

    expect(parsed?.metrics[0]?.status).toBe("warning")
    expect(parsed?.metrics[2]?.status).toBe("normal")
    expect(parsed?.countsLabel).toBe("At risk 2 · Caution 5 · Normal 1")
  })

  it("0 인 상태는 요약에서 빠진다", () => {
    const t = translateWith(KO)
    const text = buildExamConsultMessage(
      { ...CONTEXT, counts: { warning: 0, caution: 3, normal: 0 } },
      "ko",
      t,
    )
    expect(parseExamConsultMessage(text, t)?.countsLabel).toBe("주의 3")
  })

  it("지표 한 개만 보낼 수도 있다 (지표 카드 탭)", () => {
    const t = translateWith(KO)
    const text = buildExamConsultMessage(
      { checkupDateLabel: "2026년 5월", metrics: [CONTEXT.metrics[0]] },
      "ko",
      t,
    )
    const parsed = parseExamConsultMessage(text, t)
    expect(parsed?.metrics).toHaveLength(1)
    expect(parsed?.countsLabel).toBeNull()
  })

  it("검진 포맷이 아닌 평범한 문장은 카드가 되지 않는다", () => {
    const t = translateWith(KO)
    expect(parseExamConsultMessage("신장에 좋은 음식이 뭔가요?", t)).toBeNull()
    // 대괄호가 있어도 지표가 없으면 카드가 아니다.
    expect(parseExamConsultMessage("[메모] 오늘 병원 다녀옴", t)).toBeNull()
  })

  it("프롬프트 문장이 실제로 앞에 실린다 (모델이 무엇을 요청받는지)", () => {
    const t = translateWith(KO)
    const text = buildExamConsultMessage(CONTEXT, "ko", t)
    expect(text.startsWith(KO["consult.examPrompt"])).toBe(true)
    // 수치가 본문에 실제로 들어가야 한다 — 이게 빠져서 모델이 되물었다.
    expect(text).toContain("146")
    expect(text).toContain("mmHg")
    expect(text).toContain("90~120")
  })
})
