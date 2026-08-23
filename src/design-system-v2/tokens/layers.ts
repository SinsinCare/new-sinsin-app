// Design System v2 — 면의 사다리(층)
//
// ─────────────────────────────────────────────────────────────────────────────
// ■ 왜 이 파일이 생겼나 (2026-08-22)
//
// 라이트에서 실제로 칠해지는 불투명 회색을 전수로 세면 **열 개**다. 그중 넷이 명도
// 1.0 안에 겹쳐 있었고, 다크는 일곱 개인데 네 토큰이 한 값으로 접힌다. "다크는
// 자연스러운데 라이트만 어색하다" 의 출처가 취향이 아니라 이 숫자라는 것이
// `tests/lightContrastAudit.test.ts` §10 의 결론이다.
//
// 그 뒤 §10 은 "정본은 넷" 이라고 **결론**만 적어 뒀다. 나머지 여섯은 "층이 아니라
// 층 안의 표시" 로 분류돼 있었는데, 분류는 문서에만 있고 **코드에는 없었다.**
// 그래서 새 화면이 회색이 필요하면 여전히 골라야 했고, 고르면 열한 번째가 됐다.
//
// 여기서 하는 일은 하나다: **그 열 개 전부에 이름을 준다.** 이름이 없는 회색이
// 남지 않으면 새 화면은 고를 것이 없고, 사다리에서 **집을** 뿐이다.
//
// ■ 재편이지 재도색이 아니다
//
// 이 파일은 **한 가지 색도 새로 만들지 않는다.** 아래 모든 값은 v2 시맨틱에서
// 계산된 것이고, 계산식은 `theme/surface.ts` 의 `derive()` 가 이미 쓰던 그것이다.
// 옮긴 것은 값이 아니라 **값이 사는 자리**다 — 어댑터(`theme/surface.ts`)가 팔레트를
// 만들면서 층을 같이 정하던 것을, 층은 여기서 정하고 어댑터는 이름만 붙이게 했다.
// 대조는 `tests/surfaceLadderGuard.test.ts` §L2(사다리 이전 값 스냅숏).
//
// ■ 이름이 `elevation` 이 아닌 이유
//
// 그 이름은 이 저장소에서 **그림자**가 이미 쓴다(`tokens/elevation.ts`). Material 의
// `surface-container` 계열을 그대로 베끼지 않는 이유도 같다 — 남의 체계 이름이 붙으면
// 남의 규칙(고도 = 그림자, 단이 다섯)까지 따라온 줄 안다. 이 앱은 보더리스·그림자
// 거의 없음이고, 층은 **면의 명도**로만 말한다. 그래서 어법은 이 저장소 것을 쓴다:
// `bed` · `well` · `band` 는 `theme/surface.ts` 가 이미 쓰던 말이다.
//
// ─────────────────────────────────────────────────────────────────────────────
// ■ 사다리 — 면(plane) 여섯 + 표시(mark) 넷
//
// **면**은 컨테이너가 직접 칠하는 불투명 값이다. **표시**는 알파라 어느 면 위에도
// 앉는다 — 면이 아니라 층 **안**의 칠이고, 그래서 값이 아니라 `on(mark, plane)` 로
// 말한다. 이 구분이 사다리의 뼈대다. 표시를 면으로 굳히면(우물처럼 불투명 값으로)
// 그 표시는 다른 바닥 위에서 통째로 사라진다.
//
//   면 (planes)                    라이트          다크
//   ─────────────────────────────────────────────────────────────────────────
//   content   콘텐츠 면            #ffffff 100.00  #313135 20.47
//             (카드 · 전폭 블록 · 고정 헤더 · 한 장짜리 화면의 바닥)
//   band      화면을 가르는 띠      #f7f7f7  97.23  #313135 20.47
//             (섹션 사이 굵은 여백 · 말풍선)
//   wellShallow 얕은 우물          #f8f8f8  97.58  #39393e 24.14
//             (같은 화면에 우물이 둘일 때 위쪽)
//   bed       화면 바닥            #eaeaec  92.75  #1f1f21 11.83
//             (카드가 얹히는 면)
//   well      우물                 #eaeaec  92.75  #3f3f45 26.85
//             (콘텐츠 면보다 한 겹 더 파인 면 · 비활성 CTA)
//   pressed   눌림                 #e0e1e3  89.51  #4a4a51 31.69
//             (층이라기보다 층의 **상태**지만 실제로 칠해지므로 센다)
//
//   표시 (marks — `fill.*` 알파. `on()` 으로 면 위에 얹은 값을 얻는다)
//   ─────────────────────────────────────────────────────────────────────────
//   control      컨트롤면          칩 · 검색 · 입력. "지금 조작할 수 있는 것"
//   normal       장식 표식          스켈레톤 · 사진 자리 · 진행 트랙 · 태그 배지
//   background   중립 블록          시안이 `#f9fafb` 로 실측한 면(검진·의사연결·식당)
//   alternative  옅은 표식          대댓글 면 · 영양 타일. `normal` 보다 한 겹 옅다
//
// ■ 라이트와 다크는 **같은 사다리**를 타되 단의 값이 다르다
//
// 그리고 **다크에서 여러 단이 같은 값으로 겹치는 것은 결함이 아니라 의도**다.
// 아래가 그 전부이고, 각각 왜 겹치는지가 붙어 있다(`aliases` 로 코드에도 남긴다):
//
//   다크: content = band = on(normal, bed) = on(control, bed) = #313135
//     `background.lower` 는 다크에서 "바닥에 fill.normal 한 겹" 과 **정확히 같은 값**
//     이다(팔레트가 자기 자신과 맞물려 있다). 그래서 카드 · 띠 · 장식 표식 · 컨트롤이
//     한 면으로 모인다. 다크는 바닥이 어두워서 한 겹만으로 이미 ΔL* 8.63 이 나오므로
//     이 넷을 갈라 놓을 이유가 없었다 — 사용자가 "자연스럽다" 고 한 화면이 이것이다.
//   다크: well = on(control, content) = #3f3f45
//     우물은 콘텐츠 면 위의 컨트롤과 같은 깊이다. 라이트에서 이 둘이 갈라진 것이
//     오히려 예외다(아래).
//   라이트: bed = well = ctaOffBg = #eaeaec
//     라이트는 **카드가 바닥과 같은 흰색**이라는 예외를 갖는다("회색 바닥 위 흰 카드").
//     그래서 화면 바닥이 한 겹 아래 우물로 내려가고, 우물이 곧 바닥이 된다.
//     ⚠ 이 겹침은 함정이기도 하다 — 우물을 바닥으로 깐 화면 위에 우물을 쓰는 컨트롤을
//     놓으면 컨트롤이 사라진다. 가드는 `lightContrastAudit` §9.
//   라이트: wellShallow = on(alternative, content) = #f8f8f8
//     얕은 우물의 **정의**가 그것이다(`over(fill.alternative, content)`).
//
// ■ §10 의 "정본 넷" 과의 관계
//
// §10 은 화면이 **고르는** 면이 넷(바닥 · 콘텐츠 · 컨트롤 · 눌림)이라고 못 박았다.
// 그 넷은 이 사다리 안에 그대로 있다 — `bed` · `content` · `on(control, content)` ·
// `pressed`. 사다리는 그 넷을 부정하지 않고, **나머지 여섯에도 이름을 준 것**이다.
// 화면이 무엇을 고르는가는 여전히 §10 이고, 규칙 전문은
// `features/recipe/components/community/SectionHeader.tsx` 머리말 §층의 정본.
//
// ⚠ **여기에 새 리터럴 hex 를 적지 마라.** 사다리에 없는 회색이 필요하면 그건 단이
// 없는 것이고, 단을 먼저 정해야 한다. 단을 늘리면
// `tests/surfaceLadderGuard.test.ts` 가 개수와 값 양쪽에서 빨개진다.

