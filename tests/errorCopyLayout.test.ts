/**
 * 에러 문구가 **실제 글줄 폭에서 어떻게 접히는지**를 지킨다.
 *
 * ## 왜 문구 테스트에 레이아웃이 끼어드는가
 *
 * 오류 안내는 한 번 읽고 바로 행동해야 하는 글이다. 그런데 토스트/다이얼로그는
 * 폭이 좁아서, 문구를 두 글자만 늘려도 마지막 줄에 `주세요` 한 어절만 덩그러니
 * 남는다. 그 고아 줄은 문장보다 먼저 눈에 들어와서 읽는 순서를 흐트러뜨린다.
 * 실제로 이 검사를 처음 돌렸을 때 네 곳이 걸렸고, 그중 하나가 사진 제보의 주인공인
 * `SIGNUP_ERROR_001` 의 본문이었다(`…재설정하면` / `돼요.`).
 *
 * ## 글자 폭은 근사값이다
 *
 * 실제 렌더링은 Pretendard 의 글리프 폭으로 정해지고 여기서는 그걸 근사한다
 * (한글 음절 1.0em, 라틴 0.53~0.66em). **정확한 픽셀을 재는 것이 목적이 아니라**,
 * 문구가 한 단 안에 편하게 들어가는지 · 어절 하나가 단보다 넓지는 않은지 ·
 * `numberOfLines` 안에 들어오는지를 잡는 것이 목적이다. 그래서 판정은 여유를 두고,
 * 걸리면 대개 문구를 몇 글자 줄이는 것으로 끝난다.
 *
 * iOS 의 `lineBreakStrategyIOS="hangul-word"` 와 Android 의
 * `textBreakStrategy="balanced"` 가 어절 중간 분절을 막아 주므로, 여기서도
 * **공백 단위**로 접는다(`Toast.tsx` · `V2Modal.tsx` 머리말 참고).
 */

import enErrors from "@/src/i18n/locales/en/errors.json"
import koErrors from "@/src/i18n/locales/ko/errors.json"

/** Pretendard 글자 폭 근사(em). */
function advance(char: string): number {
  const code = char.codePointAt(0) ?? 0
  if (char === " ") return 0.26
  if (code >= 0xac00 && code <= 0xd7a3) return 1.0 // 한글 음절
  if (code >= 0x3131 && code <= 0x318e) return 1.0 // 낱자
  if (/[0-9]/.test(char)) return 0.55
  if (/[A-Z]/.test(char)) return 0.66
  if (/[a-z]/.test(char)) return 0.53
  if (/[·—…]/.test(char)) return 0.9
  return 0.34
}

function width(text: string, fontSize: number, letterSpacing: number): number {
  let total = 0
  for (const char of text) total += advance(char) * fontSize + letterSpacing
  return total
}

function wrap(
  text: string,
  column: number,
  fontSize: number,
  letterSpacing: number,
): string[] {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word
    if (!line || width(candidate, fontSize, letterSpacing) <= column) {
      line = candidate
      continue
    }
    lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  return lines
}

/**
 * 글줄 폭은 컴포넌트에서 그대로 계산했다.
 *  - 토스트: 390(기기) − 40(마진) − 36(패딩) − 30(아이콘+간격) = 284
 *    버튼은 아래 줄로 내려가 있어 글줄 폭을 깎지 않는다(`Toast.tsx` 머리말).
 *  - 다이얼로그: 320(카드 최대) − 48(좌우 24) = 272
 * `max` 는 각 컴포넌트의 `numberOfLines` 또는 넘으면 카드가 화면을 먹는 한계다.
 */
const SURFACES = [
  { name: "toast/title", column: 284, size: 15, letterSpacing: -0.3, max: 2 },
  { name: "toast/body", column: 284, size: 13, letterSpacing: -0.26, max: 4 },
  { name: "dialog/title", column: 272, size: 20, letterSpacing: 0, max: 3 },
  { name: "dialog/body", column: 272, size: 15, letterSpacing: 0, max: 4 },
] as const

/** `catalog.ts` 의 `DIALOG_CODES`. 나머지는 전부 토스트로 나간다. */
const DIALOG_CODES = new Set([
  "SIGNUP_ERROR_001",
  "SIGNUP_ERROR_004",
  "AUTH_ERROR_006",
  "AUTH_ERROR_007",
  "AUTH_ERROR_008",
  "AUTH_ERROR_009",
])

type Entry = { title: string; body: string }

function entriesOf(dict: {
  code: Record<string, Entry>
  transport: Record<string, Entry>
}): { key: string; entry: Entry; isDialog: boolean }[] {
  return [
    ...Object.entries(dict.code).map(([key, entry]) => ({
      key,
      entry,
      isDialog: DIALOG_CODES.has(key),
    })),
    // transport 는 코드가 없을 때의 폴백이라 늘 토스트다.
    ...Object.entries(dict.transport).map(([key, entry]) => ({
      key: `transport.${key}`,
      entry,
      isDialog: false,
    })),
  ]
}

function layoutProblems(
  language: string,
  dict: Parameters<typeof entriesOf>[0],
): string[] {
  const problems: string[] = []
  for (const { key, entry, isDialog } of entriesOf(dict)) {
    for (const surface of SURFACES) {
      if (surface.name.startsWith("dialog") !== isDialog) continue
      const text = surface.name.endsWith("title") ? entry.title : entry.body
      if (!text) continue
      // 글자 폭 근사의 오차를 흡수하려고 단을 3% 좁혀 본다. 경계에 걸친 문구는
      // 실제 기기/폰트에서 어느 쪽으로 떨어질지 모르므로 좁은 쪽 기준으로 잡는다.
      const lines = wrap(
        text,
        surface.column * 0.97,
        surface.size,
        surface.letterSpacing,
      )

      // 1) 어절 하나가 단보다 넓다 — hangul-word 로도 못 막고 중간에서 끊긴다.
      const tooWide = lines.find(
        (line) =>
          !line.includes(" ") &&
          width(line, surface.size, surface.letterSpacing) > surface.column,
      )
      if (tooWide) {
        problems.push(
          `${language} ${key} @${surface.name}: 어절 "${tooWide}" 가 단보다 넓어요`,
        )
      }

      // 2) numberOfLines 를 넘으면 **해결 방법이 잘려 나간다.**
      if (lines.length > surface.max) {
        problems.push(
          `${language} ${key} @${surface.name}: ${lines.length}줄 (최대 ${surface.max}줄)`,
        )
      }

      // 3) 마지막 줄에 짧은 어절 하나만 남는 고아 줄.
      //    끝의 마침표는 세지 않는다 — `주세요.` 는 네 글자지만 눈에는 `주세요` 한
      //    어절이 떨어져 나온 것으로 보인다(브라우저 미리보기에서 실제로 그렇게 보였다).
      const last = lines[lines.length - 1]
      const bare = last.replace(/[.!?…]+$/u, "")
      if (lines.length > 1 && !last.includes(" ") && [...bare].length <= 3) {
        problems.push(
          `${language} ${key} @${surface.name}: 마지막 줄이 "${last}" 하나뿐이에요`,
        )
      }
    }
  }
  return problems
}

describe("error copy layout", () => {
  it("wraps cleanly in Korean", () => {
    expect(layoutProblems("ko", koErrors)).toEqual([])
  })

  it("wraps cleanly in English", () => {
    expect(layoutProblems("en", enErrors)).toEqual([])
  })
})
