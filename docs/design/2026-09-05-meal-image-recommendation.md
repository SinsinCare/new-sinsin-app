# 식단 이미지·추천 식단 확인

사용자 요청: 사진이 없는 글 기록의 GPT 이미지 생성 유지, 해상도·품질 조정 보존, 분석 범례는 ‘식사’, ‘추천 식단’에는 실제 음식 조합과 추천 이유 표시.

## 이미지

생성은 계속 성공했지만 로컬 URL이 종료된 Python 서버의 8000 포트를 가리켰다. Bun 서버의 로컬 이미지 읽기 경로를 추가하고 gitignored 설정을 현재 API 서버의 `/static`으로 맞췄다. 개발 앱에 남아 있는 이전 loopback 이미지 주소도 현재 로컬 API origin으로 해석한다. 운영·클라우드 이미지 주소는 바꾸지 않는다.

기존 설정 그대로: `gpt-image-2`, `1024x1536`, `quality=low`, JPEG 압축 80, 생성 제한 시간 18초. 새 순대국 이미지 생성은 13,989ms에 성공했다.

## 추천 식단

종전 `remainingTip`은 남은 나트륨을 된장국·김치의 개수로 환산했다. 이것은 건강한 대체 식단 선정과 다르며, 반올림·다른 영양소의 초과 여부에 따라 허용량으로 오해할 수 있다. 분석 카드의 입력을 음식 조합과 선택 이유로 바꾸고, 오래된 추천 캐시를 `meal-report-v11`로 갱신한다. AI 문장으로 승격되어도 동일한 추천 선택을 보존한다.

- 나트륨 중심: 흰쌀밥·소금 없이 구운 생선·데친 양배추, 소스를 따로 두는 이유.
- 인·칼륨 참고량이 빠듯한 경우: 흰쌀밥·흰자찜·데친 양배추 조합을 우선한다.
- 단백질 참고량이 빠듯한 경우: 채소 볶음밥에 흰자찜을 곁들이고, 투석 여부에 따른 개인 단백질 기준에 맞춰 양을 정하도록 한다.
- 영양 미확정: 개인화된 음식 허용량을 만들지 않는다.

현재 추천은 영양소 상황별 식사 예시다. 임상 검증을 마친 개별 레시피의 영양값·섭취량을 계산한 처방이나 알레르기 필터를 적용한 추천은 아니다. 로컬 레시피 175개는 검증 완료 표지가 없어 그 표지를 임의로 바꾸지 않았다.

식사 방향의 참고 자료: [NIDDK 성인 CKD 식사 안내](https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease), [NKF 균형 잡힌 식사 구성 안내](https://www.kidney.org/sites/default/files/your_guide_to_create_a_balanced_kidney-friendly_meal.pdf), [NIDDK 칼륨 안내](https://www.niddk.nih.gov/-/media/Files/Health-Information/Health-Professionals/Kidney-Disease/PotassiumTipsforPeopleCKD_EN.pdf). 식품·조리 원칙을 참고했으며, 제안한 조합 전체를 임상적으로 검증했다는 의미는 아니다.

## 실제 확인

iPhone 17 Pro iOS 26.5에서 순대국 글 분석 → GPT 생성 이미지 표시 → ‘식사’ 범례 → ‘추천 식단’ 음식 조합을 확인했다. 화면 증거: `/private/tmp/meal-image-recommendation-after.png`. 테스트 입력은 일지에 저장하지 않고 결과 화면에 두었다.

검증 명령과 결과는 워크스페이스 `GATES.meal-image-recommendation.md`에 기록한다.
