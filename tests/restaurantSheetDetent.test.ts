/**
 * 손을 뗐을 때 시트가 **어느 스냅으로 가는가**.
 *
 * 이 규칙이 왜 라이브러리 기본값과 다른지는 `sheetSnap.ts` 의 `resolveDetentIndex`
 * 머리말에 있다. 요약: 기본 규칙(`놓은 위치 + 0.2 × 속도` 의 최근접)은 **마우스 속도에서만**
 * 얌전하다. 실제 손가락 플릭(3,000pt/s)에서는 600pt 를 투영해 스냅을 건너뛴다.
 *
 * 아래 숫자는 iPhone 17 Pro(402×874)에서 실측한 배치다:
 * 접힘 = y 779, 중간 = y 396, 전체 = y 66. 인덱스가 커질수록 시트가 높다(y 가 작다).
 */

import {
  DETENT_FLICK_VELOCITY_PT_PER_SEC,
  resolveDetentIndex,
} from "../src/features/restaurant/sheetSnap"

/** [접힘, 중간, 전체] 의 윗변 y. */
const DETENTS = [779, 396, 66] as const
const COLLAPSED = 0
const MID = 1
const EXPANDED = 2

function decide(
  startPosition: number,
  releasePosition: number,
  velocityY: number,
) {
  return resolveDetentIndex({
    detents: DETENTS,
    startPosition,
    releasePosition,
    velocityY,
  })
}

describe("빠른 플릭이 스냅을 건너뛰지 않는다 (실측 재현)", () => {
  it("전체에서 180pt 를 3,000pt/s 로 튕겨 내리면 중간에서 멈춘다", () => {
    // 기본 규칙이었다면 66 + 180 + 0.2×3000 = 846 → 접힘까지 내려갔다.
    expect(decide(66, 66 + 180, 3000)).toBe(MID)
  })

  it("아무리 빨라도 한 번에 두 칸을 건너뛰지 않는다", () => {
    expect(decide(66, 66 + 180, 12000)).toBe(MID)
    expect(decide(779, 779 - 120, -12000)).toBe(MID)
  })

  it("접힘에서 위로 튕기면 중간까지만 온다", () => {
    expect(decide(779, 779 - 150, -2500)).toBe(MID)
  })
})

describe("짧게 튕겨도 반드시 한 칸 움직인다", () => {
  it("30pt 만 올려도 플릭이면 중간으로 간다", () => {
    // 기본 규칙이었다면 스냅 간격의 절반(≈190pt)을 못 넘겨 제자리로 돌아왔다.
    expect(decide(779, 779 - 30, -800)).toBe(MID)
  })

  it("임계 속도 바로 아래는 플릭이 아니다 — 놓은 자리로 간다", () => {
    expect(decide(779, 779 - 30, -(DETENT_FLICK_VELOCITY_PT_PER_SEC - 1))).toBe(
      COLLAPSED,
    )
  })
})

describe("천천히 끄는 동작은 **놓은 자리**가 답이다", () => {
  it("천천히 화면 끝까지 끌면 두 칸도 간다", () => {
    // 접힘 → 전체까지 700pt 를 끌고 거의 멈춘 채로 놓았다.
    expect(decide(779, 80, -50)).toBe(EXPANDED)
  })

  it("느리게 끌어 중간 근처에 놓으면 중간이다", () => {
    expect(decide(779, 420, -40)).toBe(MID)
  })

  /*
    이 두 줄이 규칙을 좁히게 만든 자리다. "이동이 크면 한 칸 옮긴다" 를 함께 두었더니
    천천히 96pt 만 끌어 올려도 화면 전체로 올라갔다 — 고치려던 증상의 다른 얼굴이다.
  */
  it("천천히 96pt 만 올리면 제자리다 (전체로 튀지 않는다)", () => {
    expect(decide(396, 300, 0)).toBe(MID)
  })

  it("움직이지 않고 놓으면 제자리다", () => {
    expect(decide(396, 396, 0)).toBe(MID)
  })
})

describe("방향은 속도가 이긴다", () => {
  it("아래로 끌다가 위로 튕겨 놓으면 올라간다", () => {
    // 손가락은 아래로 200pt 갔지만 마지막 순간의 의도는 '올린다' 이다.
    expect(decide(396, 396 + 200, -1500)).toBe(EXPANDED)
  })
})

describe("경계", () => {
  it("접힘에서 더 내려갈 곳은 없다", () => {
    expect(decide(779, 779 + 40, 2000)).toBe(COLLAPSED)
  })

  it("전체에서 더 올라갈 곳은 없다", () => {
    expect(decide(66, 66 - 40, -2000)).toBe(EXPANDED)
  })

  it("스냅이 비면 0 이다", () => {
    expect(
      resolveDetentIndex({
        detents: [],
        startPosition: 0,
        releasePosition: 0,
        velocityY: 0,
      }),
    ).toBe(0)
  })

  /* 속도를 못 믿을 때는 **플릭이 아닌 것으로** 본다 — 모르는 값으로 시트를 한 칸 더
     보내지 않는다. 그러면 판정은 눈에 보이는 위치 하나로 좁혀진다. */
  it("속도가 NaN 이면 놓은 자리로만 판정한다", () => {
    expect(decide(779, 779 - 100, Number.NaN)).toBe(COLLAPSED)
    expect(decide(779, 120, Number.NaN)).toBe(EXPANDED)
  })
})
