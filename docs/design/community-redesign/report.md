# `report` — 자유글 신고하기 (신고 사유 선택 → 기타 사유 시트 → 제출)

Section band label (black bar at canvas y 12254, 2008×131):
**`자유글- 인기글, 식단, 최신 게시글 / 더보기(신고하기)`**

Region: canvas x 100–2260, y 12430–13460. **5 phone frames**, all `375 × 932`, all at **y = 12485**,
x = **141 / 548 / 955 / 1362 / 1769** (pitch 407). Nothing else lives in this band (checked x → 4400).
This is the *only* place the report flow appears on the canvas — the `더보기` action sheet that
launches it is not drawn here.

All numbers below are **@1x px, measured from the SVG source** (rect/path coordinates), not eyeballed.
Frame-relative = absolute − frame origin (x −141/−548/…, y −12485).

### How the numbers were obtained (so they can be re-checked)

* Geometry: rect/circle/path bounding boxes parsed straight out of `slim.svg` (`gx.py`), transforms applied.
* Font **size**: text is outlined, so size = `inkWidth / (advance_em − sideBearings)` using the real
  `Pretendard-*.otf` `hmtx` advances from `assets/fonts/`. Every solve landed within ±0.15 px of an
  integer → sizes are exact (15 / 17 / 20 / 22).
* Font **weight**: measured from the outlines themselves — hangul vertical stems export as literal
  rectangles (`M177.951 12616.4V12630.7H175.201V12616.4H177.951Z` → stem 2.75 px). Stem ÷ fontSize gives a
  clean 4-rung ladder across this section: **0.0753 = Regular, 0.0927 = Medium, 0.109 = SemiBold, 0.126 = Bold**
  (+0.017 per rung). This is stronger evidence than the visual read used in the sibling specs.
* Text **origin x** was recovered by subtracting the real glyph `lsb` from the ink left edge; every line
  then lands on an exact integer (20 / 72 / sheet+24), which cross-validates the whole model.

---

## 1. Screen inventory

Every frame is the **same screen** — `신고하기` (report reasons) — in a different state.
There is exactly one screen and one sheet in this section.

| # | Frame origin (x, y) | Screen | State | Difference vs neighbour |
|---|---|---|---|---|
| F1 | 141, 12485 | 신고하기 | **Default / empty.** 8 rows, none checked, CTA disabled | — (but see the copy anomaly below) |
| F2 | 548, 12485 | 신고하기 + `기타 사유` sheet | **Sheet open, keyboard up, input empty** (placeholder). Backdrop dimmed. Underlying list still all-unchecked, CTA still disabled | = F1 + dim + floating sheet + keyboard raster (375×292) |
| F3 | 955, 12485 | 신고하기 + `기타 사유` sheet | **Sheet open, keyboard up, value typed** `신고합니다`, clear (×) button visible | = F2 with the input filled; field width 307 (F2 draws 287 — see §2.6 anomaly) and a trailing clear button |
| F4 | 1362, 12485 | 신고하기 | **1 selected** — only `기타 사유 (직접입력)` checked (brand circle). CTA **enabled** (brand) | = F1 with row 8 checked + CTA enabled |
| F5 | 1769, 12485 | 신고하기 | **Multi-select** — rows 4 (`광고·홍보 목적의 게시글`), 6 (`저작권 침해 또는 무단 도용`), 8 (`기타 사유`) checked. CTA enabled | = F4 with two extra rows checked → proves multi-select and proves the row surface does **not** change on selection |