import { over } from "./blend"
import { semanticDark, semanticLight, type SemanticColorSet } from "./colors"

/** 면 — 컨테이너가 직접 칠하는 **불투명** 값. 역할과 실측은 머리말 표. */
export interface SurfacePlanes {
  /**
   * **콘텐츠 면.** 카드 · 전폭 블록 · 고정 헤더 · 한 장짜리 화면의 바닥.
   * 라이트 `#ffffff`(L* 100.00) · 다크 `#313135`(20.47).
   *
   * 라이트에서 이 값이 `background.default` 와 같은 것은 우연이 아니라 **예외**다 —
   * 이 앱의 라이트는 "회색 바닥 위 흰 카드" 이고, 카드를 한 겹 더 올리면 흰 카드가
   * 회색이 되어 층이 뒤집힌다.
   */
  content: string
  /**
   * **화면을 가르는 띠.** 섹션 사이의 굵은 여백, 그리고 말풍선 면.
   * 라이트 `#f7f7f7`(97.23) · 다크 `#313135`(20.47 — `content` 와 겹친다).
   *
   * ⚠ 라이트 값은 **식당 상세 시안 실측**이라 못 움직인다. 그래서 이 단은 "값을
   * 사다리에 맞추는" 쪽이 아니라 **사다리가 그 값을 한 단으로 받아들이는** 쪽으로
   * 편입했다 — 예외로 빼지 않은 이유는 실제로 컨테이너가 칠하는 불투명 면이고
   * (`SectionBand` 의 띠 · `ChatMessageBubble` 의 말풍선), 그러면 정의상 면이기
   * 때문이다. **바닥으로는 쓸 수 없다**(`lightContrastAudit` §10 — 흰 블록과
   * ΔL* 2.77 뿐이라 "블록이 떠 있다" 가 성립하지 않는다).
   */
  band: string
  /**
   * **얕은 우물.** 같은 화면에 우물이 둘일 때 위쪽 — 예: 레시피 작성의 `+` 추가 줄
   * (`well`)과 그 아래 설명 입력(여기). 같은 값을 쓰면 두 블록이 한 덩어리로 붙는다.
   * 라이트 `#f8f8f8`(97.58) · 다크 `#39393e`(24.14).
   */
  wellShallow: string
  /**
   * **화면 바닥.** 카드가 얹히는 면. 라이트 `#eaeaec`(92.75) · 다크 `#1f1f21`(11.83).
   * 콘텐츠 면과 ΔL* **7.25**(라이트) / **8.63**(다크).
   *
   * ⚠ **`isDark` 로 고르지 않는다.** 규칙은 "카드가 아닌 쪽" 이다 — 라이트는 카드가
   * 기준면(흰색)과 같은 예외라 바닥이 한 겹 아래 우물이고, 다크는 카드가 이미 한 겹
   * 위라 바닥이 곧 기준면이다. 그 예외를 다시 쓰는 대신 **예외로부터 계산**한다.
   */
  bed: string
  /**
   * **우물.** 콘텐츠 면보다 한 겹 더 파인/뜬 면(입력칸·칩·비활성 CTA).
   * 라이트 `#eaeaec`(92.75 — `bed` 와 겹친다) · 다크 `#3f3f45`(26.85).
   *
   * ■ 왜 `over(fill.normal, content)` 가 아니라 **기준면에서 두 겹**인가 (2026-08-21)
   *
   * 저 식은 두 모드에서 **다른 깊이**를 냈다. 다크의 콘텐츠 면은 이미 한 겹이라
   * 우물이 기준면에서 두 겹인데, 라이트의 콘텐츠 면은 기준면(흰색)과 같아서 우물이
   * **한 겹**뿐이다. 그 한 겹이 흰색 근처에서는 거의 아무것도 아니다 — 바꾸기 전 실측:
   *
   *   라이트  바닥 `#f4f4f5` ↔ 카드 `#ffffff`  **ΔL* 3.79** (대비 1.10)
   *   다크    바닥 `#1f1f21` ↔ 카드 `#313135`  **ΔL* 8.63** (대비 1.27)
   *
   * 그래서 라이트에서는 고정 헤더(흰색)와 글 카드(흰색)가 같은 평면으로 보이고,
   * 카드 사이 10pt 틈과 좌우 20pt 인셋에 깔린 바닥이 눈에 안 잡혀서, **바닥이 그대로
   * 드러나는 유일한 구역**(스토리 레일)만 구멍처럼 읽혔다(2026-08-21 사용자 지적).
   *
   * 회색을 새로 고르지 않고 규칙을 **두 모드가 같게** 만들었다 — 우물은 언제나
   * 기준면에서 `fill.normal` **두 겹**이다. 다크는 콘텐츠 면이 이미 한 겹이라 결과가
   * 한 바이트도 안 바뀌고(`#3f3f45`), 라이트만 `#f4f4f5` → `#eaeaec` 로 내려가
   * **ΔL* 7.25**(다크의 84%)가 된다. 계산은 `lightContrastAudit` §6.
   *
   * ⚠ **컨트롤면(`on("control", ...)`)과 같은 값으로 맞추려 들지 마라.** 우물은
   * 불투명 면이고 컨트롤면은 어느 면 위에도 앉는 알파이며, 컨트롤면은 자기 라벨
   * (`label.neutral`)이 4.5:1 을 지켜야 해서 천장이 더 낮다(라이트 5.25 vs 7.25).
   * 근거는 `tokens/colors.ts` 의 `fill.control` 머리말 표.
   */
  well: string
  /**
   * **눌림.** 층이라기보다 층의 **상태**지만 실제로 칠해지므로 사다리에 센다.
   * 라이트 `#e0e1e3`(89.51) · 다크 `#4a4a51`(31.69).
   *
   * 두 모드 모두 **바닥에서 멀어지는 쪽**이 위층이고 눌림도 같은 방향으로 읽힌다.
   * (v2 의 `fill.pressed` 는 두 모드 다 어두워지는 값이라 다크에서 방향이 뒤집힌다.)
   */
  pressed: string
}

