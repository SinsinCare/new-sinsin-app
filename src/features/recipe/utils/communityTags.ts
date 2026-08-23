/**
 * 커뮤니티 해시태그 정규화. **정본은 서버다** —
 * `sinsin-be-bun/src/domains/community/tags.ts` 의 `normalizeTags`.
 *
 * 여기가 서버보다 **느슨하면** 칩이 그려지고 사진까지 다 올라간 뒤에
 * `POST /community/posts` 가 400 을 뱉는다. 앱은 `fieldErrors[0].field = "body.tags"`
 * 를 읽지 않으므로 사용자에게는 "입력한 내용을 다시 확인해 주세요" 라는 뜻 없는 문구만
 * 남는다 — 무엇이 문제인지 화면 어디에도 없다.
 *
 * 반대로 여기가 서버보다 **빡세면** 서버가 받아 줄 태그를 앱이 조용히 버린다. 칩도 안
 * 생기고 아무 말도 없어서 사용자는 "태그 추가가 안 눌린다" 고만 느낀다.
 *
 * 그래서 이 파일의 규칙은 전부 서버 파일에서 **문자 단위로** 옮겨 온다. 딱 하나
 * 서버보다 빡센 규칙이 있다(보이지 않는 문자만으로 된 태그 거부) — 그 자리에 왜인지
 * 적어 두었다.
 */

export const MAX_COMMUNITY_TAGS = 10
export const MAX_COMMUNITY_TAG_LENGTH = 20

/**
 * `TextInput maxLength` 로 줄 UTF-16 상한.
 *
 * RN 의 `maxLength` 는 코드포인트가 아니라 UTF-16 단위로 자른다(iOS 는 NSString,
 * 안드로이드는 Java `char`). 21 로 두면 서로게이트 쌍을 쓰는 이모지 태그가 **10자**
 * 에서 잘려서, 서버가 20자까지 받아 주는데도 앱이 못 쓰게 만든다.
 * 20 코드포인트가 전부 서로게이트 쌍이어도 40 단위면 들어가고, 사용자가 앞에 `#` 을
 * 직접 찍는 경우가 있어 한 칸 더 준다. 진짜 길이 판정은 아래 코드포인트 검사가 한다.
 */
export const MAX_COMMUNITY_TAG_INPUT_LENGTH = MAX_COMMUNITY_TAG_LENGTH * 2 + 1

/**
 * 서버 `tags.ts` 의 `PYTHON_SPACE` 를 **문자 단위로 그대로** 옮긴 것.
 * (정본: `sinsin-be-bun/src/domains/community/tags.ts` — 파이썬 `str.isspace()` 집합.)
 *
 * JS `\s` 로 대신하면 두 방향으로 갈린다. JS `\s` 에는 U+FEFF 가 있고
 * U+0085·U+001C~U+001F 가 없는데 파이썬은 정확히 반대다. 실측:
 *  - `"a<U+0085>b"` : 앱 통과 → 서버 400 (글 전체가 안 올라간다)
 *  - `"a<U+FEFF>b"` : 서버는 받는데 앱이 조용히 버린다
 * 둘 다 화면에서는 안 보이는 한 글자다. `tests/communityTags.test.ts` 가 이 다섯 자리
 * (U+0085 · U+001C~U+001F · U+FEFF · U+00A0 · U+3000)를 못 박는다.
 *
 * 문자를 직접 쓰지 않고 이스케이프로 적는 이유도 서버와 같다 — 대부분 화면에
 * 아무것도 그리지 않아서, 리터럴로 넣으면 다음 사람이 지워도 아무도 모른다.
 */
export const COMMUNITY_TAG_SPACE_SOURCE =
  "[\\u0009-\\u000d\\u001c-\\u001f\\u0020\\u0085\\u00a0\\u1680" +
  "\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]"

const TAG_SPACE = new RegExp(COMMUNITY_TAG_SPACE_SOURCE, "u")
const TAG_SPACE_RUN = new RegExp(`${COMMUNITY_TAG_SPACE_SOURCE}+`, "gu")

