# Community activity, author profile and related discussions

## Direction and references

The user asked for compact Korean community UI. Keep the established type scale and grayscale, without changing device text size or appearance.

References actually examined on Mobbin:

- [Threads profile](https://mobbin.com/screens/ff7c2caf-9afb-4dfd-894e-e6075254fb5c): identity and avatar, restrained following state, and a clear boundary before member content.
- [Karrot community list](https://mobbin.com/screens/c3d7a10b-f778-48d2-bdd1-6ce7eb8b5041): compact discussion titles, small metadata and optional trailing photos.
- [Reddit interest-based recommendations](https://mobbin.com/screens/c381ec3a-7000-4ab8-8491-ed4a18acc7f5): community context, title and conversation activity. This is a feed reference, not an exact below-comments screenshot.

The initial article recommendation search returned news/editorial products. The user correctly rejected that direction; those results were excluded. Later Toss results showed a stock chart and were also excluded. No claim is made that Mobbin supplied an exact copy of our related-discussion section.

## Changes

- My activity now has the user's avatar/name and a working profile-edit entry, with compact underline tabs for written, liked and bookmarked posts. Removed tab counts that only reflected loaded feed pages. Empty tabs use matching quiet icons. Switching tabs resets the list position instead of carrying an old scroll offset into another collection.
- Public profiles share the identity layout. Followers/following are inline, readable controls with 44 pt targets. Follow uses charcoal before following and a quiet neutral surface afterward. Pending interactions remain disabled, with the existing optimistic mutation and rollback behavior preserved.
- Profile back navigation stays outside the scrolling list and remains available while loading, on an invalid link and on a request failure. Skeletons follow the profile layout. Removed a redundant 20 pt wrapper around post rows, so their content aligns with the profile header.
- Related discussions use flat rows with category/time, two-line title, author, actual likes/comments and a small right-side thumbnail only when an image exists. Each row opens the corresponding community post. Existing ranking, current-post exclusion, blocked-author filtering and retry handling remain in the screen.
- Uses existing v2 semantic colors, avatar/image caching and tokens. No new library, backend change, deployment, font/device preference change or fabricated content.

## Verification

- Existing iPhone 17 Pro / iOS 26.5 TEST client: observed my activity profile and tabs; liked tab shows its saved entry; tapping that entry opened the post; tapping its author opened the redesigned public profile.
- Profile edit opened the existing settings page and returned without changing profile data. The bookmarked tab showed its matching icon, explanation and browse action.
- Public-profile follow/unfollow and follower-count states were observed, and the original following state was restored. The follower count opened the followers list; back returned to the profile and post.
- The post's related heading and three distinct recommendation buttons with author/comment accessibility labels are present in the native hierarchy. The first metadata row is visible below the heading.
- **Native limitation:** full lower-section visual/scroll verification remains unconfirmed. CUA scroll and touch-drag both returned `-10005: noWindowsAvailable`, including after raising the Simulator window. No device settings were changed to work around it.
- Relevant existing regression suites cover follow mutation/rollback, empty/error states, block filtering, ranking and community navigation contracts. A test-only design-system mock was extended for the new presentation components.
- All 134 tests across the eight relevant suites passed after updating that mock. Final TypeScript, targeted ESLint and diff-whitespace checks passed. The Korean copy audit completed and reported existing repository findings outside this change.

## Existing data limitation

My activity and public-profile post lists still filter the loaded community feed cache; they are not complete author-specific or personal-library endpoints. This pass does not change that data contract and does not present a lifetime post total. Follow counts continue to come from the dedicated profile response.

## Detail and light-mode separator pass

The user's follow-up identified weak details and nearly invisible light-mode separators. This pass keeps the type scale and global theme tokens intact.

- Community row/header/input boundaries now use the existing `line.normal` color (`surface.border` in legacy components) and `borderWidth.thin` = 1 logical pt. Previously, `line.alternative` (8% alpha in light mode) was often combined with a physical-pixel hairline. On a 3x screen the line was only one third of a logical pt.
- Applied across the feed, category/sort bars, story rail, activity tabs, public profiles/connections, popular posts, comments and their composer, related discussions, free-post editing, report/vote/tag surfaces and shared community row primitives. Skeleton row boundaries match content rows.
- Restored section bands in light mode. The previous condition hid them based on an older card-on-gray layout; the current flat feed needs a boundary in both themes. Section bands retain the existing 8 pt `background.lower` treatment.
- My activity now puts the 48 pt avatar, name and outlined edit action on one row. Public profiles share the same avatar/name alignment. Names and all other text retain their existing sizes.
- Related-post author and reaction metadata are grouped beneath the title inside its text column, with a consistent optional thumbnail on the right. No invented counts, thumbnails or extra copy.

### Current verification

- On the existing iPhone 17 Pro TEST client in app light mode, observed visible separators below feed tabs/category filters, the story rail and post rows; verified the compact activity identity row and tab boundary; observed public-profile alignment, following state and the other-posts heading/list boundaries. Post detail shows the comment composer top boundary and both section bands.
- 363 tests passed across 12 community suites. Includes feed/section wiring, primitive controls, follow behavior, empty/error states, blocked-author filtering and recommendation ranking. The existing row test now checks the rendered separator is at least 1 logical pt and exceeds 1.25:1 against the white canvas; this is a visual regression threshold, not an accessibility compliance claim.
- TypeScript and diff-whitespace checks passed. ESLint reported no errors; the existing VoteSheet literal-color warnings remain.
- The broader `lightContrastAudit` run additionally surfaced three old assertions outside the changed separator cases: the restaurant SelectableChip fill rule, a community route file expected to contain the old inline screen, and the former gray community page-background rule. These were not represented as passing checks. The updated section-band cases themselves passed.
- CUA `scroll` still returns `-10005: noWindowsAvailable`. The complete below-comments recommendation layout has not been visually verified; its three recommendation actions and labels were observed in the native hierarchy. No device appearance/text-size settings were changed.
