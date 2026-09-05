# Compact restaurant map direction — 2026-09-05

The user rejected oversized controls and the prior reference direction. This pass visually compared 26 distinct Mobbin captures from 16 apps. Some are repeats from earlier passes; this is not an additive count. Mobbin captures do not establish the newest shipping app version. Queries for Partiful returned no screens; several app-specific searches returned other apps, correctly attributed below.

## Chosen references

- [Blackbird: sparse points with a selected place](https://mobbin.com/screens/f6e06b19-e326-4032-8a22-97ecc4edb269): secondary locations remain quiet; only the chosen location and its name lead. Adopt reduced cluster circles and a clear selected row, not its oversized central brand button.
- [corner: compact saved-place preview](https://mobbin.com/screens/74cc935e-2d23-4f24-921b-1377b9508eb5): small category controls and a single thumbnail accompany concise place identity. Adopt the compact comparison rhythm.
- [Wolt: small map points and a low place preview](https://mobbin.com/screens/34c7be7f-6d06-4419-9b3e-2ee265e5219b): map takes priority over chrome. Adopt reduced controls, without adopting a different navigation model.
- [Places: restrained search and filters](https://mobbin.com/screens/6fa48557-5b7a-4a7a-b311-f6cd32575bc6): a limited set of small controls over a quiet map. Adopt scale and visual weight; retain this app's Korean typography and semantic palette.
- [Airbnb: selected marker contrast](https://mobbin.com/screens/24072f6f-71d3-47f1-92e3-3b63bf4b1b43): selection is distinct from surrounding markers. Its large photographic preview is not the target for this revision.

## Final changes

- Search surface: 52 → 48 points, 17 → 15-point text, smaller search icon and capsule outline.
- Category controls: 13-point labels and approximately 32-point visual faces inside actual 44-point minimum targets. Faces and targets grow with text.
- Result title: 20 → 17 points, inline 13-point count. One map/list action with a compact 32-point face and a 44-point target.
- Filter entrances: small outlined capsules, lighter sorting action. Selected values retain clear contrast and counts.
- Filter panel: region / nutrition / cuisine tabs replace unreliable initial-section auto-scrolling. Selections persist while switching tabs and apply together; the draft tray keeps reserved space.
- Restaurant rows: 15-point semibold title, 13-point metadata, 72 × 72 thumbnail, 16-point vertical padding and 4-point text gaps. Remove the internal nutrition divider while preserving nutritional qualifications and the row separator.
- Selected row: reserved 3-point accent edge with a neutral fill. Its title position and card height do not jump. A selected row with no nutrition data no longer creates an empty footer.
- Cluster circles: 40/48/58 → 30/34/40 visible pixels, each inside a 44-pixel hit box. Existing count rules and cluster click handling remain intact.
- Map name collision handling from the earlier refinement remains: 12/16 text, 132-pixel ellipsis, viewport-aware 3–12 label budget, selected bubble priority, and no loss of markers or their hit areas.
- Matching card skeleton sizes prevent unnecessarily large placeholders.

## Examined Mobbin captures

- [Airbnb](https://mobbin.com/screens/24072f6f-71d3-47f1-92e3-3b63bf4b1b43)
- [Airbnb](https://mobbin.com/screens/c22a2390-0873-4a2b-a8c0-62ac4721fcac)
- [Airbnb](https://mobbin.com/screens/58cf5678-dab9-43fa-a32f-50a5c2c9498d)
- [Apple Maps](https://mobbin.com/screens/12157e3f-ceb2-4a6e-b620-bf8bf28d710e)
- [Placify](https://mobbin.com/screens/7f4fbc1d-7601-4f87-90e3-29db6c879c62)
- [My BMW](https://mobbin.com/screens/c74f1a29-8e08-4cf4-98cd-451971819b7e)
- [Nike](https://mobbin.com/screens/914f8869-99e1-4c15-aa5d-8fefd887a94e)
- [Placify](https://mobbin.com/screens/cc2ac51e-9bce-4785-96e0-fbc451d3aa6e)
- [Wolt Delivery](https://mobbin.com/screens/34c7be7f-6d06-4419-9b3e-2ee265e5219b)
- [Wanderlog](https://mobbin.com/screens/389fba88-fc57-4315-ba2a-422ddc759cfa)
- [Wanderlog](https://mobbin.com/screens/866f77b8-cf7d-4a22-87c2-08574957e78f)
- [Wanderlog](https://mobbin.com/screens/e0fd8557-92f4-410f-ae04-4cef14d667fc)
- [Places](https://mobbin.com/screens/232011c5-0a17-44f6-8271-028db57e5b16)
- [Too Good To Go](https://mobbin.com/screens/09fbd428-6ee1-4401-a8ba-0383d140394a)
- [StubHub](https://mobbin.com/screens/ecc639ec-935e-47eb-979a-238f7074abd0)
- [Beli](https://mobbin.com/screens/1ac6a935-41b4-41e0-b433-dbb5d593a0e9)
- [Blackbird](https://mobbin.com/screens/f6e06b19-e326-4032-8a22-97ecc4edb269)
- [corner](https://mobbin.com/screens/74cc935e-2d23-4f24-921b-1377b9508eb5)
- [Blackbird](https://mobbin.com/screens/f6630f77-a750-4351-9325-620f67dc9115)
- [Blackbird](https://mobbin.com/screens/d3d3f8bd-586f-4215-bcf8-88ce1279693e)
- [Blackbird](https://mobbin.com/screens/93e27f82-1df9-41e4-b0c5-a0b378f89395)
- [corner](https://mobbin.com/screens/f3fd6510-7bf9-425e-949e-61df09ad898a)
- [Places](https://mobbin.com/screens/6fa48557-5b7a-4a7a-b311-f6cd32575bc6)
- [Zomato](https://mobbin.com/screens/c37207c4-aae6-46e5-bf50-c611aab2c6c7)
- [DoorDash](https://mobbin.com/screens/ff560597-4452-4581-9ae3-557360a35206)
- [Shake Shack](https://mobbin.com/screens/da171520-be35-47ee-a7a6-71efdb9fa35d)

## Verification

Evidence is recorded in DETAIL-GATES.md. The native session used the existing iPhone 17 Pro / iOS 26.5 Expo client and Metro 8085 TEST runtime. Light/dark map and list, detail entry/back, filter tab draft persistence and apply/reset, and region search were exercised. At three preferred-text-size increments, a fresh app reload showed readable titles, metadata and controls. Live simulator font-size changes had stale native text measurements before reload; no global font-scaling disable or speculative remount workaround was retained. Original text size and dark theme were restored after QA.

Nine restaurant test suites, TypeScript, restaurant ESLint, UX copy audit and diff whitespace checks completed with exit zero. The copy audit still reports the existing MED-002 health-copy finding outside this change. Four acceptance gates passed; two native pin-selection-dependent gates were explicitly excluded because CUA coordinate interaction returned noWindowsAvailable. Final native pin tapping, dragging and selected-row appearance are not claimed as verified.

The user's follow-up reinforces a compact default across the product: use restrained control faces, concise rows and hierarchy from weight, contrast and alignment. Larger text remains an accessibility setting, not the default aesthetic. This change does not globally rewrite unrelated health/community typography tokens.
