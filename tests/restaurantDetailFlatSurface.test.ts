/**
 * 상세 화면 정보 면의 **평면화 계약** (2026-08-20 시안 C1_2 · D7_1 · D7_2).
 *
 * ## 무엇이 뒤집혔나
 *
 * 앞 판본은 정보 덩어리(영업시간·주소·전화·링크 / 편의시설 / 주차 / SNS)를 `DetailCard`
 * 라는 **둥근 회색 면**으로 묶었다. 그 판단이 고치려던 문제("선은 여기가 끝을 말하지만
 * 이 다섯 줄이 한 덩어리를 말하지 못한다")는 지금도 옳다. 뒤집힌 것은 **덩어리를
 * 무엇이 말하는가**이고, 그건 취향이 아니라 실측으로 정해졌다.
 *
 * ## 재는 방법 (눈대중이 아니다)
 *
 * 시안 타일은 375pt 프레임의 3배 렌더 PNG 다(`tiles/*.svg` 의 viewBox 가 375 폭,
 * 출력이 1125px). 그래서 픽셀 ÷ 3 = pt 다.
 *
 * 글자 크기는 **잉크 높이가 아니라 이송(advance)** 으로 잰다. 잉크는 임계값과
 * 안티에일리어싱에 따라 ±2pt 흔들리지만 이송은 폰트 메트릭이라 흔들리지 않는다.
 * Pretendard(assets/fonts) 실측: 한글 이송 0.864em · 공백 0.251em(Regular) ·
 * 숫자 `0` 0.66em(Bold) / 0.639em(SemiBold) / 0.596em(Regular).
 *
 * ## 이 파일이 지키는 것
 *
 * 1. 정보 블록은 **평면**이고, 좌측 시작선은 둘(화면 16 · 본문 44)뿐이다.
 * 2. 그 자리를 대신하는 것은 **전폭 띠**(홈 탭)와 **전폭 머리카락 선**(정보 탭)이다.
 *    카드를 지우면서 경계까지 지우면 안 된다 — 그게 이 변경의 유일한 위험이다.
 * 3. 정보 행 넷의 본문은 **13pt 한 크기**이고, 행 피치 28 안에서 hitSlop 이 서로
 *    겹치지 않는다(겹치면 위 행을 겨눈 탭이 아래 행 동작을 실행한다).
 * 4. 섹션 제목은 홈 17 · 정보 15 이고, 섹션 여백은 `SECTION_GAP` 한 곳에서만 정해진다.
 * 5. 편의시설 4열은 여백 없이 **화면 전폭**을 넷으로 나눈다.
 * 6. 메뉴 행의 조판(썸네일·타이포)은 실측값이고, **스켈레톤이 그 값을 가져다 쓴다**.
 * 7. 시안에 없지만 **지우지 않는 것**들(안전도 근거·의료 면책·모른다 분기)이 살아 있다.
 *
 * ## 어떻게 지키는가 — 파일 전체 `toContain` 을 그만뒀다
 *
 * 앞 판본은 대부분 원문 전체에 `toContain` 이었다. 값이 어느 스타일 블록에 묶였는지를
 * 아무도 보지 않으니 `gridCell` 의 6→8 같은 실제 변경을 못 잡았고(파일 어딘가의
 * `parkingRow` 가 이미 8), 상수를 보간한 문자열을 그 상수로 대조하는 항진명제도 있었다.
 * 지금은 `styleBlock`/`openingTags` 로 **자리를 잘라서** 보고, 상수는 소스에서 뽑아
 * **실제 토큰으로 계산**한다(`evalConst`). 새 항목을 더할 때도 이 셋 중 하나를 쓸 것.
 *
 * `tests/restaurantDetailDensity.test.ts` 의 `여백·격자` describe 는 위 1번의 **반대**를
 * 못 박고 있다(`toContain("<DetailCard>")`). 그 파일은 상세 화면 담당의 것이라 여기서
 * 고치지 않는다 — 인수인계 노트는 이 저장소 밖(작업 보고)에 있다.
 */

import fs from "fs"
import path from "path"

import { resolveTheme } from "../src/design-system-v2/theme"
import { over } from "../src/design-system-v2/tokens/blend"
import { radius } from "../src/design-system-v2/tokens/radius"
import { iconSize } from "../src/design-system-v2/tokens/size"
import { spacing } from "../src/design-system-v2/tokens/spacing"
import { typography } from "../src/design-system-v2/tokens/typography"

const light = resolveTheme("light").colors

const DETAIL_DIR = path.join(
  __dirname,
  "..",
  "src",
  "features",
  "restaurant",
  "components",
  "detail",
)
const read = (file: string) =>
  fs.readFileSync(path.join(DETAIL_DIR, file), "utf8")
const readSibling = (file: string) =>
  fs.readFileSync(path.join(DETAIL_DIR, "..", file), "utf8")
const readHook = (file: string) =>
  fs.readFileSync(path.join(DETAIL_DIR, "..", "..", "hooks", file), "utf8")

