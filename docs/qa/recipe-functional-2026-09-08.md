# Recipe functional audit — 2026-09-08

## Cooking people versus individual nutrition

Native reproduction (iPhone 17 Pro / iOS 26.5): opened a recipe, increased the
cooking count from one to two. Both ingredient amounts and nutrient quantities
doubled; the two-person total was compared against one user's nutrient budget.

Changed the detail route to retain the API's per-serving nutrition and personal
comparison at one person. Ingredient quantities still scale by the selected
cooking count. No shared scaling utility or recipe data was changed.

Native verification: at two and three people, nutrition stayed labelled one
person (650 kcal in the local fixture); the first ingredient was 140g and 210g.
Screenshot confirmed consistent layout and units. Restored one person afterward.
No recipe, review, or health record was written. Detail model suite: 56 passed;
scoped lint and diff checks passed. Tests cover existing scaling utilities;
the route's separation itself was verified natively.

Open: the label 'today's remaining amount' requires a separate audit of whether
missing intake is distinguished from zero recorded intake. Timers, ingredient
checks, filters, archive, review drafts, errors, accessibility modes, and Android
remain for subsequent passes.
