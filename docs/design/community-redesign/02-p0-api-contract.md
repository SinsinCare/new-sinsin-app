# P0 API Contract (server = sinsin-be-bun, canonical)

All routes behind auth, standard success envelope. Base: /api/v1

## 1. Feed: GET /community/posts  (extend existing)
Query params (all optional):
- `tag` — existing behavior unchanged
- `category` — exact match on community_post.category; omit or `all` = no filter
- `sort` — `recent` (default) | `views` | `popular`
  - recent: created_at desc, id desc (existing)
  - views: views desc, created_at desc, id desc
  - popular: score = likes*3 + comments*4 + views*1 desc, then created_at desc, id desc (same weights as /posts/popular, no time window)
- `limit` (default/max 200 stays), `cursor`
Cursor: opaque base64(JSON) that encodes the sort mode + last keyset tuple. Server MUST reject (BAD_REQUEST) a cursor whose embedded sort/filters mismatch the query. Next cursor returned via `x-next-cursor` response header (existing pattern).
`category`+`tag`+`sort` combine.

## 2. Search: GET /community/posts/search
- **Normalization (applies before everything else):** every run of Unicode whitespace in `q` (space, tab, newline, CR, U+3000 full-width space, …) collapses to a single ASCII space, then the value is trimmed. The normalized value is the ONLY `q` the rest of the route sees: length validation, ILIKE matching, the normalized-tag comparison, the cursor binding, and the `community_search_log` row all use it. Consequence: `"ab  c"` and `"ab c"` are the SAME query — same result set, and their cursors are interchangeable.
- **Rejection is NUL-only:** `q` (and `category`, §1) containing U+0000 → BAD_REQUEST with `fieldErrors` (`query.q` / `query.category`, `string_pattern_mismatch`). U+0000 is the one byte Postgres refuses (`22021`); other control characters are harmless to ILIKE and MUST NOT be rejected (tabs/newlines are collapsed, not rejected — a user pasting multi-line text must get 200). `category` is an exact-match axis: reject NUL, but do NOT whitespace-normalize it.
- `q` (required, 1..100 **code points measured on the normalized value**; BAD_REQUEST otherwise — a whitespace-only `q` normalizes to empty and is `string_too_short`)
- `limit` (default 20, max 50), `cursor` — opaque base64url(JSON) BOUND to the query (embeds lower(trim()) of the **normalized** `q`); replaying a cursor with a different `q` → BAD_REQUEST, but a re-submit differing only in case or incidental whitespace continues the same walk. Recent order only.
- Matching: case-insensitive substring on title OR content, OR normalized-tag match (use existing normalizeTags for the tag comparison). Excludes soft-deleted. Blocked authors filtered (same as §4).
- Order: created_at desc, id desc. `x-next-cursor` header.
- Response items: the same PostPayload as the feed.
- Side effect: on first page only (no cursor), fire-and-forget insert into community_search_log (errors must not fail the search).

## 3. Popular keywords: GET /community/search/popular-keywords
- `limit` default 10, max 20
- Source: community_search_log, last 7 days, keyword = lower(trim(query)), min length 2, group by keyword, order by count desc then keyword asc.
- Response: `{ keywords: [{ keyword: string, count: number, rank: number }] }` (rank 1-based)

## 4. Block consistency (server fix)
Apply blocked-author filtering (getBlockedAuthorNames, same as comments/stories) to:
- GET /community/posts (list)
- GET /community/posts/popular
- GET /community/posts/search
Post DETAIL (GET /posts/:id) stays accessible (explicit navigation/deep link) — document this in a code comment at the detail service fn.

## 5. Unblock: DELETE /user/block
- Body: `{ blockedNickName: string }` (mirror of POST /user/block)
- Idempotent: deleting a non-blocked nickname still succeeds (200, no-op).
- Response: same shape as POST /user/block success (blocked list or simple success — match existing envelope conventions in user routes).

## 6. New table (alembic migration 087 in sinsin-be-legacy-py/alembic/versions/)
`community_search_log`:
- id bigserial PK
- user_id integer NOT NULL (FK users.id ON DELETE CASCADE — same as community_post_view in 086; users.id is integer)
- query varchar(100) NOT NULL
- created_at timestamptz NOT NULL DEFAULT now()  ← check 086's timestamp convention and match it (naive vs tz)
- index: (created_at desc), and (user_id, created_at desc)
Optionally in the same migration: pg_trgm extension + GIN trgm index on community_post.title if cheap; if uncertain about Cloud SQL, plain ILIKE without index is acceptable at current scale (~hundreds of posts) — prefer shipping without the extension over blocking.
Prisma: update prisma/schema.prisma manually (introspection style used by the repo) + prisma/indexes.sql. NEVER run prisma migrate. bun repo must not create migrations.

## RN client mapping
- communityPostService.getPosts({ tag?, category?, sort?, cursor?, limit? }) → returns { posts, nextCursor } reading `x-next-cursor` from axios response headers.
- searchPosts({ q, cursor?, limit? }) → { posts, nextCursor }
- getPopularSearchKeywords() → [{ keyword, count, rank }]
- unblockUser(nickName) → DELETE /user/block
- Feed sort UI: 최신순(recent)/조회순(views)/인기순(popular) — server-driven; remove client hot-score for feed sorting (postRanking.ts stays for related-posts ranking).
- Category chips → server `category` param (전체 = omit).
- Feed becomes cursor-paginated infinite list (limit 20/page); all consumers of the old full array (community-library, author "다른 글", related posts) must keep compiling & working against loaded pages (flattened selector).
- PostListItem: show 조회 count (views) alongside likes/comments.

## 7. Ranked pagination semantics (sort=views | popular)
The ranked keyset paginates over a **live computed score**, not a snapshot. If a post's score changes between page fetches:
- score **rises** past the cursor boundary → the post is **skipped** on later pages (it moved into already-walked territory);
- score **falls** below the boundary → the post can appear **again** (duplicate) on a later page.

This is intentional best-effort ordering (same trade-off as HN/Reddit hot feeds); stateless snapshotting is out of scope. Consequences:
- Order across pages is best-effort under concurrent mutation; the walk always terminates (keyset advances monotonically per request).
- **Clients MUST de-duplicate by post id when appending pages.** The RN client does this.
- Within a single page, order and uniqueness are exact.
