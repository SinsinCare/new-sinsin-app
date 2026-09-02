/**
 * 답변 마크다운 정본(`chatMarkdown.ts`).
 *
 * 사용자 신고(2026-09-01): "줄바꿈이 있어야 할 문단이 붙어 있거나, 엉뚱한 데서 줄이
 * 바뀐다". 화면 렌더러(react-native-markdown-display)는 softbreak 를 그대로 줄바꿈으로
 * 그리므로 둘 다 모델 출력이 비친 것이다 — 모델 쪽은 서버 프롬프트 계약이 맡고, 여기서는
 * 파서가 줄바꿈을 어떻게 읽는지와 **정규화의 경계**(문장 중간 랩만 잇고 나머지는 그대로)
 * 를 못 박는다.
 */
import {
  markdownItInstance,
  normalizeAssistantMarkdown,
} from "../src/features/consultation/utils/chatMarkdown"

function tokenTypes(markdown: string): string[] {
  const out: string[] = []
  for (const token of markdownItInstance.parse(markdown, {})) {
    out.push(token.type)
    for (const child of token.children ?? []) out.push(child.type)
  }
  return out
}

describe("답변 마크다운 파서", () => {
  test("문단 안 줄바꿈 하나는 softbreak 토큰이고 문단은 하나다 — 화면은 이것을 줄바꿈으로 그린다", () => {
    const types = tokenTypes("국물에 소금이 많아요.\n건더기만 드세요.")
    // react-native-markdown-display 의 softbreak 규칙은 `\n` 을 그린다(renderRules.js).
    expect(types).toContain("softbreak")
    expect(types.filter((t) => t === "paragraph_open")).toHaveLength(1)
    // markdown-it 자체 렌더(breaks: true)도 화면과 같은 뜻이다.
    expect(markdownItInstance.render("가.\n나.")).toContain("<br>")
  })

  test("빈 줄 하나는 문단 경계다", () => {
    const types = tokenTypes("첫 문단이에요.\n\n둘째 문단이에요.")
    expect(types.filter((t) => t === "paragraph_open")).toHaveLength(2)
  })

  test("닫는 별표 뒤에 조사가 붙어도 강조가 살아 있다 — cjk-friendly", () => {
    const types = tokenTypes("**국물**은 남기세요.")
    expect(types).toContain("strong_open")
    const text = markdownItInstance.renderInline("**국물**은 남기세요.")
    expect(text).toContain("<strong>국물</strong>은")
  })

  test("목록 앞뒤 빈 줄이 있으면 목록으로 읽힌다", () => {
    const types = tokenTypes(
      "방법이에요.\n\n- 그릇 바꾸기\n- 건더기만 먹기\n- 국물 남기기\n\n의료진과 정하세요.",
    )
    expect(types).toContain("bullet_list_open")
    expect(types.filter((t) => t === "list_item_open")).toHaveLength(3)
  })
})

describe("정규화 — 화면 결함만 걷어낸다", () => {
  test("빈 줄 3개 이상은 2개로 접힌다. 1개·2개는 그대로다", () => {
    // 문장 끝(마침표)에서 끊긴 줄만 쓴다 — 4번 규칙(문장 중간 잇기)이 끼지 않게.
    expect(normalizeAssistantMarkdown("가요.\n\n\n\n나요.")).toBe(
      "가요.\n\n나요.",
    )
    expect(normalizeAssistantMarkdown("가요.\n\n나요.")).toBe("가요.\n\n나요.")
    expect(normalizeAssistantMarkdown("가요.\n나요.")).toBe("가요.\n나요.")
  })

  test("줄 끝 공백을 지운다 — 공백 둘이 숨은 hard break 가 되지 않게", () => {
    expect(normalizeAssistantMarkdown("가요.  \n나요.\t\n다요.")).toBe(
      "가요.\n나요.\n다요.",
    )
  })

  test("CRLF·CR 을 LF 로 맞춘다", () => {
    expect(normalizeAssistantMarkdown("가요.\r\n\r\n나요.\r다요.")).toBe(
      "가요.\n\n나요.\n다요.",
    )
  })

  test("뜻은 건드리지 않는다 — 문장·기호·숫자 그대로", () => {
    const text =
      "칼륨 6.0 mEq/L 이상이면 **즉시** 연락하세요.\n\n- 항목 (1)\n- 항목 2"
    expect(normalizeAssistantMarkdown(text)).toBe(text)
  })

  test("빈 문자열은 빈 문자열이다", () => {
    expect(normalizeAssistantMarkdown("")).toBe("")
  })
})

describe("정규화 — 문장 중간 줄바꿈 잇기", () => {
  test("문장 중간에서 끊긴 줄은 공백 하나로 잇는다 — 모델의 어절 랩", () => {
    expect(normalizeAssistantMarkdown("국물에 소금이\n많아요.")).toBe(
      "국물에 소금이 많아요.",
    )
    expect(
      normalizeAssistantMarkdown(
        "칼륨이 높은 과일은\n바나나, 참외,\n키위예요.",
      ),
    ).toBe("칼륨이 높은 과일은 바나나, 참외, 키위예요.")
  })

  test("문장 끝에서 끊긴 줄바꿈은 남긴다 — 마침표·물음표·한국어 종결", () => {
    expect(normalizeAssistantMarkdown("많아요.\n건더기만 드세요.")).toBe(
      "많아요.\n건더기만 드세요.",
    )
    expect(normalizeAssistantMarkdown("괜찮을까요?\n네.")).toBe(
      "괜찮을까요?\n네.",
    )
    expect(
      normalizeAssistantMarkdown("국물은 남기세요\n건더기는 괜찮아요"),
    ).toBe("국물은 남기세요\n건더기는 괜찮아요")
  })

  test("빈 줄(문단 경계)은 건드리지 않는다", () => {
    expect(normalizeAssistantMarkdown("소금이\n\n많아요.")).toBe(
      "소금이\n\n많아요.",
    )
  })

  test("목록·제목·인용·표로 시작하는 줄과는 잇지 않는다", () => {
    expect(
      normalizeAssistantMarkdown("방법은\n- 그릇 바꾸기\n- 국물 남기기"),
    ).toBe("방법은\n- 그릇 바꾸기\n- 국물 남기기")
    expect(normalizeAssistantMarkdown("- 그릇 바꾸기\n- 국물 남기기")).toBe(
      "- 그릇 바꾸기\n- 국물 남기기",
    )
    expect(normalizeAssistantMarkdown("1. 첫째\n2. 둘째")).toBe(
      "1. 첫째\n2. 둘째",
    )
    expect(normalizeAssistantMarkdown("정리하면\n## 제목")).toBe(
      "정리하면\n## 제목",
    )
  })

  test("코드 펜스 안은 그대로다", () => {
    const code = "```\nconst a\n= 1\n```"
    expect(normalizeAssistantMarkdown(code)).toBe(code)
  })

  test("스트리밍 중간 상태(마지막 줄 미완)도 안전하다 — 다음 틱에 같은 결과", () => {
    const partial = "국물에 소금이"
    const full = "국물에 소금이\n많아요."
    expect(normalizeAssistantMarkdown(partial)).toBe(partial)
    expect(normalizeAssistantMarkdown(full)).toBe("국물에 소금이 많아요.")
  })
})
