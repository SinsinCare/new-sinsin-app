// 영양 목표치는 서버가 준다. useNutrientLimits() 를 쓸 것.
//
// 여기 있던 CKD_NUTRIENT_LIMITS 는 단백질이 체중과 무관하게 48g 고정이라
// 90kg 1기 환자(서버 목표 72g)가 "초과" 판정을 받았다. src/types/models.ts 의
// KIDNEY_SAFE_LIMITS 와도 칼륨이 달라(3000 vs 2000) 같은 사용자가 화면에 따라
// 다른 숫자를 봤다. 둘 다 제거했다.
//
// MOCK_CURRENT_INTAKE 도 함께 제거했다(자체 TODO 가 삭제하라고 적혀 있었다).

/** 통계 막대 끝의 원형 마커 지름. NutrientBarSection 전용 레이아웃 상수. */
export const CIRCLE_SIZE = 12
