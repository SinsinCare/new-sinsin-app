# 신신당부 모바일 런타임 정책 및 강제 업데이트 운영 계획

작성일: 2026-06-10
기준안: 선택지 B - 서버 권위 모바일 런타임 정책 API
대상 repo: `sinsin-rn`, `sinsin-be-legacy-py`, `sinsin-admin-dashboard`

현재 확인 기준:

- 앱: Expo Router, Expo SDK 55, React Native 0.83, Tamagui, React Query
- 현재 앱 버전: `1.0.12`
- iOS: bundle id `com.mediology.sinsin-care`, buildNumber `3`, App Store Connect app id `6758880186`
- Android: package `com.mediology.sinsinapp`, versionCode `11`
- 백엔드: FastAPI + SQLAlchemy + Alembic
- 관리자 보드: Next.js 16 App Router + PostgreSQL 조회 API

## 1. 목표

앱 실행 직후 인증보다 먼저 서버의 모바일 런타임 정책을 조회한다. 앱은 자신의 플랫폼, 앱 버전, 빌드 번호, API 계약 버전, 실행 환경만 서버에 보내고, 서버가 `allow`, `recommend_update`, `force_update`, `maintenance`, `unsupported_contract` 중 하나를 최종 결정한다.

현재 설치된 앱이 서버가 허용하지 않는 버전이면 앱 사용을 차단하고 "최신 버전으로 업데이트해주세요" 화면을 띄운다. 사용자는 업데이트 버튼을 통해 App Store 또는 Google Play로 이동한다. 닫기, 뒤로가기, 우회 진입은 허용하지 않는다.

운영자는 `sinsin-admin-dashboard`에서 iOS/Android 각 앱 빌드를 값 단위로 등록하고 상태를 직접 관리한다. 범위 기반 최소 버전 계산이 아니라 `platform + environment + app_version + build_number`가 정확히 일치하는 행의 상태로 판단한다.

이 구조의 목적은 단순 업데이트 팝업이 아니다. 프로덕션 서버가 바뀌어도 오래된 앱 사용자가 즉시 깨지지 않도록 서버가 앱 버전별 호환 정책, 기능 사용 가능 여부, 점검 상태, AI 기능 활성 여부를 통제하는 것이다.

## 2. 이번 범위

이번 작업에 포함한다.

- 인증 전 public 모바일 런타임 정책 API
- 서버 권위 앱 실행 전 검증 로직
- 앱 버전 행 단위 수동 관리
- 강제 업데이트/권장 업데이트/점검/계약 불일치 decision
- 관리자 보드 id/pw 로그인 및 TOTP 2차 인증
- 관리자 계정 생성용 비공개 CLI 또는 직접 DB insert 절차
- 관리자 정책 변경 감사 로그
- React Native 앱의 업데이트 차단 화면
- 서버 API 변경과 AI 변경에 대비한 계약 버전/feature flag 기반 운영

이번 작업에서 제외한다.

- 로그인 후 공지 팝업
- Expo OTA / EAS Update 적용
- 스토어 배포 자동화
- 공개 관리자 계정 생성 API

## 3. 핵심 원칙

### 서버가 최종 판단한다

클라이언트는 사실 정보만 보낸다.

- `platform`: `ios` 또는 `android`
- `environment`: `production`, `test`, `development`
- `app_version`: 예 `1.0.12`
- `build_number`: iOS `buildNumber`, Android `versionCode`
- `api_contract_version`: 앱이 지원하는 모바일 API 계약 버전

서버가 최종 판단한다.

- 해당 앱 빌드를 계속 허용할지
- 업데이트를 권장할지
- 강제 업데이트로 차단할지
- 점검 모드로 차단할지
- 서버 계약 불일치로 차단할지
- 특정 기능이나 AI 기능을 켤지 끌지

앱은 서버 응답의 `decision`을 재계산하지 않는다. 앱 코드 안에서 최소 버전 비교, 심사 빌드 판단, 계약 버전 차단 판단, AI 제공자 분기 같은 운영 로직을 넣지 않는다.

### 버전은 범위가 아니라 행 단위로 관리한다

관리자는 각 빌드를 명시적으로 등록한다.

