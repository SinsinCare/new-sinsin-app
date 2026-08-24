/**
 * V2 공용 컴포넌트의 조용한 엣지 케이스를 고정한다.
 *
 * 이 저장소에는 RN 렌더러가 없으므로 순수 함수는 직접 실행하고, JSX prop 순서와
 * 다이얼로그 큐처럼 렌더러가 있어야 보이는 계약은 주석을 제거한 소스로 확인한다.
 */
import fs from "node:fs"
import path from "node:path"

import { normalizeV2ProgressValue } from "@/src/design-system-v2/components/V2ProgressBar"
import { codeOnly } from "./helpers/codeOnly"

const ROOT = path.join(__dirname, "..")

function read(relative: string): string {
  return codeOnly(fs.readFileSync(path.join(ROOT, relative), "utf8")).replace(
    /\s+/gu,
    " ",
  )
}

describe("V2ProgressBar — 잘못된 외부 계산값", () => {
  test.each([
    [Number.NaN, 0],
    [-10, 0],
    [0, 0],
    [37.5, 37.5],
    [120, 100],
    [Number.NEGATIVE_INFINITY, 0],
    [Number.POSITIVE_INFINITY, 100],
  ])("%p를 유효한 진행률 %p로 정규화한다", (input, expected) => {
    expect(normalizeV2ProgressValue(input)).toBe(expected)
  })
})

describe("V2DialogHost — 한 번의 사용자 동작은 한 요청만 닫는다", () => {
  const source = read("src/design-system-v2/components/V2DialogHost.tsx")

  it("큐 항목마다 안정적인 id가 있고 현재 머리와 일치할 때만 제거한다", () => {
    expect(source).toMatch(/type QueueItem = \{ id: number/u)
    expect(source).toMatch(/if \(head\?\.id !== id\) return/u)
    expect(source).toMatch(/settle\(currentItem\?\.id, index\)/u)
  })

  it("Promise resolve를 React setState updater 안에서 실행하지 않는다", () => {
    expect(source).toContain("head.resolve(result)")
    expect(source).not.toMatch(/setQueue\(\(prev\) => \{[^}]*resolve\(/u)
  })
})

describe("V2 입력·컨트롤 — 소비자 props가 불변 상태를 되돌리지 않는다", () => {
  test.each([
    "V2Button.tsx",
    "V2IconButton.tsx",
    "V2Checkbox.tsx",
    "V2Switch.tsx",
    "V2TextField.tsx",
    "V2SearchField.tsx",
  ])("%s는 rest 뒤에 accessibilityState를 합성한다", (file) => {
    const source = read(`src/design-system-v2/components/${file}`)
    const rest = source.indexOf("{...rest}")
    const state = source.indexOf("accessibilityState={{", rest)
    expect(rest).toBeGreaterThan(-1)
    expect(state).toBeGreaterThan(rest)
    expect(source.slice(state, state + 180)).toContain("...accessibilityState")
  })

  it("검색 필드는 multiline을 API에서 막고 런타임에도 단일행을 강제한다", () => {
    const source = read("src/design-system-v2/components/V2SearchField.tsx")
    expect(source).toMatch(/\| "multiline"/u)
    expect(source).toMatch(
      /\{\.\.\.rest\} accessibilityRole="search"[\s\S]*?multiline=\{false\}/u,
    )
  })
})

describe("V2 선택 컨트롤 — 이미 선택된 값은 다시 통지하지 않는다", () => {
  test.each(["V2Tab.tsx", "V2TabBar.tsx", "V2SegmentControl.tsx"])(
    "%s는 selected일 때 onChange를 호출하지 않는다",
    (file) => {
      const source = read(`src/design-system-v2/components/${file}`)
      expect(source).toContain("if (!selected) onChange(item.value)")
    },
  )
})

describe("V2Modal — 터치 흡수 카드가 가짜 버튼이 되지 않는다", () => {
  it("내부 카드는 스크린리더 접근성 노드에서 제외한다", () => {
    const source = read("src/design-system-v2/components/V2Modal.tsx")
    expect(source).toMatch(
      /<Pressable accessible=\{false\} style=\{\[styles\.card/u,
    )
  })
})
