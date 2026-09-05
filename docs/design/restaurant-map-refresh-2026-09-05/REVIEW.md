# Restaurant discovery reference review

Mobbin MCP inspected 28 distinct screen images from 20 apps plus the returned previews of Wanderlog and TikTok place flows. Current retrieval date: 2026-09-05. Mobbin metadata does not prove these are the latest shipped app versions.

## Reference library

- [Grab](https://mobbin.com/screens/a483dcfc-4527-444b-9aa3-dc4d3a2da83a)
- [Places](https://mobbin.com/screens/a975205e-1d5d-48a8-b153-0ad30ccf710a)
- [Zesty](https://mobbin.com/screens/3f81cdcc-5281-4774-b00b-6b17cf8623e3)
- [Everyday Rewards](https://mobbin.com/screens/b1560ac4-978c-4bea-b020-e0f39ecd8dcf)
- [Slopes](https://mobbin.com/screens/28ece588-bfb8-4243-b6cd-8e4566280b52)
- [Tabby](https://mobbin.com/screens/5617ab31-7cb2-4aa9-8eb8-707f8e098266)
- [Meetup](https://mobbin.com/screens/488a6aef-3f0b-4474-a065-95eb75f0bffe)
- [StubHub](https://mobbin.com/screens/375f555e-9fe7-4a8f-ae96-17885c9ef291)
- [Snapchat](https://mobbin.com/screens/5e013f82-f223-495f-bbbd-7463d76d234d)
- [Hypelist](https://mobbin.com/screens/5c0fac3c-7dec-4d4c-b429-dd99d10c6738)
- [Places](https://mobbin.com/screens/aafe7b4f-70f8-4ff2-b625-26cc3e8711b8)
- [Blackbird](https://mobbin.com/screens/bbc0255d-f9e2-418c-b1b5-c5c893d23e4c)
- [Wolt Delivery](https://mobbin.com/screens/34c7be7f-6d06-4419-9b3e-2ee265e5219b)
- [Resy](https://mobbin.com/screens/8295e4d6-0709-43d4-baa8-d53764fbfb3c)
- [TheFork](https://mobbin.com/screens/6869f280-374f-4d61-a7a1-791fe0ea3ab4)
- [Places](https://mobbin.com/screens/203dc488-2792-4dec-8e27-0df58e76d064)
- [Airbnb](https://mobbin.com/screens/24072f6f-71d3-47f1-92e3-3b63bf4b1b43)
- [Airbnb](https://mobbin.com/screens/067c2fd3-202a-4dc1-ba8b-e5d6249aa80c)
- [Airbnb](https://mobbin.com/screens/2f8e940b-f89a-4b6b-a489-2c4054d817cd)
- [Airbnb](https://mobbin.com/screens/0b8b2923-4316-40a8-8c20-8daea00ce08d)
- [Luma](https://mobbin.com/screens/0e09b835-efb1-4900-8c37-79569b24e6c3)
- [Luma](https://mobbin.com/screens/a52ef85c-6422-4889-b65c-ce7d1600f90b)
- [Luma](https://mobbin.com/screens/2b41706e-fe15-4d7a-8484-de42eddbf484)
- [Luma](https://mobbin.com/screens/9e039114-de06-4f19-939e-9b123751e524)
- [Satispay](https://mobbin.com/screens/d5d02502-31df-4301-b107-e545ba84b744)
- [Beli](https://mobbin.com/screens/557df4ea-36a8-4b2f-863f-b74db8ccf821)
- [Subway](https://mobbin.com/screens/8ffd6f93-bee4-471f-99dc-bb84f095fda0)
- [Shopee](https://mobbin.com/screens/3ac8b83b-8520-4753-9dec-ed9ddbd968e6)

Flow previews inspected: [Wanderlog place discovery](https://mobbin.com/flows/253f9e50-5ca8-44f1-b8bd-a8b5cec26e7c) (3 returned previews) and [TikTok place discovery](https://mobbin.com/flows/f45e0d1b-0d3e-4f42-ae1e-a931a4135934) (2 returned previews).

## Direction

Airbnb: neutral unselected pins, clear selected state, visible result summary. Luma: one image per compact comparison row and strong title hierarchy. Meetup/TheFork: explicit map/list transitions. Beli: grouped filter controls and deliberate apply/clear actions. Preserve Sinsin's Pretendard, semantic light/dark palette, and nutrition qualification; do not import event-only RSVP/date controls or unsupported restaurant claims.

## Initial audit

The existing screen repeats multiple restaurant photos below every title, mixes name and several badges on one wrapping row, uses saturated orange for every cluster, and exposes only a drag handle plus filters as the collapsed sheet. Many controls have fixed heights despite text scaling. Actual dark-mode iPhone screen inspected before edits; current map queries, gesture detents and selected-place behavior must be preserved.

## Implemented decisions

- The collapsed sheet identifies the current result set, count, and explicit map/list actions. Saved-only results use their own heading. Expanded lists hide the obscured search and map controls from touch and accessibility, and cover the map behind the status bar.
- Search and saved-only selection share the top search surface; the map keeps one current-location action. Categories, filters and view controls use neutral selection contrast; orange marks the selected place and primary action.
- Cluster bubbles use theme-aware neutral surfaces. Smaller unselected marker rings contrast with the orange selected marker without changing collision, cluster zoom or hit-area behavior.
- Each restaurant comparison row has a readable title, cuisine/rating, opening information, address and a single stable thumbnail. Nutrition qualification sits in a separate footer. Large text can move the thumbnail above the text. The same card serves map, list and bookmarks.
- Empty and duplicate photo URLs are removed. Failed thumbnails advance to another supplied URL, then an existing cuisine illustration. The image frame retains its size while loading. No invented restaurant images or nutrition claims were added.
- Controls have a minimum 44-point height and grow with text. Filter sections scroll into view on their first opening; the selected-filter tray reserves space so the first selection does not move the footer. Apply now says “식당 보기”.
- Existing measured sheet detents and spring transitions remain; the map stays mounted while results load. Removing the image strip also removes nested horizontal scrolling from each comparison row.
- Expo status-bar styling follows the app theme and is reapplied at native stack transition completion. The current test build rejects native-stack statusBarStyle because controller-based status-bar appearance is disabled, so that option is not used.

## Native verification

Verified in the existing iPhone 17 Pro / iOS 26.5 Expo development client, Metro 8085. No new build or deployment.

- Map/list buttons expand and collapse the sheet; the expanded list has a solid status-bar surface and no overlapping current-location control.
- A map cluster zooms into individual places. Selecting 오레노라멘 shows its orange marker label and its selected card; the card opens the matching detail and returns to the map.
- Search for 오레노라멘 returns 오레노라멘 강남점; selecting it opens the matching detail. Back navigation returns through search to the map.
- Applying 한식 changes the initial 334-result query to 161 results and synchronizes the selected category/filter count. Filter reset restores the unfiltered result set.
- Saved-only returns the existing saved place; combining it with 한식 gives the empty-filter state with an actionable reset. Reset restores results. No bookmarks were changed.
- Default text and three Simulator preferred-text-size increments were visually inspected in light and dark modes. Category controls, result header and restaurant rows remain legible. The original text size and dark theme were restored.
- Final fresh navigation into 크라이치즈버거 강남점 shows the correct detail without a red error screen. After the transition fix, the time and system icons are white against its dark background. Return to the map preserves the selected place and updates the visible-area results.

## Automated checks and limits

The gate ledger reruns restaurant map HTML/bridge/theme/geometry, sheet detents, selected-place ordering, viewport actions, filter state, retry behavior, response mismatch, photo URLs and nutrition-badge tests; it also runs TypeScript, restaurant/root-layout lint, UX copy audit and diff whitespace checks.

Loading skeletons, unavailable-data messaging and map-failure list fallback were inspected in source, with failure classification/retry paths covered by the existing regression tests. An actual SDK outage was not injected in the Simulator. Manual map-drag performance and frame rates were not measured. Android and production builds were not validated in this pass.

The local data source currently supplies the same sushi image for several unrelated restaurants. Duplicate URLs within a card are handled, but the authenticity of upstream photos is not corrected by this UI change. The UX copy audit completes with existing findings, including MED-002 in unrelated Korean health copy; this pass did not change medical guidance.
