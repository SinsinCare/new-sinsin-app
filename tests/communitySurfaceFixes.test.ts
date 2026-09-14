/**
 * 커뮤니티 표면의 엣지 케이스 일곱 — **고친 자리를 되돌리면 여기가 깨진다.**
 *
 * 이 파일이 한 벌인 이유: 일곱 결함이 서로 다른 층(오류 시스템 · i18n 카탈로그 ·
 * 카드 컴포넌트 · 감사 스크립트)에 흩어져 있지만 **하나의 화면 묶음**에서 났고,
 * 다음 사람이 "커뮤니티 카드가 왜 이렇게 돼 있지" 를 물을 때 답이 한 곳에 있어야
 * 하기 때문이다. 각 describe 머리에 무엇이 결함이었는지 적어 둔다.
 *
 * 화면 렌더 대신 **소스 계약**으로 보는 자리가 있다(`communityDesignContract` 와 같은
 * 방식이다 — 이 저장소의 jest 는 RN 을 스텁으로 바꿔 두어 컴포넌트를 마운트할 수 없다).
 * 소스를 읽는 단언은 주석을 먼저 걷어낸다 — 안 그러면 "왜 이렇게 했는지" 적어 둔 문장이
 * 계약을 대신 만족시킨다.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { join } from "node:path"

import { createInstance } from "i18next"

import { getErrorBehavior } from "@/src/lib/errorMessage/catalog"
import { getSurfacePalette } from "@/src/theme/surface"

import { contrast } from "./helpers/contrast"
import { formatCount } from "@/src/features/recipe/utils/displayNumber"
import enCommon from "@/src/i18n/locales/en/common.json"
import enRecipe from "@/src/i18n/locales/en/recipe.json"
import koCommon from "@/src/i18n/locales/ko/common.json"
import koRecipe from "@/src/i18n/locales/ko/recipe.json"

const ROOT = join(__dirname, "..")

/**
 * 줄·블록 주석을 걷어낸다. 문자열 안의 `//` 는 건드리지 않는다.
 *
 * `communityDesignContract.test.ts` 가 같은 함수를 export 하지만 **거기서 가져오지
 * 않는다** — 테스트 파일을 import 하면 그쪽 `describe` 가 이 스위트 안에서 한 번 더
 * 등록돼 같은 테스트가 두 번 돈다. 공용 헬퍼로 뺄 만큼 커지면 `tests/helpers/` 로
 * 옮기면 된다(그때 두 파일이 같이 바뀐다).
 */
function stripComments(source: string): string {
  let out = ""
  let quote: string | null = null
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    const next = source[i + 1]
    if (quote) {
      out += char
      if (char === "\\") {
        out += next ?? ""
        i += 1
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char
      out += char
      continue
    }
    if (char === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i += 1
      out += "\n"
      continue
    }
    if (char === "/" && next === "*") {
      i += 2
      while (
        i < source.length &&
        !(source[i] === "*" && source[i + 1] === "/")
      ) {
        i += 1
      }
      i += 1
      continue
    }
    out += char
  }
  return out
}

const read = (path: string) =>
  stripComments(readFileSync(join(ROOT, path), "utf-8"))
const readRaw = (path: string) => readFileSync(join(ROOT, path), "utf-8")

/** `app/` · `src/` 의 모든 `.ts(x)` — 죽은 열쇠 증명에 쓴다. */
const SOURCE_FILES: readonly (readonly [string, string])[] = (() => {
  const skip = new Set([
    "node_modules",
    ".expo",
    "dist",
    "coverage",
    "_workspace",
  ])
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue
      const file = join(dir, entry.name)
      if (entry.isDirectory()) walk(file, out)
      else if (/\.tsx?$/u.test(entry.name)) out.push(file)
    }
    return out
  }
  return ["app", "src"]
    .flatMap((dir) => walk(join(ROOT, dir)))
    .map((file) => [file, readFileSync(file, "utf-8")] as const)
})()

