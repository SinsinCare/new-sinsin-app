# sinsin-rn

신신당부 (Sinsin Dangbu) - 만성신장질환(CKD) 환자를 위한 한국어 건강관리 모바일 앱

## 프로젝트 개요

React Native/Expo 기반의 크로스플랫폼 앱으로, AI 기반 음식 분석과 건강 상담 기능을 제공합니다.

### 주요 기능

- CKD 단계별(1-5단계) 건강 추적 및 투석 상태 관리
- AI 기반 음식 사진 분석 (신장 건강 안전도 평가)
- AI 건강 상담 챗봇
- 일일 건강 기록 및 영양소 추적

## 관련 프로젝트

| 프로젝트                   | 경로                     | 기술 스택               |
| -------------------------- | ------------------------ | ----------------------- |
| iOS 네이티브 앱            | `../sinsin-ios-app/`     | Swift, SwiftUI          |
| Android 네이티브 앱        | `../sinsin-android-app/` | Kotlin, Jetpack Compose |
| **React Native 앱 (현재)** | `./`                     | Expo, React Native      |

> 이 React Native 프로젝트는 iOS/Android 네이티브 앱을 통합하는 마이그레이션 대상입니다.

## 기술 스택

- **Framework:** Expo ~54.0, React Native 0.81
- **Routing:** Expo Router (파일 기반 라우팅)
- **UI:** Tamagui v2 (glassmorphic 디자인)
- **State:** Zustand (클라이언트) + React Query (서버)
- **Backend:** Firebase (Auth, Firestore) + AI Backend API

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

- **권장 사항**
  - 한글로도 작성 가능 (팀의 주요 커뮤니케이션 언어에 따라)
  - 가능하다면 상세한 설명을 본문(본문은 한 줄 개행 후)으로 추가
