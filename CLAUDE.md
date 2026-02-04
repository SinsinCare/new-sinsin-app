# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

신신당부 (Sinsin Dangbu) - A Korean health management mobile app for chronic kidney disease (CKD) patients. Built with React Native/Expo, Firebase backend, and AI-powered food analysis.

## Development Commands

```bash
npm start          # Start Expo development server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
```

## Architecture

### Routing (Expo Router - File-based)

- `app/_layout.tsx` - Root layout with providers (Tamagui, React Query) and auth-based navigation
- `app/(auth)/` - Authentication routes (login, signup, profile-setup)
- `app/(tabs)/` - Main app with bottom tab navigation (home, food, consultation, settings)
- Auth state determines routing: unauthenticated → `/(auth)/login`, authenticated → `/(tabs)/home`

### State Management

**Hybrid approach: Zustand (client) + React Query (server)**

- `src/stores/authStore.ts` - Auth state (user, isAuthenticated, isLoading)
- `src/stores/userStore.ts` - User profile state
- `src/services/queryClient.ts` - React Query config (5min staleTime, 30min gcTime)

### Service Layer (`src/services/`)

- `firebase.ts` - Firebase initialization with AsyncStorage persistence
- `authService.ts` - Firebase Auth methods (signIn, signUp, signOut)
- `firestoreService.ts` - Firestore CRUD for collections: user_profiles, health_records, food_records, conversations, messages, daily_health_logs
- `aiService.ts` - Backend API calls to `/analyze-food` and `/chat` endpoints

### Custom Hooks (`src/hooks/`)

- `useAuth()` - Manages auth lifecycle, listens to Firebase auth state, loads user profile on login

### Type Definitions (`src/types/`)

- `models.ts` - Domain types: UserProfile, HealthRecord, FoodRecord, ChatConversation, ChatMessage, DailyHealthLog
- `api.ts` - API request/response types

### UI Components (`src/shared/components/`)

All components use Tamagui with glassmorphic design:

- Button (variants: primary, secondary, outline, ghost, danger)
- TextField (with label, error/helper text support)
- GlassmorphicCard (variants: default, elevated, flat)
- LoadingScreen, ErrorMessage

## Key Technical Decisions

| Aspect     | Choice                                     |
| ---------- | ------------------------------------------ |
| Framework  | Expo ~54.0 + React Native 0.81             |
| Routing    | Expo Router (typed routes enabled)         |
| UI Library | Tamagui v2                                 |
| State      | Zustand + React Query                      |
| Backend    | Firebase (Auth, Firestore) + Custom AI API |
| Language   | App UI in Korean, code in English          |

## Environment Variables

Required in `.env` (see `.env.example`):

- `EXPO_PUBLIC_FIREBASE_*` - Firebase credentials
- `EXPO_PUBLIC_BACKEND_URL` - AI backend URL

## Domain Context

Health app for CKD patients with:

- CKD stages 1-5 tracking, dialysis status
- Kidney-safe nutrient limits: sodium 2000mg, potassium 2000mg, phosphorus 1000mg, protein 0.8g/kg
- AI food analysis with kidney safety assessment (safe/caution/warning)
- AI consultation chat with health context

## Related Projects

This React Native project is part of a migration effort to unify iOS and Android native apps:

| Project          | Path                     | Stack           | Purpose              |
| ---------------- | ------------------------ | --------------- | -------------------- |
| iOS Native       | `../sinsin-ios-app/`     | Swift, SwiftUI  | Original iOS app     |
| Android Native   | `../sinsin-android-app/` | Kotlin, Compose | Original Android app |
| **React Native** | `./` (current)           | Expo, RN        | Migration target     |

### Native App Reference Pattern

When implementing features, reference the native apps for:

- **Business logic & validation rules** - Check how iOS/Android handle edge cases
- **UI/UX patterns** - Match existing user experience
- **API contracts** - Ensure compatibility with existing backend

Key directories in native apps:

- iOS: `../sinsin-ios-app/sinsin/` - SwiftUI views and models
- Android: `../sinsin-android-app/app/` - Compose UI and ViewModels

### Migration Context

Goal: Replace both native apps with a single React Native codebase while maintaining feature parity and user experience.
