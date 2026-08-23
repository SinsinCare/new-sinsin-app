import { over } from "../design-system-v2/tokens/blend"
import { semanticDark, semanticLight } from "../design-system-v2/tokens/colors"
import { getSurfaceLayers } from "../design-system-v2/tokens/layers"

/*
  면(회색)은 **사다리에서 집는다.** 예전에는 이 파일이 `over(...)` 로 몇 개를 다시
  계산했고, 그래서 같은 단의 식이 두 곳에 살았다(`cardBgDark`). 값은 그대로고 출처만
  하나가 됐다 — 정본은 `design-system-v2/tokens/layers.ts`.
*/
const LIGHT_PLANES = getSurfaceLayers(false).planes
const DARK_LAYERS = getSurfaceLayers(true)
const DARK_PLANES = DARK_LAYERS.planes

/**
 * tamagui `createTokens` 를 대신하는 최소 구현 (2026-08-19).
 *
 * ■ 왜 직접 만드나
 *
 *   `createTokens` 가 실제로 하는 일은 각 값을 `{ key, name, val }` 로 감싸는 것뿐이다.
 *   이 레포는 그중 `.val` 만 쓴다 — 실측 435곳 중 **429곳이 `tokens.color.xxx.val`**.
 *   그 래퍼 하나 때문에 87파일이 tamagui 에 묶여 있었다.
 *
 * ■ 왜 `.val` 을 그대로 두나
 *
 *   87파일에서 `.val` 을 떼는 편이 깔끔해 보이지만, 그건 **이 커밋에서 할 일이 아니다.**
 *   계보를 옮기는 것과 호출 표기를 바꾸는 것을 한 번에 하면 무엇이 깨졌는지 못 찾는다.
 *   지금은 값이 한 톨도 바뀌지 않는 것이 중요하고, 표기 정리는 나중에 별도로 한다.
 *
 * ■ 계약
 *
 *   `tests/themeTokensContract.test.ts` 가 교체 전후로 같은 것을 검사한다 —
 *   `.val` 이 원래 리터럴과 같은지, 빠진 키가 없는지, 스케일이 숫자인지.
 */
type Token<T> = { key: string; name: string; val: T }

function wrap<T, S extends Record<string, T>>(
  group: string,
  scale: S,
): { [K in keyof S]: Token<S[K]> } {
  const out = {} as { [K in keyof S]: Token<S[K]> }
  for (const [name, val] of Object.entries(scale)) {
    out[name as keyof S] = {
      key: `$${group}.${name}`,
      name,
      val,
    } as Token<S[keyof S]>
  }
  return out
}

/**
 * `createTokens` 와 같은 모양으로 감싸 준다.
 *
 * 원본은 `{ color, space, size, radius, zIndex }` 를 받아 각 스케일을 감싼다.
 * 여기서도 같은 키만 다룬다 — 이 레포가 그 다섯만 쓴다.
 */
function createTokens<
  T extends Record<string, Record<string, string | number>>,
>(input: T): { [G in keyof T]: { [K in keyof T[G]]: Token<T[G][K]> } } {
  const out = {} as {
    [G in keyof T]: { [K in keyof T[G]]: Token<T[G][K]> }
  }
  for (const [group, scale] of Object.entries(input)) {
    out[group as keyof T] = wrap(group, scale) as never
  }
  return out
}

