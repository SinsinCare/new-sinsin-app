/**
 * 소스에서 **주석을 걷어낸다.** 소스를 훑는 가드 테스트가 쓴다.
 *
 * ## 왜 필요한가 (실측)
 *
 * 이 저장소의 주석은 고친 결함의 **코드 모양을 그대로 인용**한다 —
 * "`new Date(review.createdAt)` 이면 안 된다", "`router.push` 가 아니다".
 * 그래서 "이 파일에 `new Date(review.createdAt)` 가 없어야 한다" 는 검사를 원문에
 * 대고 돌리면 **고쳐 놓은 파일이 자기 주석에 걸려** 영원히 빨간색이다. 통과할 수
 * 없는 검사는 결국 지워지고, 그러면 지켜 주는 것이 하나도 남지 않는다.
 *
 * 반대 방향도 있다. 주석에만 적혀 있고 코드에는 없는 것을 "있다" 로 세면 가드가
 * 조용히 무력해진다 — 주석을 지우는 순간 검사가 깨지는 것이 아니라, **주석만 남고
 * 코드가 사라져도 초록**이 된다.
 *
 * ## 무엇을 하는가
 *
 * 문자열·템플릿 리터럴 안은 건드리지 않고 `//` 줄 주석과 `/* *\/` 블록 주석만
 * 지운다(줄 번호가 어긋나지 않게 줄바꿈은 남긴다). TS 파서를 붙일 수도 있지만,
 * 이 용도에는 상태 기계 하나면 충분하고 스캐너가 파서 버전에 묶이지 않는다.
 */
type Mode = "code" | "line" | "block" | "'" | '"' | "`"

export function codeOnly(source: string): string {
  let out = ""
  let mode: Mode = "code"

  for (let i = 0; i < source.length; ) {
    const c = source[i]
    const next = source[i + 1]

    if (mode === "code") {
      if (c === "/" && next === "*") {
        mode = "block"
        i += 2
        continue
      }
      if (c === "/" && next === "/") {
        mode = "line"
        i += 2
        continue
      }
      if (c === "'" || c === '"' || c === "`") mode = c
      out += c
      i += 1
      continue
    }

    if (mode === "block") {
      if (c === "*" && next === "/") {
        mode = "code"
        i += 2
      } else {
        // 줄바꿈은 남긴다 — 실패 메시지의 줄 번호가 원본과 맞아야 한다.
        if (c === "\n") out += c
        i += 1
      }
      continue
    }

    if (mode === "line") {
      if (c === "\n") {
        mode = "code"
        out += c
      }
      i += 1
      continue
    }

    // 문자열·템플릿 리터럴 안. 이스케이프는 통째로 넘긴다.
    if (c === "\\") {
      out += c + (next ?? "")
      i += 2
      continue
    }
    if (c === mode) mode = "code"
    out += c
    i += 1
  }

  return out
}