/** 표시(마크) 이름 — `fill.*` 의 칸 이름을 그대로 쓴다. 그것이 이 저장소의 어법이다. */
export type MarkName = "control" | "normal" | "background" | "alternative"

export interface SurfaceLayers {
  planes: SurfacePlanes
  /** 표시. 값은 알파일 수 있다 — 면으로 굳히지 말고 `on()` 으로 얹어라. */
  marks: Pick<SemanticColorSet["fill"], MarkName>
  /** 표시를 면 위에 얹은 **실제로 칠해지는** 값. */
  on: (mark: MarkName, plane: keyof SurfacePlanes) => string
  /**
   * **기준면**(`background.default`)이 사다리의 어느 단인가. 라이트는 `content`
   * (흰 페이지), 다크는 `bed`(앱 바닥)다. 모드마다 다른 단이므로 이름으로 들고 있다 —
   * `isDark` 를 다시 묻는 자리를 늘리지 않으려는 것이다.
   */
  basePlane: keyof SurfacePlanes
}

/**
 * v2 시맨틱 한 벌에서 사다리를 만든다. 라이트·다크가 **같은 규칙**을 탄다 —
 * 모드마다 다른 규칙을 쓰면 그게 곧 다음 드리프트의 씨앗이다.
 *
 * 판단이 들어간 자리는 `content` 한 줄뿐이고, 그 예외의 근거는 위 `content` 단 주석이다.
 */
