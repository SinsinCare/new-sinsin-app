// Design System v2 — Color tokens
// Source of truth: Figma "Design-system_Mobile" (file Q3y0QyN5alY662w2qqmmcD)
//   Style Guide 페이지 node-id=20-2 — Base 21:21106 / Semantic 21:21965.
//   2026-08-17 에 원시 110 · 시맨틱 39 전수 대조함. 대조 절차와 남은 결정은
//   docs/design/2026-08-17-design-consistency-plan.md §1-B.
// NOTE: Figma의 label 'nomal' 오타는 여기서 'normal'로 정정.
//
// ■ label 사다리의 아래 두 단은 **글자로 쓸 수 없다** (2026-08-21 실측)
//   라이트에서 재면(WCAG, 흰 면 위):
//     normal 14.1 · strong 21.0 · neutral 5.2 · alternative 2.8 · assistive 1.7 · disable 1.3
//   본문 기준 4.5:1 을 넘는 것은 `neutral` 까지다. `alternative` 는 **큰 글자 기준(3:1)에도
//   못 미치고**, `assistive` 는 어떤 면 위에서도 1.7 이라 사실상 안 보인다.
//   흰색 근처에서는 같은 알파 스텝이 훨씬 작은 명도차를 만든다. **면도 그랬다** —
//   라이트의 바닥↔카드가 ΔL* 3.8, 다크는 8.6 으로 두 배 넘게 벌어져 있었다.
//   면 쪽은 2026-08-21 에 고쳤다(라이트 7.25 · 다크의 84%). 다만 **이 표를 바꿔서가
//   아니다** — `theme/surface.ts` 가 우물을 두 모드 모두 `fill.normal` 두 겹으로 세게
//   했을 뿐이다. 여기 라이트 값은 식당 상세·커뮤니티 시안 실측에 묶여 있어 못 움직인다
//   (`restaurantDetailDensity` 등 다섯 오라클). 계산은 `lightContrastAudit` §6.
//   같은 날 **칩·검색 필드의 면**은 값을 바꾸는 대신 칸을 갈라서 내려갔다 —
//   `fill.control`(그 칸 머리말 참고, `lightContrastAudit` §7). 기존 값은 안 움직였다.
//   다크에서 같은 사다리를 바닥(#1f1f21) 위에서 재면
//     normal 15.8 · neutral 5.8 · alternative 3.0 · assistive 3.6 로 **본문이 살아 있다.**
//     그래서 문제는 라이트 쪽이다 — 사다리가 잘못된 게 아니라 흰 바닥이 압축한다.
//     (다크가 이 숫자를 유지하는지는 `semanticDark.label` 머리말과 그 회귀 가드 참고.)
//   ⇒ **읽혀야 하는 글자의 바닥은 `neutral`.** 아래 두 단은 장식·비활성 전용이다.
//   ⇒ 값을 여기서 올리지 않는 이유: alternative 146곳 · assistive 93곳이 이 표를 본다.
//     고칠 것은 값이 아니라 **부르는 쪽의 토큰 선택**이다. 계산은
//     `tests/lightContrastAudit.test.ts` 가 못 박는다.
// ■ 면(회색)의 **층**은 여기가 아니라 `tokens/layers.ts` 가 정한다 (2026-08-22)
//   이 표는 값의 정본이고, 그 값들이 **몇 층인가**는 사다리가 정본이다. 두 질문을
//   한 파일에 두면 "이 회색을 써도 되나" 를 물어볼 곳이 없어진다 — 실제로 그래서
//   라이트 회색이 열 개까지 늘었다(`lightContrastAudit` §10). 새 면이 필요하면
//   여기 값을 늘리기 전에 사다리에 단이 있는지 먼저 본다.
//
// 시맨틱 → 원시 팔레트 alias: 원시색과 hex가 정확히 일치하는 값만 primitives 참조(트레이스 주석 //#hex),
//   알파 합성값 등 대응 원시색이 없는 것은 리터럴 유지.

