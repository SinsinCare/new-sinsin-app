# 하루 환산 가격과 내정보 디테일

## 변경

- 페이월 상단과 기간 선택 항목의 핵심 정보를 `하루 …꼴`로 정리했다. 월간·연간 선택에 따라 상단 금액, 30일·365일 환산 기준, 실제 결제액이 함께 바뀐다.
- 실제 스토어 상품의 가격·통화로 계산한다. 기간 선택 항목과 고정 결제 영역에는 총 결제액과 결제 주기를 계속 표시한다. 무료 체험이나 원화 가격을 임의로 만들지 않는다.
- 무료 계정의 내정보 멤버십 카드에도 페이월 기본 선택과 같은 기간의 하루 금액을 표시한다. 연간 상품이 있으면 연간, 없으면 월간이다. 가격 조회 실패·알 수 없는 계정 상태·유료 계정에는 이 할인 제안을 표시하지 않는다.
- 내정보는 구성을 유지하면서 프로필 여백, 건강 정보의 라벨과 값, 카드 내부 20pt 패딩, 멤버십 보조 문구와 행동 링크의 위계를 다듬었다.
- 계정 탭이 다시 보일 때 가격을 갱신하며, 이전 계정의 늦은 응답이 새 계정에 표시되지 않도록 처리했다.

## Mobbin 참고

- [Linktree 구독 선택](https://mobbin.com/screens/814d8a04-df2c-47df-bb28-dc4d1db4a1cc): 요금 숫자와 기간 설명의 위계.
- [Universe 요금 선택](https://mobbin.com/screens/1caede14-91a0-40a9-b979-f63093914953): 기간 선택과 실제 결제액, 환산 정보의 연결.

두 화면은 가격과 주기 표현을 참고했다. 하루 금액을 주인공으로 삼는 방향은 사용자의 요청에 따른 것으로, 해당 레퍼런스가 하루 가격을 사용한다고 해석하지 않았다. 이전 내정보·페이월 개선의 구조를 유지했다.

## 검증

- 가격 계산, 표시, 내정보 가격 로딩, 구매 컨트롤러, 복원, 페이월 진입의 Jest 6개 스위트 통과.
- TypeScript 검사 및 수정한 TypeScript 파일의 ESLint 통과.
- 한국어 UX 문구 감사 실행 완료. 보고된 교정 후보는 이번 수정 파일 밖의 기존 후보다.
- iPhone 17 Pro / iOS 26.5 Simulator, 로컬 TEST 백엔드 8100 / Metro 8085에서 실제 화면 확인.
- TEST 스토어 연간 US$79.99 → 하루 US$0.22, 월간 US$9.99 → 하루 US$0.33. 내정보에서 페이월 진입, 연간 → 월간 → 연간 전환, 닫기를 확인했다.
- 라이트·다크 기본 글씨 크기에서 정렬과 가격 표시 확인. 접근성 글씨 크기 `accessibility-medium`에서는 헤더와 멤버십 줄바꿈, 기간 선택 스크롤, 고정 결제 버튼과 총 결제액 표시를 확인했다. 가장 큰 접근성 글씨 단계 전체를 검증한 것은 아니다.
- 실제 구매와 복원은 실행하지 않았다. 완료 시 한국어·라이트 모드·기본 글씨 크기 `large`로 복원하고 내정보 화면에 두었다.

## 화면 기록

| 화면 | 캡처 |
| --- | --- |
| 내정보 / 라이트 | [account-light.png](account-light.png) |
| 내정보 / 다크 | [account-dark.png](account-dark.png) |
| 내정보 / 큰 글씨 | [account-large-text.png](account-large-text.png) |
| 페이월 / 연간 | [paywall-annual-light.png](paywall-annual-light.png) |
| 페이월 / 월간 | [paywall-monthly-light.png](paywall-monthly-light.png) |
| 페이월 / 다크 | [paywall-dark.png](paywall-dark.png) |
| 페이월 / 큰 글씨 상단 | [paywall-large-text-top.png](paywall-large-text-top.png) |
| 페이월 / 큰 글씨 기간 선택 | [paywall-large-text-plans.png](paywall-large-text-plans.png) |
