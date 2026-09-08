# Menu nutrition disclosure — 2026-09-08

Menu tab previously exposed only the dominant risk nutrient despite receiving
five nutrient values. Added an initially collapsed, per-menu Nutrition control
on the menu tab only; the home preview remains unchanged.

- Calories, sodium, potassium, phosphorus, and protein use supplied values.
- Null, non-finite, or negative values display Not available; legitimate zero
  remains zero. No personal limits are reconstructed from risk ratios.
- Confidence label accompanies the expanded values.
- V2 typography, neutral colors, 44-point control, expanded accessibility state,
  and a 180ms transition respecting system reduced motion are used.

Native checks on iPhone 17 Pro / iOS 26.5 Simulator:

- Opened Pasta: five labelled values appeared and matched the local menu fixture.
- Inspected screenshot: compact original menu row, aligned value column,
  expanded rows above the next menu, and footer intact.
- Collapsed Pasta: nutrient rows disappeared and expanded state cleared.
- Opened Steak: its separate nutrient values appeared; Pasta stayed collapsed.
- Collapsed Steak after verification. No data mutations.

Component interaction regression passed: collapsed/expanded/closed lifecycle,
missing/invalid values, real zero, and fractional protein. TypeScript, scoped
ESLint and diff whitespace checks passed. UX-copy audit exited 0 with unrelated
existing findings. Initial icon type failure was corrected to an existing V2
chevron with rotation before the final checks.

Native large text, dark mode, reduced-motion setting, missing-value fixtures,
and Android remain unverified. Menu photos remain noninteractive decorative
thumbnails; photo viewer is exercised through the Photos tab.
