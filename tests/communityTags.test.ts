/**
 * 해시태그 규칙이 **서버와 같은지** 본다. 이 파일이 생기기 전까지 이 모듈에는 테스트가
 * 한 개도 없었다.
 *
 * ## 왜 "같은지" 가 전부인가
 *
 * 태그 판정은 두 곳에 있다. 앱(`communityTags.ts`)과 서버
 * (`sinsin-be-bun/src/domains/community/tags.ts`). 둘이 갈리면 **둘 다 조용하다.**
 *
 *  - 앱이 서버보다 느슨하면: 칩이 다 그려지고 사진까지 다 올라간 뒤에
 *    `POST /community/posts` 가 400 을 낸다. 앱은 `fieldErrors[0].field="body.tags"` 를
 *    읽지 않아서 "입력한 내용을 다시 확인해 주세요" 만 뜬다.
 *  - 앱이 서버보다 빡세면: 서버가 받아 줄 태그를 앱이 말없이 버린다. 칩도 안 생긴다.
 *
 * 어느 쪽도 예외가 나지 않는다. 그래서 **양방향**으로 못 박는다.
 *
 * 실측으로 갈라져 있던 자리(전부 이 파일에 케이스가 있다):
 *  1. 개수 상한이 하나 더 들어갔고(10개 목록에 더하면 11개) `current` 쪽엔 상한이 없었다.
 *  2. 길이를 UTF-16 단위로 셌다 — 이모지 11개짜리 태그를 서버는 받는데 앱이 버렸다.
 *  3. 공백을 JS `\s` 로 봤다 — U+0085 는 통과시켜 400 을 만들고 U+FEFF 는 버렸다.
 *  4. 보이지 않는 문자만으로 된 태그가 양쪽 다 통과했다(앱이 먼저 막는다).
 *  5. 소문자화가 **기기 로케일**을 탔다 — 터키어 기기에서 `#DIET` 가 `#dıet` 이 됐다.
 */
import fs from "node:fs"
import path from "node:path"

import {
  COMMUNITY_TAG_SPACE_SOURCE,
  MAX_COMMUNITY_TAGS,
  MAX_COMMUNITY_TAG_INPUT_LENGTH,
  MAX_COMMUNITY_TAG_LENGTH,
  checkCommunityTag,
  hasCommunityTagSpace,
  mergeCommunityTags,
  normalizeCommunityTag,
  splitCommunityTagInput,
} from "../src/features/recipe/utils/communityTags"

const ch = (code: number): string => String.fromCodePoint(code)
const label = (code: number): string =>
  `U+${code.toString(16).toUpperCase().padStart(4, "0")}`

describe("communityTags — 개수 상한 (T1)", () => {
  it("10개짜리 목록에 하나 더 넣어도 10개다", () => {
    const ten = Array.from({ length: MAX_COMMUNITY_TAGS }, (_, i) => `tag${i}`)
    const merged = mergeCommunityTags(ten, ["overflow"])

    expect(merged.tags).toHaveLength(MAX_COMMUNITY_TAGS)
    expect(merged.tags).toEqual(ten)
    expect(merged.refusal).toBe("limit")
  })

  it("한 번에 하나씩 15번 넣어도 10개에서 멈춘다", () => {
    let tags: string[] = []
    let lastRefusal: string | null = null
    for (let i = 0; i < 15; i += 1) {
      const merged = mergeCommunityTags(tags, [`tag${i}`])
      tags = merged.tags
      lastRefusal = merged.refusal
    }

    expect(tags).toHaveLength(MAX_COMMUNITY_TAGS)
    expect(lastRefusal).toBe("limit")
  })

  it("한 번에 15개를 붙여넣어도 10개만 남는다", () => {
    const many = Array.from({ length: 15 }, (_, i) => `bulk${i}`)
    const merged = mergeCommunityTags([], many)

    expect(merged.tags).toHaveLength(MAX_COMMUNITY_TAGS)
    expect(merged.tags[MAX_COMMUNITY_TAGS - 1]).toBe("bulk9")
    expect(merged.refusal).toBe("limit")
  })

  it("이미 상한을 넘긴 목록(`current`)도 잘라 낸다", () => {
    const fifteen = Array.from({ length: 15 }, (_, i) => `old${i}`)
    const merged = mergeCommunityTags(fifteen, [])

    expect(merged.tags).toHaveLength(MAX_COMMUNITY_TAGS)
    // `current` 쪽 잘림은 사용자가 방금 한 일이 아니므로 문구를 띄우지 않는다.
    expect(merged.refusal).toBeNull()
  })

  it("딱 10개면 아무 말도 하지 않는다", () => {
    const ten = Array.from({ length: MAX_COMMUNITY_TAGS }, (_, i) => `t${i}`)
    const merged = mergeCommunityTags([], ten)

    expect(merged.tags).toHaveLength(MAX_COMMUNITY_TAGS)
    expect(merged.refusal).toBeNull()
  })

  it("중복은 자리를 차지하지 않는다", () => {
    const merged = mergeCommunityTags(["감자", "감자"], ["#감자", "고구마"])
    expect(merged.tags).toEqual(["감자", "고구마"])
    expect(merged.refusal).toBeNull()
  })
})

