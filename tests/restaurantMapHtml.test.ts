/**
 * `buildMapHtml()` 이 만든 스크립트를 **실제로 파싱해 본다.**
 *
 * ## 왜 이 테스트가 필요한가 — 지도가 회색이던 진짜 이유
 *
 * `mapHtml.ts` 는 파일 전체가 하나의 **템플릿 리터럴**이다. 즉 이 모듈이 하는 일은
 * "또 다른 프로그램을 문자열로 만들어 내는 것" 이고, **`tsc` 는 그 안쪽 프로그램을 보지
 * 않는다.** 타입스크립트에게 그것은 그냥 문자열이라 언제나 문법적으로 완벽하다.
 *
 * 그 사각지대에서 2026-07-31 에 지도가 죽어 있었다. 진단용 코드 세 줄이 이랬다:
 *
 *     '\nlevel ' + map.getLevel() +
 *
 * 템플릿 리터럴 안이므로 타입스크립트가 `\n` 을 **진짜 줄바꿈으로 먼저 해석**했고,
 * 생성된 JS 에는 홑따옴표 문자열 한가운데에 줄바꿈이 들어갔다 — `SyntaxError`.
 * 그래서 스크립트의 IIFE 가 **한 줄도 실행되지 않았다.** 결과가 특히 나빴던 이유:
 *
 * - `post('error')` 도 못 나간다 → RN 의 `onMapError` 가 안 불린다
 * - 12초 마감 시한도 안 걸린다 → 타임아웃 폴백도 없다
 * - 화면은 리스트 모드로도 못 내려간다 → **회색 사각형이 영원히 남는다**
 * - `<div id="dbg">booting…</div>` 은 정적 HTML 이라 그대로 보인다 →
 *   "아직 부팅 중" 으로 읽혀서 원인을 찾는 사람을 반대 방향으로 보낸다
 *
 * 즉 이 기능의 다른 사고와 정확히 같은 모양이다: **컴파일은 깨끗한데 화면이 죽는다.**
 * 그래서 같은 방식으로 못을 박는다 — 문자열이 담고 있는 프로그램을 테스트가 직접 파싱한다.
 *
 * `new Function(script)` 은 **파싱만** 한다(호출하지 않는다). 그래서 `window`·`kakao` 같은
 * 브라우저 전역이 없어도 되고, 잡고 싶은 것은 실행 결과가 아니라 문법 오류다.
 */

import { primitives } from "@/src/design-system-v2/tokens/colors"
import {
  MAP_BUBBLE_OFFSET,
  MAP_LABEL_TOP,
  MAP_MARKER_SELECTED_SIZE,
  MAP_NODE_PALETTE,
  MAP_MARKER_RING,
  MAP_MARKER_SIZE,
  buildMapHtml,
} from "@/src/features/restaurant/map/mapHtml"

/** 실제 호출부와 같은 모양의 입력. 키는 아무 문자열이어도 문법에는 영향이 없다. */
function html(): string {
  return buildMapHtml({
    jsKey: "test-js-key",
    center: { lat: 37.4979, lng: 127.0276 },
    level: 4,
  })
}

/**
 * 생성된 `<style>` 에서 규칙 하나를 통째로 꺼낸다.
 * 시각 계약을 `toContain` 한 줄로 확인하면 다른 규칙에 같은 문자열이 있을 때 통과해
 * 버린다 — 예컨대 `.mk .ring` 과 `.mk.sel .ring` 은 같은 속성을 반대로 쓴다.
 */
function cssRule(source: string, selector: string): string {
  const at = source.indexOf(`\n  ${selector} {`)
  if (at === -1) throw new Error(`CSS 규칙을 찾을 수 없습니다: ${selector}`)
  const end = source.indexOf("}", at)
  if (end === -1) throw new Error(`닫히지 않은 CSS 규칙입니다: ${selector}`)
  return source.slice(at, end + 1)
}

/** `<script>` 안쪽만 꺼낸다. 바깥 HTML 은 JS 로 파싱할 수 없다. */
function scriptOf(source: string): string {
  const match = source.match(/<script>([\s\S]*?)<\/script>/)
  if (!match) throw new Error("생성된 HTML 에 <script> 블록이 없습니다")
  return match[1]
}

