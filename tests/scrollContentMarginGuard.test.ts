/**
 * **`contentContainerStyle` 에 걸린 음수 마진**을 막는다.
 *
 * ## 실측된 결함 — 2026-08-21, `StepSheet` 의 `+` 줄
 *
 * 손가락 과녁을 44 로 채우려고 스크롤 목록의 마지막 자식에게 아래 hitSlop 7 을 줬다.
 * hitSlop 은 부모 경계를 넘지 못하므로(RN `ViewPropTypes.d.ts`: "The touch area never
 * extends past the parent view bounds.") 부모에 `paddingBottom: 7` 을 같이 줘야 하는데,
 * 그러면 눈에 보이는 여백이 7 만큼 벌어진다. 그래서 **늘린 만큼을 음수 마진으로
 * 되돌리는** 짝을 쓴다 — 이 레포에 이미 여러 군데 있는 관용구다.
 *
 * 그 짝을 스크롤 뷰에 쓰면서 **둘 다 `contentContainerStyle` 에 얹었다.** 타입도 린트도
 * 테스트도 전부 green 이고, 화면도 멀쩡해 보인다. 그런데 과녁은 44 가 되지 않았다.
 *
 * ## 왜 조용히 어긋나는가
 *
 * 스크롤 콘텐츠 크기는 자식들의 **프레임**을 합친 것이지 margin box 가 아니다 —
 * `ReactCommon/react/renderer/components/scrollview/ScrollViewShadowNode.cpp`:
 *
 *     contentBoundingRect.unionInPlace(childNode->getLayoutMetrics().frame);
 *
 * 그래서 `contentContainerStyle` 의 음수 마진은 **콘텐츠에서 빠지지 않는다.** 대신
 * 높이가 auto 인 ScrollView **자신**이 자식의 margin box 만큼 줄어든다. 결과는 의도와
 * 정반대다 — 콘텐츠가 뷰포트보다 그만큼 길어지고, 늘려 둔 패딩의 일부가 뷰포트 밖으로
 * 밀려 잘린다. 즉 **과녁을 넓히려고 넣은 코드가 과녁을 도로 잘라 먹는다.**
 *
 * 바로잡는 배선은 짝을 **두 prop 에 나눠 거는 것**이다.
 *
 *     style={[{ maxHeight }, styles.listBox]}   // ← 음수 마진 (뷰 자신)
 *     contentContainerStyle={styles.list}       // ← 패딩       (콘텐츠)
 *
 * `WriteChipRail` 의 `rail`/`railContent` 짝이 원래 이 모양이었다. 같은 커밋 안에서
 * 한쪽은 맞고 한쪽은 틀렸다는 뜻이라, 사람이 매번 기억하는 것에 기대면 또 틀린다.
 *
 * ## 왜 이런 검사인가
 *
 * 이 결함은 **눈으로도 안 보이고 렌더 테스트로도 안 잡힌다.** 잘려 나가는 것은 픽셀이
 * 아니라 hitSlop 이라 스크린샷이 똑같고, 이 레포의 jest 는 `testEnvironment: "node"` 에
 * `react-native` 를 스텁으로 두어 레이아웃을 계산하지 않는다. 실제로 잡으려면 기기에서
 * 손가락으로 그 3pt 를 눌러 보는 수밖에 없었다.
 *
 * 그래서 **레이아웃 대신 배선을 검사한다.** 값이 맞는지가 아니라 음수 마진이 얹힌
 * 자리가 맞는지만 본다 — 그건 소스에서 정적으로 읽을 수 있다.
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const SRC = join(__dirname, "..", "src")

/** 주석 안의 예시 코드가 위반으로 잡히지 않게 먼저 걷어낸다(이 파일 자신이 그랬다). */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(?<!:)\/\/[^\n]*/g, "")
}

function tsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...tsxFiles(full))
    else if (entry.endsWith(".tsx")) out.push(full)
  }
  return out
}

const NEGATIVE_MARGIN =
  /\bmargin(?:Top|Bottom|Vertical|Left|Right|Horizontal|Start|End)?\s*:\s*-/

describe("스크롤 콘텐츠 컨테이너의 음수 마진", () => {
  const files = tsxFiles(SRC)

  it("검사할 파일을 실제로 찾는다", () => {
    // 경로가 어긋나 0개를 훑고도 통과하는 검사만큼 나쁜 것이 없다.
    expect(files.length).toBeGreaterThan(100)
  })

  it("`contentContainerStyle` 이 가리키는 스타일에는 음수 마진이 없다", () => {
    const violations: string[] = []

    for (const file of files) {
      const source = stripComments(readFileSync(file, "utf8"))

      // 1) `contentContainerStyle={styles.foo}` · `={[styles.foo, ...]}`
      const referenced = new Set(
        [...source.matchAll(/contentContainerStyle=\{(?:\[)?\s*styles\.(\w+)/g)].map(
          (match) => match[1],
        ),
      )
      for (const key of referenced) {
        const block = new RegExp(`\\n {2}${key}:\\s*\\{([\\s\\S]*?)\\n {2}\\},`).exec(
          source,
        )
        if (block && NEGATIVE_MARGIN.test(block[1])) {
          violations.push(`${file.slice(SRC.length + 1)} → styles.${key}`)
        }
      }

      // 2) 인라인 객체. `contentContainerStyle={{ marginBottom: -7 }}`
      for (const inline of source.matchAll(/contentContainerStyle=\{\{([^}]*)\}\}/g)) {
        if (NEGATIVE_MARGIN.test(inline[1])) {
          violations.push(`${file.slice(SRC.length + 1)} → 인라인 contentContainerStyle`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it("검사가 실제로 위반을 잡는다", () => {
    // 검사기 자체가 죽어 있으면 위 테스트는 영원히 green 이다.
    const bad = `
      <ScrollView contentContainerStyle={styles.list} />
      const styles = StyleSheet.create({
  list: {
    paddingBottom: 7,
    marginBottom: -3,
  },
})`
    const key = /contentContainerStyle=\{(?:\[)?\s*styles\.(\w+)/.exec(bad)?.[1]
    expect(key).toBe("list")
    const block = new RegExp(`\\n {2}${key}:\\s*\\{([\\s\\S]*?)\\n {2}\\},`).exec(bad)
    expect(block).not.toBeNull()
    expect(NEGATIVE_MARGIN.test(block![1])).toBe(true)
  })

  it("주석 안의 예시는 위반이 아니다", () => {
    const commented = `/* 예전에는 marginBottom: -3 이었다 */\n  list: {\n    paddingBottom: 7,\n  },`
    expect(NEGATIVE_MARGIN.test(stripComments(commented))).toBe(false)
  })
})
