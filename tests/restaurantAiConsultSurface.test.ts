/**
 * 식당 상세 **AI 식단 상담** 시트가 서는 두 바닥을 고정한다 —
 * 시트 역학(`V2BottomSheet` 의 `layout="fill"`)과 계측 자리(`restaurant_ai_consult`).
 *
 * ## 왜 이 둘이 한 파일인가
 *
 * 둘 다 시트 하나 때문에 **공용 파일**에 생긴 것이다. `V2BottomSheet` 는 앱의 유일한 시트
 * 계보이고(메모리: `bottom-sheet-one-lineage`), `events.ts` 의 열거는 앱 전체가 공유한다.
 * 여기서 난 회귀는 상담 시트가 아니라 **다른 모든 시트**에 간다. 그래서 새로 생긴 것보다
 * **안 건드린 것**을 먼저 센다.
 *
 * ## 왜 `enableDynamicSizing` 이 아니라 고정 스냅인가 (gorhom 5.2.8 원본 확인)
 *
 * 이 시트는 `keyboardBehavior="interactive"` 인데, 화면을 거의 채운 시트에는 키보드를 피해
 * **올라갈 여유가 없다** — `BottomSheet.tsx:843-856` 이
 * `max(0, highestDetentPosition - keyboardHeightInContainer)` 를 돌려주고, 752 짜리 시트의
 * `highestDetentPosition` 은 60 이라 키보드 336 에서는 0 이다. 그래서 gorhom 은 위치가
 * 아니라 **콘텐츠 상자를 줄인다**(`BottomSheetContent.tsx:96-110` 이 높이를 낮추고
 * `:183-213` 이 그 값을 명시 `height` 로 박는다).
 *
 * 콘텐츠 높이로 사는 시트에서는 그 상자 안의 자식이 여전히 자기 높이를 주장하므로,
 * 상자만 줄고 **입력바가 키보드 밑으로 사라진다.** 고정 스냅이면 상자 높이가 시트 높이에서
 * 파생되고 자식은 `flex:1` 로 따라가므로 목록만 줄어든다.
 *
 * ## 고정 스냅만으로는 아직 반쪽이다 — 컨테이너가 **흐름 자식**이어야 한다
 *
 * 위 보정의 나머지 절반은 마스크 컨테이너의 `paddingBottom` 에 키보드 높이를 얹는 쪽이다
 * (`BottomSheetContent.tsx:168-170`). 그 자리를 존중하는 것은 흐름 자식뿐이다 —
 * `BottomSheetView` 가 강제하는 `position:absolute` + `bottom: 0` 은 부모 padding 을
 * 빼지 않아(yoga `AbsoluteLayout.cpp:311-320`) 키보드 몫까지 먹고, 같은 실패가 그대로
 * 되돌아온다. 그래서 fill 의 컨테이너 갈래를 아래에서 잠근다.
 *
 * ## 이 파일이 못 잡는 것 (정직하게)
 *
 * 시트가 실제로 몇 pt 로 뜨는지, 키보드가 올라왔을 때 입력바가 보이는지는 **여기서 못
 * 잡는다.** 이 저장소의 jest 에는 렌더러가 없다(`tests/helpers/hookHarness.ts` 머리말).
 * 잡을 수 있는 것은 "우리가 gorhom 에 무엇을 넘기는가" 까지고, 그 뒤는 실기기 몫이다
 * (iOS 소프트 키패드 ⌘K · 안드로이드 `show_ime_with_hard_keyboard`).
 */
/* eslint-disable import/first */
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (spec: never) => spec },
  StyleSheet: { create: (sheet: unknown) => sheet, absoluteFill: {} },
  Keyboard: { addListener: () => ({ remove: () => {} }) },
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  Modal: "Modal",
  useColorScheme: () => "light",
  useWindowDimensions: () => ({ width: 375, height: 812 }),
}))
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: "GestureHandlerRootView",
}))
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: "Animated.View" },
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@gorhom/bottom-sheet", () => ({
  __esModule: true,
  default: "BottomSheet",
  BottomSheetBackdrop: "BottomSheetBackdrop",
  BottomSheetFooter: "BottomSheetFooter",
  BottomSheetView: "BottomSheetView",
}))

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { codeOnly } from "./helpers/codeOnly"
import { v2SheetSizing } from "@/src/design-system-v2/components/V2BottomSheet"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import {
  sanitizeAnalyticsProperties,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
  type AnalyticsSurface,
} from "@/src/features/analytics/events"

/**
 * 서버 `sinsin-be-bun/src/domains/analytics/record.ts` 의 금지 키 정규식 **사본**
 * (`tests/analyticsCrossCutting.test.ts:33` 과 같은 줄, 같은 이유). 클라 정규식만 보면
 * `search`·`secret` 처럼 서버에만 있는 단어에 걸려 조용히 사라진다.
 */
