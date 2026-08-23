import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * 서체 계보 회귀 방지.
 *
 * Pretendard 는 굵기별 **네 개의 파일**로 로드된다. 그래서 RN 에서는 `fontFamily` 로
 * face 를 골라야 하고, `fontWeight` 만 준 스타일은 Pretendard 가 아니라 **OS 기본
 * 서체**로 그려진다. 2026-08-17 실측 당시 `src/features/home` 34개 파일이 그 상태였고,
 * 식당 탭은 v2 `typography` 토큰이 face 를 들고 있어 Pretendard 였다 —
 * **탭을 옮기면 서체가 바뀌고 있었다.** 색·간격보다 먼저 눈에 띄는 불일치다.
 *
 * 해법은 `src/shared/components/AppText` 의 `Text`/`TextInput` 이다. `fontWeight` 를
 * Pretendard face 로 바꿔 주고 `fontWeight` 는 뗀다(합성 볼드 방지).
 *
 * 이 테스트가 막는 것: **`react-native` 에서 `Text`/`TextInput` 을 직접 가져오면서
 * `fontWeight` 를 쓰는 파일이 새로 생기는 것.**
 */

/** `bun test` 는 레포 루트에서 돈다. */
const ROOT = process.cwd()
const ROOTS = ["src", "app"]

/** face 를 스스로 정하는 구역 — v2 컴포넌트는 typography 토큰으로 face 를 넣는다. */
const EXEMPT = [
  "src/design-system-v2/",
  "src/shared/components/AppText.tsx",
  // tamagui 는 fonts.ts 의 weight→face 매핑을 타므로 fontWeight 가 정상 동작한다.
  // (그 계보를 걷는 것은 별개 작업 — docs/design/2026-08-17-design-consistency-plan.md)
]

/**
 * `fontWeight` 를 face 로 바꿔 주는 래퍼들. 이 안에 쓰인 `fontWeight` 는 안전하다.
 *
 * ■ 왜 파일 단위 판정으로는 부족한가 (2026-08-19)
 *
 *   tamagui 를 걷어내면서 `<Text fontWeight="600">` 이 `<V2Text style={{fontWeight}}>`
 *   로 바뀌었다. `V2Text` 는 그 weight 를 Pretendard face 로 바꾸고 `fontWeight` 를
 *   떼므로 **서체가 깨지지 않는다.** 그런데 같은 파일이 레이아웃용으로
 *   `import { View, TextInput } from "react-native"` 도 하고 있어서, "파일에
 *   fontWeight 가 있고 RN Text 계열 import 가 있다" 는 옛 판정에 걸렸다.
 *
 *   실측: RenameModal 3건·consult.tsx 4건 모두 `V2Text`/`StyleSheet`(V2Text 에 전달)
 *   안이었고 **RN `Text`/`TextInput` 태그에 직접 붙은 것은 0건**이었다.
 *
 *   그래서 이제 **태그 단위**로 본다 — 진짜 위험한 것만 잡는다.
 */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (full.endsWith(".tsx")) out.push(full)
  }
  return out
}

const RN_TEXT_IMPORT = /import\s*\{([^}]*)\}\s*from\s*"react-native"/

/**
 * 주석을 지운 사본을 만든다.
 *
 * 주석 안의 `fontWeight` 라는 **단어**까지 위반으로 세면, 이 규칙을 설명하는 주석을
 * 다는 순간 그 파일이 위반자가 된다(실측 2026-08-19: FoodResultEdit 에
 * "fontWeight 만 주면 …" 이라고 적었더니 가드가 물었다). 규칙을 지키려고 남긴 설명이
 * 규칙 위반이 되는 건 명백히 틀렸다.
 *
 * 문자열 리터럴 안의 `//` 를 주석으로 오인하지 않도록 따옴표를 먼저 건너뛴다.
 */
function stripComments(src: string): string {
  let out = ""
  let i = 0
  while (i < src.length) {
    const c = src[i]
    // 문자열/템플릿 — 통째로 옮긴다
    if (c === '"' || c === "'" || c === "`") {
      const q = c
      out += c
      i++
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") {
          out += src[i]
          i++
        }
        out += src[i]
        i++
      }
      out += src[i] ?? ""
      i++
      continue
    }
    // 줄 주석
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++
      continue
    }
    // 블록 주석
    if (c === "/" && src[i + 1] === "*") {
      i += 2
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++
      i += 2
      continue
    }
    out += c
    i++
  }
  return out
}

/**
 * RN `Text`/`TextInput` **태그에 직접** 붙은 `fontWeight` 를 센다.
 *
 * `<V2Text>` 는 세지 않는다 — 그쪽은 weight 를 Pretendard face 로 바꾸고
 * `fontWeight` 를 뗀다. 태그 이름이 정확히 일치하는 것만 보므로 `V2Text` 는
 * 애초에 이 정규식에 걸리지 않는다(`<V2Text` 는 `<Text\b` 와 매치되지 않는다).
 *
 * `style={styles.foo}` 처럼 이름으로 참조하는 경우까지 따라가지는 않는다 —
 * 정적 분석의 한계다. 여기서는 **명백한 위반**만 잡는다.
 */
function directOffenses(src: string, tag: string): number {
  let n = 0
  // `<Text` 는 잡고 `<TextInput`·`<V2Text` 는 안 잡히도록 경계를 준다.
  const re = new RegExp(`<${tag}(?![A-Za-z0-9_])([^>]*?)/?>`, "gs")
  for (const m of src.matchAll(re)) {
    if (m[1].includes("fontWeight")) n += 1
  }
  return n
}

describe("서체 계보 — fontWeight 는 Pretendard face 로만 말한다", () => {
  it("react-native 의 Text/TextInput 태그에 fontWeight 를 직접 주는 곳이 없다", () => {
    const offenders: string[] = []

    for (const root of ROOTS) {
      for (const file of walk(join(ROOT, root))) {
        const rel = file.slice(ROOT.length + 1)
        if (EXEMPT.some((prefix) => rel.startsWith(prefix))) continue

        // 주석은 규칙 설명일 뿐 코드가 아니다(stripComments 머리말).
        const src = stripComments(readFileSync(file, "utf8"))
        if (!src.includes("fontWeight")) continue

        const match = src.match(RN_TEXT_IMPORT)
        if (!match) continue

        const specifiers = match[1].split(",").map((s) => s.trim())
        /*
          RN 에서 가져온 이름만 검사한다. `Text` 를 가져오지 않고 `TextInput` 만
          가져왔다면 `<Text>` 는 이 파일의 것이 아니다(v2 배럴 등).
        */
        let bad = 0
        for (const name of ["Text", "TextInput"]) {
          if (!specifiers.includes(name)) continue
          bad += directOffenses(src, name)
        }
        if (bad > 0) offenders.push(rel)
      }
    }

    expect(offenders).toEqual([])
  })
})
