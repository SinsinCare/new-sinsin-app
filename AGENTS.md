# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

신신당부 (Sinsin Dangbu) - A Korean health management mobile app for chronic kidney disease (CKD) patients. Built with React Native/Expo, custom backend API, and AI-powered food analysis.

## Development Commands

```bash
npm start          # Start Expo development server
npm run start:test # Start Expo against test backend
npm run start:prod # Start Expo against production backend
npm run android    # Run on Android
npm run android:test
npm run android:prod
npm run ios        # Run on iOS
npm run ios:test
npm run ios:prod
npm run web        # Run on web
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
npm run format     # Prettier format all files
```

Mock mode: add mock data

```bash
EXPO_PUBLIC_USE_MOCK_AUTH=true npm start   # Mock auth (skips real login/signup API)
EXPO_PUBLIC_USE_MOCK_MODE=true npm start   # Mock data services (onboarding, etc.)
npm run ios-no-user                        # Mock mode without user profile
```

## Build & Deployment

Branch and environment policy:

- `main` is the production branch and should build against the production backend.
- `develop` is the working/test branch and should build against the test backend.
- Before running any local, EAS, or deploy build on behalf of a user, ask which target environment to use: `test` or `production`.
- Do not infer the target only from the current branch when the user simply says "build"; confirm the environment first.
- Local environment values must be loaded from gitignored env files such as `.env.test` and `.env.production`.
- Do not commit backend URLs or other environment values.

Build commands:

```bash
npm run build:test         # EAS test build, all platforms, test backend
npm run build:test:ios     # EAS test build, iOS only
npm run build:test:android # EAS test build, Android APK
npm run build:prod         # EAS production build, all platforms, production backend
npm run build:prod:ios     # EAS production build, iOS only
npm run build:prod:android # EAS production build, Android only
npm run deploy:prod        # EAS production build and auto-submit
```

### Android

**로컬 디버그 빌드 (USB 연결 기기):**

```bash
npx expo run:android --variant release
```

- 기기에 이미 상위 버전이 설치된 경우: `adb uninstall com.mediology.sinsinapp` 후 재설치

**배포용 AAB 빌드는 반드시 EAS를 사용해야 합니다.**

- 프로덕션 키스토어가 EAS 서버에서 관리됨
- 로컬 `./gradlew bundleRelease`로 빌드하면 debug.keystore로 서명되어 Play Store 업로드 불가

```bash
# EAS 클라우드 빌드 (키스토어 자동 처리)
npx eas build --platform android --profile production

# EAS 로컬 빌드 (로컬 머신에서 빌드, 키스토어는 EAS에서 가져옴)
npx eas build --platform android --profile production --local
```

**Play Store 업로드:**

