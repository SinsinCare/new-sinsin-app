/**
 * **확인창을 닫으면서 같은 틱에 화면을 pop 하는가** — 작성 화면 넷 전부.
 *
 * ## 규칙과 그 출처
 *
 * `src/shared/components/appModalGate.ts` 가 못 박아 둔 것: 라우터 push/pop 처럼
 * **RN Modal 밖 네이티브 VC 전환**은 모달 전이가 가라앉은 **뒤에** 해야 한다.
 *
 * ```ts
 * const confirmed = await showConfirm({...})
 * if (!confirmed) return
 * await afterModalTransitions()
 * router.back()
 * ```
 *
 * iOS 의 RN Modal 은 자기 뷰트리 VC 에서 present 하고 topmost 탐색이 없어서, 두
 * 전환이 겹치면 UIKit 전환이 끝내 마무리되지 않고 UITransitionView 가 남아 **앱 전체
 * 터치가 죽는다**(2026-08-03 식사 기록·홈 프리징이 전부 이 계열이었다).
 *
 * ## 왜 이 테스트가 필요한가 (실측)
 *
 * 규칙은 주석에만 있었고, 지키는 곳과 안 지키는 곳이 **반반**이었다:
 *
 * | 화면 | 확인 뒤 pop |
 * |------|-------------|
 * | `RecipeWriteScreen` | `afterModalTransitions().then(onClose)` ✅ |
 * | `FreePostEditor`    | `afterModalTransitions().then(onClose)` ✅ |
 * | `app/(write)/free/[id]` | `setConfirmExitVisible(false); router.back()` ❌ |
 * | `app/(write)/story/new` | `await showConfirm(…); router.back()` ❌ |
 *
 * `tests/appModalGate.test.ts` 는 게이트 **자체**(큐·레지스트리)만 검증한다 — 게이트가
 * 완벽하게 동작해도 **부르지 않는 호출부**는 아무도 안 본다. 타입도 린트도 볼 수 없다:
 * `router.back()` 은 문법적으로 완벽하고, 사고는 실기기에서 손가락으로 눌러야 난다.
 * 그래서 `nativePresentGuard.test.ts` 와 같은 처방으로 **소스에서** 강제한다.
 *
 * ## 무엇을 보나
 *
 * "확인 결정 지점부터 **바로 다음** pop 까지" 사이에 게이트 호출이 있어야 한다.
 * 파일 단위가 아니라 **구간 단위**다 — `free/[id]` 는 상태 화면·남의 글 이펙트에도
 * `router.back()` 이 있는데 그쪽은 모달과 무관해서 게이트가 필요 없다. 파일에 게이트가
 * 한 번이라도 있으면 통과시키는 검사였다면 이 결함을 못 잡았을 것이다.
 *
 * 검사 대상은 박아 두지 않고 `(write)/_layout.tsx` 의 **초안 화면 목록에서 끌어온다** —
 * 다섯 번째 작성 화면이 생기면 자동으로 여기 들어온다.
 */
import fs from "node:fs"
import path from "node:path"

import { codeOnly } from "./helpers/codeOnly"

const ROOT = path.join(__dirname, "..")

function read(relative: string): string {
  return codeOnly(fs.readFileSync(path.join(ROOT, relative), "utf8"))
}

/* ── 검사 대상: 초안을 든 작성 화면 ──────────────────────────────────────── */

/** 레이아웃이 `gestureEnabled: false` 로 잠근 라우트 = 잃을 초안이 있는 화면. */
function draftRoutes(): string[] {
  const layout = read("app/(write)/_layout.tsx")
  return [...layout.matchAll(/<Stack\.Screen\b[^>]*\/>/gu)]
    .filter((match) => /gestureEnabled:\s*false/u.test(match[0]))
    .map((match) => /name="([^"]+)"/u.exec(match[0])?.[1] ?? "")
}

/**
 * 라우트가 **실제로 폼을 들고 있는 파일**. 라우트 파일이 껍데기면
 * (`free/new` → `FreePostEditor`) 그 컴포넌트 파일까지 따라간다.
 */
function screenFileFor(route: string): string {
  const routeFile = path.join("app", "(write)", `${route}.tsx`)
  const source = read(routeFile)
  if (source.includes("usePreventRemove(")) return routeFile

  /*
    2026-09-09 재조준: `free/[id]` 는 JSX 없이 화면을 그대로 다시 내보내는 껍데기가
    됐다(`export { FreePostEditScreen as default } from "@/…"`, 04f633f 이후) —
    렌더 태그가 없으니 그 재export 를 먼저 따라간다. 폼이 있는 파일까지 가는 목적은 같다.
  */
  const reexported = /export \{ \w+ as default \} from "@\/([^"]+)"/u.exec(
    source,
  )?.[1]
  if (reexported) return `${reexported}.tsx`

  const rendered = /<([A-Z]\w+)[\s/>]/u.exec(source)?.[1]
  if (!rendered) throw new Error(`${route}: 렌더하는 컴포넌트를 찾지 못했다`)
  const imported = new RegExp(
    `import \\{[^}]*\\b${rendered}\\b[^}]*\\} from "@/([^"]+)"`,
    "u",
  ).exec(source)?.[1]
  if (!imported) throw new Error(`${route}: ${rendered} 의 출처를 찾지 못했다`)
  return `${imported}.tsx`
}