function buildLayers(v2: SemanticColorSet, isDark: boolean): SurfaceLayers {
  const { fill, background } = v2

  /** 합성의 기준면(`background.default`). 라이트에선 `content`, 다크에선 `bed` 다. */
  const base = background.default

  // 라이트만 예외로 콘텐츠 면이 기준면과 같다(머리말 §content).
  const content = isDark ? over(fill.normal, base) : base
  /*
    우물은 **두 모드 모두** 기준면에서 `fill.normal` 두 겹이다. 이 "두 겹" 이
    2026-08-21 에 라이트 바닥을 3.79 → 7.25 로 내린 그 규칙이고, 다크는 결과가
    한 바이트도 안 바뀐다(전문은 위 `well` 단 주석).
  */
  const well = over(fill.normal, over(fill.normal, base))
  /*
    화면 바닥 = **카드가 아닌 쪽.** 라이트는 `content === base`(흰 카드가 예외)라
    우물이 바닥이 되고, 다크는 콘텐츠 면이 이미 한 겹 위라 기준면이 바닥이다.
    `isDark` 를 다시 묻지 않는 이유: 그 분기는 위 `content` 한 줄에만 살아야 한다.
  */
  const bed = content === base ? well : base

  const planes: SurfacePlanes = {
    content,
    band: background.lower,
    wellShallow: over(fill.alternative, content),
    bed,
    well,
    pressed: over(fill.normal, well),
  }

  const marks = {
    control: fill.control,
    normal: fill.normal,
    background: fill.background,
    alternative: fill.alternative,
  }

  return {
    planes,
    marks,
    on: (mark, plane) => over(marks[mark], planes[plane]),
    basePlane: content === base ? "content" : "bed",
  }
}

