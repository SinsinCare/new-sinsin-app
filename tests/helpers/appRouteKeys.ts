/**
 * `app/` 파일 트리를 훑어 **`useSegments()` 가 돌려줄 라우트 키**를 만든다.
 *
 * 두 표(`routeGraph.ts` 의 뒤로가기 부모, `events.ts` 의 화면명)가 같은 키 규칙을 쓰고
 * 둘 다 "빠진 라우트가 있으면 조용히 잘못 동작한다" 는 성질을 갖는다. 스캐너를 각 테스트가
 * 따로 들고 있으면 키 규칙이 갈라진 순간 **한쪽 표만 검사가 헐거워지고**, 그게 새 화면이
 * 이름 없이 배포되는 경로다. 그래서 한 벌만 둔다.
 *
 * 키 규칙(expo-router 와 같아야 한다):
 *  - `(group)` 세그먼트는 **남는다**. URL 에서는 사라지지만 세그먼트에는 있다.
 *  - `[id]` 는 그 자리에 그대로 남는다.
 *  - **꼬리의 `index` 는 잘린다**(`global-state/routeInfo.js`). `app/recipe/[id]/index.tsx`
 *    의 키는 `recipe/[id]` 다.
 *  - `_layout`(껍데기)과 `+`(라우터 특수 파일)은 라우트가 아니다.
 */
import fs from "fs"
import path from "path"

export const APP_DIR = path.join(__dirname, "..", "..", "app")

function isRouteFile(name: string): boolean {
  if (!/\.(tsx|jsx|ts|js)$/u.test(name)) return false
  const base = name.replace(/\.(tsx|jsx|ts|js)$/u, "")
  if (base.startsWith("_")) return false
  if (base.startsWith("+")) return false
  return true
}

/** 파일 경로 → `useSegments()` 가 돌려줄 키. */
function toRouteKey(relative: string): string {
  const segments = relative.replace(/\.(tsx|jsx|ts|js)$/u, "").split(path.sep)
  if (segments[segments.length - 1] === "index") segments.pop()
  return segments.join("/")
}

export function collectRouteKeys(dir: string = APP_DIR, prefix = ""): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix === "" ? entry.name : path.join(prefix, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectRouteKeys(path.join(dir, entry.name), relative))
    } else if (isRouteFile(entry.name)) {
      out.push(toRouteKey(relative))
    }
  }
  return out
}
