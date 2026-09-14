import { tokens } from "@/src/theme/tokens"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

export function useAuthColors() {
  const isDark = useAppColorScheme() === "dark"

  /*
    로그인 화면과 인증 레이아웃이 실제로 읽는 값만 남겼다. 면·입력칸·비활성 버튼·시트
    색은 `useSurface` 로 옮겨간 뒤 아무도 읽지 않았다 — 여기 남겨 두면 "인증 화면의
    면색" 이 두 곳에 있는 것처럼 보여 다음 사람이 엉뚱한 쪽을 고친다.
  */
  return {
    isDark,
    text: isDark ? tokens.color.textDark.val : "#17191C",
    textSub: isDark ? tokens.color.textDarkSub.val : "#787C83",
    icon: isDark ? tokens.color.textDarkSub.val : "#17191C",

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
  }
}
