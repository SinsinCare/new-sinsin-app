# React Native Migration Verification Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify that the React Native migration has achieved feature parity with iOS and Android native apps.

**Architecture:** Systematic verification through feature matrix comparison, manual testing, and automated tests where applicable. We'll verify each feature category: Authentication, Core Screens, Data Services, and UI Components.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, Firebase Auth/Firestore, Tamagui

---

## Feature Parity Matrix

Based on exploration of all three codebases, here's the feature comparison:

| Feature | iOS | Android | React Native | Status |
|---------|-----|---------|--------------|--------|
| Email/Password Auth | ✅ | ✅ | ✅ | Verified |
| Apple Sign-In | ✅ | ❌ | ❌ | Not in scope (iOS only) |
| Google Sign-In | ⚠️ Placeholder | ⚠️ Placeholder | ❌ | Gap - Not critical |
| Profile Setup | ✅ | ✅ | ✅ | Needs verification |
| Home Dashboard | ✅ Full | ⚠️ Placeholder | ✅ Partial | Needs verification |
| Food Recognition (AI) | ✅ | ⚠️ Routes only | ✅ | Needs verification |
| AI Consultation Chat | ✅ | ⚠️ Routes only | ✅ | Needs verification |
| Recipe View | ✅ | ⚠️ Placeholder | ❌ | Gap |
| Restaurant Finder | ✅ | ⚠️ Placeholder | ❌ | Gap |
| Settings/Logout | ✅ | ⚠️ Placeholder | ✅ | Needs verification |
| OCR Lab Results | ✅ | ❌ | ❌ | Gap |
| Community Meal Posts | ✅ | ❌ | ❌ | Gap |
| Health Record Persistence | ✅ | ✅ | ✅ | Needs verification |
| Daily Health Log | ✅ | ✅ | ✅ | Needs verification |

---

## Task 1: Verify Project Configuration

**Files:**
- Read: `package.json`
- Read: `app.json`
- Read: `.env.example`

**Step 1: Check all required dependencies are installed**

Run: `npm ls expo react-native firebase @react-native-firebase/app @tanstack/react-query zustand tamagui expo-router`

Expected: All packages listed with versions

**Step 2: Verify environment variables are configured**

Run: `cat .env.example`

Expected: Should list:
- EXPO_PUBLIC_FIREBASE_API_KEY
- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- EXPO_PUBLIC_FIREBASE_PROJECT_ID
- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- EXPO_PUBLIC_FIREBASE_APP_ID
- EXPO_PUBLIC_BACKEND_URL

**Step 3: Verify app.json is properly configured**

Check for:
- name, slug, version
- ios bundle identifier
- android package name
- scheme for deep linking

**Step 4: Document configuration status**

Create verification checklist in scratchpad.

---

## Task 2: Verify Authentication Flow

**Files:**
- Read: `app/(auth)/login.tsx`
- Read: `app/(auth)/signup.tsx`
- Read: `app/(auth)/profile-setup.tsx`
- Read: `src/services/authService.ts`
- Read: `src/stores/authStore.ts`
- Read: `src/hooks/useAuth.ts`

**Step 1: Verify login screen matches native apps**

Compare with iOS `AuthView.swift` and Android `AuthScreen.kt`:
- [ ] Email field present
- [ ] Password field present
- [ ] Sign In button present
- [ ] Link to signup present
- [ ] Error handling for invalid credentials
- [ ] Loading state during auth

**Step 2: Verify signup screen matches native apps**

- [ ] Email field present
- [ ] Password field present
- [ ] Confirm password field present
- [ ] Sign Up button present
- [ ] Link to login present
- [ ] Password validation (6+ chars)
- [ ] Error handling

**Step 3: Verify profile setup screen matches native apps**

Compare fields with iOS and Android:
- [ ] Full name input
- [ ] Birth date input
- [ ] Gender selection (male/female)
- [ ] Height input
- [ ] Weight input
- [ ] CKD stage selection (1-5)
- [ ] Dialysis status toggle
- [ ] Save button

**Step 4: Verify auth service methods exist**

- [ ] signInWithEmail()
- [ ] signUpWithEmail()
- [ ] signInWithGoogle() - can be placeholder
- [ ] signOut()
- [ ] getCurrentUser()
- [ ] onAuthStateChange()

**Step 5: Verify auth store structure**

- [ ] user state
- [ ] isLoading state
- [ ] isAuthenticated state
- [ ] setUser action
- [ ] setLoading action
- [ ] reset action

---

## Task 3: Verify Home Dashboard

**Files:**
- Read: `app/(tabs)/home.tsx`
- Compare: iOS `HomeView.swift`

**Step 1: Verify UI elements present**