/** 원시 색상 팔레트 (mode 무관) */
export const primitives = {
  common: {
    "0": "#ffffff",
    "100": "#000000",
  },
  grayscale: {
    "50": "#f9fafb",
    "100": "#f2f4f6",
    "200": "#e5e8eb",
    "300": "#d1d6db",
    "400": "#b0b8c1",
    "500": "#8b95a1",
    "600": "#6b7684",
    "700": "#4e5968",
    "800": "#333d4b",
    "900": "#2a2a37",
  },
  red: {
    "50": "#feecec",
    "100": "#fed5d5",
    "200": "#ffb5b5",
    "300": "#ff8c8c",
    "400": "#ff6363",
    "500": "#ff4242",
    "600": "#e52222",
    "700": "#b00c0c",
    "800": "#730303",
    "900": "#3b0101",
  },
  lightOrange: {
    "50": "#fffcf7",
    "100": "#fef4e6",
    "200": "#fee6c6",
    "300": "#ffd49c",
    "400": "#ffc06e",
    "500": "#ffa938",
    "600": "#ff9200",
    "700": "#9c5800",
    "800": "#663a00",
    "900": "#361e00",
  },
  yellow: {
    "50": "#fffefc",
    "100": "#fffcf3",
    "200": "#fff8e3",
    "300": "#fff3cd",
    "400": "#ffecb1",
    "500": "#ffd967",
    "600": "#ffcd38",
    "700": "#a77d00",
    "800": "#503c00",
    "900": "#332600",
  },
  pink: {
    "50": "#fefcfe",
    "100": "#fcf3f9",
    "200": "#f7e5f2",
    "300": "#f2d1e9",
    "400": "#eab6dc",
    "500": "#e197cd",
    "600": "#d671bb",
    "700": "#c934a6",
    "800": "#73215d",
    "900": "#280b20",
  },
  blue: {
    "50": "#fbfeff",
    "100": "#f0fafd",
    "200": "#dcf3fb",
    "300": "#c1eaf8",
    "400": "#9fdef4",
    "500": "#74d0ef",
    "600": "#42bfe9",
    "700": "#19a4d2",
    "800": "#0e5c77",
    "900": "#073240",
  },
  orange: {
    "50": "#fffdfc",
    "100": "#fff6f3",
    "200": "#ffebe3",
    "300": "#ffdbce",
    "400": "#ffc7b2",
    "500": "#feaf90",
    "600": "#fe9267",
    "700": "#fe7139",
    "800": "#a63001",
    "900": "#511300",
  },
  green: {
    "50": "#f0faf6",
    "100": "#aeefd5",
    "200": "#76e4b8",
    "300": "#3fd599",
    "400": "#15c47e",
    "500": "#03b26c",
    "600": "#02a262",
    "700": "#029359",
    "800": "#028450",
    "900": "#027648",
  },
  navy: {
    "50": "#fafbfe",
    "100": "#e9effb",
    "200": "#cedcf5",
    "300": "#a8c0ed",
    "400": "#779de3",
    "500": "#3c72d7",
    "600": "#204c9e",
    "700": "#102449",
    "800": "#071022",
    "900": "#020408",
  },
  /*
    알파 사다리는 **반올림이 위로**다 — `Math.round(percent * 255)`.
    10% 25.5→1a · 30% 76.5→4d · 50% 127.5→80 · **70% 178.5→b3** · **90% 229.5→e6**.
    `700`·`900` 이 `b2`/`e5`(내림)로 되돌아간 적이 있는데, 그러면 이 둘만 사다리에서
    혼자 다른 규칙을 쓰게 된다. 눈에는 1/255 라 안 보이지만 시안 실측과 합성이 어긋난다 —
    식당 칩 글자 rgb(105,106,109)를 재현하는 것은 `b3` 뿐이다
    (`tests/restaurantDetailDensity.test.ts`, 같은 70% 를 쓰는 `semanticLight.label.neutral`).
  */
  opacityWhite: {
    "100": "#ffffff1a",
    "200": "#ffffff33",
    "300": "#ffffff4d",
    "400": "#ffffff66",
    "500": "#ffffff80",
    "600": "#ffffff99",
    "700": "#ffffffb3",
    "800": "#ffffffcc",
    "900": "#ffffffe6",
  },
  opacityBlack: {
    "100": "#0000001a",
    "200": "#00000033",
    "300": "#0000004d",
    "400": "#00000066",
    "500": "#00000080",
    "600": "#00000099",
    "700": "#000000b3",
    "800": "#000000cc",
    "900": "#000000e6",
  },
} as const

