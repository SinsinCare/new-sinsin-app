# Medication v2 / six record pages — implementation review

Reviewed 2026-09-06–07 in the local TEST app, iPhone 17 Pro Simulator / iOS 26.5, Metro 8085 and Bun API 8100. This is local runtime evidence; no deployment was performed.

## Native interaction evidence

| Surface | Observed behavior |
| --- | --- |
| Medication diary | Registered the explicitly named QA medication with two slots and dose 1, checked/saved/reopened both, edited the plan to dose 2, and confirmed the saved record still shows dose 1. Paused the plan; observed empty and populated diary states. |
| Water | Added 200mL locally, checked full Korean exit-confirmation labels, discarded to home. Final compact summary and direct-entry sheet were reviewed in dark mode. Typed 250, cleared it and closed without saving; the sheet and CTA followed the numeric keyboard. |
| Blood pressure | 120/80 examples displayed uncut on the same baseline; opened optional pulse and entered 72. Keyboard and save dock stayed visible. Test input was not saved. |
| Glucose | Fasting hid meal/elapsed controls; after-meal showed them. Breakfast/1-hour selection returned after fasting → after-meal; another meal selection also worked. Final compact dark layout was reviewed. |
| Weight | Existing 50kg input, previous-day comparison and history remained visible and correctly associated. Existing records were not modified. |
| Edema | Initial part selection → face → mild → pitting unknown. No-swelling folded details; undo restored face/mild/unknown. Draft exit was discarded. |
| Shared headers and inputs | Medication methods/editor/search titles now use the same leading header. Dates remain centered. Name and dose were tested empty → entered → cleared, including keyboard dismiss and default → maximum → default font size. No placeholder/value vertical jump was seen. |
| Multiline control | Community comment placeholder remained centered, two lines expanded the field, and the down arrow dismissed the keyboard. The test comment was discarded with the exit dialog; nothing was posted. |

Native accessibility snapshots occasionally arrived one transition behind the screenshot. Re-reading current state resolved this; it was not treated as a product navigation failure. Simulator coordinate-based scroll automation was not reliable in this environment, so no scroll FPS or sustained gesture-performance claim is made.

## Saved screenshots

- [Historical dose snapshot](screens/01-saved-snapshot.png)
- [Medication bounded accessibility text](screens/02-accessibility-bounded.png)
- [Edema no-swelling state](screens/03-edema-none.png)
- [Edema large text and full date](screens/04-edema-large-text.png)
- [Dark medication empty state](screens/05-medication-dark-empty.png)
- [Corrected header / empty medication inputs](screens/06-medication-input-dark.png)
- [Corrected inputs at maximum accessibility text](screens/07-medication-input-large.png)
- [Sheet input with numeric keyboard](screens/08-sheet-input-keyboard.png)
- [Final light header and placeholders](screens/09-medication-input-light.png)

These are selected evidence frames, not a screenshot matrix of every screen/state. Default and maximum text were reviewed live; input enlargement remains available with role-based caps. iOS was exercised; Android device behavior was not observed.

## Automated verification

- Client: 15 focused suites / 133 tests passed, covering medication drafts, date/slot behavior, persistence-facing client contracts, reminders, six record routes, calendar/save behavior, text scaling and shared input normalization. Input tests assert preserved callbacks/refs/keyboard settings and unchanged multiline metrics; they do not simulate UIKit glyph rendering.
- Shared regression checks: five additional suites / 73 tests passed (`v2FieldVariants`, `v2Primitives`, `v2EdgeCaseGuard`, `typefaceLineage`, `signupProfileExitTrap`). This brings the scoped RN total to 20 suites / 206 tests.
- Server: 23 tests / 96 expectations passed on loopback `sinsin_bench`, including ownership, transactional saves, idempotency/conflicts, historical snapshots and catalog/photo boundaries.
- RN and Bun TypeScript checks passed. Owned lint has no errors; the existing record ink token file reports nine literal-color warnings. The repository copy audit reports 14 pre-existing candidates (11 S1 / 3 S2), including map HTML, internal configuration and old common copy; it is not reported as a clean repository copy audit. Medication locale additions were reviewed directly because that script's JSON allowlist does not include the medication namespace.
- `audit-text-scaling.mjs` passes with positive controls for direct native and gorhom imports. It covers the source import paths; it is not evidence that every rendered field was inspected on every device.
- The full unrelated community navigation suite previously reported a route assertion at `PostDetailScreen.tsx` (community return route). It was not changed to make these scoped checks pass, and the complete repository suite is not claimed green.

Runnable commands and fresh verification evidence are retained in `GATES.md`.

## Test state cleanup

Removed only the task-created QA medication, its three plan versions, its exact two intake snapshots and its four request receipts in a guarded local transaction. Existing weight and other records were preserved. Later name/dose/search/water inputs were cleared without saving. The two-line comment draft was discarded without posting. Simulator content size was restored to default `large`, and app appearance restored to Light.

## Release boundaries

- Manual registration, plans and diary saves work locally. A real medication catalog/API key is not configured here; search and photo paths accurately offer direct input while unavailable. No hardcoded sample medication is represented as a live catalog result.
- Photo recognition code extracts visual attributes and matches an actual catalog. No real recognition request, external image upload, clinical accuracy evaluation, or physical-camera validation was performed. Capability remains disabled until the required catalog/configuration/evaluation conditions are satisfied.
- Private, opt-in local notification scheduling is implemented and tested with scheduler mocks. Delivery of real future notifications on a physical device remains unverified.
- Migration SQL and Prisma models were checked and applied only to the local development/test databases. The legacy checkout is missing intermediate Alembic revisions; a complete historical Alembic upgrade chain could not be executed. Production schema rollout was not attempted.
