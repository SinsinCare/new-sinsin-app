// Design System v2 — Color tokens
// Source of truth: Figma "Design-system_Mobile" Variables (실제 변수값). Docs: Color Styles.md
// NOTE: Figma의 label 'nomal' 오타는 여기서 'normal'로 정정.
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
  opacityWhite: {
    "100": "#ffffff1a",
    "200": "#ffffff33",
    "300": "#ffffff4d",
    "400": "#ffffff66",
    "500": "#ffffff80",
    "600": "#ffffff99",
    "700": "#ffffffb2",
    "800": "#ffffffcc",
    "900": "#ffffffe5",
  },
  opacityBlack: {
    "100": "#0000001a",
    "200": "#00000033",
    "300": "#0000004d",
    "400": "#00000066",
    "500": "#00000080",
    "600": "#00000099",
    "700": "#000000b2",
    "800": "#000000cc",
    "900": "#000000e5",
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
    neutral: "#2e2f33b2",
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
    primaryWeak: "#282828",
    sub: primitives.navy[50], // #fafbfe
    subWeak: "#fafbfe52",
  },
  label: {
    normal: primitives.grayscale[50], // #f9fafb
    strong: primitives.common[0], // #ffffff
    neutral: "#65676abd",
    alternative: "#65676a82",
    assistive: "#65676a6b",
    disable: "#70737c33",
  },
  background: {
    default: "#1f1f21",
    lower: "#313135",
    dim: "#1717198f",
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
