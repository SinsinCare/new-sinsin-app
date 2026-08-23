/**
 * **면의 사다리 — 정본 가드** (2026-08-22)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 무엇을 지키나
 *
 * `lightContrastAudit` §6~§11 은 경계 하나하나를 세게 만들었고, §10 은 마지막에
 * "라이트가 쓰는 회색이 열 개이고 정본은 넷" 이라는 **결론**을 세어 뒀다. 그런데
 * 그 분류는 문서에만 있었다 — 코드에는 "이 회색은 몇 층인가" 를 물어볼 곳이 없어서,
 * 새 화면은 여전히 회색을 **고를 수 있었다.** 고르면 열한 번째가 된다.
 *
 * 그래서 회색 열 개 전부에 이름을 준 것이 `design-system-v2/tokens/layers.ts` 이고,
 * 이 파일은 그 사다리에 대고 네 가지를 묻는다:
 *
 *   §L1  사다리가 실제로 사다리인가 — 단조로운가, 겹치는 단이 **의도한** 그 단들인가.
 *   §L2  **재도색이 아닌가** — 사다리 도입 **전**의 값 표와 지금이 한 바이트도 다르지
 *        않은가. 이 절이 이 작업 전체의 안전 근거다.
 *   §L3  **이름 없는 회색이 없는가** — 사다리가 만드는 집합과 §10 이 세는 집합이 같은가.
 *   §L4  **화면이 회색을 고를 수 있는가** — 소스를 훑어 사다리 밖 면을 직접 칠하는
 *        자리를 잡는다(`pullToRefreshGuard` 와 같은 수법).
 *
 * ■ 왜 §L2 를 값 표로 박아 두나 — 그리고 왜 여기지 §10 이 아닌가
 *
 * §10 은 **개수와 간격**을 센다. 개수가 같아도 열 개가 통째로 다른 열 개일 수 있다.
 * 재편이 재도색이 아니라는 것을 말하려면 **값 하나하나**를 대조해야 하고, 그 표는
 * "사다리 이전" 이라는 한 시점의 스냅숏이라 §10 의 관심사와 다르다.
 *
 * ⚠ **이 표의 숫자를 사다리에 맞춰 고치지 마라.** 여기가 빨개졌다면 사다리가 화면을
 * 다시 칠한 것이고, 고칠 곳은 사다리다.
 */
/* eslint-disable import/first -- RN 의존(`useColorScheme`)을 모듈 로드 **전에** 갈아 끼워야 한다. */
import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

jest.mock("react-native", () => ({ useColorScheme: () => mockScheme }))
jest.mock("@/src/stores/themeStore", () => ({
  useThemeStore: (select: (s: { themeMode: string }) => unknown) =>
    select({ themeMode: "system" }),
}))

let mockScheme: "light" | "dark" = "light"

import {
  getSurfaceLayers,
  ladderGreys,
  type SurfacePlanes,
} from "@/src/design-system-v2/tokens/layers"
import { semantic } from "@/src/design-system-v2/tokens/colors"
import { over } from "@/src/design-system-v2/tokens/blend"
import { getSurfacePalette } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

import { lightness } from "./helpers/contrast"
import { codeOnly } from "./helpers/codeOnly"

const REPO = resolve(__dirname, "..")
const MODES = ["light", "dark"] as const
type Mode = (typeof MODES)[number]

/* ═══════════════════ §L1 사다리가 실제로 사다리다 ═══════════════════ */

