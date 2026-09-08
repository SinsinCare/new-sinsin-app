/**
 * **빈 상태가 차지하는 자리** — 실기기에서 보고 정한 두 값 (2026-08-21)
 *
 * 스토리 레일의 한 자리에 상태 넷이 온다 — 스켈레톤 · 오류 줄 · 빈 줄 · 카드들.
 * 빈 줄은 `height: CARD_HEIGHT` 로 **카드와 같은 높이**를 잡는다.
 *
 * 이 값을 한 번 줄여 봤다가 되돌렸다. 줄이면 첫 화면에 글이 한 줄 더 들어오지만,
 * **스토리가 있는 날과 없는 날의 화면이 서로 다른 골격**이 된다 — 어제는 레일이 있던
 * 자리에서 오늘은 피드가 바로 시작한다. 자리가 늘 같은 크기로 있는 쪽이 예측
 * 가능하다는 것이 결론이었다.
 *
 * 이 스위트가 있는 이유가 그것이다. 되돌리기 전에는 이 높이를 **아무 테스트도 지키지
 * 않았고**(줄여도 220개 넘는 커뮤니티 단언이 전부 초록이었다), 그래서 "빈 공간이
 * 아깝다" 는 지극히 자연스러운 판단 한 번에 골격이 바뀔 수 있었다. 밀도가 정말
 * 문제라면 줄여야 하는 것은 이 상자가 아니라 **그 안에 무엇이 서는가** 다.
 *
 * ■ 어떻게 재는가
 *
 * 이 저장소에는 RN 렌더러가 없고, 이 값들은 `StyleSheet.create` 안에 있어 밖으로
 * 나오지 않는다. 그래서 `storyRailProgress.test.ts` 가 같은 파일에 쓰는 방법을 그대로
 * 쓴다 — **주석을 걷어낸 소스**에서 스타일 블록을 떼어내 키를 본다. 주석을 먼저 지우는
 * 것이 핵심이다: 위 설명문에도 `height: CARD_HEIGHT` 라는 글자가 들어 있어서, 안 지우면
 * 이 테스트는 **설명을 읽고 통과**한다(그 자체가 아무것도 증명하지 않는 테스트다).
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

const SOURCE = readFileSync(
  join(__dirname, "../src/features/recipe/components/StoryRail.tsx"),
  "utf8",
)

/** 블록 주석과 줄 주석을 걷어낸 소스. 설명문을 코드로 오독하지 않기 위한 전처리다. */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

/**
 * `styles` 안의 한 항목을 통째로 떼어낸다. 중괄호를 세어서 끊는다 —
 * 정규식으로 `{[^}]*}` 를 잡으면 중첩된 객체에서 앞부분만 잘린다.
 */
function styleBlock(name: string): string {
  const start = CODE.indexOf(`${name}: {`)
  expect(start).toBeGreaterThan(-1)
  let depth = 0
  for (let i = CODE.indexOf("{", start); i < CODE.length; i += 1) {
    if (CODE[i] === "{") depth += 1
    else if (CODE[i] === "}") {
      depth -= 1
      if (depth === 0) return CODE.slice(start, i + 1)
    }
  }
  throw new Error(`닫히지 않은 스타일 블록: ${name}`)
}

describe("스토리 자리는 상태가 바뀌어도 같은 크기다", () => {
  it("전처리가 실제로 주석을 걷어낸다 (이 스위트의 전제)", () => {
    // 머리말에 있는 글자가 CODE 에는 없어야 한다. 남아 있으면 아래 단언들이 전부 헛돈다.
    // `StoryRail.tsx` 의 주석에만 있는 문장. 코드에는 절대 없다.
    expect(SOURCE).toContain("한 번 줄여 봤다가 되돌린 자리다")
    expect(CODE).not.toContain("한 번 줄여 봤다가 되돌린 자리다")
  })

  it("카드가 이 자리의 '내용 높이'를 정한다", () => {
    expect(styleBlock("card")).toMatch(/height:\s*CARD_HEIGHT/)
  })

  it("스켈레톤은 카드와 같은 높이를 예고한다", () => {
    // 스켈레톤은 스타일이 아니라 프롭으로 높이를 받는다.
    expect(CODE).toMatch(/height=\{CARD_HEIGHT\}/)
  })

  it("빈 줄도 카드와 **같은 상수**를 쓴다 — 숫자를 베껴 적지 않는다", () => {
    /*
      `height: 152` 로 적어도 오늘은 같은 그림이다. 그러나 카드가 언젠가 커지면
      빈 날만 옛 크기로 남고, 그때 이 스위트는 여전히 초록이다. 그래서 값이 아니라
      **출처**를 단언한다.
    */
    expect(styleBlock("emptyRail")).toMatch(/height:\s*CARD_HEIGHT/)
  })
})

/**
 * ── 댓글 빈 상태: 위·아래를 **같은 수로 주면 위가 더 커 보인다** ─────────────
 *
 * `댓글 0` 머리가 이 블록 바로 위에 있고, 그 줄의 글자 상자와 제 아래 여백이 눈에는
 * 빈 공간의 일부로 읽힌다 — 왼쪽 끝에 짧은 글자 하나뿐이라 그 줄의 나머지 폭이
 * 통째로 여백처럼 보인다. 아래에는 그런 것이 없다. 그래서 `paddingVertical` 로
 * 숫자를 맞추면 그림은 위로 쏠린다(실기기 확인).
 *
 * 여기서 지키는 것은 **숫자가 아니라 부등호**다. 값을 못 박으면 나중에 머리 모양이
 * 바뀔 때 그 테스트가 방해만 되고, 정작 "다시 대칭으로 되돌리는" 것은 못 막는다.
 */
const POST_DETAIL = readFileSync(
  join(__dirname, "../src/features/recipe/views/PostDetailScreen.tsx"),
  "utf8",
)
const POST_CODE = POST_DETAIL.replace(/\/\*[\s\S]*?\*\//g, "").replace(
  /\/\/[^\n]*/g,
  "",
)

describe("댓글 빈 상태는 아래가 위보다 넓다", () => {
  it("전처리가 실제로 주석을 걷어낸다 (이 스위트의 전제)", () => {
    expect(POST_DETAIL).toContain("눈에는 **빈 공간의 일부**로")
    expect(POST_CODE).not.toContain("눈에는 **빈 공간의 일부**로")
  })

  it("위·아래를 따로 준다 — `paddingVertical` 한 값으로 돌아가지 않는다", () => {
    const start = POST_CODE.indexOf("commentsEmpty: {")
    expect(start).toBeGreaterThan(-1)
    const block = POST_CODE.slice(start, POST_CODE.indexOf("}", start))
    expect(block).not.toMatch(/paddingVertical:/)

    const top = Number(/paddingTop:\s*(\d+)/.exec(block)?.[1])
    const bottom = Number(/paddingBottom:\s*(\d+)/.exec(block)?.[1])
    expect(Number.isFinite(top)).toBe(true)
    expect(Number.isFinite(bottom)).toBe(true)
    expect(bottom).toBeGreaterThan(top)
  })
})
