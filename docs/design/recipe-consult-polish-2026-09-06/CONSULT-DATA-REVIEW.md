# Consultation: consistent recipe and nutrition results

2026-09-06. Local TEST backend on 8100, Metro on 8085, iPhone 17 Pro / iOS 26.5 Simulator.

## Audit and decisions

The four current read tools were reviewed against their actual data paths, not their display names.

| Read / opportunity | Finding | Implementation decision |
| --- | --- | --- |
| Recipe search and detail | Source components previously contained only ID/title links. Ingredients and cooking steps were free-form model text. | Successful catalog detail reads now produce bounded recipe snapshots with title, time, servings, exact ingredient amounts and steps. Independent disclosures keep long recipes compact. The full internal detail remains reachable. |
| My health targets | The tool returned a large private/context string. Rendering that string or asking the model to format it would be inconsistent. | A public, numeric allowlist reconstructs five saved nutrient targets. Protein is calculated by the existing server rule and shows its recorded weight basis. Private profile context never enters UI receipts. |
| Today's nutrient budget | The tool already calculates recorded totals and target differences, but the answer repeated them in prose. | A dated comparison card shows recorded amount / saved daily target, with restrained bars only where both values exist. Unknown and recorded zero stay distinct. Exceeding a target remains a numeric comparison, not a diagnosis. |
| Tool discovery | Generic FAQs did not reveal these app-connected capabilities. | Three compact draft shortcuts: today's intake, personal targets, recipes. Each fills the editable composer; the user still sends the question. |
| Copying an answer | The existing copy action only included model prose, omitting facts after they moved into cards. | Copy now includes verified recipe ingredients and steps, nutrient rows and units, original lookup date/time, and calculation basis even while disclosures are collapsed. Legacy prose remains unchanged. |
| Streaming messages | All OpenAI output-text deltas were concatenated, including explicit intermediate commentary and the revised final answer. | Track commentary item IDs per upstream response and exclude their deltas from final-answer prose. Keep complete provider items, including phases and reasoning, only in server-side tool context. Existing approved tool status/shimmer remains the public progress UI. |
| Medication / symptoms / automatic changes | These need contextual explanation; a success-colored verdict or unrequested record mutation could misrepresent what the assistant established. | Keep contextual prose and the existing urgent-input path. No fabricated clearance cards, model-defined URLs, automatic writes or promises of reminders. |
| More read endpoints | Targets, intake and recipe details are already available through authenticated reads. A second endpoint for the same facts would add divergent rules. | Upgrade the existing four tools' typed output instead of duplicating reads. No new tool round/read budget was added. |

## Reference observations

- [MyFitnessPal nutrient totals](https://mobbin.com/screens/d4ad9c99-ab88-4e9b-9f50-acc536cb131d): inspected its Total / Goal / Left columns and thin row bars. Adopted aligned amounts and clear row hierarchy; kept the app's compact typography and neutral palette. Avoided a completion/safety color.
- [MyFitnessPal macros](https://mobbin.com/screens/6abce9e6-8ed7-4eb8-981f-c680266c03a5): inspected the macro pie and highest-food-contributor lists. A macro pie does not communicate kidney-related per-nutrient targets, so it was not copied into this UI.
- [ChatGPT recipe response](https://mobbin.com/screens/e1895630-214a-4947-ae45-b117ec8288e4) and [recipe identification](https://mobbin.com/screens/b3a7ec50-a42f-45f4-b63b-a12ca4512824): inspected short introductions and separated recipe sections. These are prose/image references, not evidence that ChatGPT uses our native accordion design.
- [Official OpenAI output-message schema](https://developers.openai.com/api/reference/typescript/resources/responses): the inspected `ResponseOutputMessage` schema distinguishes `commentary` and `final_answer`, and requires preserving phase in follow-up context. Parser tests cover both plain and tool-planning streams.

## Data and compatibility contract

New clients opt in using `X-Consult-Recipe-Cards: 1` and `X-Consult-Data-Cards: 1`. Flags reach tool construction and the presentation instruction together. Legacy clients keep their original prose behavior. Invalid or absent recipe snapshots retain a valid internal source link; old answers are not retroactively rewritten.

Cards are assembled from actual successful tool results, never model JSON or extracted Markdown. Nutrition includes empty results with explicit unknown values; failed/running calls cannot emit them. Recipe snapshots reject malformed or oversized amounts/steps instead of truncating them. Both sides reconstruct the public fields again when reading stream events and history.

The intake query uses the same captured calendar date shown in the receipt. A saved message retains its original lookup date/time and facts; reopening does not silently substitute today's values. When the same answer reads identical targets and intake, only the richer intake card is displayed. Changed targets or different dates remain separate.

## Verification

Final automated and native evidence is recorded in `GATES-consult-recipe-cards.md` and `GATES-consult-data-cards.md`. Screenshots in this folder show actual local model responses. Unit/component fixtures exercise recorded zero, excess, unknown targets, invalid metadata and phase events; those fixture results are not presented as real account data.

Native checks use the existing light appearance and default text size. OS large-text, dark-mode and reduced-motion settings were not changed in this task. The existing motion lifecycle tests remain part of regression coverage.

### Observed native interactions

- Repeated the exact short request `오늘저녁레시피`. Stopped a real in-flight response; its completed recipe read remained available with the stopped status. Retried successfully; the final answer displayed two actual catalog snapshots that the model had compared. Ingredients and steps did not expand into the prose. Explanatory wording is model-generated: the retry contained two paragraphs, so a strict two-sentence limit is not guaranteed.
- Expanded recipe ingredients and steps independently and followed the internal detail link, then returned with disclosure state preserved. See `consult-recipe-card-expanded.png` and `consult-recipe-card-final.png`.
- Selected each new shortcut before sending: it populated the editable composer without starting a request. Queried real saved targets and expanded the protein weight basis. See `consult-nutrition-targets-basis.png`.
- Queried the real account's current empty intake and reopened it through history. The card still showed its original lookup time and unknown intake, alongside saved targets. The empty-state explanation appears once. See `consult-nutrition-empty.png`.
- Pressed native Copy on collapsed recipe and intake cards, then inspected only the newly copied test payload with Simulator `pbpaste`: all recipe quantities/steps and all five nutrient rows plus original query time and protein/water basis were present. See `consult-recipe-retry-copy.png` for the collapsed retry result.
- Recorded-zero, over-target, missing-target and invalid-payload cases were verified with fixtures. The native account had no current intake records; populated-intake behavior is therefore not reported as device-verified. No health records were fabricated for screenshots.
- After visiting the intake conversation, reopened the stopped/retried recipe conversation through history: both recipe snapshots and the final answer restored correctly.

### Checks and remaining limits

The final RN typecheck and touched-file ESLint exited 0. Backend typecheck exited 0. Contract, history, streaming, follow-scroll, stop/retry, progress and motion suites passed, including real Korean/English resource resolution and copy payloads. The UX copy audit exited 0 with 12 existing candidates elsewhere (9 S1 / 3 S2); there were no new consultation-copy candidates. The gate files retain exact suite commands and results.

No statistical latency claim is made. Phase regression fixtures prove explicit commentary is filtered and final messages are retained; no raw upstream trace was captured for the initial duplicate-prose observation. Existing answers without snapshots remain readable prose/source links. This change covers the dedicated consultation page; it does not introduce diagnosis cards, automatic record writes or a new medical decision tool.
