/*
  오버레이 게이트의 **생존성(liveness)** 을 못박는다.

  이 저장소가 이미 여러 번 데인 자리는 언제나 같은 모양이었다: 어떤 신호 하나가
  유실되면 게이트가 영원히 안 풀리고, 그 게이트는 앱의 모든 모달이 지나는 길목이라
  **앱 전체가 얼어붙는다**. 사용자에게는 "버튼을 눌러도 아무 일도 안 일어난다" 로만
  보이고 로그도 예외도 없다.

  안전성(safety, "겹치지 않는다") 테스트는 이미 `appModalGate.test.ts` 에 있다.
  여기 있는 것은 그 반대편이다 — **신호를 잃었을 때 회복하는가.** 두 축은 서로를
  대신하지 못한다: 아무것도 진행시키지 않는 구현은 안전성 테스트를 전부 통과한다.

  각 테스트는 "고장을 주입하고 그래도 끝나는가" 를 재므로, 마감시한을 제거하면
  타임아웃으로 죽는다(변이 검증 2026-08-24로 확인).
*/
import {
  afterModalTransitions,
  enqueueTransition,
  markModalGone,
  markModalPresented,
  visibleModalCount,
  whenRegistryChanges,
  whenTransitionsIdle,
  withDeadline,
} from "../src/shared/components/appModalGate"

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/*
  레지스트리는 **모듈 전역**이라 앞 테스트가 뒤로 샌다. 실제로 샜다: 유실을 재현하려고
  일부러 해제하지 않은 id 가 다음 테스트의 `visibleModalCount()` 를 1 로 만들어
  "0 이어야 한다" 를 깼다. 이 파일이 쓰는 id 를 한곳에 모아 두고 매번 비운다.
*/
const TEST_MODAL_IDS = [9_001, 9_002]
function resetRegistry() {
  TEST_MODAL_IDS.forEach(markModalGone)
}

describe("게이트 생존성 — 신호를 잃어도 앱이 멈추지 않는다", () => {
  beforeEach(resetRegistry)
  afterEach(resetRegistry)

  test("해제 신호를 영영 못 받아도 형제 대기는 상한 안에서 끝난다", async () => {
    /*
      `whenRegistryChanges()` 는 "레지스트리가 **다음에** 변할 때" 만 풀린다.
      해제를 한 번 잃으면 그 다음 변화가 오지 않으므로 그대로 영원히 park 된다.
      AppModal 의 present 경로가 정확히 이 대기를 돌고 있었다.
    */
    markModalPresented(9_001)
    expect(visibleModalCount()).toBe(1)

    const startedAt = Date.now()
    // 아무도 markModalGone 을 부르지 않는다 — 신호 유실을 그대로 재현한다.
    await withDeadline(whenRegistryChanges(), 120)
    const elapsed = Date.now() - startedAt

    expect(elapsed).toBeLessThan(1_000)
    // 대기가 풀렸을 뿐 사실은 그대로다 — 마감시한은 사실을 바꾸지 않는다.
    expect(visibleModalCount()).toBe(1)
  })

  test("큐가 계속 차 있어도 afterModalTransitions 는 끝난다", async () => {
    /*
      `dialog.ts` 가 모든 명령형 다이얼로그의 Promise 를 이 대기 뒤로 옮긴 뒤로,
      여기서 안 풀리면 확인창을 누른 화면의 콜백이 영영 안 돌아온다.
      큐를 인위적으로 오래 잡아 두고 그래도 함수가 반환하는지 본다.
    */
    let release!: () => void
    const held = new Promise<void>((r) => {
      release = r
    })
    const job = enqueueTransition(() => held)

    const startedAt = Date.now()
    await afterModalTransitions()
    const elapsed = Date.now() - startedAt

    // 상한(2초) + 앞뒤 delay(50·80ms) 를 넘기지 않는다.
    expect(elapsed).toBeLessThan(4_000)

    release()
    await job
    await whenTransitionsIdle()
  }, 10_000)

  test("마감시한은 정상 경로를 늦추지 않는다 — 신호가 오면 즉시 풀린다", async () => {
    /*
      느슨한 상한을 붙여 놓고 "회복한다" 고 말하는 것으로는 부족하다. 상한이
      **정상 경로에서는 아무 값도 하지 않아야** 한다. 안 그러면 모든 다이얼로그가
      2초씩 느려진 채로 초록이 뜬다.
    */
    markModalPresented(9_002)
    const waiting = withDeadline(whenRegistryChanges(), 5_000)

    const startedAt = Date.now()
    setTimeout(() => markModalGone(9_002), 20)
    await waiting
    const elapsed = Date.now() - startedAt

    expect(elapsed).toBeLessThan(500)
    expect(visibleModalCount()).toBe(0)
  })

  test("withDeadline 은 늦게 온 신호에도 두 번 resolve 하지 않는다", async () => {
    let resolveLate!: () => void
    const late = new Promise<void>((r) => {
      resolveLate = r
    })

    let settled = 0
    await withDeadline(late, 30).then(() => {
      settled += 1
    })
    resolveLate()
    await delay(50)

    expect(settled).toBe(1)
  })
})
