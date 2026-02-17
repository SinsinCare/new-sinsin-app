# sinsin-rn

신신당부 (Sinsin Dangbu) - 만성신장질환(CKD) 환자를 위한 한국어 건강관리 모바일 앱

## 프로젝트 개요

React Native/Expo 기반의 크로스플랫폼 앱으로, AI 기반 음식 분석과 건강 상담 기능을 제공합니다.

### 주요 기능

- CKD 단계별(1-5단계) 건강 추적 및 투석 상태 관리
- AI 기반 음식 사진 분석 (신장 건강 안전도 평가)
- AI 건강 상담 챗봇
- 일일 건강 기록 및 영양소 추적

## 기술 스택

- **Framework:** Expo ~54.0, React Native 0.81
- **Routing:** Expo Router (파일 기반 라우팅)
- **UI:** Tamagui v2
- **State:** Zustand (클라이언트) + React Query (서버)
- **Backend:** Firebase (Auth, Firestore) + AI Backend API

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

- `EXPO_PUBLIC_FIREBASE_*` - Firebase 인증 정보
- `EXPO_PUBLIC_BACKEND_URL` - AI 백엔드 URL

### EAS 프로덕션 빌드 (TestFlight/스토어)

`eas build` 시 `.env`는 번들에 포함되지 않습니다. **반드시** [Expo Dashboard](https://expo.dev) → 프로젝트 → Secrets에서 다음 변수를 production 환경에 설정하세요:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_BACKEND_URL`

> 환경 변수 미설정 시 앱이 Firebase 초기화 실패로 크래시할 수 있습니다. 현재 코드는 설정 누락 시 Mock 모드로 폴백합니다.

## 프로젝트 구조

```
app/
├── _layout.tsx        # 루트 레이아웃 (Providers, Auth 분기)
├── (auth)/            # 인증 화면 (login, signup, profile-setup)
└── (tabs)/            # 메인 앱 (home, food, consultation, settings)

src/
├── hooks/             # 커스텀 훅 (useAuth 등)
├── services/          # API, Firebase 서비스
├── shared/components/ # 공통 UI 컴포넌트
├── stores/            # Zustand 스토어
└── types/             # TypeScript 타입 정의
```

## 브랜치 전략

```
main (프로덕션)  ← PR →  dev (개발/검증)  ← PR →  feature/* (기능 개발)
```

### 브랜치 구조

| 브랜치 | 역할 | 머지 방식 |
|--------|------|-----------|
| `main` | 프로덕션 배포 브랜치 | `dev`에서 PR 머지 |
| `dev` | 개발 통합 및 검증 브랜치 | `feature/*`에서 PR 머지 |
| `feature/*` | 기능 개발 브랜치 | `dev`로 PR 생성 |

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

- 앱스토어 배포
app.json expo ios build_number 수정
```
eas build --platform ios --profile production

eas submit --platform ios --latest --profile production
```