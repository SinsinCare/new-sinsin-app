import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(__dirname, "..")
const DETAIL = readFileSync(
  join(ROOT, "src/features/restaurant/views/RestaurantDetailScreen.tsx"),
  "utf-8",
)
const REGISTRY = readFileSync(
  join(ROOT, "src/design-system-v2/icons/registry.ts"),
  "utf-8",
)
const ACTION_PILLS = readFileSync(
  join(ROOT, "src/features/restaurant/components/detail/DetailActionPills.tsx"),
  "utf-8",
)

describe("restaurant primary action icon contrast", () => {
  it("진단하기는 브랜드 면 위 글자만이다 — 아이콘을 얹지 않는다", () => {
    /*
      ── 2026-08-20 갱신 ────────────────────────────────────────────────
      앞 판본은 `key: "diagnose"` 옆에 `icon: "sparkleMono"` 가 있을 것을 요구했다.
      그 기대값이 태어난 이유는 **두 톤 `sparkle` 이 브랜드 오렌지 면 위에서 사라졌기**
      때문이고(색이 svg 에 박혀 있어 `color` prop 이 먹지 않는다), 그 진단은 지금도 옳다.

      바뀐 것은 CTA 에 아이콘이 있는지다. 시안의 하단 바는 `아이콘 셋 + 글자 하나` 이고
      주황 버튼 안에는 `진단하기` 네 글자뿐이다(C1_2·C4_2 실측: 상자 65.0×32.0, 글자
      잉크 43.0). 아이콘을 넣으면 그 리듬이 깨지고 상자도 실측 폭을 넘는다.

      그래서 이 테스트는 **아이콘이 없다는 것**을 못 박고, 두 톤 sparkle 이 브랜드 면에
      다시 올라오는 회귀는 아래 항목이 계속 막는다. `sparkleMono` 자체는 남겨 둔다 —
      브랜드 면에 아이콘을 올려야 할 다음 자리가 쓸 수 있어야 하고, 그때 골라야 할 것이
      두 톤이 아니라 단색이라는 사실이 이 파일의 본론이다.
    */
    expect(DETAIL).toMatch(
      /key:\s*"diagnose"[\s\S]{0,160}emphasis:\s*"primary"/u,
    )
    expect(DETAIL).not.toMatch(/key:\s*"diagnose"[\s\S]{0,160}icon:/u)
    expect(ACTION_PILLS).not.toMatch(
      /function PrimaryButton[\s\S]{0,700}<V2Icon/u,
    )
    // 브랜드 면 위 글자는 흰색이다(면과 같은 톤의 회색을 고르지 않는다).
    expect(ACTION_PILLS).toContain("color: colors.static.white")
    expect(ACTION_PILLS).toContain("backgroundColor: colors.primary.primary")
  })

  it("단색 sparkle 은 등록된 채로 남아 있고 currentColor 를 따른다", () => {
    // 브랜드 면에 아이콘을 올려야 할 다음 자리가 이것을 골라야 한다.
    expect(REGISTRY).toContain("sparkleMono: IconSparkleMono")
    const svg = readFileSync(
      join(ROOT, "src/design-system-v2/icons/svg/icon-sparkle-mono.svg"),
      "utf-8",
    )
    expect(svg).toContain('fill="currentColor"')
    expect(svg).not.toMatch(/#[0-9A-Fa-f]{6}/u)
  })

  it("지도 AI 검색은 기존 두 톤 sparkle을 유지한다", () => {
    const rail = readFileSync(
      join(ROOT, "src/features/restaurant/components/CategoryChipRail.tsx"),
      "utf-8",
    )
    expect(rail).toContain('name="sparkle"')
    expect(rail).not.toContain('name="sparkleMono"')
    const svg = readFileSync(
      join(ROOT, "src/design-system-v2/icons/svg/icon-sparkle.svg"),
      "utf-8",
    )
    expect(svg).toContain('fill="#FE7139"')
    expect(svg).toContain('fill="#FF9200"')
  })
})
