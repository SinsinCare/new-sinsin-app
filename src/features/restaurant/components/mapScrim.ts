/**
 * 지도 위 스크림(그라디언트) 색을 만드는 순수 함수.
 *
 * ## 왜 필요한가
 *
 * 지도 타일에는 흰 건물·노란 도로·초록 공원·파란 물이 섞여 있다. 그 위에 얹히는 것 중
 * **우리가 색을 정할 수 없는 것**이 하나 있다: iOS 상태바(시계·배터리·신호)다. 실측하면
 * 강남 일대에서 시계가 도로 폴리곤 위로 오는 순간 거의 읽히지 않는다.
 *
 * 컨트롤처럼 면을 깔면 되지만, 단색 띠는 지도가 그 선에서 잘린 것처럼 보인다. 그래서
 * 위쪽만 진하고 아래로 사라지는 그라디언트를 쓰고, 그 두 끝 색을 여기서 만든다.
 *
 * ## 왜 토큰을 그대로 못 쓰나
 *
 * `background.default` 는 `#ffffff`(라이트) / `#1f1f21`(다크)인 **불투명** hex 다.
 * 그라디언트의 아래 끝은 같은 색의 **알파 0** 이어야 지도로 자연스럽게 녹는다. RN 의
 * 그라디언트는 색 문자열을 받으므로 `rgba()` 로 바꿔 주는 변환이 필요하다.
 *
 * 안드로이드에서 `transparent`(= `#00000000`)로 끝내면 **검은 기가 도는** 그라디언트가
 * 되는 것이 알려진 함정이다 — 알파만 0 으로 내리고 RGB 는 같은 값을 유지해야 한다.
 * 이 함수가 존재하는 이유가 그것이다.
 *
 * 순수 함수라 `react-native` 를 들여오지 않는다 — node 환경 jest 가 그대로 검증한다.
 */

/** `#rgb` · `#rrggbb` · `rgb()` · `rgba()` 를 받아 같은 색의 `rgba(...)` 문자열로 만든다. */
export function scrimColor(color: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha))
  const rgb = parseRgb(color)
  if (rgb === null) {
    // 모르는 표기는 **그대로 돌려주지 않는다** — 알파를 못 먹인 불투명 색이 그라디언트
    // 양 끝에 들어가면 지도 위에 단색 띠가 깔린다. 투명으로 떨어뜨려 아무것도 그리지 않는다.
    return "rgba(255,255,255,0)"
  }
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamped})`
}

function parseRgb(color: string): [number, number, number] | null {
  const value = color.trim()

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/iu.exec(value)
  if (hex !== null) {
    const digits = hex[1]!
    const full =
      digits.length === 3
        ? digits
            .split("")
            .map((d) => d + d)
            .join("")
        : digits
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
    ]
  }

  const rgb = /^rgba?\(([^)]+)\)$/iu.exec(value)
  if (rgb !== null) {
    const parts = rgb[1]!.split(",").map((part) => Number(part.trim()))
    if (
      parts.length < 3 ||
      parts.slice(0, 3).some((n) => !Number.isFinite(n))
    ) {
      return null
    }
    return [parts[0]!, parts[1]!, parts[2]!]
  }

  return null
}
