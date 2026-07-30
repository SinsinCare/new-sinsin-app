import i18n from "@/src/i18n"
import type { TermItem } from "../types"

const TERM_DEFINITIONS = [
  {
    id: "service",
    labelKey: "terms.service",
    required: true,
    documentType: "terms-of-use",
  },
  {
    id: "privacy",
    labelKey: "terms.privacy",
    required: true,
    documentType: "privacy-policy",
  },
  {
    id: "marketing",
    labelKey: "terms.marketing",
    required: false,
  },
] as const

export function getTerms(): TermItem[] {
  return TERM_DEFINITIONS.map(({ labelKey, ...term }) => ({
    ...term,
    label: i18n.t(labelKey, { ns: "auth" }),
  }))
}

/** 기본 언어의 정적 스냅샷. 화면에서는 언어 변경에 반응하는 getter를 사용한다. */
export const TERMS = getTerms()
