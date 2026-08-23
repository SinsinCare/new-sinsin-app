# `story-page` — 자유글 · 스토리 페이지 (Story viewer)

Canvas region: **x 100–2710, y 3550–4480** of `slim.svg` (root viewBox `0 0 4831 14968`, 1 unit = 1 px @1x).
Section header on canvas (y 3400–3447, x 181–623): **"자유글- 스토리 페이지"** — read visually at 3× (outlined paths).

Every number below is **measured from the SVG source** (rect/path coordinates, bezier-flattened glyph ink boxes),
not eyeballed. Font sizes are derived from Pretendard metrics (hangul advance `0.864 em`,
hangul ink height `0.849–0.891 em` by weight, ascent `0.952 em`, descent `0.241 em`, space `0.251 em`)
against measured ink boxes — both width and height agree to <2 % on every string.

> ⚠️ The bitmap fills (`img_N.png`) were stripped from `slim.svg`. Every photo renders **blank white**.
> The "grey" you see in frames C/D/E is the `#171719 @20 %` scrim over that blank. Do not read colour from the photo areas.

---

## 1. Screen inventory

Six phone frames, all `375 × 840`, all top-aligned at **y = 3589**.

| # | Frame origin (x, y) | Screen | State | Delta vs neighbour |
|---|---|---|---|---|
| **A** | (141, 3589) | 커뮤니티 › **자유글 피드** | Default, `자유글` top-tab selected | Entry-point context. Detailed feed spec belongs to the feed section; §7 covers only the **story entry point**. |
| **B** | (548, 3589) | **스토리 뷰어** | Full-bleed photo (9:16), **no 저염식 badge** | Baseline story frame. |
| **C** | (955, 3589) | 스토리 뷰어 | Full-bleed photo **+ 저염식 badge** | = B **plus** the orange `저염식` pill above the author row. Everything else pixel-identical. |
| **D** | (1362, 3589) | 스토리 뷰어 | **Letterboxed 3:4 portrait** photo (375×500) on blurred backdrop | = C, but the media viewport is 668 (not 666), the photo is inset, and a blur+dim backdrop appears. Overlay block sits 2 px lower (media is 2 px taller). |
| **E** | (1769, 3589) | 스토리 뷰어 | **Letterboxed 4:3 landscape** photo (375×281) | = D with a different foreground aspect only. |
| **F** | (2176, 3589) | 스토리 뷰어 | **Letterboxed 1:1 square** photo (375×375) | = D with a different foreground aspect only. |

So the viewer is shown in **two media modes** (fills viewport / letterboxed-on-blurred-backdrop) × **badge present or not**.
B–F are otherwise the *same* screen: same nav bar, same camera button, same author overlay, same progress bar, same comment bar.

**Figma artefact to ignore:** frames D/E/F contain a second gradient rect drawn *before* the media
(`375×140 @ y 4209`, transparent-white → white, 30 %) that is completely covered by the photo. It is
a duplicated layer, not a design element. Only the black bottom scrim (§2.4) is real.

---

## 2. Layout spec — 스토리 뷰어 (frames B–F)

Frame `375 × 840`. All horizontal content is inset **20 px** from both edges → content width **335**.
(`GUTTER` in v2 is 16 — this screen uses **20**. See §6 conflict list.)

### 2.1 Vertical bands

| Band | y (frame-relative) | Height | Fill |
|---|---|---|---|
| Status bar | 0 – 50 | **50** | `#FFFFFF` (light content, black glyphs; notch drawn) |
| Nav bar | 50 – 94 | **44** | `#FFFFFF`, **no bottom border** |
| Media viewport | 94 – 760 (B/C) · 94 – 762 (D/E/F) | **666** / **668** | photo |
| Comment bar | 760 – 840 (B/C) · 762 – 840 (D/E/F) | **80** / **78** | `#FFFFFF` (frame base), **no top divider** |

- No home-indicator bar is drawn on B–F (frame A does draw one: `134×5 r2.5 #191F28` at y 4416).
- **Safe-area assumption:** 50 px status band ≈ iPhone notch inset (`insets.top`); the 80 px comment
  band is the *visual* bar and must additionally clear `insets.bottom`. Media = whatever is left
  (`flex: 1`) — do **not** hardcode 666/668. The 666 vs 668 difference between frame pairs is Figma slop.

