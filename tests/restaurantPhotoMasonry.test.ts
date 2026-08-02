/**
 * 사진 탭 2열 masonry 의 배치 규칙.
 *
 * ## 무엇을 막는 테스트인가
 *
 * 사진들이 "후두두둑 떨어지듯" 쏟아지던 결함이다. 예전에는 크기를 모르는 사진을 일단
 * 1:1 로 깔아 두고 `onLoad` 에서 실제 크기를 받아 고쳤는데, 그리디 배치는 매번 처음부터
 * 다시 돌기 때문에 **이미 그려진 타일이 열을 옮겨 다녔다.** dev DB 실측으로 사진 10장
 * 이상인 식당 181곳에서 서버 치수가 있는 사진은 평균 34% 뿐이라, 화면의 3분의 2가
 * 로드될 때마다 재배치가 일어났다.
 *
 * 그래서 규칙을 둘로 정했고, 이 파일이 그 둘을 고정한다:
 *
 *   1. 크기가 **확정된 접두사만** 배치한다 (`placeablePrefix`)
 *   2. 그리디 배치는 **접두사에 대해 결정적**이다 (`packMasonry`)
 *
 * 둘이 같이 있어야 "화면에서 일어나는 변화는 아래로 늘어나는 것뿐" 이 성립한다.
 * 하나만 깨져도 화면은 다시 흔들리는데, 코드는 아무 것도 실패하지 않는다.
 */
import {
  FALLBACK_ASPECT,
  MAX_ASPECT,
  MIN_ASPECT,
  packMasonry,
  placeablePrefix,
  serverAspect,
  tileAspect,
  type MeasuredAspects,
  type PhotoDimensions,
} from "../src/features/restaurant/utils/photoMasonry"

/** iPhone 17e 기준 열 폭: (402 − 16×2 − 4) ÷ 2. */
const COLUMN_WIDTH = 183
const LAYOUT = { columnWidth: COLUMN_WIDTH, columns: 2, gap: 4 }

const withDims = (photoId: number, aspect: number): PhotoDimensions => ({
  photoId,
  width: Math.round(1000 * aspect),
  height: 1000,
})

const noDims = (photoId: number): PhotoDimensions => ({
  photoId,
  width: null,
  height: null,
})

/** `photoId` → 어느 열의 어느 높이에 놓였나. 배치가 흔들리면 이 맵이 달라진다. */
function placementOf(
  photos: readonly PhotoDimensions[],
  measured: MeasuredAspects,
): Map<number, { column: number; height: number }> {
  const buckets = packMasonry(placeablePrefix(photos, measured), LAYOUT)
  const placement = new Map<number, { column: number; height: number }>()
  buckets.forEach((bucket, column) => {
    for (const tile of bucket) {
      placement.set(tile.photo.photoId, { column, height: tile.height })
    }
  })
  return placement
}

describe("비율 결정", () => {
  it("서버 치수가 측정값을 이긴다", () => {
    // 측정값이 이기면 이미지가 도착할 때마다 확정된 배치가 다시 흔들린다.
    expect(tileAspect(withDims(1, 0.75), { 1: 1.5 })).toBeCloseTo(0.75)
  })

  it("서버 치수가 없으면 측정값을 쓴다", () => {
    expect(tileAspect(noDims(1), { 1: 1.5 })).toBeCloseTo(1.5)
  })

  it("서버도 모르고 측정도 안 됐으면 null 이다 — 1:1 을 지어내지 않는다", () => {
    expect(tileAspect(noDims(1), {})).toBeNull()
    expect(serverAspect(noDims(1))).toBeNull()
  })

  it("치수가 0 이면 없는 것으로 본다", () => {
    // 0 으로 나누면 Infinity 높이가 되어 그 열이 통째로 사라진다.
    expect(serverAspect({ photoId: 1, width: 0, height: 100 })).toBeNull()
  })

  it("파노라마와 긴 세로는 상자 비율만 제한한다", () => {
    expect(tileAspect(withDims(1, 6), {})).toBe(MAX_ASPECT)
    expect(tileAspect(withDims(2, 0.2), {})).toBe(MIN_ASPECT)
  })
})

