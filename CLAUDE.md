# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Branch Work Policy

- `main` must remain the production-state branch.
- `develop` must remain the shared working/test branch.
- When the current branch is `main` or `develop` and the user asks for code changes, recommend creating a separate work branch first.
- Create and work on a separate branch unless the user explicitly says to work directly on the current branch, such as "여기서 할게" or "이 브랜치에서 바로 해줘".
- Do not rename, delete, or force-update `main` or `develop` unless the user explicitly requests that branch operation.

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
- Before running any local run, local build, EAS build, deploy, submit, TestFlight upload, or Google Play build on behalf of a user, ask both:
  - execution type: local run/build or EAS/deploy build
  - target environment: `test` or `production`
- Do not infer the target only from the current branch when the user simply says "build"; confirm the execution type and environment first.
- Use `npm run ios:test`, `npm run android:test`, or `npm run start:test` for local work against the test backend.
- Use `npm run ios:prod`, `npm run android:prod`, or `npm run start:prod` for local work against the production backend.
- Use `npm run build:test:*` for TestFlight/internal Google Play test builds that should use the test backend.
- Use `npm run build:prod:*` or `npm run deploy:prod` only for production backend builds.
- iOS test and production builds share ONE TestFlight (same bundle id). A production
  submission becomes TestFlight's newest build, and testers who tap Apple's update
  prompt silently switch to the production backend. After ANY production iOS submission,
  a test build must follow to reclaim the top — `npm run deploy:ios` chains this
  automatically (`reclaim:testflight-top`); manual `eas submit` must follow the same rule.
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

## Architecture

### Routing (Expo Router - File-based)

- `app/_layout.tsx` - Root layout with providers (Tamagui, React Query, Pretendard fonts) and auth-based navigation
- `app/(auth)/` - Authentication routes: login, email-login, signup, profile-setup
- `app/(tabs)/` - Main app with bottom tab navigation: home, community, recipe, restaurant, all (상담은 탭이 아니라 `app/consult.tsx` 모달 라우트)
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

### Design System — 정본은 `src/design-system-v2/`

Figma `Design-system_Mobile` 의 코드 포팅본. **색·타이포·간격의 정본은 여기 하나다.**

- `tokens/colors.ts` - 원시 팔레트 + 시맨틱(light/dark). Figma Style Guide(node-id=20-2) 대조본
- `tokens/typography.ts` - Pretendard 텍스트 스타일. **굵기는 `fontFamily`(face)로만 말한다**
- `tokens/blend.ts` - `over()`. 알파 토큰을 불투명 값으로 합성할 때만 쓴다(색을 새로 고르지 않는다)
- `components/V2*.tsx` - 버튼·시트·칩·토스트 등. 새 화면은 여기서 고른다
- `hooks/useV2Theme.ts` - 현재 모드의 시맨틱 색. 앱의 테마 토글(`themeStore`)을 본다

`src/theme/` 은 **레거시 계보의 어댑터**다 — `surface.ts`(useSurface) · `tokens.ts`(tamagui 원시) ·
`themes.ts`(tamagui 테마) 모두 위 v2 시맨틱에서 파생한다. 값을 고칠 일이 있으면 v2 를 고친다.
새 화면에서 tamagui 를 직접 쓰거나 리터럴 hex 를 적으면 eslint 가 경고한다.

- `fonts.ts` - tamagui 의 weight→Pretendard face 매핑. RN `Text` 는 `shared/components/AppText`
  를 통해야 face 를 받는다(그 파일 머리말 참고 — 안 그러면 OS 기본 서체로 그려진다)

진행 상황과 남은 작업: `docs/design/2026-08-17-design-consistency-plan.md`

### Shared UI Components (`src/shared/components/`)

All components use Tamagui with glassmorphic design:

- **Button** - variants: primary, secondary, outline, ghost, danger; sizes: small, medium, large
- **TextField** - with label, error/helper text, focus states
- **FormTextField** - React Hook Form integration, clearable, input type variants
- **GlassmorphicCard** - variants: default, elevated, flat
- **LoadingScreen**, **ErrorMessage**

### Feature Modules (`src/features/`)

Feature-based organization with types, data, services, hooks, and components per feature:

- **`recipe/`** - Kidney-safe recipes + community feature (커뮤니티 탭 코드가 여기 산다)
  - `types/` - FoodNutrients, KidneyRecommendedFood, CommunityMealPost, CommunityComment, ICommunityPostService
  - `data/` - Food nutrition data (2,859 items from CSV), scoring engine, freePostCategories
  - `services/` - communityPostService (backend `/api/v1/community` CRUD), imageUploadService, image picker
  - `hooks/` - useCommunityPosts, usePostDetail (like/bookmark은 상세·목록 캐시 동시 낙관 갱신), useKidneyRecommendations, useRecentCommunitySearches
  - `utils/` - postRanking (시간감쇠 핫스코어 인기글·연관 추천글), commentMentions (@태그 파싱), timeAgo, communityTags
  - `components/` - FreePostTab (검색·스토리·인기글·카테고리 피드), PostListItem, PopularPostCard, PollCard, StoryRail, MentionSuggestions/MentionText, FreePostEditor, VoteSheet, PostCategorySheet, TagChips/TagInput 등 — surface 디자인 시스템(`src/theme/surface.ts`) + SurfacePressable 스프링 인터랙션 사용
  - 스토리: `app/stories.tsx`(전체화면 추천/최신 뷰어), `app/(write)/story/new.tsx`(식사 기록 사진에서 고르기) — 24시간 뒤 서버에서 만료
  - 내 활동: `app/community-library.tsx` (쓴 글 / 좋아요 / 북마크)
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
- Kidney-safe nutrient limits come from the profile and backend policy. CKD stage,
  dialysis status, weight, and clinician-set goals can change them; do not present
  `0.8g/kg` as a universal protein target.
- AI food analysis with kidney safety assessment (safe/caution/warning)
- AI consultation chat with health context
- Kidney-safe food scoring algorithm (penalizes high phosphorus/potassium/sodium/protein, rewards water/magnesium/calcium/vitamin D)
- Community board backed by backend API (posts, comments with @mentions, polls with optional question, tags, like/bookmark/report; 이미지 게시글당 최대 5장)
- Community stories: 하루만 사는 사진 한 장. 식사 기록 사진을 그대로 올릴 수 있고 추천은 서버가 매번 섞어 준다

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
- Google OAuth iOS Client ID: `87899379852-tvnficl1ev04upalipqg9t5kkcknmigu.apps.googleusercontent.com`
- OAuth plist files are gitignored (`*.apps.googleusercontent.com.plist`)