### 2.2 Nav bar (y 50–94, height 44)

| Element | Geometry (frame-relative) | Colour | Notes |
|---|---|---|---|
| Back chevron | 24×24 icon box, ink centre-line spans x 19.7–26.9, y 64.5–79.6 → box ≈ **x 11.2 … 35.2**, vertically centred on the bar | `#2E2F33` @ **88 %** | Identical geometry to v2 `icon-chevron-left` (stroke 2, round caps) rendered at 24. |
| Overflow "…" | 3 dots ⌀ **2.67**, centres 4.67 apart, ink x 337–349, y 70.5–73.2 → 24×24 box at **x 331 … 355** (right inset **20**), bar-centred | `#2E2F33` @ **70 %** | Horizontal ellipsis. |
| Title | **none** | — | The bar carries no title. |

### 2.3 Media viewport

**Mode 1 — fills the viewport (frames B, C).**
One rect `375 × 666` at y 94 filled with the photo. No blur layer, no dim layer.
i.e. the photo's aspect already matches the viewport (≈ 9:16) → render it edge-to-edge (`cover`).

**Mode 2 — letterboxed (frames D, E, F).** Three stacked layers inside the clipped viewport:

1. **Backdrop** — the same photo, `375 × 668` at y 94, `cover`, wrapped in
   `feGaussianBlur stdDeviation="25"` → **Figma layer-blur 50 → RN `blurRadius` ≈ 25–50**.
2. **Dim** — `375 × 667` at y 95, fill **`#171719` @ 20 %** (exactly v2 `background.dim` = `#17171933`).
3. **Foreground photo** — full width **375**, height = `375 / aspect`, **vertically centred** in the viewport
   (viewport centre y = 428 in all three; each foreground centre = 428.0 ± 0.5):

   | Frame | Foreground rect (frame-relative) | Aspect |
   |---|---|---|
   | D | `375 × 500` at y 176 | 3:4 portrait |
   | E | `375 × 281` at y 288 | 4:3 landscape |
   | F | `375 × 375` at y 241 | 1:1 square |

   → rule: **width is always pinned to 375; height follows the natural aspect; centre vertically.**
   Nothing is ever cropped and there is never a horizontal letterbox.

**Camera button** (all frames B–F): v2 `icon-camera` at **24×24**, box at **x 329.5, y 114.5**
(= media top + 20.5, right inset 21.5 — implement as right 20 / top 20). Fill **`#2E2F33` @ 70 %**.
No pill, no circle, no background behind it — a bare solid-silhouette camera glyph sitting on the photo.

### 2.4 Bottom scrim

`375 × 140` rect anchored to the **bottom of the media viewport** (y = mediaBottom − 140),
fill = vertical `linearGradient(transparent → #000000)`, layer opacity **0.3**.
Effective: `rgba(0,0,0,0)` at the top → `rgba(0,0,0,0.30)` at the media bottom edge.

### 2.5 Author / caption overlay

All x-positions: content left = **frame + 20**, content right = **frame + 355** (width 335).
All y-positions given relative to **`b` = the media viewport's bottom edge** (760 in B/C, 762 in D/E/F) — this
is the anchor the design actually uses; every offset below is identical in all five frames.

| Element | y (relative to `b`) | Size | Fill / copy |
|---|---|---|---|
| **저염식 badge** (frames C–F only) | `b−117` … `b−96` | **40 × 21**, radius **full** (10.5) | bg `#FFFFFF` (opaque), label **"저염식"** `#FE7139`, 10 px Bold, ink 24.76 wide → horizontal padding ≈ **7** |
| **Avatar** | `b−90` … `b−50` | **40 × 40**, radius **20** | bg `#F9FAFB`; person glyph `#37383C` @ 28 %, ink 28.6 × 34.3, clipped by the circle (head + shoulders, bottom-cropped) |
| **Nickname** | text box `b−87.8` … `b−68.8` (ink `b−84.9` … `b−71.7`) | 15 px, lineHeight 19 | **"신신마스터"**, `#FFFFFF` 100 %, SemiBold |
| **Timestamp** | text box `b−68.6` … `b−50.6` (ink `b−65.3` … `b−54`) | 13 px, lineHeight 18 | **"3시간전"** (no space), `#FFFFFF` @ **70 %**, Regular |
| **Caption** | text box `b−38.7` … `b−20.7` (ink `b−35.3` … `b−23.9`) | 13 px, lineHeight 18, **1 line, tail-ellipsised** | **"저염식으로 만든 든든한 한끼! 오늘도 건강하게 저염식으로 만든…"** `#FFFFFF` 100 %, Medium |
| **Progress track** | `b−10` … `b−8` | **335 × 2**, radius 1 (full) | `#70737C` @ **8 %** |
| **Progress fill** | same | **96 × 2**, left-aligned | `#FFFFFF` 100 % — 96/335 = **28.7 %** |

