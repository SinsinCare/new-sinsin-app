/**
 * 답변 마크다운 **정본**. 상담 화면과 식당 상담 시트가 같은 파서·같은 정규화를 쓴다.
 *
 * ## 화면이 줄바꿈을 어떻게 그리는가 (2026-09-02 실측)
 *
 * `react-native-markdown-display` 는 마크다운의 **softbreak(문단 안 줄바꿈 하나)를
 * 그대로 `\n` 으로 그린다**(`src/lib/renderRules.js` 의 `softbreak` 규칙). CommonMark
 * 의 "줄바꿈 하나는 공백" 규칙은 HTML 렌더러에만 있고 이 렌더러는 쓰지 않는다. 즉
 * **모델이 보낸 줄바꿈 하나가 곧 화면의 줄바꿈**이다.
 *
 * 그래서 사용자가 본 결함은 둘 다 모델 쪽 출력이 화면에 그대로 비친 것이다:
 *   - "엉뚱한 데서 줄이 바뀐다" — 모델이 문장 **중간**에서 줄을 바꿨다(어절 단위 랩).
 *   - "문단이 붙어 있다" — 문단 사이에 빈 줄 없이 줄바꿈 하나만 넣어서, 줄은 바뀌되
 *     문단 간격이 없었다.
 *
 * 처방은 두 겹이다. 서버 프롬프트의 형식 계약("문장 중간에서 줄을 바꾸지 마세요 ·
 * 문단 사이 빈 줄 하나")이 정본이고, 여기의 정규화가 새는 것을 받는다. `breaks: true`
 * 는 markdown-it 자체 렌더(테스트·HTML)도 화면과 같은 뜻을 갖게 맞춘 것이다.
 *
 * ## 정규화는 네 가지뿐
 *
 * 모델 출력을 고쳐 쓰지 않는다(뜻이 바뀐다). 화면 결함만 걷어낸다:
 *   1. `\r\n` → `\n` — 이 셋이 섞이면 문단 간격이 줄마다 다르다.
 *   2. 줄 끝 공백 제거 — 마크다운에서 줄 끝 공백 둘은 hard break 라 뜻밖의 빈 줄이 된다.
 *   3. 빈 줄 3개 이상 → 2개 — 문단 사이가 벌어지는 것을 막는다(1개는 건드리지 않는다).
 *   4. **문장 중간 줄바꿈 잇기** — 줄이 문장 끝(마침표·물음표·느낌표·말줄임·쌍점, 또는
 *      요/다/죠/까/네 로 끝나는 한국어 종결)이 아닌 채로 끊기고 다음 줄이 새 블록(목록·
 *      제목·인용·표·코드)이 아니면, 그 줄바꿈은 랩이지 뜻이 아니다 → 공백 하나로 잇는다.
 *      문장 끝에서 끊긴 줄바꿈과 빈 줄은 건드리지 않는다. 코드 펜스 안은 건너뛴다.
 *      판단이 애매하면 **잇지 않는 쪽**이 기본이다 — 줄바꿈이 하나 더 보이는 것이
 *      문장 두 개가 붙는 것보다 낫다.
 *
 * 스트리밍 중에도 매 틱 부른다 — 순수 함수이고 입력 길이에 선형이라 비용이 없다.
 * 스트리밍의 마지막 줄은 아직 끝나지 않은 문장이라 4번 규칙이 그 줄과 다음 줄을 잇지
 * 못하는 경우가 있지만, 다음 틱에 다음 줄이 오면 다시 판정하므로 결과는 같다.
 *
 * ## CJK 강조
 *
 * 한국어는 `**강조**입니다` 처럼 닫는 별표 뒤에 조사가 바로 붙는데 CommonMark 의 플랭킹
 * 규칙이 이를 강조 종료로 인정하지 않아 `**` 가 리터럴로 새었다. cjk-friendly 가 그 규칙을
 * CJK 기준으로 고친다. 파서 인스턴스는 상태가 없어 두 표면이 공유해도 안전하다.
 */

import MarkdownIt from "markdown-it"
import markdownItCjkFriendly from "markdown-it-cjk-friendly"

export const markdownItInstance = MarkdownIt({
  typographer: true,
  breaks: true,
}).use(markdownItCjkFriendly)

const TRAILING_SPACES = /[ \t]+$/gm
const EXCESS_BLANK_LINES = /\n{3,}/g

/** 줄이 여기서 끝나면 문장이 끝난 것이다 — 그 줄바꿈은 뜻이므로 남긴다. */
const SENTENCE_END = /(?:[.!?…:;]|[)\]"'”’』」】]|[요다죠까네])$/
/** 이런 줄로 시작하면 새 블록이다 — 앞 줄과 이어 붙이면 마크다운이 깨진다. */
const BLOCK_START = /^(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|>|\||```|~~~|---|\*\*\*)/
const FENCE = /^(?:```|~~~)/

function joinMidSentenceBreaks(text: string): string {
  const lines = text.split("\n")
  const out: string[] = []
  let inFence = false
  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence
    const prev = out.length > 0 ? out[out.length - 1] : null
    const canJoin =
      !inFence &&
      prev !== null &&
      prev.length > 0 &&
      line.length > 0 &&
      !SENTENCE_END.test(prev) &&
      !BLOCK_START.test(prev) &&
      !BLOCK_START.test(line) &&
      !FENCE.test(line)
    if (canJoin) out[out.length - 1] = `${prev} ${line}`
    else out.push(line)
  }
  return out.join("\n")
}

/** 화면 결함만 걷어낸다(머리말). 뜻·문장·기호는 그대로. */
export function normalizeAssistantMarkdown(text: string): string {
  if (text.length === 0) return text
  return joinMidSentenceBreaks(
    text
      .replace(/\r\n?/g, "\n")
      .replace(TRAILING_SPACES, "")
      .replace(EXCESS_BLANK_LINES, "\n\n"),
  )
}