const POST_LIST_ITEM = "src/features/recipe/components/PostListItem.tsx"
const POPULAR_SCREEN = "src/features/recipe/views/CommunityPopularScreen.tsx"
const THUMBNAIL_CARD = "src/features/recipe/components/ImageThumbnailCard.tsx"
const TAG_CHIPS = "src/features/recipe/components/TagChips.tsx"
const VOTE_SHEET = "src/features/recipe/components/VoteSheet.tsx"

/* ─────────────────────────────── D1 ─────────────────────────────── */

describe("'이미 했어요' 는 판정이지 화면의 예외가 아니다", () => {
  /*
    예전에는 `presentCommunityError` 가 세 코드를 `presentError` **앞에서** 가로챘다.
    색은 맞았지만 그 갈래는 `app_error_presented` 를 한 행도 안 남겼고(발화 지점은
    `present.ts` 하나여야 한다), `005` 는 호출부의 `refresh` 까지 떨궈서 "결과는 바로
    아래에서 볼 수 있어요" 아래에 투표 전 라디오 버튼이 그대로 남았다.
  */
  it.each([
    "COMMUNITY_ERROR_003",
    "COMMUNITY_ERROR_005",
    "COMMUNITY_ERROR_011",
  ])("%s 의 그릇은 카탈로그가 info 로 판정한다", (code) => {
    expect(getErrorBehavior(code).surface).toBe("info")
  })

  it("원하던 일이 **일어나지 않은** 실패는 여전히 오류다", () => {
    // 없는 글·지워진 댓글에는 새로고침이라는 할 일이 남아 있다.
    expect(getErrorBehavior("COMMUNITY_ERROR_001").surface).toBe("toast")
    expect(getErrorBehavior("COMMUNITY_ERROR_008").surface).toBe("toast")
    // 고를 게 있는 실패는 다이얼로그 그대로다.
    expect(getErrorBehavior("SIGNUP_ERROR_001").surface).toBe("dialog")
  })

  it("이미 참여한 투표는 새로고침을 해결책으로 갖는다", () => {
    // 이 액션이 없으면 `present.ts` 가 호출부의 refresh 를 돌릴 근거가 없다.
    expect(getErrorBehavior("COMMUNITY_ERROR_005").action).toBe("refresh")
  })

  it("info 를 그리는 곳은 present.ts 뿐이다", () => {
    const present = read("src/lib/errorMessage/present.ts")
    expect(present).toContain('resolved.surface === "info"')
    expect(present).toContain("showInfoToast")
    // 안내 갈래는 호출부의 refresh 를 **버튼으로 미루지 않고** 그 자리에서 돌린다.
    expect(present).toMatch(
      /if\s*\(resolved\.action === "refresh"\)\s*handlers\.refresh\?\.\(\)/u,
    )
    // 그러면서 `app_error_action_pressed` 를 쏘는 래퍼(resolveErrorAction)는 안 거친다.
    const infoBranch = present.slice(
      present.indexOf('resolved.surface === "info"'),
    )
    expect(infoBranch.slice(0, 200)).not.toContain("resolveErrorAction")
  })
})

/* ─────────────────────────────── D2 ─────────────────────────────── */

describe("팔로워·팔로잉의 빈 상태에는 문구가 있다", () => {
  /* 없으면 `CommunityConnectionsScreen` 이 축 이름과 수만 적는다 — "팔로워 0". */
  it.each(["emptyFollowers", "emptyFollowing"])(
    "community.author.%s 가 ko·en 양쪽에 있다",
    (key) => {
      const ko = (koCommon.community.author as Record<string, string>)[key]
      const en = (enCommon.community.author as Record<string, string>)[key]
      expect(ko).toBeTruthy()
      expect(en).toBeTruthy()
      // 이웃 문구를 빌려 오면 다른 거짓말이 된다.
      expect(ko).not.toBe(koCommon.community.author.emptyPosts)
      expect(en).not.toBe(enCommon.community.author.emptyPosts)
    },
  )
})

/* ─────────────────────────────── D3 ─────────────────────────────── */