/**
 * **자리를 차지하지 않는 문자.** 정본은 서버 검색 축의
 * `sinsin-be-bun/src/domains/community/searchText.ts` 의 `INVISIBLE_PATTERN` 이고,
 * 그것은 다시 `sinsin-be-bun/src/safety/normalize.ts` 의 `INVISIBLE_SOURCE` 와
 * `searchText.ts` 의 `BLANK_RANGES` 표에서 나온다. **세 번째 목록을 만들지 않으려고**
 * 그 합집합을 출처별로 나눠 적었다 — 어느 줄이 어느 파일에서 왔는지 보이게.
 *
 * ⚠️ 서버의 **태그** 축에는 아직 이 규칙이 없다. 실측으로 U+200B(ZWSP)·
 * U+3164(한글 필러)·U+2800(점자 빈칸)·U+00AD(소프트 하이픈)만으로 된 태그가
 * `normalizeTags` 를 그대로 통과해 태그 표에 저장되고, 피드 필터로 눌리는 `#` 하나짜리
 * 칩이 된다. 서버에 같은 규칙을 다는 일은 **따로 추적된다** — 그때까지 앱이 먼저 막는다.
 * (앱이 먼저 막아도 안전하다: 여기서 거절한 태그는 애초에 서버로 나가지 않는다.)
 */
const COMMUNITY_TAG_INVISIBLE_SOURCE =
  "[" +
  // ── safety/normalize.ts 의 INVISIBLE_SOURCE ──
  "\\u00ad" + // soft hyphen
  "\\u180e" + // mongolian vowel separator
  "\\u200b-\\u200f" + // zero width space/non-joiner/joiner, LRM, RLM
  "\\u202a-\\u202e" + // bidi override
  "\\u2060-\\u2064" + // word joiner, invisible operators
  "\\u206a-\\u206f" + // deprecated format controls
  "\\ufeff" + // BOM / zero width no-break space
  // ── searchText.ts 의 BLANK_RANGES ──
  "\\u0000-\\u001f" + // C0 제어
  "\\u007f-\\u009f" + // DEL + C1 제어
  "\\u034f" + // combining grapheme joiner
  "\\u061c" + // arabic letter mark (bidi 제어)
  "\\u115f-\\u1160" + // 한글 초성·중성 채움 문자
  "\\u2065-\\u2069" + // 미배정 + bidi isolate
  "\\u2800" + // braille pattern blank
  "\\u3164" + // hangul filler
  "\\ufe00-\\ufe0f" + // variation selector 1~16
  "\\uffa0" + // halfwidth hangul filler
  "\\ufff9-\\ufffb" + // interlinear annotation 표시
  "\\u{e0000}-\\u{e007f}" + // tag characters
  "\\u{e0100}-\\u{e01ef}" + // variation selector 17~256
  "]"

const TAG_INVISIBLE = new RegExp(COMMUNITY_TAG_INVISIBLE_SOURCE, "gu")

/** 태그 하나가 거절당한 이유. 문구를 고르는 쪽(`TagInput`)이 이 값만 본다. */
export type TagRefusalReason = "space" | "tooLong" | "invisible" | "limit"

/** 태그 하나를 본 결과. `empty` 는 거절이 아니다 — 알릴 것이 없다는 뜻이다. */
export type CommunityTagCheck =
  | { kind: "ok"; tag: string }
  | { kind: "empty" }
  | { kind: "refused"; reason: Exclude<TagRefusalReason, "limit"> }

/**
 * 태그 하나를 서버 규칙으로 접고, 걸리면 **왜 걸렸는지**까지 준다.
 *
 * 검사 순서는 서버 `normalizeTags` 와 같다(빈 값 → 공백 → 길이). 보이지 않는 문자
 * 검사만 앱 쪽에 하나 더 있고 맨 뒤에 선다.
 */
