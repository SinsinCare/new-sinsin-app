# Restaurant map detail refinement

The user subsequently rejected the oversized direction. The final sizes and selected references are recorded in COMPACT-REVIEW.md; the 20-point heading described in this intermediate pass was reduced to 17 points.

Follow-up research on 2026-09-05: 28 additional distinct screen images from 13 apps, excluding all 28 screens in the previous pass. These are Mobbin's available captures, not a guarantee of each app's latest released version. NAVER Map returned no matching screens; a Mapstr query returned other apps, identified below by their actual names.

## Additional reference library

- [Google Maps](https://mobbin.com/screens/20e3f86c-6cc8-4c92-929f-626bb8da5b24)
- [Google Maps](https://mobbin.com/screens/2a81f624-0abe-44e9-92ac-146324d4601b)
- [Google Maps](https://mobbin.com/screens/a905d447-c1e1-4791-b682-57d8cebc8129)
- [Google Maps](https://mobbin.com/screens/1674974b-a08f-4561-bbdf-245660268e36)
- [Apple Maps](https://mobbin.com/screens/1457bc37-0b4b-4d07-965b-110a386774df)
- [Apple Maps](https://mobbin.com/screens/0815d292-1e75-4a45-bd7d-2dfabcee1d68)
- [Apple Maps](https://mobbin.com/screens/428c328c-408a-4016-a366-89809c93510b)
- [Apple Maps](https://mobbin.com/screens/a4a87748-0782-4ab8-bb0f-e812361509ae)
- [Citymapper](https://mobbin.com/screens/09548efa-23e8-4957-b160-c5d87db7bed8)
- [Citymapper](https://mobbin.com/screens/3b34e7a1-b4eb-4b97-b0d5-bbb0b34e8d6c)
- [Citymapper](https://mobbin.com/screens/1a28016d-d6ec-4a69-91c8-12a40bdb6850)
- [Citymapper](https://mobbin.com/screens/541f852e-cdc8-44fa-b2c3-1a24b58f0d65)
- [Beli](https://mobbin.com/screens/1ac6a935-41b4-41e0-b433-dbb5d593a0e9)
- [Beli](https://mobbin.com/screens/1165be55-c303-4aa6-a1bf-19a5afbcee16)
- [Beli](https://mobbin.com/screens/a09717c6-06a9-4a57-a694-0263f46441c4)
- [Beli](https://mobbin.com/screens/b965c112-cea4-4284-a47e-0b882213e74f)
- [Yelp](https://mobbin.com/screens/042b4ac9-06f6-494f-b1ac-a2baae426e33)
- [Yelp](https://mobbin.com/screens/f8e3b85f-19a2-4fc3-9ad8-f105c12404aa)
- [Yelp](https://mobbin.com/screens/afbc0f63-1888-4df6-8369-0d03024b59c3)
- [Yelp](https://mobbin.com/screens/c1ef1ea2-01e6-4f3f-9f6c-454821128270)
- [corner](https://mobbin.com/screens/f3fd6510-7bf9-425e-949e-61df09ad898a)
- [Placify](https://mobbin.com/screens/14dffc79-1c39-4930-bb73-9c539f25a657)
- [AllTrails](https://mobbin.com/screens/c78f9bf0-958a-44f2-a5cf-e25af8d38377)
- [Expedia](https://mobbin.com/screens/f520fac3-554a-4d5c-b4c6-2e56d9e546d9)
- [StubHub](https://mobbin.com/screens/5fa63389-bd52-41e8-9925-d41bafb4f20f)
- [Meetup](https://mobbin.com/screens/51be1ff0-2146-486d-9c1a-6d89ff7747d3)
- [Lex](https://mobbin.com/screens/2055d61c-1589-4207-80ee-7274b409a28d)
- [DICE](https://mobbin.com/screens/bbc21126-1075-4a16-b9e8-0b0246dc0a8f)

## Applied hierarchy

- Google Maps and Apple Maps: keep query/filter controls legible but secondary to places, preserve a compact result summary and predictable comparison rows.
- Beli, Meetup and Yelp: one explicit map/list action; distinguish the selected place from the many background choices.
- AllTrails: selected place name remains the anchor between the map and its card.
- corner: a consistent title, metadata and single-image rhythm in the list.
- DICE and StubHub: control map label density before adding more decorative layers. Saturated event-category palettes were not imported into the health product.

## Changes

- A 20-point result heading and inline count replace the smaller stacked summary. One clearly labelled action expands the list or returns to the map. Header and cards now share the 16-point left alignment.
- Filter entrances have neutral outlines with dropdown indicators; sorting remains a lighter text control. All keep real 44-point minimum touch boxes that grow with text. Obsolete negative touch padding was removed.
- A selected restaurant gets a reserved-width orange edge and subtle neutral surface, without changing the title position or card height. Nutrition qualifications remain separate from rating and business metadata.
- Unselected map names use a 12/16 type scale and ellipsis for long names. The layout keeps 3–12 labels according to map area, honors server order, excludes clipped labels, leaves space around names and pins, and reserves the selected bubble first. Hidden text does not remove its marker, accessible name or touch target.
- The tab reapplies the app-theme status-bar style on focus because tab entry does not emit a native stack transition-end event.

## Verification

Final runtime evidence, regression results and the direct pin-interaction limitation are recorded in COMPACT-REVIEW.md and DETAIL-GATES.md.
