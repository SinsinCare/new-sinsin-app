/**
 * 지도·목록 상단 **카테고리 칩 레일의 시각 계약** — 시안 `A3_1`·`A6_1` 3배 렌더 실측.
 *
 * 이 자리는 두 번 뒤집혔다. 2026-07-31 에 "잉크 면 + 반전 글자 + 미선택 45% 그림" 으로
 * 갈아엎었고, 2026-08-20 새 시안에서 "브랜드 테두리 + 옅은 틴트 면 + 총천연색 그림" 으로
 * 돌아왔다. 같은 자리가 두 번 뒤집힌 만큼 **어느 쪽이 정본인지**를 값으로 못 박는다.
 *
 * ## 2026-08-21 — 이 파일이 가짜였다
 *
 * 종전 판은 다섯 개 가드로 선택 표시를 지킨다고 했지만, 선택 분기(브랜드 테두리 + 틴트
 * 면)를 **통째로 지워도 전부 초록**이었다. 병인 둘:
 *
 *   1. 소스 파일 전체에 `toContain` — 그 문자열이 어느 스타일 블록에 묶이는지, 그래서
 *      캐스케이드에서 이기는지를 안 봤다. `HEIGHT` 는 선언만 보고 `chip.height` 가 그걸
 *      쓰는지 안 봤고, `expect(spacing[12]).toBeGreaterThanOrEqual(6)` 은 컴포넌트와
 *      무관한 `12 >= 6` 이라 언제나 참이었다.
 *   2. 대비를 본다면서 **문자열 같음**만 봤다(`expect(face).not.toBe(label.normal)`).
 *      완전히 같을 때만 실패하므로 2026-08-19 사고(흰 면 위 흰 글자)의 다크판을 못 잡는다.
 *
 * 처방은 둘이다.
 *
 *   - **값으로 본다.** 색·굵기·그림자는 `railChipSurface()`(순수 함수)가 풀어 주므로
 *     렌더 없이 호출해서 비교한다. 대비는 상대휘도로 실제 비율을 계산한다.
 *   - **소스를 봐야 하는 것(치수)은 적용 블록을 잘라서 본다.** 선언이 아니라
 *     `StyleSheet` 안의 그 속성이 그 상수를 쓰는지까지 확인한다.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import koCommon from "../src/i18n/locales/ko/common.json"
import { railChipSurface } from "../src/features/restaurant/components/categoryChipSurface"
import { FLOATING_SHADOW } from "../src/features/restaurant/components/mapFloating"
import { RAIL_CUISINE_TYPES } from "../src/features/restaurant/data/filterCatalog"
import { resolveTheme } from "../src/design-system-v2/theme"
import { over } from "../src/design-system-v2/tokens/blend"
import { spacing } from "../src/design-system-v2/tokens/spacing"
import { radius } from "../src/design-system-v2/tokens/radius"
import {
  controlHeight,
  iconSize,
  touchTarget,
} from "../src/design-system-v2/tokens/size"
import { typography } from "../src/design-system-v2/tokens/typography"

const ROOT = join(__dirname, "..")
const COMPONENTS = join(ROOT, "src/features/restaurant/components")
const RAIL = readFileSync(join(COMPONENTS, "CategoryChipRail.tsx"), "utf-8")
const SURFACE = readFileSync(
  join(COMPONENTS, "categoryChipSurface.ts"),
  "utf-8",
)
const ART = readFileSync(join(COMPONENTS, "cuisineArt.tsx"), "utf-8")

/** 주석 제거 — 실측값을 적어 둔 주석이 "리터럴 hex" 나 배선으로 잡히지 않게. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

const RAIL_CODE = code(RAIL)

/**
 * `needle` 뒤에 오는 첫 `open` 부터 짝이 맞는 `close` 까지를 잘라 준다.
 *
 * 파일 전체에 `toContain` 하면 값이 어느 블록에 묶였는지 안 보인다 — 서로 맞바꿔도
 * 초록이다. 블록을 잘라서 봐야 "이 속성이 그 값을 쓴다" 가 검사가 된다.
 * (선례: `restaurantDetailDensity.test.ts` 의 `<DetailActionBar … />` 절단.)
 */
