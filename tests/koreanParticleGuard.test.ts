/**
 * 한국어 조사 가드 — **값 자리 바로 뒤에 조사를 박지 않는다.**
 *
 * 조사는 앞 글자의 받침이 정한다. `{{food}}이` 처럼 고정으로 적으면 "오리고기이" 가
 * 화면에 나간다(2026-09-05 실측). 음식 이름·제목처럼 **아무 말이나 들어오는 자리**가
 * 대상이다. 영양소·끼니는 닫힌 목록이고 넷·넷 모두 받침이 있어 고정 조사가 안전하다.
 *
 * 고쳐야 할 때는 둘 중 하나다: 문장에서 조사를 빼거나(괄호·쉼표로 잇는다), 조사를
 * 코드에서 계산해 값에 붙여 넘긴다.
 */
import ko from "../src/i18n/locales/ko/common.json"

/** 아무 말이나 들어오는 자리. 여기 뒤에는 조사를 붙일 수 없다. */
const OPEN_SLOTS = ["food", "title", "name", "recipe", "author", "nickname"]
/** 닫힌 목록이라 고정 조사가 안전한 자리(모두 받침 있음). */
const CLOSED_SLOTS = ["nutrient", "meal", "meals"]

const PARTICLES = "은는이가을를와과로으로"

/**
 * 열린 자리 뒤의 조사를 찾는 규칙 **한 벌**. 검사와 대조가 같은 것을 써야 한다 —
 * 두 벌로 두면 대조만 통과하고 진짜 검사는 다른 규칙을 돌린다.
 *
 * 뒤에 무엇이 오든 잡는다. 예전에는 `(?![가-힣A-Za-z])` 로 "뒤에 한글이 오면 조사가
 * 아니다" 라고 봤는데, 그러면 **`{{food}}이에요` 가 통과한다** — "오리고기이에요" 는
 * 이 가드가 막으려던 바로 그 문장이다(2026-09-05 검수). 조사가 아닌 정당한 이음말이
 * 생기면 그때 그 문장을 예외로 적는다. 지금은 하나도 없다.
 */
const OPEN_SLOT_PARTICLE = new RegExp(
  `\\{\\{(${OPEN_SLOTS.join("|")})\\}\\}[${PARTICLES}]`,
  "u",
)

function walk(node: unknown, path: string, out: [string, string][]): void {
  if (typeof node === "string") {
    out.push([path, node])
    return
  }
  if (node === null || typeof node !== "object") return
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    walk(value, path ? `${path}.${key}` : key, out)
  }
}

const ENTRIES: [string, string][] = []
walk(ko, "", ENTRIES)

describe("한국어 조사", () => {
  it("검사 자체가 비어 있지 않다", () => {
    expect(ENTRIES.length).toBeGreaterThan(500)
  })

  it("열린 자리({{food}} 등) 뒤에 조사를 고정으로 붙이지 않는다", () => {
    const pattern = OPEN_SLOT_PARTICLE
    const offenders = ENTRIES.filter(([, text]) => pattern.test(text)).map(
      ([key, text]) => `${key}: ${text}`,
    )
    expect(offenders).toEqual([])
  })

  it("규칙이 헛돌지 않는다 — 같은 검사를 가짜 문장에 걸면 잡힌다 (대조)", () => {
    const pattern = OPEN_SLOT_PARTICLE
    expect(pattern.test("그중 {{food}}이 420mg을 차지해요.")).toBe(true)
    // 뒤에 한글이 이어져도 조사는 조사다 — 예전 규칙이 놓치던 자리("오리고기이에요").
    expect(pattern.test("{{food}}이에요.")).toBe(true)
    expect(pattern.test("{{title}}이라서 골랐어요.")).toBe(true)
    expect(pattern.test("대부분 {{food}}({{amount}})에서 섭취되었어요.")).toBe(
      false,
    )
    // 닫힌 자리는 잡지 않는다 — 나트륨·칼륨·인·단백질은 모두 받침이 있다.
    expect(pattern.test("{{nutrient}}을 {{amount}} 더 드실 수 있어요.")).toBe(
      false,
    )
    void CLOSED_SLOTS
  })
})
