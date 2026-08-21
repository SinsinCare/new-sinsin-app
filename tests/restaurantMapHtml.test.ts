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
  MAP_MARKER_FILL,
  MAP_MARKER_RING,
  MAP_MARKER_SHADOW,
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

  /**
   * **마커는 도넛이다 — 시안 실측 (2026-08-20)**
   *
   * 시안 원본 SVG 는 마커마다 원 두 개를 겹쳐 그린다:
   *   `circle r=10 fill=#F9FAFB` + `circle r=8 stroke=#FE7139 stroke-width=4`.
   * 3배 렌더 타일에서 잰 값도 같다 — 바깥 60px · 링 띠 12px · 안쪽 36px
   * (A3_1 의 마커 5개, A3_2, A4_1 전부 동일) → 3으로 나눠 20 / 4 / 12.
   *
   * 종전 기대값(링 3px)이 정본이 아닌 이유는 그 값이 시안에 없기 때문이다. 반대로
   * '브랜드 채움 + 밝은 테두리' 도 시안의 마커가 아니다 — 그건 같은 SVG 에서
   * `circle r=8.25 fill=#FE7139 stroke=#F9FAFB` 로 그려지는 **내 위치 점**이다.
   */
  it("기본 마커가 시안 치수(20 / 링 4)와 밝은 원판을 쓴다", () => {
    expect(MAP_MARKER_SIZE).toBe(20)
    expect(MAP_MARKER_RING).toBe(4)

    /* 원판 색은 **여기서만** 고정된다.

       아래 CSS 단언(`background: ${MAP_MARKER_FILL}`)은 프로덕션 CSS 가 보간하는 것과
       같은 상수를 기대값으로 쓰므로 값이 무엇이든 참인 항진명제다 — 그것만으로는 원판을
       #fff 로 되돌려도 초록이다. 치수(20/4)는 리터럴로 박혀 있는데 색만 안 박혀 있던 것이
       이 it 의 구멍이었다.

       값은 시안 SVG 의 안쪽 원(#F9FAFB)이고 그것이 곧 grayscale.50 이다. 두 줄을 함께
       두는 이유: 토큰 대조는 '리터럴로 되돌아가는 것'을, 리터럴 못은 '토큰 팔레트가
       조용히 바뀌는 것'을 각각 잡는다. */
    expect(MAP_MARKER_FILL).toBe(primitives.grayscale[50])
    expect(MAP_MARKER_FILL.toUpperCase()).toBe("#F9FAFB")

    const ring = cssRule(html(), ".mk .ring")
    expect(ring).toContain(`width: ${MAP_MARKER_SIZE}px`)
    expect(ring).toContain(`height: ${MAP_MARKER_SIZE}px`)
    // 앵커(1×1)의 원점이 좌표다. 원판은 그 점을 중심으로 놓여야 한다.
    expect(ring).toContain(`left: ${-MAP_MARKER_SIZE / 2}px`)
    expect(ring).toContain(`top: ${-MAP_MARKER_SIZE / 2}px`)
    // 링은 상자 안쪽으로 그린다 — border-box 가 아니면 바깥 지름이 28 이 된다.
    expect(ring).toContain("box-sizing: border-box")
    expect(ring).toMatch(
      new RegExp(`border:\\s*${MAP_MARKER_RING}px solid #FE7139`, "i"),
    )
    expect(ring).toContain(`background: ${MAP_MARKER_FILL}`)
    // 시안 필터: offset 0 · stdDeviation 1(= CSS 2px) · label.alternative 색.
    expect(MAP_MARKER_SHADOW).toBe("0 0 2px rgba(55,56,60,0.51)")
    expect(ring).toContain(`box-shadow: ${MAP_MARKER_SHADOW}`)

    /* 라벨 크기는 시안과 이미 같다(13/600). 못을 박아 두는 이유는 이 값이 **비례로
       추정하면 틀리기 때문**이다 — 한글 잉크는 약 0.87em 이라, 3배 타일에서 잰 잉크
       34px 를 다른 텍스트와 견주다 보면 15px 로 읽히기 쉽다. 실제 Pretendard SemiBold
       를 3배로 렌더하면 12px→32 · 13px→34 · 14px→38 · 15px→40 이라 13px 이 정답이다.
       라벨 위치(top:13px)도 마찬가지로 맞다: 시안은 좌표에서 잉크 윗변까지 44.5px(3배),
       이 CSS 는 45.5px 로 1 device px 차이다. */
    const name = cssRule(html(), ".mk .name")
    expect(name).toContain("font-size: 13px")
    expect(name).toContain("font-weight: 600")
    expect(name).toContain("top: 13px")
  })

  /**
   * **선택은 채움의 반전으로 말한다 — 그 반전이 성립하려면 기본이 채움이 아니어야 한다.**
   *
   * 링을 4px 로 두껍게 하면서 채움/링을 뒤집고 싶은 유혹이 있는데(브랜드 채움 + 흰
   * 테두리), 그러면 기본 마커가 선택 마커와 같은 모습이 되어 **선택이 사라진다.**
   * 남는 신호는 말풍선 하나뿐인데 말풍선은 겹침 판정에 밀리고 화면 밖으로도 나간다.
   *
   * 그래서 두 상태가 정확히 서로의 반전인지 — 같은 두 색을 채움/테두리에서 맞바꾸는지 —
   * 를 고정한다. 색 이름을 바꾸는 것은 되지만 둘이 같아지는 것은 안 된다.
   */
  it("선택 마커는 기본 마커의 정확한 반전이라 구분이 사라지지 않는다", () => {
    const source = html()
    const base = cssRule(source, ".mk .ring")
    const selected = cssRule(source, ".mk.sel .ring")

    // 기본: 밝은 채움 + 브랜드 테두리.
    expect(base).toContain(`background: ${MAP_MARKER_FILL}`)
    expect(base).toMatch(/border:\s*\d+px solid #FE7139/i)
    // 선택: 브랜드 채움 + 밝은 테두리. 두 값이 정확히 맞바뀐다.
    expect(selected).toMatch(/background:\s*#FE7139/i)
    expect(selected).toContain(`border-color: ${MAP_MARKER_FILL}`)
    // 같은 채움이 되면(= 반전이 사라지면) 선택은 눈에 보이지 않는다.
    expect(selected).not.toContain(`background: ${MAP_MARKER_FILL}`)
    // 깊이도 한 단 다르다 — 기본은 시안의 평평한 2px 헤일로, 선택은 아래로 진 그림자.
    expect(selected).not.toContain(MAP_MARKER_SHADOW)
    // 링 자체는 남는다. 지우면 말풍선 꼬리가 아무것도 없는 자리를 가리킨다(2026-07-31).
    expect(selected).not.toContain("display: none")
    expect(cssRule(source, ".mk.sel .name")).toContain("display: none")
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
