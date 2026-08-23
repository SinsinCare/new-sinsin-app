/**
 * `V2BottomSheet` 의 고정 높이 탈출구(`snapPoints`)와 도킹 푸터(`footer`)를 고정한다
 * (docs/design/community-redesign/00-MASTER.md §4-G13).
 *
 * ## 이 파일이 정말로 막는 것
 *
 * `V2BottomSheet` 는 앱의 **유일한 시트 계보**다(메모리: `bottom-sheet-one-lineage`).
 * 여기서 난 회귀는 28곳의 시트에 한꺼번에 간다. 그래서 새 축보다 **안 건드린 것**을 먼저
 * 센다.
 *
 * 그리고 스냅에는 이 저장소가 이미 한 번 데인 함정이 있다
 * (메모리: `sinsin-sheet-snap-trap`, 2026-08-04 레시피 필터 시트):
 *
 *   프레임은 **가장 큰 스냅 높이**로 눕고, 지금 스냅보다 아래는 화면 밖이다.
 *   그 상태에서 바닥에 CTA 를 붙이면 CTA 가 처음부터 안 보인다.
 *   ("CTA 가 안 보이면 flex 를 만지기 전에 snapPoints 개수부터 볼 것.")
 *
 * gorhom 은 여기에 한 겹을 더 얹는다 — `enableDynamicSizing` 이 켜져 있으면 **콘텐츠
 * 높이로 만든 스냅을 사용자가 준 목록에 하나 더 밀어 넣는다**(`useAnimatedDetents`).
 * 즉 "스냅을 줬는데 dynamic sizing 도 켜 둔" 시트는 자기도 모르게 스냅이 둘이 되어 위
 * 함정에 그대로 빠진다. `v2SheetSizing` 이 그 조합을 구조적으로 못 만들게 한다.
 *
 * ## 왜 절반은 소스 계약인가
 *
 * 이 저장소의 jest 에는 렌더러가 없다. 그래서 **판단은 실제 함수를 불러서**
 * (`v2SheetSizing`), JSX 배선은 **주석을 걷어낸 소스**로 본다
 * (`tests/helpers/codeOnly.ts` 머리말 — 이 파일들은 고친 결함의 코드 모양을 주석에
 * 그대로 인용하므로, 원문에 대고 검사하면 주석이 계약을 대신 만족시킨다).
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

const ROOT = join(__dirname, "..")
const SHEET = "src/design-system-v2/components/V2BottomSheet.tsx"
/** 주석을 걷어내고 줄바꿈을 지운다 — 계약이 prettier 의 줄 나누기에 걸리지 않게. */
const code = codeOnly(readFileSync(join(ROOT, SHEET), "utf-8")).replace(
  /\s+/g,
  " ",
)

describe("v2SheetSizing — 스냅을 안 주면 오늘 그대로", () => {
  it("기본은 콘텐츠 높이다", () => {
    expect(v2SheetSizing()).toEqual({
      enableDynamicSizing: true,
      fillsFrame: false,
    })
  })

  it("빈 배열도 콘텐츠 높이로 떨어뜨린다 — gorhom 이 던지는 조합을 만들지 않는다", () => {
    // "스냅도 없고 dynamic sizing 도 없는" 시트는 gorhom 이 invariant 로 던진다.
    expect(v2SheetSizing([])).toEqual({
      enableDynamicSizing: true,
      fillsFrame: false,
    })
  })
})

describe("v2SheetSizing — 스냅을 주면 고정 높이", () => {
  it("dynamic sizing 을 끈다 — 켜 두면 gorhom 이 스냅을 하나 더 끼워 넣는다", () => {
    expect(v2SheetSizing(["86%"])).toEqual({
      snapPoints: ["86%"],
      enableDynamicSizing: false,
      fillsFrame: true,
    })
  })

  it("숫자 스냅도 같은 길로 간다", () => {
    expect(v2SheetSizing([400]).enableDynamicSizing).toBe(false)
  })

  it("스냅이 여럿이면 프레임을 채우지 않는다 (2026-08-04 함정)", () => {
    // 프레임은 가장 큰 스냅으로 눕는다. 거기에 콘텐츠를 꽉 채우고 바닥에 컴포저를
    // 붙이면, 작은 스냅에서 그 컴포저는 화면 밖이다.
    const many = v2SheetSizing(["50%", "86%"])
    expect(many.enableDynamicSizing).toBe(false)
    expect(many.fillsFrame).toBe(false)
  })
})

