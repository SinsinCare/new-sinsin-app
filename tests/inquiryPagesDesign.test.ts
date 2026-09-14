import { readFileSync } from "fs"
import { join } from "path"

/**
 * 1:1 문의 목록·작성 화면은 홈 건강기록 6페이지와 같은 시스템(RecordPageShell·recordPageSpec·
 * V2 목록 컴포넌트)으로 그려야 한다(2026-09-12). 구 토큰·구 컴포넌트로 되돌아가면 여기서
 * 잡힌다. 동작 규칙(제출 경로·목록 무효화·사진 한도·쓰다 나가면 확인)은 재설계 전과 같아야 한다.
 */
function read(relative: string): string {
  return readFileSync(join(__dirname, "..", relative), "utf8").replace(
    /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
    "",
  )
}

const list = read("src/features/settings/views/InquiryListScreen.tsx")
const write = read("src/features/settings/views/InquiryScreen.tsx")

const LEGACY = [
  "ThemedText",
  "ThemedView",
  "useSettingsColors",
  "@/src/theme/tokens",
  "KeyboardAvoidingView",
  "V2BottomCTA",
  "V2TextField",
  "primitives.",
]

describe("inquiry list — record page system", () => {
  it("uses the v2 list kit and the record page spec", () => {
    expect(list).toMatch(/<V2ScreenHeader\b/)
    expect(list).toMatch(/<V2ListRow\b/)
    expect(list).toMatch(/<V2Divider\b/)
    expect(list).toMatch(/<V2EmptyState\b/)
    expect(list).toMatch(/<V2ErrorState\b/)
    expect(list).toMatch(/<V2Badge\b/)
    expect(list).toMatch(/useSurface\(\)/)
    expect(list).toMatch(
      /from "@\/src\/features\/home\/components\/record\/pages\/recordPageSpec"/,
    )
    // 하단 고정 CTA 는 셸과 같은 규격에서 온다.
    expect(list).toMatch(/CTA\.height/)
    expect(list).toMatch(/CTA\.radius/)
    expect(list).toMatch(/FOOTER_FADE/)
  })
  it("keeps the status badges grayscale (colour budget)", () => {
    expect(list).not.toMatch(/color=\{answered \? "(brand|green)"/)
    expect(list).toMatch(/color=\{answered \? "ink" : "neutral"\}/)
  })
  it("no longer imports the legacy surface or layout pieces", () => {
    for (const legacy of LEGACY) expect(list).not.toContain(legacy)
    expect(list).not.toContain('"ScreenHeader"')
    expect(list).not.toMatch(/#[0-9a-fA-F]{6}\b/)
  })
  it("keeps the list behaviour", () => {
    expect(list).toMatch(/useInquiryList\(\)/)
    expect(list).toMatch(/surface: "settings_inquiry"/)
    expect(list).toMatch(/isInquiryAnswered\(item\)/)
    expect(list).toMatch(/splitInquirySubject\(item\.subject\)/)
    expect(list).toMatch(/parseServerDate\(value\)/)
    expect(list).toMatch(/router\.push\("\/\(settings\)\/inquiry-new"\)/)
    expect(list).toMatch(/item\.answer\b/)
    expect(list).toMatch(/COLLAPSED_CONTENT_LINES/)
  })
})

describe("inquiry write — record page system", () => {
  it("uses the record page shell, choices, hints and the spec", () => {
    expect(write).toMatch(/<RecordPageShell\b/)
    expect(write).toMatch(/<RecordChoices\b/)
    expect(write).toMatch(/<RecordFieldHint\b/)
    expect(write).toMatch(/useSurface\(\)/)
    expect(write).toMatch(
      /from "@\/src\/design-system-v2\/primitives\/NativeText"/,
    )
    expect(write).toMatch(
      /from "@\/src\/features\/home\/components\/record\/pages\/recordPageSpec"/,
    )
    expect(write).toMatch(/singleLineInputText\(/)
  })
  it("no longer imports the legacy surface or layout pieces", () => {
    for (const legacy of [
      ...LEGACY,
      "KeyboardStickyView",
      "KeyboardAwareScrollView",
      "useSafeAreaInsets",
      "V2Chip",
    ]) {
      expect(write).not.toContain(legacy)
    }
    expect(write).not.toContain('"ScreenHeader"')
    expect(write).not.toMatch(/#[0-9a-fA-F]{6}\b/)
  })
  it("keeps the submit path and its rules", () => {
    expect(write).toMatch(/await submitInquiry\(\{/)
    expect(write).toMatch(
      /subject: `\[\$\{categoryLabel\}\] \$\{trimmedTitle\}`/,
    )
    expect(write).toMatch(/queryKey: INQUIRY_LIST_QUERY_KEY/)
    expect(write).toMatch(/scope: "inquiry-submit"/)
    expect(write).toMatch(/const MAX_SUBJECT = 200/)
    expect(write).toMatch(/const MAX_CONTENT = 2000/)
    expect(write).toMatch(/MAX_INQUIRY_PHOTOS - photos\.length/)
    expect(write).toMatch(/requestMediaLibraryPermissionsAsync\(\)/)
    expect(write).toMatch(/showOpenSettingsAlert\(/)
    expect(write).toMatch(/showConfirm\(\{/)
    expect(write).toMatch(/showSuccessToast\(/)
    expect(write).toMatch(/ctaDisabled=\{!canSubmit\}/)
  })
  it("adds its copy to both locales", () => {
    for (const locale of ["ko", "en"]) {
      const json = JSON.parse(
        readFileSync(
          join(__dirname, `../src/i18n/locales/${locale}/settings.json`),
          "utf8",
        ),
      ) as { inquiry: { write: { title: string; intro: string } } }
      expect(json.inquiry.write.title.length).toBeGreaterThan(0)
      expect(json.inquiry.write.intro.length).toBeGreaterThan(0)
    }
  })
})
