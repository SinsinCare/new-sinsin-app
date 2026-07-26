import type { TermItem } from "../types"

export function getTermConsentAccessibilityLabel(term: TermItem): string {
  return `${term.required ? "필수" : "선택"} ${term.label}`
}

/** Keeps the legal document route contract shared by all consent rows. */
export function getLegalDocumentRoute(
  documentType: NonNullable<TermItem["documentType"]>,
) {
  return {
    pathname: "/legal-document" as const,
    params: { type: documentType },
  }
}