/**
 * 주석을 걷어낸 소스. **"이 값을 더는 쓰지 않는다" 류의 금지 계약은 이쪽에서 검사한다.**
 *
 * 이 저장소는 은퇴한 값의 이름을 그 이유와 함께 주석에 남기는 관습이 있어서
 * (`앞 판본은 ITEM_GAP(16)을 썼다 — 피치 36 이라…`), 원문에 `not.toContain("ITEM_GAP")`
 * 를 걸면 **설명이 스스로를 위반한다.** 그렇다고 설명을 지우면 다음 사람이 같은 판단을
 * 처음부터 다시 하게 된다. `restaurantDetailDensity.test.ts` 가 쓰는 것과 같은 방식이다.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^[ \t]*\/\/.*$/gmu, "")
}

const HOME = read("HomeTab.tsx")
const INFO = read("InfoTab.tsx")
const INFO_ROWS = read("DetailInfoRows.tsx")
const MENU_ROW = read("MenuRow.tsx")
const SECTION = read("DetailSection.tsx")
const SKELETONS = read("DetailSkeletons.tsx")
/** 정보 행 넷 중 둘은 `detail/` 밖에 있다 — 같은 줄에 서므로 같은 계약을 받는다. */
const ADDRESS = readSibling("AddressBlock.tsx")
const STATUS = readSibling("BusinessStatusText.tsx")

const HOME_CODE = stripComments(HOME)
const INFO_CODE = stripComments(INFO)
const INFO_ROWS_CODE = stripComments(INFO_ROWS)
const MENU_ROW_CODE = stripComments(MENU_ROW)
const SECTION_CODE = stripComments(SECTION)
const SKELETONS_CODE = stripComments(SKELETONS)
const ADDRESS_CODE = stripComments(ADDRESS)
const STATUS_CODE = stripComments(STATUS)
const LAYOUT = fs.readFileSync(
  path.join(__dirname, "..", "src", "features", "restaurant", "layout.ts"),
  "utf8",
)

/*
  ── 왜 아래 세 도구가 필요한가 ──

  이 파일의 앞 판본은 대부분 **파일 전체에 `toContain`** 이었다. 그러면 값이 어느 스타일에
  묶였는지를 아무도 검사하지 않아서, `gridCell` 의 6→8 같은 실제 변경을 하나도 못 잡고
  (파일 어딘가의 `parkingRow` 가 이미 8 이라 항상 참) 두 값을 맞바꿔도 초록이었다.

  그래서 (1) 스타일 블록을 잘라서 보고, (2) 여는 태그를 잘라서 보고, (3) 상수는 문자열이
  아니라 **소스에서 뽑아 실제 토큰으로 계산**한다. 3번이 핵심이다 — 식을 문자열로 대조하면
  `(피치 − 글리프) / 2` 를 `spacing[8]` 로 되돌려도 철자만 다를 뿐 뜻은 안 지켜지는데,
  값으로 재면 그 순간 빨개진다.
*/

/** `StyleSheet.create` 안의 `name: { … }` 한 덩어리. 없으면 던진다(이름이 바뀌어도 빨개진다). */
function styleBlock(source: string, name: string): string {
  const sheet = source.slice(source.indexOf("StyleSheet.create({"))
  const at = sheet.indexOf(`${name}: {`)
  if (at < 0) throw new Error(`스타일 \`${name}\` 이 없다`)
  let depth = 0
  for (let i = sheet.indexOf("{", at); i < sheet.length; i++) {
    if (sheet[i] === "{") depth += 1
    else if (sheet[i] === "}") {
      depth -= 1
      if (depth === 0) return sheet.slice(at, i + 1)
    }
  }
  throw new Error(`스타일 \`${name}\` 이 안 닫혔다`)
}

/**
 * `<Tag …>` 여는 태그들. 중괄호 깊이를 세므로 `count={detail.menuCount > 0 ? … }` 안의
 * `>` 에서 잘리지 않는다 — 거기서 잘리면 뒤에 붙은 프롭이 검사 범위 밖으로 빠진다.
 */
function openingTags(source: string, tag: string): string[] {
  const out: string[] = []
  const needle = `<${tag}`
  for (let at = source.indexOf(needle); at >= 0; ) {
    let depth = 0
    for (let i = at + needle.length; i < source.length; i++) {
      const ch = source[i]
      if (ch === "{") depth += 1
      else if (ch === "}") depth -= 1
      else if (ch === ">" && depth === 0) {
        out.push(source.slice(at, i + 1))
        break
      }
    }
    at = source.indexOf(needle, at + needle.length)
  }
  return out
}

/**
 * `const NAME = <식>` 의 **값**. 식을 진짜 토큰으로 계산한다.
 *
 * `Function` 을 쓰는 이유: 이 파일들은 jest 에서 import 할 수 없다(`layout.ts` 가
 * design-system-v2 인덱스를 끌고 오고, 그 안의 `StyleSheet.create` 가 RN 스텁에 없다).
 * 그렇다고 식을 문자열로 대조하면 이 라운드가 지적한 "철자만 검사하는 테스트" 가 된다.
 */
