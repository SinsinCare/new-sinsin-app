# Recipe browse refresh — 2026-09-06

## Intent

Compact Korean recipe discovery. Preserve Pretendard, existing font scale, route paths, recipe data/provenance, server meal priority, bookmark state and search/filter contracts. Use Mobbin for external references; never fabricate food images, ratings or counts.

## Mobbin references inspected

17 screens across eight actual returned apps were visually inspected. Searches for Cookpad, Tasty, Samsung Food and Mealime returned other products; these are not claimed as references from those named apps.

- **Kitchen Stories:** [discovery](https://mobbin.com/screens/849c6f37-8c9c-4dfe-b702-fccb8a04ef10), [search](https://mobbin.com/screens/bb74f56a-6dc2-46fc-9864-6bd89d2ac454), [search variation](https://mobbin.com/screens/acd734ef-9436-45bb-a5a5-8aabaa62d113), [creator recipes](https://mobbin.com/screens/9d70bed4-358d-4193-84b7-141143144964). Food image, recipe name and small metadata have separate roles.
- **NYT Cooking:** [browse](https://mobbin.com/screens/7703a07f-d26b-4d1e-a5bd-660cc5df52af), [Recipe Box](https://mobbin.com/screens/96a23f66-f783-4154-8b61-a2b1f79c186a), [saved results](https://mobbin.com/screens/b955740b-559a-4cca-b9a9-4efe21b9f6d2), [search results](https://mobbin.com/screens/74b844bb-b001-43fb-91e5-e9d8787a5615), [filter preferences](https://mobbin.com/screens/74618039-64f1-47b9-8892-7778e3fb5dbc), [filter sections](https://mobbin.com/screens/b403979a-09a7-4e8f-9aed-1cfec328a282). Main influence for search width, compact sort, outlined filter choices and saved entry.
- **Withings Health Mate:** [recipe list](https://mobbin.com/screens/0c7ce8e2-2b97-40a4-a330-6328b7817de6). Compact rows and meal grouping are a better fit for our current image-sparse catalog than full-screen food cards.
- **Yazio:** [category discovery](https://mobbin.com/screens/dfa3f35a-5d4c-4ca3-98c6-85226b9bee1a). Reviewed category-to-recipe organization.
- **Blinkit:** [recipe discovery](https://mobbin.com/screens/3b5dabc7-926d-49cc-a278-fdf4bd416355). Reviewed photo-led grid and small timing metadata.
- **Instacart:** [explore meals](https://mobbin.com/screens/6124c2cd-20eb-46cf-8580-d4ff281ec6a7). Reviewed clear meal groups and saved content access.
- **Cherrypick:** [recipe selection](https://mobbin.com/screens/83929e82-b409-4948-8052-e8f78f7f88fd), [meal plan](https://mobbin.com/screens/a68a553e-6d0b-4280-bb01-0234faf4e56a). Reviewed image/name/metadata separation; did not add shopping or meal-plan features.
- **Recime:** [meal plan](https://mobbin.com/screens/5780fcc2-a600-41d5-8dd3-5c232926f690). Reviewed as an adjacent pattern; calendar planning was outside this pass.

## Implemented

- Search and compact text categories remain fixed. Removed faded food-category illustrations from the navigation rail. The `All` control clears categories only; nutrition filters remain independent. All seven category options, including beverages, come from the filter model.
- Category bar and sectioned filter sheet both use the same multiple-selection operation. Tapping a selected category removes only that category. Applying filters and changing sort reset the list position and cached offset together.
- One meal section is visible at a time, controlled by breakfast/lunch/dinner tabs. Initial selection follows the server's section order; explicit selection survives refetch and can select recorded/empty meals. All meal choices remain reachable. No device-clock override.
- Compact recommendation previews replace three tall repeated carousels. The full recipe list is visible within the first screen on the current iPhone 17 Pro.
- Kept one fixed writing entry and saved-recipes entry. Removed the duplicate floating recipe-writing button.
- Recipe rows show name, concise category/time/rating metadata, then the source-backed nutrient amount. Long names can wrap instead of clipping inside a fixed row. Removed remaining-budget percentage and save-count clutter from row summaries; underlying data is unchanged. Real photos continue to use the existing cached image path; category artwork stays a compact fallback where photos are absent.
- One small sort menu replaces the five-chip row. Result count and sort align on one baseline. Estimated nutrition remains labeled separately.
- Filter sheet has distinct food/nutrition sections, consistent option spacing, explicit multiple-selection guidance and fixed clear/apply actions. Selected options use charcoal rather than tinted orange surfaces. Light-mode edges use existing normal line tokens at 1 logical pt.
- Screen shrank from over 1,000 lines to a composition of feature-owned controller, browse header, meal discovery and feedback. Search debounce, pagination, refresh scopes, tab reset, intro and detail routes are preserved.
- Empty search/filter results include a working reset action; errors respect the retryable state. Added a bounded `recipe_list` analytics surface for the existing v2 feedback events.

## Verification

- iPhone 17 Pro / iOS 26.5, existing local TEST client, light app appearance. No device text-size or appearance setting changed.
- Visually checked default browse, compact first-screen list, meal switch from breakfast to lunch, name/metadata alignment and filter sheet/footer.
- Selected Korean and Chinese in the category bar. Both remained selected; mixed results appeared and both were checked in the filter sheet. Tapping Korean there removed only that draft category.
- 256 tests passed across 11 recipe suites (244 browse/model tests plus 12 archive tests); one pre-existing test is skipped. Covers normalization, provenance, search/filter model, pagination, photo fallback/cache geometry, server meal priority, explicit meal selection, sticky navigation and archive behavior.
- TypeScript, targeted ESLint and diff-whitespace checks passed. UX-copy audit reported 12 existing candidates outside the new recipe copy.
- Applied low-sodium filtering: the sheet closed, the filter count became one, and matching results appeared. Reopened it, added low-phosphorus as a second draft choice, then closed without applying; only the original low-sodium condition remained applied.
- Changed sort to quick cooking: the control updated and visible results began with 3-minute and 5-minute recipes.
- Searched for `비빔밥` with low-sodium filtering; seven results appeared. Opened a matching recipe and returned; query, filter and sort were preserved. Opened the saved archive and verified its three saved rows. No bookmark or recipe content was modified.
- Searched for an absent test term, saw zero results and the reset action, then reset: both query and nutrition filter cleared and meal discovery returned. Restored recommended sorting after QA.
- Archive row dividers now also use the normal line token at 1 logical pt, replacing faint physical-pixel hairlines.
- Native scroll/drag tooling returned `noWindowsAvailable`; no full-scroll or dark-mode visual verification is claimed. Native typing/paste tooling also failed, so Korean search was exercised through the supported accessibility value-setting action.