export type SemanticColorSet = {
  primary: {
    primary: string
    primaryWeak: string
    sub: string
    subWeak: string
  }
  label: {
    normal: string
    strong: string
    neutral: string
    alternative: string
    assistive: string
    disable: string
  }
  background: { default: string; lower: string; dim: string; floated: string }
  line: { normal: string; neutral: string; alternative: string; strong: string }
  fill: {
    normal: string
    /** 컨트롤 전용 면. `normal` 과 값이 같아지는 날이 와도 **합치지 마라**(각 모드 주석). */
    control: string
    background: string
    alternative: string
    pressed: string
  }
  status: { positive: string; cautionary: string; negative: string }
  static: { white: string; black: string; whiteWeak: string }
  accentForeground: {
    red: string
    redXweak: string
    redWeak: string
    orange: string
    orangeWeak: string
    yellow: string
    yellowWeak: string
    pink: string
    pinkWeak: string
    blue: string
    blueWeak: string
    green: string
    greenWeak: string
  }
}

/** 시맨틱 — Light 모드 */
export const semanticLight: SemanticColorSet = {
  primary: {
    primary: primitives.orange[700], // #fe7139
    primaryWeak: "#fff4f099",
    sub: primitives.navy[700], // #102449
    subWeak: "#10244929",
  },
  label: {
    normal: primitives.grayscale[900], // #2a2a37
    strong: primitives.common[100], // #000000
    /*
      알파는 `b3`(70.2%)이지 `b2` 가 아니다 — **시안 실측이 그렇게 판정한다.**
      식당 상세의 요리종류 칩은 Figma 에서 면 rgb(244,244,245) · 글자 rgb(105,106,109)
      으로 재어져 있고(`tests/restaurantDetailDensity.test.ts`), 그 글자색을 재현하는
      알파는 `b3` 하나뿐이다: b2 → #6a6a6e · b3 → #696a6d · b4 → #68696c.
      1/255 차라 눈에는 안 보이지만, 실측을 정본으로 두기로 한 이상 계산이 맞아야 한다.
    */
    neutral: "#2e2f33b3",
    alternative: "#37383c82",
    assistive: "#37383c47",
    disable: "#37383c29",
  },
  background: {
    default: primitives.common[0], // #ffffff
    lower: "#f7f7f7",
    dim: "#17171933",
    floated: primitives.common[0], // #ffffff
  },
  line: {
    normal: "#70737c38",
    neutral: "#70737c29",
    alternative: "#70737c14",
    strong: "#70737c85",
  },
  fill: {
    normal: "#70737c14",
    /*
      **컨트롤면** — 미선택 칩·검색 필드처럼 "지금 조작할 수 있는 것" 으로 알아봐야 하는 면.

      ⚠ `fill.normal` 과 **뜻이 겹치는 토큰이 아니다. 합치지 마라.**
      `fill.normal` 이 두 가지 일을 겸하고 있었다 — 스켈레톤·사진 자리·진행 트랙·태그
      배지 같은 **장식면**과, 미선택 칩·검색 필드 같은 **컨트롤면**. 두 요구는 정반대다:
      장식은 안 튀어야 하고 컨트롤은 보여야 한다. 한 토큰이 둘 다 만족할 수 없어서
      역할을 갈랐다(2026-08-21). 값이 아니라 **역할**이 이 칸의 존재 이유다.

      ■ 값은 손으로 고르지 않았다 — **천장에 부딪힌 값**이다

      처음 잡은 목표는 앞 작업(우물)과 같은 방식이었다: 흰 면 위 ΔL* 가 다크의 같은
      경계(`fill.normal` 이 다크 헤더 #1f1f21 위에서 만드는 **8.63**)의 0.8 이상 —
      즉 6.91 이상. 그런데 **거기서 칩 자신의 글자가 깨진다.** 이 면 위에 앉는 최악의
      전경은 칩·필·필드 라벨이 쓰는 `label.neutral`(`#2e2f33b3`)이고, 면이 어두워지는
      만큼 그 글자의 대비가 같이 깎인다(전부 흰 고정 헤더 위 실측):

        알파   면        면 ΔL*   라벨 대비
         8%   #f4f4f5    3.79      4.702   ← 종전 `fill.normal`
        11%   #eff0f1    5.25      4.522   ← **여기**
        12%   #eeeeef    5.88      4.434   ✗ 본문 4.5 아래
        15%   #eaeaeb    7.28      4.303   ✗ (0.8 비율을 만족하는 값)

      그래서 규칙을 다시 잡는다: **칩 라벨이 흰 헤더 위에서 본문 기준(4.5:1)을 넘는
      가장 진한 단.** 퍼센트 사다리를 훑으면 11%(`1c`)가 그 단이다 — 면은 3.79 → 5.25
      (종전의 1.4배, 다크의 0.61)로 올라가고 글자는 4.5 위에 남는다.

      ⚠ **0.8 비율에 맞추려고 알파를 올리지 마라 — 그건 글자를 깎아 면을 사는 것이다.**
      라이트에서 그 비율에 닿으려면 `label.neutral` 을 한 단 진하게 해야 하는데 그 값은
      식당 상세 시안 실측에 묶여 있다(`restaurantDetailDensity`). 다크가 8.63 을 갖는
      것도 공짜가 아니다 — 다크 칩 라벨은 자기 면 위에서 **4.542** 로 똑같이 아슬아슬하다.
      흰색 근처에서 같은 글자 예산이 더 적은 면 차이를 산다는, 이 표 머리말의 그 비대칭이다.

      **알파를 유지한다.** 칩·필드는 흰 헤더 위에도 카드 위에도 앉는다. 우물처럼 불투명
      값(#eaeaec)으로 굳히면 회색 바닥 위에서 면이 통째로 사라진다.

      ⚠ **더 진하게 올리지 마라 (두 번째 이유).** 미선택 칩이 여덟 개 줄지어 서는
      레일이다 — 진해지면 레일이 "다 골라진 것" 으로 읽힌다. 다만 이 변경 자체는 그
      반대다: 커뮤니티 레일의 선택 칩(`brandSoft` = `primary.primaryWeak`, 흰 면 위
      #fff8f6)과의 명도차가 1.84 → **3.31** 로 오히려 벌어졌다 — 그 톤은 선택 쪽이
      **더 밝은** 면이기 때문이다(`brand` 30.44 · `neutral` 77.18 은 원래 넉넉하다).
      계산은 `tests/lightContrastAudit.test.ts` §7 이 들고 있다.
    */
    control: "#70737c1c",
    background: primitives.grayscale[50], // #f9fafb
    alternative: "#70737c0d",
    pressed: "#0220470d",
  },
  status: {
    positive: primitives.green[500], // #03b26c
    cautionary: primitives.lightOrange[500], // #ffa938
    negative: primitives.red[500], // #ff4242
  },
  static: {
    white: primitives.common[0], // #ffffff
    black: primitives.common[100], // #000000
    whiteWeak: "#ffffff00",
  },
  accentForeground: {
    red: primitives.red[400], // #ff6363
    redXweak: "#ff63630d",
    redWeak: "#ff636329",
    orange: primitives.lightOrange[700], // #9c5800
    orangeWeak: "#ff920029",
    yellow: primitives.yellow[600], // #ffcd38
    yellowWeak: "#ffcd3829",
    pink: primitives.pink[600], // #d671bb
    pinkWeak: "#d671bb29",
    blue: primitives.blue[700], // #19a4d2
    blueWeak: "#19a4d229",
    green: primitives.green[600], // #02a262
    greenWeak: "#02a26229",
  },
}

