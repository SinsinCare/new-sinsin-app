# Community interaction audit — 2026-09-08

Environment: existing local app, iPhone 17 Pro / iOS 26.5 Simulator.

Verified this pass:

- Community feed opens a selected post with its matching author/title.
- Selecting latest comment order updates the checked radio state.
- Related-post action opens the matching different post and author.
- Back returns to the original post with latest comment order retained.
- Author action opens the correct profile.
- Following count opens a following list; zero shows the empty state.
- Back returns through profile to post. No follow, block, like, bookmark,
  publication, deletion, or comment submission was performed.

No functional code change was needed for those exercised paths.

Unverified:

- Comment draft typing, discard, keyboard dismissal, and multiline layout.
  Clicking the composer produced a visible caret in the screenshot, but its
  native accessibility surface exposed a non-settable group. setValue failed
  with 'element is not settable'. This is an automation limitation, not proof
  that manual typing is broken. No draft was entered.
- Nonempty comment sorting, replies, pagination, error/retry, screen-reader
  speech, large text, dark mode, and Android remain for later passes.

Overall all-pages verification remains incomplete. Map audit evidence is in
map-functional-2026-09-08; this note does not close its remaining boundaries.

## Personal library query correction

Found source-level omission: the library filtered only loaded general-feed pages,
so older own/liked/bookmarked posts could be absent. Replaced that dependency
with authenticated `library=mine|liked|bookmarked` server filtering before keyset
pagination. Cursors bind the library kind and current authenticated user.
Incompatible feed filters and invalid library scopes return 400.

The app uses distinct scoped query keys, avoids showing another tab's previous
data during loading, loads following pages, and exposes tail retry/load-more.
Existing optimistic cache updates and local visibility filters remain in use.

Verification:

- Isolated 127.0.0.1/sinsin_test integration: 23 posts, older likes/bookmarks,
  two users, pagination through completion, scope/user cursor rejection. Both
  tests passed; created fixtures were cleaned up by existing guarded helpers.
- Existing backend pagination suite: 14 passed.
- App feed cache/request suites: 38 passed.
- Both repositories' type checks passed; scoped app lint and diff checks passed.
- Native app: scoped bookmark list loaded; opened its post, returned to the
  retained bookmark tab/list, and switched to liked posts. Existing saved flags
  were not changed. Live API was already running with Bun watch; no restart or
  data reset was necessary.
- Initial test runs failed due to missing local test JWT and sandbox DB access.
  Retried with a test-only JWT and authorized local DB access. No guard disabled.

Long personal lists and tail failures are covered by query/integration logic,
not proven with a large native account in this pass. The API change is local;
deployment of both server and app remains outside this verification.

## Author profile post omission

Native reproduction: opened an older liked post, then its author's profile.
The profile showed no posts even though the just-opened post belonged to it.
Source used the same loaded general-feed subset (`observe: cold-only`).

Added authenticated feed authorId filtering before pagination, author-bound
cursors, positive-safe-integer validation, and rejection of incompatible filters.
The author page now has an independently keyed query, initial loading/error/empty
states, pagination and tail retry. Query starts only after a valid profile loads.

Native result: the same profile now shows four authored posts. Opened another
recovered post, confirmed its title, and returned to the profile. No social flags
or authored content were changed.

Verification: isolated backend tests (library + author + existing pagination),
17 passed / 130 expectations; frontend cache/request tests, 38 passed. Both
type checks, scoped app lint, UX-copy audit and whitespace checks passed. Initial
unknown analytics surface was corrected to the existing community_author surface.
Twenty-three-post coverage and cursor isolation are DB-test evidence; the native
account had four posts. Native tail failure, large text, dark mode and Android
remain unverified. No production deployment.

## Follow-list navigation audit

Native existing-data checks: own profile following count 2 matched two rows.
Opened the first followed author's profile; its name, selected following state,
and authored post matched. Follower count 1 opened a one-row follower list.
Back returned to the author, then to the original two-row following list with
both entries retained. No follow/unfollow/block action was performed.
No defect reproduced and no code changes were needed for this path. Larger
follow-list pagination, failures, and mutations remain outside this pass.
