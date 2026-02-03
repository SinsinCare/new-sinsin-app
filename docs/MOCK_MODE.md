# Firebase Mock Mode 가이드

Firebase 연동 없이 앱을 개발/테스트할 수 있는 Mock 모드 문서입니다.

## 개요

Mock 모드는 환경 변수로 제어되며, Firebase 초기화를 완전히 건너뛰고 인메모리 데이터로 앱을 실행합니다.

## Mock 모드 활성화/비활성화

### Mock 모드 사용 (Firebase 없이 실행)

`.env` 파일:
```bash
EXPO_PUBLIC_USE_MOCK_AUTH=true
```

### 실제 Firebase 사용

`.env` 파일:
```bash
EXPO_PUBLIC_USE_MOCK_AUTH=false

# Firebase 설정 필수
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 테스트 계정 (Mock 모드)

| 항목 | 값 |
|------|-----|
| Email | `test@sinsin.dev` |
| Password | `test1234` |
| 이름 | 김철수 |
| CKD Stage | 3기 |
| 투석 여부 | 없음 |

Google 로그인 버튼 → 자동으로 위 계정으로 로그인

## 아키텍처

```
환경 변수                    서비스 레이어
┌─────────────────┐         ┌─────────────────────┐
│ EXPO_PUBLIC_    │         │   authService.ts    │
│ USE_MOCK_AUTH   │────────▶│   firestoreService  │
│ = true/false    │         │   (dispatcher)      │
└─────────────────┘         └─────────┬───────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
            ┌───────────────┐                   ┌───────────────┐
            │  Mock 서비스   │                   │ Real Firebase │
            │ (인메모리 데이터)│                   │   서비스      │
            └───────────────┘                   └───────────────┘
```

### Lazy Import 패턴

Mock 모드일 때 Firebase SDK가 로드되지 않도록 **lazy import** 사용:

```typescript
// authService.ts
function getRealAuthService(): IAuthService {
  // Mock 모드가 아닐 때만 Firebase 로드
  const { signInWithEmailAndPassword, ... } = require('firebase/auth')
  const { auth } = require('./firebase')
  // ...
}
```

## 파일 구조

```
src/
├── config/
│   └── appConfig.ts              # Mock 모드 설정
├── services/
│   ├── types/
│   │   └── serviceTypes.ts       # 인터페이스 정의 (IAuthService, IFirestoreService)
│   ├── mock/
│   │   ├── index.ts              # Mock 모듈 export
│   │   ├── mockUser.ts           # MockUser 클래스
│   │   ├── mockData.ts           # Mock 데이터 (프로필, 건강기록 등)
│   │   ├── mockAuthService.ts    # Mock 인증 서비스
│   │   └── mockFirestoreService.ts # Mock Firestore 서비스
│   ├── authService.ts            # 디스패처 (Mock/Real 전환)
│   └── firestoreService.ts       # 디스패처 (Mock/Real 전환)
└── stores/
    └── authStore.ts              # AppUser 타입 사용
```

## 실제 Firebase로 전환 시 체크리스트

### 1. 환경 변수 설정

`.env` 파일 수정:
```bash
EXPO_PUBLIC_USE_MOCK_AUTH=false
EXPO_PUBLIC_FIREBASE_API_KEY=실제값
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=실제값
EXPO_PUBLIC_FIREBASE_PROJECT_ID=실제값
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=실제값
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=실제값
EXPO_PUBLIC_FIREBASE_APP_ID=실제값
```

### 2. 코드 수정 불필요

환경 변수만 변경하면 자동으로 실제 Firebase 사용:
- `authService.ts` - 자동 전환
- `firestoreService.ts` - 자동 전환
- `authStore.ts` - `AppUser` 타입이 Firebase User와 호환

### 3. Firebase 콘솔 설정

- Authentication 활성화 (Email/Password, Google)
- Firestore Database 생성
- 보안 규칙 설정

## Mock 데이터 커스터마이징

### 테스트 계정 추가

`src/services/mock/mockAuthService.ts`:
```typescript
const mockUsers = new Map([
  ['test@sinsin.dev', { email: 'test@sinsin.dev', password: 'test1234', user: DEFAULT_MOCK_USER }],
  // 새 계정 추가
  ['newuser@test.com', { email: 'newuser@test.com', password: 'password123', user: new MockUser('mock-user-002', 'newuser@test.com', '홍길동') }],
])
```

### Mock 데이터 수정

`src/services/mock/mockData.ts`:
- `MOCK_USER_PROFILE` - 사용자 프로필
- `MOCK_HEALTH_RECORDS` - 건강 기록
- `MOCK_FOOD_RECORDS` - 음식 기록
- `MOCK_CONVERSATIONS` - 채팅 대화
- `MOCK_MESSAGES` - 채팅 메시지
- `MOCK_DAILY_LOG` - 일일 건강 로그

## 주의사항

1. **Mock 데이터는 인메모리** - 앱 재시작 시 초기화됨
2. **회원가입한 계정도 휘발성** - 앱 종료 시 사라짐
3. **.env 파일은 .gitignore에 포함** - 커밋되지 않음
4. **Expo 재시작 필요** - 환경 변수 변경 후 `npm start` 다시 실행
