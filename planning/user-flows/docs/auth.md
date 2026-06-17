# Flow: 인증 및 회원가입

## 1. 목적

로그인 전 사용자가 이메일 또는 소셜 계정으로 인증하고, 필요하면 회원가입, 이메일 연결, 비밀번호 재설정, 탈퇴 대기 취소를 완료하게 한다.

## 2. 진입 경로

- 보호된 화면 접근 실패 후 `/(auth)/login`으로 이동
- 앱 실행 시 저장된 세션이 없거나 refresh token 복원에 실패
- 로그인 화면에서 이메일 로그인, 소셜 로그인, 회원가입, 비밀번호 찾기 선택

## 3. 선행 조건

- 로그인 전에도 접근 가능한 공개 auth route여야 한다.
- 법적 문서 화면은 로그인 없이 접근 가능해야 한다.
- PENDING_ONBOARDING 계정은 로그인 성공 후 `/onboarding`으로 이동해야 한다.

## 4. 정상 경로

1. 사용자가 로그인 화면에 진입한다.
2. 이메일 로그인 또는 소셜 로그인을 선택한다.
3. 앱이 인증 API를 호출한다.
4. ACTIVE 계정이면 홈으로 이동한다.
5. PENDING_ONBOARDING 계정이면 온보딩으로 이동한다.

회원가입 정상 경로:

1. 사용자가 약관에 동의한다.
2. 이메일 사용 가능 여부를 확인한다.
3. OTP를 발송하고 검증한다.
4. 비밀번호, 기본 정보, 닉네임을 입력한다.
5. 닉네임 중복 확인 후 회원가입 API를 호출한다.
6. 완료 화면에서 온보딩 또는 홈으로 이동한다.

## 5. 예외 경로

### A. 이메일 로그인 실패

- API 오류 메시지를 로그인 화면에 표시한다.
- 이메일 입력값은 유지한다.
- 사용자가 다시 시도하거나 비밀번호 찾기로 이동할 수 있다.

### B. 탈퇴 대기 계정

- 로그인 API가 withdrawal pending 결과를 반환하면 탈퇴 취소 확인 상태를 보여준다.
- 사용자가 취소를 확정하면 `API_AUTH_CANCEL_WITHDRAWAL`을 호출한다.
- 실패하면 오류를 표시하고 로그인 화면에 남긴다.

### C. 소셜 이메일 연결 필요

- 소셜 로그인 결과가 이메일 연결을 요구하면 `/(auth)/social-link-email`로 이동한다.
- 이메일 OTP 발송과 검증이 성공하면 계정 상태에 따라 홈 또는 온보딩으로 이동한다.

### D. 회원가입 이메일 중복

- 가입 이메일 확인에서 중복이면 오류를 보여주고 같은 화면에 남긴다.
- 소셜 가입 이메일 연결이 필요한 경우 이메일 연결 비밀번호 설정 화면으로 보낸다.

### E. 비밀번호 재설정 실패

- OTP 발송, OTP 검증, 비밀번호 저장 실패를 각각 오류 상태로 표시한다.
- 성공 시 로그인 화면으로 돌아간다.

## 6. 연결 정보

- Flow YAML: `flows/auth.flow.yaml`
- Main routes:
  - `/(auth)/login`
  - `/(auth)/email-login`
  - `/(auth)/terms-agreement`
  - `/(auth)/signup-email`
  - `/(auth)/signup-password`
  - `/(auth)/profile-setup`
  - `/(auth)/nickname-setup`
  - `/(auth)/forgot-password`
- Main APIs:
  - `API_AUTH_EMAIL_LOGIN`
  - `API_AUTH_SOCIAL_LOGIN`
  - `API_AUTH_SIGNUP`
  - `API_AUTH_REFRESH_TOKEN`
  - `API_AUTH_CANCEL_WITHDRAWAL`
- Main events:
  - `auth_email_login_started`
  - `auth_email_login_succeeded`
  - `auth_email_login_failed`
  - `auth_social_login_started`
  - `auth_social_login_succeeded`
  - `auth_social_login_failed`
  - `auth_signup_completed`