describe("V2BottomSheet — 배선", () => {
  it("시트가 판단을 v2SheetSizing 에 맡긴다 — 두 값이 따로 놀지 않게", () => {
    expect(code).toMatch(/snapPoints=\{sizing\.snapPoints\}/)
    expect(code).toMatch(/enableDynamicSizing=\{sizing\.enableDynamicSizing\}/)
  })

  it("고정 높이일 때만 콘텐츠가 프레임 바닥까지 늘어난다", () => {
    // gorhom 의 BottomSheetView 는 position:absolute + top:0 이라 기본이 콘텐츠 높이다
    // (그래야 dynamic sizing 이 그 높이를 잰다). 늘 늘려 두면 그 계산이 죽는다.
    expect(code).toMatch(/sizing\.fillsFrame \? \{ bottom: 0 \} : null/)
  })

  it("콘텐츠 스타일은 배열이 아니라 객체 하나다", () => {
    // gorhom 의 enableFooterMarginAdjustment 는 배열을 StyleSheet.compose(...style)
    // 로 합치는데 compose 는 인자를 둘만 받는다 — 세 번째부터 조용히 사라진다.
    expect(code).toMatch(/<BottomSheetView[^<]*style=\{contentStyle\}/)
    expect(code).not.toMatch(/<BottomSheetView[^<]*style=\{\[/)
  })

  it("푸터는 gorhom 의 footerComponent 로 간다 — 키보드를 따라오게", () => {
    expect(code).toMatch(
      /footerComponent=\{footer != null \? renderFooter : undefined\}/,
    )
    expect(code).toMatch(/<BottomSheetFooter \{\.\.\.props\}/)
    expect(code).toMatch(/bottomInset=\{insets\.bottom\}/)
  })

  it("푸터가 있으면 그 높이만큼 콘텐츠 하단을 비운다", () => {
    expect(code).toMatch(/enableFooterMarginAdjustment=\{footer != null\}/)
  })

  it("키패드 내려갈 때의 0번 스냅 보정은 콘텐츠 높이 시트에서만 돈다", () => {
    // 고정 스냅에서는 gorhom 의 restore 가 detents[currentIndex] 로 정확히 되돌린다.
    // 거기서까지 0번으로 밀면 위 스냅으로 끌어 올린 시트가 키패드마다 내려앉는다.
    expect(code).toMatch(/Keyboard\.addListener/)
    expect(code).toMatch(/if \(!sizing\.enableDynamicSizing\) return/)
  })
})

describe("V2BottomSheet — 되돌리면 안 되는 것들이 그대로 있다", () => {
  it("껍데기는 AppModal, RNGH 루트는 모달 안쪽", () => {
    expect(code).toMatch(/<AppModal/)
    expect(code).toMatch(/<GestureHandlerRootView/)
    expect(code.indexOf("<AppModal")).toBeLessThan(
      code.indexOf("<GestureHandlerRootView"),
    )
  })

  it("콘텐츠 팬은 꺼 둔다 — 소비처의 스크롤과 다투지 않게", () => {
    expect(code).toMatch(/enableContentPanningGesture=\{false\}/)
  })

  it("안드로이드 키보드 입력 모드는 adjustPan (adjustResize 아님)", () => {
    // adjustResize 면 gorhom 이 "OS 가 알아서 줄인다" 고 보고 아무것도 하지 않는데,
    // 이 시트는 네이티브 Modal 안이라 그 리사이즈를 물려받지 못한다.
    expect(code).toMatch(/android_keyboardInputMode="adjustPan"/)
    expect(code).not.toMatch(/android_keyboardInputMode="adjustResize"/)
  })

  it("아래로 쓸어 닫기와 닫힘 애니메이션 짝이 살아 있다", () => {
    expect(code).toMatch(/enablePanDownToClose/)
    expect(code).toMatch(/closingByPropRef/)
  })
})
