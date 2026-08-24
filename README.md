# 신신당부 (Sinsin Dangbu)

만성신장질환(CKD) 환자를 위한 건강관리 모바일 앱

[![App Store](https://img.shields.io/badge/App_Store-available-blue?logo=apple&logoColor=white)](https://apps.apple.com/us/app/%EC%8B%A0%EC%8B%A0%EB%8B%B9%EB%B6%80/id6758880186)
[![Google Play](https://img.shields.io/badge/Google_Play-available-green?logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.mediology.sinsinapp)

## 프로젝트 개요

React Native/Expo 기반의 크로스플랫폼 앱으로, AI 기반 음식 분석과 건강 상담 기능을 제공합니다.

### 주요 기능

- CKD 단계별(1-5단계) 건강 추적 및 투석 상태 관리
- AI 기반 음식 사진 분석 (신장 건강 안전도 평가)
- AI 건강 상담 챗봇
- 일일 건강 기록 및 영양소 추적 (나트륨, 칼륨, 인, 단백질)
- 수분 섭취 및 체중/부종 관리
- 신장 친화 레시피 커뮤니티
- 인스타그램 스토리 공유 (식단 분석 결과 카드)

### 다운로드

<a href="https://apps.apple.com/us/app/%EC%8B%A0%EC%8B%A0%EB%8B%B9%EB%B6%80/id6758880186">
  <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" height="40">
</a>
<a href="https://play.google.com/store/apps/details?id=com.mediology.sinsinapp">
  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" height="40">
</a>

## 기술 스택

- **Framework:** Expo ~55.0, React Native 0.83.4
- **Routing:** Expo Router (파일 기반 라우팅)
- **UI:** Tamagui v2
- **State:** Zustand (클라이언트) + React Query (서버)
- **Backend:** FastAPI (Sinsin) + FastAPI (Food-Camera-API) — Cloud Run (asia-northeast3)

## 코드 품질 도구

### ESLint + Prettier

```bash
npm run lint          # ESLint 검사
npm run lint:fix      # ESLint 자동 수정
npm run format        # Prettier 포맷팅
npm run format:check  # Prettier 포맷 검사
```

**ESLint 설정:** `eslint.config.js` - Expo 기본 설정 + Prettier 연동
**Prettier 설정:** `.prettierrc`

| 옵션           | 값    |
| -------------- | ----- |
| Semi           | false |
| Single Quote   | true  |
| Tab Width      | 2     |
| Trailing Comma | es5   |
| Print Width    | 100   |

## 개발 명령어

```bash
npm start          # Expo 개발 서버 시작
npm run android    # Android에서 실행
npm run ios        # iOS에서 실행
```

## 환경 변수 설정

`.env.example`을 참고하여 `.env` 파일을 생성하세요 :)

```bash
cp .env.example .env
```

필수 환경 변수:

- `EXPO_PUBLIC_BACKEND_URL` - 백엔드 API URL
- `EXPO_PUBLIC_USE_MOCK_AUTH` - Mock 인증 모드 (`true`/`false`)
- `EXPO_PUBLIC_USE_MOCK_MODE` - Mock 데이터 모드 (`true`/`false`)
- `EXPO_PUBLIC_MOCK_NO_USER` - 유저 프로필 없이 실행 (`true`/`false`)

### EAS 빌드 환경 변수

환경 변수는 `eas.json`의 각 빌드 프로파일(`development`, `preview`, `production`) `env` 블록에 이미 설정되어 있습니다. 별도 작업 없이 `eas build` 실행 시 자동으로 적용됩니다.

카카오 JS 키처럼 민감한 값은 [Expo Dashboard](https://expo.dev) → 프로젝트 → Secrets에서 등록하세요:

- `EXPO_PUBLIC_KAKAO_JS_KEY`

## 프로젝트 구조

```
app/
├── _layout.tsx        # 루트 레이아웃 (Providers, Auth 분기)
├── (auth)/            # 인증 화면 (login, signup, profile-setup)
└── (tabs)/            # 메인 앱 (home, food, consultation, settings)

src/
├── hooks/             # 커스텀 훅 (useAuth 등)
├── services/          # API 서비스
├── shared/components/ # 공통 UI 컴포넌트
├── stores/            # Zustand 스토어
└── types/             # TypeScript 타입 정의
```

## 브랜치 전략

```
main (프로덕션)  ← PR →  dev (개발/검증)  ← PR →  feature/* (기능 개발)
```

### 브랜치 구조

| 브랜치      | 역할                     | 머지 방식               |
| ----------- | ------------------------ | ----------------------- |
| `main`      | 프로덕션 배포 브랜치     | `dev`에서 PR 머지       |
| `dev`       | 개발 통합 및 검증 브랜치 | `feature/*`에서 PR 머지 |
| `feature/*` | 기능 개발 브랜치         | `dev`로 PR 생성         |

### 작업 흐름

1. `dev` 브랜치에서 `feature/기능명` 브랜치 생성
2. 기능 개발 완료 후 `dev`로 PR 생성 (CI 통과 필수 - 설정 예정)
3. 코드 리뷰 (필수 X) 후 `dev`에 머지
4. `dev`에서 검증 완료 후 `main`으로 PR 생성
5. `main` 머지 시 자동 배포 (배포 전략 협의 필요.)

### 브랜치 네이밍 예시

```
feature/login          # 새 기능
feature/food-analysis  # 새 기능
fix/auth-token         # 버그 수정
chore/update-deps      # 설정/환경 변경
refactor/state-mgmt    # 리팩토링
```

## 커밋 컨벤션

이 프로젝트는 [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/) 스타일을 권장합니다.

- **기본 포맷:**

  ```
  <type>[optional scope]: <description>
  ```

- **예시**
  - `feat: 음식 추천 탭 추가`
  - `fix(auth): 토큰 갱신 오류 수정`
  - `chore: 패키지 버전 업데이트`
  - `docs: README 커밋 규칙 추가`
  - `refactor: 상태 관리 로직 개선`

- **주요 type**
  - `feat`: 새로운 기능
  - `fix`: 버그 수정
  - `refactor`: 리팩터링 (기능 변화 없이 구조 개선)
  - `docs`: 문서 수정
  - `chore`: 빌드/설정/환경 수정
  - `test`: 테스트 코드 변경/추가
  - `style`: 코드 포맷팅, 세미콜론 등 스타일 변화

# 로컬 빌드

### iOS 시뮬레이터

```bash
npm run ios
```

### 실제 아이폰 디바이스

```bash
npm run native:sync:ios
cd ios && pod install && cd ..
npx expo run:ios --device
```

`npm run ios`와 `npm run android`는 빌드 전에 `app.json`을 네이티브
프로젝트에 동기화합니다. 앱 이름, 권한 안내, 지원 언어가 바뀌었을 때 이
단계를 건너뛰지 마세요.

Xcode에서 **Signing & Capabilities → Team** 선택 필요 (Apple ID 계정)

### Android (에뮬레이터 및 실제 디바이스)

1.  **폰 설정**: 실제 디바이스인 경우 '설정 > 휴대전화 정보 > 소프트웨어 정보'에서 '빌드 번호'를 연타하여 **개발자 옵션**을 활성화하고, **USB 디버깅**을 켭니다.
2.  **명령어 실행**:

    ```bash
    npm run android
    ```

    - `npm run android`가 네이티브 설정 동기화까지 함께 처리합니다.

### EAS 빌드 (테스트용 / 스토어 배포)

환경 변수는 `eas.json`에 프로파일별로 설정되어 있어 별도 작업 불필요.
스토어 자동 제출(`--auto-submit`)은 아래 [🚀 EAS 자동 배포](#-eas-자동-배포-cli) 참고.

#### iOS

```bash
# Test backend (TestFlight credentials, no submit)
eas build --platform ios --profile ios-testflight-test

# Production (App Store)
eas build --platform ios --profile testflight
eas submit --platform ios --latest --profile production

# Development Build
eas build --platform ios --profile development
```

#### Android

```bash
# Test backend (설치용 APK 생성)
eas build --platform android --profile test

# Test backend (Play 내부 테스트용 AAB 생성)
npm run build:test:android:aab

# Production backend (Play Store internal track)
eas build --platform android --profile playstore

# Development Build (개발용 앱 생성)
eas build --platform android --profile development
```

> **Google Play Store:** `com.mediology.sinsinapp` (계정: healthierwith@gmail.com)

---

## 🚀 EAS 자동 배포 (CLI)

클라우드 빌드 + 스토어 자동 제출을 **명령어 한 줄**로 수행합니다.
버전은 `app.json`의 `version` 한 곳에서만 관리하고, 빌드번호(iOS `buildNumber` /
Android `versionCode`)는 EAS가 자동 증가시킵니다.

### 배포 명령어

```bash
# iOS + Android 동시 빌드 + 각 스토어 자동 제출
npm run deploy            # = eas build --platform all --profile production --auto-submit

# 플랫폼별 빌드 + 제출
npm run deploy:ios        # = eas build --platform ios     --profile testflight --auto-submit-with-profile testflight
npm run deploy:android    # = eas build --platform android --profile playstore  --auto-submit-with-profile playstore

# 이미 만들어진 최신 빌드만 다시 제출
npm run submit:ios        # = eas submit --platform ios     --latest
npm run submit:android    # = eas submit --platform android --latest

# 빌드만 (제출 안 함)
eas build --platform ios     --profile testflight
eas build --platform android --profile playstore

# 원격 버전(빌드번호) 확인 / 빌드 상태·이력 확인
eas build:version:get --platform ios
eas build:list --platform ios --limit 5
```

### 릴리스 절차

1. 코드 변경 후 **커밋** (EAS 프로덕션 빌드는 커밋된 git 상태 기준)
2. `app.json`의 `version` 올리기 (예: 1.0.12 → 1.0.13). 빌드번호는 자동
3. `npm run deploy` 실행 → 빌드 완료 후 양 스토어 자동 제출
4. App Store Connect(TestFlight) / Play Console에서 심사 제출 및 출시

> 설정·트러블슈팅 상세는 [`eas.md`](./eas.md)(전체/iOS),
> [`eas-android.md`](./eas-android.md)(Android 서비스 계정 연결) 참고.
> iOS 자동 제출 키, Android `google-play-key.json` 발급 등 최초 1회 설정이 거기 정리돼 있습니다.

### 로컬에서 iOS 개발 빌드 (Xcode)

**Debug로 Run(▶)할 때는 Metro가 반드시 있어야 합니다.**  
그렇지 않으면 `No script URL provided...` / `unsanitizedScriptURLString = (null)` 오류가 납니다.

```bash
# 터미널 1: 프로젝트 루트에서 Metro 실행
npx expo start

# Xcode에서 Run (Debug)
open ios/app.xcworkspace
```

한 번에 하려면 `npm run ios`를 쓰면 네이티브 설정, Metro, 빌드가 같이 맞춰집니다.

```bash
npx expo prebuild --platform ios --clean   # 네이티브 폴더 재생성 시

open ios/app.xcworkspace
```

**Metro 없이 로컬에서 돌리고 싶다면** Xcode Scheme의 Run을 **Release**로 바꾸거나:

```bash
npm run ios-release
```

(스토어 업로드: prebuild → Xcode **Archive** → Transporter)