**Copy anomaly (must be resolved before implementing):** F1's row 3 reads
`욕설·비방·혐오 표현` (ink width 113.6 px), while **F2, F3, F4 and F5 all read
`욕설·비방 등 불쾌감을 주는 표현`** (ink width 185.4 px). F1 is the stale artboard.
Use the 4-frame wording. (Today's code has a third variant — see §7.)

Not drawn anywhere in this section: loading, error, empty, success/toast, the `더보기` action sheet,
the "already reported" state, and the disabled state of the sheet's `확인` button.

---

## 2. Layout spec

### 2.0 Frame chrome and safe areas (identical in all 5 frames)

| Item | Frame-rel | Notes |
|---|---|---|
| Status bar | y **0 – 50** | The designer's own system: the compose-section frames draw an explicit `375×50` status-bar rect and a `375×44` app-bar rect at the same glyph offsets. These frames omit the rects but the glyphs sit at identical offsets → **status bar 50, app bar 44**. |
| Dynamic Island | x 96–279, y −2 – 28 (183×30) | decoration only |
| Time `9:41` | ink x 33.5–61.9, y 17.2–28.3 | status-bar glyphs, `#000` |
| Cellular / Wi-Fi / battery | ink x 293.7–310.7 / 315.7–331.0 / 336.5–357.5, y ≈17–28 | battery outline is `stroke=black, opacity .35` |
| App bar | y **50 – 94** (h 44) | no background rect, no bottom hairline, no shadow — it sits on the white page |
| Home indicator | **absent** | frame ends flush at 932; the CTA bar reserves 20 px below the button instead |

Screen background: **`#FFFFFF`** everywhere (no `background.lower`).
Horizontal gutter: **20** (content x 20 → 355, width 335). One left edge for everything except the
in-row text (72) — exactly two start lines, per the DS layout rule.

### 2.1 App bar

| Element | Geometry | Fill | Copy |
|---|---|---|---|
| Close (✕) | glyph ink **15.2 × 15.2** at x 18.4–33.6, y 64.4–79.6. Glyph centre **(26, 72)**. Stroke ≈2.1 px, round caps, 45°. | `#2E2F33` @ **0.70** | — |
| Title | ink x 161.0–210.9, y 65.6–78.8; text origin x 161.55, ink centre 186.0 (frame centre 187.5 → **centred**, 1 px optical) | `#000000` | **`신고하기`** |

The ✕ centre at x = 26 is *exactly* `V2ScreenHeader`'s geometry (`paddingHorizontal: spacing[4]` + a
44 pt touch target → 4 + 22 = 26) and the vertical centre 72 is exactly `50 + 44/2`. The bar is a
44 pt bar with a 44 pt hit target — implement it as such, not as a hand-rolled 54 pt row.

### 2.2 Headline block

| Element | Geometry (frame-rel) | Type | Fill | Copy |
|---|---|---|---|---|
| Headline | text-box top **126.4** (= app-bar bottom + **32.4**), x 20. Line 1 ink y 131.4–151.0 (w 75.0); line 2 ink y 161.4–181.0 (w 161.2). **Baseline-to-baseline = 30.0** | 22 / 30, **Bold** | `#2A2A37` | `신고하는`⏎`이유를 알려주세요!` (hard line break — line 1 is 75 px wide, so this is an authored break, not wrapping) |
| Subtitle | ink y 195.1–208.3, x 20, ink width **329.4** (ends at 349.4; fits the 335 column with 5.6 to spare — single line, do **not** let it wrap) | 15, **Medium** | `#37383C` @ **0.51** (composited ≈ `#9B9C9E`) | `타당한 근거 없는 신고 내용은 반영되지 않을 수 있습니다.` |

Vertical rhythm, measured on text boxes (not ink):
`app bar 94` → **+32** → headline box (2 × 30 = 60 tall) → **+6** → subtitle box (19–20 tall) → **+33** → first row at 245.
Implement as `paddingTop 32` / `gap 6` / `marginTop 32` (the 33 vs 32 is inside the line-box rounding error).

### 2.3 Reason list

Container: x 20, width 335. 8 rows, **pitch 56 → gap 8**. Row tops (frame-rel):
**245, 301, 357, 413, 469, 525, 581, 637**; list bottom **685**.

Row box (identical in every state, checked or not):

| Property | Value |
|---|---|
| Size | **335 × 48** |
| Corner radius | **8** |
| Fill | **`#F9FAFB`** — unchanged when selected |
| Border | **none** |
| Shadow | none |
| Padding | left **16**, icon→label gap **12** (label origin x = 20 + 16 + 24 + 12 = **72**), right padding unused |
| Icon | **24 × 24** box at row x 16 (frame-rel x 36), vertically centred (top = row top + 12) |
| Label | 15 **Medium**, `#2A2A37`, vertically centred (ink centre = row centre, verified on all 8 rows) |

Check icon, two states:

| State | Drawing | Colour |
|---|---|---|
| Unchecked | ring **Ø22** (outer r 11, inner r 9 → **2 px stroke**) + a checkmark glyph inside, both inside the 24 box (1 px inset), the **whole group at `opacity: 0.4`** | `#37383C` @ 0.28 × 0.40 = **≈0.112 effective** (over `#F9FAFB` ≈ `#E3E4E5`) |
| Checked | **filled Ø24 disc** + white checkmark (exported as an even-odd cut-out over a white disc) | **`#FE7139`**, mark `#FFFFFF` |

Row copy, in order (F2–F5 wording — authoritative):

1. `음식·식단과 관련 없는 게시글`  (ink w 169.6)
2. `허위 또는 잘못된 건강 정보`  (156.3)
3. `욕설·비방 등 불쾌감을 주는 표현`  (185.4) — F1 shows the stale `욕설·비방·혐오 표현` (113.6)
4. `광고·홍보 목적의 게시글`  (140.1)
5. `개인정보 노출`  (80.5)
6. `저작권 침해 또는 무단 도용`  (156.4)
7. `음란성·폭력성 등 부적절한 이미지`  (194.3)
8. `기타 사유 (직접입력)`  (119.9)

