# 신신당부 (Sinsin Dangbu)

만성신장질환(CKD) 환자를 위한 건강관리 모바일 앱

[![App Store](https://img.shields.io/badge/App_Store-available-blue?logo=apple&logoColor=white)](https://apps.apple.com/us/app/%EC%8B%A0%EC%8B%A0%EB%8B%B9%EB%B6%80/id6758880186)

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

## 기술 스택

- **Framework:** Expo ~54.0, React Native 0.81
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
npx expo run:ios
```

### 실제 아이폰 디바이스

```bash
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npx expo run:ios --device
```

Xcode에서 **Signing & Capabilities → Team** 선택 필요 (Apple ID 계정)

### EAS 빌드 (TestFlight / 스토어)

환경 변수는 `eas.json`에 프로파일별로 설정되어 있어 별도 작업 불필요.

```bash
# iOS
eas build --platform ios --profile production
eas submit --platform ios --latest --profile production

# Android
eas build --platform android --profile production
eas submit --platform android --latest
```

### 로컬에서 iOS 개발 빌드 (Xcode)

**Debug로 Run(▶)할 때는 Metro가 반드시 있어야 합니다.**  
그렇지 않으면 `No script URL provided...` / `unsanitizedScriptURLString = (null)` 오류가 납니다.

```bash
# 터미널 1: 프로젝트 루트에서 Metro 실행
npx expo start

# Xcode에서 Run (Debug)
open ios/app.xcworkspace
```

한 번에 하려면 `npm run ios`(또는 `npx expo run:ios`)를 쓰면 Metro와 빌드가 같이 맞춰집니다.

```bash
npx expo prebuild --platform ios --clean   # 네이티브 폴더 재생성 시
```

**Metro 없이 로컬에서 돌리고 싶다면** Xcode Scheme의 Run을 **Release**로 바꾸거나:

```bash
npm run ios-release
```

(스토어 업로드: prebuild → Xcode **Archive** → Transporter)