Horizontal detail: nickname/timestamp text boxes start at **frame + 65.8** → avatar right edge (60) + **≈ 6 px gap**.
Avatar and the two-line text block are **vertically centred against each other** (text block 37.2 tall inside the 40 avatar).

**The progress indicator is a single continuous bar, not segmented.** There are no per-story segments,
no dots — one track, one left-aligned fill. It sits *inside* the media, 8 px above its bottom edge, and it is
**at the bottom, not the top**, despite the usual story convention.

### 2.6 Comment bar (below the media, on white)

Band `375 × 80` (78 in D/E/F). Contents, vertically centred (input centre = band centre):

| Element | Geometry (frame-relative) | Fill |
|---|---|---|
| Input field | **251 × 44**, radius **12**, at x **20**, y = bandTop + **18** | `#70737C` @ **8 %** |
| Placeholder | 15 px Medium, ink x 31–136.9 → text inset ≈ **11** from the field's left edge | `#37383C` @ **51 %** — **"댓글을 남겨보세요"** |
| Heart icon | 24 × 24 box at x **289 … 313** (ink 24.56 × 22.1), input right edge + **18** | `#37383C` @ 28 %, inside a group at **opacity 0.6** → effective `rgba(55,56,60,0.168)` |
| Comment icon | 24 × 24 box at x **329 … 353** (ink 23.33 × 23.34), heart + **16** | same colour treatment |

Right edge of the comment icon = frame + 353 → right inset **22** (vs left inset 20). Treat as 20/20 with
`gap: 16` and a flexing input (then the input becomes 255, not 251).
Both action glyphs are **solid/filled** (filled heart, filled speech bubble) and rendered at the *inactive*
lightness — there is **no liked/active state frame in this section**.

---

## 3. Typography table

| # | Line | Size | Line-height (v2) | Weight (face) | Colour | Measured ink |
|---|---|---|---|---|---|---|
| T1 | Nickname "신신마스터" | **15** | 19 | SemiBold | `#FFFFFF` | 62.95 × 13.26 |
| T2 | Timestamp "3시간전" | **13** | 18 | Regular | `#FFFFFF` @ 70 % | 39.78 × 11.31 |
| T3 | Caption "저염식으로 만든 든든한 한끼! 오늘도 건강하게 저염식으로 만든…" | **13** | 18 | Medium | `#FFFFFF` | 327.07 × 11.41 |
| T4 | Badge "저염식" | **10** | 15 | Bold (visually; SemiBold is the nearest token) | `#FE7139` | 24.76 × 8.84 |
| T5 | Comment placeholder "댓글을 남겨보세요" | **15** | ~20 | Medium | `#37383C` @ 51 % | 105.86 × 13.14 |
| T6 | *(frame A)* Top-tab labels "레시피 / 자유글 / 스토리" | **17** | 21 | active Bold, inactive Medium/SemiBold | active `#2A2A37`, inactive `#2E2F33` @ 70 % | 41.5–43.6 × 15.0–15.1 |
| T7 | *(frame A)* Search placeholder "궁금한 점을 검색해보세요" | **17** | 21 | Medium | `#37383C` @ 51 % | 168.84 × 14.87 |

`letterSpacing` is **0** everywhere (Figma text has no tracking applied) — consistent with the v2 rule.

---

## 4. Colour table

