import {
  getLegalDocumentRoute,
  getTermConsentAccessibilityLabel,
} from "../src/features/auth/data/termsAgreementFlow"
import { TERMS } from "../src/features/auth/data/terms"

describe("terms agreement presentation contracts", () => {
  it("keeps required and optional consent labels distinguishable", () => {
    expect(getTermConsentAccessibilityLabel(TERMS[0])).toBe(
      "필수 서비스 이용약관",
    )
    expect(getTermConsentAccessibilityLabel(TERMS[2])).toBe(
      "선택 마케팅 정보 수신",
    )
  })

  it("keeps each legal document type in the existing route params", () => {
    expect(getLegalDocumentRoute("terms-of-use")).toEqual({
      pathname: "/legal-document",
      params: { type: "terms-of-use" },
    })
    expect(getLegalDocumentRoute("privacy-policy")).toEqual({
      pathname: "/legal-document",
      params: { type: "privacy-policy" },
    })
  })
})