= **7 reasons + 1 free-text row**. No trailing chevron, no per-row helper text, and in F4/F5 the
`기타` row shows **no preview of the entered text**.

### 2.4 Scroll fade (scrim)

`375 × 36` at y **820 – 856**, full-bleed, `linearGradient` top→bottom
`white @0%` → `white @100%` (`paint19/20/21/23_linear`). It sits directly on top of the CTA bar,
i.e. it is the fade for content scrolling under the fixed footer.

### 2.5 Bottom CTA

| Element | Geometry | Disabled (F1–F3) | Enabled (F4, F5) |
|---|---|---|---|
| Bar | `375 × 76` at y **856 – 932**, fill `#FFFFFF`. `paddingTop 0`, `paddingHorizontal 20`, **`paddingBottom 20`** | | |
| Button | x 20, y 856, **335 × 56**, radius **16** | fill `#70737C` @ **0.08** (≈`#F4F4F5`) | fill **`#FE7139`** |
| Label `신고하기` | 17 **SemiBold**, ink 56.6 × 15.0, horizontally centred, ink centre y 884.5 | `#2E2F33` @0.88 inside a 30 % group → **≈ rgba(46,47,51,0.264)** (≈`#C0C1C3`) | `#FFFFFF` |

### 2.6 `기타 사유` bottom sheet (F2, F3)

| Element | Frame-rel | Sheet-rel | Spec |
|---|---|---|---|
| Scrim | 0,0 375×932 | — | `#171719` @ **0.20** — covers the status bar too |
| Sheet card | x **10**, y **356**, **355 × 274** | 0,0 | radius **28 on all four corners**, fill `#FFFFFF`, no shadow drawn. Insets 10 px left/right; bottom edge sits **10 px above the keyboard** |
| Grab handle | x 163.5, y 372, **48 × 4**, r 2 | +16 | `#37383C` @ **0.16** |
| Title | ink x 34.6, y 402–419.8; origin x 34 | +24 / +46 | **20 Bold**, `#2A2A37`, copy **`기타 사유`** |
| Text field group | x 34, y 463, **307 × 34** (F3) | +24 / +107 | F2 draws **287** wide — 20 px short, **treat as a Figma slip**; use 307 (= 355 − 24×2) |
| — value / placeholder | text line box y **465 – 491** (26 tall), origin x 34 | +24 / +109 | **17 Regular**. Placeholder `입력해주세요` `#37383C`@0.51 · value `신고합니다` `#2A2A37` |
| — underline | y **495 – 497**, width 307 | +139 | **2 px**, `#70737C` @ **0.22** (= exactly `line.normal`). Drawn as a Figma inside-stroke; the 4 px band in the export is masked to 2 px |
| — clear button (F3 only) | Ø **18.3** circle, ink x 311.8–330.1, centre y 478 | right edge flush with the field's right edge | filled circle `#37383C` @0.28 + **white ✕** (~8 px glyph). **Absent in F2** (empty value) |
| Confirm button | x 30, y 554, **315 × 56**, r **16** | +20 / +198 | fill **`#FE7139`**, label **`확인`** 17 SemiBold `#FFFFFF`, centred. **Brand (not disabled) even with an empty field** in F2 |
| Sheet bottom | 630 | +274 | 20 px below the button |
| Keyboard | `375 × 292` raster at y **640 – 932** | — | `img_4.png` (750×584 @2x) — stripped from this SVG, so it renders blank; it is a real iOS keyboard layer. **F2/F3 are keyboard-up states.** |

Internal sheet rhythm: `16` handle-top → `4` handle → `24`(≈21.5 measured) → title → `38.5` → field → `57` → button → `20` → bottom.

---

## 3. Typography table

Sizes solved to ±0.15 px; weights from the stem ladder (§0). `letterSpacing` is 0 on every line
(v2 rule satisfied — nothing to strip).