function evalConst<T>(
  source: string,
  name: string,
  scope: Record<string, unknown>,
): T {
  const decl = new RegExp(`(?:export )?const ${name} = `, "u").exec(source)
  if (!decl) throw new Error(`\`${name}\` 선언이 없다`)

  // 여러 줄 객체도 받는다 — 괄호 깊이가 0 인 줄바꿈에서 끝난다.
  const from = decl.index + decl[0].length
  let depth = 0
  let to = source.length
  for (let i = from; i < source.length; i++) {
    const ch = source[i]
    if (ch === "{" || ch === "(" || ch === "[") depth += 1
    else if (ch === "}" || ch === ")" || ch === "]") depth -= 1
    else if (ch === "\n" && depth === 0) {
      to = i
      break
    }
  }
  const expression = source
    .slice(from, to)
    .replace(/\s+as const$/u, "") // TS 는 Function 이 못 읽는다
    .replace(/,\s*$/u, "")

  const keys = Object.keys(scope)
  return Function(
    ...keys,
    `return (${expression})`,
  )(...keys.map((key) => scope[key])) as T
}

/**
 * `layout.ts` 의 상수를 실제 토큰으로 계산한다. `TEXT_INDENT` 처럼 앞 선언을 참조하는
 * 것이 있으므로 **선언 순서대로 전부** 풀어 스코프에 쌓는다.
 */
const LAYOUT_CONSTS = (() => {
  const scope: Record<string, unknown> = { spacing, iconSize, radius }
  const declaration = /export const (\w+) = /gu
  for (
    let found = declaration.exec(LAYOUT);
    found !== null;
    found = declaration.exec(LAYOUT)
  ) {
    scope[found[1]] = evalConst<number>(LAYOUT, found[1], scope)
  }
  return scope
})()

function layoutConst(name: string): number {
  const value = LAYOUT_CONSTS[name]
  if (typeof value !== "number")
    throw new Error(`layout.ts 에 \`${name}\` 이 없다`)
  return value
}

/**
 * 스타일 블록 안 한 속성의 **값**. 철자가 아니라 수를 재므로 `GUTTER` 를 `GUTTER * 2` 로
 * 바꾸는 식의 "문자열은 그대로인데 뜻은 달라지는" 변경이 걸린다.
 */
function styleValue(block: string, key: string): number {
  const found = new RegExp(`${key}: ([^,}]+)`, "u").exec(block)
  if (!found) throw new Error(`\`${key}\` 가 그 블록에 없다`)
  return evalConst<number>(`const value = ${found[1].trim()}\n`, "value", {
    ...LAYOUT_CONSTS,
    spacing,
    iconSize,
    radius,
  })
}