describe("communityTags — 길이는 코드포인트 (T2)", () => {
  const apple = "🍎" // U+1F34E — UTF-16 2단위, 코드포인트 1

  it("이모지 11개(UTF-16 22단위)짜리 태그를 받는다", () => {
    const tag = apple.repeat(11)
    expect(tag.length).toBe(22)
    expect([...tag].length).toBe(11)
    expect(normalizeCommunityTag(tag)).toBe(tag)
  })

  it("이모지 20개까지 받고 21개부터 거절한다", () => {
    expect(checkCommunityTag(apple.repeat(MAX_COMMUNITY_TAG_LENGTH))).toEqual({
      kind: "ok",
      tag: apple.repeat(MAX_COMMUNITY_TAG_LENGTH),
    })
    expect(
      checkCommunityTag(apple.repeat(MAX_COMMUNITY_TAG_LENGTH + 1)),
    ).toEqual({ kind: "refused", reason: "tooLong" })
  })

  it("한글·영문도 같은 경계다", () => {
    expect(normalizeCommunityTag("가".repeat(20))).toBe("가".repeat(20))
    expect(normalizeCommunityTag("가".repeat(21))).toBeNull()
    expect(normalizeCommunityTag("a".repeat(20))).toBe("a".repeat(20))
    expect(normalizeCommunityTag("a".repeat(21))).toBeNull()
  })

  it("입력칸 상한(UTF-16)이 서버가 받아 주는 태그를 자르지 않는다", () => {
    // `TextInput maxLength` 는 UTF-16 단위다. 20 코드포인트가 전부 서로게이트 쌍이어도
    // 들어갈 만큼은 돼야 한다 — 21 이면 이모지 태그가 10자에서 잘렸다.
    expect(MAX_COMMUNITY_TAG_INPUT_LENGTH).toBeGreaterThanOrEqual(
      apple.repeat(MAX_COMMUNITY_TAG_LENGTH).length,
    )
  })
})

/**
 * 서버 `tags.ts` 의 `PYTHON_SPACE` 에 있는 문자면 서버가 400 을 낸다(= 앱도 거절해야
 * 한다). 없으면 서버가 받는다(= 앱도 받아야 한다). 아래 표는 그 판정이다.
 */
const SPACE_TABLE: readonly (readonly [number, boolean])[] = [
  [0x0085, true], // NEL — 파이썬은 공백, JS `\s` 는 아니다 (앱이 400 을 만들던 자리)
  [0x001c, true], // FILE SEPARATOR
  [0x001d, true], // GROUP SEPARATOR
  [0x001e, true], // RECORD SEPARATOR
  [0x001f, true], // UNIT SEPARATOR
  [0x00a0, true], // NBSP — 양쪽 다 공백 (과잉 교정 방지용 대조군)
  [0x3000, true], // 전각 공백 — 양쪽 다 공백 (대조군)
  [0xfeff, false], // BOM — JS `\s` 는 공백, 파이썬은 아니다 (앱이 버리던 자리)
]

describe("communityTags — 공백 집합이 서버와 같다 (T3)", () => {
  it.each(SPACE_TABLE.map(([code, isSpace]) => [label(code), code, isSpace]))(
    "%s 를 낀 태그의 판정이 서버와 같다",
    (_label, code, isServerSpace) => {
      const tag = `a${ch(code as number)}b`
      const checked = checkCommunityTag(tag)
      const expected = isServerSpace
        ? { kind: "refused", reason: "space" }
        : { kind: "ok", tag }

      expect(checked).toEqual(expected)
    },
  )

  it("나누는 기준도 같은 집합이다", () => {
    expect(hasCommunityTagSpace(`a${ch(0x0085)}b`)).toBe(true)
    expect(splitCommunityTagInput(`감자${ch(0x0085)}고구마`)).toEqual([
      "감자",
      "고구마",
    ])
    // U+FEFF 는 서버가 공백으로 보지 않는다 — 여기서 쪼개면 태그가 둘로 갈라진다.
    expect(hasCommunityTagSpace(`a${ch(0xfeff)}b`)).toBe(false)
    expect(splitCommunityTagInput(`a${ch(0xfeff)}b`)).toEqual([
      `a${ch(0xfeff)}b`,
    ])
  })

  it("보통 공백은 여전히 태그를 나눈다", () => {
    expect(splitCommunityTagInput("  감자   고구마 ")).toEqual([
      "감자",
      "고구마",
    ])
  })

  /**
   * 위 표는 사람이 적은 것이라 서버가 집합을 바꾸면 같이 낡는다. 서버 체크아웃이 옆에
   * 있으면 **소스 문자열 자체**를 대조한다. 없으면(CI 등) 이 한 건만 건너뛰고, 위
   * 표 검사는 그대로 돈다.
   */
  const serverTags = path.join(
    __dirname,
    "..",
    "..",
    "sinsin-be-bun",
    "src",
    "domains",
    "community",
    "tags.ts",
  )
  const hasServer = fs.existsSync(serverTags)
  const maybe = hasServer ? it : it.skip

  maybe("서버 `PYTHON_SPACE` 소스와 문자 단위로 같다", () => {
    const source = fs.readFileSync(serverTags, "utf8")
    const statement = source.slice(source.indexOf("const PYTHON_SPACE"))
    const body = statement.slice(0, statement.indexOf(");"))
    const literals = (body.match(/"(?:[^"\\]|\\.)*"/gu) ?? [])
      .map((part) => part.slice(1, -1))
      .filter((part) => part !== "u")

    expect(literals.length).toBeGreaterThan(0)
    expect(literals.join("").replace(/\\\\/gu, "\\")).toBe(
      COMMUNITY_TAG_SPACE_SOURCE,
    )
  })
})

