import { readFileSync } from "fs"
import { join } from "path"

import { codeOnly } from "./helpers/codeOnly"

/**
 * 커뮤니티 글쓰기·글수정 — Mobbin 조사(2026-09-12: 당근 동네생활 글쓰기 · Reddit 새 글 ·
 * Threads · X)의 공통 관습으로 재설계했다. 되돌아가면 여기서 잡힌다.
 *
 *  ① 주제는 페이지 위 칩 격자가 아니라 **한 줄 행**(선택값 + chevron) → 바텀시트.
 *  ② 제목·본문은 **상자 없이** 흰 면 위에 바로(제목 title.small, 본문 FORM.body), 라벨 없음.
 *  ③ 하단 도크는 사진·투표·태그 라벨 아이콘, 오른쪽 키보드 내리기.
 *  ④ 책임 확인은 주제 아래 배너 자리.
 */
const ROOT = join(__dirname, "..")
const read = (relative: string) =>
  codeOnly(readFileSync(join(ROOT, relative), "utf8"))

const EDITOR = read("src/features/recipe/components/FreePostEditor.tsx")
const EDIT_SCREEN = read("src/features/recipe/views/FreePostEditScreen.tsx")
const STYLES = read(
  "src/features/recipe/components/community/communityEditorStyles.ts",
)
const TOPIC = read("src/features/recipe/components/community/TopicField.tsx")

