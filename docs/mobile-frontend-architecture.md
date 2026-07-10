# Mobile Frontend Architecture

This document is the implementation rulebook for React Native screen work in
this repository. Use it before adding, redesigning, or refactoring any app
screen, especially when work is delegated to AI.

## Goal

Screen files should compose prebuilt UI components and feature behavior. They
should not become all-in-one files that own route handling, API calls, form
logic, permissions, modals, styling constants, and large render trees at the
same time.

Target shape:

```text
app/
  route files only

src/features/<feature>/
  views/          screen entry components
  hooks/          screen orchestration and behavior
  components/     feature-only UI blocks
  services/       feature-owned network calls or native helpers
  data/           mappers, constants, query options
  types/          feature-owned contracts
  index.ts        public exports for routes

src/shared/
  components/     legacy shared primitives used across features
  utils/          app-agnostic helpers

src/design-system-v2/
  tokens/         v2 colors, typography, spacing, radius, elevation
  theme/          semantic theme resolution
  hooks/          theme hooks
  components/     v2 primitives and stable reusable controls
```

## Required Layering

### 1. Route Files

Route files under `app/` are adapters. Keep them focused on Expo Router
integration.

Allowed:

- read route params when the route path itself owns them
- set route-level navigation options when needed
- render one feature screen
- pass route params to a feature screen

Preferred:

```tsx
export { SettingsScreen as default } from "@/src/features/settings"
```

or:

```tsx
import { OnboardingScreen } from "@/src/features/onboarding"

export default function OnboardingRoute() {
  return <OnboardingScreen />
}
```

Avoid in route files:

- API calls
- React Query mutations
- Zustand business state updates
- image picker, camera, notification, or permission logic
- large `StyleSheet` blocks
- large inline render trees
- modal/action-sheet workflows

If a route grows beyond roughly 100 lines, extract a feature screen.

### 2. Feature Views

Feature views under `src/features/<feature>/views/` orchestrate the page. They
may compose hooks, loading/error/empty states, and feature components.

Allowed:

- call a feature hook such as `useRecipeScreen()`
- choose loading, error, empty, and content branches
- pass props into feature components
- use v2 design-system primitives

Avoid:

- direct API calls
- repeated native permission code
- large embedded child components
- large local color maps
- mutation side effects scattered through event handlers

If a view grows beyond roughly 250 lines, split behavior into a hook and split
presentation into feature components.

### 3. Feature Hooks

Feature hooks own screen behavior.

Good uses:

- data fetching and mutations
- form state and derived state
- route/navigation callbacks
- modal open/close state
- permission flow orchestration
- analytics or side effects

Keep hooks feature-owned unless the behavior is reused by multiple real
features. Do not move product-specific hooks into `src/hooks/` just because
they are convenient.

### 4. Feature Components

Feature components render feature-specific UI pieces. They may receive callbacks
and data from the feature view or hook.

Examples:

- `ChatInputBar`
- `RecipeFilterSheet`
- `PostCommentList`
- `HealthMetricCard`
- `DoctorConnectionStatusSection`

Avoid putting network calls or global stores inside these components unless the
component is explicitly the feature boundary. Prefer props from the feature
view/hook.

### 5. Services

Use services for API and native boundary code.

Repository services:

- `src/services/core/*`: true infrastructure such as API client and token
  handling
- `src/services/data/*`: shared backend domains that are already global
- `src/features/<feature>/services/*`: feature-specific API/native helpers

If only one feature uses a service, prefer the feature folder.

### 6. Shared And Design System

Use `src/design-system-v2` for new v2 UI primitives and tokens.

Use `src/shared/components` for legacy shared components that are already in
use. Do not add new v2 primitives there.

Promote a component to shared/design-system only when:

- it is used by at least two real features, or
- it is a stable primitive like button, text field, screen, sheet, modal,
  checkbox, switch, tab, badge, divider, or progress bar
- it does not import feature state, feature APIs, or feature-specific types

For new v2 screens:

- prefer `src/design-system-v2` tokens and components
- avoid hardcoded hex colors, spacing, font sizes, radii, and shadows
- add the smallest missing primitive instead of styling every screen manually

## Preferred Screen Split

For a complex screen, split like this:

```text
app/(tabs)/consult.tsx
  -> route wrapper

src/features/consultation/views/ConsultScreen.tsx
  -> loading/error/content branches and layout composition

src/features/consultation/hooks/useConsultScreen.ts
  -> chat state, history mutations, attach menu, keyboard behavior

src/features/consultation/components/ConsultContent.tsx
src/features/consultation/components/ChatInputBar.tsx
src/features/consultation/components/AttachMenu.tsx
src/features/consultation/components/HistorySheet.tsx
  -> presentational feature UI

src/features/consultation/services/*
  -> feature-specific API/native helpers when needed
```

## Refactor Order

When redesigning existing screens, do not rewrite the whole app at once.

Recommended order:

1. Convert the route to a wrapper.
2. Move the existing screen into `src/features/<feature>/views`.
3. Extract behavior into `hooks/use<Feature>Screen.ts`.
4. Extract repeated sections into feature components.
5. Replace legacy styling with design-system-v2 tokens/components.
6. Run lint and the relevant navigation/device smoke test.

## Current High-Risk Patterns

Treat these as inspection triggers:

- route file over 100 lines
- view/component file over 250 lines
- a file importing both `@/src/services` and many visual components
- a file containing API calls, `Alert.alert`, native permissions, and large
  render trees together
- a component with feature-specific behavior placed in `src/shared`
- hardcoded color/spacing/type values inside redesigned screens

Generated data files and static catalogs can be large. Do not treat them as
architecture debt just because of line count.

## AI Task Prompt Checklist

When asking AI to implement a screen, include these constraints:

- Keep `app/` route files as wrappers.
- Put the screen in `src/features/<feature>/views`.
- Put screen behavior in `src/features/<feature>/hooks`.
- Put feature-only UI blocks in `src/features/<feature>/components`.
- Use `src/design-system-v2` primitives/tokens for v2 UI.
- Do not introduce hardcoded visual values when a token/component exists.
- Do not move code to shared unless there is real cross-feature reuse.
- Preserve route paths, params, deep links, and public exports.
- Run lint and mention any checks that were not run.

## Done Criteria

A screen refactor is not complete until:

- the route file is thin
- the feature view is readable and mostly composition
- API/native/store behavior is behind hooks or services
- repeated UI is extracted into named feature components
- visual styling uses existing tokens/primitives where available
- navigation behavior is unchanged
- relevant checks have been run
