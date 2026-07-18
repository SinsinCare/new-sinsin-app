// Design System v2 — Typography tokens
// Docs: project/design-system-v2/design-system-base/Text Styles.md
// weight는 **face(fontFamily)로만** 표현한다. Pretendard가 weight별 4개 파일로 로드되어 있어
// (Pretendard-Regular/Medium/SemiBold/Bold), face 위에 fontWeight를 겹쳐 쓰면 iOS에서 가짜 볼드 등
// 의도치 않은 결과가 난다. → 스타일에는 fontWeight를 넣지 않는다.
// lineHeight = fontSize × 배수(반올림, 절대 px). letterSpacing 전체 0.

export const fontFamily = {
  regular: "Pretendard-Regular",
  medium: "Pretendard-Medium",
  semibold: "Pretendard-SemiBold",
  bold: "Pretendard-Bold",
} as const

// 참고용 숫자 weight 매핑. 스타일에는 사용하지 않음(face로 weight 표현).
// 시스템 폰트 fallback 등 특수 상황에만 참고.
export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const

export type TextStyleToken = {
  fontFamily: (typeof fontFamily)[keyof typeof fontFamily]
  fontSize: number
  lineHeight: number
  letterSpacing: number
}

export const typography = {
  display: {
    small: {
      fontFamily: fontFamily.bold,
      fontSize: 26,
      lineHeight: 35,
      letterSpacing: 0,
    },
    medium: {
      fontFamily: fontFamily.bold,
      fontSize: 28,
      lineHeight: 38,
      letterSpacing: 0,
    },
    large: {
      fontFamily: fontFamily.bold,
      fontSize: 30,
      lineHeight: 41,
      letterSpacing: 0,
    },
  },
  title: {
    xSmallXWeak: {
      fontFamily: fontFamily.medium,
      fontSize: 17,
      lineHeight: 23,
      letterSpacing: 0,
    },
    xSmallWeak: {
      fontFamily: fontFamily.semibold,
      fontSize: 17,
      lineHeight: 23,
      letterSpacing: 0,
    },
    xSmall: {
      fontFamily: fontFamily.bold,
      fontSize: 17,
      lineHeight: 23,
      letterSpacing: 0,
    },
    smallXWeak: {
      fontFamily: fontFamily.medium,
      fontSize: 20,
      lineHeight: 27,
      letterSpacing: 0,
    },
    smallWeak: {
      fontFamily: fontFamily.semibold,
      fontSize: 20,
      lineHeight: 27,
      letterSpacing: 0,
    },
    small: {
      fontFamily: fontFamily.bold,
      fontSize: 20,
      lineHeight: 27,
      letterSpacing: 0,
    },
    medium: {
      fontFamily: fontFamily.bold,
      fontSize: 22,
      lineHeight: 30,
      letterSpacing: 0,
    },
    large: {
      fontFamily: fontFamily.bold,
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: 0,
    },
  },
  body: {
    xSmall: {
      fontFamily: fontFamily.regular,
      fontSize: 13,
      lineHeight: 20,
      letterSpacing: 0,
    },
    mediumWeak: {
      fontFamily: fontFamily.regular,
      fontSize: 17,
      lineHeight: 26,
      letterSpacing: 0,
    },
    mediumStrong: {
      fontFamily: fontFamily.semibold,
      fontSize: 17,
      lineHeight: 26,
      letterSpacing: 0,
    },
    large: {
      fontFamily: fontFamily.regular,
      fontSize: 19,
      lineHeight: 29,
      letterSpacing: 0,
    },
  },
  subtext: {
    small: {
      fontFamily: fontFamily.regular,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0,
    },
    medium: {
      fontFamily: fontFamily.regular,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
    },
    mediumStrong: {
      fontFamily: fontFamily.medium,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
    },
    large: {
      fontFamily: fontFamily.regular,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
    },
  },
  label: {
    xSmallWeak: {
      fontFamily: fontFamily.medium,
      fontSize: 13,
      lineHeight: 16,
      letterSpacing: 0,
    },
    xSmall: {
      fontFamily: fontFamily.semibold,
      fontSize: 13,
      lineHeight: 16,
      letterSpacing: 0,
    },
    smallWeak: {
      fontFamily: fontFamily.medium,
      fontSize: 15,
      lineHeight: 19,
      letterSpacing: 0,
    },
    small: {
      fontFamily: fontFamily.semibold,
      fontSize: 15,
      lineHeight: 19,
      letterSpacing: 0,
    },
    smallStrong: {
      fontFamily: fontFamily.bold,
      fontSize: 15,
      lineHeight: 19,
      letterSpacing: 0,
    },
    mediumWeak: {
      fontFamily: fontFamily.medium,
      fontSize: 17,
      lineHeight: 21,
      letterSpacing: 0,
    },
    medium: {
      fontFamily: fontFamily.semibold,
      fontSize: 17,
      lineHeight: 21,
      letterSpacing: 0,
    },
    mediumStrong: {
      fontFamily: fontFamily.bold,
      fontSize: 17,
      lineHeight: 21,
      letterSpacing: 0,
    },
    large: {
      fontFamily: fontFamily.semibold,
      fontSize: 19,
      lineHeight: 24,
      letterSpacing: 0,
    },
  },
  caption: {
    xSmall: {
      fontFamily: fontFamily.semibold,
      fontSize: 10,
      lineHeight: 15,
      letterSpacing: 0,
    },
    small: {
      fontFamily: fontFamily.medium,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0,
    },
    medium: {
      fontFamily: fontFamily.medium,
      fontSize: 14,
      lineHeight: 16,
      letterSpacing: 0,
    },
  },
} as const
