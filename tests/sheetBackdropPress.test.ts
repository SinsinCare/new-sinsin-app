/*
  스크림 탭이 **gorhom 의 터치 상태에 의존하지 않는다** 는 결정을 못박는다.

  ── 이 테스트가 무엇인지, 무엇이 아닌지 ─────────────────────────────────────
  이 저장소에는 렌더러가 없다(`tests/helpers/reactNativeStub.js` 머리말). 그래서
  "열리는 중에 눌러도 닫힌다" 를 **행동으로** 재는 것은 여기가 아니라 실기기
  하네스다(`scratchpad/v2/sweep-backdrop.mjs`: 0·50·100·150·200·300ms 에 탭해
  픽셀로 판정). 이 파일은 그 하네스가 CI 에 없다는 사실을 메우는 **결정 고정**이다:
  누가 `pressBehavior="close"` 로 되돌리면 여기서 걸린다.

  ── 왜 되돌리면 안 되는가 ───────────────────────────────────────────────
  `BottomSheetBackdrop` 은 자기 `pointerEvents` 를 UI 스레드의 `useAnimatedReaction`
  → `runOnJS` → `setState` 로 정한다. 마운트 직후 `animatedIndex <= disappearsOnIndex`
  가 참이라 **먼저 "none" 으로 내려간 뒤** 왕복을 거쳐 "auto" 로 돌아오므로, 시트가
  올라오는 첫 ~100ms 동안 스크림은 보이지만 눌리지 않는다. 2026-08-24 릴리즈 빌드
  실측: 0·50·100ms 에 탭하면 시트가 그대로 열린 채 남고 150ms 부터 정상이었다.
*/
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SOURCE = readFileSync(
  join(__dirname, "../src/design-system-v2/components/V2BottomSheet.tsx"),
  "utf8",
)

/** 주석 안의 언급은 규칙이 아니다 — 코드 줄만 본다. */
const CODE_LINES = SOURCE.split("\n").filter((line) => {
  const trimmed = line.trim()
  return (
    trimmed.length > 0 &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("*") &&
    !trimmed.startsWith("/*")
  )
})
const CODE = CODE_LINES.join("\n")

describe("V2BottomSheet 스크림 탭", () => {
  test("gorhom 의 pressBehavior 로 닫지 않는다", () => {
    expect(CODE).toContain('pressBehavior="none"')
    expect(CODE).not.toContain('pressBehavior="close"')
  })

  test("우리가 깐 누름 층이 스크림 자리에 있고 requestClose 로 간다", () => {
    // 백드롭 슬롯 안에 우리 Pressable 이 있어야 한다 — 시트 본문의 다른 Pressable 이
    // 우연히 통과시키지 않도록 `renderBackdrop` 블록만 잘라서 본다.
    const start = CODE.indexOf("const renderBackdrop")
    expect(start).toBeGreaterThan(-1)
    const block = CODE.slice(start, CODE.indexOf("const renderHandle", start))

    expect(block).toContain("<Pressable")
    expect(block).toContain("onPress={requestClose}")
    expect(block).toContain("StyleSheet.absoluteFill")
  })

  test("음성 대조 — 이 검사는 아무 파일에나 통과하지 않는다", () => {
    /*
      통과-전용 오라클을 막는 대조군이다. 스크림을 다루지 않는 다른 v2 컴포넌트에
      같은 잣대를 대면 반드시 실패해야 한다.
    */
    const unrelated = readFileSync(
      join(__dirname, "../src/design-system-v2/components/V2Button.tsx"),
      "utf8",
    )
    expect(unrelated).not.toContain("const renderBackdrop")
  })
})