- iOS `1.0.12 (3)` production: `allowed`
- iOS `1.0.13 (4)` production: `review`
- Android `1.0.12 (11)` production: `allowed`
- Android `1.0.13 (12)` production: `review`

서버는 요청과 정확히 일치하는 버전 행을 찾고 그 행의 `status`를 decision으로 변환한다. 미등록 버전은 공통 정책의 `unknown_version_decision`을 따른다.

### 스토어 심사는 review 상태로 처리한다

스토어 심사 중인 빌드는 `status=review`로 등록한다. `review_expires_at`은 필수다. 만료된 review 빌드는 더 이상 심사 예외로 보지 않고 서버가 차단 또는 unsupported로 처리한다.

출시 승인 후에는 해당 행을 `allowed`, `is_latest=true`로 변경하고 이전 최신 행의 `is_latest=false`를 처리한다.

### 서버는 하위 앱 계약을 유지한다

강제 업데이트 정책이 있어도 기존 앱 사용자가 업데이트하기 전까지는 서버 API를 계속 호출할 수 있다. 따라서 서버 API는 다음 원칙을 지킨다.

- 기존 응답 필드는 삭제하지 않고 nullable 또는 optional로 유지한다.
- 새 필드는 기본값을 둔다.
- 의미가 바뀌는 변경은 새 endpoint 또는 새 contract version으로 분리한다.
- 서버 계약을 깨는 변경 전에는 영향받는 버전 행을 먼저 `recommended` 또는 `blocked`로 바꾼다.
- AI 제공자/모델명은 앱이 알지 못하게 하고 서버 내부에서 교체한다.

## 4. 백엔드 설계

### public endpoint

`GET /public/mobile-policy`

요청 쿼리:

- `platform`
- `environment`
- `app_version`
- `build_number`
- `api_contract_version`

응답 예:

```json
{
  "isSuccess": true,
  "result": {
    "platform": "ios",
    "environment": "production",
    "decision": "force_update",
    "reason": "version_status_blocked",
    "current": {
      "appVersion": "1.0.12",
      "buildNumber": 3,
      "apiContractVersion": 1
    },
    "matchedVersion": {
      "appVersion": "1.0.12",
      "buildNumber": 3,
      "status": "blocked"
    },
    "latest": {
      "appVersion": "1.0.13",
      "buildNumber": 4
    },
    "storeUrl": "https://apps.apple.com/app/id6758880186",
    "message": "최신 버전으로 업데이트해주세요.",
    "featureFlags": {
      "foodCameraEnabled": true,
      "aiChatEnabled": true
    },
    "aiPolicy": {
      "chatProvider": "server_default",
      "foodAnalysisProvider": "server_default"
    },
    "cacheTtlSeconds": 300
  }
}
```

`decision` 값:

- `allow`: 정상 사용 가능
- `recommend_update`: 사용 가능하지만 업데이트 권장
- `force_update`: 앱 사용 차단
- `maintenance`: 점검으로 차단
- `unsupported_contract`: 서버 API 계약 불일치로 차단

### admin endpoint

관리자 보드는 DB에 직접 쓰지 않고 FastAPI admin API를 호출한다.

필요 endpoint:

- `GET /admin/mobile-app/policies`
- `PATCH /admin/mobile-app/policies/{id}`
- `GET /admin/mobile-app/versions`
- `POST /admin/mobile-app/versions`
- `PATCH /admin/mobile-app/versions/{id}`
- `POST /admin/mobile-app/versions/{id}/transition`
- `GET /admin/audit-logs`

쓰기 endpoint는 관리자 세션, CSRF 토큰, 입력 검증, 감사 로그를 통과해야 한다.

### backend files

권장 파일:

- `app/domain/mobile_policy/router.py`
- `app/domain/mobile_policy/admin_router.py`
- `app/domain/mobile_policy/service.py`
- `app/domain/mobile_policy/repository.py`
- `app/domain/mobile_policy/schemas.py`
- `app/domain/admin_auth/router.py`
- `app/domain/admin_auth/service.py`
- `app/domain/admin_auth/repository.py`
- `app/domain/admin_auth/schemas.py`

`app/main.py`에 public router와 admin router를 분리해서 등록한다. public 정책 조회는 인증 없이 호출 가능해야 하고, admin router는 관리자 인증이 필수다.