function block(
  source: string,
  needle: string,
  open = "{",
  close = "}",
): string {
  const at = source.indexOf(needle)
  expect(at).toBeGreaterThan(-1)
  const from = source.indexOf(open, at)
  expect(from).toBeGreaterThan(-1)
  let depth = 0
  for (let i = from; i < source.length; i++) {
    if (source[i] === open) depth += 1
    else if (source[i] === close) {
      depth -= 1
      if (depth === 0) return source.slice(from, i + 1)
    }
  }
  throw new Error(`닫히지 않은 블록: ${needle}`)
}

/** `StyleSheet.create({ … })` 안의 한 이름의 블록. */
function styleBlock(name: string): string {
  return block(RAIL_CODE, `\n  ${name}: {`)
}

/** `Pressable` 의 style 배열만 잘라 본다 — 파일 어딘가가 아니라 **여기** 있어야 한다. */
function pressableStyle(): string {
  return block(RAIL_CODE, "style={({ pressed }) =>", "[", "]")
}

/** 소스에 적힌 `spacing[n]` 표현을 실제 숫자로 푼다(적용값 파싱). */
function spacingStep(source: string, expression: RegExp): number {
  const hit = source.match(expression)
  expect(hit).not.toBeNull()
  const step = Number(hit![1]) as keyof typeof spacing
  expect(spacing[step]).toBeDefined()
  return spacing[step]
}

/* ────────────────────── 대비 (WCAG 상대휘도) ────────────────────── */

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** `#rrggbb` 의 상대휘도. 이 파일이 다루는 면은 전부 불투명 값이다. */
function luminance(hex: string): number {
  expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/u)
  const n = parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 0xff) +
    0.7152 * channel((n >> 8) & 0xff) +
    0.0722 * channel(n & 0xff)
  )
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/* ────────────────────── 해석된 표면 ────────────────────── */

const MODES = ["light", "dark"] as const
type Mode = (typeof MODES)[number]

const palette = (mode: Mode) => resolveTheme(mode).colors
const chip = (mode: Mode, active: boolean) =>
  railChipSurface({ active, mode, colors: palette(mode) })

const light = palette("light")
const dark = palette("dark")

describe("대비 계산기 자체", () => {
  it("WCAG 극단값이 맞는다 — 이 계산기가 틀리면 아래 단언이 전부 헛것이다", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 1)
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5)
    // 알려진 값: #767676 은 흰 배경에서 정확히 AA 경계(4.54:1) 근처다.
    expect(contrast("#ffffff", "#767676")).toBeGreaterThan(4.5)
    expect(contrast("#ffffff", "#777777")).toBeLessThan(4.5)
  })
})

