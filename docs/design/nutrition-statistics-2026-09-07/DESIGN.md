# Nutrition statistics: insight first

## Observed references (Mobbin)

- MacroFactor nutrient detail: https://mobbin.com/screens/c41df34d-1598-4a62-ad7c-728fcb8255ae — period controls, compact nutrient context and food contributors.
- Oura activity trend: https://mobbin.com/screens/cc9ab49f-6e69-423c-bda9-07a86ae647fd — explanatory insight next to its evidence chart.
- Oura health trend: https://mobbin.com/screens/4298c370-a972-4d1e-bab7-622b8b2b2d2b — single comparison metric and contextual prose.
- Cal AI breakdown: https://mobbin.com/screens/a4ec6f0f-5e5f-4290-a8a3-f8b76f3bf29d — compact nutrient rows and restrained status accents.

## Hierarchy

1. Stable period controls and date navigation; calendar scrolls with content.
2. One conclusion, its evidence and one next action. Coverage is a small factual line, never a health score. Empty nutrition records receive one useful action, not repeated warnings.
3. Nutrient rows show intake, personal reference, and status. Every interpretation remains visible; no insight is hidden behind disclosure. No parsing localized strings into invented progress ratios.
4. Weekly bars keep their actual relative ratios, a visible reference line, and distinct missing records. Accessible day selection opens that day's report. Monthly comparison labels counts rather than pretending aggregate counts are dated heatmap cells.
5. Food records and health measurements retain backend interpretations and safety notes.

## Visual and interaction rules

Shared surface tokens and Pretendard. A shallow neutral page background separates independently bordered insight/action cards and grouped evidence panels. Section headings sit outside panels; row dividers separate measurements inside them. 20-point side inset; 24-point section rhythm; 12-point within sections. Titles 17–20, body 13–15; no typography enlargement. Neutral status labels with small colored dots for attention. No orange card backgrounds or health-score rings. Period controls have at least 44-point touch areas, natural text wrapping and system reduced-motion behavior.

## Boundaries

No changes to report calculations, medical rules or external data. Null sections remain absent. No fabricated food percentages, trend history, generated advice or scores. Local QA fixtures are explicitly marked examples and must never enter query caches or saved records.

## AI interpretation and follow-up

Oura's health insight and Advisor entry (https://mobbin.com/screens/73de6cab-a5bf-4357-924b-86cb7a6f7db8) informed the connection from an explained finding to a follow-up conversation. The report now identifies actual AI prose using conclusion.source, shows its rationale under a visible label, and offers consultation with the selected report attached. FALLBACK remains a record summary, never an AI attribution. The existing mascot is static on completed reports. No fake thinking animation or generated tool history is added.

The consultation entry carries the displayed period, references, interpretations and safety notes. The explicit report consultation CTA opens a fresh conversation and sends a localized initial question asking what to prioritize and how to act at the next meal. A versioned message envelope renders as a compact report attachment in both the live conversation and saved history. Record identifiers are excluded from food context. The user can stop generation or continue with their own question.

## Additional references reviewed

- WHOOP recovery: https://mobbin.com/screens/2e135095-0dd0-4b9b-9be8-929e204cbb81 — labeled daily trend points and selected-day context.
- WHOOP calories: https://mobbin.com/screens/416449b6-fa43-4c2a-a032-1ef2530576ea — comparable columns with explicit daily values.
- Lifesum detailed nutrition: https://mobbin.com/screens/86e3fefc-23e0-4072-94ef-9ab90af96c82 — preserve interpretation alongside intake and reference.
- Lifesum overview: https://mobbin.com/screens/7c2916d3-8c9d-4292-83d9-90769e407253 — compact rows separate summary and detail.

## Hierarchy correction after user review

The first flat treatment removed too many boundaries and was rejected. Final layout uses a shallow neutral page bed, independently bordered insight and action cards, section titles outside grouped evidence panels, and internal row separators. Nutrient labels and amounts align on opposite sides, with the complete interpretation below. All server report sections and text remain available. Small chart bars continue to represent actual ratios rather than being enlarged for decoration.
