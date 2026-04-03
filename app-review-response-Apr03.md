 App Store Review Response

Submission ID: ca40b962-1af0-496d-b695-110771d6a6c2
Version: 1.0.0
Date: April 3, 2026



 Guideline 1.2 - Safety - User-Generated Content

 Block Mechanism

Users can block abusive users from any post in the community feed:

1. Tap the more (...) button on any post
2. Select "이 사용자 차단하기" (Block this user)
3. A confirmation dialog appears explaining that the blocked user's posts will be immediately removed from their feed
4. Upon confirmation, the block is executed

 What happens when a user is blocked

- Instant feed removal: All posts by the blocked user are immediately filtered out of the user's feed (both popular posts and category-filtered lists) via client-side optimistic update.
- Server persistence: The block is persisted in the database (`user_block` table) with a unique constraint per blocker-blocked pair, ensuring the block survives across sessions and devices.
- Developer notification: An inquiry record tagged `[사용자 차단]` (User Block) is automatically created in our system, which is visible to administrators via the admin dashboard (`/admin` - UserBlockAdmin view). This allows the development team to review blocked users and take further action if needed.

 Report Mechanism

In addition to blocking, users can report posts and users:

1. Tap the more (...) button on any post
2. Select "이 게시글 신고하기" (Report this post)
3. Choose a report reason: Spam, Harassment/Hate Speech, Inappropriate Content, False Information, or Other
4. The report is submitted and persisted in the database (`user_report` / `community_post_report` tables)
5. An inquiry record tagged `[사용자 신고]` (User Report) is automatically created, notifying the development team via the admin dashboard

 Implementation References

| Feature | Frontend | Backend |
||-||
| Block button & dialog | `PostListItem.tsx`, `PopularPostCard.tsx` | `POST /api/v1/user/block` |
| Feed filtering | `FreePostTab.tsx` (filters by `blockedNickNames`) | `GET /api/v1/user/block` |
| User report | `PostListItem.tsx`, `PopularPostCard.tsx`, `post/[id].tsx` | `POST /api/v1/user/report` |
| Post report | `post/[id].tsx` | `POST /api/v1/community/posts/{id}/report` |
| Admin review | — | `/admin` (SQLAdmin dashboard) |



 Guideline 2.1 - Information Needed

 1. What specific user data are collected within the app?

Required at registration:
- Email address
- Password (stored as a hashed value, never in plain text)
- Nickname

Optional profile information:
- Gender
- Date of birth (year, month, day)
- Weight, height

Health data (voluntarily provided by the user for disease management):
- Chronic kidney disease (CKD) stage (1–5)
- Dialysis status
- Lab results: GFR, creatinine, sodium, potassium, phosphorus levels
- Dietary intake records
- Self-reported symptoms

Generated through service use:
- Community posts, comments, likes, and bookmarks (user-generated content)
- Service usage logs, access timestamps, device information (OS version, app version)

Consent management:
- Users must agree to the Terms of Service and Privacy Policy during signup (mandatory)
- Marketing communications consent is optional
- All consent states are recorded and stored server-side

 2. Are any user data transmitted to third parties?

No. User data is not shared with or transmitted to any third parties.

- The app does not integrate any third-party analytics services (e.g., Firebase Analytics, Google Analytics, Mixpanel, Amplitude)
- The app does not use any advertising networks or SDKs
- The app does not sell, rent, or trade user data

As stated in our Privacy Policy (effective 2025-02-05), personal data is only disclosed in the following circumstances:
1. With the user's explicit prior consent
2. When required by law or regulation (e.g., court order, government investigation)

All data processing is performed on our own infrastructure (Google Cloud Platform, asia-northeast3 region). Server hosting and infrastructure operations are handled by contracted processors under strict data processing agreements, as disclosed in our Privacy Policy.

Data Protection Contact: corp@mediology.ai | 070-8080-3873
