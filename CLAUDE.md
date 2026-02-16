# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

신신당부 (Sinsin Dangbu) - A Korean health management mobile app for chronic kidney disease (CKD) patients. Built with React Native/Expo, custom backend API, and AI-powered food analysis.

## Development Commands

```bash
npm start          # Start Expo development server
npm run android    # Run on Android
npm run ios        # Run on iOS
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
- `authService.ts` - Custom API auth methods (signInWithEmail, signup, signOut, restoreSession)
- `emailService.ts` - Email verification and OTP API endpoints
- `firestoreService.ts` - Data CRUD (currently always uses mock, awaiting data API)
- `aiService.ts` - Backend API calls to `/analyze-food` and `/chat` endpoints
- `mock/` - Mock implementations for development (controlled by `src/config/appConfig.ts`: `isMockUser()` for auth, `isMockMode()` for data)

### Custom Hooks (`src/hooks/`)

- `useAuth()` - Manages auth lifecycle, token-based session restore, exposes signInWithEmail/signOut and accountState

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

See `docs/design-tokens.md` for full usage guide.

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
- Other feature directories (`auth/`, `home/`, `food/`, `consultation/`, `restaurant/`, `settings/`, `health/`) have `.gitkeep` placeholders

## Key Technical Decisions

| Aspect       | Choice                                               |
| ------------ | ---------------------------------------------------- |
| Framework    | Expo ~54.0 + React Native 0.81                       |
| Routing      | Expo Router (typed routes enabled)                   |
| UI Library   | Tamagui v2 (custom tokens, not @tamagui/config/v3)   |
| Font         | Pretendard KR (OTF, 4 weights)                       |
| State        | Zustand + React Query                                |
| Forms        | react-hook-form                                      |
| Backend      | Custom Auth API (`api.sinsin.mediology.ai`) + AI API |
| Image Picker | expo-image-picker (gallery + camera)                 |
| Linting      | ESLint + Prettier + Husky pre-commit                 |
| Language     | App UI in Korean, code in English                    |

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
- Community recipe sharing with in-memory storage (future: Firestore backend)

## Styling Conventions

- Use Tamagui `$token` syntax in Tamagui components (e.g. `color="$primary"`, `gap="$3"`)
- Use `tokens.color.xxx.val` for non-Tamagui components (Ionicons, RN Image, etc.)
- `$4` (16px) for section padding, `$3` (12px) for inner gaps
- Font sizes: `$3`=12 captions, `$4`=14 body, `$5`=16 subheadline, `$7`=20 headline, `$8`=22 title
- Use `GlassmorphicCard` for section containers
- Color-coded NutrientChip: `variant="penalty"` (coral) for burden nutrients, `variant="beneficial"` (teal) for helpful nutrients
