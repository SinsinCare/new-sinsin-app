import i18n from "../src/i18n"
import enHealth from "../src/i18n/locales/en/health.json"
import koHealth from "../src/i18n/locales/ko/health.json"
import {
  formatHealthDate,
  formatShortDate,
} from "../src/features/health/data/dashboardMetrics"

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe("health translations", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("keeps Korean and English health keys in sync", () => {
    expect(leafKeys(enHealth).sort()).toEqual(leafKeys(koHealth).sort())
  })

  it("switches health and OCR copy without restarting the app", async () => {
    await i18n.changeLanguage("en")
    expect(i18n.t("result.fields.gfr", { ns: "health" })).toBe(
      "Glomerular filtration rate (GFR)",
    )
    expect(i18n.t("upload.readResults", { ns: "health" })).toBe(
      "Read lab results",
    )
    expect(
      i18n.t("result.judgements.DISEASE_SUSPECTED.label", { ns: "health" }),
    ).toBe("Possible health condition")
    expect(
      i18n.t("ocrReview.saveSuccessDescription", {
        ns: "health",
        count: 1,
      }),
    ).toBe("Added 1 result to your health records.")

    await i18n.changeLanguage("ko")
    expect(i18n.t("result.fields.gfr", { ns: "health" })).toBe(
      "신사구체 여과율 (GFR)",
    )
    expect(i18n.t("upload.readResults", { ns: "health" })).toBe(
      "검사 수치 읽기",
    )
  })

  it("formats health-check dates for the selected app language", () => {
    expect(formatHealthDate("2023.10.15", "en")).toBe("Oct 15, 2023")
    expect(formatHealthDate("2023-10-15", "ko")).not.toBe("2023-10-15")
    expect(formatShortDate("2023.10.15", "en")).toContain("Oct")
    expect(formatHealthDate("not-a-date", "en")).toBe("not-a-date")
  })
})