describe("카테고리 칩 — 시안 실측값과 토큰", () => {
  it("선택 테두리와 글자는 토큰이 곧 실측값이다", () => {
    // 시안 실측: 선택 칩 테두리 3px 전부 #FE7139, 글자 #2A2A37.
    expect(light.primary.primary.toUpperCase()).toBe("#FE7139")
    expect(light.label.normal.toUpperCase()).toBe("#2A2A37")
  })

  it("라이트 선택 면은 시안의 #FFF8F6 으로 **해석된다**", () => {
    /*
      항진명제를 피한다 — 상수를 보간해 그 상수와 대조하지 않고, 컴포넌트가 실제로
      쓰게 될 값(순수 함수의 반환)을 시안 실측 리터럴에 못으로 박는다.
    */
    expect(chip("light", true).backgroundColor.toUpperCase()).toBe("#FFF8F6")
    expect(chip("light", false).backgroundColor.toUpperCase()).toBe("#FFFFFF")
    // 그 리터럴이 스포이드가 아니라 토큰의 계산 결과라는 증거.
    expect(
      over(light.primary.primaryWeak, light.background.default).toUpperCase(),
    ).toBe("#FFF8F6")
  })

  it("그래서 primaryWeak 를 **그대로** 깔면 안 된다 — 알파가 붙은 값이다", () => {
    /*
      이 검사가 `over()` 의 존재 이유다. 라이트의 primaryWeak 는 8자리(알파 0x99)라,
      흰 시트 위(목록)에서는 시안값이 우연히 그냥 나오지만 **지도 위에서는 타일이
      40% 비쳐** 칩이 반투명해진다. 칩 자신의 면에 합성해 불투명 값으로 굳혀야
      두 화면에서 같은 색이 된다.
    */
    expect(light.primary.primaryWeak).toMatch(/^#[0-9a-f]{8}$/u)
    expect(chip("light", true).backgroundColor).not.toBe(
      light.primary.primaryWeak,
    )
  })
})

describe("카테고리 칩 — 선택은 실제로 달라 보인다", () => {
  it.each(MODES)("%s: 선택과 미선택이 값으로 갈린다", (mode) => {
    /*
      **이 라운드의 BLOCKER 가 여기다.** 종전에는 소스에 문자열이 있는지만 봐서,
      `active` 를 무시하도록 분기를 지워도 다섯 가드가 전부 초록이었다.
      해석된 값을 비교하면 그 변이가 여기서 죽는다.
    */
    const on = chip(mode, true)
    const off = chip(mode, false)

    // 1) 테두리 — 두 모드 공통의 주 신호.
    expect(on.borderColor).not.toBe(off.borderColor)
    expect(on.borderColor.toUpperCase()).toBe("#FE7139")

    // 2) 굵기 — 색맹 이중화(시안엔 없지만 일부러 남긴 것).
    expect(on.typography.fontFamily).not.toBe(off.typography.fontFamily)

    // 3) 셋을 한꺼번에 지우는 변이도 막는다.
    expect(on).not.toEqual(off)
  })

  it("라이트에서는 면까지 갈린다 — 시안의 옅은 브랜드 틴트", () => {
    expect(chip("light", true).backgroundColor).not.toBe(
      chip("light", false).backgroundColor,
    )
  })
})

describe("카테고리 칩 — 다크에서 선택 칩이 더 어두워지지 않는다", () => {
  /*
    2026-08-21 지적. 다크 `primary.primaryWeak` 는 `#282828`(불투명 진회색, 토큰 파일에
    `TODO(design)` 로 미정이라 적혀 있다)이라, 칩 면에 얹으면 `#313135` → `#282828` 로
    **내려간다**. `mapOverlayChrome` 이 세운 "다크 타일 위에서 컨트롤 면을 한 단 올린다"
    를 이 칩 하나만 역행했다. 그래서 다크에서는 틴트를 깔지 않는다.
  */
  it("선택 면이 미선택 면보다 어둡지 않다", () => {
    expect(
      luminance(chip("dark", true).backgroundColor),
    ).toBeGreaterThanOrEqual(luminance(chip("dark", false).backgroundColor))
  })

  it("두 상태 모두 지도 바닥(background.default)보다 한 단 위다", () => {
    // mapOverlayChrome 의 계약. 선택했다고 지도에 도로 묻히면 안 된다.
    const floor = luminance(dark.background.default)
    expect(luminance(chip("dark", false).backgroundColor)).toBeGreaterThan(
      floor,
    )
    expect(luminance(chip("dark", true).backgroundColor)).toBeGreaterThan(floor)
  })

  it("그 대신 다크의 선택은 브랜드 테두리가 진다 — 면에 대비 3:1 이상", () => {
    // 면이 안 바뀌므로 테두리가 안 보이면 다크에서 선택 상태가 사라진다.
    const on = chip("dark", true)
    expect(contrast(on.borderColor, on.backgroundColor)).toBeGreaterThanOrEqual(
      3,
    )
  })

  it("다크에서 브랜드 틴트를 면에 얹으면 실제로 내려간다 — 위 단언의 근거", () => {
    /*
      "그러면 다크에도 그냥 틴트를 깔면 되지 않나" 에 대한 답을 값으로 남긴다.
      이 계산이 뒤집히는 날(= Figma 가 다크 primaryWeak 를 확정하는 날) 분기를 지우면 된다.
    */
    const tinted = over(dark.primary.primaryWeak, dark.background.lower)
    expect(luminance(tinted)).toBeLessThan(luminance(dark.background.lower))
  })
})

describe("카테고리 칩 — 면 위 글자가 읽힌다 (상대휘도로 실제 대비)", () => {
  /*
    종전 단언은 `expect(face).not.toBe(dark.label.normal)` — 두 값이 **완전히 같을 때만**
    실패한다. 2026-08-19 사고(흰 면 위 흰 글자)는 대비 1.0:1 이었으니 그건 잡혔겠지만,
    대비 1.4:1 짜리 회색 조합은 그대로 통과한다. 비율을 직접 잰다.
  */
  it.each(MODES)("%s: 선택·미선택 모두 라벨 대비 4.5:1 이상", (mode) => {
    for (const active of [true, false]) {
      const surface = chip(mode, active)
      expect(
        contrast(surface.backgroundColor, surface.color),
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("라벨 잉크는 두 상태가 같다 — 면이 뒤집히지 않으므로 반전 짝이 없다", () => {
    for (const mode of MODES) {
      expect(chip(mode, true).color).toBe(chip(mode, false).color)
      expect(chip(mode, true).color).toBe(palette(mode).label.normal)
    }
    // 상태로 잉크를 가르는 코드가 되살아나면 2026-08-19 사고 형태가 다시 생긴다.
    expect(code(SURFACE)).not.toMatch(/color:\s*active\s*\?/u)
    expect(code(SURFACE)).not.toContain("static.white")
  })
})

describe("카테고리 칩 — 선택이 칩 폭을 흔들지 않는다", () => {
  it("테두리 두께가 두 상태에서 같다", () => {
    // Yoga 는 border 를 padding 처럼 상자에 더한다. 1→1.5pt 는 뒤 칩들을 민다.
    for (const mode of MODES) {
      expect(chip(mode, true).borderWidth).toBe(chip(mode, false).borderWidth)
      expect(chip(mode, true).borderWidth).toBeGreaterThan(0)
    }
    // 칩 스타일이 그 값을 덮어쓰지 않는다(덮으면 순수 함수가 정하는 게 아니게 된다).
    expect(styleBlock("chip")).not.toContain("borderWidth")
  })

  it("굵기 이중화는 **한글 라벨**의 폭을 안 흔든다 — 라틴은 리플로우한다", () => {
    /*
      2026-08-21 지적: 종전 이름은 "칩 폭을 흔들지 않는다" 였는데, 폭을 정하는 것은
      face 별 advance 이고 검사하는 것은 fontSize/lineHeight 동일 + fontFamily 상이뿐이다.
      한글은 참이지만 **영어 로케일에서는 거짓**이다.

      그래서 주장을 좁힌다. 근거와 선택:
        - Pretendard 는 한글 advance 가 Regular·Medium·SemiBold·Bold 넷 다 1770/2048 로
          같다(hmtx). 시안은 ko 한 벌이고, 레일 라벨은 전부 한글이다(아래 단언).
        - en 로케일에서는 라벨이 몇 pt 리플로우한다. 가로 ScrollView 라 뒤 칩이 조금
          밀릴 뿐 잘리거나 겹치지 않는다 — 그 대가를 **알고** 치른다.
        - 폭이 고정된 대안(테두리 두께·체크 아이콘)은 전부 폭을 더 크게 흔든다.
          색 말고 남는 신호가 이것뿐이라 지우지 않는다.
    */
    const on = typography.label.xSmall
    const off = typography.label.xSmallWeak
    expect(on.fontSize).toBe(off.fontSize)
    expect(on.lineHeight).toBe(off.lineHeight)
    expect(on.letterSpacing).toBe(off.letterSpacing)
    expect(on.fontFamily).not.toBe(off.fontFamily)

    // "한글 라벨 기준" 이 실제로 성립하는지 — ko 리소스를 직접 본다.
    const HANGUL_ONLY = /^[가-힣]+$/u
    for (const spec of RAIL_CUISINE_TYPES) {
      const label =
        koCommon.restaurant.cuisine[
          spec.value as keyof typeof koCommon.restaurant.cuisine
        ]
      expect(label).toBeDefined()
      expect(label).toMatch(HANGUL_ONLY)
    }

    // 굵기는 face 로만 말한다(DS 규칙). fontWeight 를 주면 OS 기본 서체로 그려진다.
    expect(code(SURFACE)).not.toContain("fontWeight")
    expect(RAIL_CODE).not.toContain("fontWeight")
  })
})

describe("카테고리 칩 — 지도 위 경계는 선이 아니라 그림자다", () => {
  /*
    2026-08-21 지적: `FLOATING_SHADOW` 를 잡는 테스트가 저장소에 0건이었다. 시안의 지도
    화면에서 미선택 칩은 hairline 없이 배경(#efeff0)에서 면(#ffffff)으로 직행한다 —
    둘을 가르는 것이 그림자다. 장식이 아니라 경계 그 자체라 지우면 칩이 사라진다.
  */
  it("두 상태 모두 공용 플로팅 그림자를 진다", () => {
    for (const mode of MODES) {
      expect(chip(mode, true).shadow).toBe(FLOATING_SHADOW)
      expect(chip(mode, false).shadow).toBe(FLOATING_SHADOW)
    }
  })

  it("그 그림자가 무력화된 값이 아니다", () => {
    // `shadowOpacity: 0` 이나 `elevation: 0` 이면 값은 있는데 경계는 없다.
    expect(FLOATING_SHADOW.shadowOpacity!).toBeGreaterThan(0)
    expect(FLOATING_SHADOW.shadowRadius!).toBeGreaterThan(0)
    // 안드로이드는 shadow* 를 무시하고 elevation 만 본다.
    expect(FLOATING_SHADOW.elevation!).toBeGreaterThan(0)
  })

  it("칩이 그 그림자를 실제로 얹는다", () => {
    expect(pressableStyle()).toContain("surface.shadow")
  })
})

describe("카테고리 칩 — 배선(적용 블록 안에 있는가)", () => {
  it("면·테두리는 순수 함수가 푼 값을 그대로 얹는다", () => {
    const applied = pressableStyle()
    expect(applied).toContain("backgroundColor: surface.backgroundColor")
    expect(applied).toContain("borderColor: surface.borderColor")
    expect(applied).toContain("borderWidth: surface.borderWidth")
    // 색을 이 파일에서 다시 고르지 않는다.
    expect(applied).not.toContain("colors.")
    expect(RAIL_CODE).toContain("railChipSurface({ active, mode, colors })")
  })

  it("라벨도 같은 표면에서 온다", () => {
    const applied = block(RAIL_CODE, "<Text", "[", "]")
    expect(applied).toContain("surface.typography")
    expect(applied).toContain("color: surface.color")
  })

  it("미선택 면·hairline 은 여전히 지도 오버레이 공용 chrome 이다", () => {
    // 선택 표시를 바꾸면서 다크 타일 위 미선택 칩이 사라지던 사고를 되살리지 않는다.
    expect(code(SURFACE)).toContain("mapOverlayChrome")
    for (const mode of MODES) {
      const expected =
        mode === "dark"
          ? palette(mode).background.lower
          : palette(mode).background.default
      expect(chip(mode, false).backgroundColor).toBe(expected)
      expect(chip(mode, false).borderColor).toBe(palette(mode).line.alternative)
    }
  })
})

describe("카테고리 칩 — 안 고른 그림은 흐리지 않다", () => {
  it("그림에 opacity 를 넘기지 않는다", () => {
    expect(RAIL).toMatch(
      /<Art\s+width=\{ART_SIZE\}\s+height=\{ART_SIZE\}\s*\/>/u,
    )
    expect(RAIL_CODE).not.toContain("IDLE_ART_OPACITY")
  })

  it("계약에서 아예 빠졌다 — 되돌리면 tsc 가 먼저 막는다", () => {
    expect(ART).toContain('Pick<SvgProps, "width" | "height">')
    expect(code(ART)).not.toContain("opacity")
  })
})

describe("카테고리 칩 — 치수(선언이 아니라 적용값)", () => {
  it("칩 높이 32 가 `chip` 스타일에 묶여 있다", () => {
    /*
      2026-08-21 지적: 종전에는 `const HEIGHT = controlHeight.sm` 선언만 보고 `chip.height`
      가 그 상수를 쓰는지 안 봤다. `height: 40` 으로 바꿔도 초록이었다.
    */
    expect(styleBlock("chip")).toMatch(/height:\s*HEIGHT\b/u)
    expect(RAIL_CODE).toContain("const HEIGHT = controlHeight.sm")
    expect(controlHeight.sm).toBe(32) // 시안 96px / 3
  })

  it("좌우 패딩·그림 간격·알약 반경도 `chip` 스타일 안에서 온다", () => {
    const applied = styleBlock("chip")
    expect(spacingStep(applied, /paddingHorizontal:\s*spacing\[(\d+)\]/u)).toBe(
      6,
    )
    expect(spacingStep(applied, /gap:\s*spacing\[(\d+)\]/u)).toBe(4)
    expect(applied).toContain("borderRadius: radius.full")
    expect(radius.full).toBeGreaterThanOrEqual(controlHeight.sm / 2) // 알약
  })

  it("앞자리는 스파클과 같은 20pt 정사각 한 칸이다", () => {
    expect(RAIL_CODE).toContain("const ART_SIZE = iconSize.sm")
    expect(RAIL_CODE).toContain('<V2Icon name="sparkle" size={iconSize.sm} />')
    expect(iconSize.sm).toBe(20) // 시안 60×60px / 3
  })

  it("그 값들로 계산한 칩 폭이 시안 실측 폭과 맞는다", () => {
    /*
      치수를 하나씩 맞히는 것보다 **폭이 맞는가**가 강한 검사다. 특히 글자 크기 —
      13(`xSmall`) 대신 15(`small`)로 잡으면 아래 계산이 5pt 넘게 벌어진다.

      `HANGUL_ADVANCE_EM` 은 Pretendard 의 hmtx 실측이고 face 4종이 모두 같다.
      허용 오차 1pt 는 시안 자체의 렌더 드리프트(자간 -2% 가량)를 감안한 값이다.
    */
    const HANGUL_ADVANCE_EM = 1770 / 2048
    const applied = styleBlock("chip")
    const padding = spacingStep(
      applied,
      /paddingHorizontal:\s*spacing\[(\d+)\]/u,
    )
    const artGap = spacingStep(applied, /gap:\s*spacing\[(\d+)\]/u)
    // 테두리도 상자에 더해진다 — 순수 함수가 실제로 내놓는 두께를 쓴다.
    const border = chip("light", true).borderWidth
    const fontSize = chip("light", true).typography.fontSize!
    expect(fontSize).toBe(13)

    const width = (hangul: number) =>
      border * 2 +
      padding * 2 +
      iconSize.sm +
      artGap +
      hangul * HANGUL_ADVANCE_EM * fontSize

    expect(Math.abs(width(2) - 61)).toBeLessThan(1) // `한식` 시안 183px / 3
    expect(Math.abs(width(3) - 72)).toBeLessThan(1) // `샐러드` 시안 216px / 3
  })

  it("칩 사이는 아랫줄 필터 칩(8)과 다른 값이다 — layout.CHIP_GAP 을 쓰지 않는다", () => {
    /*
      같은 시안에서 카테고리 줄은 18px(=6), 필터 줄은 24px(=8)로 떨어져 있다. 그림이 붙어
      덩어리가 큰 줄만 한 단 좁다. 공용 상수를 6 으로 내리면 필터 줄까지 같이 좁아진다.
    */
    expect(styleBlock("content")).toContain("gap: RAIL_CHIP_GAP")
    expect(
      spacingStep(RAIL_CODE, /const RAIL_CHIP_GAP = spacing\[(\d+)\]/u),
    ).toBe(6)
    // `RAIL_CHIP_GAP` 은 이 파일의 것이고, 공용 `CHIP_GAP` 은 들여오지 않는다.
    expect(RAIL_CODE).not.toMatch(/(?<!RAIL_)\bCHIP_GAP\b/u)
    expect(RAIL).toContain('import { RAIL_INSET } from "../layout"')
  })

  it("레일 세로 패딩이 hitSlop 과 그림자를 **둘 다** 덮는다", () => {
    /*
      2026-08-21 지적: 종전 단언은 `expect(spacing[12]).toBeGreaterThanOrEqual(6)` —
      컴포넌트를 읽지 않는 `12 >= 6` 이라 항상 참이었다. 적용값을 파싱해서 비교한다.

      ScrollView 는 자식을 자기 높이에 맞춰 자른다. 이 패딩이 작으면 hitSlop 이 잘려
      터치 44 가 안 되고, 그림자가 잘려 "칩이 잘려 보인다"(QA 2026-08-06).
    */
    const pad = spacingStep(
      RAIL_CODE,
      /const RAIL_PAD_VERTICAL = spacing\[(\d+)\]/u,
    )
    expect(styleBlock("content")).toContain(
      "paddingVertical: RAIL_PAD_VERTICAL",
    )

    const hitSlop = (touchTarget.min - controlHeight.sm) / 2
    expect(hitSlop).toBe(6)
    expect(pad).toBeGreaterThanOrEqual(hitSlop)

    const shadowReach =
      FLOATING_SHADOW.shadowRadius! +
      (FLOATING_SHADOW.shadowOffset as { height: number }).height
    expect(pad).toBeGreaterThanOrEqual(shadowReach)

    // 바깥 레이아웃 리듬은 그대로여야 하므로 같은 값으로 상쇄한다.
    expect(styleBlock("rail")).toContain("marginVertical: -RAIL_PAD_VERTICAL")
  })

  it("32pt 칩은 hitSlop 으로 44 를 채운다 — 세로로만", () => {
    expect(RAIL_CODE).toContain(
      "const VERTICAL_HIT_SLOP = (touchTarget.min - HEIGHT) / 2",
    )
    expect(RAIL_CODE).toContain(
      "hitSlop={{ top: VERTICAL_HIT_SLOP, bottom: VERTICAL_HIT_SLOP }}",
    )
    // 가로로는 늘리지 않는다 — 6pt 떨어진 이웃과 히트 영역이 겹친다.
    expect(RAIL_CODE).not.toMatch(/hitSlop=\{\{[^}]*(left|right)/u)
  })
})

describe("카테고리 칩 — 지키던 성질", () => {
  it("AI 검색 칩은 토글이 아니라 액션이다", () => {
    expect(RAIL).toContain(
      "accessibilityState={isToggle ? { selected: active } : undefined}",
    )
    const start = RAIL.indexOf('label={t("restaurant.map.aiSearch")}')
    expect(start).toBeGreaterThan(-1)
    expect(RAIL.slice(start, start + 240)).not.toContain("selected")
  })

  it("고른 칩을 다시 누르면 해제된다(단일 선택 토글)", () => {
    expect(RAIL).toContain("onSelect(isSelected ? null : spec.value)")
  })

  it("세 파일 어디에도 리터럴 hex 가 없다", () => {
    for (const source of [RAIL, SURFACE, ART]) {
      expect(code(source)).not.toMatch(/#[0-9A-Fa-f]{6}\b/u)
    }
  })
})
