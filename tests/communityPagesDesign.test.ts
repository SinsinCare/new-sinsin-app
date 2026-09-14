import { readFileSync } from "fs"
import { join } from "path"

import { codeOnly } from "./helpers/codeOnly"

/**
 * 커뮤니티 글 작성·수정 페이지와 글 상세의 댓글 영역은 홈 건강기록 6페이지와 같은
 * 시스템(`recordPageSpec` · `RecordChoices` · `useSurface`)으로 그린다(2026-09-12).
 * 구 토큰·원시색·구 컴포넌트로 되돌아가면 여기서 잡힌다. 동작 규칙(초안 가드·REPLACE
 * 함정·댓글 제출 경로·멘션·투표·사진)은 재설계 전과 같아야 한다 — 그 세부는
 * `writeExitTrap` · `writeDraftBackGuard` · `communityWriteSafety` 가 더 깊게 보고,
 * 여기서는 재설계가 그 배선을 건드리지 않았다는 사실만 못 박는다.
 */
const ROOT = join(__dirname, "..")
const read = (relative: string) =>
  codeOnly(readFileSync(join(ROOT, relative), "utf8"))

const EDITOR = read("src/features/recipe/components/FreePostEditor.tsx")
const EDIT_SCREEN = read("src/features/recipe/views/FreePostEditScreen.tsx")
const EDITOR_STYLES = read(
  "src/features/recipe/components/community/communityEditorStyles.ts",
)
const DETAIL = read("src/features/recipe/views/PostDetailScreen.tsx")

/** 댓글 영역 — 행·입력 바 컴포넌트 둘. 화면의 나머지(본문·공유·이어 읽을 글)는 이 잎의 범위 밖이다. */
const COMMENT_AREA = DETAIL.slice(
  DETAIL.indexOf("interface CommentActions"),
  DETAIL.indexOf("export function PostDetailScreen()"),
)
/** 댓글 영역의 스타일 — `commentsSection` 부터 `sendButton` 까지. */
const COMMENT_STYLES = DETAIL.slice(
  DETAIL.indexOf("  commentsSection: {"),
  DETAIL.lastIndexOf("})"),
)

const LEGACY = [
  "ThemedText",
  "ThemedView",
  "useSettingsColors",
  "@/src/theme/tokens",
  "KeyboardAvoidingView",
  "V2BottomCTA",
  "tokens/colors",
  "primitives.",
] as const

const HEX = /#[0-9a-fA-F]{6}\b/u