| Line | Copy | Size / line-height | Weight (stem/em) | Colour | Where |
|---|---|---|---|---|---|
| Nav title | `신고하기` | **15** (solved 15.00) / — | **SemiBold** (1.64/15 = .109) | `#000000` | app bar, all frames |
| Headline | `신고하는` ⏎ `이유를 알려주세요!` | **22 / 30** (baseline delta measured 30.0) | **Bold** (2.75/22 = .125) | `#2A2A37` | all frames |
| Sub-headline | `타당한 근거 없는 신고 내용은 반영되지 않을 수 있습니다.` | **15** (14.98) / 19–20 | **Medium** (1.39/15 = .0927) | `#37383C` @0.51 | all frames |
| Reason label | the 8 rows | **15** (14.87–15.00 across all 8) | **Medium** (1.39/15 = .0927) | `#2A2A37` | all frames |
| Sheet title | `기타 사유` | **20** (20.4) / 27 | **Bold** (2.52/20 = .126) | `#2A2A37` | F2, F3 |
| Field placeholder | `입력해주세요` | **17** (17.05) / **26** (mask rect proves a 26 px line box) | **Regular** (1.27/17 = .0747) | `#37383C` @0.51 | F2 |
| Field value | `신고합니다` | **17** (17.05) / 26 | **Regular** (1.29/17 = .0759) | `#2A2A37` | F3 |
| Sheet CTA label | `확인` | **17** (17.3) | **SemiBold** (1.86/17 = .109) | `#FFFFFF` | F2, F3 |
| Screen CTA label | `신고하기` | **17** (17.00) | **SemiBold** (1.85/17 = .109) | `#FFFFFF` / disabled `#2E2F33`@0.264 | all frames |
| Status bar | `9:41` | ≈15–17 (iOS chrome) | SemiBold | `#000000` | decoration — do not implement |

Note the placeholder copy is **`입력해주세요`** with **no space** — verified numerically
(measured ink 86.6; `입력해주세요` predicts 85.9, `입력해 주세요` predicts 90.3).

---

## 4. Colour table

| Hex + alpha | Composited (over its own bg) | Used for | v2 token |
|---|---|---|---|
| `#FFFFFF` | — | page, CTA bar, sheet card, checked-mark, enabled CTA label | `background.default` / `static.white` |
| `#F9FAFB` | — | reason row fill (all states) | `fill.background` ✔ exact |
| `#2A2A37` | — | headline, reason labels, sheet title, field value | `label.normal` ✔ exact |
| `#000000` | — | nav title | `label.strong` ✔ exact |
| `#2E2F33` @0.70 | ≈`#8E8F92` | close ✕ | `label.neutral` (`#2e2f33b3` = .702) ✔ exact |
| `#37383C` @0.51 | ≈`#9B9C9E` | sub-headline, placeholder | `label.alternative` (`#37383c82` = .5098) ✔ exact |
| `#37383C` @0.28 | ≈`#C6C7C8` | clear-button circle | `label.assistive` (`#37383c47` = .278) ✔ exact |
| `#37383C` @0.28 × **0.40** | ≈`#E3E4E5` | **unchecked** check ring + mark | ≈ between `label.disable` (.161) and `label.assistive` (.278) — see gap #2 |
| `#37383C` @0.16 | ≈`#DBDCDD` | sheet grab handle | `label.disable` (`#37383c29` = .161) ✔ exact |
| `#70737C` @0.22 | ≈`#D5D7D9` | field underline (2 px) | `line.normal` (`#70737c38` = .22) ✔ exact |
| `#70737C` @0.08 | ≈`#F4F4F5` | disabled CTA fill | `fill.normal` (`#70737c14` = .078) ✔ exact |
| `#2E2F33` @0.88 × 0.30 | ≈`#C0C1C3` | disabled CTA label | `label.disable` is .161 — design is .264 (see §6) |
| `#FE7139` | — | checked circle, enabled CTA, 확인 | `primary.primary` ✔ exact |
| `#171719` @0.20 | — | sheet scrim | `background.dim` (`#17171933` = .2) ✔ exact |
| `white 0% → 100%` | — | 36 px scroll fade above the CTA bar | no token — plain gradient over `background.default` |

**Every single fill in this section is already a v2 semantic token** except the two noted (unchecked
ring effective alpha, disabled label alpha). There is no off-token grey to argue about.

---

## 5. State machine / interactions

```
                      tap row 1–7  (toggle, multi-select)
              ┌───────────────────────────────────────────┐
              ▼                                           │
  F1 default ─┴─► (≥1 checked) ────────────────────► F5 multi-selected
    CTA disabled                                       CTA enabled
       │                                                  ▲
       │ tap row 8  `기타 사유 (직접입력)`                  │ 확인
       ▼                                                  │
  F2 sheet open + keyboard up (row 8 still UNCHECKED)      │
    input empty, placeholder, 확인 already brand           │
       │ type                                             │
       ▼                                                  │
  F3 value + clear(✕) ──────── 확인 ────────────────► F4 row 8 CHECKED, CTA enabled
       │                                                   (sheet closed, keyboard down)
       └── scrim tap / swipe-down / clear ✕ → back to F2 or dismissed
```

What the frames actually prove:

* **Multi-select.** F5 has three rows checked at once. Selection is a `Set`, not a radio.
* **Selection is signalled by the icon only.** The row's `#F9FAFB` fill, radius, and (absent) border
  are byte-identical between checked and unchecked rows in F5. No brand tint, no border, no elevation.
* **`기타` opens the sheet *before* it is checked.** In F2/F3 row 8's icon is still the unchecked ring.
  Only after `확인` (F4) does it turn brand. So: tapping row 8 opens the sheet; confirming both stores
  the text *and* checks the row.
* **The CTA gates on "≥1 reason selected".** F2/F3 keep it disabled while the sheet is open with
  nothing selected; F4 enables it with exactly one selection.
* **Keyboard-up layout.** The sheet is a *floating* card (10 px side insets, all-4-corner 28 radius)
  that parks its bottom edge 10 px above a 292 px keyboard. Nothing else in the layout moves — the
  screen behind is untouched, only dimmed.
* **The clear ✕ is value-driven** (absent in F2, present in F3), same rule as `V2SearchField`.
* **`확인` is drawn brand even with an empty field** (F2). The design never draws a disabled `확인`.
* **No pressed state, no ripple, no focus ring** is drawn anywhere. The field shows no caret and no
  focus colour change on the underline — the underline is `line.normal` in both F2 and F3.
* **No loading / submitting state, no success screen, no toast, no error state** is drawn.
* **Nothing scrolls in these frames** — the list ends at y 685 and the CTA bar starts at 856. The 36 px
  fade above the CTA is the only hint that on shorter devices the list scrolls under a fixed footer.

---

## 6. v2 mapping