const LIGHT_LAYERS = buildLayers(semanticLight, false)
const DARK_LAYERS = buildLayers(semanticDark, true)

export function getSurfaceLayers(isDark: boolean): SurfaceLayers {
  return isDark ? DARK_LAYERS : LIGHT_LAYERS
}

/**
 * **한 모드에서 사다리가 만드는 회색 전부.** 밝은 쪽부터.
 *
 * 가드(`tests/surfaceLadderGuard.test.ts`)가 이 목록과 `lightContrastAudit` §10 이
 * 세는 목록이 **같은 집합**인지 본다 — 즉 "이름 없는 회색이 하나도 없다".
 * 화면이 새 회색을 만들면 §10 의 개수가 어긋나고, 사다리에 단을 몰래 늘리면
 * 여기가 어긋난다. 두 방향 다 막혀야 "고를 수 없다" 가 성립한다.
 */
export function ladderGreys(isDark: boolean): string[] {
  const { planes, on, basePlane } = getSurfaceLayers(isDark)
  const values = [
    ...Object.values(planes),
    /*
      표시는 **어느 면 위에 앉느냐**로 값이 갈린다. 여기서 세는 조합은
      `lightContrastAudit` §10 이 세던 그것과 같다:

        - 표시 넷은 **기준면** 위에서 — 라이트는 흰 콘텐츠 면, 다크는 앱 바닥.
          그 면이 각 모드에서 "그 화면의 기본 면" 이고, §10 이 `canvas` 라고 부르던 것이다.
        - 컨트롤만 **바닥·띠 위에서도** 센다. 칩 레일이 실제로 셋 다 지나기 때문이다
          (흰 고정 헤더 → 회색 바닥 → 띠).

      다른 면 위의 표시는 또 다른 값이 되지만 **이름 없는 회색은 아니다** —
      `on(mark, plane)` 이 언제나 그 값을 말한다. 여기서 세는 것은 "화면이 실제로
      마주치는 회색" 의 집합이고, 그 집합이 §10 과 같아야 "이름 없는 회색이 없다" 가
      성립한다.
    */
    on("control", basePlane),
    on("normal", basePlane),
    on("background", basePlane),
    on("alternative", basePlane),
    on("control", "bed"),
    on("control", "band"),
  ]
  return [...new Set(values)]
}