export function checkCommunityTag(value: string): CommunityTagCheck {
  // 소문자화는 **로케일 독립**이어야 한다. 인자 없는 `toLocaleLowerCase()` 는 기기
  // 로케일을 쓰므로 터키어·아제르바이잔어 기기에서 `"DIET"` 가 `"dıet"`(점 없는 ı)이
  // 된다 — 그 사용자만 아무와도 안 겹치는 태그를 만든다. 서버는 `toLowerCase()` 다.
  const tag = value.trim().replace(/^#+/u, "").trim().toLowerCase()

  if (tag.length === 0) return { kind: "empty" }
  if (TAG_SPACE.test(tag)) return { kind: "refused", reason: "space" }
  // 길이는 **코드포인트**로 센다. `String.length` 는 UTF-16 단위라 이모지 태그를
  // 서버(`[...tag].length`)의 두 배로 세어 멀쩡한 태그를 거절한다.
  if ([...tag].length > MAX_COMMUNITY_TAG_LENGTH) {
    return { kind: "refused", reason: "tooLong" }
  }
  // 보이는 글자가 하나도 없으면 거절. 태그 자체는 **손대지 않는다** — 지워서 보내면
  // 서버가 받는 문자열이 앱이 보여 준 것과 달라진다.
  if (tag.replace(TAG_INVISIBLE, "").length === 0) {
    return { kind: "refused", reason: "invisible" }
  }
  return { kind: "ok", tag }
}

/** 옛 이름. 이유가 필요 없는 자리에서 쓴다. */
export function normalizeCommunityTag(value: string): string | null {
  const checked = checkCommunityTag(value)
  return checked.kind === "ok" ? checked.tag : null
}

/** 붙여넣기 등으로 들어온 한 줄을 태그 여러 개로 나눌 자리인가. */
export function hasCommunityTagSpace(value: string): boolean {
  return TAG_SPACE.test(value)
}

/**
 * 한 줄을 태그 여러 개로 나눈다. **나누는 기준도 서버의 공백 집합**이다 —
 * JS `\s` 로 나누면 U+FEFF 에서 쪼개고(서버는 한 태그로 본다) U+0085 에서는 안 쪼갠다
 * (서버는 그 태그를 400 으로 되돌린다).
 */
export function splitCommunityTagInput(value: string): string[] {
  return value.split(TAG_SPACE_RUN).filter((part) => part.length > 0)
}

export interface MergeCommunityTagsResult {
  tags: string[]
  /**
   * 새로 넣으려던 것 중 **처음** 거절당한 이유. 없으면 `null`.
   * 하나만 주는 이유: 토스트를 여러 장 쌓아 봐야 마지막 것만 읽힌다.
   */
  refusal: TagRefusalReason | null
}

/**
 * 이미 붙은 태그에 새 태그를 더한다. 중복은 버리고, **상한은 넣기 전에** 본다.
 *
 * 예전에는 `push` 를 먼저 하고 그 다음에 `length >= MAX` 로 끊어서 항상 한 개가 더
 * 들어갔고(10개 목록에 더하면 11개), 게다가 `current` 쪽 반복문에는 상한이 아예 없어서
 * 한 번에 하나씩 15번 넣으면 15개가 그대로 남았다. 칩은 다 그려지고 400 은 업로드가
 * 끝난 뒤에 났다.
 *
 * `current` 쪽 거절은 **알리지 않는다.** 그쪽은 이미 확정된 목록(서버에서 불러온
 * 글의 태그 포함)이라, 거기서 나온 문구는 사용자가 방금 한 일과 관계가 없다.
 * 다만 검사는 그대로 한다 — 상한을 지키는 것이 이 함수의 일이고, 서버가 아직 받아 주는
 * "보이지 않는 문자만으로 된 태그" 는 수정 화면에서 조용히 떨어져 나가는 편이 낫다.
 */
export function mergeCommunityTags(
  current: readonly string[],
  candidates: readonly string[],
): MergeCommunityTagsResult {
  const tags: string[] = []
  const seen = new Set<string>()
  let refusal: TagRefusalReason | null = null

  const take = (value: string, report: boolean): void => {
    const checked = checkCommunityTag(value)
    if (checked.kind === "empty") return
    if (checked.kind === "refused") {
      if (report && refusal === null) refusal = checked.reason
      return
    }
    if (seen.has(checked.tag)) return
    if (tags.length >= MAX_COMMUNITY_TAGS) {
      if (report && refusal === null) refusal = "limit"
      return
    }
    seen.add(checked.tag)
    tags.push(checked.tag)
  }

  for (const tag of current) take(tag, false)
  for (const tag of candidates) take(tag, true)

  return { tags, refusal }
}
