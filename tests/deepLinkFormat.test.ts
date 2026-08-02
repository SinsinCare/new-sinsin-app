/**
 * 딥링크 URL 을 **손으로 짓는 것**을 막는다.
 *
 * ## 실측된 결함
 *
 * 식당 상세 공유가 `sinsin://restaurant/${id}` 를 문자열로 만들고 있었다. 슬래시가 2개라
 * URL 파서가 `restaurant` 를 host 로 읽어서, 라우터에 도착하는 경로가 `/restaurant/317` 이
 * 아니라 `/317` 이 됐다. 결과는 id 마다 달랐다 —
 *
 * - `sinsin://restaurant/164` → **레시피 상세(단호박죽)**. 164 가 존재하는 레시피 id 라서.
 * - `sinsin://restaurant/317` → **지도 탭**. 317 에 걸리는 라우트가 없어서.
 *
 * 공유받은 사람 절반이 엉뚱한 화면을 보는 결함인데, 링크가 "가끔 되는" 것처럼 보여서
 * 오래 남아 있었다.
 *
 * ## 왜 이런 검사인가
 *
 * 이 결함은 **문자열 리터럴의 성질**이다. 타입이 맞고(둘 다 `string`), 화면도 정상으로
 * 렌더되고, 컴포넌트 테스트도 통과한다. `tsc` 와 eslint 는 슬래시를 못 센다. 실제로 열어
 * 보기 전에는 아무 신호가 없다.
 *
 * 그래서 "올바른 문자열인가" 를 검사하지 않는다 — 올바른 형태는 빌드 형태마다 다르기
 * 때문이다(개발 클라이언트는 `exp+sinsin://`, 스토어 빌드는 `sinsin:///`). 대신
 * **문자열을 손으로 짓는 것 자체를 금지**하고 `Linking.createURL` 을 감싼
 * `src/shared/utils/deepLink.ts` 로만 만들게 한다. 형태를 아는 책임을 expo 에 넘기는 것이다.
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import {
  buildDeepLink,
  normalizeDeepLinkPath,
  restaurantDeepLink,
} from "@/src/shared/utils/deepLink"

// expo-linking 은 ESM 이라 이 jest 설정에서 그대로 못 읽는다. 여기서 검증하려는 것은
// "우리가 문자열을 짓지 않고 createURL 에 넘기는가" 이므로 그 경계를 가짜로 세운다.
// 접두사를 실제로 무엇으로 만드는지는 expo 의 책임이고 우리가 시험할 것이 아니다.
// (babel-plugin-jest-hoist 가 이 호출을 import 위로 끌어올리므로 위치는 안전하다.)
jest.mock("expo-linking", () => ({
  createURL: (path: string) => `sinsin://${path}`,
}))

const ROOT = join(__dirname, "..")
const SCANNED = ["src", "app"]

/** 딥링크 헬퍼 자신은 스킴을 문서로 설명해야 하므로 예외다. */
const ALLOWED = [join("src", "shared", "utils", "deepLink.ts")]

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, out)
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe("딥링크 URL 생성", () => {
  it("앱 스킴을 손으로 쓴 곳이 없다", () => {
    const offenders: string[] = []

    for (const root of SCANNED) {
      for (const file of collectSourceFiles(join(ROOT, root))) {
        const relative = file.slice(ROOT.length + 1)
        if (ALLOWED.includes(relative)) continue

        const source = readFileSync(file, "utf8")
        source.split("\n").forEach((line, index) => {
          // 주석에 예시로 적는 것까지 막으면 문서를 못 쓴다. 코드 줄만 본다.
          const code = line.replace(/^\s*(\/\/|\*|\/\*).*$/, "")
          if (/sinsin:\/\//.test(code)) {
            offenders.push(`${relative}:${index + 1}  ${line.trim()}`)
          }
        })
      }
    }

    expect(offenders).toEqual([])
  })

  it("경로 앞 슬래시를 한 형태로 고정한다", () => {
    expect(normalizeDeepLinkPath("/restaurant/317")).toBe("/restaurant/317")
    expect(normalizeDeepLinkPath("restaurant/317")).toBe("/restaurant/317")
    expect(normalizeDeepLinkPath("  /recipe/164  ")).toBe("/recipe/164")
  })

  it("경로를 통째로 createURL 에 넘긴다 — 스킴 뒤에 붙는 것이 host 가 아니라 경로여야 한다", () => {
    // 가짜 createURL 이 `sinsin://` + 인자를 돌려주므로, 인자가 `/` 로 시작하는 한
    // 결과는 슬래시 3개가 된다. 실제 결함은 인자에서 앞 슬래시가 빠져 `restaurant` 가
    // host 자리에 오는 것이었다.
    expect(buildDeepLink("/restaurant/317")).toBe("sinsin:///restaurant/317")
    expect(restaurantDeepLink(164)).toBe("sinsin:///restaurant/164")
  })
})