describe("글쓰기 — 당근 + Reddit 관습", () => {
  it("① 주제 행: '주제' 캡션 + 선택값 + chevronRight, 가장자리까지, 아래 hairline; 탭하면 시트, 고르면 바로 닫힌다", () => {
    expect(TOPIC).toMatch(/accessibilityRole="button"/u)
    expect(TOPIC).toMatch(/name="chevronRight"/u)
    expect(TOPIC).toContain('{t("freePost.topicTitle")}')
    expect(TOPIC).toMatch(/onPress=\{\(\) => setOpen\(true\)\}/u)
    expect(TOPIC).toMatch(
      /onChange=\{\(next\) => \{\s*onChange\(next\)\s*setOpen\(false\)\s*\}\}/u,
    )
    expect(TOPIC).toContain('surface="community_post_category"')
    expect(TOPIC).toMatch(/paddingHorizontal: PAGE_X/u)
    expect(TOPIC).toMatch(/borderBottomColor: s\.hairline/u)
    expect(TOPIC).toMatch(/minHeight: MIN\.TOUCH/u)
    for (const screen of [EDITOR, EDIT_SCREEN]) {
      // 주제 행은 `page`(좌우 여백) 바깥, 스크롤 맨 위.
      expect(screen.indexOf("<TopicField")).toBeLessThan(
        screen.indexOf("style={communityEditorStyles.page}"),
      )
    }
  })

  it("② 제목은 20 semibold, 본문은 본문 글자, 둘 다 상자·라벨 없음; 본문 플레이스홀더는 주제별", () => {
    expect(STYLES).toMatch(
      /titleInput: \{\s*\.\.\.typography\.title\.smallWeak,/u,
    )
    expect(STYLES).toMatch(/bodyInput: \{\s*\.\.\.FORM\.body,/u)
    expect(STYLES).toMatch(/field: \{ justifyContent: "center" \}/u)
    expect(STYLES).not.toMatch(/field: \{[^}]*borderRadius/u)
    for (const screen of [EDITOR, EDIT_SCREEN]) {
      const before = screen.slice(0, screen.indexOf("<EditorTextField"))
      expect(before.slice(-400)).not.toMatch(/communityEditorStyles\.label/u)
      expect(screen).toMatch(
        /placeholder=\{t\("freePost\.titlePlaceholder"\)\}/u,
      )
      expect(screen).toContain(
        "freePost.bodyPlaceholderByTopic.${selectedCategory}",
      )
    }
  })

  it("③ 당근의 '안내'(상자 없는 한 줄, 체크박스 없음)가 주제 행 다음, 제목 앞 — 작성 화면만", () => {
    expect(STYLES).toMatch(/notice: \{/u)
    // 상자 없는 한 줄 — 배경을 칠하지 않아 왼쪽 정렬선(PAGE_X)이 그대로다.
    expect(EDITOR).toMatch(/style=\{communityEditorStyles\.notice\}/u)
    expect(STYLES).not.toMatch(/notice: \{[^}]*backgroundColor/u)
    expect(EDITOR).toContain('{t("freePost.noticeLabel")}')
    const topic = EDITOR.indexOf("<TopicField")
    const notice = EDITOR.indexOf("communityEditorStyles.notice")
    const title = EDITOR.indexOf("<EditorTextField")
    expect(notice).toBeGreaterThan(topic)
    expect(title).toBeGreaterThan(notice)
    expect(EDIT_SCREEN).not.toContain("communityEditorStyles.notice")
    expect(EDITOR).not.toMatch(/<Checkbox\b/u)
  })

  it("④ 책임 확인은 등록을 누를 때 시트로 한 번 — 확인이 곧 동의, 이어서 바로 올린다", () => {
    const CONSENT = read(
      "src/features/recipe/components/ContentResponsibilityCheck.tsx",
    )
    expect(CONSENT).toMatch(/<V2BottomSheet\b/u)
    expect(CONSENT).toContain('surface="community_post_consent"')
    expect(CONSENT).toContain('{t("responsibility")}')
    expect(EDITOR).toMatch(
      /if \(!agreed\) \{\s*Keyboard\.dismiss\(\)\s*setConsentVisible\(true\)\s*return\s*\}/u,
    )
    expect(EDITOR).toMatch(
      /setResponsibilityAgreed\(true\)\s*void afterModalTransitions\(\)\.then\(\(\) => submitRef\.current\(true\)\)/u,
    )
    // 등록 버튼은 제목·본문만 보고 켜진다(동의로 잠그지 않는다).
    expect(EDITOR).toMatch(
      /const canSubmit = title\.trim\(\)\.length > 0 && body\.trim\(\)\.length > 0/u,
    )
    expect(EDIT_SCREEN).not.toContain("<ContentResponsibilityCheck")
  })

  it("⑤ Reddit: 등록/저장은 pill 버튼, 제목 아래 '태그 추가 (선택)' 칩; 도크는 사진·투표 + 카운터·키보드 내리기", () => {
    expect(STYLES).toMatch(/submit: \{[^}]*borderRadius: 999/u)
    expect(STYLES).toMatch(/tagChip: \{/u)
    // 위계 세 단: 제목 20 → 본문 15 → 칩·pill·캡션 13.
    expect(STYLES).toMatch(/submitLabel: typography\.label\.xSmall/u)
    expect(STYLES).toMatch(/tagChipLabel: typography\.label\.xSmall/u)
    // 덩어리 사이 24, 제목↔칩 12, 칩↔본문 16 — 선이 아니라 여백으로 가른다.
    expect(STYLES).toMatch(/page: \{[^}]*gap: FORM\.sectionGap/u)
    expect(STYLES).toMatch(/paper: \{ gap: S\[4\] \}/u)
    expect(STYLES).toMatch(/paperHead: \{ gap: S\[3\] \}/u)
    for (const screen of [EDITOR, EDIT_SCREEN]) {
      expect(screen).toMatch(/style=\{communityEditorStyles\.paper\}/u)
      expect(screen).toMatch(/style=\{communityEditorStyles\.paperHead\}/u)
    }
    for (const screen of [EDITOR, EDIT_SCREEN]) {
      expect(screen).toMatch(
        /communityEditorStyles\.submit,\s*\{\s*backgroundColor:/u,
      )
      expect(screen).toContain('accessibilityLabel={t("action.addTag")}')
      expect(screen).toContain('{t("freePost.addTagsOptional")}')
      expect(screen).toMatch(/<KeyboardStickyView\b/u)
      expect(screen).toMatch(/<KeyboardDismissButton\b/u)
      expect(screen).toContain('{t("freePost.photoVideo")}')
      expect(screen).toMatch(/communityEditorStyles\.toolbarTrailing/u)
      // 태그는 제목 아래 칩이지 도크 도구가 아니다.
      const dock = screen.slice(screen.indexOf("<KeyboardStickyView"))
      expect(dock).not.toContain('t("action.addTag")')
    }
    expect(EDITOR).toContain('accessibilityLabel={t("freePost.attachPoll")}')
    expect(EDITOR).toContain('{t("freePost.pollTool")}')
  })

  it("문구는 두 언어에 있다", () => {
    for (const lang of ["ko", "en"]) {
      const recipe = JSON.parse(
        readFileSync(
          join(ROOT, `src/i18n/locales/${lang}/recipe.json`),
          "utf8",
        ),
      ) as { freePost: Record<string, unknown> }
      for (const key of [
        "topicTitle",
        "topicPlaceholder",
        "topicSheetTitle",
        "topicAccessibility",
        "titlePlaceholder",
        "noticeLabel",
        "noticeBody",
        "addTagsOptional",
        "pollTool",
        "consentTitle",
        "consentConfirm",
        "consentHint",
      ]) {
        expect((recipe.freePost[key] as string)?.length ?? 0).toBeGreaterThan(0)
      }
      const byTopic = recipe.freePost.bodyPlaceholderByTopic as Record<
        string,
        string
      >
      for (const k of [
        "diet",
        "numbers",
        "symptoms",
        "medicine",
        "dining-out",
        "daily",
      ]) {
        expect(byTopic[k]?.length ?? 0).toBeGreaterThan(0)
      }
    }
  })
})