| Element | v2 component + tokens | Verdict / action |
|---|---|---|
| Screen shell | `V2Screen` (`background.default`), content `paddingHorizontal: spacing[20]` | `V2Screen`'s `padded` is **24**; this screen is **20**. Pass explicit padding (`V2BottomCTA` is 20 too, so 20 keeps one left edge). Same gutter finding as the `compose` spec. |
| App bar | `V2ScreenHeader title="신고하기"` with a **close** action | Bar height 44 ✔, ✕ centre x 26 ✔ (matches `spacing[4]` + 44 target exactly), title `typography.label.small` (15 SemiBold) ✔, colour `label.strong` ✔. **Two deltas:** (a) `V2ScreenHeader` has `onBack` (chevron/arrow) but **no close/✕ leading variant** — gap #1; (b) it left-aligns the title, the design centres it — the same `align?: "left" \| "center"` prop the `compose` spec proposes. |
| ✕ glyph | `V2Icon name="close"` , colour `label.neutral` | `icon-close.svg` draws an 11 px arm span in a 24 box → **13 px ink at `size="md"`**. The design's ✕ ink is **15.2** = the same glyph at **`size="lg"` (28)** to 0.2 px. Use `lg` to match the export, or `md` and accept a 2 px smaller ✕. |
| Headline | `V2Text` `typography.title.medium` (**22 / 30 Bold**) + `label.normal` | ✔ **exact token match**, including line-height 30. Keep the authored `\n`. |
| Sub-headline | `V2Text` `typography.label.smallWeak` (**15 Medium / 19**) + `label.alternative` | ✔ Weight is **Medium**, not Regular — do *not* use `subtext.large` (15 Regular). |
| Reason row | **local `ReportReasonRow`**: `Pressable` → `View{h:48, borderRadius: radius.sm(8), backgroundColor: fill.background, paddingLeft: spacing[16], flexDirection:"row", alignItems:"center", gap: spacing[12]}` + `V2Checkbox variant="circle" size="m"` + `V2Text typography.label.smallWeak` / `label.normal` | Every value is a token (48 = no token, it is the row height; 8 = `radius.sm`; 12/16/20 = `spacing`). **Do not use `V2Option`** — it is radius 24, padding 24, 1 px border, and signals selection with a border+tint, which is a different visual language. **Do not use `V2ListRow`** — its title is `title.xSmall` (17 Bold) and it has no surface. See gap #3. |
| Check icon | `V2Checkbox variant="circle" size="m"` (24) | Checked state is an **exact** match: filled `primary.primary` Ø24 + `static.white` mark. Unchecked: v2 draws the ring at `label.assistive` (0.28) with `strokeWidth 2.04` and outer Ø24; the design draws outer Ø**22** and multiplies the whole group by **0.40** (effective 0.112). See gap #2. |
| List gaps | `gap: spacing[8]` ✔ (pitch 56 − 48) | ✔ |
| Scroll fade | 36 px `LinearGradient` `background.default`→transparent above the CTA | **Not in v2** — `V2BottomCTA`'s header comment says the Figma gradient was deliberately dropped in favour of `paddingTop: 16`. The design has `paddingTop: 0` + the 36 px fade. Same gap the `compose` spec files as its gap #7 — one shared `fade?: boolean` prop on `V2BottomCTA` fixes both sections. |
| Bottom CTA | `V2BottomCTA primaryLabel="신고하기" primaryProps={{ disabled: !canSubmit }}` | `V2Button size="xl"` → 56 h ✔, `radius["2xl"]`=16 ✔, `label.medium` 17 SemiBold ✔, `paddingHorizontal spacing[20]` ✔, `paddingBottom max(insets.bottom, 20)` ✔, disabled fill `fill.normal` = `#70737c14` ✔ **exact**. Only deltas: `paddingTop` 16 vs 0 (fade gap above), and disabled label `label.disable` (16 %) vs the design's 26.4 % — **take the v2 value**, the difference is invisible and the design hex is a raster of a layer opacity. |
| `기타 사유` sheet | `V2BottomSheet surface="community_report_other" title="기타 사유" primaryLabel="확인"` | Near-exact: radius 28 = `radius["4xl"]` ✔, grabber 48×4 `label.disable` ✔ **exact**, handle block 16+4+24 = 44 (design's title lands 2.5 px higher — inside tolerance), title `typography.title.small` 20 Bold ✔, `paddingHorizontal spacing[24]` ✔ (design 24 for title/field), scrim `background.dim` ✔ **exact**, footer `V2Button size="xl"` 56/16 ✔. Footer padding 24 vs the design's 20 (button 307 vs 315) — **take the DS 24**. |
| — floating inset | **Accept the DS.** The design floats the card 10 px in from the sides with all four corners rounded; `V2BottomSheet` is edge-to-edge with top-only corners. | Per the "바텀시트 한 계보" rule, do **not** fork the sheet for a 10 px float. Same call the `compose` spec made. |
| — sheet input | `V2SheetTextInput` (mandatory inside gorhom) styled as the `line` variant of `V2TextField` | `V2TextField variant="line"` is a **perfect** match on paper — `borderBottomWidth: borderWidth.thick` (**2**) ✔, `borderBottomColor: line.normal` (`#70737c38` = .22) ✔ **exact**, `paddingHorizontal: 0` ✔, `paddingBottom: spacing[4]` ✔ (design: text box 26 + 4 + 2 = 32) — **but it renders a plain RN `TextInput`, which does not work inside a gorhom sheet** (the sheet will not lift for the keyboard). See gap #4. |
| — clear ✕ | none | `V2SearchField` has a clear button but renders a bare `V2Icon close size="sm"` in `label.neutral`. The design wants a **Ø18 filled `label.assistive` circle with a white ✕**. See gap #5. |
| Icons needed | `close` only. The check circle comes from `V2Checkbox` (drawn, not an icon asset). | No new icon assets. |

### Gaps / additions (smallest possible)

* **Gap #1 — `V2ScreenHeader` has no close (✕) leading action.** Today it only offers `onBack`
  (chevron on iOS / arrow on Android). This screen is a modal-ish task and the design uses ✕.
  Smallest fix: `leading?: "back" | "close"` (default `"back"`) reusing the existing 44 pt target and
  `V2Icon name="close"`. Do not hand-roll a header row — that is exactly what today's code does wrong.
* **Gap #2 — unchecked checkbox tone.** Design = `label.assistive` × 0.40 → **0.112**; `V2Checkbox`
  unchecked = `label.assistive` at full **0.28**, and its ring is Ø24 vs the design's Ø22. Options,
  in order of preference: (a) ship `V2Checkbox` unchanged and flag the 0.112-vs-0.28 to design (the
  DS value is the more accessible one); (b) add `tone?: "normal" | "faint"` where `faint` swaps the
  unchecked stroke to `label.disable` (0.161 — the closest existing token to 0.112). **Do not** wrap
  the component in `opacity: 0.4`; that would also fade the checked brand state on re-render paths.
* **Gap #3 — no "filled selectable row".** The design's row (48 h, `radius.sm`, `fill.background`,
  no border, leading 24 checkbox, 15 Medium label) is not `V2Option` (24 radius / 24 padding / border /
  tint) and not `V2ListRow` (17 Bold title, no surface). Build it locally from tokens — it is 6 style
  lines. Only promote it to the DS if a second screen needs it.
