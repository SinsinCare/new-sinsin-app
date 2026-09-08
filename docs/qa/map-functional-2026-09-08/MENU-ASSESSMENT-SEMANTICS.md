# Restaurant menu assessment semantics — 2026-09-08

## Native defect

The restaurant detail primary assessment action opened consultation with a
`foodConsultContext`. The UI presented a meal-record card and asked about the
next meal. The actual generated answer added all five restaurant menu options
together. Omitting the supplied total did not prevent the model from adding them.

## Correction

- Removed the detail screen's food-record parameter builder.
- Added buildRestaurantAssessmentParams using restaurant context, attachment
  label, restaurant ID, and a question requesting individual menu comparison
  against the user's goals.
- Shared restaurant context explicitly identifies candidate dishes as not eaten
  and instructs against adding the options together.
- Preserved the bounded menu context and request identity used by other
  restaurant consultation entries. Ordinary meal-record consultation is untouched.
- Replaced stale tests that required the broken food-context implementation.

## Verification

- iPhone 17 Pro / iOS 26.5 Simulator: repeated the primary action. Restaurant
  attachment appeared instead of a meal-record card; the question asked for
  individual menu comparison. Actual response introduced each dish as a separate
  candidate, used supplied estimates, and completed. Returned to restaurant detail.
- Two test consultations were created through the app. No meal/health/restaurant
  records were written or deleted. Personal goal values and full answers are not
  included in this artifact.
- 63 tests passed in restaurantConsultMessage and restaurantAiConsultEntry.
- TypeScript, scoped ESLint, and diff whitespace checks passed.
- UX copy audit exited 0 with existing unrelated findings.

This is local native interaction evidence, not clinical validation, production
deployment, or proof for every future model response. Large-menu, empty-menu,
interrupted-generation, and Android behavior remain outside this pass.
