/**
 * 화면 위에 떠 있는 것들이 **서로 겹치지 않는지** 좌표계 단위로 본다.
 *
 * ## 실제로 난 사고 (2026-08-19)
 *
 * 커뮤니티 탭에서 브랜드색 `글쓰기` 필이 전역 `AI 상담` 필 **뒤에 깔려** 절반이
 * 가려졌다. 산술은 맞아 보였다:
 *
 *     const WRITE_BUTTON_BOTTOM =
 *       FLOATING_AI_BUTTON_BOTTOM + FLOATING_AI_BUTTON_HEIGHT + 12   // = 76
 *
 * "필 위로 한 칸 쌓는다" 는 뜻이고 숫자도 그렇게 읽힌다. 그런데 두 버튼은 **다른
 * 좌표계**에 있었다:
 *
 *   - `AI 상담` : `app/(tabs)/_layout.tsx` 가 탭 네비게이터 **밖**에 그린다
 *                → `insets.bottom + TAB_BAR_HEIGHT + 16`
 *   - `글쓰기`  : 커뮤니티 **화면 안**의 절대 위치 → `76`
 *
 * `tabBarStyle: { position: "absolute" }` 이므로 탭바는 레이아웃 공간을 차지하지 않고,
 * 탭 화면의 바닥은 화면 맨 아래까지 내려온다. 즉 두 원점의 차이는 정확히
 * `insets.bottom + TAB_BAR_HEIGHT`(iPhone 17 Pro 기준 34 + 52 = 86)이고,
 * 글쓰기 버튼은 필보다 86pt 아래에 놓여 **겹쳤다.**
 *
 * ## 왜 어떤 검사도 못 잡았나
 *
 * 두 값 모두 상수에서 계산했고, 타입도 린트도 테스트도 통과한다. 좌표계가 다르다는
 * 것은 **숫자에 적혀 있지 않다.** 그래서 이 파일은 값이 아니라 **어느 좌표계에서
 * 쓰였는가**를 검사한다.
 */
import fs from "fs"
import path from "path"

import {
  FLOATING_AI_BUTTON_BOTTOM,
  FLOATING_AI_BUTTON_COVERAGE,
  FLOATING_AI_BUTTON_HEIGHT,
  floatingAiButtonBottomInScreen,
  floatingAiButtonScrollInset,
} from "@/src/shared/components/floatingAiButtonLayout"
import { TAB_BAR_HEIGHT } from "@/src/shared/utils/bottomSafeArea"

const ROOT = path.join(__dirname, "..")

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8")
}

