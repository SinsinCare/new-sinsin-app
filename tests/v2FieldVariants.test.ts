/**
 * `V2TextField` 에 늘어난 축 4개와 `V2SelectField` 를 고정한다
 * (docs/design/community-redesign/00-MASTER.md §4-G14·G15·G16·G17).
 *
 * ## 무엇을 지키는가
 *
 * 1. **기본값은 오늘의 렌더 그대로.** 이 디자인시스템은 233파일이 들여온다. 새 축의
 *    기본값이 상자 하나라도 다르게 그리면 그 회귀는 커뮤니티가 아니라 **전 화면**에서
 *    난다. 그래서 `tone`/`clearable`/`inputComponent` 를 안 준 필드의 상자가 예전
 *    값(흰 면 · 1px `line.normal` · radius 14 · 54pt)과 같은지 먼저 본다.
 * 2. **단일행 입력에는 `lineHeight` 가 없다.** 집안 규칙(`singleLineInputText`)이고,
 *    깨지면 iOS 에서 placeholder·값이 상자 아래쪽으로 치우친다 — 조용히 이상해 보이는
 *    부류라 눈으로는 잘 안 잡힌다.
 * 3. **`V2SelectField` 는 상자를 스스로 그리지 않는다.** 같은 화면에 세로로 나란히 서는
 *    두 칸이라, 각자 radius·테두리·높이를 적으면 언젠가 한쪽만 바뀐다.
 *
 * ## 왜 절반은 소스 계약인가
 *
 * 이 저장소의 jest 에는 렌더러가 없다(`tests/helpers/hookHarness.ts` 머리말 · 실측).
 * 그래서 **스타일 계산은 실제 함수를 불러서**(`v2FieldChrome`/`v2InputTypography`),
 * JSX 로만 표현되는 사실(어떤 컴포넌트로 그리는가·언제 지우기 버튼이 나오는가)은
 * **주석을 걷어낸 소스**로 본다. 주석을 걷어내는 이유는 이 저장소가 고친 결함의 코드
 * 모양을 주석에 그대로 인용하기 때문이다(`tests/helpers/codeOnly.ts` 머리말).
 */
/* eslint-disable import/first */
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (spec: never) => spec },
  StyleSheet: { create: (sheet: unknown) => sheet },
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  useColorScheme: () => "light",
}))

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { codeOnly } from "./helpers/codeOnly"
import {
  v2FieldChrome,
  v2InputTypography,
} from "@/src/design-system-v2/components/V2TextField"
import {
  semanticDark,
  semanticLight,
} from "@/src/design-system-v2/tokens/colors"
import { borderWidth, radius, spacing } from "@/src/design-system-v2/tokens"
import { typography } from "@/src/design-system-v2/tokens/typography"

const ROOT = join(__dirname, "..")
/** 주석을 걷어내고 줄바꿈을 지운다 — 계약이 prettier 의 줄 나누기에 걸리지 않게. */
function source(path: string): string {
  return codeOnly(readFileSync(join(ROOT, path), "utf-8")).replace(/\s+/g, " ")
}

const TEXT_FIELD = "src/design-system-v2/components/V2TextField.tsx"
const SELECT_FIELD = "src/design-system-v2/components/V2SelectField.tsx"

const base = {
  colors: semanticLight,
  focused: false,
  disabled: false,
  error: false,
}

