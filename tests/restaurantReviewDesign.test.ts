import { readFileSync } from "fs"
import { join } from "path"

/**
 * 식당 후기 작성 화면은 홈 건강기록 6페이지와 같은 시스템(RecordPageShell·recordPageSpec)으로
 * 그려야 한다(2026-09-12). 구 토큰·구 컴포넌트·자체 푸터로 되돌아가면 여기서 잡힌다.
 * 동작 규칙(native-stack 모달의 안쪽 V2DialogHost · 제출 경로 · 이탈 확인 · 주의사항 시트 ·
 * MediaPicker)은 재설계 전과 같아야 한다.
 */
const src = readFileSync(
  join(__dirname, "../src/features/restaurant/views/ReviewWriteScreen.tsx"),
  "utf8",
)
const stripped = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")

describe("restaurant review write — record page system", () => {
  it("uses the record page shell, choices and hint", () => {
    expect(stripped).toMatch(/<RecordPageShell\b/)
    expect(stripped).toMatch(/<RecordRating\b/)
    expect(stripped).not.toMatch(/<RecordChoices\b/)
    expect(stripped).toMatch(/<RecordMultiChoices\b/)
    expect(stripped).toMatch(/<RecordFieldHint\b/)
    expect(stripped).toMatch(
      /from "@\/src\/features\/home\/components\/record\/pages\/recordPageSpec"/,
    )
    expect(stripped).toMatch(/useSurface\(\)/)
    expect(stripped).toMatch(
      /from "@\/src\/design-system-v2\/primitives\/NativeText"/,
    )
  })

  it("keeps the shell contract: parent name in the bar, page title, intro, docked CTA", () => {
    expect(stripped).toMatch(/navigationTitle=\{restaurantName\}/)
    expect(stripped).toMatch(/title=\{t\("restaurant\.review\.form\.title"\)\}/)
    expect(stripped).toMatch(/intro=\{t\("restaurant\.review\.form\.intro"\)\}/)
    expect(stripped).toMatch(
      /ctaLabel=\{t\("restaurant\.review\.form\.submit"\)\}/,
    )
    expect(stripped).toMatch(/ctaDisabled=\{!ready\}/)
    expect(stripped).toMatch(/ctaLoading=\{isSubmitting\}/)
    expect(stripped).toMatch(/onCtaPress=\{\(\) => void submit\(\)\}/)
    // 뒤로가기는 초안 확인을 거친다 — 바로 onClose 를 부르지 않는다.
    expect(stripped).toMatch(/onBack=\{\(\) => void requestClose\(\)\}/)
    expect(stripped).not.toMatch(/onBack=\{onClose\}/)
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
      "useSafeAreaInsets",
      "useV2Theme",
      "primitives.",
      "@/src/shared/components/AppText",
    ]) {
      expect(stripped).not.toContain(legacy)
    }
    expect(stripped).not.toMatch(/#[0-9a-fA-F]{6}\b/)
    // 치수는 recordPageSpec 에서만 온다 — v2 spacing/radius/typography 를 직접 들이지 않는다.
    expect(stripped).not.toMatch(
      /\b(spacing|radius|typography)\s*[,}]\s*[^"]*from "@\/src\/design-system-v2"/,
    )
    expect(stripped).not.toMatch(/\bspacing\[/)
    expect(stripped).not.toMatch(/\bradius\./)
  })

  it("keeps the native-stack modal's own dialog host", () => {
    expect(stripped).toMatch(/<V2DialogHost\s*\/>/)
  })

  it("keeps the submit path, lifecycle, guidelines and media picker", () => {
    expect(stripped).toMatch(/useRestaurantReviews\(\{ restaurantId \}\)/)
    expect(stripped).toMatch(
      /useReviewEditorLifecycle\(\{ draft, submitReview, onClose, onSubmitted \}\)/,
    )
    expect(stripped).toMatch(/reviewDraftDefects\(draft\)/)
    expect(stripped).toMatch(/isReviewDraftReady\(draft\)/)
    expect(stripped).toMatch(/reviewDefectMessageKey\(/)
    expect(stripped).toMatch(/maxLength=\{REVIEW_CONTENT_MAX\}/)
    expect(stripped).toMatch(/<MediaPicker\b/)
    expect(stripped).toMatch(/maxSelection=\{REVIEW_MAX_PHOTOS\}/)
    expect(stripped).toMatch(/<V2Modal\b/)
    expect(stripped).toMatch(/restaurant\.review\.form\.guidelineBody/)
    // 키워드 순서는 카탈로그 순서 그대로 — 선택 여부로 정렬하지 않는다.
    expect(stripped).toMatch(/REVIEW_KEYWORDS\.map\(/)
    expect(stripped).not.toMatch(/REVIEW_KEYWORDS[\s\S]*?\.sort\(/)
  })

  it("has the new copy in both locales", () => {
    for (const locale of ["ko", "en"] as const) {
      const common = JSON.parse(
        readFileSync(
          join(__dirname, `../src/i18n/locales/${locale}/common.json`),
          "utf8",
        ),
      ) as { restaurant: { review: { form: Record<string, string> } } }
      const form = common.restaurant.review.form
      for (const key of ["intro", "ratingOption", "photoLabel"]) {
        expect(`${locale}.${key}: ${form[key] ?? "(없음)"}`).not.toContain(
          "(없음)",
        )
      }
    }
  })
})