describe("글 작성·수정 — 기록 페이지 키트", () => {
  it("두 화면이 같은 편집기 스타일 한 벌을 쓰고, 그 벌은 recordPageSpec 에서 치수를 받는다", () => {
    expect(EDITOR_STYLES).toMatch(
      /from "@\/src\/features\/home\/components\/record\/pages\/recordPageSpec"/u,
    )
    for (const token of ["FORM.body", "FORM.label", "FORM.hint", "PAGE_X"]) {
      expect(EDITOR_STYLES).toContain(token)
    }
    expect(EDITOR_STYLES).not.toMatch(HEX)
    for (const screen of [EDITOR, EDIT_SCREEN]) {
      expect(screen).toContain("communityEditorStyles")
      expect(screen).toContain("useSurface()")
    }
  })

  it("주제는 한 줄 행(TopicField)이고 시트 안은 RecordChoices 다 — 작성과 수정 둘 다(Mobbin 2026-09-12)", () => {
    for (const screen of [EDITOR, EDIT_SCREEN]) {
      expect(screen).toMatch(/<TopicField\b/u)
      expect(screen).not.toContain("PostCategorySheet")
      expect(screen).not.toMatch(/<RecordChoices\b/u)
    }
    const TOPIC = read(
      "src/features/recipe/components/community/TopicField.tsx",
    )
    expect(TOPIC).toMatch(/<RecordChoices\b/u)
    expect(TOPIC).toMatch(/<V2BottomSheet\b/u)
  })

  it("제목·본문은 상자 없는 글쓰기 면이다 — 배경·테두리 색을 칠하지 않는다", () => {
    // 면은 작성 화면이 정의하고 수정 화면이 같은 것을 가져다 쓴다 — 두 벌이 되지 않는다.
    expect(EDITOR).toMatch(/export function EditorTextField\(/u)
    const FIELD_SRC = EDITOR.slice(
      EDITOR.indexOf("export function EditorTextField("),
      EDITOR.indexOf("export function FreePostEditor("),
    )
    expect(FIELD_SRC).not.toContain("backgroundColor")
    expect(FIELD_SRC).not.toContain("borderColor")
    expect(FIELD_SRC).toMatch(/selectionColor=\{s\.brand\}/u)
    expect(EDITOR).toMatch(/placeholderTextColor=\{recordFieldLabel\(s\)\}/u)
    expect(EDITOR).toMatch(
      /from "@\/src\/design-system-v2\/primitives\/NativeText"/u,
    )
    expect(EDIT_SCREEN).toMatch(
      /import \{ EditorTextField \} from "\.\.\/components\/FreePostEditor"/u,
    )
    expect((EDIT_SCREEN.match(/<EditorTextField\b/gu) ?? []).length).toBe(2)
    expect((EDITOR.match(/<EditorTextField\b/gu) ?? []).length).toBe(2)
  })

  it("제목·본문 위에 섹션 라벨이 없고(플레이스홀더가 라벨), 첨부 덩어리만 라벨을 단다", () => {
    for (const screen of [EDITOR, EDIT_SCREEN]) {
      expect(screen).toContain('accessibilityLabel={t("freePost.titleLabel")}')
      expect(screen).not.toMatch(/>\s*\{t\("freePost\.titleLabel"\)\}\s*</u)
      expect(screen).not.toContain('t("freePost.bodyLabel")')
      expect(screen).toMatch(/style=\{communityEditorStyles\.page\}/u)
      expect(screen).not.toContain('{t("freePost.tagsLabel")}')
    }
    for (const lang of ["ko", "en"]) {
      const recipe = JSON.parse(
        readFileSync(
          join(ROOT, `src/i18n/locales/${lang}/recipe.json`),
          "utf8",
        ),
      ) as { freePost: Record<string, string> }
      expect(recipe.freePost.bodyLabel.length).toBeGreaterThan(0)
    }
  })

  it("금지 import · hex 리터럴 · fontWeight 단독 · AppText Text 가 없다", () => {
    for (const source of [EDITOR, EDIT_SCREEN, EDITOR_STYLES]) {
      for (const legacy of LEGACY) expect(source).not.toContain(legacy)
      expect(source).not.toMatch(HEX)
      expect(source).not.toMatch(/rgba?\(/u)
      expect(source).not.toMatch(/fontWeight:/u)
      expect(source).not.toMatch(/Pretendard-/u)
      // 글자는 V2Text 한 계보다 — 화면 파일에서 AppText 의 Text 를 다시 들이지 않는다.
      expect(source).not.toMatch(
        /import \{[^}]*\bText\b[^}]*\} from "@\/src\/shared\/components\/AppText"/u,
      )
    }
    // 사진 크게 보기도 한 그릇 — 작성 화면이 따로 검은 오버레이를 그리지 않는다.
    expect(EDITOR).toContain("<CommunityPhotoPreview")
    expect(EDIT_SCREEN).toContain("<CommunityPhotoPreview")
    expect(EDITOR).not.toContain("<AppModal")
  })

  it("자기 도크는 남고 전역 키보드 툴바는 꺼진다(두 겹 금지)", () => {
    for (const screen of [EDITOR, EDIT_SCREEN]) {
      expect(screen).toContain("useSuppressGlobalKeyboardToolbar()")
      expect(screen).toMatch(/<KeyboardStickyView\b/u)
      expect(screen).toMatch(/<KeyboardDismissButton\b/u)
      expect(screen).toContain('accessibilityLabel={t("action.addPhoto")}')
      expect(screen).toContain('accessibilityLabel={t("action.addTag")}')
      // 헤더 닫기는 규격 상자(`headerTouchTarget`)다.
      expect(screen).toMatch(/<HeaderIconButton\b/u)
    }
    expect(EDITOR).toContain('accessibilityLabel={t("freePost.attachPoll")}')
  })

  it("초안 가드·REPLACE 함정·사진 이어 올리기·투표·태그가 그대로다", () => {
    // 작성 — 가드는 등록 성공(id) 뒤 꺼지고, 이동은 가드가 꺼진 다음 렌더에서 한다.
    expect(EDITOR).toContain(
      "usePreventRemove(hasContent && createdPostId === null",
    )
    expect(EDITOR).toContain("router.replace(`/post/${createdPostId}` as Href)")
    expect(EDITOR).toMatch(
      /onConfirm=\{[\s\S]{0,400}afterModalTransitions\(\)\.then\(onClose\)/u,
    )
    expect(EDITOR).toContain(
      "uploadedPathsRef.current[imageUri] = uploaded.objectPath",
    )
    expect(EDITOR).toContain("submitRef.current = handleSubmit")
    expect(EDITOR).toMatch(/<VoteSheet\b/u)
    expect(EDITOR).toMatch(/<VoteAttachCard\b/u)
    expect(EDITOR).toMatch(/<TagInput\b/u)
    expect(EDITOR).toMatch(/<ContentResponsibilityCheck\b/u)
    expect(EDITOR).toContain('surface="free_write"')
    expect(EDITOR).toContain("maxLength={700}")
    // 수정 — 확인창을 그릴 수 없는 갈래에서는 가드를 내린다(`writeExitTrap`).
    expect(EDIT_SCREEN).toContain("usePreventRemove(hasChanges")
    expect(EDIT_SCREEN).toMatch(/const canAskBeforeLeaving =/u)
    expect(EDIT_SCREEN).toMatch(/const POST_GONE_CODE = "COMMUNITY_ERROR_001"/u)
    expect(EDIT_SCREEN).toMatch(/maxLength=\{MAX_BODY_LENGTH\}/u)
    expect(EDIT_SCREEN).toMatch(/\{body\.length\}\/\{MAX_BODY_LENGTH\}/u)
    expect(EDIT_SCREEN).toContain('surface="free_edit"')
    expect(EDIT_SCREEN).toMatch(/<TagInput\b/u)
    for (const screen of [EDITOR, EDIT_SCREEN]) {
      expect(screen).toContain("navigation.dispatch(data.action)")
      expect(screen).toMatch(/<ConfirmExitModal\b/u)
      expect(screen).toContain("imageUploadService.uploadImage(")
      expect(screen).toContain("pickMultipleImages(")
    }
  })
})

describe("글 상세 댓글 — 같은 면, 색 예산", () => {
  it("행·입력 바가 키트 치수(recordPageSpec)와 v2 타이포를 쓴다", () => {
    expect(DETAIL).toMatch(
      /from "@\/src\/features\/home\/components\/record\/pages\/recordPageSpec"/u,
    )
    expect(COMMENT_STYLES).toContain("borderRadius: FIELD.radius")
    expect(COMMENT_STYLES).toContain("commentsTitle: { ...FORM.label")
    expect(COMMENT_STYLES).toContain("commentContent: FORM.body")
    expect(COMMENT_STYLES).toMatch(/commentName: typography\./u)
    expect(COMMENT_STYLES).toMatch(/commentTime: typography\./u)
    expect(COMMENT_STYLES).toMatch(/commentActionText: typography\./u)
    expect(COMMENT_STYLES).not.toMatch(/Pretendard-/u)
    expect(COMMENT_STYLES).not.toMatch(/fontWeight:/u)
    expect(COMMENT_STYLES).not.toMatch(HEX)
    // 댓글 영역의 글자는 V2Text 다 — AppText 의 Text 는 남지 않는다.
    expect(COMMENT_AREA).not.toMatch(/<Text\b/u)
    expect(COMMENT_AREA).toMatch(/<V2Text\b/u)
  })

  it("입력 바는 숫자 칸과 같은 면 — surfaceSunken, 포커스 brand 테두리", () => {
    expect(COMMENT_AREA).toMatch(
      /backgroundColor: focused\s*\? surface\.canvas\s*: surface\.surfaceSunken/u,
    )
    expect(COMMENT_AREA).toMatch(
      /borderColor: focused\s*\? surface\.brand\s*: surface\.surfaceSunken/u,
    )
    expect(COMMENT_AREA).toContain("onFocus={() => setFocused(true)}")
    expect(COMMENT_AREA).toContain("onBlur={() => setFocused(false)}")
    expect(DETAIL).toMatch(
      /import \{ TextInput \} from "@\/src\/design-system-v2\/primitives\/NativeText"/u,
    )
  })

  it("색 예산 — 브랜드색은 활성 좋아요에만, 멘션 칩·아바타는 중성 면", () => {
    // 좋아요 하트·숫자만 `liked` 일 때 brand.
    expect(COMMENT_AREA).toMatch(
      /color=\{comment\.liked \? surface\.brand : surface\.text\}/u,
    )
    // 그 밖의 `surface.brand` 는 입력 커서·포커스 테두리뿐이다.
    const brandUses = COMMENT_AREA.match(/surface\.brand/gu) ?? []
    expect(brandUses.length).toBe(4)
    expect(COMMENT_AREA).not.toContain("surface.surfaceBrand")
    expect(COMMENT_AREA).toMatch(
      /styles\.commentAvatar,\s*\{ backgroundColor: surface\.surfaceSunken \}/u,
    )
    expect(COMMENT_AREA).toMatch(
      /styles\.mentionChip,\s*\{\s*backgroundColor: surface\.surfaceSunken,\s*borderColor: surface\.textStrong/u,
    )
    for (const legacy of [
      "ThemedText",
      "useSettingsColors",
      "@/src/theme/tokens",
    ]) {
      expect(DETAIL).not.toContain(legacy)
    }
    expect(COMMENT_AREA).not.toContain("primitives.")
    expect(COMMENT_STYLES).not.toContain("primitives.")
  })

  it("터치 — 좋아요·답글·더보기·보내기·키보드 내리기가 규격 상자다", () => {
    expect(COMMENT_STYLES).toMatch(/commentAction: \{\s*minHeight: MIN\.TOUCH/u)
    expect(COMMENT_STYLES).toMatch(/sendButton: \{\s*width: 44,\s*height: 44/u)
    expect(COMMENT_STYLES).toMatch(
      /keyboardDismiss: \{\s*width: MIN\.TOUCH,\s*height: MIN\.TOUCH/u,
    )
    expect(COMMENT_STYLES).toMatch(/sortChoice: \{ minHeight: MIN\.TOUCH/u)
    // 답글 버튼도 좋아요와 같은 44 상자를 쓴다(예전엔 글자만 있었다).
    expect(COMMENT_AREA).toMatch(
      /onPress=\{\(\) => onReply\(comment\)\}[\s\S]{0,120}style=\{styles\.commentAction\}/u,
    )
    // 음수 마진으로 자리를 만들지 않는다 — 안드로이드는 부모 밖 터치를 자식에게 안 준다.
    expect(COMMENT_STYLES).not.toMatch(/margin\w*:\s*-/u)
  })

  it("댓글 제출·수정·답글·좋아요·더보기·신고 경로가 그대로다", () => {
    expect(COMMENT_AREA).toContain("hasSubmittableComment(text, baseline)")
    expect(COMMENT_AREA).toContain(
      "if (await onSubmit({ content, mentions })) reset()",
    )
    expect(COMMENT_AREA).toContain("retainedMentions(content, pickedMentions)")
    expect(COMMENT_AREA).toMatch(/<MentionSuggestions\b/u)
    expect(COMMENT_AREA).toContain("useCommentDraftGuard(")
    expect(COMMENT_AREA).toMatch(
      /\{!comment\.isDeleted && \(\s*<View style=\{styles\.commentNameRow\}>/u,
    )
    expect(COMMENT_AREA).toContain("onPress={() => onToggleLike(comment)}")
    expect(COMMENT_AREA).toContain("onPress={() => onMore(comment, isReply)}")
    expect(DETAIL).toContain(
      "await updateComment({ commentId: editingCommentId, content, mentions })",
    )
    expect(DETAIL).toMatch(/await createComment\(\{/u)
    expect(DETAIL).toContain("await toggleCommentLike(comment.id)")
    expect(DETAIL).toContain("await deleteComment(comment.id)")
    expect(DETAIL).toMatch(/await reportComment\(\{/u)
    expect(DETAIL).toMatch(/scope: "community-comment-save"/u)
    expect(DETAIL).toMatch(/scope: "community-comment-like"/u)
    expect(DETAIL).toContain("onSubmit={submitComment}")
    expect(DETAIL).toContain("useSuppressGlobalKeyboardToolbar()")
  })
})
