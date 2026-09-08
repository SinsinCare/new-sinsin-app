# Medication reminders — 2026-09-07

## Reference and product decisions

Viewed Mobbin screenshots: [Apple Health schedule](https://mobbin.com/screens/97e0cc8f-ce4a-4b2a-8ff3-086a35392556), [Apple Health review](https://mobbin.com/screens/dccc3e1a-5745-48de-821c-54ea7c936230), [Hims time selection](https://mobbin.com/screens/377e0559-399a-4ffc-9fdd-52a2aeed8e0c), [GoodRx reminders](https://mobbin.com/screens/c6913605-14b2-49d2-b4fd-1ae993f199ea). Apply explicit time rows, native time selection and schedule review within the existing compact health-record typography and spacing.

- Dose periods and notification clocks are adjacent. No selected periods means no empty enabled reminder form.
- Each selected period needs explicit confirmation. Default clocks only seed the picker; they cannot silently opt the user into a guessed schedule. Removing a period removes its active requirement. Removing every period turns reminders off.
- The native time picker keeps a draft; closing cancels, confirming applies. iOS's native keyboard entry is registered with the sheet keyboard state so the clock and confirmation remain above the keyboard. No new native screen sizing or custom wheel physics.
- Clocks are daily Korea Standard Time, consistent with medication-day records. AM/PM is explicit. Meal relation remains the prescribed instruction, not an inferred meal clock. The UI explains that logging food does not automatically shift reminders.
- The next expected dose refreshes while the form remains open, skips already recorded doses when available, and does not carry yesterday's completion across midnight.
- Permission is read when editing, requested only when saving an opted-in schedule, and rechecked on return from device settings. Quiet provisional permission is distinct from full permission. A denied reminder can be switched off to save the medicine alone.

## Reservation contract

The old fixed 7-day reservation window has been replaced with a capacity-aware queue (up to a 90-day planning horizon). iOS reserves four system slots and subtracts notifications owned by other app features. One remaining slot is reserved for a renewal notification when possible. Normal coverage is extended on app launch/foreground and medication changes; the management page shows the actual final reserved timestamp. A low-capacity state is explicit and does not claim a renewal notice when no notice could be reserved.

The renewal notice normally arrives at 10:00 KST two days before coverage ends; shorter coverage chooses a future notice before the last reservation. It opens medication management. Dose notifications retain the dose's actual calendar date even if tapped later. Neither kind includes a medication name. Stable identifiers, logout cancellation, taken-dose cancellation, pause/delete and time-change replacement are preserved. Native pending identifiers are read back before successful coverage is reported.

Native repeating calendar notifications cannot skip only an already-taken occurrence while leaving all future repeats intact through this SDK. We retained that existing cancellation contract. **This is still a bounded device reservation system, not an indefinite background service.** Indefinite reminders without reopening the app require an additional durable delivery architecture; this implementation does not pretend that exists. API reference: [Expo notifications](https://docs.expo.dev/versions/v55.0.0/sdk/notifications/). Native picker added with SDK-compatible version 8.6.0: [Expo date/time picker](https://docs.expo.dev/versions/v55.0.0/sdk/date-time-picker/).

## Verification

Local TEST API / Metro 8085, iPhone 17 Pro Simulator on iOS 26.5. New local native build succeeded; no EAS build or production deployment.

- Native: empty period dependency; two selected periods; iOS keyboard entry of 08:30; confirmation above keyboard; cancellation/reopening; 08:30 and 18:30 persisted through actual API save and management re-entry.
- Native reservation read-back: the saved two-dose QA plan showed coverage through October 5, 18:30 KST, with a renewal notice reserved.
- Maximum accessibility text: management reservation and plan rows wrap without clipping.
- Unit checks: clock round trips including midnight/noon, explicit confirmation, next occurrence/date boundary, completed doses, future start, unchanged clock under meal instructions, capacity allocation, privacy, pause/logout, stale reads, time replacement, missing native registration, denied/provisional permissions and settings-return recovery.

Screenshots are in `screens/`. Long-term delivery, device Focus/sound behavior and Android interaction have not been verified on physical devices. Simulator screenshots are not evidence of month-long alarm delivery.

- Final native follow-up: maximum-text dark picker; entered 09:45 then cancelled, confirmed the saved 08:30 and disabled unchanged-save CTA remained. The native picker and button remained readable. Light mode and default `large` system text were restored.
- Cleanup: the task-created `QA 알림 확인 0907` was archived in the app, which removed its reminders and renewal/coverage panel. A guarded loopback TEST transaction then removed that exact plan (`0ec0b52a-c03f-41b0-8312-019b9a34977f`), two versions and two request receipts; there were no intake entries. Other data was untouched.
- Validation: 7 focused suites / 46 tests passed. Feature TypeScript and scoped lint pass. The global copy audit reports the same 14 pre-existing candidates; both medication locale files were reviewed separately because that audit does not scan this namespace.
