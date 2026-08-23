/**
 * **안드로이드 하드웨어 백이 초안을 확인 없이 지우는가** (R4).
 *
 * ── 왜 레이아웃의 `gestureEnabled: false` 로는 못 막나 ──────────────────────
 * 그 옵션은 **iOS 전용**이다. native-stack 은 안드로이드에서 그 값을 무조건 `false`
 * 로 넘긴다 — 시스템 백을 JS 에서 처리하기 때문이다. 아래 첫 describe 가 설치된
 * 패키지 소스에서 그 사실을 직접 확인한다(주장이 아니라 실측으로 남긴다).
 * 그러니 안드로이드에서는 백 한 번에 제목·본문 700자·사진 다섯 장이 사라졌다.
 *
 * ── 처방: 화면 안의 `usePreventRemove(hasDraft, …)` ────────────────────────
 * 이 훅은 `useRoute()` 를 쓰므로 **화면 안에서만** 부를 수 있고, 조건은 각 폼만 안다.
 * 레이아웃에 조건 없이 걸면 **빈 편집기에도 확인창**이 떠서 잃을 것 없는 사람을 한 번
 * 더 누르게 한다. 그래서 네 화면이 각자 자기 신호로 부른다.
 *
 * ── 되돌아오면 안 되는 두 함정 ─────────────────────────────────────────────
 * 1. **가둠.** 가드는 이탈의 출처를 가리지 않는다 — 확인창의 "나가기" 가 부르는
 *    `router.back()`/`onClose()` 도 초안이 남은 채로 나가는 길이라 **다시 잡힌다.**
 *    그대로 두면 확인창이 되뜨고 화면을 영영 못 떠난다.
 * 2. **등록 성공 뒤의 확인창.** 올리고 나가는 길(`router.replace('/post/…')`,
 *    `onClose()`)도 같은 이유로 잡힌다 — 글을 올린 사람에게 "쓰던 걸 두고 나갈까요"
 *    가 뜬다.
 * 둘 다 같은 깃발(`allowExitRef`)로 푼다: 나가기로 **결정한** 순간 세우고, 가드는
 * 잡아 둔 그 동작을 `navigation.dispatch(data.action)` 로 그대로 다시 던진다.
 * 다시 던진 동작은 react-navigation 이 "이 화면을 이미 지나왔다" 로 표시해 두어
 * 두 번 잡히지 않는다.
 *
 * ## 왜 소스를 읽는가
 *
 * 지키려는 것이 값이 아니라 **화면과 내비게이터 사이의 배선**이고, 이 스위트에는
 * RN 렌더러도 네비게이터도 없다(`tests/helpers/reactNativeStub.js`). 게다가
 * `@react-navigation/*` 은 ESM 빌드만 있어 이 jest 설정에서는 import 조차 안 된다 —
 * 그래서 패키지도 **파일로** 확인한다. 화면 쪽은 `writeStackExitGuard.test.ts` 와
 * 같은 처방으로 주석을 걷어낸 뒤 배선만 본다.
 */
import fs from "node:fs"
import path from "node:path"

const ROOT = path.join(__dirname, "..")
const readRaw = (file: string) =>
  fs.readFileSync(path.join(ROOT, file), "utf-8")

/** 주석을 걷어낸다 — 머리말이 계약을 대신 만족시키지 않게. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}
const read = (file: string) => stripComments(readRaw(file))

/** 초안을 든 작성 화면 넷과 각자의 "잃을 것이 있는가" 신호. */
const GUARDED = [
  {
    file: "src/features/recipe/components/FreePostEditor.tsx",
    signal: "hasContent",
    /** 그 신호를 만드는 식의 일부 — 상수로 굳어 있지 않은지 본다. */
    signalSource: "title.trim().length > 0",
    /** 이 화면이 이미 쓰던 확인 표면. 두 번째 다이얼로그를 만들지 않는다. */
    dialog: "<ConfirmExitModal",
  },
  {
    file: "src/features/recipe/views/RecipeWriteScreen.tsx",
    signal: "screen.hasDraft",
    signalSource: "screen.hasDraft",
    dialog: "<ConfirmExitModal",
  },
  {
    file: "app/(write)/free/[id].tsx",
    signal: "hasChanges",
    signalSource: "title !== post.title",
    dialog: "<ConfirmExitModal",
  },
  {
    file: "app/(write)/story/new.tsx",
    signal: "hasDraft",
    signalSource: "caption.trim().length > 0",
    // 이 화면의 확인창은 처음부터 `showConfirm` 이다 — 없던 모달을 새로 들이지 않는다.
    dialog: "showConfirm({",
  },
] as const

