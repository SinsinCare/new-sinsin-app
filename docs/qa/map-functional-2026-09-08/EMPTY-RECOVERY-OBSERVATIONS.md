# Native map empty-result recovery — 2026-09-08

Observed on iPhone 17 Pro / iOS 26.5 using the current local app.

- Dessert filter yielded 0 places; after transition, both saved-places and report actions were visible in screenshot and AX. The initial transitional AX snapshot omitted them; this is not evidence of missing product buttons.
- Report opened from the empty state. Returning without input restored the dessert filter and 0-result state.
- Saved places opened independently of the current cuisine filter and showed the existing saved place. Back preserved the map filter.
- Reset filters cleared dessert selection and restored 334 results. Temporary filters are cleared.
- No bookmarks, reports, photos or review data were changed.

No implementation change was needed for these recovery paths. Saved-list empty state was not exercised because the account has an existing saved place; it was preserved.
