/**
 * 다크에서 상호작용 상태가 라이트 색으로 깨지는 사고를 막는다.
 *
 * ## 실측 사고 (2026-08-19, 식당 지도 카테고리 레일)
 *
 * 선택 칩의 면은 `label.normal`, 글자는 `static.white` 였다. 라이트에서는
 * 잉크 면 + 흰 글자로 옳다. 그런데 `label.normal` 은 테마를 따라 **뒤집히는**
 * 토큰이다(라이트 #2a2a2a → 다크 #f9fafb). 글자는 `static.white` 로 고정이라
 * 다크에서 **흰 면 위 흰 글자**(대비 1.0:1)가 됐다 — "중식" 칩이 글자 없는
 * 흰 알약으로 보였다.
 *
 * ## 규칙
 *
 * 면이 `label.*`(테마 따라 뒤집힘)이면 그 위 글자는 `static.white` 가 아니라
 * **`background.default`**(면과 반대로 뒤집히는 짝)여야 한다. 사진·스크림·브랜드색
 * 위의 `static.white` 는 배경이 테마와 무관하게 고정이므로 옳다 — 이 가드의
 * 대상이 아니다.
 *
 * 검사는 "한 스타일 표현식 안에 `label.*` 면과 `static.white` 글자가 함께 있는
 * 삼항 분기" 라는 **사고의 정확한 형태**만 잡는다. 넓게 잡으면 사진 위 흰 글자
 * 같은 정상 사용이 전부 오탐이 된다.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(__dirname, "..")

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (p.endsWith(".tsx")) acc.push(p)
  }
  return acc
}

/** 주석 제거 — 규칙을 설명하는 주석 속 단어가 위반으로 잡히지 않게. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

describe("다크 모드 상호작용 색", () => {
  it("뒤집히는 면(label.*) 위 글자에 static.white 를 쓰지 않는다", () => {
    const offenders: string[] = []
    for (const file of walk(join(ROOT, "src"))) {
      const source = code(readFileSync(file, "utf-8"))
      /*
        사고의 형태: 같은 컴포넌트 렌더 안에서
          backgroundColor: … label.\w+ …      (뒤집히는 면)
          color: <상태> ? static.white : …     (고정 흰 글자)
        가 함께 있는 경우. 700자 창은 한 컴포넌트의 스타일 블록 크기다.
      */
      for (const m of source.matchAll(
        // 삼항식이 여러 줄로 꺾여도 잡는다 — `backgroundColor: active\n ? colors.label.normal` 형태.
        /backgroundColor:[\s\S]{0,90}?\.label\.\w+/gu,
      )) {
        const windowText = source.slice(m.index, m.index + 700)
        if (/color:\s*\w+\s*\?\s*colors\.static\.white/u.test(windowText)) {
          offenders.push(file.replace(`${ROOT}/`, ""))
          break
        }
      }
    }
    expect(offenders).toEqual([])
  })

  /*
    2026-08-20 갱신. 옛 기대값은 `color: active ? colors.background.default` 였다.

    그 값 자체가 규칙이었던 적은 없다 — "선택 면이 `label.normal`(테마 따라 뒤집힘)" 이라는
    **전제 위에서** 고른 짝이었다. 새 시안이 이 레일의 선택 표시를 브랜드 테두리 + 옅은
    브랜드 틴트 면으로 바꾸면서 그 전제가 사라졌다(`CategoryChipRail` 머리말 2026-08-20:
    면은 칩 자신의 면에 `over()` 로 얹은 틴트, 글자는 두 상태 모두 `label.normal`).

    그러니 옛 문자열을 계속 요구하면 사고를 막는 게 아니라 **이미 폐기된 처방을 붙잡는**
    검사가 된다. 검사를 "사고의 전제가 다시 생기지 않는가" 로 옮긴다. `label.*` 면 +
    `static.white` 글자라는 조합 자체는 위 첫 검사가 src 전체에서 계속 잡는다.
  */
  /*
    2026-08-21. 그 표면은 순수 함수(`categoryChipSurface.ts`)로 내려갔다 — 컴포넌트는
    이제 값을 얹기만 한다. 그래서 이 검사도 그 파일을 본다. 실제 대비(상대휘도 4.5:1)는
    `restaurantCategoryChip.test.ts` 가 해석된 값으로 잰다.
  */
  /*
    2026-09-05(cf7679c) 압축 지도 시안에서 선택 칩이 다시 **잉크 면(label.normal)** 이 됐다.
    그래서 이 검사는 "label.* 면을 쓰지 않는다" 가 아니라 위 규칙 그대로 — 면이
    뒤집히는 토큰이면 글자는 그 반대로 뒤집히는 짝(background.default)이어야 하고,
    static.white 는 안 된다 — 를 본다. 해석된 값의 실제 대비(라이트·다크 4.5:1)는
    `restaurantCategoryChip.test.ts` 가 잰다. 2026-09-08 다크 점검에서 오래된 형태의
    이 검사가 그 시안 변경에 뒤처져 실패하고 있었다.
  */
  it("카테고리 레일의 선택 면이 label.* 이면 글자는 background.default 다", () => {
    const rail = code(
      readFileSync(
        join(ROOT, "src/features/restaurant/components/CategoryChipRail.tsx"),
        "utf-8",
      ),
    )
    const surface = code(
      readFileSync(
        join(ROOT, "src/features/restaurant/components/categoryChipSurface.ts"),
        "utf-8",
      ),
    )
    expect(surface).toMatch(
      /backgroundColor:\s*active\s*\?\s*colors\.label\.normal/u,
    )
    expect(surface).toMatch(
      /color:\s*active\s*\?\s*colors\.background\.default\s*:\s*colors\.label\.normal/u,
    )
    for (const source of [rail, surface]) {
      expect(source).not.toMatch(/static\.white/u)
    }
    // 컴포넌트는 면을 다시 정하지 않고 surface 의 값을 얹기만 한다.
    expect(rail).toMatch(/surface\.backgroundColor/u)
    expect(rail).toMatch(/color: surface\.color/u)
  })

  it("음식 확인 옵션의 선택 면은 라이트 전용 sub1을 쓰지 않는다", () => {
    const source = code(
      readFileSync(
        join(ROOT, "src/features/home/components/FoodAnalysisConfirmation.tsx"),
        "utf-8",
      ),
    )
    expect(source).not.toContain("tokens.color.sub1.val")
    expect(source).toContain("colors.accentForeground.orangeWeak")
    expect(source).toContain("colors.accentForeground.orange")
  })
})