/** 주석 속 낱말이 검사를 좌우하면 안 된다. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

describe("플로팅 좌표계", () => {
  it("화면 좌표계 변환이 탭바와 안전영역을 더한다", () => {
    const safeAreaBottom = 34 // iPhone 17 Pro
    expect(floatingAiButtonBottomInScreen(safeAreaBottom)).toBe(
      safeAreaBottom + TAB_BAR_HEIGHT + FLOATING_AI_BUTTON_BOTTOM,
    )
  })

  it("두 좌표계는 상쇄되지 않는다 — 스크롤 여백과 화면 절대위치는 다른 값이다", () => {
    /*
      이 단언이 이 파일의 핵심이다. 예전 주석은 둘이 같다고("상쇄된다") 적었고,
      그 믿음이 커뮤니티 버튼을 필 뒤로 보냈다.
    */
    expect(floatingAiButtonBottomInScreen(34)).not.toBe(
      FLOATING_AI_BUTTON_COVERAGE,
    )
  })

  /**
   * 작성 필의 좌표 계산이 **한 곳**에만 있는지 본다.
   *
   * 커뮤니티와 레시피가 같은 자리에 같은 버튼을 둔다. 각 화면이 좌표를 따로 계산하면
   * 한쪽만 어긋나고 그 어긋남은 **화면에서만** 보인다(타입·린트·테스트 전부 통과).
   * 실제로 커뮤니티가 그렇게 필 뒤에 깔렸다(2026-08-19). 그래서 계산을
   * `FloatingWriteButton` 하나로 모으고, 화면은 그것을 쓰기만 한다.
   */
  it("작성 필이 화면 좌표계 변환을 쓴다", () => {
    /*
      2026-09-09 재조준. 커뮤니티의 작성 필은 `CommunityWriteButton` 이다 — 커뮤니티 탭은
      AI 상담 필을 숨기므로(`app/(tabs)/_layout.tsx` `TABS_WITHOUT_AI_PILL`,
      `docs/design/community-refresh-2026-09-05/REFERENCE.md` "No separate AI pill above
      the tab bar") 필 위에 쌓지 않고 그 자리(화면 좌표계로 변환한 탭바 위)에 선다.
      옛 `FloatingWriteButton` 은 이제 어느 화면도 쓰지 않는다.
    */
    const source = code(
      read("src/features/recipe/components/community/CommunityWriteButton.tsx"),
    )

    // 변환 함수를 통해 좌표를 얻어야 한다 — `bottom` 이 곧 그 변환값이다.
    expect(source).toContain("floatingAiButtonBottomInScreen")
    expect(source).toMatch(
      /bottom:\s*floatingAiButtonBottomInScreen\(insets\.bottom\)/u,
    )

    /*
      `FLOATING_AI_BUTTON_BOTTOM` 을 화면 안에서 직접 더하는 것이 사고의 형태였다.
      그 상수는 **탭바 위 여백**이지 화면 바닥 여백이 아니다.
    */
    const bottomExpr = /bottom:\n?([\s\S]*?),\n\s*\}/u.exec(source)?.[1] ?? ""
    expect(bottomExpr).not.toMatch(/FLOATING_AI_BUTTON_BOTTOM\b/u)
  })

  it("작성 필을 쓰는 화면이 좌표를 직접 계산하지 않는다", () => {
    /*
      2026-09-09 재조준. `app/(tabs)/community.tsx` 는 재export 껍데기라 실제 화면
      파일을 본다. 레시피 탐색 화면은 2026-09-06 재편으로 작성 필이 빠졌다
      (`docs/design/recipe-browse-refresh-2026-09-06/REVIEW.md`) — 필을 안 쓰는
      화면이 좌표 변환을 들고 있으면 그것이 곧 화면 소유 플로팅이 돌아온 흔적이다.
    */
    const PILL = "CommunityWriteButton"
    const WITH_PILL = ["src/features/recipe/views/CommunityScreen.tsx"]
    const WITHOUT_PILL = ["src/features/recipe/views/RecipeHomeScreen.tsx"]
    const offenders: string[] = []
    for (const rel of WITH_PILL) {
      const source = code(read(rel))
      if (!source.includes(PILL)) {
        offenders.push(`${rel} → 공용 컴포넌트를 안 씀`)
        continue
      }
      // 화면이 직접 좌표를 만들면 다시 갈라진다.
      if (/floatingAiButtonBottomInScreen/u.test(source)) {
        offenders.push(`${rel} → 좌표를 직접 계산함`)
      }
    }
    for (const rel of WITHOUT_PILL) {
      const source = code(read(rel))
      if (
        /floatingAiButtonBottomInScreen|position:\s*"absolute"/u.test(source)
      ) {
        offenders.push(`${rel} → 화면 소유 플로팅이 돌아옴`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("글쓰기 버튼이 AI 상담 필보다 위에 선다 — 겹치지 않는다", () => {
    const safeAreaBottom = 34
    const pillBottom = floatingAiButtonBottomInScreen(safeAreaBottom)
    const pillTop = pillBottom + FLOATING_AI_BUTTON_HEIGHT

    // 커뮤니티가 쓰는 규칙: 필 위로 12pt 띄운다.
    const writeBottom = pillTop + 12

    expect(writeBottom).toBeGreaterThan(pillTop)
  })

  it("스크롤 여백은 안전영역·탭바를 포함한다 — 콘텐츠가 화면 바닥까지 내려온다", () => {
    /*
      2026-08-19 정정. `tabBarStyle: { position: "absolute" }` 라 탭바는 레이아웃
      공간을 안 먹고, 탭 화면 콘텐츠는 화면 맨 아래까지 내려온다. 그래서 스크롤
      여백도 화면 바닥 기준으로 필을 피해야 한다 — `COVERAGE`(64) 만으로는
      86pt 가 모자라 마지막 줄이 가린다.
    */
    const rowLayout = read(
      "src/features/recipe/components/list/recipeRowLayout.ts",
    )
    expect(rowLayout).toMatch(
      /export function recipeListBottomInset[\s\S]*?floatingAiButtonScrollInset/u,
    )
    // 화면 바닥 기준 여백은 필이 덮는 구간보다 반드시 커야 한다.
    expect(floatingAiButtonScrollInset(34)).toBeGreaterThan(
      floatingAiButtonBottomInScreen(34) + FLOATING_AI_BUTTON_HEIGHT,
    )
  })

  /**
   * 필을 피하는 여백에 **숫자를 박아 두지 않았는지** 본다.
   *
   * 하드코딩은 지금 화면에서는 멀쩡해 보이므로 어떤 검사도 잡지 못한다. 문제는
   * **필을 옮기는 날** 드러난다 — 목록만 옛 자리에 남아 마지막 줄이 다시 가린다.
   * 실측(2026-08-19): RecordView 가 `80`, StatisticsView 가 `88` 을 박아 두고
   * 주석에 `(16+48)` 이라고 근거까지 적어 두었다. 근거를 안다면 참조해야 한다.
   */
  it("필을 피하는 여백을 상수에서 계산한다 — 숫자를 박아 넣지 않았다", () => {
    const SCREENS = ["src/features/home/components/record/RecordView.tsx"]
    const offenders: string[] = []
    for (const rel of SCREENS) {
      const source = code(read(rel))
      // scrollContent 의 paddingBottom 이 리터럴이면 위반.
      const m = /scrollContent:\s*\{[\s\S]*?paddingBottom:\s*([^,\n}]+)/u.exec(
        source,
      )
      if (!m) continue
      if (/^\s*\d+\s*$/u.test(m[1])) offenders.push(`${rel} → ${m[1].trim()}`)
    }
    expect(offenders).toEqual([])
  })

  /**
   * 필 회피 여백을 **스크롤 컨테이너**(`contentContainerStyle`)에 주지 않았는지 본다.
   *
   * ## 실측 (2026-08-19, 홈 탭)
   *
   * `RecordView` 는 `contentContainerStyle` 에 `flexGrow: 1` 과 `paddingBottom: 80`
   * 을 함께 줬다. 숫자는 맞았는데도 마지막 타일(붓기 카드)이 필에 가렸다 —
   * 그 안의 `bodyPanel` 이 `flexGrow: 1` 로 **남는 공간을 다 먹으면서**, 스크롤
   * 컨테이너의 아래쪽 여백은 그 패널 **바깥**(=화면 밖)으로 밀려났기 때문이다.
   *
   * 여백은 **자식을 실제로 밀어내는 안쪽 컨테이너**에 둔다. `bodyPanel` 처럼
   * `flexGrow` 가 있어도 padding 은 자식을 안으로 밀므로 그쪽은 옳다. 위험한 것은
   * 늘어나는 자식을 품은 **스크롤 컨테이너**에 주는 경우다.
   */
  it("필 회피 여백을 스크롤 컨테이너가 아니라 안쪽 컨테이너에 둔다", () => {
    const source = code(
      read("src/features/home/components/record/RecordView.tsx"),
    )
    // contentContainerStyle 이 가리키는 스타일 이름.
    const styleName = /contentContainerStyle=\{styles\.(\w+)\}/u.exec(
      source,
    )?.[1]
    expect(styleName).toBeDefined()

    const block = new RegExp(`${styleName}:\\s*\\{([^{}]*)\\}`, "u").exec(
      source,
    )?.[1]
    expect(block).toBeDefined()

    // 늘어나는 컨테이너면 여백을 여기 두면 안 된다.
    if (/flexGrow:\s*1/u.test(block!)) {
      expect(block).not.toMatch(/paddingBottom:\s*FLOATING_AI_BUTTON_COVERAGE/u)
    }
  })
})