describe("V2TextField — 기본값은 오늘의 상자 그대로", () => {
  it("outlined box: 흰 면 · 1px line.normal · radius 14 · 54pt", () => {
    const { field } = v2FieldChrome(base)

    expect(field.minHeight).toBe(54)
    expect(field.borderRadius).toBe(radius.xl)
    expect(field.borderWidth).toBe(borderWidth.thin)
    expect(field.borderColor).toBe(semanticLight.line.normal)
    expect(field.backgroundColor).toBe(semanticLight.background.default)
    expect(field.paddingHorizontal).toBe(spacing[16])
    expect(field.paddingVertical).toBe(spacing[10])
  })

  it("멀티행 box 는 최소 80 으로 시작한다", () => {
    expect(v2FieldChrome({ ...base, multiline: true }).field.minHeight).toBe(80)
  })

  it("포커스는 면을 주황 틴트로, 라벨을 브랜드색으로 바꾼다", () => {
    const { field, labelColor } = v2FieldChrome({ ...base, focused: true })
    expect(field.backgroundColor).toBe(semanticLight.primary.primaryWeak)
    expect(labelColor).toBe(semanticLight.primary.primary)
  })

  it("grow 입력은 면만 중립으로 두고 라벨은 그대로 브랜드색이다", () => {
    // 화면 높이를 다 먹는 입력란을 주황으로 칠하면 힌트가 아니라 배경색으로 읽힌다.
    // 라벨 색까지 같이 껐다면 그건 다른 회귀다 — 둘을 따로 본다.
    const { field, labelColor } = v2FieldChrome({
      ...base,
      focused: true,
      surfaceFocusTint: false,
    })
    expect(field.backgroundColor).toBe(semanticLight.background.default)
    expect(labelColor).toBe(semanticLight.primary.primary)
  })

  it("에러는 테두리·라벨·헬퍼를 한꺼번에 negative 로 돌린다", () => {
    const { field, labelColor, messageColor } = v2FieldChrome({
      ...base,
      error: true,
    })
    expect(field.borderColor).toBe(semanticLight.status.negative)
    expect(labelColor).toBe(semanticLight.status.negative)
    expect(messageColor).toBe(semanticLight.status.negative)
  })

  it("disabled 면은 fill.normal", () => {
    expect(
      v2FieldChrome({ ...base, disabled: true }).field.backgroundColor,
    ).toBe(semanticLight.fill.normal)
  })

  it("line 변형은 2px 밑줄 그대로 — radius 를 갖지 않는다", () => {
    const { field } = v2FieldChrome({ ...base, variant: "line" })
    expect(field.borderBottomWidth).toBe(borderWidth.thick)
    expect(field.borderBottomColor).toBe(semanticLight.line.normal)
    expect(field.borderRadius).toBeUndefined()
    expect(field.paddingHorizontal).toBe(0)
  })
})

describe("V2TextField — tone='filled' (G16)", () => {
  it("테두리 없는 옅은 면 + radius 16", () => {
    const { field } = v2FieldChrome({ ...base, tone: "filled" })
    expect(field.backgroundColor).toBe(semanticLight.fill.alternative)
    expect(field.borderWidth).toBe(0)
    expect(field.borderColor).toBeUndefined()
    expect(field.borderRadius).toBe(radius["2xl"])
  })

  it("포커스에도 면이 물들지 않는다 — 테두리가 없어서 상자가 아니라 화면이 물든다", () => {
    const { field } = v2FieldChrome({ ...base, tone: "filled", focused: true })
    expect(field.backgroundColor).toBe(semanticLight.fill.alternative)
  })

  it("다크에서도 토큰을 따라간다 — 색을 적어 넣지 않았다는 증거", () => {
    const { field } = v2FieldChrome({
      ...base,
      colors: semanticDark,
      tone: "filled",
    })
    expect(field.backgroundColor).toBe(semanticDark.fill.alternative)
    expect(field.backgroundColor).not.toBe(semanticLight.fill.alternative)
  })

  it("면 변형은 box 에만 의미가 있다 — line 은 밑줄 그대로", () => {
    const { field } = v2FieldChrome({
      ...base,
      variant: "line",
      tone: "filled",
    })
    expect(field.borderBottomWidth).toBe(borderWidth.thick)
    expect(field.backgroundColor).toBeUndefined()
  })
})

describe("단일행 입력에는 lineHeight 가 없다 (집안 규칙)", () => {
  it("단일행: lineHeight 키 자체가 없다", () => {
    const single = v2InputTypography()
    expect(single).not.toHaveProperty("lineHeight")
    expect(single.fontSize).toBe(typography.body.mediumWeak.fontSize)
  })

  it("멀티행: 줄간격을 되돌려 준다", () => {
    expect(v2InputTypography(true).lineHeight).toBe(
      typography.body.mediumWeak.lineHeight,
    )
  })

  it("굵기는 face 로만 말한다 — fontWeight 를 흘리지 않는다", () => {
    expect(v2InputTypography()).not.toHaveProperty("fontWeight")
    expect(v2InputTypography().fontFamily).toBe(
      typography.body.mediumWeak.fontFamily,
    )
  })
})