const SERVER_FORBIDDEN_PROP_KEY =
  /(email|phone|password|token|secret|address|birth|name|query|search|text|title|content|message|url)/i

const ROOT = join(__dirname, "..")
/** 주석을 걷어낸다 — 이 파일의 주석은 계약의 코드 모양을 그대로 인용한다. */
const code = codeOnly(
  readFileSync(
    join(ROOT, "src/design-system-v2/components/V2BottomSheet.tsx"),
    "utf-8",
  ),
).replace(/\s+/g, " ")

describe("layout — 기본은 오늘 그대로다", () => {
  it("기본값이 auto 다", () => {
    // fill 이 기본이 되면 이 값을 안 주는 시트 **전부**가 전체 화면이 된다.
    expect(code).toMatch(/layout = "auto"/)
  })

  it("auto 는 갈래를 만들지 않는다 — 분기는 fill 쪽에만 있다", () => {
    expect(code).not.toMatch(/layout === "auto"/)
    expect(code).not.toMatch(/layout !== "fill"/)
  })

  it("fill 이 건드리는 것은 정확히 둘이다 (스냅 · 콘텐츠 컨테이너)", () => {
    /*
      셋째가 생기면 그것이 auto 에도 새는지 사람이 한 번 봐야 한다. 이 시트는 27곳이
      쓰는 공용 파일이라, "fill 에만 넣은 줄 알았다" 가 가장 비싼 실수다.

      두 자리는 `effectiveSnapPoints`(고정 스냅 하나)와 콘텐츠 컨테이너 갈래다.
      바닥 패딩은 셋째가 **아니다** — fill 은 `contentStyle` 자체를 안 쓰므로 거기에
      조건을 둘 이유가 없어졌다(아래 두 테스트).
    */
    expect(code.match(/layout === "fill"/g) ?? []).toHaveLength(2)
  })

  it("auto 의 바닥 패딩은 그대로 20 + safe-area 다 — 조건이 붙지 않는다", () => {
    /*
      `contentStyle` 은 이제 auto 전용이다(fill 은 `styles.fillContent`). 여기에
      `layout === "fill" ? 0 : ...` 를 남겨 두면 절대 안 켜지는 갈래가 되어, 다음 사람이
      "fill 의 바닥 패딩은 여기서 정한다" 고 잘못 읽는다.
    */
    expect(code).toMatch(/paddingBottom: spacing\[20\] \+ insets\.bottom/)
    expect(code).not.toMatch(/paddingBottom: layout === "fill"/)
  })

  it("auto 의 스냅은 소비처가 준 것 그대로다 — 파생 스냅이 끼어들지 않는다", () => {
    expect(code).toMatch(
      /layout === "fill" \? \(snapPoints \?\? fillSnapPoints\) : snapPoints/,
    )
  })
})