| Element | Hex + alpha (from SVG) | v2 token | Exact? |
|---|---|---|---|
| Status bar / nav bar / comment bar background | `#FFFFFF` | `background.default` | ✅ |
| Back chevron | `#2E2F33` @ 88 % | — (nearest `label.normal` `#2a2a37`) | ❌ off-token |
| Overflow "…" | `#2E2F33` @ 70 % | `label.neutral` `#2e2f33b3` | ✅ |
| Camera glyph | `#2E2F33` @ 70 % | `label.neutral` | ✅ |
| Blur-backdrop dim | `#171719` @ 20 % | `background.dim` `#17171933` | ✅ |
| Bottom scrim | `linear(transparent → #000000)` × 0.3 | — (no gradient tokens in v2) | ❌ missing |
| Badge background | `#FFFFFF` | `static.white` | ✅ |
| Badge label | `#FE7139` | `primary.primary` | ✅ |
| Avatar background | `#F9FAFB` | `fill.background` / `grayscale.50` | ✅ |
| Avatar glyph | `#37383C` @ 28 % | `label.assistive` `#37383c47` | ✅ |
| Nickname / caption / progress fill | `#FFFFFF` | `static.white` | ✅ |
| Timestamp | `#FFFFFF` @ 70 % | `primitives.opacityWhite[700]` `#ffffffb3` | ✅ (primitive only — no semantic) |
| Progress track | `#70737C` @ 8 % | `fill.normal` `#70737c14` | ✅ |
| Comment input background | `#70737C` @ 8 % | `fill.normal` | ✅ |
| Comment placeholder | `#37383C` @ 51 % | `label.alternative` `#37383c82` | ✅ |
| Heart / comment glyph | `#37383C` @ 28 %, group opacity 0.6 | `label.assistive` × 0.6 | ⚠️ compound |
| *(A)* tab underline track | `#70737C` @ 22 %, 2 px | `line.normal` `#70737c38` | ✅ (thickness 2, not 1) |
| *(A)* active tab indicator | `#2A2A37`, 62 × 2, r1 | `label.normal` | ✅ |
| *(A)* profile icon (top-right) | `#37383C` @ 28 % | `label.assistive` | ✅ |
| *(A)* search field / chips fill | `#70737C` @ 8 % | `fill.normal` | ✅ |
| *(A)* 실시간 인기글 band | `#70737C` @ 5 % | — (between `fill.alternative` 5 % `#70737c0d` and `fill.normal`) | ✅ `fill.alternative` |
| *(A)* FAB 글쓰기 작성 | `#FE7139`, 122 × 48 | `primary.primary` | ✅ |
| Canvas background (not UI) | `#F2F4F6` | — | n/a |

---

## 5. State machine / interactions

What the five viewer frames actually encode:

1. **Entry.** Frame A is the 자유글 feed with a three-way top tab `레시피 / 자유글 / 스토리`.
   The story viewer is a **pushed screen** (back chevron, no tab bar, no home indicator drawn) —
   it is not a modal sheet and not a tab.
2. **Media mode is data-driven, not a user state.**
   - photo aspect ≈ viewport aspect → mode 1 (edge-to-edge).
   - anything else → mode 2: blurred `cover` copy of the same photo + `#171719` 20 % dim + the photo
     pinned to full width and vertically centred. D/E/F exist purely to prove this rule for 3:4, 4:3 and 1:1.
3. **저염식 badge is optional per story** (B has none, C–F do). It is a content tag on the story, rendered
   above the author row. Only one badge is ever shown in the design.
4. **Progress = position within the story set**, a single continuous bar at 28.7 %. Because it is
   continuous (not segmented) it reads as "how far through the list", i.e. paging between stories.
   No frame shows the bar at 0 % or 100 %, and no frame shows a *timed* auto-advance treatment.
5. **Camera button** (top-right of the media) → create a new story. Present in every viewer frame,
   including B, so it is not conditional.
6. **Overflow "…"** (nav bar right) → the per-story action menu (report / block / delete-if-mine).
   No frame shows the opened menu; the sheet design is not in this section.
7. **Comment affordance.** A persistent, always-visible comment bar: tappable input + heart + comment icon.
   - No focused/keyboard-up frame exists in this region → keyboard behaviour is **unspecified by the design**.
   - No liked (filled orange) heart frame exists → the **active like state is unspecified**.
   - No comment-count labels next to the icons.
8. **No loading state, no empty state, no error state, no pressed state** anywhere in this region.
   Implement loading with skeletons per the house rule (no ring spinners); the media area can hold a
   `fill.normal` skeleton rect while the photo decodes.

---

## 6. v2 mapping