describe("정보 덩어리는 흰 바탕 위 평면이다", () => {
  it("홈 탭 정보 블록에 카드 면이 없다", () => {
    /*
      C1_2 실측: 정보 네 줄이 있는 y 0–350px 구간에서 x=6 과 x=1119 의 배경이 둘 다
      (255,255,255) 다. 카드가 있었다면 좌우 여백(16) 안쪽이 (247,247,247) 이어야 한다.
    */
    expect(HOME).not.toContain("<DetailCard>")
    expect(HOME).not.toContain('from "./DetailCard"')
    expect(HOME).toContain("<DetailInfoRows")
  })

  it("정보 탭 세 섹션에도 카드 면이 없다", () => {
    expect(INFO).not.toContain("<DetailCard>")
    expect(INFO).not.toContain('from "./DetailCard"')
  })

  it("좌측 시작선은 여전히 둘뿐이다 (카드 안여백이 만들던 32 가 사라졌다)", () => {
    /*
      앞 판본은 이 자리에서 `layout.ts` 의 **선언문 네 줄**을 검사했다. 그런데 `layout.ts`
      는 이 변경이 한 글자도 안 건드린 파일이라, 카드를 지우기 **전에도** 통과했다 —
      제목이 말하는 것("32 가 사라졌다")과 검사하는 것이 달랐다. 32 를 실제로 만들던
      곳은 홈 탭의 `infoBlock`(화면 여백 위에 카드 안여백이 겹치던 자리)이다.
    */
    const GUTTER = layoutConst("GUTTER")
    const CARD_PADDING = layoutConst("CARD_PADDING")
    expect([GUTTER, layoutConst("TEXT_INDENT")]).toEqual([16, 44])
    // 세 번째 시작선의 정체: 화면 여백 + 카드 안여백.
    expect(GUTTER + CARD_PADDING).toBe(32)

    // (1) 정보 블록의 좌우 여백은 화면 정본 하나뿐이다. **값**으로 잰다 —
    //     `GUTTER * 2` 처럼 이름은 그대로 두고 수만 바꾸는 길을 남기지 않는다.
    const infoBlock = styleBlock(HOME_CODE, "infoBlock")
    expect(styleValue(infoBlock, "paddingHorizontal")).toBe(GUTTER)
    expect(infoBlock).toContain("paddingHorizontal: GUTTER")
    expect(HOME_CODE).not.toContain("CARD_PADDING")
    expect(HOME_CODE).not.toContain("CARD_RADIUS")

    // (2) 그 안쪽이 여백을 더하면 그것이 세 번째 시작선이다. 간격만 있고 여백은 없다.
    expect(styleBlock(INFO_ROWS_CODE, "container")).not.toMatch(/padding/u)

    // (3) 두 번째 시작선(본문 44)을 만드는 것은 아이콘 상자 + 이 gap 이다.
    //     여기가 12 였을 때 이 네 줄만 x=48 에서 시작해 시작선이 셋이 됐다.
    const row = styleBlock(INFO_ROWS_CODE, "row")
    expect(row).toContain("gap: ROW_ICON_GAP")
    expect(styleValue(row, "gap")).toBe(layoutConst("ROW_ICON_GAP"))
    expect(GUTTER + layoutConst("ROW_ICON") + layoutConst("ROW_ICON_GAP")).toBe(
      layoutConst("TEXT_INDENT"),
    )
  })

  it("정보 네 줄의 행 피치가 28 이다", () => {
    /*
      C1_2 실측: 아이콘 잉크 중심 기준 주소→전화 28.0pt, 전화→링크 28.0pt.
      행 높이는 둘 중 큰 쪽인 아이콘 상자(20)가 정하고(본문은 18), 20 + gap 8 = 28.
      앞 판본의 `ITEM_GAP`(16)은 피치 36 이라 네 줄이 흩어졌다.
    */
    expect(styleValue(styleBlock(INFO_ROWS_CODE, "container"), "gap")).toBe(
      spacing[8],
    )
    expect(layoutConst("ROW_ICON") + layoutConst("ROW_ICON_GAP")).toBe(28)
    expect(INFO_ROWS_CODE).not.toContain("ITEM_GAP")
  })

  it("행 안 텍스트 링크의 hitSlop 이 위아래 행을 침범하지 않는다", () => {
    /*
      ── 이 항목이 잡는 실제 오작동 ──

      행 간격이 `ITEM_GAP`(16, 피치 36)에서 `spacing[8]`(피치 28)로 반 줄면서, 44 미달을
      메우려고 사방에 두던 `hitSlop={spacing[8]}` 이 **위아래 행의 슬롭과 겹치게** 됐다:
      글리프 18 + 8×2 = 34 > 28. 겹친 구간의 승자는 z-order 상 뒤에 그려지는 아래 행이라
      위 행 바로 밑을 겨눈 탭이 아래 행 동작을 실행한다(주소 밑을 누르면 전화가 걸린다).

      피치 28 은 시안이 정한 값이므로 좁힐 곳은 슬롭의 **세로**뿐이다.
      계약: 세로 슬롭 × 2 + 글리프 높이 ≤ 피치.
    */
    const rowText = evalConst<{ lineHeight: number }>(
      INFO_ROWS_CODE,
      "ROW_TEXT",
      { typography },
    )
    const pitch = evalConst<number>(INFO_ROWS_CODE, "ROW_PITCH", {
      ROW_ICON: layoutConst("ROW_ICON"),
      ROW_ICON_GAP: layoutConst("ROW_ICON_GAP"),
    })
    const vertical = evalConst<number>(
      INFO_ROWS_CODE,
      "ROW_VERTICAL_HIT_SLOP",
      { ROW_PITCH: pitch, ROW_TEXT: rowText, spacing },
    )

    expect(pitch).toBe(28)
    expect(vertical * 2 + rowText.lineHeight).toBeLessThanOrEqual(pitch)
    // 반쪽짜리 값(2.5 같은 것)은 기기마다 다르게 반올림된다.
    expect(Number.isInteger(vertical)).toBe(true)

    // 가로는 옆 행이 없으므로 그대로 8 이다 — "세로만 좁힌다" 가 계약이다.
    const slop = evalConst<Record<string, number>>(
      INFO_ROWS_CODE,
      "ROW_HIT_SLOP",
      { ROW_VERTICAL_HIT_SLOP: vertical, spacing },
    )
    expect(slop).toEqual({
      top: vertical,
      bottom: vertical,
      left: spacing[8],
      right: spacing[8],
    })

    // 세 곳(전화 링크 · 복사 · 외부 링크)이 전부 그것을 쓴다. 하나라도 스칼라로
    // 되돌아가면 그 행만 다시 겹친다.
    const slops = INFO_ROWS_CODE.match(/hitSlop=\{[^}]*\}/gu) ?? []
    expect(slops).toEqual([
      "hitSlop={ROW_HIT_SLOP}",
      "hitSlop={ROW_HIT_SLOP}",
      "hitSlop={ROW_HIT_SLOP}",
    ])
  })
})