iOS Home has:
- [ ] Greeting with user name
- [ ] GFR gauge (can be simplified)
- [ ] Creatinine card with chart
- [ ] Potassium gauge
- [ ] BUN/Uric Acid stats
- [ ] Health tips carousel
- [ ] Meal tiles (Breakfast/Lunch/Dinner/Snack)
- [ ] Recent food records list
- [ ] Nutrient tracking quick link

RN Home should have at minimum:
- [ ] Greeting with user name
- [ ] Health summary card
- [ ] Nutrition intake overview (Sodium, Potassium, Phosphorus)
- [ ] Quick action buttons

**Step 2: Document gaps**

List features in iOS not in RN:
- GFR circular gauge with trend
- Creatinine chart
- Health tips carousel
- Meal tiles
- Recent food records

---

## Task 4: Verify Food Recognition Screen

**Files:**
- Read: `app/(tabs)/food.tsx`
- Read: `src/services/aiService.ts`
- Compare: iOS `FoodRecognitionView.swift`

**Step 1: Verify image capture/selection**

- [ ] Camera capture option
- [ ] Gallery selection option
- [ ] Image preview display

**Step 2: Verify AI analysis integration**

- [ ] API call to /analyze-food endpoint
- [ ] Loading state during analysis
- [ ] Error handling

**Step 3: Verify nutrition display**

- [ ] Food name display
- [ ] Calories
- [ ] Protein
- [ ] Carbs
- [ ] Fat
- [ ] Sodium
- [ ] Potassium
- [ ] Phosphorus

**Step 4: Verify kidney safety assessment**

- [ ] Overall safety level (safe/caution/warning)
- [ ] Warning messages
- [ ] Recommendations

**Step 5: Document gaps with iOS**

iOS has additional:
- Follow-up questions (portion, people count, broth)
- Editable analysis form
- Save to food diary with image

---

## Task 5: Verify AI Consultation Screen

**Files:**
- Read: `app/(tabs)/consultation.tsx`
- Read: `src/services/aiService.ts`
- Compare: iOS `ConsultationView.swift`

**Step 1: Verify consultation categories**

iOS has 6 categories:
- [ ] Diet (식이요법)
- [ ] Medicine (약물)
- [ ] Dialysis (투석)
- [ ] Checkup (검진)
- [ ] Transplant (이식)
- [ ] Welfare (복지)

**Step 2: Verify chat interface**

- [ ] Message list display
- [ ] User message bubble styling
- [ ] AI message bubble styling
- [ ] Message input field
- [ ] Send button
- [ ] Loading state during response

**Step 3: Verify AI integration**

- [ ] API call to /chat endpoint
- [ ] Health context passed (CKD stage, dialysis status)
- [ ] Error handling

**Step 4: Document gaps with iOS**

iOS has additional:
- Suggested prompts per category
- Chat history/sessions management
- Load/resume previous conversations

---

## Task 6: Verify Settings Screen

**Files:**
- Read: `app/(tabs)/settings.tsx`
- Compare: iOS `SettingsView.swift`

**Step 1: Verify profile display**

- [ ] User avatar/initials
- [ ] User name
- [ ] Email
- [ ] CKD stage
- [ ] Dialysis status

**Step 2: Verify menu items**

- [ ] Profile management
- [ ] Notification settings
- [ ] Privacy management
- [ ] App info

**Step 3: Verify logout functionality**

- [ ] Sign out button
- [ ] Logout clears auth state
- [ ] Redirects to login

**Step 4: Document gaps**

iOS has additional:
- Website link
- Customer support
- Debug mode indicator

---

## Task 7: Verify Firestore Service

**Files:**
- Read: `src/services/firestoreService.ts`
- Compare: iOS `FirebaseManager.swift`
- Compare: Android repositories

**Step 1: Verify collection operations**

user_profiles collection:
- [ ] getUserProfile(userId)
- [ ] setUserProfile(profile)
- [ ] updateUserProfile(profile)

health_records collection:
- [ ] getHealthRecords(userId, limit)
- [ ] addHealthRecord(record)

food_records collection:
- [ ] getFoodRecords(userId, startDate, endDate)
- [ ] addFoodRecord(record)

conversations collection:
- [ ] getConversations(userId)
- [ ] createConversation(conversation)

messages collection:
- [ ] getMessages(conversationId)
- [ ] addMessage(message)

daily_health_logs collection:
- [ ] getDailyLog(userId, date)
- [ ] setDailyLog(log)

---

## Task 8: Verify Data Models

**Files:**
- Read: `src/types/models.ts`
- Read: `src/types/api.ts`
- Compare: iOS `Models.swift`, `PersistentModels.swift`
- Compare: Android domain models

**Step 1: Verify UserProfile model**

- [ ] uid
- [ ] email
- [ ] displayName
- [ ] birthDate
- [ ] gender
- [ ] height
- [ ] weight
- [ ] ckdStage (1-5)
- [ ] onDialysis
- [ ] createdAt
- [ ] updatedAt