const SCREENS = draftRoutes().map((route) => ({
  route,
  file: screenFileFor(route),
}))

/* ── 구간 잘라내기 ──────────────────────────────────────────────────────── */

/**
 * "두고 나갈지" 를 사용자가 **결정하는** 자리.
 *
 * 렌더형(`<ConfirmExitModal onConfirm={…}>`)과 명령형(`await showConfirm({…})`)
 * 두 모양이 있고, 둘 다 그 직후에 화면을 pop 한다.
 */
const CONFIRM_MARKERS = [/onConfirm=\{/gu, /showConfirm\(\{/gu]

/** 화면을 떠나는 호출. `onClose` 는 라우트 껍데기가 넘긴 `router.back()` 이다. */
const POP =
  /\brouter\.(?:back|replace|dismiss|dismissAll|dismissTo)\s*\(|\bonClose\b/u

/**
 * 게이트의 **실제 호출**. 이름만 스치는 것은 안 센다.
 *
 * (`nativePresentGuard.test.ts` 가 같은 함정을 적어 두었다 — 이 저장소는 결함 이력을
 * 주석에 길게 남기는 관례가 있어서, 이름 매칭으로 두면 코드에서 게이트를 통째로
 * 지워도 주석이 대신 통과시킨다. 여기서는 `codeOnly` 로 주석을 걷고 호출 형태만 본다.)
 */
const GATE = /\bafterModalTransitions\s*\(/u

interface Segment {
  file: string
  /** 결정 지점의 앞부분 — 실패 메시지에서 어느 자리인지 알아보게. */
  at: string
  code: string
}

/** 확인 결정 지점부터 **바로 다음** pop 까지. */
function confirmToPopSegments(file: string): Segment[] {
  const source = read(file)
  const segments: Segment[] = []

  for (const marker of CONFIRM_MARKERS) {
    for (const match of source.matchAll(marker)) {
      const from = (match.index ?? 0) + match[0].length
      const rest = source.slice(from)
      const pop = POP.exec(rest)
      if (!pop) continue
      segments.push({
        file,
        at: source.slice(match.index ?? 0, (match.index ?? 0) + 24).trim(),
        code: rest.slice(0, pop.index),
      })
    }
  }
  return segments
}

describe("작성 화면 — 확인창 dismiss 와 화면 pop 이 겹치지 않는다", () => {
  it("검사 대상이 초안 화면 넷 전부다", () => {
    expect(SCREENS.map((screen) => screen.route).sort()).toEqual([
      "free/[id]",
      "free/new",
      "recipe/new",
      "story/new",
    ])
    // 껍데기 라우트는 폼이 있는 파일까지 따라갔다.
    // 정렬된 목록과 비교한다 — 기대값도 정렬 순서로 둔다(2026-09-09 정정).
    expect(SCREENS.map((screen) => screen.file).sort()).toEqual([
      "app/(write)/story/new.tsx",
      "src/features/recipe/components/FreePostEditor.tsx",
      "src/features/recipe/views/FreePostEditScreen.tsx",
      "src/features/recipe/views/RecipeWriteScreen.tsx",
    ])
  })

  it("검사가 실제로 구간을 잘라낸다 (0건을 세고 통과하지 않는다)", () => {
    // 마커 이름이 바뀌거나 정규식이 어긋나면 구간이 0개가 되고 아래 검사들이
    // 영원히 초록이 된다. 화면마다 최소 하나의 "확인 → pop" 이 있어야 한다.
    const counted = SCREENS.map((screen) => ({
      file: screen.file,
      segments: confirmToPopSegments(screen.file).length,
    }))
    expect(counted.filter((entry) => entry.segments === 0)).toEqual([])
  })

  it("확인 뒤의 pop 은 전부 게이트를 거친다", () => {
    const offenders = SCREENS.flatMap((screen) =>
      confirmToPopSegments(screen.file)
        .filter((segment) => !GATE.test(segment.code))
        .map((segment) => `${segment.file} — ${segment.at}`),
    )

    expect(offenders).toEqual([])
  })

  it("게이트를 `.then(...)` 으로 흘려도 pop 은 그 뒤다", () => {
    // `void afterModalTransitions().then(onClose)` 도 `await` 뒤 pop 과 같은 뜻이다.
    // 두 모양 다 허용하되, **게이트가 pop 보다 앞선다**는 것만 지킨다.
    for (const screen of SCREENS) {
      for (const segment of confirmToPopSegments(screen.file)) {
        expect(segment.code).toMatch(GATE)
      }
    }
  })
})

describe("규칙의 출처가 그대로 있다", () => {
  const gateSource = read("src/shared/components/appModalGate.ts")

  it("`afterModalTransitions` 가 여전히 존재한다", () => {
    expect(gateSource).toMatch(/export async function afterModalTransitions\(/u)
  })

  it("전이 큐를 실제로 기다린다 — 이름만 남은 껍데기가 아니다", () => {
    const body = gateSource.slice(
      gateSource.indexOf("export async function afterModalTransitions("),
    )
    expect(body.slice(0, 200)).toContain("whenTransitionsIdle()")
  })
})
