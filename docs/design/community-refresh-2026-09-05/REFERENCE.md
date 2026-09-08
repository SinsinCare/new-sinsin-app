# Mobbin reference and verification

Mobbin MCP became callable after the Codex restart on 2026-09-05. Search images were inspected directly. Blind-specific search returned other apps, so the implementation uses the Korean Karrot (Daangn) community flow.

## Inspected references

| Surface | Canonical reference | Observed structure |
|---|---|---|
| Community feed | https://mobbin.com/screens/48dce847-ee5f-4b83-8aff-ffa62f5ecb83 | White canvas, equal-width feed/popular tabs with a dark underline, neutral category rail, compact category/title/summary/meta rows, optional right thumbnail, orange plus/write action. |
| Popular | https://mobbin.com/screens/c3d7a10b-f778-48d2-bdd1-6ce7eb8b5041 | Title-led rows, compact counts, thin separators, optional small thumbnails. |
| Search | https://mobbin.com/screens/1331dc6b-4579-4da0-9816-d0f287510872 | Neutral filled search field, clear action, scope navigation and flat results. This captured example is the app's integrated marketplace search. |
| Post and empty comments | https://mobbin.com/screens/1364c592-23db-4d75-a8d2-64f3d2501996 | Author before title/body; low-emphasis outlined reactions; section band; quiet empty comments; bottom comment input. |
| Writing | https://mobbin.com/flows/99363454-1610-408b-ab2e-6e51d329c538 | Screen 4: close icon, centered title, top-right completion action; full-width category row, plain title/body; photo/poll/tag tools directly above keyboard. Screen 6 is the resulting post. |

The returned `Community details` flow was a group overview rather than a discussion post, so it was excluded as the article reference. Search queries for populated discussion comments returned nonmatching screens; the inspected post/empty-comments screen anchors the discussion layout.

## Applied system

- Existing v2 surface and typography tokens, one 20pt content start line, 8/12/16/20pt spacing rhythm.
- Shared flat PostListItem across feed, search, popular and activity; 17pt titles, 14pt previews, small metadata, 68pt optional thumbnails. Skeletons use the same flat row family.
- Feed browsing tabs occupy equal widths. Category selection uses the same neutral V2Chip face and fixed label weight in feed/popular.
- Detail follows author/title/body order; body 17/26, title 20/27, comments 16/25. Comment text uses the strong text color. Send controls provide a 44pt visual target.
- New/edit forms share communityEditorStyles: 56pt header/category, centered title, 44pt header action, 20pt title field, 17/26 body field and one keyboard toolbar.
- No full-width bottom submit bar in new-post writing. Publication remains gated by the existing content responsibility check in the document.

Product adaptations: Sinsin retains health discussion categories, optional photo stories, ranking periods, reactions/bookmarks, content responsibility confirmation, existing five-image limit and its own bottom navigation. The search screen is scoped to community content. These are explicit product differences; the implementation is a structural adaptation, not a pixel-identical reproduction of Karrot.

## Observed runtime evidence

Existing iPhone 17 Pro simulator / iOS 26.5, September 5 session:

- Feed: three complete discussions visible in the initial viewport; fixed equal browsing tabs; neutral category state; one plus/write action. No separate AI pill above the tab bar.
- Search: entering `칼륨` and submitting displays actual matching posts in shared rows. Back returns to the previous feed scroll position.
- Popular: realtime empty state offers a wider period; selecting month displays ranked posts. Shared row geometry matches the feed.
- Activity: bookmark entry opens the bookmarked segment. Switching to authored content displays the four existing posts. No likes or bookmarks were changed during testing.
- Article: author/title/body ordering, section boundary, empty comments and related content inspected. Opening a post and returning preserves feed position.
- Comment draft: entered disposable two-character text; back shows one confirmation. `계속 작성하기` preserves it; `지우고 이동` closes the confirmation and returns to the feed. Both labels fit visibly. No public comment was posted.
- Existing threaded comments: parent and reply remain grouped; registered/latest/popular controls and reply context are reachable. A runtime check exposed mention-only submission and old names on withdrawn-author replies; both were fixed with pure-function regression tests. Fresh reply to the withdrawn author has an empty input, safe target label and disabled send action.
- New-post editor: category, responsibility, title/body, top submit, and keyboard toolbar inspected. Disposable title input survives `계속 쓰기` in the discard confirmation. No test post was published.

The CUA capture connection intermittently returned noWindowsAvailable / ScreenCaptureKit errors. Reconnecting and using fresh accessibility indices allowed the journeys above to continue. These tool failures were not treated as application failures.

- Final edit check: the existing own post opens in the shared editor. A category-row overlap caused by flex styling on SurfacePressable's inner view was reproduced and fixed with an outer Pressable layout; the category now occupies its own full-height row above the title.
- Final write check: the floating action now appears in the accessibility tree with a full button target; activating it opens the editor. Title/body test characters plus the responsibility check enable registration. The disposable draft was discarded using the confirmation; the app returned to the feed without publishing.

## Automated results

- 35 relevant Jest suites / 771 tests passed (exit 0), recorded in `/tmp/community-tests-complete.log`.
- TypeScript gate rerun with `/bin/sh` in the repository root: exit 0 and `COMMUNITY_TYPES_OK` matched. The nested ledger declares `CWD: ../../..` so compilation runs in the repository root.
- ESLint: 34 owned changed/new TS/TSX files, exit 0, no warnings. `git diff --check` passed.
- Korean copy audit: exit 0. Its existing repository-wide findings were not represented as fixed by this community change.