describe("§L1 사다리 — 단 · 역할 · 겹침", () => {
  it("여섯 단의 값이 못 박혀 있다 (변이 테스트의 과녁)", () => {
    /*
      한 단을 바꾸면 여기가 먼저 빨개지고, 이어서 §L2(재도색 아님)·§L3(개수) ·
      `lightContrastAudit` §6·§10 이 따라 빨개진다. 값을 여기 적는 이유는 사다리가
      **계산**이라 어느 항을 건드려도 조용히 미끄러질 수 있기 때문이다.
    */
    expect(getSurfaceLayers(false).planes).toEqual({
      content: "#ffffff",
      band: "#f7f7f7",
      wellShallow: "#f8f8f8",
      bed: "#eaeaec",
      well: "#eaeaec",
      pressed: "#e0e1e3",
    })
    expect(getSurfaceLayers(true).planes).toEqual({
      content: "#313135",
      band: "#313135",
      wellShallow: "#39393e",
      bed: "#1f1f21",
      well: "#3f3f45",
      pressed: "#4a4a51",
    })
  })

  it("기준면은 라이트 `content` · 다크 `bed` 다 — 그리고 그것이 `background.default` 다", () => {
    /*
      사다리에서 `background.default` 가 **모드마다 다른 단**이라는 사실이 이 앱 라이트의
      예외("회색 바닥 위 흰 카드") 그 자체다. `isDark` 를 다시 묻는 대신 이름으로 든다.
    */
    for (const mode of MODES) {
      const layers = getSurfaceLayers(mode === "dark")
      expect({ mode, base: layers.planes[layers.basePlane] }).toEqual({
        mode,
        base: semantic[mode].background.default,
      })
    }
    expect(getSurfaceLayers(false).basePlane).toBe("content")
    expect(getSurfaceLayers(true).basePlane).toBe("bed")
  })

  it("바닥에서 멀어지는 쪽이 위층이다 — 두 모드가 **같은 순서**를 탄다", () => {
    /*
      라이트는 층마다 어두워지고 다크는 층마다 밝아진다. 방향이 반대라 값을 그냥
      정렬하면 한쪽이 뒤집혀 보이므로, **바닥에서의 거리**로 잰다.
    */
    const order: (keyof SurfacePlanes)[] = ["bed", "well", "pressed"]
    for (const mode of MODES) {
      const { planes } = getSurfaceLayers(mode === "dark")
      const distance = order.map((rung) =>
        Math.abs(lightness(planes[rung]) - lightness(planes.bed)),
      )
      expect({ mode, distance }).toEqual({
        mode,
        distance: [...distance].sort((a, b) => a - b),
      })
    }
    // 콘텐츠 면도 바닥에서 그만큼 떨어져 있다 — §6 이 얻은 7.25 / 8.63 이 이 거리다.
    const step = (mode: Mode) => {
      const { planes } = getSurfaceLayers(mode === "dark")
      return Math.abs(lightness(planes.content) - lightness(planes.bed))
    }
    expect(step("light")).toBeCloseTo(7.25, 1)
    expect(step("dark")).toBeCloseTo(8.63, 1)
  })

  it("**겹치는 단은 의도다** — 어느 단이 왜 겹치는지까지 못 박는다", () => {
    /*
      "다크에서 네 값이 하나로 접힌다" 를 결함으로 오해하고 갈라 놓는 변이가 여기서
      빨개진다. 반대로 라이트의 `bed === well` 을 "중복" 이라고 접는 변이도 잡힌다 —
      그 둘은 뜻이 다르고, 다크에서 실제로 다른 값이다.
    */
    const light = getSurfaceLayers(false)
    const dark = getSurfaceLayers(true)

    // (a) 다크: 콘텐츠 면 = 띠 = 바닥 위의 장식 표식 = 바닥 위의 컨트롤면.
    //     `background.lower` 가 "바닥에 fill.normal 한 겹" 과 정확히 같은 값이라 그렇다.
    expect([
      dark.planes.content,
      dark.planes.band,
      dark.on("normal", "bed"),
      dark.on("control", "bed"),
    ]).toEqual(["#313135", "#313135", "#313135", "#313135"])
    // 라이트에서 그 넷은 **넷 다 다른 값**이다 — 그것이 개수 차이의 전부다.
    expect(
      new Set([
        light.planes.content,
        light.planes.band,
        light.on("normal", "content"),
        light.on("control", "content"),
      ]).size,
    ).toBe(4)

    // (b) 다크: 우물 = 콘텐츠 면 위의 컨트롤면. 라이트에서만 이 둘이 갈라진다.
    expect(dark.planes.well).toBe(dark.on("control", "content"))
    expect(light.planes.well).not.toBe(light.on("control", "content"))

    // (c) 라이트: 바닥 = 우물. 카드가 바닥과 같은 흰색이라는 예외의 결과다.
    expect(light.planes.bed).toBe(light.planes.well)
    expect(dark.planes.bed).not.toBe(dark.planes.well)

    // (d) 라이트: 얕은 우물 = 콘텐츠 면 위의 옅은 표식. 이건 **정의**라 두 모드 모두 참이다.
    for (const layers of [light, dark]) {
      expect(layers.planes.wellShallow).toBe(
        layers.on("alternative", "content"),
      )
    }
  })

  it("표시는 **알파**로 남는다 — 면으로 굳히지 않는다", () => {
    /*
      컨트롤면을 불투명 값으로 굳히는 변이를 잡는다. 칩·검색 필드는 흰 헤더 위에도
      회색 바닥 위에도 앉으므로, 굳히는 순간 한쪽에서 면이 통째로 사라진다.
      (그 계산은 `lightContrastAudit` §7 이 들고 있다.)
    */
    for (const mode of MODES) {
      const { marks, on } = getSurfaceLayers(mode === "dark")
      expect({ mode, alpha: marks.control.length }).toEqual({ mode, alpha: 9 })
      // 같은 표시가 면마다 다른 값이 된다 — 알파라는 사실의 관측 가능한 형태다.
      expect(on("control", "content")).not.toBe(on("control", "bed"))
    }
  })
})