**Step 2: Verify HealthRecord model**

- [ ] id
- [ ] userId
- [ ] recordDate
- [ ] gfr
- [ ] creatinine
- [ ] potassium
- [ ] bun
- [ ] uricAcid
- [ ] createdAt

**Step 3: Verify FoodRecord model**

- [ ] id
- [ ] userId
- [ ] name
- [ ] recordDate
- [ ] calories
- [ ] protein
- [ ] carbs
- [ ] fat
- [ ] sodium
- [ ] potassium
- [ ] phosphorus
- [ ] mealType
- [ ] hasBroth
- [ ] brothConsumed
- [ ] imageUrl (optional)

**Step 4: Verify kidney safe limits**

- [ ] sodium: 2000 mg
- [ ] potassium: 2000 mg
- [ ] phosphorus: 1000 mg
- [ ] protein: 0.8 g/kg

---

## Task 9: Verify UI Components

**Files:**
- Read: `src/shared/components/Button.tsx`
- Read: `src/shared/components/TextField.tsx`
- Read: `src/shared/components/GlassmorphicCard.tsx`
- Read: `src/shared/components/LoadingScreen.tsx`
- Read: `src/shared/components/ErrorMessage.tsx`

**Step 1: Verify Button component**

- [ ] Variants: primary, secondary, outline, ghost, danger
- [ ] Sizes: small, medium, large
- [ ] fullWidth prop
- [ ] loading state with spinner
- [ ] disabled state

**Step 2: Verify TextField component**

- [ ] label prop
- [ ] error prop with styling
- [ ] helper text prop
- [ ] Focus state styling
- [ ] All standard input props

**Step 3: Verify GlassmorphicCard component**

- [ ] Variants: default, elevated, flat
- [ ] Semi-transparent styling
- [ ] Border effect
- [ ] Shadow support

**Step 4: Verify LoadingScreen component**

- [ ] Full-screen spinner
- [ ] Custom message support

**Step 5: Verify ErrorMessage component**

- [ ] Error icon
- [ ] Message display
- [ ] Optional retry button

---

## Task 10: Run App and Manual Test

**Step 1: Start development server**

Run: `npm start`

Expected: Expo dev server starts without errors

**Step 2: Test on iOS simulator**

Run: `npm run ios` (or press `i` in Expo)

Manual test checklist:
- [ ] App loads without crash
- [ ] Auth flow works (if Firebase configured)
- [ ] Tab navigation works
- [ ] All screens render

**Step 3: Test on Android emulator**

Run: `npm run android` (or press `a` in Expo)

Same manual test checklist.

**Step 4: Document any runtime errors**

Note any crashes, rendering issues, or functionality gaps.

---

## Task 11: Create Verification Summary Report

**Step 1: Compile all verification results**

Create a summary document with:
- Overall migration status
- Feature parity percentage
- Critical gaps that need addressing
- Non-critical gaps (nice-to-have)
- Recommendations for next steps

**Step 2: Categorize gaps by priority**

**Critical (blocks launch):**
- Any auth issues
- Core screen crashes
- Data not persisting

**High Priority (should fix):**
- Missing features from iOS that users expect
- UI/UX inconsistencies

**Medium Priority (can defer):**
- Features that were placeholders in native apps too
- Polish items

**Low Priority:**
- Nice-to-have features
- Future enhancements

**Step 3: Commit verification results**

```bash
git add docs/plans/2026-02-02-migration-verification.md
git commit -m "docs: add migration verification plan and results"
```

---

## Gap Summary (Based on Codebase Exploration)

### Features NOT migrated (iOS → RN):

1. **Recipe View** - Low-phosphorus food recommendations, CSV food database
2. **Restaurant Finder** - Map-based kidney-friendly restaurant search
3. **OCR Lab Results** - Image text extraction for lab results
4. **Community Meal Posts** - User-submitted food photos
5. **Advanced Health Gauges** - GFR/Potassium circular gauges with Charts
6. **Health Tips Carousel** - Rotating health tips
7. **Meal Tiles** - Breakfast/Lunch/Dinner/Snack quick-add buttons
8. **Chat History/Sessions** - Load/resume previous conversations
9. **Suggested Prompts** - Category-specific conversation starters
10. **Follow-up Questions** - Portion, people count, broth consumption

### Features partially migrated:

1. **Home Dashboard** - Basic version exists, missing charts and gauges
2. **Food Recognition** - Core flow works, missing follow-up questions
3. **AI Consultation** - Chat works, missing session management

### Features fully migrated:

1. **Authentication** - Email/password sign in/up
2. **Profile Setup** - All fields match native apps
3. **Settings/Logout** - Basic settings with logout
4. **Firestore Integration** - All collections supported
5. **AI Service** - Both endpoints integrated
6. **UI Components** - Full component library