## 5. DB 설계

### `mobile_app_policy`

플랫폼/환경별 공통 정책이다. 버전 범위가 아니라 점검, 기본 스토어 URL, 미등록 버전 처리, 기능 플래그를 담는다.

필드:

- `id`
- `platform`: `ios`, `android`
- `environment`: `production`, `test`, `development`
- `default_store_url`
- `unknown_version_decision`: `allow`, `recommend_update`, `force_update`
- `unknown_version_message`
- `maintenance_mode`
- `maintenance_message`
- `feature_flags`: JSON
- `ai_policy`: JSON
- `created_at`
- `updated_at`

제약:

- unique: `platform + environment`

### `mobile_app_version`

관리자가 앱 빌드를 하나씩 등록하고 상태를 조작하는 테이블이다.

필드:

- `id`
- `platform`: `ios`, `android`
- `environment`: `production`, `test`, `development`
- `app_version`: 예 `1.0.12`
- `build_number`: iOS `buildNumber` 또는 Android `versionCode`
- `status`: `allowed`, `review`, `recommended`, `blocked`, `unsupported`
- `is_latest`
- `store_url`
- `api_contract_version`
- `min_server_contract_version`
- `message`
- `review_expires_at`
- `release_notes`
- `created_at`
- `updated_at`

제약:

- unique: `platform + environment + app_version + build_number`
- 플랫폼/환경별 `is_latest=true`는 1개만 허용
- `status=review`이면 `review_expires_at` 필수

상태 의미:

- `allowed`: 정상 사용 가능
- `review`: 스토어 심사 중인 빌드로 정상 사용 가능
- `recommended`: 사용 가능하지만 업데이트 권장
- `blocked`: 강제 업데이트
- `unsupported`: 서버 계약 불일치 또는 폐기된 빌드

### `admin_user`

관리자 로그인 계정이다.

필드:

- `id`
- `email`
- `password_hash`
- `display_name`
- `role`: `owner`, `operator`, `viewer`
- `is_active`
- `totp_secret_encrypted`
- `totp_enabled`
- `failed_login_count`
- `locked_until`
- `last_login_at`
- `created_at`
- `updated_at`

### `admin_audit_log`

관리자 변경 이력이다.

필드:

- `id`
- `admin_user_id`
- `action`
- `resource_type`
- `resource_id`
- `before_json`
- `after_json`
- `ip_address`
- `user_agent`
- `created_at`

앱 버전 상태 변경, 공통 정책 변경, 관리자 계정 비활성화, TOTP 초기화는 모두 기록한다.

## 6. 관리자 인증 설계

기존 `sinsin-admin-dashboard`의 단일 `ADMIN_PASSWORD` 방식은 폐기한다. 특히 현재 방식은 쿠키 값이 비밀번호와 같아서 쓰기 기능이 붙으면 위험하다.

로그인 흐름:

1. 이메일과 비밀번호 입력
2. 서버가 계정 활성 상태, 잠금 상태, 비밀번호 해시 검증
3. 비밀번호가 맞으면 TOTP 6자리 입력 단계로 이동
4. TOTP 검증 성공 시 짧은 만료 시간을 가진 서명된 httpOnly secure 세션 쿠키 발급
5. 쓰기 요청은 CSRF 토큰 또는 double-submit 토큰 검증
6. 정책 변경은 `admin_audit_log`에 기록

비밀번호:

- Argon2id 우선, bcrypt 허용
- 평문 저장 금지
- 실패 횟수 누적과 잠금 처리
- owner 계정은 최소 2개 유지

2차 인증:

- TOTP 앱 기반을 1차로 채택
- SMS는 운영자 수가 적은 콘솔에는 우선순위 낮음
- 장기적으로 Passkey/WebAuthn 추가 가능

계정 생성:

- 공개 계정 생성 API는 만들지 않는다.
- 권장 방식은 `scripts/create_admin_user` 같은 서버/로컬 전용 CLI다.
- CLI가 이메일, 임시 비밀번호, TOTP secret을 생성하고 DB에는 hash와 암호화된 secret만 저장한다.
- 직접 SQL insert도 허용하되, 로컬에서 hash와 암호화된 secret을 만든 뒤 넣는다.
- 평문 비밀번호, 평문 복구코드 저장은 금지한다.