describe("경계는 전폭 띠(홈)와 전폭 선(정보)이 그린다", () => {
  it("홈 탭 섹션 사이의 회색 띠가 그대로 있다", () => {
    // 카드를 지우면서 이것까지 지우면 정보·메뉴·사진·후기가 한 덩어리로 흐른다.
    const bands = HOME.match(/<V2Divider variant="thick" \/>/g) ?? []
    expect(bands.length).toBeGreaterThanOrEqual(3)
  })

  it("그 띠의 색이 시안 실측 rgb(247,247,247) 과 같다", () => {
    /*
      C1_2 y 363–374px(=4.00pt) 이 전 구간 (247,247,247) 이다. 같은 띠가 C2_2 ·
      C3_2(두 곳) · D5_1 에도 있다. 알파 토큰을 흰 배경에 합성해 보면 어느 것이 그
      값인지가 계산으로 정해진다 — 스포이드로 새 hex 를 만들 일이 없다.

      두께는 시안이 4.00, 우리는 `V2Divider variant="thick"` 의 16 이다. DS 컴포넌트가
      정한 값이고 후기 탭·건강검진 상세가 같은 띠를 쓰므로 여기서만 얇게 만들지 않는다.
      경계가 약해지는 방향의 차이가 아니라는 것이 요점이다(우리 쪽이 두껍다).
    */
    expect(over(light.background.lower, light.background.default)).toBe(
      "#f7f7f7",
    )
  })

  it("정보 탭은 섹션마다 전폭 머리카락 선으로 끊는다", () => {
    /*
      D7_1 y 1407–1409px(=1.00pt) · D7_2 y 348–350px 이 전 구간 (244,244,245) 이다.
      시안은 편의시설↔주차 사이만 선 없이 61pt 여백으로 끊지만 그 예외는 따르지 않는다 —
      오늘 시드 데이터는 `amenities` 가 비어 있어서(InfoTab 머리말) 그 여백이 한 줄짜리
      안내문으로 쪼그라들고, 여백에 경계를 맡기면 바로 그 날 경계가 사라진다.
    */
    const lines = INFO.match(/<V2Divider tone="alternative" \/>/g) ?? []
    expect(lines).toHaveLength(2)
    expect(over(light.line.alternative, light.background.default)).toBe(
      "#f4f4f5",
    )
    // 면과 선을 함께 쓰지 않는다 — 한 경계가 두 번 그어진다.
    expect(INFO).not.toContain('variant="thick"')
  })

  it("정보 탭 섹션 여백은 `DetailSection` 기본값 20 이고 덮어쓸 통로가 없다", () => {
    /*
      앞 판본은 부정문 둘(`not.toContain("CARD_GAP")` · `not.toContain("paddingVertical")`)
      뿐이었다. 그건 **옛 구현의 철자**를 검사하는 것이라, 같은 12 를 다른 속성 이름으로
      쓰면 그대로 빠져나간다 — 보고서가 "섹션 상하 여백 12 → 20" 이라고 적어 둔 값이
      사실상 아무 데도 안 걸려 있었다. 그래서 (1) 기본값을 값으로 재고 (2) 덮어쓰기
      통로 자체를 막는다.

      앞 판본의 `CARD_GAP`(12) 은 "카드가 이미 면으로 끊고 있으므로" 였다. 그 이유가
      카드와 함께 사라졌다. 시안 실측도 16~25 로 20 언저리다 — 탭 바 선→편의시설 제목
      16 · 주차 마지막 줄→선 19 · 선→SNS 제목 25.
    */
    expect(layoutConst("SECTION_GAP")).toBe(20)

    // (1) 껍데기의 기본값이 그 값이다. 같은 12 를 다른 이름으로 쓰면 여기서 걸린다.
    const section = styleBlock(SECTION_CODE, "section")
    expect(styleValue(section, "paddingVertical")).toBe(20)
    expect(styleValue(section, "paddingHorizontal")).toBe(layoutConst("GUTTER"))
    expect(section).toContain("paddingVertical: SECTION_GAP")

    // (2) 덮어쓸 통로가 없다 — 프롭도 없고, 받은 스타일을 합성하는 자리도 없다.
    expect(SECTION_CODE).not.toMatch(/^\s*style\?:/mu)
    expect(SECTION_CODE).toContain("<View style={styles.section}>")

    // (3) 호출부도 넘기지 않는다(홈 탭 포함 — 여백은 한 곳에서만 정해진다).
    const tags = [
      ...openingTags(INFO_CODE, "DetailSection"),
      ...openingTags(HOME_CODE, "DetailSection"),
    ]
    expect(tags).toHaveLength(6)
    for (const tag of tags) expect(tag).not.toMatch(/\bstyle=/u)

    expect(INFO_CODE).not.toContain("CARD_GAP")
  })
})

