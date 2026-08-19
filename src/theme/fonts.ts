/**
 * 서체 스케일 정본 (2026-08-19: tamagui `createFont` 제거).
 *
 * ■ 이 파일은 이제 **표**다
 *
 *   `bodyFont`/`headingFont` 를 렌더에 쓰는 곳은 없다(실측 0곳). tamagui 를 걷어낸
 *   뒤 남은 역할은 하나 — **`$4 → 14px` 같은 매핑의 근거**다.
 *   `tests/tamaguiTokenMap.test.ts` 가 이 파일을 읽어 이행 도구의 숫자표와 대조한다.
 *
 *   `createFont` 는 받은 객체를 거의 그대로 돌려주는 함수라 벗겨도 값이 안 바뀐다.
 *   그래도 지우지 않는 이유는, 이 표가 사라지면 **이행 도구가 왜 그 숫자를 썼는지**
 *   설명할 근거가 없어지기 때문이다.
 *
 * ■ key → 디자인 시스템 매핑
 *
 *   key 3  = Body 3    (12px, lineHeight 22, SemiBold)
 *   key 4  = Body 2    (14px, lineHeight 24, Medium)
 *   key 5  = Body 1    (16px, lineHeight 26, Medium)
 *   key 6  = Title 3   (18px, lineHeight 30, SemiBold)
 *   key 7  = Title 2   (20px, lineHeight 32, SemiBold)
 *   key 8  = Title 1   (22px, lineHeight 34, SemiBold)
 *   key 9  = Heading 2 (26px, lineHeight 36, SemiBold)
 *   key 10 = Heading 1 (28px, lineHeight 40, SemiBold)
 */

export const bodyFont = {
  family: "Pretendard-Regular",
  size: {
    1: 10,
    2: 11,
    3: 12,
    4: 14,
    5: 16,
    6: 18,
    7: 20,
    8: 22,
    9: 26,
    10: 28,
    true: 14,
  },
  lineHeight: {
    1: 16,
    2: 18,
    3: 22,
    4: 24,
    5: 26,
    6: 30,
    7: 32,
    8: 34,
    9: 36,
    10: 40,
    true: 24,
  },
  weight: {
    1: "400",
    2: "500",
    3: "600",
    4: "700",
    true: "400",
  },
  letterSpacing: {
    1: 0,
    2: -0.2,
    3: -0.3,
    4: -0.4,
    true: 0,
  },
  // Android에서 fontWeight 적용에 필수
  face: {
    400: { normal: "Pretendard-Regular" },
    500: { normal: "Pretendard-Medium" },
    600: { normal: "Pretendard-SemiBold" },
    700: { normal: "Pretendard-Bold" },
  },
}

export const headingFont = {
  ...bodyFont,
  family: "Pretendard-SemiBold",
  weight: {
    1: "600",
    2: "600",
    3: "700",
    4: "700",
    true: "600",
  },
  face: {
    600: { normal: "Pretendard-SemiBold" },
    700: { normal: "Pretendard-Bold" },
  },
}