describe("수를 읽을 수 있게 내보낸다", () => {
  const i18n = createInstance()
  void i18n.init({
    resources: { ko: { common: koCommon }, en: { common: enCommon } },
    lng: "en",
    fallbackLng: "ko",
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
  })

  it("영어 조회수에 복수형이 있다 — '1 views' 가 아니다", () => {
    const t = i18n.getFixedT("en", "common")
    expect(t("community.postDetail.viewCount", { count: 1 })).toBe("1 view")
    expect(t("community.postDetail.viewCount", { count: 2 })).toBe("2 views")
    expect(t("community.postDetail.viewCount", { count: 0 })).toBe("0 views")
  })

  it("천 단위를 끊는다", () => {
    expect(formatCount(3291, "ko")).toBe("3,291")
    expect(formatCount(3291, "en")).toBe("3,291")
    expect(formatCount(999, "en")).toBe("999")
    expect(formatCount(0, "ko")).toBe("0")
    expect(formatCount(1234567, "en")).toBe("1,234,567")
  })

  it("기기 로케일이 아니라 **앱 언어**를 따른다", () => {
    /*
      `toLocaleString()` 은 인자가 없으면 기기 로케일을 따라 `3.291`(de) 이 될 수 있다.
      같은 화면에서 앱 언어와 기기 언어가 다른 답을 내는 것이 원래 결함이었다.
      두 앱 언어의 답은 같아야 하고, 그 답은 기기 설정과 무관해야 한다.
    */
    expect(formatCount(3291, "en-US")).toBe(formatCount(3291, "ko-KR"))
    expect(formatCount(3291, "en")).not.toContain(".")
  })

  /*
    이 목록은 넷이었다 — `PopularPostCard`·`ImageCard` 도 있었는데, 둘 다 어디서도
    import 되지 않는 죽은 파일이라 지웠다(2026-09-09). 남은 피드 카드는 `PostListItem`
    하나이고 인기글 화면은 그 카드를 그린다.
  */
  it("피드 카드가 전부 그 함수를 지난다", () => {
    for (const file of [POST_LIST_ITEM, POPULAR_SCREEN]) {
      if (file === POPULAR_SCREEN) expect(read(file)).toContain("<PostListItem")
      const source = read(file === POPULAR_SCREEN ? POST_LIST_ITEM : file)
      expect(source).toContain("formatCount(")
      // 원시값이 그대로 나가던 자리가 남아 있으면 안 된다.
      expect(source).not.toMatch(
        /\{\s*(likeCount|commentCount|viewCount)\s*\}/u,
      )
      expect(source).not.toMatch(/\{\s*item\.(likes|comments)\s*\}/u)
    }
    // 그리고 커뮤니티에는 로케일 없는 `toLocaleString()` 이 없다.
    for (const file of [POST_LIST_ITEM, POPULAR_SCREEN]) {
      expect(read(file)).not.toContain("toLocaleString()")
    }
  })
})

/* ─────────────────────────────── D4 ─────────────────────────────── */

/*
  대비 계산기는 **`tests/helpers/contrast.ts` 한 벌**이다. 여기 손으로 적혀 있던 넷을
  거기로 옮겼다 — 라이트 감사(`lightContrastAudit`)가 네 번째 사본을 만들 차례였고,
  계산기가 여러 벌이면 그중 하나가 틀려도 아무도 모른다. 아래 오라클은 여기 남는다:
  이 스위트가 그 계산기를 실제로 돌려 본다는 사실 자체가 계약이다.
*/

