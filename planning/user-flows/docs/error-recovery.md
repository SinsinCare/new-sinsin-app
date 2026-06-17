# Flow: 앱 실행 및 공통 오류 복구

## 1. 목적

앱 실행 시 정책 확인, 세션 복원, 계정 상태 라우팅, 비로그인 접근 처리, 네트워크 오류 재시도 같은 공통 복구 경로를 정의한다.

## 2. 진입 경로

- 앱 실행
- 보호된 route 접근
- API 401 또는 refresh token 만료
- 네트워크 실패 후 재시도
- 모바일 정책이 강제 업데이트 또는 점검을 반환

## 3. 선행 조건

- AppPolicyGate가 앱 렌더링 전에 모바일 정책을 확인한다.
- useAuth는 저장된 refresh token으로 세션 복원을 시도한다.
- RootLayout은 계정 상태와 route group을 기준으로 리다이렉트한다.

## 4. 정상 경로

1. 앱이 모바일 정책을 확인한다.
2. 정책이 allow 또는 recommend_update면 세션 복원을 진행한다.
3. refresh token이 유효하면 계정 상태를 확인한다.
4. ACTIVE 계정은 홈으로 이동한다.
5. PENDING_ONBOARDING 계정은 온보딩으로 이동한다.
6. token이 없거나 유효하지 않으면 로그인 화면으로 이동한다.

## 5. 예외 경로

### A. 강제 업데이트 또는 점검

- 정책 화면을 보여주고 앱 사용을 차단한다.
- 클라이언트는 version 비교를 자체 계산하지 않고 서버의 decision을 따른다.

### B. 정책 조회 네트워크 실패

- 공통 오류 상태를 보여준다.
- 사용자가 재시도하면 정책 조회부터 다시 시작한다.

### C. 세션 복원 실패

- refresh token이 없거나 만료되면 로그인 화면으로 이동한다.
- 네트워크 실패는 재시도 가능 오류로 남긴다.

### D. 차단 계정

- SUSPENDED 또는 WITHDRAWAL_PENDING 계정은 signOut을 호출한다.
- 로컬 세션 정리 후 로그인 화면으로 이동한다.

### E. 비로그인 보호 화면 접근

- auth group, 공개 legal document, withdrawal-complete가 아니면 `/(auth)/login`으로 replace한다.

## 6. 연결 정보

- Flow YAML: `flows/error-recovery.flow.yaml`
- Main routes:
  - `/`
  - `/(auth)/login`
  - `/onboarding`
  - `/(tabs)/home`
- Main APIs:
  - `API_GET_MOBILE_POLICY`
  - `API_AUTH_REFRESH_TOKEN`
  - `API_AUTH_LOGOUT`
- Main events:
  - `app_launch_started`
  - `app_policy_checked`
  - `app_policy_blocked`
  - `auth_session_restore_started`
  - `auth_session_restore_failed`
  - `error_retry_tapped`