| Design element | v2 component + tokens | Fit |
|---|---|---|
| Nav bar (back + "…") | `V2ScreenHeader os="ios"` (`barHeight.appBarIOS` = 44, back = `V2Icon chevronLeft` size `md`, touch 44) with `right={<overflow/>}` | Bar height ✅. Back-icon optical centre: design ≈ frame+23, component gives 26 → 3 px, acceptable. **Icon colour differs**: design `#2E2F33 @88 %`, component uses `label.normal`. **`right` slot needs an ellipsis icon that does not exist** (see gaps). |
| Camera button on media | `V2Icon name="camera" size="md"` + `Pressable` (hitSlop 10), colour `label.neutral` | ✅ exact — the design *is* `icon-camera` at 24. Needs no `V2IconButton` (no background in the design). |
| Blur backdrop | `expo-image` + `blurRadius`, or `expo-blur` `BlurView` over a `cover` copy | ❌ no v2 primitive. Dim layer = `colors.background.dim`. |
| Bottom scrim | `expo-linear-gradient` `['transparent','rgba(0,0,0,0.3)']`, height 140 | ❌ no v2 gradient token. |
| 저염식 badge | `V2Badge size="xs" color="brand"` | ⚠️ close but not exact: `xs` = `caption.xSmall` (10 SemiBold ✅), padding 8/2, **radius `sm` (8) — design is pill (full)**, **height 19 vs design 21**, and **no white-surface variant** (`brand/weak` gives `#fff4f099` bg, design is opaque white). |
| Avatar | plain `View` 40/40/`radius.full`, bg `fill.background`, `V2Icon name="profile"` `label.assistive` | ⚠️ v2 `icon-profile` is a **stroked** head+shoulders; the design glyph is a **filled** silhouette clipped by the circle. No filled-profile icon exists. |
| Nickname | `V2Text` / `typography.label.small` (15 SemiBold) + `colors.static.white` | ✅ exact |
| Timestamp | `typography.subtext.medium` (13 Regular) + `primitives.opacityWhite[700]` | ✅ size ✅; colour has **no semantic token** (white-alpha only exists as a primitive). |
| Caption | `typography.subtext.mediumStrong` (13 Medium, lh 18) + `static.white`, `numberOfLines={1}` | ✅ exact |
| Progress bar | `V2ProgressBar size="s"` (height 2, track `fill.normal`, radius full) with `value={28.7}` | ✅ geometry & track exact. ❌ **fill colour**: `color` only accepts `brand \| danger \| success \| neutral` — the design needs **white**. |
| Comment input | `V2SearchField` chrome matches exactly (44 min-height, `radius.lg` 12, `fill.normal`, placeholder `label.alternative`) **but** it forces a leading search icon and `label.mediumWeak` (17). Design has no icon and 15 px. | ⚠️ use a `V2TextField`-less custom `Pressable`+`TextInput` row, or add a variant. |
| Heart / comment actions | `V2Icon size="md"`, colour `label.assistive` (drop the extra 0.6 group opacity — it is Figma dimming) | ⚠️ `icon-heart` exists (filled). **No filled speech-bubble**: `icon-chat` is a different shape; verify visually before substituting. |
| Content gutter 20 | `spacing[20]` | ⚠️ conflicts with `layout.GUTTER = 16`. |
| Media/comment split | `V2Screen` + `flex:1` media + bottom bar; **do not** use `V2BottomCTA` (that is a button dock) | — |

### Gaps in v2 (smallest additions proposed)

1. **`V2Icon` has no `more` / `ellipsisHorizontal` glyph.** Add `icon-more.svg` (24 box, three ⌀2.67 dots,
   centres 4.67 apart, horizontally centred, `currentColor`) → registry key `more`.
2. **`V2ProgressBar` cannot render a white fill.** Add `color: "white"` to its colour map
   (`colors.static.white`) — 3-line change; needed by any on-photo progress bar.
