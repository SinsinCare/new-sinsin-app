# Restaurant list: compact map controls, nutrient badges and menu strip

## Checkpoint and user direction

Before changing the right-photo list, created checkpoint `cf7679c` on `fix/ckd-nutrient-limits`. The commit contains restaurant changes and their image/cache dependencies. Other staged health-record edits were preserved. Only restaurant translations were included from the shared locale files.

The user then explicitly chose photos below the metadata in a horizontal list. Their supplied NAVER screenshot sets the information order; its popular-menu strip was initially **영양 참고** and the user then changed it to **대표메뉴** with menu names. The final follow-up removes the orange selection edge. Selection now uses only a quiet neutral surface difference.

Typography remains compact: 15 pt semibold name, 13 pt business/rating/review information, and 12 pt secondary location/category. No global typography tokens changed.

## References examined

- [Beli restaurant list](https://mobbin.com/screens/2020f649-d8b9-4741-ac5c-f2664b5eff50): clear restaurant identity, score, cuisine and location.
- [Beli ranked list](https://mobbin.com/screens/dbea97a3-be86-4d31-93bd-8af940ec8448): restrained secondary metadata.
- [Beli compact list](https://mobbin.com/screens/5b147bc8-63a0-46a4-810e-fe01655ae23a): compact comparison rhythm.
- [Zomato results](https://mobbin.com/screens/d5fdd2a4-07dc-4c65-a66f-44468c23466c): name, rating, distance and business information are separate readable facts.
- [Swiggy](https://mobbin.com/screens/72fc994f-9cbc-4fb1-9712-4c60506f6158) and [Grab](https://mobbin.com/screens/b7330914-85ad-45d1-be55-ef5eaab73c06): examined photo-led results; promotional scale was not adopted.
- Blackbird previews [one](https://mobbin.com/screens/c0dccdb3-f2fd-4e6e-bda1-45b1bacb8f35), [two](https://mobbin.com/screens/c5f02664-10e1-4b83-90bc-4bc72be8319e), [three](https://mobbin.com/screens/d3d3f8bd-586f-4215-bcf8-88ce1279693e) returned map/selected-place states, so they do not establish this list layout.

The supplied NAVER screenshot provides the final hierarchy: name/category, business/rating/reviews, photographs, contextual summary. No unsupported promotional text, reservation badges or review excerpts were invented.

## Final behavior

- Metadata, photos and the menu strip each have separate detail-entry touch targets. A scrolling photo rail is not nested inside the whole-card press target.
- Photos are 128 pt tall with a 2 pt seam, rounded outside corners, and a visible trailing preview. At most three images from the existing card response are rendered; no per-row detail fetches were added.
- One/two photos use the available width. Known stock photos and duplicate/blank URLs are excluded. An absent photo list has no invented food photo; a failed image keeps its slot and shows a neutral unavailable state so loading failure does not shift the card height.
- Every problematic nutrient appears between the name and cuisine in a 10 pt badge with 4 pt horizontal padding and no vertical padding. Color is retained; size provides the lower hierarchy. Business status uses neutral text. Backend `concernCounts` counts all nutrients meeting the existing caution threshold, while `driverCounts` retains its old dominant-nutrient meaning. Missing profiles and unknown values do not create badges.
- A neutral **대표메뉴** strip below the photos shows up to three registered menu names, signature entries first, with single-line truncation. Missing names produce no invented menu. Search pages batch-load the names in one query; the nutrition covering query is unchanged. Selected-marker detail fallback also carries names from its existing menu query.
- Selected rows have no colored edge. The menu strip remains distinguishable on the selected neutral background.
- Skeleton geometry follows the new metadata/photo/summary layout.

## Image-cache correction retained in the checkpoint

The shared remote-image key previously removed every query parameter. Proxy image URLs with distinct source images in their query therefore collided. Generic URLs now retain their content parameters. Only known GCS authorization parameters are excluded for signed-URL rotation; generation and crop parameters remain part of the identity. A versioned key avoids reusing the previous ambiguous entries. Six regression cases cover proxy identity, content variations, signed rotation, generation/crop, lookalike hosts and non-HTTP inputs.

## Native verification and limits

Observed on the existing iPhone 17 Pro / iOS 26.5 TEST client:

- Dark and light default-text lists show the metadata, three distinct venue photos and the nutrition strip.
- In the final light view, the selected 오늘도등심 row has a neutral fill and **no orange vertical line**.
- Restaurant-name and photo taps entered 크라이치즈버거 detail; back returned to the list. List/map buttons worked both directions.
- Repeated automatic scroll attempts failed with Computer Use `-10005: noWindowsAvailable`, for both coordinates and accessibility targets. Actual horizontal/vertical gesture behavior is not certified by these checks.
- A temporary one-step text-size increase was stopped at the user's request. It was restored and verified through `simctl ui`: `large` (the original standard iOS category), with system appearance `dark`. Do not change the user's text size again for further QA. Enlarged-text list verification is explicitly withdrawn, not passed.
- The app was visibly light during final selection-line verification; the user was actively navigating/settings-changing during QA. Do not infer a release or production state from this development client.


## Final header and filter refinement

The user's additional NAVER screenshots are the direct reference for this iteration.

- Expanded lists retain the 48 pt search bar above the sheet. Map mode keeps its floating surface; expanded mode uses a neutral input surface.
- The sheet header is now outlined filter controls, a gray cuisine rail, then small area/sort/count/map controls. The oversized result-title row is removed. Cuisine rails use RNGH scrolling inside the sheet.
- The filter form is one continuous scroll, with sections for sort, opening hours, nutrients, cuisine and region. Controls jump to their section instead of swapping tabs. Sorting shares the same form.
- Sort options align to three columns, cuisines to four, and nutrient chips to five. Labels retain their existing font sizes; unselected values use regular weight and selected values gain a border and semibold text. Headings/options/section gaps follow the same spacing tokens.
- The footer is docked through the sheet's footer slot with 48 pt Reset/Show restaurants buttons. Its measured height reserves scroll space, including the final region option. A single 82% snap avoids content-driven height changes.
- Sort and opening hours now edit the same draft as other filters. Closing/reopening discards unconfirmed edits, Reset affects the draft only, and applying commits all sections together. Search text and saved-place scope survive Reset. Sort analytics remain tied to confirmed changes; unchanged region selections no longer recenter the map when only sorting changes.

### Verification of this iteration

- Existing iPhone 17 Pro TEST client: observed both collapsed/expanded headers, persistent search, tiny nutrient badges, neutral business labels, the menu strip, continuous filter sections and fully visible footer buttons.
- Native interactions: selecting rating/opening hours then closing retained the previous results; the area control opened the lower region section; the final 구로/관악/동작 option is visible above the docked footer; Show restaurants closed the filter; List expanded with search still visible.
- 217 front-end tests in 11 relevant suites and 10 backend safety tests passed. Front-end and backend type checks and targeted lint passed. Copy audit exited successfully with existing repository warnings.
- The representative-name SQL was exercised against PostgreSQL using a read-only VALUES CTE: signature order, duplicate/blank/inactive exclusion, per-restaurant cap, absent/empty inputs, and one batch query all passed. No persisted rows were written.
- **Data limitation:** local restaurant menus still include legacy seeded values (e.g. 크라이치즈버거 currently stores 파스타/스테이크). The strip reads registered names and does not establish that these are verified current venue menus. No menu-data import, production deployment or font/device-setting change was performed.

## Cuisine selection consistency

- Both map and list category rails now support the same multiple selection as the filter form. Each tap adds or removes only that cuisine, and every selected rail chip remains highlighted.
- Quick toggles use confirmed filters and synchronize the draft. Unconfirmed edits from a closed filter cannot reappear when a rail chip is tapped. The cuisine count reflects the complete confirmed selection.
- Native verification on the existing iPhone 17 Pro TEST client: selected 한식, then 중식 in the rail; both stayed selected with count 2 and 206 results. Opening the filter retained both selections. Removing only 한식 and applying left 중식 highlighted in the rail, count 1 and 45 results. The final rail tap cleared the test selection.
- All 68 tests in the filter-state, category-chip, catalog and list-layout suites passed; TypeScript and targeted ESLint passed. No font or device settings were changed.

## Returning to the checkpoint layout

To restore only the pre-rail list implementation while retaining other working changes:

```sh
git restore --source=cf7679c -- src/features/restaurant/components/RestaurantCard.tsx src/features/restaurant/components/RestaurantCardSkeleton.tsx src/features/restaurant/components/RestaurantNutritionSummary.tsx src/features/restaurant/components/RestaurantThumbnail.tsx src/features/restaurant/components/PhotoStrip.tsx
```

This is a recovery instruction, not an action performed by the assistant.