/** `searchText.ts`(→ `safety/normalize.ts`)에서 온 "자리를 차지하지 않는 문자" 표본. */
const INVISIBLE_SAMPLES: readonly number[] = [
  // safety/normalize.ts 의 INVISIBLE_SOURCE
  0x00ad, 0x180e, 0x200b, 0x200f, 0x202a, 0x202e, 0x2060, 0x2064, 0x206a,
  0x206f,
  // searchText.ts 의 BLANK_RANGES (서버 공백 집합과 겹치는 자리는 뺐다 — 그쪽은 "space")
  0x0000,
  0x0001, 0x007f, 0x0086, 0x009f, 0x034f, 0x061c, 0x115f, 0x1160, 0x2065,
  0x2069, 0x2800, 0x3164, 0xfe00, 0xfe0f, 0xffa0, 0xfff9, 0xfffb, 0xe0000,
  0xe007f, 0xe0100, 0xe01ef,
]

describe("communityTags — 보이는 글자가 없는 태그 (T4)", () => {
  it.each([0x200b, 0x3164, 0x2800, 0x00ad].map((code) => [label(code), code]))(
    "%s 하나짜리 태그를 거절한다",
    (_label, code) => {
      expect(checkCommunityTag(ch(code as number))).toEqual({
        kind: "refused",
        reason: "invisible",
      })
    },
  )

  it("정본(searchText.ts) 표의 표본이 전부 막힌다", () => {
    const passed = INVISIBLE_SAMPLES.filter(
      (code) => normalizeCommunityTag(ch(code)) !== null,
    ).map(label)
    expect(passed).toEqual([])
  })

  it("여러 개를 이어 붙여도 마찬가지다", () => {
    expect(normalizeCommunityTag(`${ch(0x200b)}${ch(0x3164)}`)).toBeNull()
    expect(normalizeCommunityTag(`#${ch(0x2800).repeat(5)}`)).toBeNull()
  })

  it("보이는 글자가 하나라도 있으면 받고, 태그는 손대지 않는다", () => {
    const tag = `다${ch(0x200b)}이어트`
    expect(checkCommunityTag(tag)).toEqual({ kind: "ok", tag })
  })
})

describe("communityTags — 소문자화는 로케일 독립 (T5)", () => {
  const original = String.prototype.toLocaleLowerCase

  beforeEach(() => {
    // 터키어·아제르바이잔어 기기 흉내: 인자 없는 호출만 `tr` 로 돌린다.
    // 그 기기에서 `"DIET".toLocaleLowerCase()` 는 점 없는 `ı` 를 낸다.
    ;(String.prototype as { toLocaleLowerCase: unknown }).toLocaleLowerCase =
      function (this: string, ...args: unknown[]): string {
        return args.length === 0
          ? original.call(this, "tr")
          : original.call(this, args[0] as string)
      }
  })

  afterEach(() => {
    ;(String.prototype as { toLocaleLowerCase: unknown }).toLocaleLowerCase =
      original
  })

  it("흉내가 실제로 걸려 있는지부터 본다", () => {
    expect("DIET".toLocaleLowerCase()).toBe("dıet")
  })

  it("터키어 기기에서도 `#DIET` 는 `diet` 다", () => {
    expect(normalizeCommunityTag("#DIET")).toBe("diet")
    expect(mergeCommunityTags([], ["#DIET", "diet"]).tags).toEqual(["diet"])
  })

  it("한글 태그는 어느 쪽이든 그대로다", () => {
    expect(normalizeCommunityTag("#저염식")).toBe("저염식")
  })
})

describe("communityTags — 서버 정규화와 같은 순서", () => {
  it("`#` 을 떼고 양끝을 자르고 소문자로 접는다", () => {
    expect(normalizeCommunityTag("  ##Low-Sodium  ")).toBe("low-sodium")
  })

  it("`#` 만 있으면 빈 입력이다(거절이 아니다)", () => {
    expect(checkCommunityTag("###")).toEqual({ kind: "empty" })
    expect(mergeCommunityTags([], ["###"]).refusal).toBeNull()
  })

  it("공백 검사가 길이 검사보다 먼저다(서버와 같은 순서)", () => {
    expect(checkCommunityTag(`${"a".repeat(30)} b`)).toEqual({
      kind: "refused",
      reason: "space",
    })
  })
})
