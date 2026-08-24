/**
 * **닫히다 만 시트가 앱을 먹통으로 만들지 않는가.**
 *
 * `V2BottomSheet` 는 `rendered` 인 동안 전면 네이티브 모달(`AppModal`)이다. 닫힘
 * 애니메이션을 끝까지 보여 주려고 `visible=false` 이후에도 잠시 살려 두는데,
 * 그것을 내리는 신호가 gorhom 의 `onChange(-1)` **하나뿐**이었다.
 *
 * 그 신호는 안 올 수 있다:
 *  - 한 번도 열린 적이 없어 인덱스가 이미 -1 이면 `close()` 가 아무 변화도 안 만든다
 *  - `sheetRef` 가 붙기 전 틱에 `visible` 이 꺼지면 `close()` 자체가 no-op 이다
 *
 * 그러면 **투명한 전면 모달이 영원히 남는다.** 화면은 멀쩡해 보이는데 그 아래의
 * 모든 탭이 죽고, `AppModal` 의 전역 게이트가 "형제 모달이 보이는 중" 으로 판단해
 * **앱의 다른 시트·확인창도 전부 안 뜬다.** 사용자에게는 "버튼이 안 눌린다",
 * "한 번에 안 닫힌다" 로 보인다.
 *
 * ■ 왜 소스 계약으로 확인하나
 *
 * 이 저장소에는 렌더러가 없다(`tests/helpers/hookHarness.ts` 머리말). 타이머가
 * 실제로 도는지 보려면 `@testing-library/react-native` 와 RN 프리셋이 필요하고,
 * 그것을 들이는 것은 이 한 줄을 지키자고 낼 값이 아니다. 대신 **되돌리면 깨지도록**
 * 세 가지를 못박는다 — 탈출구의 존재, 마감시한이 애니메이션보다 길다는 것,
 * 그리고 정리 함수로 타이머를 반드시 거둔다는 것.
 */
import fs from "node:fs"
import path from "node:path"

const SOURCE = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "src",
    "design-system-v2",
    "components",
    "V2BottomSheet.tsx",
  ),
  "utf8",
)

describe("시트 닫힘 마감시한", () => {
  test("onChange(-1) 말고도 모달을 내리는 길이 있다", () => {
    expect(SOURCE).toMatch(
      /setTimeout\(\(\) => setRendered\(false\), CLOSE_DEADLINE_MS\)/u,
    )
  })

  test("마감시한은 닫힘 애니메이션보다 넉넉히 길다", () => {
    const match = SOURCE.match(/const CLOSE_DEADLINE_MS = (\d+)/u)
    expect(match).not.toBeNull()
    const ms = Number(match![1])
    // gorhom 닫힘은 길어야 ~350ms. 그보다 짧으면 정상 경로의 시트가 애니메이션
    // 도중에 툭 끊긴다 — 고치려던 것보다 눈에 띄는 퇴행이다.
    expect(ms).toBeGreaterThanOrEqual(600)
    // 반대로 너무 길면 굳었을 때 사용자가 그 시간만큼 먹통을 겪는다.
    expect(ms).toBeLessThanOrEqual(2000)
  })

  test("타이머를 정리 함수로 거둔다", () => {
    // 안 거두면 열림→닫힘을 빠르게 반복할 때 낡은 타이머가 **다음** 열림을 지운다.
    expect(SOURCE).toMatch(/return \(\) => clearTimeout\(timer\)/u)
  })
})
