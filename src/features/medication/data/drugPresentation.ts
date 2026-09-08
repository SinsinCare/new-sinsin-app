import type { Drug } from "../types"

/**
 * 검색 결과·후보 줄의 둘째 줄(RQ-15 "제조사와 효능군").
 *
 * 효능군은 낱알식별의 분류명(예: "혈압강하제")이 가장 짧고 정확하다. 그것이 없는
 * 일반의약품은 e약은요 효능 원문의 **첫 문장**만 쓴다 — 원문 수백 자를 그대로 노출하지
 * 않는다(기획 §6-1). 둘 다 없으면 제조사만 남는다. 임의 문구를 만들지 않는다.
 */
export function drugSummary(
  drug: Pick<Drug, "manufacturer" | "category" | "efficacy">,
): string {
  return [
    drug.manufacturer,
    drug.category || firstSentence(drug.efficacy ?? ""),
  ]
    .filter(Boolean)
    .join(" · ")
}
/** 효능 원문에서 첫 문장(마침표·줄바꿈 전)만. 60자를 넘으면 자른다. */
export function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (!cleaned) return ""
  const cut = cleaned.split(/(?<=[.。])\s|\n/u)[0] ?? cleaned
  const sentence = cut.replace(/^이 약은\s*/u, "").replace(/[.。]$/u, "")
  return sentence.length > 60 ? `${sentence.slice(0, 59)}…` : sentence
}
/** 셋째 줄: 주성분. 없으면 빈 문자열(줄을 그리지 않는다). */
export function drugIngredientLine(drug: Pick<Drug, "ingredients">): string {
  return drug.ingredients.trim()
}
/** 전문/일반 배지 문구. 데이터가 없으면 배지를 그리지 않는다. */
export function drugBadge(drug: Pick<Drug, "etcOtc">): "rx" | "otc" | null {
  if (drug.etcOtc === "전문의약품") return "rx"
  if (drug.etcOtc === "일반의약품") return "otc"
  return null
}
