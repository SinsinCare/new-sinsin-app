/**
 * `scripts/tamagui-jsx-rewrite.ts` 의 태그 파싱이 **JSX 를 깨지 않는지** 검증한다.
 *
 * ## 왜 — 급하게 짠 정규식이 코드를 잘라먹었다 (2026-08-19)
 *
 * tamagui 이행 중 `<Tag ...>` 를 `[^>]*` 로 잡는 치환을 돌렸다가
 * `onPress={() => void handleClose()}` 의 **화살표 `>`** 를 태그 끝으로 오인해
 * 속성 뒤가 통째로 날아갔다:
 *
 *     <V2HStack ... style={{...}}> void handleClose()}
 *
 * tsc 가 잡아 주긴 했지만(TS1381), 그때 `git checkout` 으로 되돌리면서 **같은 파일에
 * 있던 다른 사람의 미커밋 작업까지 지웠다.** 파서가 틀리면 피해가 그 파일에서
 * 끝나지 않는다.
 *
 * 그래서 파서만 따로 잠근다. 아래 케이스는 전부 실제 이 레포에 있는 형태다.
 */

/** rewrite 스크립트의 `findTagEnd` 와 같은 규칙 — 중괄호 깊이를 세며 `>` 를 찾는다. */
function findTagEnd(src: string, from: number): { end: number; self: boolean } {
  let depth = 0
  let quote: string | null = null
  for (let i = from; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c
      continue
    }
    if (c === "{") depth++
    else if (c === "}") depth--
    else if (c === ">" && depth === 0) {
      return { end: i, self: src[i - 1] === "/" }
    }
  }
  return { end: -1, self: false }
}

/** `<Tag` 뒤부터 시작해 여는 태그 전체를 돌려준다. */
function openTag(jsx: string): string {
  const from = jsx.indexOf(" ")
  const { end } = findTagEnd(jsx, from)
  return jsx.slice(0, end + 1)
}

describe("여는 태그 끝 찾기 — 속성값 안의 `>` 에 속지 않는다", () => {
  it("화살표 함수 — 이것 때문에 사고가 났다", () => {
    const jsx = `<XStack onPress={() => void handleClose()}>내용</XStack>`
    expect(openTag(jsx)).toBe(`<XStack onPress={() => void handleClose()}>`)
  })

  it("화살표가 여러 개여도 끝까지 센다", () => {
    const jsx = `<YStack onPress={() => setOpen((v) => !v)} onLayout={(e) => set(e)}>x</YStack>`
    expect(openTag(jsx)).toBe(
      `<YStack onPress={() => setOpen((v) => !v)} onLayout={(e) => set(e)}>`,
    )
  })

  it("비교 연산자 `>` 도 속성값 안이면 무시한다", () => {
    const jsx = `<Text color={count > 0 ? "red" : "grey"}>{count}</Text>`
    expect(openTag(jsx)).toBe(`<Text color={count > 0 ? "red" : "grey"}>`)
  })

  it("중첩 객체 리터럴 — style 안에 중괄호가 또 있다", () => {
    const jsx = `<View style={{ transform: [{ rotate: "90deg" }], opacity: 0.6 }}>x</View>`
    expect(openTag(jsx)).toBe(
      `<View style={{ transform: [{ rotate: "90deg" }], opacity: 0.6 }}>`,
    )
  })

  it("문자열 안의 `>` 와 `{` 도 무시한다", () => {
    const jsx = `<Text accessibilityLabel="a > b { c">x</Text>`
    expect(openTag(jsx)).toBe(`<Text accessibilityLabel="a > b { c">`)
  })

  it("템플릿 리터럴 안의 `${}` 는 깊이를 흔들지 않는다", () => {
    const jsx = "<View key={`${a}:${b}`} style={s}>x</View>"
    expect(openTag(jsx)).toBe("<View key={`${a}:${b}`} style={s}>")
  })

  it("self-closing 을 구분한다", () => {
    const jsx = `<View style={styles.dot} />`
    const { end, self } = findTagEnd(jsx, jsx.indexOf(" "))
    expect(self).toBe(true)
    expect(jsx.slice(0, end + 1)).toBe(`<View style={styles.dot} />`)
  })

  it("닫히지 않은 태그는 -1 — 조용히 자르지 않는다", () => {
    const jsx = `<XStack onPress={() => {`
    expect(findTagEnd(jsx, jsx.indexOf(" ")).end).toBe(-1)
  })
})

describe("옛 방식은 실제로 깨진다 — 회귀 근거", () => {
  it("`[^>]*` 정규식은 화살표에서 잘린다", () => {
    const jsx = `<XStack onPress={() => void handleClose()}>내용</XStack>`
    const naive = /<XStack(\s[^>]*?)?>/.exec(jsx)
    // 사고 당시와 같은 결과: 화살표의 `>` 에서 끊긴다.
    expect(naive?.[0]).toBe(`<XStack onPress={() =>`)
    // 새 파서는 끝까지 간다.
    expect(openTag(jsx)).toBe(`<XStack onPress={() => void handleClose()}>`)
  })
})