describe("buildMapHtml", () => {
  /**
   * **이 파일에서 가장 중요한 한 줄.** 실패하면 지도는 회색이고, 에러 이벤트조차 없어서
   * 앱은 그 사실을 알 방법이 없다.
   */
  it("생성된 스크립트가 문법적으로 올바른 JS 다", () => {
    const script = scriptOf(html())
    let syntaxError: string | null = null
    try {
      // 파싱만 한다 — 실행하지 않는다.
      new Function(script)
    } catch (error) {
      syntaxError =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error)
    }
    expect(
      syntaxError === null
        ? "생성된 스크립트 파싱 OK"
        : `생성된 스크립트가 파싱되지 않습니다 — 지도가 회색으로 남고 error 이벤트도 안 나갑니다. ${syntaxError}`,
    ).toBe("생성된 스크립트 파싱 OK")
  })

  /*
   * 위 테스트가 정말 이 사고를 잡는지 증명한다. 장치가 실패할 수 있다는 것을 보이지 않으면
   * 초록색은 아무 뜻이 없다 — 그게 이 기능이 "만들어졌지만 동작하지 않는" 상태로 오래
   * 남았던 이유다. 사고를 그대로 재현해 넣어 본다.
   */
  it("템플릿 리터럴에서 이스케이프가 풀린 줄바꿈을 잡아낸다", () => {
    // 타입스크립트가 `\n` 을 먼저 먹었을 때 생성되는 것과 같은 문자열.
    const broken = "var s = 'a\nb';"
    expect(() => new Function(broken)).toThrow()
    // 제대로 이스케이프됐다면 문제없다.
    expect(() => new Function("var s = 'a\\nb';")).not.toThrow()
  })

  /*
   * 백틱도 같은 이유로 이 파일에 들어가면 안 된다 — 템플릿을 그 자리에서 끊어 버려서
   * **번들 전체가** SyntaxError 가 되고, 그때는 앱의 어떤 탭도 반응하지 않는다
   * (실제로 한 번 그렇게 죽었고, 화면이 흰 배경 + 개발 메뉴 톱니바퀴만 남았다).
   * 그건 `tsc` 가 잡아 주므로 여기서는 생성 결과가 온전한지만 확인한다.
   */
  it("HTML 이 온전히 닫혀 있다", () => {
    const source = html()
    expect(source).toContain('<div id="map">')
    expect(source.match(/<script>/g)?.length).toBe(1)
    expect(source.match(/<\/script>/g)?.length).toBe(1)
    expect(source.trimEnd().endsWith("</html>")).toBe(true)
  })

  /*
   * 배치 패스(겹침 순서·히트 크기·라벨 충돌)와 최초 뷰포트 통지가 **연결되어 있는지**만 본다.
   *
   * 이 셋은 실패해도 예외가 나지 않는다는 공통점이 있다 — 호출부가 사라지면 지도는
   * 멀쩡히 뜨고 마커도 그려지며, 다만 라벨이 다시 뭉치고, 겹친 마커가 임의로 눌리고,
   * 첫 화면이 영원히 빈다. 셋 다 화면을 눈으로 보기 전에는 모른다. 그래서 파싱 테스트와
   * 같은 이유로 여기에 못을 박는다: 조용히 사라지는 것을 조용히 두지 않는다.
   *
   * 기하 계산 자체를 단언하지는 않는다. 그러려면 카카오 projection 과 DOM 을 흉내 내야
   * 하고, 그 흉내가 실제와 어긋나면 초록불이 거짓말을 한다. 여기서 지키는 것은 배선이다.
   */
  it("배치 패스와 최초 뷰포트 통지가 배선되어 있다", () => {
    const script = scriptOf(html())
    // 라벨 충돌 판정이 존재하고, 배치 패스가 그것을 부른다.
    expect(script).toContain("function applyLabelCollision(")
    expect(script).toContain("applyLabelCollision(live)")
    // 배치 패스가 마커 재생성·선택 변경·지도 정지 세 곳에서 모두 돈다.
    expect(script).toContain("function applyScreenLayout(")
    expect(
      (script.match(/applyScreenLayout\(\)/g) ?? []).length,
    ).toBeGreaterThanOrEqual(3)
    // 히트 영역을 실제로 다시 그린다(상수만 남고 적용이 빠지는 회귀를 막는다).
    expect(script).toContain("hit.style.width")
    // 카카오 idle 은 변화가 있을 때만 온다 — 크기 확정 시점에 직접 올려야 첫 화면이 채워진다.
    expect(script).toContain("function postIdle(")
    /* 크기 확정 함수 **안에서** 불려야 한다. 파일 어딘가에 있기만 한 것으로는 부족하다 —
       원래의 결함이 정확히 "함수는 있는데 첫 화면에서 아무도 안 부른다" 였다. */
    const sizedFn = script.split("function relayoutIfSized")[1] ?? ""
    expect(sizedFn.slice(0, 900)).toContain("postIdle()")
  })

  /**
   * **중간 카메라 상태를 RN 에 올리지 않는다.**
   *
   * 카카오는 카메라 변경마다 idle 을 낸다. 줌과 이동을 함께 주는 명령은 그래서 idle 을
   * 두 번 내고, 그 사이 상태는 새 배율 + 옛 중심이라 화면 어디에도 없는 자리다. RN 이
   * 그것을 먼저 받으면 자동 재검색 예약을 **엉뚱한 bbox** 가 소비하고, 남은 진짜 idle 은
   * 예약이 없어 사용자 팬으로 읽혀 재검색 버튼이 뜬다. 둘 다 화면을 보기 전에는 모른다.
   */
  it("연달아 오는 idle 을 모아 마지막 하나만 올린다", () => {
    const script = scriptOf(html())
    // 실제 통지는 타이머 뒤에 도는 함수가 한다.
    expect(script).toContain("function postIdleNow(")
    expect(script).toContain("post('idle'")
    // 진입점은 타이머를 다시 건다(앞선 예약은 버린다).
    const entry =
      script.split("function postIdle(")[1]?.split("function postIdleNow")[0] ??
      ""
    expect(entry).toContain("clearTimeout(idleTimer)")
    expect(entry).toContain("postIdleNow()")
    // 진입점 자체는 통지하지 않는다 — 여기서 바로 올리면 모으는 의미가 없다.
    expect(entry).not.toContain("post('idle'")
  })

  /**
   * **카메라 명령은 한 번에 하나만 움직인다.**
   *
   * 카카오는 줌 애니메이션이 도는 동안 들어온 `panTo` 를 **통째로 버린다**(실 SDK A/B:
   * `animate:true` 뒤의 panTo 는 오차 −818px, `animate:false` 뒤는 0). 그래서 확대량과
   * 위치를 따로 주는 두 경로 — 클러스터 파고들기(`setLevel` → `focusMarker`)와
   * 줌을 지정한 `moveTo` — 는 줌을 **즉시** 확정해야 뒤따르는 이동이 살아남는다.
   * `anchor` 도 같은 부류다: 목표를 화면 픽셀에 고정할 뿐 중앙에 놓지 않으므로,
   * 축소하면 오히려 목표에서 멀어졌다가 panTo 로 되돌아온다(카메라가 두 번 움직인다).
   *
   * 둘 다 화면을 눈으로 보기 전에는 모른다. 그래서 여기에 못을 박는다.
   */
  it("줌은 애니메이션 없이 확정하고 anchor 를 쓰지 않는다", () => {
    const script = scriptOf(html())
    // setLevel 호출은 전부 animate:false 로 나간다(주석이 아니라 호출부만 본다).
    const calls = script.match(/map\.setLevel\([^;]*/g) ?? []
    expect(calls.length).toBeGreaterThanOrEqual(2)
    for (const call of calls) {
      expect(call).toContain("animate: false")
      expect(call).not.toContain("anchor")
    }
  })

  /**
   * **핀치는 탭이 아니다.**
   *
   * 종전 판정은 첫 손가락의 이동만 봤다. 핀치는 보통 한 손가락을 거의 고정한 채 벌리므로
   * 8px 문턱을 못 넘고 그대로 탭으로 발화했다 — 배경에서는 선택이 풀리고 마커 위에서는
   * 엉뚱한 가게가 열렸다. 그리고 카카오는 핀치에 `dragstart` 를 내지 않으므로, RN 이
   * "사용자가 카메라를 가져갔다" 를 못 알아채 시트가 안 접히고 늦게 온 GPS 가 카메라를
   * 빼앗았다. 두 줄이 한 쌍이라 하나만 남으면 절반이 재발한다.
   */
  it("멀티터치는 탭으로 세지 않고 dragStart 를 올린다", () => {
    const script = scriptOf(html())
    expect(script).toContain("moved = e.touches.length > 1")
    expect(script).toContain("if (e.touches.length > 1) moved = true")
    expect(script).toContain("if (e.touches.length > 1) post('dragStart', {})")
    /* zoom_start 로 대신하면 안 된다 — 앱이 부른 setLevel(클러스터 파고들기 직후)에서도
       울려서 스스로 예약한 재검색을 지운다. */
    expect(script).not.toContain("'zoom_start'")
  })

  it("식기 아이콘 노드가 좌표 중심에 놓이고 별도 터치 영역을 유지한다", () => {
    expect(MAP_MARKER_SIZE).toBe(28)
    expect(MAP_NODE_PALETTE.light.fill).toBe(MAP_NODE_PALETTE.dark.fill)
    const source = html()
    const ring = cssRule(source, ".mk .ring")
    expect(ring).toContain(`left: ${-MAP_MARKER_SIZE / 2}px`)
    expect(ring).toContain(`top: ${-MAP_MARKER_SIZE / 2}px`)
    expect(ring).toContain(`width: ${MAP_MARKER_SIZE}px`)
    expect(ring).toContain(`height: ${MAP_MARKER_SIZE}px`)
    expect(ring).toContain("box-sizing: border-box")
    expect(ring).toContain(
      `border: ${MAP_MARKER_RING}px solid var(--map-node-border, ${MAP_NODE_PALETTE.light.border})`,
    )
    expect(ring).toContain(
      `box-shadow: var(--map-node-shadow, ${MAP_NODE_PALETTE.light.shadow})`,
    )
    expect(cssRule(source, ".mk .hit")).toContain("width: 44px")
    expect(cssRule(source, ".mk .name, .map-label .name")).toContain(
      `top: ${MAP_LABEL_TOP}px`,
    )
    expect(cssRule(source, ".mk .bubble")).toContain(
      `top: -${MAP_BUBBLE_OFFSET}px`,
    )
  })

  it("선택은 크기·형태·외곽선으로 구분하고 좌표를 유지한다", () => {
    const source = html()
    const selected = cssRule(source, ".mk.sel .ring")
    expect(MAP_MARKER_SELECTED_SIZE).toBeGreaterThan(MAP_MARKER_SIZE)
    expect(selected).toContain(`left: ${-MAP_MARKER_SELECTED_SIZE / 2}px`)
    expect(selected).toContain(`top: ${-MAP_MARKER_SELECTED_SIZE / 2}px`)
    expect(selected).toContain(`width: ${MAP_MARKER_SELECTED_SIZE}px`)
    expect(selected).toContain("border-radius: 10px")
    expect(selected).toContain(`border: 2px solid ${primitives.grayscale[50]}`)
    expect(selected).not.toContain("display: none")
    expect(cssRule(source, ".mk.sel .name")).toContain("opacity: 0")
    expect(cssRule(source, ".mk .bubble")).toContain("pointer-events: none")
  })

  /**
   * 사람이 읽는 문자열을 스크립트에 박지 않는다는 규칙(파일 헤더 5번)을 고정한다.
   * 접근성 라벨은 `setStrings` 로 받는다 — WebView 라서 `t()` 를 못 쓰는 것이
   * 한국어를 박아도 된다는 뜻은 아니다.
   */
  it("생성된 스크립트에 하드코딩된 한글이 없다", () => {
    const script = scriptOf(html())
    const korean = script.match(/[가-힣]+/g) ?? []
    // 주석의 한국어는 설명이므로 허용한다. 문자열 리터럴 안의 한글만 문제다.
    const inStringLiteral = script
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .filter((line) => /'[^']*[가-힣][^']*'|"[^"]*[가-힣][^"]*"/.test(line))
    expect(
      inStringLiteral.length === 0
        ? "하드코딩된 한글 없음"
        : `문자열 리터럴에 한글이 있습니다: ${inStringLiteral.join(" / ")}`,
    ).toBe("하드코딩된 한글 없음")
    expect(korean.length).toBeGreaterThanOrEqual(0) // 주석 한글은 세지 않는다
  })
})
