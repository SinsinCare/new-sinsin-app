import { tokens } from "@/src/theme/tokens"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

/** 시스템 기본 라디우스. 디자인 확정값 — tokens.radius.true 와 같아야 한다. */
export const AUTH_RADIUS = 16

export function useAuthColors() {
  const isDark = useAppColorScheme() === "dark"

  return {
    isDark,
    bg: isDark ? tokens.color.appBgDark.val : "#FFFFFF",
    text: isDark ? tokens.color.textDark.val : "#17191C",
    textSub: isDark ? tokens.color.textDarkSub.val : "#787C83",
    icon: isDark ? tokens.color.textDarkSub.val : "#17191C",
    inputBg: isDark ? "#2A2A32" : "white",
    border: isDark ? "#3A3A42" : "rgba(218,223,230,0.6)",
    disabledBtn: isDark ? "#2A2A32" : "#C5C8CE",

    // ── 로그인 화면 ──────────────────────────────
    // 배경 이미지 위로 올라오는 하단 시트. 다크는 앱 배경보다 한 단계 밝게 띄운다.
    sheetBg: isDark ? "#1C1C1E" : "#FFFFFF",

    // 소셜 버튼 (다크 팔레트 기준)
    //  구글: 어두운 회색 + 흰 글씨 / 라이트는 밝은 회색 + 검은 글씨
    //  카카오: 다크에서 톤을 낮춘다. #FEE500 을 어두운 배경에 그대로 두면 과하게 튄다
    //  애플: 다크에서 흰 버튼 + 검은 글씨로 반전
    googleBg: isDark ? "#3A3A3C" : "#F4F5F7",
    googleText: isDark ? "#FFFFFF" : "#1F1F1F",
    kakaoBg: isDark ? "#F7D95C" : "#FEE500",
    kakaoText: "#191919",
    appleBg: isDark ? "#F7F7F7" : "#000000",
    appleText: isDark ? "#000000" : "#FFFFFF",

    // 이메일 로그인(주 CTA)
    primaryBg: isDark ? "#3DBE9B" : "#34D399",
    primaryText: "#FFFFFF",
  }
}