- [Play Console](https://play.google.com/console) → 신신당부 → 프로덕션 → 새 버전 만들기
- 계정: healthierwith@gmail.com / 패키지: com.mediology.sinsinapp

**Android SHA-1 (Google OAuth 등록용):**

- debug.keystore: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- Play Store 업로드 키: `C3:4F:D7:DB:96:C6:BC:9F:0C:2A:6D:BC:60:61:99:69:3F:32:AB:4E`

### iOS

```bash
npm run ios-release   # 로컬 릴리즈 빌드
npx eas build --platform ios --profile production
npx eas submit --platform ios  # App Store 제출
```

### 로그 확인 (실기기)

```bash
adb -s <device-id> logcat -s ReactNativeJS
```

## Architecture

### Routing (Expo Router - File-based)

- `app/_layout.tsx` - Root layout with providers (Tamagui, React Query, Pretendard fonts) and auth-based navigation
- `app/(auth)/` - Authentication routes: login, email-login, signup, profile-setup
- `app/(tabs)/` - Main app with bottom tab navigation: home, consult, recipe, restaurant, all
- Auth state determines routing: unauthenticated → `/(auth)/login`, authenticated → `/(tabs)/home`

### State Management

**Hybrid approach: Zustand (client) + React Query (server)**

- `src/stores/authStore.ts` - Auth state (user, accountState, isAuthenticated, isLoading)
- `src/stores/userStore.ts` - User profile state
- `src/services/queryClient.ts` - React Query config (5min staleTime, 30min gcTime)

### Service Layer (`src/services/`)

- `apiClient.ts` - Axios instances: `api` (authenticated, Bearer interceptor + 401 refresh) and `publicApi` (unauthenticated)
- `tokenService.ts` - AsyncStorage-based JWT token CRUD (accessToken, refreshToken)
- `authService.ts` - Custom API auth methods (signInWithEmail, signInWithSocial, signup, signOut, restoreSession)
- `socialAuthService.ts` - Google/Apple native sign-in (ID token acquisition)
- `emailService.ts` - Email verification and OTP API endpoints
- `blockService.ts` - User blocking API (block/unblock/list)
- `mock/` - Mock implementations for development (controlled by `src/config/appConfig.ts`: `isMockUser()` for auth, `isMockMode()` for data)

### Custom Hooks (`src/hooks/`)

- `useAuth()` - Manages auth lifecycle, token-based session restore, exposes signInWithEmail/signInWithGoogle/signInWithApple/signOut and accountState

### Type Definitions (`src/types/`)

- `models.ts` - Domain types: UserProfile, HealthRecord, FoodRecord, ChatConversation, ChatMessage, DailyHealthLog
- `api.ts` - API request/response types
- `auth.ts` - Auth API types: SignupRequest, LoginResult, SignupResult, TokenRefreshResult, OtpVerifyResult

### Design System (`src/theme/`)

Custom Tamagui configuration with Figma-mapped design tokens:

- `tokens.ts` - Color (Primary coral/red, Sub teal/green, Greyscale), space, size, radius tokens
- `fonts.ts` - Pretendard KR font (Regular/Medium/SemiBold/Bold) with typography scale
- `themes.ts` - Light/dark theme definitions with semantic color mapping
- `tamagui.config.ts` - Combines tokens, fonts, themes into Tamagui config

### Shared UI Components (`src/shared/components/`)

All components use Tamagui with glassmorphic design:

- **Button** - variants: primary, secondary, outline, ghost, danger; sizes: small, medium, large
- **TextField** - with label, error/helper text, focus states
- **FormTextField** - React Hook Form integration, clearable, input type variants
- **GlassmorphicCard** - variants: default, elevated, flat
- **LoadingScreen**, **ErrorMessage**

### Feature Modules (`src/features/`)

Feature-based organization with types, data, services, hooks, and components per feature:

- **`recipe/`** - Kidney-safe recipe community (fully implemented)
  - `types/` - FoodNutrients, KidneyRecommendedFood, CommunityMealPost, ICommunityPostService
  - `data/` - Food nutrition data (2,859 items from CSV), scoring engine, low-phosphorus food list
  - `services/` - In-memory community post service, image picker (expo-image-picker)
  - `hooks/` - useKidneyRecommendations (scored search), useCommunityPosts (React Query CRUD)
  - `components/` - RecipeHeader, KidneyNutritionSection, KidneyFoodCard, NutrientChip, LowPhosphorusSection, LowPhosphorusCard, FlowTags, CommunitySection, CommunityPostCard, CreatePostSheet, EmptyPostsPlaceholder
- **`settings/`** - MyPage & settings (fully implemented, dark mode supported)
  - `hooks/` - useSettingsColors (dark mode color hook), useKidneyProfile, useMyPageProfile
  - `views/` - MyPageScreen, SettingsScreen, ProfileEditScreen, KidneyProfileEditScreen, PasswordEditScreen, NicknameEditScreen, WithdrawalScreen, InquiryScreen, AskDoctorScreen, AnnouncementListScreen, MedicalReferenceScreen
  - `components/` - KidneyProfileCard, ToggleItem, DotItem, DatePickerModal
- **`auth/`** - Login with email, Google, Apple; signup flow with OTP verification
- Other feature directories (`home/`, `food/`, `consultation/`, `restaurant/`, `health/`) have `.gitkeep` placeholders

## Key Technical Decisions

| Aspect       | Choice                                                                |
| ------------ | --------------------------------------------------------------------- |
| Framework    | Expo ~54.0 + React Native 0.81                                        |
| Routing      | Expo Router (typed routes enabled)                                    |
| UI Library   | Tamagui v2 (custom tokens, not @tamagui/config/v3)                    |
| Font         | Pretendard KR (OTF, 4 weights)                                        |
| State        | Zustand + React Query                                                 |
| Forms        | react-hook-form                                                       |
| Backend      | Custom FastAPI, selected by env file                                  |
| Auth         | Email/password + Google Sign-In + Apple Sign-In                       |
| Image Picker | expo-image-picker (gallery + camera)                                  |
| Social Login | @react-native-google-signin/google-signin + expo-apple-authentication |
| Linting      | ESLint + Prettier + Husky pre-commit                                  |
| Language     | App UI in Korean, code in English                                     |

## Environment Variables

Required in `.env` (see `.env.example`):

- `EXPO_PUBLIC_BACKEND_URL` - AI backend URL
- `EXPO_PUBLIC_USE_MOCK_AUTH` - Mock auth services: login/signup/email verification (`true`/`false`)
- `EXPO_PUBLIC_USE_MOCK_MODE` - Mock data services: onboarding, etc. (`true`/`false`)
- `EXPO_PUBLIC_MOCK_NO_USER` - Mock mode without user profile

## Domain Context

Health app for CKD patients with:

- CKD stages 1-5 tracking, dialysis status
- Kidney-safe nutrient limits: sodium 2000mg, potassium 2000mg, phosphorus 1000mg, protein 0.8g/kg
- AI food analysis with kidney safety assessment (safe/caution/warning)
- AI consultation chat with health context
- Kidney-safe food scoring algorithm (penalizes high phosphorus/potassium/sodium/protein, rewards water/magnesium/calcium/vitamin D)
- Community recipe sharing with in-memory storage (future: backend API)

## Styling Conventions

- Use Tamagui `$token` syntax in Tamagui components (e.g. `color="$primary"`, `gap="$3"`)
- Use `tokens.color.xxx.val` for non-Tamagui components (Ionicons, RN Image, etc.)
- `$4` (16px) for section padding, `$3` (12px) for inner gaps
- Font sizes: `$3`=12 captions, `$4`=14 body, `$5`=16 subheadline, `$7`=20 headline, `$8`=22 title
- Use `GlassmorphicCard` for section containers
- Color-coded NutrientChip: `variant="penalty"` (coral) for burden nutrients, `variant="beneficial"` (teal) for helpful nutrients

### Dark Mode

- Settings/MyPage screens: use `useSettingsColors()` hook from `src/features/settings/hooks/useSettingsColors.ts`
- Home/Tamagui screens: use `useColorScheme() === "dark"` with `$tokenName` or `tokens.color.xxx.val`
- Shared components (e.g. `ScreenHeader`): use `useColorScheme()` + `tokens.color.textDark.val`
- Dark mode color tokens: `appBgDark` (#1F1F21), `cardBgDark` (#313138), `textDark` (#E7E7EE), `textDarkSub` (#ABABB4)
- Green accent colors (#34D399, #0D896A, #44AF94) stay the same in both modes

## Google Cloud / OAuth

- GCP Project: `sinsin-486209`
- Google OAuth iOS Client ID: `87899379852-eo6mf97djcrckpbqc748vcdcbl2m3ls4.apps.googleusercontent.com`
- OAuth plist files are gitignored (`*.apps.googleusercontent.com.plist`)
