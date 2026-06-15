# Flow: 프로필 및 설정

## 1. 목적

사용자가 My Page와 설정 화면에서 기본 프로필, 신장 프로필, 비밀번호, 문의, 탈퇴 관련 작업을 완료하게 한다.

## 2. 진입 경로

- 하단 탭의 전체 메뉴
- 전체 메뉴에서 설정 화면 진입
- My Page의 프로필, 신장 프로필, 문의, 담당의 연결, 탈퇴 메뉴 선택

## 3. 선행 조건

- 사용자는 ACTIVE 계정으로 로그인되어 있어야 한다.
- 프로필 수정 API는 인증 토큰이 필요하다.
- 이미지 첨부는 사진 접근 권한이 필요할 수 있다.

## 4. 정상 경로

1. 사용자가 전체 메뉴에 진입한다.
2. 앱이 사용자 프로필을 조회한다.
3. 사용자가 수정할 항목을 선택한다.
4. 입력값 검증 후 관련 API를 호출한다.
5. 성공 시 My Page 또는 이전 화면으로 돌아간다.

주요 정상 경로:

- 기본 프로필 수정: `API_UPDATE_USER_PROFILE`
- 닉네임 수정: `API_AUTH_VERIFY_NICKNAME` 후 `API_UPDATE_USER_PROFILE`
- 신장 프로필 수정: `API_GET_KIDNEY_PROFILE` 후 `API_UPDATE_KIDNEY_PROFILE`
- 비밀번호 변경: `API_UPDATE_PASSWORD` 성공 후 로그인 화면으로 이동
- 문의 제출: `API_CREATE_INQUIRY` 성공 후 이전 화면으로 이동
- 회원탈퇴: 사유 입력, 최종 확인, `API_WITHDRAW_USER`, 완료 화면 이동

## 5. 예외 경로

### A. 프로필 조회 실패

- 오류 상태를 표시한다.
- 사용자는 나중에 다시 진입하거나 재시도할 수 있다.

### B. 수정 입력값 오류

- API 호출 전 validation error 상태를 유지한다.
- 사용자가 입력값을 수정할 수 있게 한다.

### C. 닉네임 중복

- 중복 메시지를 보여주고 닉네임 수정 화면에 남긴다.

### D. 사진 권한 거부

- 첨부 없이 계속 작성할 수 있게 한다.
- 프로필 또는 문의 제출 자체를 막지 않는다.

### E. 회원탈퇴 사유 누락

- 최종 확인 화면으로 이동하지 않는다.
- 사유 입력을 요구한다.

### F. 회원탈퇴 실패

- 완료 화면으로 이동하지 않는다.
- 오류를 보여주고 최종 확인 화면에 남긴다.

## 6. 연결 정보

- Flow YAML: `flows/profile.flow.yaml`
- Main routes:
  - `/(tabs)/all`
  - `/(settings)/profile-edit`
  - `/(settings)/kidney-profile-edit`
  - `/(settings)/password-edit`
  - `/(settings)/inquiry`
  - `/(settings)/withdrawal`
- Main APIs:
  - `API_GET_USER_PROFILE`
  - `API_UPDATE_USER_PROFILE`
  - `API_GET_KIDNEY_PROFILE`
  - `API_UPDATE_KIDNEY_PROFILE`
  - `API_UPDATE_PASSWORD`
  - `API_CREATE_INQUIRY`
  - `API_WITHDRAW_USER`
- Main events:
  - `profile_viewed`
  - `profile_update_succeeded`
  - `kidney_profile_update_succeeded`
  - `password_change_succeeded`
  - `inquiry_submitted`
  - `account_withdrawal_requested`