/* ══════════════ §L2 재도색이 아니다 — 사다리 이전 값 스냅숏 ══════════════ */

describe("§L2 사다리 도입 전후로 **칠해지는 색이 같다**", () => {
  /*
    아래 두 표는 `layers.ts` 가 생기기 **전에** 떠 둔 것이다. 그때 면을 정하던 곳은
    `theme/surface.ts` 의 `derive()` 였고, tamagui 계보는 자기 자리에서 `over()` 를
    다시 계산했으며, 설정 계보는 리터럴 `#FFFFFF` 를 박아 뒀다. 재편은 그 셋을 전부
    사다리에서 집어 오게 바꿨다 — **값을 바꾸는 것이 아니라 출처를 하나로 만드는 것**이
    목적이었으므로, 아래가 한 칸이라도 다르면 그 목적이 실패한 것이다.
  */
  const PRE_LADDER_PALETTE = {
    light: {
      canvas: "#ffffff",
      bed: "#eaeaec",
      surface: "#eaeaec",
      surfaceSunken: "#f8f8f8",
      surfacePressed: "#e0e1e3",
      band: "#f7f7f7",
      surfaceBrand: "#fff8f6",
      card: "#ffffff",
      border: "#70737c38",
      hairline: "#70737c14",
      textStrong: "#2a2a37",
      text: "#2e2f33b3",
      textMuted: "#37383c82",
      textWeak: "#37383c47",
      placeholder: "#37383c47",
      brand: "#fe7139",
      onBrand: "#ffffff",
      ctaOffBg: "#eaeaec",
      ctaOffText: "#37383c47",
      recordedTint: "#fff8f6",
      danger: "#ff4242",
      caution: "#ffa938",
    },
    dark: {
      canvas: "#1f1f21",
      bed: "#1f1f21",
      surface: "#3f3f45",
      surfaceSunken: "#39393e",
      surfacePressed: "#4a4a51",
      band: "#313135",
      surfaceBrand: "#472e25",
      card: "#313135",
      border: "#70737c52",
      hairline: "#70737c38",
      textStrong: "#f9fafb",
      text: "#c2c4c8bd",
      textMuted: "#aeb0b682",
      textWeak: "#6b7684",
      placeholder: "#6b7684",
      brand: "#fe7139",
      onBrand: "#ffffff",
      ctaOffBg: "#3f3f45",
      ctaOffText: "#6b7684",
      recordedTint: "#472e25",
      danger: "#ff6363",
      caution: "#ffc06e",
    },
  } as const

  it.each(MODES)("%s: `SurfacePalette` 21칸이 그대로다", (mode) => {
    expect({ ...getSurfacePalette(mode === "dark") }).toEqual(
      PRE_LADDER_PALETTE[mode],
    )
  })

  it("tamagui 계보의 면도 그대로다 — 계산만 사다리로 옮겼다", () => {
    /*
      `cardBgDark` 는 예전에 이 파일에서 `over(fill.normal, background.default)` 를
      **다시 계산**했다. 같은 식이 두 곳에 살면 언젠가 한쪽만 고쳐진다.
    */
    expect({
      appBg: tokens.color.appBg.val,
      appBgDark: tokens.color.appBgDark.val,
      cardBgDark: tokens.color.cardBgDark.val,
      inputBgDark: tokens.color.inputBgDark.val,
    }).toEqual({
      appBg: "#eaeaec",
      appBgDark: "#1f1f21",
      cardBgDark: "#313135",
      inputBgDark: "#2f3033",
    })
  })

  it("설정 계보의 두 칸도 그대로다 — 리터럴이 사다리 단으로 바뀌었을 뿐이다", () => {
    /*
      `useSettingsColors` 는 라이트 `bg`·`cardBg` 를 **리터럴 `#FFFFFF`** 로 박아 뒀었다.
      대문자·소문자만 다르고 값이 같으므로 옮겨도 화면이 안 바뀐다 — 그 "같음" 을
      여기서 소문자로 정규화해 못 박는다.
    */
    /* eslint-disable react-hooks/rules-of-hooks --
       이 훅은 상태가 없다(모드 한 칸을 읽어 값 표를 만든다). 렌더러 없이 그대로
       호출해 결과를 읽는 것이 이 저장소의 수법이다(`lightContrastAudit` 머리말). */
    const readAt = (mode: Mode) => {
      mockScheme = mode
      const c = useSettingsColors()
      return { bg: c.bg.toLowerCase(), cardBg: c.cardBg.toLowerCase() }
    }
    /* eslint-enable react-hooks/rules-of-hooks */
    expect(readAt("light")).toEqual({ bg: "#ffffff", cardBg: "#ffffff" })
    expect(readAt("dark")).toEqual({ bg: "#1f1f21", cardBg: "#313135" })
    mockScheme = "light"
  })
})

