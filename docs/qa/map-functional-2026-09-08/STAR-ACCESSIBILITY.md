# Star score accessibility — 2026-09-08

Observed native inconsistency: RatingBreakdown showed 461 ratings but its StarScore announced review count 0. The caller intentionally omitted a review count because the count is rendered separately. StarScore substituted zero when building its accessibility label.

Changed StarScore to announce only its rating when count is absent; explicitly supplied counts, including zero, remain in the label. Korean and English score-only labels added. Current source inventory finds RatingBreakdown as the only StarScore JSX consumer.

Verified:
- Five component regression cases: absent/null count, explicit zero, explicit nonzero, absent rating.
- TypeScript, scoped ESLint and diff whitespace checks passed; copy audit exited zero with pre-existing unrelated findings.
- iPhone 17 Pro / iOS 26.5 AX after navigating from map to detail: header still announces 4.8 / 461 reviews; breakdown now announces 4.8 only, alongside the separate 461-rating text. The false 0-review announcement is gone.
- This verifies the exposed accessibility labels, not a VoiceOver audio session or Android TalkBack.
