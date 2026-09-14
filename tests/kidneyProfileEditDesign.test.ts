import { readFileSync } from "fs"
import { join } from "path"

/**
 * 신장 건강 정보 수정 화면은 홈 건강기록 6페이지와 같은 시스템(RecordPageShell·recordPageSpec)으로
 * 그려야 한다(2026-09-12). 구 토큰·구 컴포넌트로 되돌아가면 여기서 잡힌다. 동작 규칙(정본 stage
 * 3값·체중 touched·서버 필드 오류 매핑)은 재설계 전과 같아야 한다.
 */
const src = readFileSync(
  join(__dirname, "../src/features/settings/views/KidneyProfileEditScreen.tsx"),
  "utf8",
)
const stripped = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")

describe("kidney profile edit — record page system", () => {
  it("uses the record page shell and fields", () => {
    expect(stripped).toMatch(/<RecordPageShell\b/)
    expect(stripped).toMatch(/<RecordNumberField\b/)
    expect(stripped).toMatch(/<RecordChoices\b/)
    expect(stripped).toMatch(/<RecordMultiChoices\b/)
    expect(stripped).toMatch(/<RecordFieldHint\b/)
    expect(stripped).toMatch(
      /from "@\/src\/features\/home\/components\/record\/pages\/recordPageSpec"/,
    )
  })
  it("no longer imports the legacy surface or layout pieces", () => {
    for (const legacy of [
      "ThemedText",
      "ThemedView",
      "useSettingsColors",
      "@/src/theme/tokens",
      "KeyboardAvoidingView",
      "V2BottomCTA",
      "ScreenHeader",
    ]) {
      expect(stripped).not.toContain(legacy)
    }
    expect(stripped).not.toMatch(/#[0-9a-fA-F]{6}\b/)
  })
  it("keeps the save rules", () => {
    expect(stripped).toMatch(/toServerStage\(ckdStage, onDialysis\)/)
    expect(stripped).toMatch(/weightTouchedRef\.current\s*&&/)
    expect(stripped).toMatch(/mapKidneyProfileServerFieldErrors\(/)
    expect(stripped).toMatch(/api\.patch\("\/user\/profile\/kidney"/)
    expect(stripped).toMatch(
      /useState<string \| null \| undefined>\(undefined\)/,
    )
  })
})

describe("kidney profile edit — date picker on the record kit", () => {
  const picker = readFileSync(
    join(__dirname, "../src/features/settings/components/DatePickerModal.tsx"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")
  it("is a V2BottomSheet with RecordChoices months and a footer CTA", () => {
    expect(picker).toMatch(/<V2BottomSheet\b/)
    expect(picker).toMatch(/<RecordChoices\b/)
    expect(picker).toMatch(/footer=\{/)
    expect(picker).toMatch(/surface="settings_diagnosis_date"/)
  })
  it("drops the legacy surface pieces", () => {
    for (const legacy of [
      "ThemedText",
      "useSettingsColors",
      "@/src/theme/tokens",
      "AppModal",
    ]) {
      expect(picker).not.toContain(legacy)
    }
    expect(picker).not.toMatch(/#[0-9a-fA-F]{6}\b/)
  })
})
