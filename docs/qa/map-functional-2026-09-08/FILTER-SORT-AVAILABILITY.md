# Filter/sort lifecycle check — 2026-09-08

Found a missing effect dependency in `RestaurantListScreen`: it sanitized distance sorting only when the location-availability flag changed. Applying AI filters with `DISTANCE` while location remained unavailable could leave the UI on distance ordering while request guards used the default. Map's equivalent effect depended on the entire controls object and ran unnecessarily on unrelated renders.

Both now use `useAvailableRestaurantSort`, watching the actual sort, location availability and stable sanitizer. Newly selected distance ordering without a location is reconciled; valid distance ordering stays intact.

Validation:
- Native Simulator: selected Korean + Chinese in the filter draft, closed without applying, reopened and verified both were unselected. Selected Korean + Western, applied, and verified both rail chips selected with recommended ordering. Reset and applied; restored the initial unfiltered state. Distance was disabled with the existing out-of-service-region location.
- 60 tests passed across sort-availability lifecycle, filter state and request guards. New cases cover a new distance sort without any location-state change, and loss of location while distance is selected.
- RN typecheck, scoped ESLint and whitespace checks passed.
- The AI-generated distance branch was verified in the effect regression harness, not via a new native AI search request. No place/account/health data was written.
