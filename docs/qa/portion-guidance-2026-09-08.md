# Recipe / restaurant portion guidance — 2026-09-08

## Scope and decisions

The user requested actionable fractions of a dish rather than percentages of nutrient targets.
Recipe detail and restaurant menu detail now share a server-side portion calculation and a compact disclosure component.

- Reuse `mealBoundary` / `MEAL_FRACTION` (the existing product allocation of 35% of daily targets); do not reverse rounded percentages or use recipe daily remainder as a meal target.
- Require all four nutrient values and targets, plus a profile. Missing/negative/non-finite data, unknown protein target, all-zero estimates, and unmatched recipe ingredients produce no numeric portion.
- Select the largest practical fraction among 1, 3/4, 2/3, 1/2, 1/3, 1/4 that fits the comparison. If even 1/4 does not fit, say so rather than round upward or tell the person to eat zero.
- Use original unrounded nutrient fields. Per-serving recipe comparison is independent of cooking yield.
- These are **portion comparisons**, not prescribed intake or assurance of safety. The current calculation does not subtract today's food or allocate sides / other meals. The disclosure says this explicitly. Do not describe the product's 35% default as a clinically validated individual meal prescription.
- No gram or bowl quantity is invented when physical serving-weight data is absent.
- Older backend responses without the additive field show information unavailable; no local fabricated fallback.
- Remove prominent percentage text in restaurant menu rows and remainder bars in recipe detail. Absolute nutrient quantities remain.

## References examined

