# Gates: Community reading and conversation redesign

OWNS: src/features/recipe/**, app/community/**, app/post/**, app/free/**, app/(write)/free/**, app/community-library.tsx, app/(tabs)/community.tsx, app/(tabs)/_layout.tsx, src/i18n/locales/**, src/shared/images/remoteImageSource.ts, tests/community*.test.ts, docs/design/community-refresh-2026-09-05/**

Scope: Redesign the complete community journey with a readable discussion feed, obvious discovery, focused writing, comfortable post/comment reading, consistent visual language, and preserved real service behavior.

- [x] G1: Feed opens on readable discussion rows without a large empty story panel or competing floating actions; topic and sort controls remain available.
  EVIDENCE: iPhone 17 Pro simulator: three complete feed rows in initial viewport; equal-width fixed tabs and neutral categories; single orange write action. Final accessibility tree exposes the full-sized write button and activating it opens the composer. See REFERENCE.md.
- [x] G2: Search, topics, popular posts, saved posts and own activity connect correctly; filters and return navigation retain user context.
  EVIDENCE: Simulator: keyword search for 칼륨 returns actual posts; back retains feed scroll position; realtime popular empty state offers wider periods and month displays ranked posts; bookmark entry selects the bookmarked segment; own activity lists existing authored posts. Category/filter/reset wiring is covered by passing community tests.
- [x] G3: Feed, search, popular and activity lists share readable typography, metadata hierarchy, thumbnail behavior and interaction geometry.
  EVIDENCE: PostListItem is shared by feed, search, popular, activity and author listings; actual feed/search/monthly popular/authored/bookmarked rows were inspected. Shared neutral CategoryChipRail and flat CommunityFeedSkeleton preserve the same visual family.
- [x] G4: Post detail and comments use a coherent reading hierarchy; replies, keyboard composer, empty/error states, more actions and related posts remain usable.
  EVIDENCE: Simulator: author/title/body, populated parent/reply thread, empty comments, reply context and keyboard dock inspected; draft keep/discard navigation verified. Mention-only submission is disabled; withdrawn-author reply targets omit old names. Tests cover ordering, draft navigation, mentions, tombstone races and comment mutations.
- [x] G5: Writing and editing are focused and usable with keyboard, category, photos, draft protection and valid submission; no public test content is posted without authorization.
  EVIDENCE: Simulator: new and existing-post edit forms inspected. Edit category/title overlap corrected and rechecked. New title/body plus responsibility enables the header action; no publication was performed. Continue-writing keeps input; discard returns to the feed. New/edit share field geometry and local keyboard toolbar. Edit ownership/draft/upload rules retain passing tests.
- [x] G6: Loading, pagination, refresh, failure, blocking and optimistic write behavior retain truthful state and passing relevant behavioral tests.
  EVIDENCE: 35 Jest suites, 771 tests passed; exit 0. Command: npx jest --runInBand tests/community*.test.ts tests/postDetailTombstoneRace.test.ts tests/commentMentions.test.ts tests/postRanking.test.ts. Output: /tmp/community-tests-complete.log. Includes pagination/backfill, cache/optimistic state, failures, blocking, draft and comment behavior.
- [x] G7: Application TypeScript compilation succeeds.
  CHECK: node node_modules/typescript/bin/tsc --noEmit --pretty false && node -e "console.log('COMMUNITY_TYPES_OK')"
  EXPECT: COMMUNITY_TYPES_OK
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=326d29e73965/24 entries; output=COMMUNITY_TYPES_OK
- [x] G8: Changed code passes lint and diff checks; Korean copy and screen geometry are reviewed.
  EVIDENCE: 34 changed/new owned TypeScript files linted: exit 0 with no errors or warnings (/tmp/community-lint-complete.log). git diff --check passed. npm run audit:ux-copy exit 0; repository-wide pre-existing copy findings remain outside this change. New Korean copy and actual button labels reviewed.
- [x] G9: Simulator evidence covers feed, discovery, detail/comments, writing and return navigation; no clipping, late layout shifts or duplicate overlays in tested flows.
  EVIDENCE: Simulator journeys recorded in REFERENCE.md: feed/search/popular/activity/detail/threaded replies/new/edit, keyboard and back navigation. Continue/discard labels fit. Disposable draft was discarded and final screen returned to the community feed. No duplicate dialog remained in tested transitions. No test post/comment/like/bookmark was published or changed.

- [x] G10: A community reference obtained from Mobbin is documented with real screen links; feed, search, post, comments and writing are compared against that reference and faithfully implemented.
  EVIDENCE: Actual Mobbin images inspected; canonical feed, popular, integrated search, post/empty-comments and composer links documented in REFERENCE.md. The same reference family governs layout and hierarchy. Product-specific differences (Sinsin categories, ranking periods, required responsibility check, scoped search) are explicit in the reference record; pixel-identical reproduction is not claimed.
