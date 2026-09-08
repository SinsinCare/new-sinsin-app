import { readFileSync } from "fs"
import { resolve } from "path"

const SOURCE = readFileSync(
  resolve(__dirname, "../src/features/home/components/LoadingOverlay.tsx"),
  "utf8",
)

function styleBlock(name: string): string {
  return new RegExp(`\\b${name}: \\{([^}]*)\\}`, "u").exec(SOURCE)?.[1] ?? ""
}

describe("식단 분석 로딩 레이아웃", () => {
  it("상태·팁·늦게 나타나는 안내 문장의 높이를 첫 프레임부터 확보한다", () => {
    expect(SOURCE).toMatch(/<View style=\{styles\.statusSlot\}>/u)
    expect(SOURCE).toMatch(/<View style=\{styles\.tipSlot\}>/u)
    expect(SOURCE).toMatch(/<View style=\{styles\.dismissHintSlot\}>/u)
    expect(styleBlock("statusSlot")).toMatch(/minHeight: 80/u)
    expect(styleBlock("tipSlot")).toMatch(/minHeight: 108/u)
    expect(styleBlock("dismissHintSlot")).toMatch(/minHeight: 60/u)
  })

  it("하단 안내는 고정 슬롯 안에서 opacity 페이드만 적용한다", () => {
    expect(SOURCE).toMatch(
      /<View style=\{styles\.dismissHintSlot\}>[\s\S]*showDismiss && onDismiss \? \([\s\S]*entering=\{FadeIn\.duration\(220\)\}/u,
    )
    expect(styleBlock("dismissHint")).toMatch(/marginTop: 24/u)
  })
})