- [Mobbin / Cal AI portion measurement](https://mobbin.com/screens/0fc4d5ed-a420-4fa7-b1a6-ede4432a378f): serving, package, gram controls and nutrient facts separated.
- [Mobbin / Bevel food details](https://mobbin.com/screens/7f5469e5-e75e-4ef8-ac3a-59a10c3af035): portion size separate from ingredient disclosure.
- [NIDDK CKD healthy eating](https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease): individual goals and professional dietary planning; this does not validate the app's 35% allocation.

## Verification

- Bun: recipe endpoint contract + fixed query shape + portion calculation: 76 passed, 259 assertions, isolated `127.0.0.1/sinsin_test` with existing target/schema guards and fixture cleanup. No app-user DB writes.
- RN: recipe detail / transport / menu disclosure initially 64 passed; additional shared disclosure interaction tests 2 passed. Portion transport tests rerun with them (9 passed).
- Both TypeScript checks passed. Scoped ESLint and whitespace checks passed. UX-copy audit exits successfully with unrelated pre-existing findings.
- iPhone 17 Pro Simulator: recipe detail shows a per-person amount, no remainder percentages, and calculation disclosure opens and closes. Restaurant menu uses real local response fields to show distinct quantities (3/4, 1/3, 1, 2/3, half). No nutrition/health record or social write was made.

## Remaining boundaries

- Android, large text, dark mode and device Reduce Motion not exercised for this addition.
- New server response field requires backend rollout outside this local runtime; no deployment performed.
- Recipe list previews and AI conversation content have not been converted to this new portion-reference payload.
- A full personalised portion recommendation including all food already consumed, meal composition, and reliable serving weights remains separate work.

Final native pass: the restaurant list-level note appears once; menu-specific percentage text is absent. The pasta portion disclosure opens with the exact 35% basis and closes again; the next menu retains its own distinct quantity. Final KO copy uses “메뉴의 절반” and avoids presenting the one-item display cap as a medically prescribed maximum. Shared disclosure tests (9 including transport), RN type check, scoped lint and copy audit passed again after this copy/layout refinement.

## Follow-up: restaurant consultation handoff

- Carry validated menu portion fractions, the driver and the meal allocation into consultation text. Older or malformed references remain absent.
- The assessment question now asks about adjusting portions. Context states that these are comparisons, not prescriptions, and excludes already-consumed food and sides.
- Fit whole menu lines inside the existing 4,800-character cap so a fraction or its qualification cannot be cut in half. KO/EN saved-message parser round trips covered.
- Native verification exposed a classifier defect: a menu line ending with `3/4 (basis...)` was interpreted as a lab metric. Exam metrics now require the actual exam-metrics section. Existing exam, food and restaurant classification tests remain green.
- A rejected model answer showed instructions for a retry button that was intentionally unavailable. `UNSAFE_RESPONSE` now suggests a more specific question without promising that hidden action. Response validation and retryability were not weakened.

Validation: 75 tests passed across restaurant message/questions, shared user-card classification, exam parser and failure-copy suites. RN typecheck, scoped ESLint and whitespace checks passed; copy audit completed with existing unrelated findings.

Native lifecycle: initial verification encountered one UNSAFE_RESPONSE and a subsequent TIMEOUT. Used the actual retry button for the retryable timeout; the next answer completed and led with the displayed portions (3/4, 1/3, half), while distinguishing the comparison basis and missing intake records. This is behavior evidence, not a clinical review of the answer. Two test consultations were created through normal local app UI; no health records were edited.

Persistence: switched to a new empty consultation, opened history and selected the saved portion discussion. Backend GET conversation returned 200; the reloaded question, fractions and answer actions remained, and no erroneous exam card appeared. Restaurant-to-AI is now covered; recipe-list / recipe-to-AI portion handoff and comprehensive daily-intake-based recommendations remain outside this completed leaf.

## Personal-target follow-up — 2026-09-08

Recipe details and restaurant menu details now carry effective individual daily targets, raw serving nutrients, and a dated diary-intake snapshot. The existing 35% meal comparison remains secondary; the personal calculator does not use that fixed allocation.

- The user confirms that all food has been logged, or explicitly confirms no intake when there are no diary records. Missing/pending analyses block calculation. Absent records are not silently treated as no intake.
- Calculation: max(0, individual target − recorded intake), divided by the user-selected remaining meals (including this meal), then allocated entirely or half to this dish. The limiting nutrient determines a practical fraction, capped at one listed serving. Other-food allocation is a user-selected reserve, not an estimate of unentered dishes.
- The four effective targets are visible. Fractions are planning estimates, not a prescribed meal or proof of nutritional adequacy. NIDDK's individualized nutrition guidance is the medical boundary; it does not validate either the old 35% allocation or a complete meal prescription: https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease
- Intake is read once per detail request, not per menu. Recipe list query-count regression was caught and fixed; lists do not request the new snapshot. Detail queries refresh on mount. Previous-day snapshots cannot calculate.

Verification:
- Isolated `sinsin_test`: recipe endpoint/query-shape, restaurant endpoint and portion suites: 94 passed; two additional pure snapshot/payload cases passed separately.
- RN: transport/calculator/confirmation/restaurant consultation suites 44 passed; recipe detail suite 56 passed. Type checks passed for both repositories. Scoped ESLint and whitespace checks passed; Korean copy audit still reports existing unrelated findings.
- Native iPhone Simulator: restaurant calculator opens and shows targets; no result before confirmation. Confirmed test no-intake, half reserved for other food: changing remaining meals from two to one changed the displayed menu amount from 1/2 to 1. Revoking confirmation removed the quantity. Recipe detail opens the same calculator and also withholds quantity before confirmation.
- No health records were created or edited for this check. Recorded/nonzero, incomplete-data and date rollover branches were tested in code, not by changing native account records. No production/clinical validation is claimed.

Remaining scope: selecting actual accompanying dishes and summing their nutrients is not implemented; the current calculator offers an explicit reserved share. The consulted AI context continues to carry the original comparison, not these transient calculator choices.

## Personal portion → restaurant consultation — 2026-09-08

Closed the follow-up gap above for restaurant menu calculators: after confirming intake and obtaining a calculation, `이 분량으로 AI와 상담하기` opens consultation and automatically sends the selected menu with its actual fraction, remaining meals, allocated share, individual targets and confirmed recorded intake. The prompt identifies this as a future meal plan, not consumed food, and prioritizes these choices over the old 35% comparison. Stale/unconfirmed calculations cannot expose/send this action. General restaurant consultation remains menu-wide.

- Native Simulator: confirmed test no-intake in the pasta calculator, used default two remaining meals and half reserved for other food, then pressed the new CTA. Question sent automatically with restaurant context; a real completed answer mentioned the half portion. New conversation → saved history → reopened the same question and answer successfully. No spurious exam card appeared.
- One test consultation was saved through normal UI. No health diary was written. Clinical adequacy of the generated advice is not asserted.
- 52 focused RN tests passed, including KO/EN selection payload and saved-message parsing. Type check, scoped ESLint, and whitespace checks passed. Copy audit retains pre-existing unrelated findings.
- Recipe-calculator-to-consultation is still separate scope; selecting/summing actual accompanying dishes also remains unimplemented.

## Return/re-entry freshness — 2026-09-08

`useRestaurantMenus` now subscribes to the existing focused-screen/app-resume revalidation mechanism using its exact localized restaurant-menu key. Mount-only refreshing was insufficient when the detail screen stayed mounted behind another route. The prior content remains visible during refresh; a confirmed calculator's consultation CTA is disabled and labelled as checking current records. A changed personal snapshot remounts the calculator through its existing snapshot key, requiring confirmation again. Failed refreshes use the menu error state.

Also validated input at `personalPortion` itself: a malformed recorded-intake payload with null values or invalid targets cannot be interpreted as confirmed zero intake, even if a future caller bypasses the transport reader.

Evidence: 47 focused tests passed, including pending CTA disabled/accessibility state and malformed snapshot rejection. RN typecheck, scoped ESLint and whitespace checks passed. Native Simulator restaurant detail → photo viewer → back produced one fresh menus request (route-only log count 24→25, HTTP 200); the detail remained usable. App background/resume is covered by the existing shared hook implementation, not newly exercised natively this turn. No account or health data was modified.

## Recipe portion → consultation — 2026-09-08

Closed the recipe handoff gap. The recipe nutrition card forwards the confirmed calculator selection to a dedicated recipe plan builder and launches consultation with an immediate question plus named recipe context. It carries the recipe ID, per-serving nutrients and the shared personal targets/intake/allocation context. Recipe metadata is not labelled as a restaurant; cooking yield is explicitly separate from planned intake. Refreshing, stale and incomplete calculations cannot be submitted. No health diary mutation is involved.

The confirmed-plan formatter is shared with restaurant consultation. The existing structured-message parser renders the question and preserves the stored context without claiming the user already ate this food.

Evidence: 108 focused tests across recipe plan KO/EN round trips, stale/incomplete rejection, cross-parser classification, restaurant message regressions and recipe-detail contracts. RN typecheck, scoped lint and whitespace checks passed; copy audit retains existing unrelated findings. Native Simulator: cucumber/onion recipe → calculate confirmed test no-intake → one-serving result → new consultation CTA → immediate question/real completed answer → new conversation → saved history → reopened same question and answer with serving reference intact. No exam or consumed-meal card appeared. One normal test conversation was created; no health records were modified. Actual accompanying-food nutrient summation remains outstanding.
