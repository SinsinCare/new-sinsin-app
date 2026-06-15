# Flow: 온보딩

## 1. 목적

PENDING_ONBOARDING 사용자가 CKD 여부와 건강 정보를 입력해 계정 상태를 ACTIVE로 전환하게 한다.

## 2. 진입 경로

- 회원가입 완료 후 계속하기
- 로그인 결과가 PENDING_ONBOARDING인 경우
- RootLayout guard가 PENDING_ONBOARDING 사용자를 `/onboarding`으로 리다이렉트하는 경우

## 3. 선행 조건

- 사용자는 로그인되어 있어야 한다.
- accountState는 PENDING_ONBOARDING이어야 한다.
- 온보딩 진행 상태는 store hydration 후 복원될 수 있어야 한다.

## 4. 정상 경로

1. 사용자가 CKD 여부를 선택한다.
2. CKD 여부에 따라 질문 목록을 조회한다.
3. 각 질문에 답변하고 다음 단계로 이동한다.
4. 마지막 질문에서 답변을 제출한다.
5. 가입 중 입력한 이름, 닉네임, 성별이 남아 있으면 기본 프로필에 반영한다.
6. accountState를 ACTIVE로 변경하고 홈으로 이동한다.

## 5. 예외 경로

### A. CKD 여부 미선택

- 시작 버튼을 눌러도 다음 단계로 진행하지 않는다.
- 사용자가 CKD 여부를 선택할 때까지 welcome 상태를 유지한다.

### B. 질문 목록 조회 실패

- Alert로 오류를 표시한다.
- 사용자는 welcome 단계에서 다시 시도할 수 있다.

### C. 답변 검증 실패

- 필수 답변 또는 숫자 입력이 유효하지 않으면 다음 단계로 이동하지 않는다.
- 기존 입력값은 유지한다.

### D. 제출 실패

- Alert로 오류를 표시한다.
- 답변은 store에 남기고 같은 단계에서 재시도할 수 있게 한다.

### E. 뒤로가기

- 첫 질문에서 뒤로가면 welcome으로 돌아가고 진행 상태를 초기화한다.
- 이후 질문에서는 이전 질문으로 이동한다.
- welcome 상태에서 Android 하드웨어 뒤로가기는 앱 종료를 막는다.

## 6. 연결 정보

- Flow YAML: `flows/onboarding.flow.yaml`
- Main route: `/onboarding`
- Main APIs:
  - `API_GET_ONBOARDING_CKD`
  - `API_GET_ONBOARDING_NON_CKD`
  - `API_SUBMIT_ONBOARDING`
  - `API_UPDATE_USER_PROFILE`
- Main events:
  - `onboarding_started`
  - `onboarding_steps_loaded`
  - `onboarding_submitted`
  - `onboarding_submit_failed`