복구:

- TOTP 분실 시 DB에서 `totp_enabled=false`로 초기화하거나 offline recovery code hash를 사용한다.
- 퇴사/권한 회수 시 `is_active=false` 처리하고 세션을 무효화한다.

## 7. 관리자 보드 설계

`sinsin-admin-dashboard`를 확장한다. 이 repo는 이미 운영 통계, 문의, 에러 로그를 보여주는 Next.js 관리자 콘솔이므로 새 앱을 만들 필요가 없다.

화면:

- 로그인: 이메일/비밀번호
- 2차 인증: TOTP 6자리
- 대시보드 홈: 기존 통계 유지
- 모바일 앱 공통 정책: 플랫폼/환경별 점검, 기본 스토어 URL, 미등록 버전 처리
- 모바일 앱 버전: iOS/Android 앱 빌드 행 관리
- 감사 로그: 최근 정책 변경 내역

버전 관리 UI:

- 플랫폼 필터: iOS, Android
- 환경 필터: production, test, development
- 버전 행 목록: version, build, status, latest, contract, review expiry
- 상태 변경: `review`, `allowed`, `recommended`, `blocked`, `unsupported`
- 변경 전 확인 모달
- 변경 사유 입력 필수
- 최신 버전 변경 시 기존 latest 자동 해제는 백엔드가 처리

주의:

- `sinsin-admin-dashboard`가 운영 DB를 직접 조회하는 것은 통계에는 허용한다.
- 정책 변경 쓰기는 직접 DB update가 아니라 FastAPI admin API를 통해 수행한다.
- 입력 검증과 상태 전이는 백엔드 service에서 강제한다.

## 8. 배포 운영 방향

관리자 보드는 Vercel이 아니라 Cloud Run으로 배포한다. 신신당부 서비스가 이미 GCP/Cloud Run/Cloud SQL 중심으로 운영되고 있으므로, 관리자 보드도 같은 보안 경계와 배포 체계 안에 두는 편이 장기 운영에 유리하다.

권장 배포 단위:

- `sinsin-be-legacy-py`: FastAPI API service
- `sinsin-admin-dashboard`: Next.js 관리자 service
- `sinsin-doctor-dashboard`: 의사 대시보드 service 또는 정적 assets service
- `sinsin-promo-web`: 프로모션 웹 service 또는 정적 hosting

운영 원칙:

- 로컬 개발과 test 환경은 prod DB를 기본으로 바라보지 않는다.
- Cloud Run production 배포만 production Cloud SQL과 연결한다.
- 관리자 보드의 production service는 Secret Manager에서 DB/API/session/TOTP secrets를 읽는다.
- 통계 조회는 가능하면 read-only DB 계정을 사용한다.
- 정책 변경 쓰기는 admin dashboard가 DB에 직접 쓰지 않고 `sinsin-be-legacy-py` admin API를 호출한다.
- 관리자 service에는 Cloud Armor, IAP, 사내 IP allowlist, 또는 추가 접근 보호를 검토한다.
- 저트래픽 관리자/프로모션 페이지는 `min-instances=0`을 기본값으로 두고, 사용성이 필요한 핵심 API만 별도 기준으로 `min-instances`를 판단한다.

Cloud Run 선택 이유:

- GCP Secret Manager, Cloud SQL, Cloud Logging, IAM, Cloud Armor와 운영 경계가 일관된다.
- 여러 웹 페이지가 늘어날수록 Vercel 프로젝트/팀/사용량 관리가 분산되지 않는다.
- Next.js 앱도 standalone output 또는 일반 Node server 컨테이너로 배포할 수 있다.
- 비용은 서비스별 scale-to-zero와 resource right-sizing으로 통제한다.

주의할 점:

- Vercel의 preview deployment, CDN, Next.js 최적화 UX는 Cloud Run에서 직접 구성해야 한다.
- Cloud Run에서 Next.js를 돌릴 때는 Dockerfile, standalone build, health check, env injection, logging을 명시적으로 관리한다.
- `min-instances=1`은 idle 비용을 만든다. 관리자 보드처럼 낮은 트래픽 서비스에는 기본 적용하지 않는다.

## 9. 모바일 앱 설계

### 부트 순서