3. **`V2Badge` has no on-media / white-surface face and no pill radius.** Add either
   `variant="onMedia"` (bg `static.white`, fg = `color`'s primary) or accept `radius="full"`.
   Also: design height is 21, `xs` yields 19 → `paddingVertical: spacing[2]` → 3 to match, or accept 19.
4. **No white-alpha semantic tokens.** `label.*` are all dark-on-light. On-media text needs
   `static.whiteAlpha70` (`#ffffffb3`) so the 70 % timestamp is not a literal. (The primitive exists;
   it just is not reachable from `useV2Theme().colors`.)
5. **No scrim/gradient token.** Add `overlay.scrimBottom = ['rgba(0,0,0,0)','rgba(0,0,0,0.30)']`, height 140.
6. **No filled avatar-placeholder glyph** (`icon-profile` is stroked).

### Conflicts with v2 rules — flag & fix

- **Horizontal gutter 20 ≠ `layout.GUTTER` (16).** The whole community area in this design uses 20
  (feed search field, list rows, viewer overlay, comment bar). Either raise this screen family to a
  documented `COMMUNITY_GUTTER = spacing[20]`, or snap to 16 and accept a 4 px drift from the mock.
  **Do not mix both on one surface.**
- **Back chevron `#2E2F33 @88 %`** is not a token. Use `label.normal` (`#2a2a37`) — visually within 1 %.
- **Badge label appears Bold at 10 px**; v2's only 10 px face is `caption.xSmall` (SemiBold). Use SemiBold;
  do **not** add `fontWeight: '700'` on top of the face (house rule: weight is the face, never `fontWeight`).
- **Heart/comment colour is a compound (28 % × 0.6).** Do not reproduce the multiply; use
  `label.assistive` once.
- **`letterSpacing` is 0 in the design** — matches v2. The *current implementation* violates this (§7).

---

## 7. Delta vs current implementation

Current viewer: `app/stories.tsx` (523 lines). Current entry: `src/features/recipe/components/StoryRail.tsx`
rendered inside `src/features/recipe/components/FreePostTab.tsx:256`, mounted by `app/(tabs)/community.tsx`.

### 7.1 Must change

| # | Today (`app/stories.tsx`) | Design |
|---|---|---|
| 1 | **Dark chrome**: `screen.backgroundColor = "#0B0B0D"`, all overlay text white on black, no white surfaces. | **Light chrome**: white 44 px nav bar above the media and a white 80 px comment bar below it. The photo no longer bleeds under the status bar. |
| 2 | Media = `<Image contentFit="contain">` at `width×height` of the **whole window**, letterboxed against `#0B0B0D`. | Media is a **band** between nav and comment bar. Letterboxing is filled by a **blurred `cover` copy of the same photo + `#171719 @20 %` dim**, never by flat black. |
| 3 | Top bar = back + **sort tabs `추천 / 최신`** + camera, all `#FFFFFF`, `paddingHorizontal 16`. | Nav bar = back chevron (left) + **"…" overflow** (right). **No sort tabs in the viewer.** Camera moves **into the media**, top-right, `#2E2F33 @70 %`. |
| 4 | Progress = **vertical dot column** on the left edge (`progressCol`, 4×4 dots, active 4×16 pill), max 12 dots. | Progress = **one horizontal 335×2 bar** at the bottom of the media, track `#70737C 8 %`, fill white, continuous. Explicitly the treatment the current code's comment says was rejected in QA 2026-08-06 — **this is a deliberate reversal; confirm with design before implementing.** |
| 5 | Right **action rail**: heart (30 px, orange when liked) + like count, eye + view count, ellipsis — each in a `rgba(11,11,13,0.62)` pill, `right:16`, `bottom: insets.bottom+132`. | **No action rail.** Heart + comment icon live in the bottom comment bar, 24 px, `label.assistive`, no counts, no pill. The **eye/view count and the like count disappear entirely.** |
| 6 | Footer author row: avatar **26×26** `rgba(255,255,255,0.22)`, name **14 Bold**, `remaining` **12 Medium 60 %** (a *countdown*: "N분 남음"), caption **14.5 Regular 92 %, `numberOfLines={3}`**, `paddingHorizontal 20`, `gap 8`. | Avatar **40×40 `#F9FAFB`**; name **15 SemiBold white**; second line is an **elapsed timestamp "3시간전"** 13 Regular white 70 % (not a countdown); caption **13 Medium white, 1 line, ellipsised**; author row and caption are separate blocks with 11 px between them. |
| 7 | No badge. | **저염식 badge** (40×21 white pill, `#FE7139` 10 px) above the author row, when the story carries the tag. |
| 8 | No comment affordance at all. | Persistent comment bar: 251×44 `radius 12` `fill.normal` input, placeholder **"댓글을 남겨보세요"** 15 Medium `label.alternative`, + heart + comment icons. |
| 9 | Every text style hand-rolls `letterSpacing: -0.24 … -0.31` **and** sets both `fontWeight` and `fontFamily`. | v2 rule: `letterSpacing: 0`, weight via face only. All seven styles in `app/stories.tsx` violate both rules and must move to `typography.*`. |
| 10 | Icons are `@expo/vector-icons/Ionicons` (`chevron-back`, `camera-outline`, `heart`, `eye-outline`, `ellipsis-horizontal`). | v2 `V2Icon` set (`chevronLeft`, `camera`, `heart`, + a new `more`). The camera in the design is **solid**, not outline. |
| 11 | Entry point = **`StoryRail`** (112×152 cards, header 오늘의 스토리 + `+ 만들기` pill, empty-state card) inside the 자유글 feed. | Entry point = a **`스토리` top tab** beside `레시피` / `자유글` (17 px labels, 62×2 active indicator `#2A2A37`, track `#70737C 22 %`). The design's feed frame shows **no story rail**. |
| 12 | `app/(tabs)/community.tsx` header = title "커뮤니티" (`typography.title.medium`) + 3 icon actions (person-circle, bookmark, notifications), `paddingHorizontal 20`. | Design frame A has **no title row** — the tab row is the first thing under the status bar, with a single **profile icon 24×24 at right inset 20** (`label.assistive`). |

### 7.2 Already matches

- Camera → `/story/new` route, back → `router.back()`, per-story overflow → report / block / delete-if-mine
  (`handleMore`) — the design's "…" maps 1:1 onto the existing action sheet.
- 20 px horizontal content inset in the footer (`styles.footer.paddingHorizontal: 20`) = the design's gutter.
- Vertical paging between stories (`pagingEnabled` `FlatList`) is compatible with a continuous progress bar.
- View recording (`communityStoryService.recordView`) and like toggle already exist.
- `V2DotLoader` for loading (no ring spinner) already honours the house rule.
- 24 px is already the v2 default icon size; the design uses 24 for every icon except the back chevron ink.

### 7.3 Present in code, **absent from the design — PRESERVE**

Do not delete these because the mock does not draw them:

1. **Sort tabs 추천 / 최신** (`SORTS`, `?sort=` param, `sort` state, `viewedRef.clear()` on switch). The design's
   nav bar has no room for them — decide where they go (a bottom-sheet behind "…", or on the 스토리 tab list
   screen) but **keep the capability**.
2. **View count (`item.views`) and like count (`item.likes`)** — the design shows neither. The data is fetched
   and `recordView` is called; dropping the UI silently makes the counts invisible, not gone.
3. **Like state + heart spring animation** (`heartScale`, `HEART_SPRING`, `hapticSelection`) and
   `accessibilityState={{ selected: item.liked }}`.
4. **Expiry countdown** `formatRemaining()` with `community.stories.expiringSoon / expiresInMinutes / expiresInHours`.
   Stories die in 24 h; the design's "3시간전" is *elapsed*, not *remaining*. Losing the countdown loses the
   only signal that the story is about to vanish. Keep it (e.g. as a second line or inside the badge slot).
5. **`isMine` → 나의 스토리 label + delete flow**; non-mine → report + block (`useBlockedUsers`).
6. **Empty state** (`community.stories.emptyTitle` / `emptyBody`) and the `V2DotLoader` loading state.
7. **`initialScrollIndex` / `?index=` deep link** from the rail, `getItemLayout`, `windowSize={3}`,
   `viewabilityConfig`.
8. **`StoryRail`'s own empty state** ("첫 스토리를 올려보세요" card) and the `+ 만들기` pill → `/story/new`.
9. **`presentCommunityError`** on report failure (added deliberately to stop the generic "인터넷 연결" message).

### 7.4 Data / API gaps the design implies

- **Story comments do not exist.** `communityStoryService` has only `getStories / createStory / deleteStory /
  toggleLike / recordView` (`/community/stories…`); `CommunityStory` has no `comments` field. The design's
  comment input + comment icon have **no backing endpoint**. Either scope a `POST /community/stories/{id}/comments`
  + list endpoint, or ship the bar as a disabled/"준비 중" affordance — do not fake it.
- **Stories carry no tags.** `CommunityStory` has no `tags` / `category`, so the **저염식 badge has no source
  field**. It must come from the server (story tag) — do not derive it by string-matching the caption.