/* ═══════════ §L3 이름 없는 회색이 없다 (사다리 ≡ §10 의 집합) ═══════════ */

describe("§L3 화면이 마주치는 회색은 전부 사다리 안에 있다", () => {
  /**
   * `lightContrastAudit` §10 이 세던 목록을 **그대로** 다시 만든다. 값을 베끼지 않고
   * 팔레트·시맨틱에서 계산하므로, 어느 쪽이 움직여도 따라간다.
   */
  const auditGreys = (mode: Mode) => {
    const p = getSurfacePalette(mode === "dark")
    const v2 = semantic[mode]
    const canvas = v2.background.default
    return [
      ...new Set([
        p.canvas,
        p.bed,
        p.card,
        p.surface,
        p.surfaceSunken,
        p.surfacePressed,
        p.band,
        over(v2.fill.normal, canvas),
        over(v2.fill.control, canvas),
        over(v2.fill.background, canvas),
        over(v2.fill.alternative, canvas),
        over(v2.fill.control, p.bed),
        over(v2.fill.control, p.band),
      ]),
    ]
  }

  it.each(MODES)("%s: 사다리가 만드는 집합 = §10 이 세는 집합", (mode) => {
    /*
      **이 절이 "고를 수 없다" 의 절반이다.** 나머지 절반은 §L4(화면이 직접 칠하지
      못한다). 여기서 잡는 것은 반대 방향 — 사다리에 단을 몰래 늘리거나, §10 이 세던
      회색 하나가 사다리 이름을 못 받는 경우.
    */
    const ladder = [...ladderGreys(mode === "dark")].sort()
    const audit = [...auditGreys(mode)].sort()
    expect({ mode, ladder }).toEqual({ mode, ladder: audit })
  })

  it("개수는 라이트 열 · 다크 일곱이다 (§10 과 같은 숫자를 사다리 쪽에서도 센다)", () => {
    expect(ladderGreys(false)).toHaveLength(10)
    expect(ladderGreys(true)).toHaveLength(7)
  })
})

/* ═══════ §L4 게이트 — 화면이 사다리 밖 면을 직접 칠하지 못한다 ═══════ */