describe("정보 행 본문은 13pt 한 크기다", () => {
  /*
    C1_2 3배 렌더 실측(픽셀 ÷ 3 = pt, 한글 이송 0.864em · 숫자 Regular 0.596em):

      영업시간 `까지`      이송 34px → 11.33pt / 0.864 = 13.1
      영업시간 `21:30`     숫자 이송 22–24px → 13pt(23.2px)와 맞고 15(26.8)와는 안 맞는다
      주소     `서울/강남구/선릉로86길` 이송 33.6px → 12.96
      전화     `00-000-0000`  잉크 높이 28px = 9.33pt → 숫자 높이 0.71em 기준 13.1
      SNS      `인스타그램`   잉크 높이 34px, `복사`(주소·전화)와 같다

    네 행 전부 13 이고, 15 였다면 한글 이송이 38.9px 여야 한다. 구현은 오래 `subtext.large`
    (15/20)였다 — "남의 파일이라" 는 사유는 절반만 참이었고(둘은 `DetailInfoRows` 안에
    있었다), 그 부작용으로 나란히 붙은 두 `복사` 가 서로 다른 크기로 보였다.
  */
  const ROW_TEXT = evalConst<Record<string, number>>(
    INFO_ROWS_CODE,
    "ROW_TEXT",
    { typography },
  )

  it("네 행이 같은 13/18 토큰을 쓴다", () => {
    expect(typography.subtext.medium).toMatchObject({
      fontSize: 13,
      lineHeight: 18,
    })
    expect(ROW_TEXT).toBe(typography.subtext.medium)
    // 한 단계 위였던 앞 판본의 토큰이 세 파일 어디에도 안 남았다.
    expect(typography.subtext.large.fontSize).toBe(15)
    for (const code of [INFO_ROWS_CODE, ADDRESS_CODE, STATUS_CODE]) {
      expect(code).not.toContain("typography.subtext.large")
    }
  })

  it("나란히 놓인 두 `복사` 가 같은 크기다", () => {
    /*
      주소 행의 `복사`(AddressBlock)와 전화 행의 `복사`(DetailInfoRows)는 8pt 떨어져
      세로로 붙어 있다. 두 파일이 각자 토큰을 고르면 **같은 단어가 두 크기**로 보인다 —
      실제로 하나는 15, 하나는 13 이었다. 같은 객체인지로 잰다.
    */
    expect(evalConst(ADDRESS_CODE, "TEXT", { typography })).toBe(ROW_TEXT)
  })

  it("주소 `복사` 의 hitSlop 기준 높이가 그 토큰에서 나온다", () => {
    // 숫자를 손으로 적어 두면 크기를 내린 날 슬롭만 옛 높이(20)로 남는다.
    expect(ADDRESS_CODE).toContain("const TEXT_HEIGHT = TEXT.lineHeight")
    expect(
      evalConst<number>(ADDRESS_CODE, "TEXT_HEIGHT", { TEXT: ROW_TEXT }),
    ).toBe(typography.subtext.medium.lineHeight)
  })

  it("상태 낱말도 같은 13 이다 (굵기는 그대로 Medium)", () => {
    const label = evalConst<Record<string, unknown>>(
      STATUS_CODE,
      "LABEL_TEXT",
      { typography },
    )
    expect(label).toMatchObject({
      fontSize: 13,
      fontFamily: "Pretendard-Medium",
    })
    // 15 짜리 라벨 토큰으로 되돌아가는 통로를 막는다.
    expect(STATUS_CODE).not.toContain("typography.label.smallWeak")
  })
})

describe("섹션 제목은 탭마다 다르다 (홈 17 · 정보 15)", () => {
  /*
    D7_1 실측: `편의시설 및 서비스` 의 한글 음절 이송 39px(=13.0pt) → 0.864em 으로 나누면
    15.05 다(17 이면 44px). `주차` 도 같다. 잉크 높이는 40px 이고 C1_2 의 `메뉴` 46px 와
    정확히 17:15 비율이며, 세로획은 5px 대 6px 라 굵기는 둘 다 Bold 다.

    공용 껍데기의 기본값을 내리면 홈 탭 세 섹션이 같이 작아진다. 그래서 프롭이다.
  */
  it("껍데기의 기본값은 17 이고 홈 탭은 아무것도 넘기지 않는다", () => {
    expect(typography.title.xSmall.fontSize).toBe(17)
    expect(SECTION_CODE).toContain("titleStyle = typography.title.xSmall")
    // 제목이 그 프롭을 실제로 쓴다 — 기본값만 두고 안 쓰면 프롭이 장식이 된다.
    expect(SECTION_CODE).toContain("style={[titleStyle, { color:")
    for (const tag of openingTags(HOME_CODE, "DetailSection")) {
      expect(tag).not.toContain("titleStyle")
    }
  })

  it("정보 탭 세 섹션만 15 를 넘긴다", () => {
    expect(typography.label.smallStrong).toMatchObject({
      fontSize: 15,
      fontFamily: "Pretendard-Bold",
    })
    expect(evalConst(INFO_CODE, "SECTION_TITLE", { typography })).toBe(
      typography.label.smallStrong,
    )
    const tags = openingTags(INFO_CODE, "DetailSection")
    expect(tags).toHaveLength(3)
    for (const tag of tags) {
      expect(tag).toContain("titleStyle={SECTION_TITLE}")
    }
  })
})