export const tokens = createTokens({
  color: {
    // Base
    black: "#0D0D0D",
    white: "#F4F4F4",
    offWhite: "#FCFCFC",
    pureWhite: "#FFFFFF",

    // 브랜드 프라이머리. 2026-07 확정값 — 초록 계열에서 이 코랄로 바뀌었다.
    // 화면에서 "브랜드 색"이 필요하면 이걸 쓴다. primary1~9 는 그 주변 스케일이고,
    // primaryAccent(#FF7246)는 이 값과 사실상 같으니 새로 쓰지 말 것.
    primary: "#FE7139",

    // Primary (coral/red)
    primary1: "#FFF5ED",
    primary2: "#FFE2CB",
    primary3: "#F9CFAD",
    primary4: "#F1A89B",
    primary5: "#E78D7C",
    primary6: "#E77661",
    primary7: "#EE6145",
    primary8: "#F24D2D",
    primary9: "#F82F08",
    primaryAccent: "#FF7246",

    // Sub — 브랜드 인터랙션 색(선택·활성·CTA).
    // 2026-07 브랜드가 초록에서 #FE7139 로 바뀌면서 이 스케일도 옮겼다.
    // sub6~8 은 앱 전반에서 isSelected/agreed/canAdd 상태색으로 쓰이고 있었고
    // 그게 곧 브랜드 역할이라, 초록으로 두면 화면 대부분이 구 브랜드로 남는다.
    sub1: "#FFF3EC",
    sub2: "#FFE3D3",
    sub3: "#FFCDB2",
    sub4: "#FFAE85",
    sub5: "#FE8F5C",
    sub6: "#FE7139",
    sub7: "#F05F27",
    sub8: "#DC4F1B",
    sub9: "#C24312",

    // Safe — "안전/양호" 의미색. 브랜드 색이 아니다.
    // 구 sub(teal/green)을 그대로 옮겼다. 안전 배지를 주황으로 바꾸면
    // 이 앱에서 주황은 제한·주의라 정반대 신호가 된다.
    safe1: "#E0FFF7",
    safe2: "#C7FFF1",
    safe3: "#A3F0DE",
    safe4: "#7FE6CC",
    safe5: "#5BC5AB",
    safe6: "#44AF94",
    safe7: "#1D9A7A",
    safe8: "#0D896A",
    safe9: "#028A67",

    // ── 아래 시맨틱 키들은 v2 시맨틱에서 파생한다 (2026-08-17).
    //    예전에는 여기에 손으로 고른 값이 있었고, 같은 역할을 surface 계보·v2 와
    //    다른 색으로 그렸다(본문 잉크 3벌, 구분선 3벌, 위험 4벌).
    //    **새 값을 여기 적지 말 것** — 필요한 색이 v2 에 없으면 토큰을 먼저 정한다.
    //    합성(over)은 알파 토큰을 불투명 문자열로 바꿔야 하는 자리에만 쓴다.

    // App screen background
    /**
     * 라이트 화면 바닥. 카드가 얹히는 회색 면.
     *
     * **`background.lower`(#f7f7f7)였다.** 그 값은 흰 카드와 ΔL* 2.77 뿐이라 바닥이
     * 사실상 안 보였고, 더 나쁜 것은 **한 탭 안에 바닥이 둘**이었다는 것이다 —
     * 홈 탭 껍데기는 여기(#f7f7f7), 그 안의 기록 화면(`RecordView`)은
     * `surface.surface`(#f4f4f5)를 깔았다. 같은 화면에서 두 회색이 만난다.
     *
     * 이제 둘 다 사다리의 **`bed` 한 단**을 본다(ΔL* 7.25 · 다크의 84%).
     * 값을 여기 다시 적지 않는 이유가 그것이다 — 사본을 만들면 다음에 한쪽만 고쳐진다.
     * 근거와 계산은 `design-system-v2/tokens/layers.ts` 의 `well`/`bed` 단 주석.
     *
     * `background.lower` 자체는 **안 건드렸다.** 그건 식당 상세의 시안 실측
     * rgb(247,247,247)이고 섹션 띠(사다리의 `band` 단)가 그 값을 쓴다.
     */
    appBg: LIGHT_PLANES.bed,
    appBgDark: DARK_PLANES.bed,
    /*
      다크 카드. 예전엔 `over(fill.normal, background.default)` 라고 **여기서 다시
      계산**했다 — 사다리의 `content` 단과 같은 식을 두 곳이 각자 들고 있던 것이다.
      값은 그대로(`#313135`)고, 계산이 한 곳으로 접혔다(2026-08-22).
    */
    cardBgDark: DARK_PLANES.content,
    /**
     * 다크 입력 면. 카드보다 한 단계 가라앉은 우물이라 `fill.background` 표식을
     * 다크의 기준면(= 바닥) 위에 얹은 값이다(`#2f3033`).
     */
    inputBgDark: DARK_LAYERS.on("background", "bed"),
    borderDark: over(semanticDark.line.normal, semanticDark.background.default),
    textDark: semanticDark.label.normal,
    textDarkSub: over(
      semanticDark.label.neutral,
      semanticDark.background.default,
    ),

    // Light mode semantic
    textLight: semanticLight.label.normal,
    textLightSub: over(
      semanticLight.label.assistive,
      semanticLight.background.default,
    ),
    textLightMuted: over(
      semanticLight.label.neutral,
      semanticLight.background.default,
    ),
    borderLight: over(
      semanticLight.line.normal,
      semanticLight.background.default,
    ),

    // Restriction level badge
    restrictionBg: over(
      semanticLight.accentForeground.redWeak,
      semanticLight.background.default,
    ),
    restrictionText: semanticLight.status.negative,

    // Error / validation
    error: semanticLight.status.negative,

    // Hydration
    waterPercentBg: "#D2DFE3",
    waterPercentBgDark: "#46616A",
    waterFillTop: "#6BDAFE",
    waterFillBottom: "#30C1F0",

    // Greyscale
    grey1: "#171717",
    grey2: "#252525",
    grey3: "#333333",
    grey4: "#525252",
    grey5: "#757575",
    grey6: "#999999",
    grey7: "#B3B3B3",
    grey8: "#EDEDED",

    // UI element backgrounds
    deleteBg: "#D9D9DF",
  },

  space: {
    0: 0,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    4.5: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16,
    "-1": -4,
    "-2": -8,
    "-3": -12,
    "-4": -16,
  },

  size: {
    0: 0,
    1: 8,
    2: 16,
    3: 24,
    4: 32,
    5: 40,
    6: 48,
    7: 56,
    8: 64,
    9: 72,
    10: 80,
    11: 96,
    12: 120,
    true: 44,
  },

  radius: {
    0: 0,
    1: 2,
    2: 4,
    3: 6,
    4: 8,
    5: 10,
    6: 12,
    7: 14,
    8: 16,
    9: 20,
    10: 24,
    12: 999,
    // 시스템 기본 라디우스 = 16. 디자인 확정값이라 bare `radius` 도 16 이 되게 한다.
    true: 16,
  },

  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
})
