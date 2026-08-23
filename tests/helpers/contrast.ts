/**
 * **WCAG 대비 계산기.** 색을 이름이 아니라 **숫자**로 검사하는 가드가 쓴다.
 *
 * ## 왜 공용인가
 *
 * `communitySurfaceFixes` 가 다크에서 사라지는 것을 잡으려고 이 넷을 손으로 적었고,
 * `restaurantCategoryChip` · `authSurface` 가 각자 또 적었다. 라이트 감사가 네 번째
 * 사본을 만들 차례였는데, **계산기가 여러 벌이면 그중 하나가 틀려도 아무도 모른다** —
 * 게다가 각 사본은 자기 오라클(계산기가 실제로 계산하는가)을 따로 들고 있어야 한다.
 * 그 파일이 이미 "공용 헬퍼로 뺄 만큼 커지면 `tests/helpers/` 로 옮기면 된다" 고
 * 적어 뒀으므로, 여기가 그 자리다.
 *
 * ## 알파를 어떻게 다루나
 *
 * v2 시맨틱의 글자·선은 대부분 **알파**다(`label.neutral` = `#2e2f33b3`). 알파 색의
 * 대비는 **어떤 면 위에 얹혔는지**를 모르면 정의되지 않으므로, 두 색 모두 불투명한
 * `canvas` 위에 합성(source-over)한 뒤 잰다. 전경과 배경이 같은 캔버스를 쓰는 것이
 * 요점이다 — 배경이 알파면 그 아래도 캔버스가 비친다.
 *
 * ## 기준 (WCAG 2.1)
 *
 * - 본문 4.5:1 (`AA.text`)
 * - 큰 글자 3:1 — 18.66px 이상, 또는 14px 이상 Bold (`AA.largeText`)
 * - 비텍스트(컨트롤 경계·아이콘) 3:1 (`AA.nonText`)
 */

/** WCAG AA 문턱. 숫자를 테스트마다 다시 적지 않게 이름을 준다. */
export const AA = {
  text: 4.5,
  largeText: 3,
  nonText: 3,
} as const

/** `#rgb` · `#rrggbb` · `#rrggbbaa` → 0~1 채널 넷. 알파가 없으면 1. */
export function channels(hex: string): [number, number, number, number] {
  const value = hex.replace("#", "")
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value
  const to = (index: number) => parseInt(full.slice(index, index + 2), 16) / 255
  return [to(0), to(2), to(4), full.length === 8 ? to(6) : 1]
}

/** `top` 을 불투명한 `bottom` 위에 얹은 결과(source-over)의 0~1 RGB. */
export function over(top: string, bottom: string): [number, number, number] {
  const [tr, tg, tb, ta] = channels(top)
  const [br, bg, bb] = channels(bottom)
  return [
    tr * ta + br * (1 - ta),
    tg * ta + bg * (1 - ta),
    tb * ta + bb * (1 - ta),
  ]
}

/** 상대 휘도(WCAG 2.x). */
export function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 대비비. 두 색 모두 `canvas` 위에 합성한 뒤 잰다(머리말 §알파). */
export function contrast(top: string, bottom: string, canvas: string): number {
  const a = luminance(over(top, canvas))
  const b = luminance(over(bottom, canvas))
  const [high, low] = a > b ? [a, b] : [b, a]
  return (high + 0.05) / (low + 0.05)
}

/**
 * CIE L\*(명도). **면과 면의 차이**를 말할 때 쓴다.
 *
 * 대비비는 흰색 근처에서 압축된다 — `#ffffff` 와 `#f4f4f5` 는 1.10 이라 "거의 같다"
 * 로만 읽히고, 다크의 `#1f1f21`↔`#313135`(1.27)와 몇 배 차이인지가 안 보인다.
 * L\* 로 재면 3.8 대 8.6 이라 **라이트의 같은 한 단이 절반도 안 된다**는 사실이
 * 그대로 나온다. 두 모드의 경계 세기를 비교하는 자리에서는 이쪽을 쓴다.
 */
export function lightness(hex: string): number {
  const [r, g, b] = channels(hex)
  const y = luminance([r, g, b])
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y
}