* **Gap #4 — `V2TextField` cannot live inside a bottom sheet.** It hard-codes RN `TextInput`, and the
  sheet needs `BottomSheetTextInput` (`V2SheetTextInput`) or the keyboard silently covers the CTA —
  the exact bug documented in `V2BottomSheet`'s own header for *this very screen*. Smallest fix:
  `inputComponent?: ComponentType<TextInputProps>` on `V2TextField` (default `TextInput`), so the
  sheet passes `V2SheetTextInput` and inherits the line/underline styling. Otherwise this screen must
  duplicate the 2 px underline styling by hand (as today's code does, with the wrong 1 px and the
  wrong colour).
* **Gap #5 — no filled-circle clear button.** Add `clearable?: boolean` + `onClear` to `V2TextField`
  rendering an 18 px circle (`label.assistive`) with a white `close` glyph, or lift the one from
  `V2SearchField` and give it a `variant`. Until then, keep it local.
* **Gap #6 — `V2BottomCTA` fade.** Shared with the `compose` spec: optional 36 px
  `background.default`→transparent gradient above the bar, with `paddingTop: 0` when enabled.

### Conflicts with v2 rules — and the on-system answer

| Design says | v2 rule | Call |
|---|---|---|
| Centred nav title | `V2ScreenHeader` left-aligns (Toss rule) | Add `align` (one prop, already proposed by the `compose` spec) rather than forking. Whoever lands it first wins. |
| Sheet floats with 10 px side insets | one sheet lineage, edge-to-edge | **Take the DS.** Do not fork. |
| Disabled CTA label at 26.4 % | `label.disable` = 16.1 % | Take the DS value. |
| Unchecked ring at 11.2 % | `label.assistive` = 27.8 % | Flag to design; DS value is more legible. |
| Screen gutter 20 | `layout.GUTTER` = 16 | Keep **20** here — `V2BottomCTA` is already 20, and mixing 16/20 in one screen creates the third start line the layout doc warns about. |
| — | `fontWeight` must never set the face | Nothing in this spec uses numeric weights; use `typography.*` tokens verbatim (they carry `fontFamily`). Today's code violates this — see §7. |
| — | letterSpacing 0 | The export has no tracking anywhere. ✔ |
| — | no ring spinners | Nothing in the design spins; the submit button should use `V2Button`'s `loading`, not a spinner overlay. |

---

## 7. Delta vs the current implementation

Files read: `src/features/recipe/views/CommunityReportScreen.tsx` (327 L), `app/community/report.tsx`,
`src/features/recipe/components/PostListItem.tsx` (entry point), `app/post/[id].tsx` (entry point),
`src/features/recipe/services/communityPostService.ts` (`reportPost`),
`src/i18n/locales/ko/common.json` (`community.reportForm.*`), and — as precedent —
`src/features/restaurant/utils/reviewReportReasons.ts` + `components/ReviewReportSheet.tsx`.

### Already matches

* Multi-select `Set<ReasonKey>` with a `기타` row that opens a sheet and requires text before it counts.
* `기타` opens the sheet **before** the row is checked, and `confirmOther()` both stores the text and
  adds the key — exactly the F2 → F4 transition the design implies.
* CTA gated on `selected.size > 0` (+ `otherText` non-empty when `other` is selected).
* The sheet is a `V2BottomSheet` with `V2SheetTextInput` (correct keyboard behaviour already).
* `기타` row order (last), the `확인` label, the `기타 사유` sheet title, `신고하기` bar title and CTA label.
* Reason→server mapping already collapses the UI vocabulary onto the 5-value server enum.

### Must change