/** 시맨틱 — Dark 모드 */
export const semanticDark: SemanticColorSet = {
  primary: {
    primary: primitives.orange[700], // #fe7139
    // TODO(design): Figma 는 primary-weak 을 라이트·다크 둘 다 #fff1eb 로 둔다 —
    // 다크를 나누지 않은 것으로 보인다. 그대로 넣으면 다크에서 거의 흰 면이 되므로
    // 확인 전까지 기존 값을 유지한다. 값을 지어내지 않는다.
    primaryWeak: "#282828",
    sub: primitives.navy[50], // #fafbfe
    subWeak: "#fafbfe52",
  },
  label: {
    normal: primitives.grayscale[50], // #f9fafb
    strong: primitives.common[0], // #ffffff
    /*
      ⚠ **이 셋을 `#65676a` 계열로 되돌리지 마라.** 두 번 되돌아갔던 자리다.

      다크 3단(neutral/alternative/assistive)은 **밝은 회색**이다. `#65676a` 계열은
      라이트용 어두운 회색이 잘못 들어간 것으로, 다크 바닥(#1f1f21) 위에서 이렇게 된다
      (2026-08-21 실측, WCAG 대비):

                     되돌아간 값(#65676a)   정본(밝은 회색)
        neutral        2.18 : 1              5.79 : 1
        alternative    1.68 : 1              3.00 : 1
        assistive      1.52 : 1              3.57 : 1

      본문 기준은 4.5:1 이다. 즉 `#65676a` 계열에서는 **제목(normal 15.75)만 보이고
      본문이 안 보인다** — `#65676abd` 는 바닥 위에서 ≈#535456 으로 합성된다.
      정본은 Figma `Design-system_Mobile` · Style Guide(node-id=20-2).

      `neutral`/`alternative` 는 알파를 유지한다(어떤 면 위에서도 같은 위계).
      `assistive` 만 **불투명**인 것이 정본이라, 원시 팔레트를 그대로 가리킨다.
      계산은 `tests/lightContrastAudit.test.ts` §5 가 못 박는다 — 되돌리면 빨개진다.
    */
    neutral: "#c2c4c8bd",
    alternative: "#aeb0b682",
    assistive: primitives.grayscale[600], // #6b7684 — 다크는 불투명이다
    disable: "#70737c33",
  },
  background: {
    default: "#1f1f21",
    lower: "#313135",
    /*
      스크림은 **두 모드가 같은 값**이다(라이트도 `#17171933`). 56%(`8f`)로 되돌아간 적이
      있는데, 그러면 다크에서 시트 뒤 화면이 사실상 검게 덮여 "무엇 위에 열렸는지"가
      사라진다 — 딤은 뒤를 가리는 것이 아니라 **뒤를 물리는** 층이다.
    */
    dim: "#17171933",
    floated: "#1f1f21",
  },
  line: {
    normal: "#70737c52",
    neutral: "#70737c47",
    alternative: "#70737c38",
    strong: "#c2c4c885",
  },
  fill: {
    normal: "#70737c38",
    /*
      컨트롤면. **지금은 `fill.normal` 과 한 바이트도 다르지 않지만 뜻이 다르다.**

      라이트에서 두 역할을 가른 것은 흰 바닥이 8% 한 겹을 거의 지워 버리기 때문이고
      (`semanticLight.fill.control` 머리말), 다크는 그 문제가 없다 — 같은 22% 가 다크
      헤더(#1f1f21) 위에서 ΔL* 8.63 이라 컨트롤이 이미 또렷하다. 즉 **라이트가 맞춰 온
      쪽이 이 값**이다. 사용자가 "자연스럽다" 고 한 화면이므로 여기서 값을 움직이지 않는다.

      ⚠ 값이 같다고 `normal` 로 되돌려 합치지 마라 — 라이트가 이미 갈라져 있어서,
      합치는 순간 라이트의 칩·검색 필드가 조용히 3.79 로 되돌아간다.
    */
    control: "#70737c38",
    background: "#70737c33",
    alternative: "#70737c1f",
    pressed: "#0220471f",
  },
  status: {
    positive: primitives.green[400], // #15c47e
    cautionary: primitives.lightOrange[400], // #ffc06e
    negative: primitives.red[400], // #ff6363
  },
  static: {
    white: primitives.common[0], // #ffffff
    black: primitives.common[100], // #000000
    whiteWeak: "#ffffff00",
  },
  accentForeground: {
    red: primitives.red[300], // #ff8c8c
    redXweak: "#ff63631a",
    redWeak: "#ff636333",
    orange: primitives.lightOrange[600], // #ff9200
    orangeWeak: "#ff920033",
    yellow: primitives.yellow[600], // #ffcd38
    yellowWeak: "#ffcd3833",
    pink: primitives.pink[700], // #c934a6
    pinkWeak: "#c934a633",
    blue: primitives.blue[600], // #42bfe9
    blueWeak: "#42bfe933",
    green: primitives.green[500], // #03b26c
    greenWeak: "#03b26c33",
  },
}

export const semantic = { light: semanticLight, dark: semanticDark } as const

export type ColorMode = keyof typeof semantic
export type SemanticColors = SemanticColorSet

export const colors = { primitives, semantic } as const
