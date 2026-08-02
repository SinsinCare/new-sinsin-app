/**
 * 사진 탭 2열 masonry 의 **배치 계산**. 화면 없이 도는 순수 함수라 테스트가 짚을 수 있다.
 *
 * ## 왜 컴포넌트 밖으로 꺼냈나
 *
 * 이 배치가 만족해야 하는 성질은 눈으로 확인하기 어려운 종류다: **이미 그려진 타일은
 * 절대 움직이지 않는다.** 사진이 뒤에 붙거나(다음 페이지) 크기를 몰라 못 넣었던 사진이
 * 채워질 때, 앞쪽 타일의 열과 높이가 그대로여야 한다. 그렇지 않던 시절 사진들이
 * 후두두둑 떨어지듯 재배치됐다(`PhotoTab.tsx` 머리말).
 *
 * 성질을 코드로 적어 두지 않으면 다음 사람이 "어차피 다시 계산되니까" 하며 정렬 한 줄을
 * 넣는 순간 조용히 깨진다. `tests/restaurantPhotoMasonry.test.ts` 가 그 자리다.
 */

/** 배치에 필요한 사진의 최소 정보. `PhotoDto` 전체를 요구하지 않는다 — 테스트가 무거워진다. */
export interface PhotoDimensions {
  readonly photoId: number
  /** 서버가 실은 원본 픽셀 치수(075). 후기·카카오 CDN 사진은 서버도 모른다 → `null`. */
  readonly width: number | null
  readonly height: number | null
}

/** `photoId` → 측정으로 확정된 비율(폭÷높이). 서버가 치수를 준 사진은 여기 들어오지 않는다. */
export type MeasuredAspects = Readonly<Record<number, number>>

/**
 * 크기를 끝내 못 받은 타일의 비율(폭÷높이). 1:1 이 가장 덜 틀린다.
 * **임시값이 아니다** — 이 값이 들어간 타일도 그대로 확정된다.
 */
export const FALLBACK_ASPECT = 1

/**
 * 타일 비율의 상·하한(폭÷높이).
 *
 * 파노라마(6:1)나 아주 긴 세로 사진(1:5)이 한 장 섞이면 그 열만 화면 몇 개 높이로
 * 늘어나 masonry 가 아니라 기둥이 된다. 잘라서 정보를 없애지 않으면서 배치를 지키는
 * 타협점이라 **자르는 것이 아니라 담는 상자의 비율만** 제한한다(`contentFit="cover"`
 * 이므로 극단값에서만 양끝이 잘린다). 목업의 세로 사진은 3:4(0.75)까지다.
 */
export const MIN_ASPECT = 0.6
export const MAX_ASPECT = 1.9

/** 서버가 실은 치수. 없거나 0 이면 `null` — 여기서 1:1 을 지어내지 않는다. */
export function serverAspect(photo: PhotoDimensions): number | null {
  if (photo.width === null || photo.height === null) return null
  if (!(photo.width > 0) || !(photo.height > 0)) return null
  return photo.width / photo.height
}

/**
 * 이 타일을 어떤 비율로 그릴지. 아직 모르면 `null` — 그 사진은 **배치에 넣지 않는다**.
 *
 * 서버 값을 항상 이긴 값으로 두는 것이 핵심이다. 측정값을 우선하면 이미 확정된 배치가
 * 다시 흔들린다.
 */
export function tileAspect(
  photo: PhotoDimensions,
  measured: MeasuredAspects,
): number | null {
  const aspect = serverAspect(photo) ?? measured[photo.photoId]
  if (aspect === undefined) return null
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, aspect))
}

/**
 * 배치에 들어갈 사진 — **앞에서부터 비율을 아는 만큼만.** 모르는 사진이 나오면 거기서
 * 멈춘다.
 *
 * 건너뛰고 뒤를 먼저 깔면 안 된다: 빠진 사진의 크기가 나중에 도착하는 순간 그 자리에
 * 끼어들면서 **뒤의 타일이 전부 밀린다.** 한 장 늦게 보이는 편이 스무 장이 흔들리는
 * 것보다 낫다.
 *
 * 접두사이므로 배열 안의 순번이 곧 원본 목록의 순번이다 — 라이트박스가 그 순번을 받아야
 * 좌우 화살표가 화면과 같은 순서로 넘어간다.
 */
export function placeablePrefix<T extends PhotoDimensions>(
  photos: readonly T[],
  measured: MeasuredAspects,
): { photo: T; aspect: number }[] {
  const placed: { photo: T; aspect: number }[] = []
  for (const photo of photos) {
    const aspect = tileAspect(photo, measured)
    if (aspect === null) break
    placed.push({ photo, aspect })
  }
  return placed
}

export interface MasonryTile<T> {
  readonly photo: T
  /** 원본 배열에서의 순번. 라이트박스가 이 값으로 같은 사진을 연다. */
  readonly index: number
  readonly height: number
}

/**
 * 그리디 배치. 각 열의 누적 높이를 들고 있다가 **더 짧은 열**에 다음 장을 넣는다.
 * 동점이면 왼쪽이다(`<` 비교라 앞 열이 이긴다) — 같은 입력에서 같은 배치가 나오려면
 * 이 규칙이 고정돼 있어야 한다.
 *
 * ## 접두사에 대해 결정적이다
 *
 * 앞에서부터 순서대로 넣기만 하므로 입력의 앞부분이 같으면 그 부분의 배치도 같다. 즉
 * 뒤에 사진이 붙어도 앞쪽 타일은 같은 열·같은 높이에 다시 놓인다. 호출부가 **높이가
 * 확정된 사진만**(`placeablePrefix`) 넘기는 한, 화면에서 일어나는 변화는 아래로 늘어나는
 * 것뿐이다.
 *
 * 높이를 여기서 함께 돌려주는 이유는 렌더가 다시 재지 않게 하기 위해서다 — 두 곳에서
 * 재면 배치가 가정한 높이와 실제로 그려지는 높이가 갈리고, 두 열의 바닥이 어긋난다.
 */
export function packMasonry<T>(
  items: readonly { photo: T; aspect: number }[],
  options: {
    readonly columnWidth: number
    readonly columns: number
    readonly gap: number
  },
): MasonryTile<T>[][] {
  const buckets: MasonryTile<T>[][] = Array.from(
    { length: options.columns },
    () => [],
  )
  const heights = new Array<number>(options.columns).fill(0)
  items.forEach(({ photo, aspect }, index) => {
    let target = 0
    for (let i = 1; i < options.columns; i += 1) {
      if (heights[i] < heights[target]) target = i
    }
    // 폭은 열 폭으로 고정이고 높이가 비율을 따라간다 — 그래서 열이 계단처럼 어긋난다.
    const height = Math.round(options.columnWidth / aspect)
    buckets[target].push({ photo, index, height })
    heights[target] += height + options.gap
  })
  return buckets
}