describe("§L4 사다리 밖 회색을 화면이 직접 칠하지 못한다", () => {
  /*
    ■ 무엇을 잡나 — **불투명 면**이다

    사다리는 면(불투명)의 체계다. 그래서 이 게이트가 보는 것은
    `backgroundColor: "#rrggbb"` 처럼 **여섯 자리 리터럴**을 면으로 칠하는 자리와,
    원시 팔레트(`primitives.grayscale[...]`)를 면으로 쓰는 자리 둘뿐이다.

    ■ 무엇을 **안** 잡나 (알고 남긴다)

    알파 리터럴(`#rrggbbaa` · `rgba(...)`)은 안 본다. 그 20여 곳은 전부 **사진 위
    스크림**(스토리 뷰어의 그라디언트, 사진 카드의 딤)이라 면이 아니라 사진을 덮는
    칠이고, 사다리에는 그것을 말하는 단이 없다. 스크림 체계는 별도 문제다 — 여기서
    억지로 잡으면 예외 목록이 스무 줄 늘고 게이트가 무뎌진다.

    ■ 예외를 늘릴 때

    **파일 이름으로만** 늘린다. 그리고 왜 안전한지를 적는다. 한 줄 늘릴 때마다
    "새 화면은 고를 수 없다" 가 그만큼 약해진다는 것을 기억할 것.
  */
  const ALLOWED: Record<string, string> = {
    /*
      전면 사진 뷰어(극장). 바닥 `#0B0B0D` 와 진행바 `#FFFFFF` 는 **모드를 안 타는**
      칠이다 — 사다리는 라이트/다크 두 벌의 면 체계이고, 이 화면은 두 모드 모두
      검은 극장이라 어느 단에도 속하지 않는다. 옮기면 사다리에 "모드 무관" 단을
      만들어야 하는데, 그건 면 체계가 아니라 미디어 표면의 문제다.
    */
    "app/stories.tsx": "전면 사진 뷰어 — 모드를 안 타는 극장 바닥과 진행바",
    /*
      배경 **이미지** 위에 얹는 패치다(영어에서 한국어 타이틀을 가린다). 값이
      이미지의 흰색에 맞춰져 있어서 `#ffffff` 로 올리면 이음매가 드러난다 —
      가장 가까운 단(콘텐츠 면, ΔL* 0.15)으로 옮기는 것이 **안전하지 않은** 유일한
      자리라 남긴다. 면이 아니라 이미지 보정이다.
    */
    "src/features/auth/views/LoginScreen.tsx":
      "배경 이미지 위 패치 — 이미지의 흰색에 맞춘 값이라 면 체계가 아니다",
    /*
      Safe 틸(`tokens.color.safe1` 과 같은 값). 회색이 아니라 **의미색**이고, 이
      게이트는 색상 계보가 아니라 면 사다리를 지킨다. 토큰으로 옮길 수는 있으나
      그건 이 작업(면 재편)의 범위 밖이다.
    */
    "src/features/settings/views/AskDoctorScreen.tsx":
      "Safe 틸 배지 — 회색이 아니라 의미색(tokens.color.safe1 과 같은 값)",
  }
  /*
    건강검진(구) 계보 7화면. **자기 팔레트를 통째로 들고 있다** — 슬레이트
    (#F8FAFC · #F1F5F9 · #E2E8F0)와 에메랄드(#F0FDF4 · #ECFDF5 · #F0FDF9)로,
    v2 시맨틱과 접점이 없다. 사다리로 옮기면 그건 토큰 이동이 아니라 **재도색**이고,
    이번 작업이 금지한 그것이다. 게이트가 이름을 들고 있는 것 자체가 목적이다 —
    "언젠가 옮길 곳" 이 목록으로 남고, 새 화면은 여기 낄 수 없다.
  */
  const LEGACY_HEALTH_PALETTE = [
    "HealthDashboardScreen",
    "HealthDataEntryScreen",
    "HealthDataResultDetailScreen",
    "HealthDataResultListScreen",
    "HealthDataUploadScreen",
    "NhisConfirmScreen",
    "OcrReviewScreen",
  ].map((name) => `src/features/health/views/${name}.tsx`)

  for (const file of LEGACY_HEALTH_PALETTE) {
    ALLOWED[file] =
      "건강검진(구) 계보 — 슬레이트·에메랄드 자기 팔레트. 재도색 대상"
  }

  /** 사다리가 사는 곳과 그 어댑터는 당연히 값을 든다. */
  const TOKEN_HOMES = [
    "src/design-system-v2/tokens/",
    "src/theme/",
    "src/features/settings/hooks/useSettingsColors.ts",
  ]

  const files = execSync("find app src -name '*.tsx' -o -name '*.ts'", {
    cwd: REPO,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter((file) => !TOKEN_HOMES.some((home) => file.startsWith(home)))

  const offendersOf = (pattern: RegExp) => {
    const out: string[] = []
    for (const file of files) {
      const src = codeOnly(readFileSync(resolve(REPO, file), "utf8"))
      for (const match of src.matchAll(pattern)) {
        if (ALLOWED[file]) continue
        out.push(`${file}: ${match[0].trim()}`)
      }
    }
    return out
  }

  it("면에 **리터럴 hex** 를 적지 않는다", () => {
    expect(offendersOf(/backgroundColor:\s*"#[0-9a-fA-F]{6}"/g)).toEqual([])
  })

  it("면에 **원시 팔레트**를 직접 쓰지 않는다 — 원시색은 층을 모른다", () => {
    /*
      `primitives.grayscale[100]` 은 값일 뿐 "몇 층인가" 를 말하지 않는다. 면으로
      쓰는 순간 그 화면만 사다리 밖에 서게 된다(시맨틱을 거치면 층이 따라온다).
    */
    expect(offendersOf(/backgroundColor:[^,\n}]*primitives\.\w+\[/g)).toEqual(
      [],
    )
  })

  it("게이트가 **실제로 잡는다** (오라클)", () => {
    /*
      늘 통과하는 게이트가 아닌지 확인한다. 예외 목록을 비우면 열 파일이 걸려야 한다 —
      즉 규칙은 살아 있고, 지금 초록인 이유는 오직 **이름이 적혀 있기 때문**이다.
    */
    const raw: string[] = []
    for (const file of files) {
      const src = codeOnly(readFileSync(resolve(REPO, file), "utf8"))
      if (/backgroundColor:\s*"#[0-9a-fA-F]{6}"/.test(src)) raw.push(file)
    }
    expect(raw.sort()).toEqual(Object.keys(ALLOWED).sort())
    // 예외는 전부 이유를 들고 있다.
    for (const [file, reason] of Object.entries(ALLOWED)) {
      expect({ file, hasReason: reason.length > 10 }).toEqual({
        file,
        hasReason: true,
      })
    }
  })
})

/* ═══════ §L5 사다리 밖에 남은 회색 표는 **늘지 않는다** ═══════ */

describe("§L5 `useSettingsColors` 의 리터럴 회색은 줄기만 한다", () => {
  it("남은 리터럴 목록이 못 박혀 있다", () => {
    /*
      §L4 는 **화면**이 회색을 칠하는 것을 막는다. 그런데 이 훅은 회색을 반환값으로
      나눠 주므로, 화면은 `colors.secondaryBg` 라고만 적고 게이트를 통과한다 —
      회색을 고른 곳은 훅이다. 그래서 훅 쪽은 목록으로 잡는다.

      `bg`·`cardBg` 는 2026-08-22 에 사다리로 옮겼다(값 동일). 나머지는 사다리의 어느
      단과도 값이 달라서 옮기면 **재도색**이 된다 — 그 판단은 이 훅 머리말에 있다.
      새 리터럴이 늘면 여기가 빨개진다.
    */
    const src = codeOnly(
      readFileSync(
        resolve(REPO, "src/features/settings/hooks/useSettingsColors.ts"),
        "utf8",
      ),
    )
    const literals = [...src.matchAll(/"(#[0-9a-fA-F]{3,8})"/g)]
      .map((m) => m[1])
      .sort()
    expect([...new Set(literals)]).toEqual([
      "#17191C",
      "#2A2A32",
      "#3A3A42",
      "#474758",
      "#555",
      "#6B7280",
      "#94A3B8",
      "#C4C4C4",
      "#C5C8CE",
      "#DADFE699",
      "#E0E0E0",
      "#F0F0F0",
      "#F0F2F5",
      "#F5F6FA",
      "#F9F9F9",
      "#FFFFFF",
    ])
    // 옮긴 두 칸은 더 이상 리터럴이 아니다 — 사다리에서 집어 온다.
    expect(src).toContain("bg: planes[basePlane]")
    expect(src).toContain("cardBg: planes.content")
  })
})