1. 폰트와 기본 앱 shell 로딩
2. `AppPolicyGate`가 `GET /public/mobile-policy` 호출
3. `decision=allow`이면 기존 `RootLayoutNav` 렌더
4. `decision=recommend_update`이면 앱 사용은 허용하고 업데이트 권장 UI 표시
5. `decision=force_update` 또는 `unsupported_contract`이면 앱 전체 차단
6. `decision=maintenance`이면 점검 화면 표시

### 버전 정보 수집

Expo에서 읽을 값:

- `Constants.expoConfig?.version`
- `Constants.expoConfig?.ios?.buildNumber`
- `Constants.expoConfig?.android?.versionCode`
- `Platform.OS`

권장 파일:

- `src/config/runtimeInfo.ts`
- `src/services/mobilePolicyService.ts`
- `src/features/mobilePolicy/AppPolicyGate.tsx`
- `src/features/mobilePolicy/ForceUpdateScreen.tsx`

### 차단 화면

요구 UI:

- 제목: `최신 버전으로 업데이트해주세요`
- 본문: 서버 메시지 또는 기본 문구
- 버튼: `업데이트하기`
- 보조 버튼 없음
- 외부 터치 닫기 없음
- 뒤로가기 차단
- Android hardware back 차단

스토어 이동:

- `Linking.openURL(storeUrl)`
- 실패 시 화면 안에 오류 문구 표시

### 캐시와 실패 처리

정책 응답은 AsyncStorage에 저장한다.

캐시 키:

- `mobilePolicy:lastSuccessful:v1`

동작:

- 네트워크 실패 시 짧은 재시도 1회
- 마지막 성공 캐시가 있으면 캐시 기준 판단
- `force_update` 캐시는 TTL이 지나도 차단 유지
- `allow` 캐시는 서버 장애 때만 임시 사용
- 캐시도 없으면 로그인 화면까지 제한적 진입 허용

## 10. 릴리스 운영 절차

신규 빌드 제출 전:

1. 신규 iOS/Android 빌드 번호 확인
2. `sinsin-admin-dashboard`에서 신규 `app_version + build_number` 행 생성
3. 신규 행을 `status=review`로 설정
4. `review_expires_at` 입력
5. 심사용 계정으로 앱 접속 QA

스토어 승인 후:

1. 스토어 공개 상태 확인
2. 신규 행을 `status=allowed`, `is_latest=true`로 변경
3. 이전 latest 행의 `is_latest=false` 처리는 백엔드가 수행
4. 앱의 업데이트 버튼이 실제 스토어 URL을 여는지 확인
5. 오래된 빌드 사용자 비율 모니터링

강제 업데이트 전:

1. 최신 버전 스토어 배포 완료 확인
2. 최소 24-72시간 유예 권장
3. 고객지원 안내 문구 준비
4. 구버전 행을 `recommended`로 먼저 전환
5. 필요 시 구버전 행을 `blocked`로 전환
6. 정책 API 호출량과 오류 로그 모니터링

주의:

- 신규 빌드가 아직 스토어에 공개되지 않았는데 기존 버전을 `blocked`로 바꾸면 사용자가 업데이트를 찾지 못한다.
- iOS와 Android 배포 시점이 다를 수 있으므로 플랫폼별로 따로 조작한다.
- review 상태는 만료 시간을 반드시 둔다.

## 11. 서버 변경과 AI 변경 대응

API 계약:

- 앱은 `api_contract_version`을 고정 값으로 보낸다.
- 서버는 버전 행의 계약 정보와 비교해 허용 여부를 결정한다.
- 계약을 깨는 서버 변경 전에는 영향받는 앱 버전 행을 `recommended` 또는 `blocked`로 바꾼다.

AI 변경:

- 앱은 AI 제공자나 모델명을 알지 않는다.
- 앱은 `aiChatEnabled`, `foodAnalysisEnabled`, `voiceConsultEnabled` 같은 기능 가능 여부만 본다.
- 모델 교체, 프롬프트 변경, provider 변경은 서버 내부에서 처리한다.
- 앱 영향이 있으면 `featureFlags` 또는 `aiPolicy`로 기능을 숨기거나 점검 메시지를 내려준다.

## 12. 테스트 계획

백엔드:

- 정확히 일치하는 버전 행의 `status=allowed`이면 `allow`
- `status=review`이고 `review_expires_at`이 미래이면 `allow`
- `status=review`이지만 만료되었으면 차단 decision
- `status=recommended`이면 `recommend_update`
- `status=blocked`이면 `force_update`
- `status=unsupported`이면 `unsupported_contract`
- `maintenance_mode=true`이면 `maintenance`
- 일치하는 버전 행이 없으면 `unknown_version_decision` 적용
- `is_latest=true` 단일성 보장
- 모든 admin 변경은 audit log 생성
- 비밀번호 실패 잠금, TOTP 실패, 세션 만료, CSRF 실패 검증

관리자 보드:

- 이메일/비밀번호 로그인
- TOTP 2차 인증
- 로그아웃
- 모바일 앱 공통 정책 조회/수정
- 모바일 앱 버전 생성/수정/상태 변경
- 변경 사유 입력 없이는 상태 변경 불가
- 401/403 발생 시 로그인으로 복귀

모바일:

- `allow`이면 기존 로그인/홈 라우팅 정상 동작
- `recommend_update`이면 사용 가능
- `force_update`이면 로그인 화면 진입 불가
- `unsupported_contract`이면 로그인 화면 진입 불가
- `maintenance`이면 점검 화면 표시
- 업데이트 버튼이 플랫폼별 스토어 URL을 연다
- 네트워크 실패 + 캐시 있음은 캐시 기준 동작
- 네트워크 실패 + 캐시 없음은 제한적 진입 허용
- Android back 버튼으로 차단 화면을 벗어날 수 없음

## 13. 구현 순서

### 1단계: 백엔드 데이터와 정책 API

- `mobile_app_policy` 모델 추가
- `mobile_app_version` 모델 추가
- Alembic 마이그레이션 추가
- public mobile policy router 추가
- service/repository/schema 추가
- policy decision 단위 테스트 추가

### 2단계: 관리자 인증

- `admin_user` 모델 추가
- `admin_audit_log` 모델 추가
- Alembic 마이그레이션 추가
- id/pw 로그인 API 추가
- TOTP 검증 API 추가
- 서명 세션 쿠키 추가
- CSRF 보호 추가
- `scripts/create_admin_user` 추가
- 인증/잠금/감사 로그 테스트 추가

### 3단계: 관리자 정책 API

- admin mobile policy router 추가
- version create/update/transition API 추가
- 상태 전이 검증 추가
- audit log 기록 추가
- admin API 테스트 추가

### 4단계: `sinsin-admin-dashboard`

- 기존 단일 비밀번호 로그인 제거
- 이메일/비밀번호 로그인 화면 추가
- TOTP 화면 추가
- 세션 확인 API 연동
- 모바일 앱 공통 정책 화면 추가
- 모바일 앱 버전 관리 화면 추가
- 감사 로그 화면 또는 최근 변경 로그 추가

### 5단계: `sinsin-rn`

- runtime info 래퍼 추가
- mobile policy service 추가
- `AppPolicyGate` 추가
- 강제 업데이트/점검 화면 추가
- 정책 캐시 추가
- root layout에 연결

### 6단계: 운영 리허설

- test 환경에서 현재 iOS/Android 빌드 `allowed` 등록
- 신규 가짜 빌드 `review` 등록 후 허용 확인
- 구버전 `recommended`, `blocked`, `unsupported` 시나리오 확인
- admin 로그인/TOTP/감사 로그 확인
- production 초기 데이터 입력

## 14. 초기 데이터

초기 버전 행:

- iOS production: `1.0.12 (3)`, `status=allowed`, `is_latest=true`
- Android production: `1.0.12 (11)`, `status=allowed`, `is_latest=true`

초기 공통 정책:

- iOS production `unknown_version_decision=recommend_update`
- Android production `unknown_version_decision=recommend_update`
- `maintenance_mode=false`
- `feature_flags`는 기존 기능 모두 true로 시작
- `ai_policy`는 provider/model을 노출하지 않고 `server_default`로 시작

초기 관리자:

- owner 계정 2개 생성
- TOTP 등록 완료 후 단일 `ADMIN_PASSWORD` 제거
- 계정 생성은 CLI 또는 직접 DB insert로만 수행
