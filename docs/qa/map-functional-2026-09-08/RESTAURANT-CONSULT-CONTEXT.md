# Restaurant consultation context — 2026-09-08

## Reproduced and corrected

On iPhone 17 Pro / iOS 26.5 Simulator, restaurant detail's generic Question
button opened consultation with the restaurant attachment and no auto-send.
Its first suggested question, asking which menu has the most sodium, did
auto-send but the actual reply said menu nutrition information was unavailable.

Cause: pickConsultMenuFacts returned no facts for empty menuNames. Both general
recommendation questions and free-form restaurant entry supply an empty list.
Only explicit comparison questions supplied named menus. A separate two-menu
cap also prevented menu-wide comparisons.

Changes:

- Empty names now selects available menu facts; explicit names preserve their subset/order.
- At most 20 menu facts and the existing 4,800-character message bound are retained.
- Context says to compare only supplied menus and identifies numbers as estimates,
  not a complete menu or official nutrition information.
- Existing question-only bubble/history parsing remains compatible in Korean and English.

## Evidence

- Repeated the same native suggested question after the patch. The actual reply
  compared all five supplied fixture menu values and acknowledged estimates.
- Opened consultation history and reopened the latest conversation; the same
  question and answer remained present. Returned from consultation afterward.
- Two test conversations were created through the normal app UI; no restaurant,
  review, or health record was changed. Existing conversations were preserved.
- 45 tests passed across restaurantConsultMessage and restaurantConsultQuestions.
- TypeScript, scoped ESLint, and git diff --check passed.
- UX copy audit exited 0; unrelated existing findings remain.

This verifies the local app's real reply flow, not the accuracy of seeded menu
data or production deployment. Native long-menu truncation, streaming shimmer,
cancellation mid-answer, and Android were not exercised in this pass.

## First-question title persistence — 2026-09-08

Backend inspection confirmed that default conversation titles were replaced only after a successful assistant save. A failed generation therefore left a saved question under `새 대화`/`New chat`.

`chat/repository.appendMessage` now sets a default title in the same SQL statement that inserts the user question. Assistant inserts and existing custom titles are preserved. Delayed postprocessing now updates titles only when the current database title is still a default, preventing a stale prepared-turn snapshot from overwriting a manual rename. The 50-code-point formatting rule is shared with the existing fallback path.

Evidence: isolated localhost `sinsin_bench` sync/SSE suites, 39 passed. The controlled provider-failure case asserts that the question title survives with no assistant row; the rename case covers both delayed automatic title update and a later user question. Backend typecheck and whitespace checks passed. Native Simulator: restaurant suggested question → completed answer → history showed the actual question title → reopened with question and answer intact. The failure condition was exercised with the isolated provider stub, not by disrupting the running native app. Existing historical default titles were not bulk rewritten; one normal UI test conversation was created, with no health-record changes.
