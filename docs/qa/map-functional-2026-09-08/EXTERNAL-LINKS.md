# Restaurant external launch handling — 2026-09-08

Source inspection found fire-and-forget Linking.openURL in detail header/footer call actions and Instagram/blog/YouTube rows. Rejections had no user feedback and could become unhandled promise rejections.

Added openRestaurantLink, shared across DetailInfoRows, InfoTab and RestaurantDetailScreen. Pending launches for the same validated URL coalesce; success/failure release the slot for later retries. Errors produce localized, action-specific feedback without exposing/logging the native URL/error. Malformed phone targets no longer create an active call action (footer hides it; inline phone text is noninteractive and remains copyable). Existing HTTPS/phone normalization stays in place.

Four deferred/failure regression cases pass; TypeScript and scoped ESLint pass. Copy audit exits zero with existing unrelated warnings. Web and phone launcher behavior was mocked in these tests. This leaf has no native external-launch proof: the inspected restaurant has no SNS URL, and no real phone call was initiated. Native app-return behavior for these call sites remains outstanding; earlier route-app verification is not a substitute.
