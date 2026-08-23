/**
 * 레시피 목록 화면에서 **떠 있는 것은 하나뿐**이고, 목록 바닥이 그것을 다 비우는지 본다.
 *
 * ## 무엇이 바뀌었나
 *
 * 예전에는 이 화면에 플로팅이 둘이었다 — 화면 소유의 주황 `레시피 쓰기`(`RecipeWriteFab`)
 * 와 전역 검정 `AI 상담`. 둘이 겹치지 않게 좌표를 맞춘 산술을 이 파일이 지켰다.
 *
 * 그런데 **겹치지 않는 것과 가리지 않는 것은 다른 문제**다. 두 버튼은 겹치지 않으면서도
 * 오른쪽 아래 130pt 를 점유했고, 연필 버튼이 스크롤 중 카드 글자를 덮었다(실측).
 * 그래서 화면 소유의 플로팅을 없애고 작성 진입점을 헤더 칩으로 올렸다. 남은 것은 전역
 * `AI 상담` 하나다.
 *
 * ## 그래서 이제 무엇을 지키는가
 *
 * 1. **화면이 두 번째 플로팅을 다시 만들지 않는다.** 이것이 되돌아오면 지적받은 가림이
 *    그대로 재현된다. 소스에서 `position: "absolute"` 플로팅과 옛 컴포넌트 이름을 본다.
 * 2. **목록 바닥이 `AI 상담` 이 덮는 구간을 다 비운다.** 안 비우면 마지막 줄은 존재하지
 *    않는 것과 같다.
 * 3. **그 여백을 상수에서 계산했다** — 숫자를 박으면 필을 옮기는 날 목록이 따라오지 않는다.
 * 4. **탭바 높이·안전영역을 다시 더하지 않았다.** 탭바는 레이아웃 공간을 차지하므로 탭
 *    화면의 바닥이 이미 탭바 위에서 끝난다. 그 항을 한 번 더 더한 것이 예전에 실제로
 *    났던 사고이고, 더해도 **화면에서만** 어긋나 어떤 타입도 깨지지 않는다.
 * 5. **여백이 `contentContainerStyle` 에 있다.** 예전에는 `ListFooterComponent` 에 있었고,
 *    다음 페이지를 불러오는 동안 그 자리가 스피너로 바뀌며 여백이 통째로 사라졌다 —
 *    `onEndReachedThreshold` 가 0.6 이라 목록 끝에서는 거의 항상 불러오는 중이라서,
 *    실제 화면에서 마지막 줄이 탭바에 잘렸다.
 *
 * ## import 와 소스 읽기를 나눠 쓰는 이유
 *
 * 좌표 상수는 이제 **순수 모듈**(`floatingAiButtonLayout.ts`, `recipeRowLayout.ts`)에 있어
 * 그대로 import 한다 — 값을 정규식으로 긁어 eval 하던 예전 방식은 상수 이름이나 선언
 * 형태가 바뀌면 검사가 스스로 죽는, 검사가 아니라 사본이었다.
 *
 * 반면 "화면이 무엇을 그리는가"(1·5번)는 `app/(tabs)/recipe.tsx` 가 tamagui·expo-router 를
 * 끌고 와 node 환경 jest 로 렌더할 수 없으므로 소스를 읽어 확인한다.
 */
import fs from "fs"
import path from "path"

import {
  FLOATING_AI_BUTTON_BOTTOM,
  FLOATING_AI_BUTTON_COVERAGE,
  FLOATING_AI_BUTTON_HEIGHT,
} from "@/src/shared/components/floatingAiButtonLayout"
import { recipeListBottomInset } from "@/src/features/recipe/components/list/recipeRowLayout"

const ROOT = path.join(__dirname, "..")

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8")
}

const SCREEN_SOURCE = read("src/features/recipe/views/RecipeHomeScreen.tsx")
const ROW_LAYOUT_SOURCE = read(
  "src/features/recipe/components/list/recipeRowLayout.ts",
)