describe("`gestureEnabled` 로는 안드로이드를 못 막는다 (실측)", () => {
  const NATIVE_STACK =
    "node_modules/@react-navigation/native-stack/lib/module/views/NativeStackView.native.js"

  it("native-stack 이 안드로이드에서는 그 값을 무조건 false 로 넘긴다", () => {
    const source = readRaw(NATIVE_STACK)
    expect(source).toMatch(
      /gestureEnabled:\s*Platform\.OS === 'android' \?[\s\S]{0,200}?false : gestureEnabled/u,
    )
  })

  it("그래서 레이아웃의 옵션은 그대로 두되(iOS 엣지 스와이프) 화면이 따로 막는다", () => {
    const layout = read("app/(write)/_layout.tsx")
    // iOS 쪽 처방은 여전히 필요하다 — 지우면 엣지 스와이프가 되살아난다.
    expect(layout).toMatch(/gestureEnabled:\s*false/u)
  })
})

describe("`usePreventRemove` 가 이 저장소 버전에 실제로 있다", () => {
  const CORE = "node_modules/@react-navigation/core"
  const NATIVE = "node_modules/@react-navigation/native"

  it("core 가 내보낸다", () => {
    expect(readRaw(`${CORE}/lib/typescript/src/index.d.ts`)).toMatch(
      /export \{ usePreventRemove \} from '\.\/usePreventRemove'/u,
    )
  })

  it("`@react-navigation/native` 가 그것을 재수출한다 — 화면이 거기서 가져온다", () => {
    expect(readRaw(`${NATIVE}/lib/typescript/src/index.d.ts`)).toMatch(
      /export \* from '@react-navigation\/core'/u,
    )
  })

  it("`useRoute()` 를 쓰므로 레이아웃이 아니라 **화면 안**에서만 부를 수 있다", () => {
    const impl = readRaw(`${CORE}/lib/module/usePreventRemove.js`)
    expect(impl).toContain("useRoute")
    expect(impl).toContain("beforeRemove")
  })

  it("다시 던진 동작은 두 번 잡히지 않는다 — 우리 탈출구의 근거", () => {
    // `allowExitRef` 분기가 기대는 계약. 라이브러리가 이걸 버리면 화면이 갇힌다.
    const impl = readRaw(`${CORE}/lib/module/useOnPreventRemove.js`)
    expect(impl).toContain("VISITED_ROUTE_KEYS")
    expect(impl).toMatch(/if \(visitedRouteKeys\.has\(route\.key\)\)/u)
  })
})

describe.each(GUARDED)("$file — 초안 백 가드", (screen) => {
  const source = read(screen.file)

  it("`usePreventRemove` 를 부른다", () => {
    expect(source).toContain("usePreventRemove(")
    expect(source).toMatch(
      /import \{[^}]*usePreventRemove[^}]*\} from "@react-navigation\/native"/u,
    )
  })

  it("**그 화면의** 초안 신호로 건다 — 빈 편집기는 한 번에 나간다", () => {
    expect(source).toContain(`usePreventRemove(${screen.signal}`)
    // 조건 없이 막으면 잃을 것 없는 사람을 한 번 더 누르게 한다.
    expect(source).not.toMatch(/usePreventRemove\(\s*true/u)
  })

  it("그 신호는 실제 내용에서 나온다(상수로 굳지 않았다)", () => {
    expect(source).toContain(screen.signalSource)
  })

  it("확인창은 그 화면이 이미 쓰던 것 하나뿐이다", () => {
    expect(source).toContain(screen.dialog)
  })

  it("나가기로 결정한 뒤에는 통과시킨다 — 확인창이 되뜨는 가둠이 없다", () => {
    expect(source).toContain("navigation.dispatch(data.action)")
    // 확인 뒤 + 등록/저장 성공 뒤, 최소 두 자리에서 깃발이 선다.
    const raised = source.match(/allowExitRef\.current = true/gu) ?? []
    expect(raised.length).toBeGreaterThanOrEqual(2)
  })
})

describe("레이아웃은 여전히 조건 없이 막지 않는다", () => {
  it("`(write)/_layout.tsx` 에는 `usePreventRemove` 가 없다", () => {
    // 여기서 부르면 `useRoute()` 가 레이아웃의 라우트를 집고, 빈 폼도 갇힌다.
    expect(read("app/(write)/_layout.tsx")).not.toContain("usePreventRemove")
  })
})
