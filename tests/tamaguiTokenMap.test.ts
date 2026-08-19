/**
 * `scripts/tamaguiTokenMap.ts` 가 **정본과 일치하는지** 대조한다.
 *
 * ## 왜 이 테스트가 이행 전체를 지키는가
 *
 * tamagui 를 걷어내는 동안 `gap="$3"` → `gap={12}` 로 바꾸는 일이 수백 번 일어난다.
 * 그 변환의 근거가 매핑표 하나인데, **표가 틀리면 전부 조용히 틀린다.**
 *
 * 특히 위험한 것은 같은 `$4` 가 prop 에 따라 네 값이라는 점이다:
 *
 * ```
 *   gap        $4 = 16   (space)
 *   width      $4 = 32   (size)
 *   fontSize   $4 = 14   (font)
 *   borderRadius $4 = 8  (radius)
 * ```
 *
 * 8 을 16 으로 옮겨도 타입·린트·기존 테스트가 전부 통과한다. 화면을 열어도
 * 8px 과 16px 은 눈으로 잘 구분되지 않는다 — 리뷰로도 안 잡히는 부류다.
 *
 * 그래서 표를 **정본(`src/theme/tokens.ts`·`fonts.ts`)과 직접 대조**한다.
 * 정본이 바뀌면 이 테스트가 먼저 깨져서, 이행 스크립트가 낡은 값으로 도는 것을 막는다.
 */

import {
  FONT_SIZE,
  LINE_HEIGHT,
  RADIUS,
  SIZE,
  SPACE,
  resolveToken,
  scaleFor,
} from "@/scripts/tamaguiTokenMap"

/* 정본에서 직접 읽는다. createTokens/createFont 호출 결과가 아니라 원본 리터럴을
   파싱한다 — tamagui 런타임을 jest 에 끌어들이지 않기 위해서다. */
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(__dirname, "..")

function parseBlock(src: string, name: string): Record<string, number> {
  // `  space: {  … },` 블록을 통째로 집어 키:값만 추린다.
  const start = src.indexOf(`${name}: {`)
  if (start < 0) throw new Error(`정본에서 '${name}' 블록을 못 찾았다`)
  const end = src.indexOf("},", start)
  const body = src.slice(start, end)
  const out: Record<string, number> = {}
  for (const m of body.matchAll(/^\s*"?([\w.-]+)"?:\s*(-?[\d.]+),/gm)) {
    out[m[1]] = Number(m[2])
  }
  return out
}

const tokensSrc = readFileSync(join(ROOT, "src/theme/tokens.ts"), "utf8")
const fontsSrc = readFileSync(join(ROOT, "src/theme/fonts.ts"), "utf8")

describe("매핑표 ↔ 정본 대조", () => {
  it("space 가 tokens.ts 와 같다", () => {
    expect(SPACE).toEqual(parseBlock(tokensSrc, "space"))
  })

  it("size 가 tokens.ts 와 같다", () => {
    expect(SIZE).toEqual(parseBlock(tokensSrc, "size"))
  })

  it("radius 가 tokens.ts 와 같다", () => {
    expect(RADIUS).toEqual(parseBlock(tokensSrc, "radius"))
  })

  it("fontSize 가 fonts.ts 와 같다", () => {
    expect(FONT_SIZE).toEqual(parseBlock(fontsSrc, "size"))
  })

  it("lineHeight 가 fonts.ts 와 같다", () => {
    expect(LINE_HEIGHT).toEqual(parseBlock(fontsSrc, "lineHeight"))
  })
})

describe("같은 $4 가 prop 마다 다른 값이다 — 이 이행의 핵심 함정", () => {
  it("네 스케일이 서로 다른 숫자를 준다", () => {
    expect(resolveToken("gap", "$4")).toBe(16)
    expect(resolveToken("width", "$4")).toBe(32)
    expect(resolveToken("fontSize", "$4")).toBe(14)
    expect(resolveToken("borderRadius", "$4")).toBe(8)
  })

  it("padding·margin 은 접두사만으로 space 로 간다", () => {
    for (const p of [
      "padding",
      "paddingHorizontal",
      "paddingTop",
      "margin",
      "marginBottom",
    ]) {
      expect(scaleFor(p)).toBe("space")
      expect(resolveToken(p, "$3")).toBe(12)
    }
  })

  it("치수 prop 은 size 로 간다", () => {
    for (const p of ["width", "height", "minWidth", "maxHeight"]) {
      expect(scaleFor(p)).toBe("size")
    }
    expect(resolveToken("height", "$3")).toBe(24)
  })

  it("$12 는 radius 에서만 pill(999) 이다", () => {
    expect(resolveToken("borderRadius", "$12")).toBe(999)
    // space 에는 12 키가 없다 → 추측하지 않고 null.
    expect(resolveToken("gap", "$12")).toBeNull()
  })

  it("소수 키(1.5)도 정확히 해석한다", () => {
    expect(resolveToken("gap", "$1.5")).toBe(6)
  })
})

describe("모르면 null — 추측해서 숫자를 만들지 않는다", () => {
  it("색 토큰은 숫자가 아니므로 null", () => {
    expect(resolveToken("color", "$colorSubtle")).toBeNull()
    expect(resolveToken("backgroundColor", "$cardBackground")).toBeNull()
  })

  it("스케일이 없는 prop 은 null", () => {
    expect(resolveToken("flex", "$1")).toBeNull()
    expect(resolveToken("opacity", "$1")).toBeNull()
  })

  it("표에 없는 키는 null — 가까운 값으로 반올림하지 않는다", () => {
    expect(resolveToken("gap", "$99")).toBeNull()
    expect(resolveToken("fontSize", "$0")).toBeNull()
  })

  it("$ 없는 값은 손대지 않는다", () => {
    expect(resolveToken("gap", "12")).toBeNull()
  })
})
