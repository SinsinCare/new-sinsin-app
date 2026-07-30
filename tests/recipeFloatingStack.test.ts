/**
 * 레시피 목록의 두 플로팅("레시피 쓰기" + 전역 "AI 상담") 이 겹치지 않는지 산술로 고정한다.
 *
 * ## 왜 산술을 테스트하는가
 *
 * 이 겹침은 실제로 났고 눈으로만 고쳤다. 두 버튼은 **서로 다른 파일이 서로 다른
 * 좌표계에** 얹는다:
 *
 *   - `AI 상담`  : `app/(tabs)/_layout.tsx` 가 루트(화면 전체)에
 *                  `bottom = insets.bottom + TAB_BAR_HEIGHT + FLOATING_AI_BUTTON_BOTTOM`
 *   - `레시피 쓰기`: `RecipeWriteFab` 이 탭 화면 안에 `bottom = RECIPE_WRITE_FAB_BOTTOM`
 *
 * 탭바가 절대 위치가 아니라 **레이아웃 공간을 차지**하므로 탭 화면의 바닥은 탭바
 * 위에서 끝난다. 그래서 두 항(`insets.bottom + TAB_BAR_HEIGHT`)이 상쇄되고, 탭바 위를
 * 원점으로 보면 AI 필은 `16 ~ 64`, 쓰기 버튼은 `78 ~ 126` 을 쓴다.
 *
 * 이 상쇄가 눈에 보이지 않는 것이 문제다. 다음 사람이 `RECIPE_WRITE_FAB_BOTTOM` 에
 * 탭바 높이나 안전영역을 한 번 더 더하면 **화면에서만** 다시 겹치고, 어떤 테스트도
 * 깨지지 않는다. 그래서 상수 사이의 관계를 여기에 박는다.
 *
 * ## 왜 import 가 아니라 소스를 읽는가
 *
 * 두 상수는 `react-native-reanimated` 를 쓰는 컴포넌트 파일에 있어 import 하면 jest 가
 * 변환하지 못한다. 그리고 소스를 읽는 편이 **더 강하다** — 값이 맞는지만 보는 것이
 * 아니라 AI 필의 상수를 **참조해서** 계산했는지(숫자를 박아 넣지 않았는지) 본다.
 * 값만 맞으면 통과하는 검사는 `78` 을 하드코딩한 코드를 놓친다.
 */
import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..")

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8")
}

function numericConst(source: string, name: string): number {
  const match = new RegExp(`export const ${name} = (-?\\d+)`, "u").exec(source)
  if (match?.[1] === undefined) {
    throw new Error(`${name} 을 상수로 찾지 못했다`)
  }
  return Number(match[1])
}

const AI_SOURCE = read("src/shared/components/FloatingAiButton.tsx")
const FAB_SOURCE = read(
  "src/features/recipe/components/list/RecipeWriteFab.tsx",
)

const AI_BOTTOM = numericConst(AI_SOURCE, "FLOATING_AI_BUTTON_BOTTOM")
const AI_HEIGHT = numericConst(AI_SOURCE, "FLOATING_AI_BUTTON_HEIGHT")

/** 탭바 위를 원점으로 본 AI 필의 위쪽 끝. */
const AI_PILL_TOP = AI_BOTTOM + AI_HEIGHT

/** `RecipeWriteFab` 이 선언한 두 값. 표현식이라 상수 정규식으로는 못 잡는다. */
function fabBottomExpression(): string {
  const match =
    /export const RECIPE_WRITE_FAB_BOTTOM =([\s\S]*?);?\n\n/u.exec(FAB_SOURCE)
  if (match?.[1] === undefined) {
    throw new Error("RECIPE_WRITE_FAB_BOTTOM 선언을 찾지 못했다")
  }
  return match[1]
}

/**
 * 선언식의 상수 이름을 실제 값으로 바꿔 계산한다. 아는 항만 남아야 한다 — 모르는
 * 이름이 있으면 `null` 을 주고, 그 판정은 전용 테스트가 한다.
 *
 * **describe 본문에서 부르지 않는다.** 여기서 던지면 스위트 수집이 실패해
 * "Tests: 0 total" 이 되고, 어느 검사가 무엇을 잡았는지 알 수 없다(실측).
 */
function evaluateFabBottom(): number | null {
  const expression = fabBottomExpression()
    .replaceAll("FLOATING_AI_BUTTON_BOTTOM", String(AI_BOTTOM))
    .replaceAll("FLOATING_AI_BUTTON_HEIGHT", String(AI_HEIGHT))
  if (!/^[\s\d+\-*/().]+$/u.test(expression)) return null
  // eslint-disable-next-line no-eval
  return eval(expression) as number
}

describe("레시피 목록의 두 플로팅", () => {
  it("쓰기 버튼이 AI 필보다 위에서 시작한다", () => {
    expect(evaluateFabBottom()).toBeGreaterThan(AI_PILL_TOP)
  })

  it("두 버튼 사이에 눈에 보이는 간격이 있다", () => {
    // 0 보다 크기만 하면 "붙어 있다" 도 통과한다. 두 개의 떠 있는 면이 서로 다른
    // 것으로 읽히려면 간격이 필요하다.
    const fabBottom = evaluateFabBottom()
    expect(fabBottom).not.toBeNull()
    expect((fabBottom ?? 0) - AI_PILL_TOP).toBeGreaterThanOrEqual(12)
  })

  it("아는 상수만으로 계산된다 — 좌표계를 섞는 항이 없다", () => {
    // `null` 이면 AI 필 상수 말고 다른 이름이 식에 들어왔다는 뜻이고, 그건 다른
    // 좌표계의 값을 섞었다는 신호다(아래 정규식 검사가 잡지 못하는 이름도 여기서 걸린다).
    expect(evaluateFabBottom()).not.toBeNull()
  })

  it("AI 필의 상수를 참조해 계산한다 — 숫자를 박아 넣지 않았다", () => {
    // 하드코딩이면 AI 필을 옮겼을 때 쓰기 버튼이 따라오지 않아 다시 겹친다.
    const expression = fabBottomExpression()
    expect(expression).toContain("FLOATING_AI_BUTTON_BOTTOM")
    expect(expression).toContain("FLOATING_AI_BUTTON_HEIGHT")
  })

  it("목록 하단 여백이 두 버튼 전체를 비운다", () => {
    // 마지막 카드가 영구히 가리면 그 카드는 존재하지 않는 것과 같다.
    expect(FAB_SOURCE).toMatch(
      /export const RECIPE_LIST_BOTTOM_SPACER =[\s\S]*?RECIPE_WRITE_FAB_BOTTOM/u,
    )
  })

  it("탭바 높이나 안전영역을 다시 더하지 않았다 — 상쇄되는 항이다", () => {
    // 이것이 실제로 났던 실수다. 두 항을 한 번 더 더하면 화면에서만 겹친다.
    const expression = fabBottomExpression()
    expect(expression).not.toMatch(/TAB_BAR_HEIGHT|insets|safeArea/iu)
  })
})