| # | Now | Design |
|---|---|---|
| 1 | Header is hand-rolled: `height: 54`, `Ionicons chevron-back` 24, **hairline bottom border**, title 17 **Bold** `Pretendard-Bold` + `fontWeight:"700"` | `V2ScreenHeader`-shaped 44 pt bar, **✕ close** at centre x 26, **no border**, title **15 SemiBold**, centred. Also: `fontWeight` alongside `fontFamily` violates the v2 face rule — drop it (`typography.label.small`). |
| 2 | Body copy is a single `description` line: `신고할 이유를 모두 골라 주세요` at 14/20 | **Two blocks**: headline `신고하는 / 이유를 알려주세요!` 22/30 Bold + sub-headline `타당한 근거 없는 신고 내용은 반영되지 않을 수 있습니다.` 15 Medium `label.alternative`. New i18n keys needed (`headline`, `headlineSecondLine` or one string with `\n`, and `caution`). |
| 3 | **7 reasons** | **8 rows** — add `음식·식단과 관련 없는 게시글` **first**. Needs a new key + a server mapping. Follow the restaurant precedent: it is topic-drift → `INAPPROPRIATE_CONTENT`, and the real code must ride in the description (see #9). |
| 4 | `harassment` = `욕설·비방·혐오 등 불쾌감을 주는 표현` | `욕설·비방 등 불쾌감을 주는 표현` (drop `·혐오`). Note F1 shows a third, older variant — ignore it. |
| 5 | Row: `minHeight 52`, `radius 10`, `paddingHorizontal 16`, gap 12, background = `surface.surface` via `SurfacePressable`, label 14/20 Medium | **48 h**, **radius 8**, padding-left **16**, gap **12**, fill **`fill.background` (#F9FAFB)**, label **15 Medium** `label.normal`. Row gap 8 ✔ already. |
| 6 | Check: 22×22 **square-ish ring** `borderWidth 1.5`, border `surface.hairline`→`surface.brand`, filled brand when checked, `Ionicons checkmark` 13 | **24** box; unchecked = **Ø22 ring 2 px + a faint checkmark already inside**; checked = **Ø24 filled brand + white check**. Use `V2Checkbox variant="circle" size="m"`. |
| 7 | Footer: `paddingTop 12`, button **54 h / radius 14**, label **15 Bold**, colours from `surface.brand` / `surface.ctaOffBg`, `paddingBottom insets.bottom + 14` | `V2BottomCTA`: **56 h / radius 16**, label **17 SemiBold**, `fill.normal` disabled, `paddingBottom max(insets.bottom, 20)`, plus the 36 px white fade above the bar. |
| 8 | Sheet input: `height 48`, **`borderBottomWidth: 1`**, `surface.hairline`, **15/21**, `paddingHorizontal 2`; sheet confirm button 54/14, label 15 Bold; `sheetContent` gap 28 | Field: text 17/26, **2 px** underline `line.normal`, padding-left 0 (aligned with the title's 24), + an **18 px filled clear ✕** when the value is non-empty; confirm 56/16, label 17 SemiBold; the field→button gap is ~57 (v2 sheet footer `marginTop 32` after a 26+4+2 field is close enough). |
| 9 | The sheet is opened with `surface="community_post_category"` | Wrong analytics surface — it is the report screen's other-reason sheet, not the category picker. Every `sheet_opened` from here is currently miscounted as a category pick. Give it its own `AnalyticsSurface`. |
| 10 | `description` sent to the server = `labels.join(", ") + " — " + otherText`, sliced to 500 — i.e. **localized Korean labels** | The restaurant flow already solved this: put a locale-independent `[CODE]` on the **first line** and the user's text after it (`buildReviewReportPayload`). With an 8th reason collapsing onto `INAPPROPRIATE_CONTENT`, the console otherwise cannot tell topic-drift from privacy from copyright. Not a visual delta, but it is the same bug the restaurant file's header warns about, in the screen that file cites as its own precedent. |
| 11 | Placeholder key = `입력해 주세요` (with a space) | `입력해주세요` (no space — measured). |
| 12 | Sheet `확인` is disabled while the draft is empty | The design draws it brand. **Recommendation: keep today's disabled behaviour** (a brand button that no-ops is exactly the "silent fallback" the team's own rule forbids) and flag the frame to design. |

### Present in the code, NOT drawn in the design — preserve

1. **Entry points and the `더보기` action sheet.** `PostListItem.handleMorePress` and
   `app/post/[id].tsx handleReport` open `/community/report?postId=…` after `afterModalTransitions()`.
   The action sheet also carries **`차단하기` (block user)** with a confirm dialog — the design's
   section title mentions `더보기(신고하기)` but never draws the menu. Do not touch it.
2. **`afterModalTransitions()` before the push** — the native-modal serialization rule. Removing it
   re-introduces the "share/report silently does nothing" bug.
3. **`postId` guard** (`canSubmit` requires a non-empty `postId`) and the `submitting` re-entrancy guard.
4. **Success toast** `신고를 접수했어요` / `신고 내용을 확인할게요.` + `router.back()`. The design draws no
   success state at all; without the toast the screen would just vanish.
5. **Error handling** via `presentCommunityError(error, { scope: "community-report-form" })`.
6. **`maxLength={300}` on the other-reason input** and the `.trim().slice(0,300)` / `.slice(0,500)`
   clamps (the server's `detail` cap is 500).
7. **The `기타` row's inline preview of the entered text** (`otherPreview`, right-aligned, 11.5 px).
   The design shows the row with the plain label only. This is a *feature*, not a style: it is the
   only way to see what you typed without reopening the sheet. Flag it to design rather than deleting
   it; if it stays, it needs a type token (e.g. `subtext.medium` + `label.alternative`) and a
   `flexShrink` that lets the 15 px label win.
8. **`isMine` / `isWithdrawnAuthor` guards** in `PostListItem` that hide the 더보기 button entirely.
9. **`useAppRouter` / `routeGraph` registration** (`"community/report" → community_report` analytics
   route name).