describe("V2TextField — 입력 구현 갈아끼우기 (G14)", () => {
  const code = source(TEXT_FIELD)

  it("기본은 RN TextInput 이고, 넘어온 구현이 있으면 그것으로 그린다", () => {
    expect(code).toMatch(/const Input = inputComponent \?\? TextInput/)
    expect(code).toMatch(/<Input /)
  })

  it("gorhom 을 여기서 들여오지 않는다 — 시트 밖 소비처가 압도적으로 많다", () => {
    // 여기서 import 하면 이 필드를 쓰는 모든 화면이 시트 패키지를 끌고 오고,
    // BottomSheetTextInput 은 시트 컨텍스트 밖에서 마운트되면 던진다.
    expect(code).not.toMatch(/@gorhom\/bottom-sheet/)
    expect(code).not.toMatch(/V2SheetTextInput/)
  })
})

describe("V2TextField — 지우기 버튼 (G14)", () => {
  const code = source(TEXT_FIELD)

  it("값이 비면 버튼 자체가 없다 — 회색 비활성 버튼을 두지 않는다", () => {
    expect(code).toMatch(
      /const showClear = clearable && !disabled && \(value\?\.length \?\? 0\) > 0/,
    )
    expect(code).toMatch(/\{showClear && \(/)
  })

  it("민 ✕ 가 아니라 채운 원 + 흰 글리프다", () => {
    expect(code).toMatch(/backgroundColor: colors\.label\.assistive/)
    expect(code).toMatch(/color=\{colors\.static\.white\}/)
    expect(code).toMatch(/borderRadius: radius\.full/)
  })

  it("탭 타깃 44 는 hitSlop 으로 채운다", () => {
    expect(code).toMatch(
      /hitSlop=\{\(touchTarget\.min - CLEAR_DIAMETER\) \/ 2\}/,
    )
  })
})

describe("V2TextField — 라벨 (G15)", () => {
  const code = source(TEXT_FIELD)

  it("라벨이 노드도 받는다 — `(선택)` 보조 런·브랜드 별표를 소비처가 조립한다", () => {
    expect(code).toMatch(/label\?: string \| ReactNode/)
  })

  it("required 별표는 기존 그대로 둔다 — 색·앞공백을 바꾸면 오늘 쓰는 화면이 바뀐다", () => {
    expect(code).toMatch(/color: colors\.status\.negative \}\}> \*</)
  })
})

describe("V2SelectField (G17) — 상자를 스스로 그리지 않는다", () => {
  const code = source(SELECT_FIELD)

  it("V2TextField 의 상자 계산을 그대로 부른다", () => {
    expect(code).toMatch(/v2FieldChrome\(\{/)
    expect(code).toMatch(/from "\.\/V2TextField"/)
  })

  it("radius·테두리·최소높이를 자기 스타일에 적지 않는다", () => {
    expect(code).not.toMatch(/borderRadius/)
    expect(code).not.toMatch(/borderWidth/)
    expect(code).not.toMatch(/minHeight/)
  })

  it("값 타이포도 입력과 같은 함수에서 나온다", () => {
    expect(code).toMatch(/v2InputTypography\(\)/)
  })

  it("입력이 아니라 버튼이다 — TextInput 을 쓰지 않는다", () => {
    // editable={false} 인 TextInput 은 스크린리더에 입력으로 읽히고,
    // 안드로이드에서는 롱프레스 시 붙여넣기 메뉴가 뜬다.
    expect(code).not.toMatch(/TextInput/)
    expect(code).toMatch(/accessibilityRole="button"/)
  })

  it("트레일링 캐럿은 chevronDown 20 · label.assistive", () => {
    expect(code).toMatch(
      /name="chevronDown" size="sm" color=\{colors\.label\.assistive\}/,
    )
  })

  it("고른 값과 안내문의 색이 다르다", () => {
    expect(code).toMatch(
      /color: hasValue \? colors\.label\.normal : colors\.label\.alternative/,
    )
  })
})
