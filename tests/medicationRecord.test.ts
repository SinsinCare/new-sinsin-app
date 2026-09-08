/**
 * 약 복용 홈 타일 — 시트가 아니라 독립 페이지로 간다(2026-09-05). 간편 1회 기록 경로는
 * 2026-09-08 에 지웠다: 타일은 `/record/medication` 을 열고, 그 페이지는 `MedicationDiaryPage` 다.
 */
import fs from "fs"
import path from "path"

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("medication home tile", () => {
  it("opens the diary page and never records a quick dose from the tile", () => {
    const home = read("src/features/home/components/record/RecordView.tsx")
    expect(home).toContain("onPress: openMedicationPage")
    expect(home).toContain('pathname: "/record/medication"')
    expect(home).not.toContain("recordIntake(")
    expect(
      fs.existsSync(
        path.join(process.cwd(), "src/services/data/medicationService.ts"),
      ),
    ).toBe(false)
    const route = read("src/features/home/views/MedicationRecordScreen.tsx")
    expect(route).toContain("<MedicationDiaryPage")
  })
  it("shows progress on the tile when plans exist, and no stale 'coming soon' copy remains", () => {
    const ko = JSON.parse(read("src/i18n/locales/ko/common.json"))
    expect(ko.home.medication.progress).toContain("{{planned}}")
    expect(JSON.stringify(ko.home.medication)).not.toContain("곧 업데이트")
    expect(ko.home.medication.confirmBody).toBeUndefined()
  })
})