describe("스켈레톤은 도착할 치수를 베끼지 않고 가져온다", () => {
  /*
    이 파일(`DetailSkeletons`)이 존재하는 이유는 머리말에 적혀 있다 — "눈대중으로 잡으면
    도착 순간 어긋난다". 그런데 `MenuRow` 의 썸네일이 `{88,72}` → `86`(정사각)으로 바뀔 때
    스켈레톤은 옛 치수로 남아 로딩→도착에서 가로 2 · 세로 14 가 튀었고, 그 자리의 주석과
    파일 머리말이 **둘 다 거짓**이 됐다. 미러가 있는 한 언젠가 다시 갈라진다.
  */
  it("썸네일 치수의 정의가 한 곳뿐이다", () => {
    expect(evalConst<number>(MENU_ROW_CODE, "THUMBNAIL", {})).toBe(86)
    expect(MENU_ROW_CODE).toContain("export const THUMBNAIL = 86")
    expect(SKELETONS_CODE).toContain(
      'import { THUMBNAIL as MENU_THUMBNAIL } from "./MenuRow"',
    )
    // 자기 상수를 다시 선언하면(= 미러가 되살아나면) 여기서 걸린다.
    expect(SKELETONS_CODE).not.toMatch(/const MENU_THUMBNAIL\s*=/u)
  })

  it("메뉴 스켈레톤이 그 값으로 정사각을 그린다", () => {
    const menu = SKELETONS_CODE.slice(
      SKELETONS_CODE.indexOf("export function MenuTabSkeleton"),
      SKELETONS_CODE.indexOf("export interface ReviewTabSkeletonProps"),
    )
    // 글 줄 자리표시는 숫자 높이를 써도 된다(도착할 글자 크기와 다른 값이다).
    // 계약은 **썸네일 하나**에 대한 것이라 그 요소만 잘라서 본다.
    const thumbnail = /<V2Skeleton[^/]*radius="sm"[^/]*\/>/u.exec(menu)?.[0]
    expect(thumbnail).toBeDefined()
    expect(thumbnail).toContain("width={MENU_THUMBNAIL}")
    expect(thumbnail).toContain("height={MENU_THUMBNAIL}")
    // 가로형(88×72)으로 되돌아가는 통로: 치수를 숫자로 적는 것.
    expect(thumbnail).not.toMatch(/(?:width|height)=\{\d/u)
  })
})

describe("편의시설 4열은 화면 전폭을 넷으로 나눈다", () => {
  it("격자가 섹션 좌우 여백을 되돌린다", () => {
    /*
      D7_1 실측: 칸 라벨 중심이 46.83 · 140.83 · 234.83 · 328.83(간격 94.0).
      여백 g 를 두고 (375-2g)/4 로 나눴다면 첫 칸 중심이 `46.875 + 0.75g` 라
      g=0 일 때만 맞는다. 전폭이라 우리 GUTTER(16)와 시안의 여백(20)이 달라도
      칸 중심이 46.875 · 140.625 · 234.375 · 328.125 로 시안과 겹친다.
    */
    expect(INFO).toContain("marginHorizontal: -GUTTER")
    expect(INFO).toContain('width: "25%"')
  })

  it("아이콘은 24, 아이콘↔라벨 8, 줄 사이 12", () => {
    /*
      D7_1 실측: 아이콘 잉크 중심 31.83 → 상자 20..44(24pt) · 아이콘 상자 바닥 213.0 →
      라벨 상자 머리 221.5 · 라벨 상자 바닥 253.5 → 다음 아이콘 상자 머리 267.0.

      **어느 스타일의 gap 인지까지 못 박는다.** 앞 판본은 파일 전체에 `gap: spacing[8]`
      을 걸었는데, 이 파일에는 변경 전부터 8 을 쓰던 `parkingRow`·`snsRow` 가 있어서
      항상 참이었다 — 이 변경의 유일한 gap 변화(`gridCell` 6→8)를 하나도 못 잡는다.
    */
    expect(INFO_CODE).toContain("size={iconSize.md}")
    expect(iconSize.md).toBe(24)
    expect(styleValue(styleBlock(INFO_CODE, "gridCell"), "gap")).toBe(8)
    expect(styleValue(styleBlock(INFO_CODE, "grid"), "rowGap")).toBe(12)
    // 실측값을 그대로 박지 않고 사다리 위의 값을 쓴다.
    expect(styleBlock(INFO_CODE, "gridCell")).toContain("gap: spacing[8]")
    expect(styleBlock(INFO_CODE, "grid")).toContain("rowGap: spacing[12]")
  })
})

describe("메뉴 행 조판은 시안 실측이다", () => {
  it("썸네일은 정사각 86 이고 모서리는 radius.sm", () => {
    /*
      C1_2 실측: 두 행 모두 x 807..1064px(=269.0..355.0pt, 258px=86.00pt) 에서 끊기고
      세로도 583..841px 로 같은 258px 다. 코너 곡선(꼭대기 줄 20px 들여쓰기 → 3px 아래
      11px → 6px 아래 8px)이 반경 24px(=8pt) 원호와 1px 안에서 맞는다.

      앞 판본의 88×72 는 옛 목업 값이다. 가로형은 접시 사진의 위아래를 잘라 낸다.
    */
    expect(MENU_ROW).toContain("const THUMBNAIL = 86")
    expect(MENU_ROW).toMatch(
      /thumbnail:\s*\{\s*width: THUMBNAIL,\s*height: THUMBNAIL,\s*borderRadius: radius\.sm,/u,
    )
    // 가로형으로 되돌아가는 통로를 막는다.
    expect(MENU_ROW).not.toContain("THUMBNAIL.width")
  })

  it("이름과 가격은 15 Bold, 설명은 12 Regular 다", () => {
    /*
      실측(C1_2):
        이름 `신신백숙` 음절 이송 12.67·13.67·12.33 → 평균 12.89 = 15pt(0.864×15=12.96)
        가격 `0`→`0` 이송 9.67·9.33 → 15pt 대(Bold 0.66×15=9.9)
        설명 `3음절+공백` 34.0 이 세 번 반복 → 34.0/(3×0.864+0.251)=11.96 ≈ 12pt, 피치 16.0
      세로획 굵기: 이름 6–7px(2.0–2.3pt) · 가격 5–6px · 설명 2–3px → Bold / Bold / Regular.
    */
    expect(typography.label.smallStrong).toMatchObject({
      fontSize: 15,
      lineHeight: 19,
      fontFamily: "Pretendard-Bold",
    })
    expect(typography.subtext.small).toMatchObject({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Pretendard-Regular",
    })
    const strong = MENU_ROW.match(/typography\.label\.smallStrong/g) ?? []
    expect(strong).toHaveLength(2) // 이름 · 가격
    expect(MENU_ROW).toContain("typography.subtext.small")
    // 한 단계씩 컸던 앞 판본의 토큰들.
    expect(MENU_ROW).not.toContain("typography.title.xSmall")
    expect(MENU_ROW).not.toContain("typography.label.mediumStrong")
    expect(MENU_ROW).not.toContain("typography.subtext.large")
  })

  it("배지↔이름 간격 8 · 설명 두 줄 클램프는 그대로다", () => {
    // C1_2 실측: 배지 오른쪽 끝 56.67 → 이름 잉크 시작 65.33(펜 위치 ≈ 64).
    expect(MENU_ROW).toContain(
      'nameRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] }',
    )
    expect(MENU_ROW).toContain("const DESCRIPTION_LINES = 2")
  })
})

describe("시안에 없다고 지우지 않은 것", () => {
  it("메뉴 행의 숫자 근거 줄이 살아 있고 설명보다 크다", () => {
    /*
      `나트륨 1,200mg · 한 끼 기준의 80%`. 시안에 없는 줄이라 실측 대상이 아니지만
      이 화면에서 사용자가 실제로 행동을 정하는 한 줄이다. 설명이 12 로 내려가면서
      위계는 오히려 또렷해졌다 — 이름 15 Bold · 근거 15 Medium · 설명 12 Regular.
    */
    expect(MENU_ROW).toContain("menuSafetyEvidence(menu)")
    expect(MENU_ROW).toContain("typography.label.smallWeak")
    expect(typography.label.smallWeak.fontSize).toBeGreaterThan(
      typography.subtext.small.fontSize,
    )
  })

  it("판정이 있는 곳에는 근거의 기준과 의료 면책이 함께 있다", () => {
    expect(HOME).toContain('t("restaurant.safety.mealBasis")')
    expect(HOME).toContain('t("restaurant.safety.disclaimer")')
    expect(HOME).toContain("<ProfileMissingNotice")
  })

  it("`모른다` 를 `없다` 로 접지 않는다 (주차)", () => {
    expect(INFO).toContain('t("restaurant.parking.unknown")')
    expect(INFO).toContain('t("restaurant.amenity.empty")')
  })

  it("전화·주소의 `복사` 와 외부 링크가 그대로다", () => {
    // 평면화는 배치의 문제다. 기능을 줄이는 문이 아니다.
    // 클립보드 호출은 2026-09-08 부터 `hooks/useAddressCopy` 로 모였다(주소 행과 한 통로) —
    // 두 행이 그 훅을 부르고, 훅이 실제로 클립보드에 쓰는지를 잇는다.
    expect(INFO_ROWS).toContain("useAddressCopy(")
    expect(ADDRESS).toContain("useAddressCopy(")
    expect(readHook("useAddressCopy.ts")).toContain("Clipboard.setStringAsync")
    expect(INFO_ROWS).toContain('t("restaurant.address.copy")')
    expect(INFO_ROWS).toContain("normalizeHttpsUrl")
  })

  it("간격은 전부 spacing 사다리 위에 있다", () => {
    // 실측값을 그대로 박아 넣는 순간 격자가 무너진다 — 스냅한 값만 쓴다.
    for (const step of [8, 12] as const) {
      expect(spacing[step]).toBe(step)
    }
  })
})