/**
 * 주석을 걷어낸 코드.
 *
 * 이 파일은 "화면이 무엇을 그리는가" 를 소스에서 확인하는데, **주석에 적힌 낱말이
 * 검사를 통과시키거나 떨어뜨리면 안 된다.** 실제로 그랬다 — 없앤 컴포넌트를 왜
 * 없앴는지 설명하는 주석에 그 이름이 들어 있어서, 코드에는 흔적이 없는데도
 * "다시 만들지 않는다" 검사가 실패했다. 설명을 지워 검사를 통과시키는 것은 본말전도라
 * 검사 쪽이 코드만 보게 만든다.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

const SCREEN_CODE = code(SCREEN_SOURCE)

describe("레시피 목록에 떠 있는 것", () => {
  it("필이 덮는 구간은 여백 + 높이다", () => {
    expect(FLOATING_AI_BUTTON_COVERAGE).toBe(
      FLOATING_AI_BUTTON_BOTTOM + FLOATING_AI_BUTTON_HEIGHT,
    )
  })

  it("목록 바닥이 필이 덮는 구간을 다 비운다", () => {
    // 같기만 해도 "딱 붙었다" 가 통과한다. 마지막 줄과 필 사이에 눈에 보이는 틈이 있어야
    // 그 줄이 가려진 것이 아니라 끝난 것으로 읽힌다.
    expect(recipeListBottomInset(34)).toBeGreaterThan(
      FLOATING_AI_BUTTON_COVERAGE,
    )
  })

  it("그 여백을 필의 상수에서 계산한다 — 숫자를 박아 넣지 않았다", () => {
    // 하드코딩이면 필을 옮겼을 때 목록이 따라오지 않아 마지막 줄이 다시 가린다.
    expect(ROW_LAYOUT_SOURCE).toMatch(
      /export function recipeListBottomInset[\s\S]*?floatingAiButtonScrollInset/u,
    )
  })

  it("안전영역과 탭바를 함께 더한다 — 탭바가 absolute 라 상쇄되지 않는다", () => {
    /*
      2026-08-19 정정. 예전에는 "탭바가 레이아웃 공간을 차지하므로 그 항을 더하면
      안 된다" 를 지켰는데, `tabBarStyle: { position: "absolute" }` 라 그 전제가
      틀렸다. 콘텐츠가 화면 바닥까지 내려오므로 필을 피하려면 그 항을 **더해야** 한다.
    */
    const declaration =
      /export function recipeListBottomInset[\s\S]*?\n\}/u.exec(
        ROW_LAYOUT_SOURCE,
      )?.[0]
    expect(declaration).toBeDefined()
    expect(declaration).toMatch(/floatingAiButtonScrollInset/u)
  })

  it("화면이 직접 절대 위치 플로팅을 만들지 않는다", () => {
    /*
      2026-08-19 갱신. 이 화면에는 이제 작성 플로팅이 **있다** — 커뮤니티와 같은
      자리, 같은 규칙(`FloatingWriteButton`)이다. 헤더 칩만으로는 목록을 한참 내린
      뒤 작성하려면 맨 위로 돌아와야 했다.

      되돌린 것이 아니라 **자리를 옮겨 다시 세운** 것이다. 옛 `RecipeWriteFab` 은
      화면 소유의 절대 위치 요소라 스크롤 중 카드 글자를 덮었다. 지금 것은
      전역 `AI 상담` 필 위에 쌓이고, 목록 바닥이 그 둘을 다 비운다.

      그래서 검사는 "플로팅이 없다" 가 아니라 **"화면이 좌표를 직접 만들지 않는다"**
      가 된다 — 공용 컴포넌트를 쓰는 한 두 탭이 같이 움직인다.
    */
    expect(SCREEN_CODE).not.toContain("RecipeWriteFab")
    expect(SCREEN_CODE).not.toMatch(/position:\s*"absolute"/u)
    // 작성 진입점은 공용 컴포넌트로 선다.
    expect(SCREEN_CODE).toContain("FloatingWriteButton")
  })

  it("옛 플로팅 컴포넌트 파일이 남아 있지 않다", () => {
    // 파일만 남겨 두면 다음 사람이 "쓰는 데가 있겠지" 하고 되살린다.
    expect(
      fs.existsSync(
        path.join(
          ROOT,
          "src/features/recipe/components/list/RecipeWriteFab.tsx",
        ),
      ),
    ).toBe(false)
  })

  it("바닥 여백이 목록 컨테이너에 있다 — 푸터가 아니다", () => {
    // 푸터에 두면 다음 페이지를 부르는 동안 스피너로 바뀌면서 여백이 사라진다.
    expect(SCREEN_CODE).toMatch(
      /contentContainerStyle=\{\{[\s\S]*?paddingBottom:\s*recipeListBottomInset/u,
    )
    const footer = /ListFooterComponent=\{([\s\S]*?)\n\s*\/>/u.exec(
      SCREEN_CODE,
    )?.[1]
    expect(footer).toBeDefined()
    expect(footer).not.toContain("recipeListBottomInset")
  })

  it("작성 진입점이 화면에 남아 있다 — 없애 버린 것이 아니라 옮긴 것이다", () => {
    // 가림을 고친다고 기능을 지우면 안 된다. v2 작성 폼으로 가는 길이 살아 있어야 한다.
    expect(SCREEN_CODE).toContain('router.push("/(write)/recipe/new")')
  })
})