describe("다크 모드에서 사라지는 것이 없다", () => {
  it("대비 계산이 헛돌지 않는다 (오라클)", () => {
    expect(contrast("#ffffff", "#000000", "#ffffff")).toBeCloseTo(21, 0)
    // 예전 값의 재현: 다크 캔버스(#1f1f21) 위의 #1D1E20 원은 사실상 안 보였다.
    const darkCanvas = getSurfacePalette(true).canvas
    expect(contrast("#1D1E20", darkCanvas, darkCanvas)).toBeLessThan(1.1)
  })

  it("사진 제거 ✕ 의 원이 두 모드 모두에서 바닥과 갈라진다", () => {
    // 원은 섬네일 밖으로 6pt 나와 있어 절반이 화면 바닥 위에 놓인다.
    for (const isDark of [false, true]) {
      const surface = getSurfacePalette(isDark)
      expect(
        contrast(surface.textStrong, surface.canvas, surface.canvas),
      ).toBeGreaterThan(3)
      // ✕ 자체도 원 위에서 읽혀야 한다.
      expect(
        contrast(surface.canvas, surface.textStrong, surface.textStrong),
      ).toBeGreaterThan(4.5)
    }
  })

  it("섬네일 카드는 테마 훅을 갖는다 (예전엔 아예 없었다)", () => {
    const source = read(THUMBNAIL_CARD)
    expect(source).toContain("useSurface()")
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/u)
  })

  it("투표 시트의 플레이스홀더는 입력된 값처럼 보이지 않는다", () => {
    const source = read(VOTE_SHEET)
    expect(source).not.toContain("placeholderTextColor={surface.text}")
    expect(
      source.match(/placeholderTextColor=\{surface\.placeholder\}/gu),
    ).toHaveLength(2)
    // 값은 여전히 한 단 진하다 — 둘이 같아지면 구분이 사라진다.
    expect(getSurfacePalette(true).placeholder).not.toBe(
      getSurfacePalette(true).textStrong,
    )
  })

  /*
    "에디터는 다크 칸에 라이트 토큰을 들고 있지 않다" 가 여기 있었다 — v1 블록 에디터
    (`components/editor/EditorToolbar.tsx`·`TextBlock.tsx`)를 보던 단언인데, 그 에디터는
    어디서도 import 되지 않는 죽은 사슬이라 통째로 지웠다(2026-09-09).
  */
})

/* ─────────────────────────────── D5 ─────────────────────────────── */

describe("수와 칩이 손끝·눈금 설정을 견딘다", () => {
  it("피드 카드의 세 수가 전부 이름을 갖는다", () => {
    const source = read(POST_LIST_ITEM)
    for (const key of [
      "post.viewCount",
      "post.likeCount",
      "post.commentCount",
    ]) {
      expect(source).toContain(`accessibilityLabel={t("${key}"`)
    }
    // 라벨 문구가 실제로 있어야 키가 그대로 읽히지 않는다.
    for (const key of ["likeCount", "commentCount"] as const) {
      expect((koRecipe.post as Record<string, string>)[key]).toBeTruthy()
      expect((enRecipe.post as Record<string, string>)[key]).toBeTruthy()
    }
  })

  it("칩·배지는 글자가 커지면 같이 자란다 (상한이 아니라 유연한 높이)", () => {
    const popular = read(POPULAR_SCREEN)
    // 고정 높이가 남아 있으면 1.6배쯤에서 글자가 잘린다.
    expect(popular).toMatch(/categoryChip:\s*\{[^}]*minHeight:\s*32/u)
    expect(popular).toMatch(/categoryBadge:\s*\{[^}]*minHeight:\s*22/u)
    expect(popular).toMatch(/\btag:\s*\{[^}]*minHeight:\s*22/u)
    expect(popular).not.toMatch(/categoryChip:\s*\{[^}]*\bheight:\s*32/u)
    expect(popular).not.toMatch(/categoryBadge:\s*\{[^}]*\bheight:\s*22/u)
    expect(read(TAG_CHIPS)).toMatch(/chip:\s*\{[^}]*minHeight:\s*28/u)
    expect(read(TAG_CHIPS)).not.toMatch(/chip:\s*\{[^}]*\bheight:\s*28/u)
  })

  it("1배에서는 예전 픽셀 그대로다 (행간 + 세로 패딩 = 옛 높이)", () => {
    const popular = read(POPULAR_SCREEN)
    // categoryBadgeText 14 + 4*2 = 22, tagText 14 + 4*2 = 22, categoryText 17 + 6*2 + 보더 2 ≈ 32
    expect(popular).toMatch(/categoryBadge:\s*\{[^}]*paddingVertical:\s*4/u)
    expect(popular).toMatch(/\btag:\s*\{[^}]*paddingVertical:\s*4/u)
    expect(popular).toMatch(/categoryChip:\s*\{[^}]*paddingVertical:\s*6/u)
    // chipText 18 + 5*2 = 28
    expect(read(TAG_CHIPS)).toMatch(/chip:\s*\{[^}]*paddingVertical:\s*5/u)
  })
})