describe("접두사 규칙", () => {
  const photos = [withDims(1, 1), noDims(2), withDims(3, 0.75)]

  it("크기를 모르는 사진에서 멈춘다 — 뒤를 먼저 깔지 않는다", () => {
    // 3번을 먼저 깔면 2번이 도착하는 순간 그 자리에 끼어들며 뒤가 전부 밀린다.
    expect(
      placeablePrefix(photos, {}).map((tile) => tile.photo.photoId),
    ).toEqual([1])
  })

  it("빠진 크기가 채워지면 그 뒤까지 이어서 배치된다", () => {
    expect(
      placeablePrefix(photos, { 2: 1.33 }).map((tile) => tile.photo.photoId),
    ).toEqual([1, 2, 3])
  })

  it("접두사의 순번이 원본 목록의 순번이다 — 라이트박스가 그 값으로 연다", () => {
    const buckets = packMasonry(placeablePrefix(photos, { 2: 1.33 }), LAYOUT)
    const byId = new Map(
      buckets.flat().map((tile) => [tile.photo.photoId, tile.index]),
    )
    expect(byId.get(1)).toBe(0)
    expect(byId.get(2)).toBe(1)
    expect(byId.get(3)).toBe(2)
  })
})

describe("이미 그려진 타일은 움직이지 않는다", () => {
  /** 실제 화면과 같은 구성: 3분의 1만 서버 치수가 있고 비율이 제각각이다. */
  const page = [
    withDims(1, 1),
    noDims(2),
    noDims(3),
    withDims(4, 0.75),
    noDims(5),
    noDims(6),
    withDims(7, 1.58),
    noDims(8),
    noDims(9),
    withDims(10, 1),
    noDims(11),
    noDims(12),
  ]
  /**
   * 측정으로 뒤늦게 들어오는 값들. 대부분 3:4 인 것은 실제 그대로다 — 후기 사진은
   * 세로로 찍은 휴대폰 사진이라 서버가 치수를 모르는 쪽이 특히 그렇다. 이 값들과
   * 1:1 placeholder 의 배치는 12장 중 10장의 **열이 다르다**(아래 회귀 테스트).
   */
  const measurements: Record<number, number> = {
    2: 1.33,
    3: 0.75,
    5: 0.75,
    6: 0.75,
    8: 0.75,
    9: 0.75,
    11: 0.75,
    12: 0.75,
  }

  it("크기가 하나씩 채워져도 앞서 놓인 타일은 그대로다", () => {
    const ids = Object.keys(measurements).map(Number)
    let measured: MeasuredAspects = {}
    let previous = placementOf(page, measured)

    for (const photoId of ids) {
      measured = { ...measured, [photoId]: measurements[photoId] }
      const next = placementOf(page, measured)
      // 늘어나기만 한다.
      expect(next.size).toBeGreaterThanOrEqual(previous.size)
      // 그리고 이미 있던 타일은 열도 높이도 같다.
      for (const [id, before] of previous) {
        expect(next.get(id)).toEqual(before)
      }
      previous = next
    }

    expect(previous.size).toBe(page.length)
  })

  it("다음 페이지가 붙어도 앞 페이지의 배치가 같다", () => {
    const measured = measurements
    const firstPage = placementOf(page, measured)
    const secondPage = placementOf(
      [...page, withDims(13, 0.75), withDims(14, 1.58), withDims(15, 1)],
      measured,
    )
    for (const [id, before] of firstPage) {
      expect(secondPage.get(id)).toEqual(before)
    }
    expect(secondPage.size).toBe(page.length + 3)
  })

  it("(회귀) 예전 방식이었다면 타일이 열을 옮겨 다닌다", () => {
    // 크기를 모르는 사진을 1:1 로 깔아 두고 나중에 실측으로 고치던 방식이다. 이 픽스처
    // 에서 12장 중 10장의 열이 바뀐다 — 그게 화면에서 "후두두둑" 으로 보이던 것이다.
    // (실제 비율 분포로 30장짜리 화면 500번을 돌리면 93% 의 화면에서 열이 바뀌었다.)
    //
    // 이 테스트가 실패한다면 픽스처가 너무 순해진 것이고, 그러면 위 두 테스트도 아무
    // 것도 증명하지 못한다. 통과시키지 말고 픽스처를 되살려야 한다.
    const asPlaceholders: MeasuredAspects = Object.fromEntries(
      Object.keys(measurements).map((id) => [Number(id), FALLBACK_ASPECT]),
    )
    const before = placementOf(page, asPlaceholders)
    const after = placementOf(page, measurements)
    const moved = [...before].filter(
      ([id, box]) => after.get(id)?.column !== box.column,
    )
    expect(moved.length).toBeGreaterThanOrEqual(2)
  })
})
