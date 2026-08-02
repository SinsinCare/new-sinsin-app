// 국어의 로마자 표기법(Revised Romanization). 자모 분해로 결정론적으로 만든다.
//
// 번역이 아니라 **표기 변환**이다. 검증된 영어 이름이 없는 한국어 음식명을
// "Food" 로 지워 버리는 대신 읽을 수 있는 이름을 주기 위한 최후 폴백이다.
// 서버(`app/nutrition_analysis/domains/result_presentation.py`)의 같은 표와
// 짝을 이룬다 — 한쪽만 고치면 화면에 따라 이름이 달라진다.

const INITIALS = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
] as const

const MEDIALS = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
] as const

const FINALS = [
  "",
  "k",
  "k",
  "k",
  "n",
  "n",
  "n",
  "t",
  "l",
  "k",
  "m",
  "p",
  "t",
  "t",
  "p",
  "l",
  "m",
  "p",
  "p",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
] as const

/** 뒤 음절이 초성 ㅇ(무음)이면 받침이 넘어가며 소리가 바뀐다. 볶음 → bokkeum. */
const FINAL_ONSET: Record<number, string> = {
  1: "g",
  2: "kk",
  4: "n",
  7: "d",
  8: "r",
  16: "m",
  17: "b",
  19: "s",
  20: "ss",
  21: "ng",
  22: "j",
  23: "ch",
  24: "k",
  25: "t",
  26: "p",
  27: "h",
}

const HANGUL_BASE = 0xac00
const HANGUL_LAST = 0xd7a3
const SILENT_INITIAL = 11 // ㅇ

function syllableCode(char: string): number | null {
  const code = char.charCodeAt(0)
  return code >= HANGUL_BASE && code <= HANGUL_LAST ? code - HANGUL_BASE : null
}

export function romanizeKorean(text: string): string {
  const codes = [...text].map(syllableCode)
  const chars = [...text]
  let out = ""

  for (let index = 0; index < chars.length; index += 1) {
    const code = codes[index]
    if (code === null) {
      out += chars[index]
      continue
    }
    const initial = Math.floor(code / 588)
    const medial = Math.floor((code % 588) / 28)
    const final = code % 28

    out += INITIALS[initial] + MEDIALS[medial]
    if (!final) continue

    const following = index + 1 < codes.length ? codes[index + 1] : null
    const carriesOver =
      following !== null &&
      Math.floor(following / 588) === SILENT_INITIAL &&
      final in FINAL_ONSET
    out += carriesOver ? FINAL_ONSET[final] : FINALS[final]
  }

  return out
}

/** 문장식 대문자로 다듬은 로마자 표기. */
export function romanizedDisplayName(name: string): string {
  const romanized = name
    .split(/\s+/)
    .filter(Boolean)
    .map(romanizeKorean)
    .join(" ")
    .trim()
  if (!romanized) return "Food"
  return romanized.charAt(0).toUpperCase() + romanized.slice(1)
}
