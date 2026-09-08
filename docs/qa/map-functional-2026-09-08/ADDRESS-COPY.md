# Address copy lifecycle — 2026-09-08

AddressBlock previously announced success immediately after starting Clipboard.setStringAsync and ignored both rejection and false results. It now waits for the platform result, locks repeated pending taps, reports failure with a retry instruction, and suppresses late completion after unmount. The inline copied indicator still expires after 1.6 seconds, with cleanup on unmount.

Evidence: four lifecycle tests pass for deferred duplicate calls, rejected and false results followed by retry, and late unmount. TypeScript and scoped ESLint pass. Copy audit exits zero with pre-existing unrelated findings. iPhone 17 Pro iOS 26.5: opened restaurant detail, tapped road-address copy and observed the success announcement. Platform failure branches were simulated in tests; no clipboard-failure injection or pasted-content check on the Simulator was performed.

Follow-up discovered during information-tab inspection: phone and external-link launch handlers in DetailInfoRows and InfoTab still invoke Linking.openURL without handling rejection. This leaf changes address copy only. Information tab correctly showed missing amenity/parking data instead of inventing availability.
