# 온보딩 V2 실화면·기능 감사

- Task: `DEV-20260726-008`
- 기준: `origin/develop` `c8c7a4c`
- 대상 route: `/onboarding`
- 실행 환경: iPhone 17 Pro Simulator, iOS 26.5, test env
- 캡처 모드: `EXPO_PUBLIC_USE_MOCK_AUTH=true`,
  `EXPO_PUBLIC_USE_MOCK_MODE=true`

> 현재 캡처는 test API를 변경하지 않고 화면과 분기를 반복 점검하기 위한 mock
> 런타임이다. 실제 test API 제출/ACTIVE 전환 증거로 사용하지 않는다.

## 보존한 화면

| 파일                                  | 상태                        |
| ------------------------------------- | --------------------------- |
| `01-current-runtime-choice.jpeg`      | CKD/비환자 미선택           |
| `02-ckd-selected.jpeg`                | CKD 선택                    |
| `03-ckd-question-1.jpeg`              | CKD 질문 1/8                |
| `figma-6063-45631-signup-success.png` | Figma `0.61_signup_success` |
| `figma-4892-103358-page-overview.png` | Figma 작업 페이지 전체 개요 |

## 확인된 런타임 동작

- `/onboarding` route는 `OnboardingScreen`만 렌더링하는 얇은 wrapper다.
- 같은 사용자는 `ownerUserId` 기준으로 진행 상태를 복원하고, 다른 사용자는
  CKD 여부·현재 단계·답변을 초기화한다.
- 첫 질문의 뒤로가기는 CKD/비환자 선택 화면으로 복귀한다.
- 선택 전 CTA는 비활성, 선택 후 활성화된다.
- CKD 선택 시 질문 8개를 표시한다.
- 단일·복수·입력 질문은 화면 유형과 답변 저장 모델이 분리되어 있다.
- submit 성공 후 세션 refresh 결과로 account state와 entry gate를 갱신한다.

## 이번에 수정한 기능 결함

mock onboarding service가 `hasCkd` 값을 무시하고 항상 CKD 8문항을 반환했다.
따라서 비환자를 선택해도 `현재 신장 상태를 알려주세요`가 다시 나타났다.

- `onboardingService.getSteps(hasCkd)`가 mock service에도 분기값을 전달한다.
- mock service에 backend 현재 계약과 동일한 비CKD 4문항 fixture를 추가했다.
- CKD 8문항/비CKD 4문항 분기 단위 테스트를 추가했다.

검증:

- Jest: 4 suites, 17 tests passed
- `npx tsc --noEmit`: passed
- scoped ESLint: passed

## API 계약 감사

- CKD/비CKD 질문 조회와 submit wire shape는 RN/BE가 맞는다.
- BE의 `subTitle`은 nullable이나 RN 응답 타입은 `string`으로 선언돼 있다.
  현재 header는 null을 안전하게 처리하지만 타입 계약은 수정 대상이다.
- BE submit은 질문 step/option key/flow 전체를 검증하지 않고 체중 범위만
  강제하므로 서버 검증이 RN보다 느슨하다.
- 서버가 submit을 commit한 뒤 응답이 유실되면, 재submit은
  `ONBOARDING_ALREADY_COMPLETED`로 실패하고 RN은 refresh까지 도달하지 못한다.
  제출 복구 정책은 RN/BE 별도 task로 분리해야 한다.
- profile, account state, weight 저장이 하나의 transaction으로 묶여 있지 않아
  중간 실패 시 부분 저장 위험이 있다.

## Figma 대조

- `4892:103358`은 단일 화면이 아니라 `[작업장] UIUX design` 페이지다.
- 브라우저 실화면으로 `6063:45631`을 확인했다. 노드 이름은
  `0.61_signup_success`이며 `0.52_signup_Route`,
  `0.53_signup_Route` 다음에 배치되어 있다.
- Figma MCP의 하위 노드 검색은 반복해서 HTTP 504가 발생했다. 따라서 CKD
  선택·질문·오류·skip 화면의 정확한 node는 아직 확정하지 않았다.
- exact node가 확정되기 전에는 현재 legacy 색상·간격을 임의로 V2 스타일로
  바꾸지 않는다.

## 사용자 결정 필요

### DEC-001 완료 화면 위치

현재 앱은 필수정보 뒤 `signup-complete`와 onboarding submit 뒤 `complete`
phase를 모두 갖고 있어 완료 화면이 두 번 보일 수 있다.

- 권고: 최근 사용자가 확인한 필수정보 직후 컨페티 완료 화면을 유지하고,
  onboarding submit 성공 뒤에는 홈으로 바로 이동한다.
- 대안: 필수정보 직후 완료 화면을 제거하고 onboarding 뒤에만 한 번 보인다.

### DEC-002 skip 노출

backend와 service에는 `/user/onboarding/skip`이 있지만 활성 hook/view에는 skip
UI가 없고 exact Figma 근거도 없다.

- 권고: 화면에는 노출하지 않고 endpoint를 legacy 호환으로만 유지한다.
- 대안: skip CTA와 확인 UX, 분석 이벤트를 새로 설계한다.

## 다음 작업

1. DEC-001/002를 확정한다.
2. exact Figma onboarding node를 확보하거나 현재 앱을 기준으로 새 V2 target을
   설계한다.
3. non-CKD runtime, 입력 keyboard, 작은 화면 스크롤, 오류/retry를 iOS에서
   재검증한다.
4. Android emulator/device를 확보해 hard back, keyboard, safe-area를 확인한다.
5. submit 응답 유실 복구와 backend transaction/검증은 별도 task로 분리한다.
