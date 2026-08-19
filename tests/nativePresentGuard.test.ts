/**
 * **RN Modal 안에서 네이티브 present 를 부를 때 대기를 빠뜨리는 것**을 막는다.
 *
 * ## 실측된 결함 두 건 — 같은 자리에서 두 번 깨졌다
 *
 * 1. **2026-08-10 "눌러도 아무 일도 안 일어남".**
 *    iOS 는 present/dismiss 가 진행 중이면 새 present 를 **조용히 거부한다**.
 *    액션시트의 dismiss 전환이 끝나기 전에 공유를 띄워 매번 거부됐다.
 *    → `afterModalTransitions()` 로 전이 큐를 기다려 고쳤다.
 *
 * 2. **2026-08-19 "시트가 컴포넌트 뒤에 떠서 안 보임".**
 *    1번의 대기로는 부족했다. 전이 큐가 비었다는 것은 "움직이는 모달이 없다" 이지
 *    **"떠 있는 모달이 없다"** 가 아니다 — 액션시트가 제자리에 가만히 떠 있으면
 *    큐는 비어 있고 `visibleModalCount()` 는 1 이다.
 *
 *    그 상태에서 공유를 부르면 두 라이브러리가 **서로 다른 VC 를 고른다**:
 *
 *    | 쪽           | present 대상                                             |
 *    |--------------|----------------------------------------------------------|
 *    | RN Modal     | 자기 뷰트리의 `reactViewController` — topmost 탐색 없음   |
 *    | expo-sharing | `keyWindow.rootViewController` 에서 **topmost 까지 순회** |
 *
 *    `presentationStyle="pageSheet"` 는 밑의 VC 가 살아 있어서, 둘이 고른 VC 가
 *    갈리면 활동 시트가 **pageSheet 뒤로 들어간다.** 거부가 아니라 "떠 있는데 안 보임".
 *    → `afterSiblingModalsGone(depth)` 로 **레지스트리가 비는 것**을 기다려 고쳤다.
 *
 * ## 왜 이런 검사인가
 *
 * 두 결함 모두 **타입·린트·기존 테스트가 전부 green 인 채로** 났다. 호출은 문법적으로
 * 완벽하고, 컴포넌트는 정상 렌더되고, 예외도 로그도 없다. 화면을 실제로 눌러 보기
 * 전에는 아무 신호가 없다 — `prompt.md §7.4` 가 경고한 바로 그 부류다.
 *
 * 규칙이 주석에만 있으면 다음 공유 버튼에서 또 빠진다(실제로 그렇게 빠졌다).
 * 그래서 **"모달 안에서 네이티브 present 를 부르면 대기 헬퍼가 같은 파일에 있어야
 * 한다"** 를 소스에서 강제한다.
 *
 * ## 한계 — 이 테스트가 못 잡는 것
 *
 * 파일 단위 근사다. 같은 파일 안에 대기가 있기만 하면 통과하므로, 대기를 **다른
 * 경로에만** 걸어 둔 경우는 못 잡는다. 그래도 "아예 없는" 경우는 잡히고, 그것이
 * 두 번 다 실제로 일어난 모양이다. 호출 그래프까지 따지는 것은 이 테스트의 몫이
 * 아니다 — 통과하면 사람이 한 번 눌러 보는 것을 대체하지 않는다.
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(__dirname, "..")
const SCANNED = ["src", "app"]

/**
 * RN Modal 밖에서 네이티브 VC 를 띄우는 호출들.
 *
 * `Linking.openURL` 은 **일부러 뺐다** — 그것은 present 가 아니라 앱을 떠나는
 * 동작이라 계층이 겹칠 수 없다(RouteAppSheet 가 시트 안에서 그냥 부르고, 옳다).
 */
const NATIVE_PRESENT =
  /\b(?:Sharing\.shareAsync|Share\.share\(|Share\.shareSingle|ImagePicker\.launch\w+|DocumentPicker\.getDocumentAsync|ActionSheetIOS\.\w+)/

/** 이 파일이 RN Modal 안에서 사는가. */
const IN_MODAL = /\b(?:AppModal|V2Modal|V2BottomSheet)\b|<Modal\b/

/**
 * 대기 헬퍼의 **실제 호출**. 이름만 스치는 것(주석·import)은 세지 않는다.
 *
 * ⚠️ 여기를 `/\bafterModalTransitions\b/` 같은 이름 매칭으로 두면 **가드가 죽는다.**
 * 이 파일들은 결함 이력을 주석에 길게 적어 두는 관례가 있어서, 대기를 코드에서
 * 통째로 지워도 주석에 남은 같은 단어가 매칭돼 통과한다 — 실제로 그렇게 통과했다
 * (가드를 만든 직후 일부러 대기를 지워 보고 발견했다). `await …(` 형태만 본다.
 */
const WAIT_HELPER =
  /await\s+(?:afterModalTransitions|afterSiblingModalsGone)\s*\(/

/**
 * `Modal` 의 `onShow` 에서 여는 것은 **더 나은 방법**이다 — present 전환이 끝난
 * 뒤에 오므로 겹칠 수 없다. MediaPicker 가 이 방식이고, 대기 헬퍼가 필요 없다.
 */
const ON_SHOW = /onShow\s*=/

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

/** 주석 줄을 걷어낸다 — 문서에 예시로 적는 것까지 막으면 이 규칙을 설명할 수 없다. */
function stripComments(source: string): string {
  return source
    .split("\n")
    .filter((line) => {
      const t = line.trim()
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*")
    })
    .join("\n")
}

describe("모달 안 네이티브 present", () => {
  it("대기 없이 공유·피커를 띄우는 곳이 없다", () => {
    const offenders: string[] = []

    for (const root of SCANNED) {
      for (const file of collectSourceFiles(join(ROOT, root))) {
        const code = stripComments(readFileSync(file, "utf8"))

        if (!NATIVE_PRESENT.test(code)) continue
        if (!IN_MODAL.test(code)) continue
        if (WAIT_HELPER.test(code)) continue
        if (ON_SHOW.test(code)) continue

        offenders.push(file.slice(ROOT.length + 1))
      }
    }

    expect(offenders).toEqual([])
  })

  it("검사가 실제로 동작한다 — 알려진 호출부를 찾아낸다", () => {
    // 이 테스트가 조용히 0건만 세고 통과하는 것을 막는다. 스캐너가 망가지면
    // (경로 변경·정규식 오타) offenders 는 항상 비고 위 테스트는 영원히 green 이다.
    let scanned = 0
    let withPresent = 0

    for (const root of SCANNED) {
      for (const file of collectSourceFiles(join(ROOT, root))) {
        scanned += 1
        if (NATIVE_PRESENT.test(stripComments(readFileSync(file, "utf8")))) {
          withPresent += 1
        }
      }
    }

    expect(scanned).toBeGreaterThan(100)
    // 실측 시점 기준: 공유 2곳 + 피커 6곳 + 문서 업로드 1곳 + 액션시트 2곳.
    expect(withPresent).toBeGreaterThanOrEqual(5)
  })
})
