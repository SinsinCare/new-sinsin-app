/* eslint-disable no-restricted-syntax --
   아래 리터럴 회색들은 **알고 남긴 것**이다. 사다리의 어느 단과도 값이 달라서 옮기면
   화면이 다시 칠해지고(재도색), 그건 별도 결정이다 — 아래 머리말 참고. 규칙을 끄는
   대신 목록을 **얼어붙게** 만들었다: `tests/surfaceLadderGuard.test.ts` §L5 가 이 파일의
   리터럴 집합을 통째로 들고 있어서, 새 회색이 늘면 빨개진다. 경고보다 강한 가드다. */
import { getSurfaceLayers } from "@/src/design-system-v2/tokens/layers"
import { tokens } from "@/src/theme/tokens"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

/**
 * 설정·마이페이지 계보의 색 표.
 *
 * ■ 이 훅은 **면 체계 밖에서 시작했다** — 지금은 두 칸만 안으로 들어와 있다 (2026-08-22)
 *
 * 아래 값들은 원래 전부 리터럴이었다. 그래서 이 훅을 보는 화면 14개가 앱의 면 사다리
 * (`design-system-v2/tokens/layers.ts`)와 **연결돼 있지 않았다** — 사다리가 바뀌어도
 * 이 화면들만 제자리에 남는다는 뜻이다.
 *
 * 그중 **정확히 같은 값으로 떨어지는 두 칸**(`bg` · `cardBg`)을 사다리로 옮겼다.
 * 한 픽셀도 안 바뀐다:
 *
 *   bg      라이트 `#FFFFFF` → `planes[basePlane]` = `#ffffff`   (다크 `#1f1f21` 그대로)
 *   cardBg  라이트 `#FFFFFF` → `planes.content`   = `#ffffff`   (다크 `#313135` 그대로)
 *
 * ⚠ **나머지 칸은 옮기지 않았다.** `secondaryBg`(#F5F6FA) · `inputBg`(#F0F2F5) ·
 * `pressedBg`(#F9F9F9) · `avatarBg`(#F0F0F0) · `border`(#E0E0E0) 는 사다리의 어느 단과도
 * 값이 다르다. 옮기면 **화면이 다시 칠해진다** — 이번 작업이 금지한 그것이다.
 * 옮기려면 그건 토큰 이동이 아니라 이 계보의 **재도색**이고, 별도 결정이 필요하다.
 * 그때까지 이 목록은 `tests/surfaceLadderGuard.test.ts` §L4 가 **늘어나지 못하게** 잡는다.
 *
 * ⚠ 그리고 이 화면들의 바닥은 라이트에서 **흰 페이지**(§10 의 (ii))다. 바닥만 사다리의
 * `bed`(회색)로 내리지 마라 — 머리는 회색·카드는 흰색이 되어 커뮤니티에서 고친 그
 * 어긋남이 14개 화면에 한꺼번에 생긴다(`community/SectionHeader` 머리말 §층의 정본).
 */
export function useSettingsColors() {
  const isDark = useAppColorScheme() === "dark"
  const { planes, basePlane } = getSurfaceLayers(isDark)

  return {
    isDark,
    // Backgrounds
    /** 페이지 바닥 = 기준면(`background.default`). 라이트 흰 페이지 · 다크 앱 바닥. */
    bg: planes[basePlane],
    /** 그룹 카드. 사다리의 콘텐츠 면. */
    cardBg: planes.content,
    secondaryBg: isDark ? tokens.color.cardBgDark.val : "#F5F6FA",
    inputBg: isDark ? "#2A2A32" : "#F0F2F5",
    pressedBg: isDark ? "#2A2A32" : "#F9F9F9",
    avatarBg: isDark ? "#3A3A42" : "#F0F0F0",
    // Text
    text: isDark ? tokens.color.textDark.val : "#17191C",
    textSub: isDark ? tokens.color.textDarkSub.val : "#555",
    textTertiary: isDark ? "#6B7280" : "#C5C8CE",
    textMuted: isDark ? "#6B7280" : "#94A3B8",
    // Borders
    border: isDark ? "#3A3A42" : "#E0E0E0",
    divider: isDark ? "#2A2A32" : "#DADFE699",
    // Icon
    icon: isDark ? tokens.color.textDarkSub.val : "#474758",
    iconLight: isDark ? "#6B7280" : "#C4C4C4",
    // Overlay / Modal
    modalBg: isDark ? "#2A2A32" : "#FFFFFF",
    // Green accents stay the same in both modes
  }
}