/* ─────────────────────────────── D6 ─────────────────────────────── */

describe("소유자 판정은 닉네임이 아니다", () => {
  it("피드 카드가 한국어 리터럴과 이름을 비교하지 않는다", () => {
    const source = read(POST_LIST_ITEM)
    /*
      `authorName === "나"` — 서버가 준 표시 이름을, 코드에 박힌 한국어와 비교했다.
      앱은 `Accept-Language: en-US` 로도 요청하므로 그 비교는 언어에 따라 조용히
      거짓이 된다. `contentOwnership.ts` 가 QA 2026-08-06 사고의 출처로 지목한 줄이다.
    */
    expect(source).not.toContain('authorName === "나"')
    expect(source).not.toMatch(/authorName\s*===\s*["'][가-힣]/u)
    expect(source).toMatch(/:\s*isMine\s*\n?\s*\?\s*t\("freePost\.selfName"\)/u)
  })

  it("작성자 맥락 태그는 값과 문구를 나눠 갖는다", () => {
    // 예전에는 한국어 태그 문자열을 그대로 문장에 이어 붙여 영어 화면에 한국어가 박혔다.
    const source = read(
      "src/features/recipe/components/write/authorContextTags.ts",
    )
    expect(source).toContain("labelKey")
    expect(source).toMatch(/labelKey:\s*"category\.stage\./u)
  })
})

/* ─────────────────────────────── D7 ─────────────────────────────── */

describe("문구가 화면과 같은 말을 한다", () => {
  it("사진 한도 알림의 제목이 '추가' 가 아니다", () => {
    // 이 알림은 한도를 **넘겼을 때** 뜬다. en 은 이미 'Photo limit reached' 였다.
    expect(koRecipe.freePost.photoLimitTitle).not.toBe("사진 추가")
    expect(koRecipe.freePost.photoLimitTitle).toMatch(/없어요|가득|한도|넘/u)
  })

  it("죽은 문구 한 벌이 지워졌다", () => {
    const recipes = [koRecipe, enRecipe] as unknown as Record<string, unknown>[]
    for (const bundle of recipes) {
      // 고아 네임스페이스: 레시피/자유글 갈래 고르기 화면이 사라졌다.
      expect(bundle.writeType).toBeUndefined()
      const post = bundle.post as Record<string, unknown>
      // 신고 문구는 common:community.postDetail.report* 한 벌만 산다.
      expect(post.reportTitle).toBeUndefined()
      expect(post.reportReason).toBeUndefined()
      expect(post.reportReceivedTitle).toBeUndefined()
      expect(post.reportReceivedBody).toBeUndefined()
    }
    // 살아 있는 정본은 그대로다.
    expect(koCommon.community.postDetail.reportReasons.spam).toBeTruthy()
    expect(koRecipe.post.reportPost).toBeTruthy()
  })

  it("지운 열쇠를 아무도 부르지 않는다 (지우기 전에 증명한 방법 그대로)", () => {
    /*
      죽었다는 증명은 두 갈래를 다 봐야 한다.
       1. **리터럴**: 열쇠 문자열이 소스 어디에도 없다.
       2. **조립**: `` t(`writeType.${x}`) `` 같은 템플릿 머리도 없다 —
          `community.library.tabs.` 처럼 조립되는 열쇠가 실제로 있어서(그건 살아 있다)
          리터럴만 보고 지우면 화면에 열쇠 문자열이 그대로 찍힌다.
    */
    const dead = [
      "writeType.recipeTitle",
      "writeType.recipeBody",
      "writeType.postTitle",
      "writeType.postBody",
      "post.reportTitle",
      "post.reportReceivedTitle",
      "post.reportReceivedBody",
      "post.reportReason",
    ]
    const referenced = dead.filter((key) =>
      SOURCE_FILES.some(([, source]) => source.includes(key)),
    )
    expect(referenced).toEqual([])

    const assembledPrefixes = ["writeType.", "post.reportReason."]
    const assembled = assembledPrefixes.filter((prefix) =>
      SOURCE_FILES.some(([, source]) => source.includes(`\`${prefix}`)),
    )
    expect(assembled).toEqual([])
  })
})

/* ─────────────────────────────── D8 ─────────────────────────────── */

describe("i18n 감사가 실제로 실패할 수 있다", () => {
  const packageJson = JSON.parse(readRaw("package.json")) as {
    scripts: Record<string, string>
  }

  it("커뮤니티 구역 게이트가 --fail-on-findings 를 넘긴다", () => {
    /*
      `audit:i18n-coverage` 는 플래그를 안 넘겨서 **무엇도 막지 못했다.**
      저장소 전체에 걸면 오늘 당장 빨개지므로(정리 안 된 구역 29건), 정리가 끝난
      커뮤니티만 이름 붙여 잠근다.
    */
    const gate = packageJson.scripts["audit:i18n-ui:community"]
    expect(gate).toContain("--fail-on-findings")
    expect(gate).toContain("--scope=community")
  })

  it("게이트가 지금 초록이다", () => {
    const output = execFileSync(
      process.execPath,
      [
        "scripts/audit-i18n-coverage.mjs",
        "--ui-only",
        "--scope=community",
        "--json",
      ],
      { cwd: ROOT, encoding: "utf-8" },
    )
    const report = JSON.parse(output) as { count: number; findings: unknown[] }
    expect(report.findings).toEqual([])
    expect(report.count).toBe(0)
  })

  it("구역이 실제로 커뮤니티 파일을 훑는다 (범위가 비어 있지 않다)", () => {
    // 구역이 조용히 0 파일이 되면 위 초록은 아무 뜻도 없다.
    const scoped = execFileSync(
      process.execPath,
      ["scripts/audit-i18n-coverage.mjs", "--scope=community", "--json"],
      { cwd: ROOT, encoding: "utf-8" },
    )
    expect(JSON.parse(scoped)).toHaveProperty("mode")
    const script = readRaw("scripts/audit-i18n-coverage.mjs")
    expect(script).toContain("src/features/recipe/components/")
    expect(script).toContain("app/post/")
  })

  it("v1 에디터 면제는 파일과 함께 사라졌다 — 제외 목록이 비어 있고 되살아나지 않았다", () => {
    /*
      `RecipeEditor.tsx` 는 2026-09-09 에 삭제됐다. 그 전까지 이 구역의 유일한 면제였고
      근거는 "어디서도 import 되지 않는다" 하나뿐이었다. 파일이 없으니 면제도 없어야
      한다 — 제외 목록에 다시 올라오거나 파일이 되살아나면 여기서 잡는다
      (`analyticsCrossCutting` 의 같은 단언과 짝이다).
    */
    const script = readRaw("scripts/audit-i18n-coverage.mjs")
    expect(script).not.toContain(
      "src/features/recipe/components/RecipeEditor.tsx",
    )
    expect(script).toContain("exclude: []")
    expect(
      existsSync(join(ROOT, "src/features/recipe/components/RecipeEditor.tsx")),
    ).toBe(false)
    const importers = execFileSync(
      "node",
      [
        "-e",
        `const fs=require("fs"),path=require("path");
         const skip=new Set(["node_modules",".expo","dist","coverage","_workspace","ios","android"]);
         function walk(d,out=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(skip.has(e.name))continue;const f=path.join(d,e.name);if(e.isDirectory())walk(f,out);else if(/\\.tsx?$/.test(e.name))out.push(f)}return out}
         const hits=["app","src"].flatMap(d=>walk(d)).filter(f=>/from\\s+["'][^"']*RecipeEditor["']/.test(fs.readFileSync(f,"utf8")));
         process.stdout.write(hits.join(","))`,
      ],
      { cwd: ROOT, encoding: "utf-8" },
    )
    expect(importers).toBe("")
  })
})
