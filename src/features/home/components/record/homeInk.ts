import { useSurface } from "@/src/hooks/useSurface"

/**
 * 홈 시안(2026-09-04, Figma export home.svg)의 색 한 벌.
 *
 * 시안은 v2 시맨틱과 **다른 값**을 쓴다 — 글자 `#2A2A37`, 보조 `#2E2F33@70%`,
 * 비활성 `#37383C@51%`, 자리표시 `#37383C@28%`, 보더 `#70737C@8%`, 히어로 `#FFEFE4`.
 * 토큰에 없는 값이라 여기 한 파일에만 적고, 화면들은 이 훅으로 받는다(lint 의 hex
 * 경고가 여기로 모인다). 정본(Figma Design-system_Mobile)에 이 값들이 올라오면
 * `design-system-v2/tokens/colors.ts` 로 옮기고 이 파일을 지운다.
 *
 * 다크는 시안이 없다. 같은 역할의 surface 토큰으로 대신한다.
 */
export interface HomeInk {
  /** 히어로 면 */
  heroBg: string
  /** 제목 "기록" · 값 · 섹션 제목 · 줄 제목 */
  strong: string
  /** 라벨 · 메타 · 더 보기 */
  muted: string
  /** 제목 줄의 "통계" · 종 */
  inactive: string
  /** "기록 없음" · 줄 끝 화살표 */
  placeholder: string
  /** 타일 보더 · 더 보기 위 선 */
  hairline: string
  /** 타일 면 */
  tileBg: string
  /** 말풍선 글자(말풍선은 늘 흰 면이라 다크에서도 같다) */
  bubbleText: string
}

/**
 * ■ 시안과 다른 두 값 (가시성, 코드리뷰 2026-09-04)
 *   `inactive`(제목 줄 "통계", 51%)는 복숭아 바닥에서 2.7:1, `placeholder`("기록 없음",
 *   28%)는 흰 바닥에서 1.9:1 이었다 — 큰 글자 기준(3:1)에도 못 미친다. 둘 다 **눌러야 하는
 *   자리의 글자**라 흐리게 두면 "비활성" 으로 읽힌다. 같은 색을 진하게(62%·55%) 올려
 *   3:1 을 넘긴다. `tests/reportContrast.test.ts` 가 이 두 쌍을 계산한다.
 */
export const HOME_INK_LIGHT: HomeInk = {
  heroBg: "#FFEFE4",
  strong: "#2A2A37",
  muted: "rgba(46,47,51,0.70)",
  inactive: "rgba(55,56,60,0.62)",
  placeholder: "rgba(55,56,60,0.55)",
  hairline: "rgba(112,115,124,0.08)",
  tileBg: "#FFFFFF",
  bubbleText: "rgba(0,12,30,0.80)",
}

export function useHomeInk(): HomeInk {
  const s = useSurface()
  if (!s.isDark) return HOME_INK_LIGHT
  /*
    다크의 `textMuted`(51% 알파)·`placeholder` 는 카드(2.7~2.8:1)·히어로 면(2.3~2.4:1)에서
    안 읽힌다(tests/reportContrast 실측). 본문 톤 `text` 로 올린다 — 카드 4.8, 히어로 4.1.
    위계는 굵기(라벨 500 / 값 700)로 선다.
  */
  return {
    heroBg: s.surface,
    strong: s.textStrong,
    muted: s.text,
    inactive: s.text,
    placeholder: s.text,
    hairline: s.hairline,
    tileBg: s.card,
    bubbleText: HOME_INK_LIGHT.bubbleText,
  }
}