describe("fill — 스냅 하나짜리 고정 높이", () => {
  it("판단은 v2SheetSizing 한 곳에 그대로 남는다", () => {
    // fill 이 두 번째 사이징 경로를 만들면 두 값이 따로 놀기 시작한다.
    expect(code).toMatch(/v2SheetSizing\(effectiveSnapPoints\)/)
    expect(code).toMatch(/snapPoints=\{sizing\.snapPoints\}/)
    expect(code).toMatch(/enableDynamicSizing=\{sizing\.enableDynamicSizing\}/)
  })

  it("스냅은 화면 상한에서 16 을 뺀 **하나**다", () => {
    // 여럿이면 프레임이 가장 큰 스냅으로 눕고 바닥의 컴포저가 화면 밖이다
    // (메모리: `sinsin-sheet-snap-trap`, 2026-08-04 레시피 필터 시트).
    expect(code).toMatch(/\[maxDynamicContentSize - spacing\[16\]\]/)
  })

  it("그 스냅이면 dynamic sizing 이 꺼지고 프레임을 채운다", () => {
    // 375×812 · insets.top 44 → 상한 768, 스냅 752 = 시트 상단 y 60 (시안 E2_1).
    const snap = 812 - 44 - spacing[16]
    expect(snap).toBe(752)
    expect(v2SheetSizing([snap])).toEqual({
      snapPoints: [snap],
      enableDynamicSizing: false,
      fillsFrame: true,
    })
  })

  it("콘텐츠 컨테이너가 BottomSheetView 가 **아니다** — 흐름 안의 flex:1 View 다", () => {
    /*
      이 파일에서 렌더러 없이 지킬 수 있는 가장 중요한 한 줄이다.

      gorhom 은 키보드 대응을 마스크 컨테이너의
      `paddingBottom = overDragSafe + 키보드높이` 로 한다
      (`BottomSheetContent.tsx:168-170`, 그 값과 `height` 를 `:200-213` 이 함께 박는다).
      그런데 `BottomSheetView` 는 넘긴 스타일 **뒤에** 자기 `styles.container` 를 합쳐
      `position:absolute; top/left/right:0` 을 강제하고
      (`BottomSheetView.tsx:30-33` + `bottomSheetView/styles.ts:3-9`), 늘릴 변으로 남는
      `bottom: 0` 은 **부모의 padding 을 빼지 않는다** — yoga 는 inset 이 정의되면 높이를
      `measuredDimension(= border-box) - border - (top + bottom)` 로 잡는다
      (`react-native/ReactCommon/yoga/yoga/algorithm/AbsoluteLayout.cpp:311-320`).
      즉 자식이 키보드 몫으로 비워 둔 자리까지 먹어, 컴포저가 키보드 밑으로 사라진다.

      그래서 fill 의 컨테이너는 마스크 컨테이너의 평범한 **흐름 자식**이어야 한다.
      실제 픽셀은 여기서 못 잰다(렌더러 없음) — 잠글 수 있는 것은 "무엇을 렌더하는가"
      까지고, 그 뒤는 실기기 몫이다(iOS 소프트 키패드 ⌘K).
    */
    expect(code).toMatch(
      /layout === "fill" \? \( <View style=\{styles\.fillContent\}>\{sheetBody\}<\/View> \) : \( <BottomSheetView/,
    )
    // `<BottomSheetView` 는 파일에 **하나**뿐이고, 그 하나가 auto 갈래다.
    expect(code.match(/<BottomSheetView/g) ?? []).toHaveLength(1)
    // 그 흐름 자식은 `flex:1` 이다. 절대 위치로 되돌리는 값(bottom)이 붙으면 안 된다.
    expect(code).toMatch(/fillContent: \{ flex: 1 \}/)
  })

  it("auto 의 고정 높이 시트는 여전히 bottom: 0 으로 프레임을 채운다", () => {
    /*
      fill 이 갈라져 나갔다고 이쪽을 같이 바꾸면 27곳이 쓰는 갈래가 움직인다.
      (그 `bottom: 0` 이 키보드를 못 피한다는 것은 소스 주석에 적혀 있다 — 바닥에 입력을
      붙여야 하는 시트는 `snapPoints` 가 아니라 `layout="fill"` 로 간다.)
    */
    expect(code).toMatch(/sizing\.fillsFrame \? \{ bottom: 0 \} : null/)
  })

  it("layout 을 안 주면 여전히 콘텐츠 높이다", () => {
    expect(v2SheetSizing(undefined)).toEqual({
      enableDynamicSizing: true,
      fillsFrame: false,
    })
  })
})

describe("계측 — 상담 시트는 지도 AI 검색과 다른 자리다", () => {
  it("서페이스가 열거에 있고, 검색 시트와 겹치지 않는다", () => {
    /*
      타입이 이미 존재를 막지만(없으면 컴파일이 안 된다) 값이 갈린다는 것도 말해 둔다.
      한 자리로 접으면 `sheet_opened`/`sheet_dismissed` 의 체류가 "질문 한 줄 고르고
      닫음(수 초)" 과 "대화 몇 턴(수 분)" 의 평균이 되어 둘 다 못 읽는다.
    */
    const surfaces = [
      "restaurant_ai_consult",
      "restaurant_ai_search",
    ] satisfies AnalyticsSurface[]
    expect(new Set(surfaces).size).toBe(2)
  })

  const samples = {
    restaurant_ai_consult_question_tap: {
      restaurant_id: 12,
      kind: "compare",
      index: 2,
    },
    restaurant_ai_consult_send: { restaurant_id: 12, turn: 1 },
  } satisfies Partial<{
    [K in AnalyticsEventName]: AnalyticsEventProperties[K]
  }>

  const entries = Object.entries(samples) as [string, Record<string, unknown>][]

  it.each(entries)("%s 의 속성이 하나도 안 떨어진다", (_event, properties) => {
    // 클라: 통과한 것만 돌려준다. 입력과 같아야 아무것도 안 떨어진 것이다.
    expect(sanitizeAnalyticsProperties(properties)).toEqual(properties)
    // 서버: 무인증 쓰기 경로라 같은 키를 한 번 더 검사한다.
    expect(
      Object.keys(properties).filter((key) =>
        SERVER_FORBIDDEN_PROP_KEY.test(key),
      ),
    ).toEqual([])
  })

  it("질문 문장을 싣고 싶어지는 이름들은 두 새니타이저가 다 떨군다", () => {
    /*
      "어떤 질문이었나" 는 `kind` 로 갈린다. 문장을 실으면 **예외도 로그도 없이** 사라지고,
      타입에는 남아 있어 대시보드에서만 빈 칸으로 보인다.
    */
    for (const key of ["question_text", "message", "query"]) {
      expect(sanitizeAnalyticsProperties({ [key]: "물어본 문장" })).toEqual({})
      expect(SERVER_FORBIDDEN_PROP_KEY.test(key)).toBe(true)
    }
  })
})
