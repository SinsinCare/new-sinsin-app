# Medication reminder redesign

Scope: local TEST app. Explicit clock selection, honest permission and reservation states, capacity-aware scheduling that preserves taken-dose cancellation. Existing shared checkout changes stay intact. No production deployment.

- [x] R1: Reminder time selection has draft/cancel semantics, selected-slot validation, next-time preview and midnight-safe clock conversion.
  CHECK: npx jest --runInBand --testPathPattern='medicationV2|medicationReminderTime|medicationRecord|settingsNotifications' && node -e "console.log('REMINDER_LOGIC_OK')"
  EXPECT: REMINDER_LOGIC_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        1.017 s | Ran all test suites matching /medicationV2|medicationReminderTime|medicationRecord|settingsNotifications/i.
- [x] R2: Reminder scheduling extends to device capacity, reports actual coverage, retains dose cancellation and privacy, reserves a renewal notice, and handles permission, errors and logout safely.
  CHECK: npx jest --runInBand --testPathPattern='medicationV2Reminders|medicationReminderTime' && node -e "console.log('REMINDER_SCHEDULER_OK')"
  EXPECT: REMINDER_SCHEDULER_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        0.907 s, estimated 1 s | Ran all test suites matching /medicationV2Reminders|medicationReminderTime/i.
- [x] R3: Changed feature types and lint pass; translated copy is reviewed.
  CHECK: npx tsc --noEmit && npx eslint src/features/medication src/services/notificationRoutingService.ts tests/medicationReminderTime.test.ts tests/medicationV2Reminders.test.ts && node -e "console.log('REMINDER_TYPES_OK')"
  EXPECT: REMINDER_TYPES_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=REMINDER_TYPES_OK
- [x] R4: Simulator proves time-picker edit/cancel/confirm, no-slot dependency, multiple clocks, light/dark and large text, saving and reopening a schedule. Task-created test data is removed.
  EVIDENCE: REVIEW.md and screens/01-04 document native 08:30 edit/confirm, 09:45-cancel restoring 08:30, empty and multi-period states, real save/reopen, actual October 5 coverage, maximum text and dark mode. Test plan and its reservations were removed; loopback cleanup removed exact QA plan, two versions and two receipts. Light/default text restored.
- [x] R5: Viewed Mobbin references, scheduling tradeoffs, runtime evidence and remaining platform delivery limits are documented accurately.

  EVIDENCE: REVIEW.md links four viewed Mobbin references, explains explicit clocks and prescription timing, reservation capacity/renewal/taken-dose tradeoff, local native build, code tests and Simulator evidence; states bounded reservations and unverified physical long-term/Android delivery.
