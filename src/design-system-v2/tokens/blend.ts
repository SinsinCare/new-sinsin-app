// Design System v2 — 색 합성 유틸
//
// 시맨틱 팔레트의 상당수(fill·line·label)는 **알파**다. 알파는 어떤 면 위에 얹혀도
// 같은 위계를 만들어 주지만, 값이 통째로 교체되는 배경(카드 면, interpolateColor 의 끝점)
// 이나 불투명 문자열을 요구하는 옛 토큰 자리에는 쓸 수 없다.
//
// 그런 자리에 **새 회색을 고르지 않기 위해** 여기서 합성한다.
// 색을 만들어 내는 게 아니라 정본 두 값이 겹쳤을 때의 결과를 계산할 뿐이다.

type Rgba = { r: number; g: number; b: number; a: number }

function parse(color: string): Rgba {
  const h = color.replace("#", "")
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  }
}

const hex = (n: number) => n.toString(16).padStart(2, "0")

/**
 * `src` 를 불투명한 `dst` 위에 얹은 결과(source-over)를 `#rrggbb` 로 돌려준다.
 *
 * 두 값 모두 `#rrggbb` 또는 `#rrggbbaa` 여야 한다.
 *
 * @example
 * // 다크의 fill.normal 을 background.default 위에 얹으면 정확히 background.lower 가 된다.
 * over("#70737c38", "#1f1f21") // "#313135"
 */
export function over(src: string, dst: string): string {
  const s = parse(src)
  const d = parse(dst)
  const mix = (sc: number, dc: number) => Math.round(sc * s.a + dc * (1 - s.a))
  return `#${hex(mix(s.r, d.r))}${hex(mix(s.g, d.g))}${hex(mix(s.b, d.b))}`
}
