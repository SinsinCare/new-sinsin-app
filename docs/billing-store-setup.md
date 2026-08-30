# 결제를 테스트 빌드에서 보이게 만들기 — 스토어 작업 순서

작성 2026-08-29. 계기: "결제모듈이 테스트빌드에서 안 보인다".
§1~§3 의 스토어 절차는 2026-08-29 에 애플·구글·RevenueCat 공식 문서에서 확인한 것이다
(각 절 끝에 출처).

## 왜 안 보였나 (원인 확정)

앱 코드는 멀쩡하다. **키가 없어서 SDK 가 켜지지 않았을 뿐이다.**

1. 지금 나가 있는 테스트 빌드는 iOS 89(`ios-testflight-test`) · Android 95(`test-playstore`)다.
   두 프로파일 모두 `eas.json` 에 RevenueCat 키가 **없다**.
2. 키가 없으면 `src/config/revenueCatConfig.ts` 의 `isRevenueCatConfigured()` 가 false 다.
   → `purchasesClient.identify()` 가 첫 줄에서 되돌아가고 `configured` 는 false 로 남는다.
   → `loadCurrentOffering()` 이 `null` 을 준다.
   → 페이월은 상품 대신 안내를 그리고(`PaywallSheet` 머리말 5), 마이페이지 카드는
   가격 줄을 안 그린다(`PlanCard` 머리말).
3. 그 세 프로파일에 Test Store 키를 **넣을 수도 없다.** EAS 는 `developmentClient: true`
   가 아닌 모든 프로파일을 Release 구성으로 짓고, RevenueCat SDK 는 Release 구성에서
   Test Store 키를 보면 **일부러 앱을 죽인다**:

   | 플랫폼  | 버전                      | 위치                                                                             | 동작                                                                  |
   | ------- | ------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
   | iOS     | RevenueCat 5.85.0         | `Sources/Purchasing/Configuration.swift` `checkForSimulatedStoreAPIKeyInRelease` | `#if !DEBUG` 안에서 `fatalError`                                      |
   | Android | purchases-android 10.18.1 | `PurchasesFactory.kt`                                                            | `SimulatedStoreErrorDialogActivity` 를 띄우고, 사용자가 닫으면 크래시 |

   버전 사슬: `react-native-purchases 10.8.0` → `PurchasesHybridCommon 18.32.1` →
   `RevenueCat 5.85.0` / `com.revenuecat.purchases:purchases 10.18.1`.

   2026-08-26 에 `test`·`ios-test-simulator`·`ios-test-device` 세 프로파일에 Test Store
   키가 들어갔고, 그 조합으로 iOS 88 · Android 94 가 나갔다. 그 빌드들은 로그인 직후
   결제 식별 시점에 죽는 상태였다. 2026-08-29 에 키를 걷어내고
   `scripts/check-release-config.js` 가 그 조합을 빌드 전에 막도록 했다.

**결론:** 스토어 트랙 테스트 빌드(TestFlight · Play 내부 트랙)에서 결제를 보려면
Test Store 가 아니라 **진짜 스토어 상품**이 있어야 한다. 아래가 그 순서다.

## 지금 당장 결제 화면을 보는 법 (스토어 작업 없이)

dev client 는 Debug 구성이라 Test Store 가 정상 동작한다.

```bash
npm run start:test
```

`.env.test` 가 `EXPO_PUBLIC_RC_TEST_KEY` 를 싣는다. RevenueCat 프로젝트에는 이미
`default` 오퍼링이 있고 `$rc_monthly`(product `monthly`) · `$rc_annual`(product `yearly`)
두 패키지가 붙어 있다 — 2026-08-29 에 공개 키로 `GET /v1/subscribers/{id}/offerings`
를 직접 쳐서 확인했다. 주의: `.env.test` 의 백엔드는 `http://localhost:8100` 이므로
로컬 bun 서버가 떠 있어야 `/billing/me` 가 답한다.

dev client 가 없는 실기기라면 먼저 `eas build --profile development` 로 한 번 만들어야 한다.

---

# 진짜 상품 붙이기

## 먼저 정할 것 — 제품 ID

제품 ID 는 **한 번 저장하면 못 바꾸고, 지워도 재사용 못 한다.** 그러니 먼저 정한다.

- 애플: 앱 단위로 유일, 최대 100자, 영문·숫자·하이픈·마침표·밑줄. 저장 후 수정 불가,
  삭제해도 같은 앱에서 재사용 불가.
- 구글: 숫자나 소문자로 시작, 밑줄(\_)·마침표(.) 가능, **최대 40자**. `android.test` 로
  시작 불가. 생성 후 변경·재사용 불가.

**권장: `premium_monthly` · `premium_yearly`** (양쪽 스토어 규칙을 다 만족한다.)

세 가지를 못 박아 둔다:

- 두 스토어의 제품 ID 가 **서로 같을 필요 없다.**
- 지금 Test Store 가 쓰는 `monthly`/`yearly` 와 **같을 필요도 없다.**
- 앱은 제품 ID 를 아예 안 본다. 앱이 보는 것은 RevenueCat 패키지 키
  **`$rc_monthly` · `$rc_annual`** 둘뿐이다(`PaywallSheet` 의 `MONTHLY`·`ANNUAL` 상수).
  즉 제품 ID 를 무엇으로 하든 **앱 코드는 한 글자도 안 바뀐다.**

출처: [Apple – In-App Purchase information](https://developer.apple.com/help/app-store-connect/reference/in-app-purchase-information/) ·
[Google – 정기 결제 만들기](https://support.google.com/googleplay/android-developer/answer/140504)

## 1. App Store Connect (iOS)

앱: `ascAppId 6758880186` · 번들 `com.mediology.sinsin-care` · 팀 `HJJNV9Y5W8` ·
계정 `healthierwith@gmail.com` (`eas.json` 의 `submit` 블록 · `app.json` 에서 확인).

### 1-1. 유료 앱 계약 (이게 없으면 나머지가 다 헛일이다)

**경로(한국어 UI):** 상단 **비즈니스** → 조직 페이지. `계약` · `은행 계좌` · `세금 양식`
섹션이 **한 페이지에 세로로** 있다. "Agreements 탭" 같은 별도 탭은 없다.

**이 계약이 `활성화됨` 이 아니면 IAP 상품은 샌드박스에서도 안 내려온다.** 코드가 아니라
계약이 원인인 "invalid product identifier" 가 여기서 나온다.

2026-08-29 실제 화면 상태(사용자 스크린샷):

| 항목                           | 상태                                        |
| ------------------------------ | ------------------------------------------- |
| 유료 앱 계약                   | **사용자 정보 대기 중** ← 여기가 막혀 있다  |
| 무료 앱 계약                   | 활성화됨                                    |
| 은행 계좌                      | 없음                                        |
| 대한민국 세금 양식             | BRN/NTS 등록번호·증명서가 **유효하지 않음** |
| Apple Developer Program 사용권 | 업데이트 검토·동의 필요                     |

`사용자 정보 대기 중` 을 `활성화됨` 으로 바꾸려면 세 가지가 다 필요하다:

- [ ] **담당자 연락처** — Senior Management · Financial · Technical · Legal · Marketing
      다섯 역할을 모두 지정한다. 한 칸이라도 비면 이 상태에서 안 벗어난다.
- [ ] **세금 양식** — 미국 세금 양식은 **모든 개발자 필수**다. 한국 계정이라 대한민국
      양식도 필요한데, 지금 BRN/NTS(사업자등록번호)와 증명서가 무효로 잡혀 있다.
      사업자등록증으로 다시 올린다.
- [ ] **은행 계좌** — `은행 계좌 추가`. 단, **세금 양식이 먼저** 처리돼야 은행 정보가
      처리된다.

세 가지가 채워지면 미국 세금 양식 처리 후 **24시간 안에** 계약이 활성화된다.

- [ ] **Apple Developer Program 사용권 계약** 갱신 동의 — 이건 **계정 소유자(Account
      Holder)만** 할 수 있다. 다른 역할로 로그인해서는 버튼이 안 먹는다. 이게 안 되면
      **앱 업데이트·새 앱 제출이 막히고**, 첫 구독은 새 앱 버전과 같이 제출해야 하므로
      (§1-2 인용문) 결제 출시 전체가 여기서 멈춘다.

### 1-2. 구독 그룹과 구독 두 개

- [ ] 사이드바 **Monetization → Subscriptions** → **+** → 그룹 **참조명**(예:
      `신신당부 프리미엄`) 입력 → Create.
      월간·연간은 **같은 그룹**에 있어야 서로 업/다운그레이드가 된다(그룹당 최대 100개,
      사용자는 그룹당 하나만 구독).
- [ ] 그 그룹에서 **Create** → 참조명 + 제품 ID(`premium_monthly`) → Create.
      그다음 필수 항목을 채운다:
  - **Subscription Duration** — `1 month` (연간은 `1 year`)
  - **Subscription Prices** — 통화·가격 선택
  - **Availability** — 판매 국가/지역
  - **Localizations** — 한국어 표시 이름·설명. 앱은 스토어가 준 문자열을 그대로 그린다.
  - **Review Information** — 심사용 스크린샷·메모
- [ ] `premium_yearly` 도 같은 방식으로 만든다.
- [ ] (선택) 무료 체험을 붙이려면 각 구독에 **Introductory Offer** 를 만든다.
      앱이 `product.introPrice` 를 읽어 문구를 자동으로 만든다
      (`purchasesClient.toOfferingPackage`).

> **첫 구독은 앱 버전과 함께 제출해야 한다.** 애플 문서 그대로:
> _"Your first auto-renewable subscription must be submitted with a new app version.
> Your first subscription group must also be submitted with a new app version and must
> include an auto-renewable subscription in the same submission."_
> 즉 **1.2.4 같은 새 버전을 올릴 때 이 구독을 같이 제출**해야 승인된다. 한 번 승인된
> 뒤부터는 추가 구독을 앱 버전 없이 제출할 수 있다.

### 1-3. In-App Purchase Key (RevenueCat 이 요구한다)

- [ ] **Users and Access → Integrations → In-App Purchase** →
      **Generate In-App Purchase Key** → 이름 입력.
- [ ] **`.p8` 파일은 딱 한 번만 내려받을 수 있다.** 바로 받아서 안전한 곳에 둔다.
- [ ] 같은 화면 **상단의 Issuer ID** 를 복사해 둔다. RevenueCat 이 같이 요구한다.
      (Issuer ID 가 안 보이면 App Store Connect API 키를 아무거나 하나 만들면 생긴다.)

StoreKit 2 를 쓰는 SDK(우리가 그렇다)에서는 이 키가 **없으면 거래가 기록되지 않는다.**
구형 App-Specific Shared Secret 은 StoreKit 1 용이라 대신 쓸 수 없다.

### 1-4. 샌드박스 테스터

- [ ] **Users and Access → Sandbox → +** → 이름·이메일 입력.
      Apple 계정으로 쓴 적 없는 이메일이어야 한다. 지메일이면
      `healthierwith+sandbox1@gmail.com` 같은 `+` 주소를 쓸 수 있다.
- [ ] **한 번 만들면 이름·이메일·비밀번호를 못 고친다.**

출처: [Apple – Offer auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/) ·
[Apple – Sign and update agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/) ·
[Apple – View agreements status](https://developer.apple.com/help/app-store-connect/manage-agreements/view-agreements-status/) ·
[Apple – Provide tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information/) ·
[Apple – Enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information/) ·
[Apple – Create a sandbox Apple Account](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/create-a-sandbox-apple-account/) ·
[RevenueCat – In-App Purchase Key Configuration](https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret/in-app-purchase-key-configuration)

## 2. Google Play Console (Android)

앱: 패키지 `com.mediology.sinsinapp`.

### 2-1. 전제

- [ ] 판매자 등록이 되는 국가여야 하고, **결제 프로필**이 설정돼 있어야 한다.
- [ ] 앱이 트랙에 **한 번은 올라가 있어야** 상품이 산다.
      `npm run build:test:android:aab` → `test-aab` 프로파일이 그 자리다.

### 2-2. 정기 결제 상품

- [ ] **Monetize with Play → Products → Subscriptions** → **Create subscription**
- [ ] 제품 ID `premium_monthly`, 이름(최대 55자, 사용자 메일에 보인다) → **Create**
- [ ] 혜택(benefits) 최대 4개, 각 40자 — 선택이지만 채우는 게 낫다.
- [ ] **기본 요금제(base plan)를 만들고 반드시 [활성화]** 한다. 기본 요금제가 활성이 아니면
      상품이 사용자에게 안 나간다. 요금제 ID 도 활성화 후엔 못 바꾼다.
- [ ] **Save → Activate**.
- [ ] `premium_yearly` 도 같은 방식으로.

### 2-3. RevenueCat 용 서비스 계정 (여기가 제일 많이 막힌다)

- [ ] Google Cloud Console 에서 API 3개를 **사용 설정**:
      `Google Play Android Developer API` · `Google Play Developer Reporting API` ·
      `Google Cloud Pub/Sub API`
- [ ] **IAM 및 관리자 → 서비스 계정 → 서비스 계정 만들기**. 역할 두 개를 준다:
      **Pub/Sub 편집자(Pub/Sub Editor)** · **모니터링 뷰어(Monitoring Viewer)**
      (권한 오류가 나면 Pub/Sub 관리자로 올린다.)
- [ ] 그 계정의 **키 관리 → 키 추가 → 새 키 만들기 → JSON** 으로 내려받는다.
- [ ] Play Console **사용자 및 권한 → 사용자 초대** → 위 서비스 계정 이메일.
      **계정 수준 권한** 네 개를 준다(앱 수준 권한으로는 안 된다 — 구글 API 가
      계정 수준으로 강제한다):
  - 앱 정보 보기 및 대량 보고서 다운로드(읽기 전용)
  - 재무 데이터, 주문, 구독 취소 설문 응답 보기
  - 주문 및 정기 결제 관리
  - 스토어 등록정보 관리
- [ ] **자격 증명은 만든 뒤 최대 36시간이 지나야 유효해진다.** 하루 정도는 기다릴 각오를
      하고 먼저 만들어 두는 게 좋다.

배포에 쓰는 `google-play-key.json` 과는 **다른 키를 권한다** — 권한 범위가 다르다.

### 2-4. 실시간 개발자 알림(RTDN)

- [ ] RC 대시보드가 주는 Pub/Sub 주제를 Play Console 의 실시간 개발자 알림에 넣는다.
- [ ] 그 주제에 `google-play-developer-notifications@system.gserviceaccount.com` 을
      **Pub/Sub 게시자(Publisher)** 로 추가한다. 이게 빠지면 알림이 한 건도 안 온다.

출처: [Google – 정기 결제 만들기](https://support.google.com/googleplay/android-developer/answer/140504) ·
[RevenueCat – Google Play service credentials](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials) ·
[RevenueCat – Google server notifications](https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications)

## 3. RevenueCat 대시보드

지금 프로젝트에는 **Test Store 앱만** 있다. 여기에 App Store 앱과 Play Store 앱을
**추가**하는 것이다 — 프로젝트를 새로 만들지 않는다. Test Store 는 프로젝트에 기본으로
딸린 것이라 지우지 않아도 된다.

- [ ] 프로젝트 대시보드 **Apps** 에서 app config 추가.
  - App Store: 앱 이름 + **Bundle ID `com.mediology.sinsin-care`** + `.p8`
    In-App Purchase Key + **Issuer ID**
  - Play Store: 앱 이름 + **Package `com.mediology.sinsinapp`** + 서비스 계정 JSON
    (업로드하면 RC 가 자격 증명을 검증한다. "Valid credentials" 가 뜰 때까지 기다린다.)
- [ ] **Products**: 각 스토어의 `premium_monthly` · `premium_yearly` 를 가져온다(import).
- [ ] **Entitlement**: lookup key 를 **`premium`** 으로 만든다.
      이 문자열이 서버의 정본이다 —
      `sinsin-be-bun/src/domains/billing/catalog.ts` 의 `ENTITLEMENT_TO_PLAN` 가
      `premium → plan premium` 으로 읽는다. **여기서 이름을 바꾸면 서버도 같이 바꿔야
      한다.** (`care_plus` 는 그 상품이 생기는 날 추가한다.)
- [ ] 네 상품(iOS 2 + Android 2)을 **모두 그 entitlement 에** 붙인다.
- [ ] **Offering**: 기존 `default` 오퍼링에 패키지를 붙인다 —
      월간 상품 → **`$rc_monthly`**, 연간 상품 → **`$rc_annual`**.
      앱은 이 두 키만 그린다. 다른 키로 붙이면 페이월이 빈 채로 열린다.
- [ ] **API keys** 에서 `appl_…`(App Store) · `goog_…`(Play) **공개 SDK 키**를 받아 둔다.
      `sk_` 로 시작하는 **비밀 키는 앱에 절대 넣지 않는다**(`revenueCatConfig.ts` 머리말).
- [ ] **Webhook**: URL 은 `https://<백엔드>/webhooks/revenuecat` — `/api/v1` **밖**이다.
      테스트 서버는 `https://sinsin-api-test-87899379852.asia-northeast3.run.app/webhooks/revenuecat`.
      Authorization 헤더 값과 서명 비밀을 각각 정하는데, **32바이트 미만이면 서버가
      없는 것으로 취급한다**(`webhookAuth.ts` `MIN_WEBHOOK_SECRET_BYTES`).

출처: [RevenueCat – Connect apps](https://www.revenuecat.com/docs/projects/connect-a-store)

## 4. 서버 환경변수 (Cloud Run)

`sinsin-be-bun` 이 읽는 값들 — 이게 없으면 `/billing/sync` 와 웹훅이 죽는다.
부팅 로그에 무엇이 켜졌는지 찍히므로(`domains/billing/index.ts`) 배포 뒤 로그로 확인한다.

| 변수                            | 쓰임                                                              |
| ------------------------------- | ----------------------------------------------------------------- |
| `REVENUECAT_SECRET_KEY`         | RC v2 API 호출(`/billing/sync` 가 구독을 당겨 온다)               |
| `REVENUECAT_PROJECT_ID`         | 같은 API 의 경로                                                  |
| `REVENUECAT_WEBHOOK_SECRET`     | 웹훅 HMAC 서명 비밀 (≥32바이트)                                   |
| `REVENUECAT_WEBHOOK_AUTH`       | 웹훅 Authorization 헤더 값 (≥32바이트)                            |
| `BILLING_ACCEPTED_ENVIRONMENTS` | 생략 가능. 기본값은 운영 `PRODUCTION`, 그 외 `SANDBOX,PRODUCTION` |

운영 배포에서 `SANDBOX` 를 받아들이면 **샌드박스 결제로 진짜 프리미엄이 켜진다.**
기본값을 덮어쓸 이유가 없으면 건드리지 않는다.

## 5. 앱 설정 (`eas.json`)

키를 받은 뒤에 넣는다. **`test_` 로 시작하는 값은 어느 프로파일에도 넣지 않는다** —
`npm run check:release-config` 가 막는다.

```jsonc
// ios-testflight-test / test-aab / test-playstore / testflight / playstore / production
"EXPO_PUBLIC_RC_IOS_KEY": "appl_…",
"EXPO_PUBLIC_RC_ANDROID_KEY": "goog_…"
```

- [ ] 테스트 프로파일 먼저 넣고 빌드 → TestFlight / Play 내부 트랙에서 확인.
- [ ] 확인이 끝나면 릴리스 프로파일(`testflight` · `playstore` · `production`)에도 넣는다.
- [ ] `scripts/check-release-config.js` 의 **`BILLING_SHIPS` 를 `true` 로** 바꾼다.
      그때부터 "키 없이 릴리스" 가 막힌다 — 결제가 조용히 꺼진 채 출시되는 것을 방지한다.

## 확인 순서 (붙인 뒤)

1. `npm run check:release-config` 가 통과한다.
2. 테스트 빌드를 깔고 로그인 → 마이페이지에 플랜 카드가 **가격과 함께** 보인다.
3. 페이월을 열어 월/연 두 패키지와 스토어 현지화 가격이 보인다.
4. 샌드박스 계정으로 구매 → 서버 `/billing/me` 의 `plan` 이 `premium` 으로 바뀐다.
5. RC 대시보드 Webhook 탭에서 우리 서버가 2xx 를 돌려주는지 본다.
6. [복원] 버튼이 같은 계정에서 구독을 되살린다(iOS 심사 필수 항목).

## 잘 막히는 자리

- **iOS 에서 상품이 안 내려온다.** 애플 상품이 `Ready to Submit` 이면 샌드박스에서
  보통은 내려오지만, 전파가 안 되는 사례가 흔하다. 그때 쓰는 우회: 새 앱 버전을 만들고
  그 버전의 In-App Purchases 에 상품을 넣기 / `Add for Review` 했다가 취소해서 전파를
  깨우기. RevenueCat 대시보드의 **Health Report** 가 어느 상품이 왜 막혔는지 찍어 준다.
- **안드로이드 자격 증명이 계속 무효.** 36시간 전파를 기다린 게 맞는지, 권한을 **계정
  수준**으로 줬는지 본다(앱 수준으로 주면 실패한다).
- **웹훅이 403.** 서명 비밀·Authorization 값이 32바이트 미만이면 서버가 그 비밀을
  없는 것으로 취급한다. 길게 만들 것.
- **구매는 됐는데 프리미엄이 안 켜진다.** entitlement lookup key 가 `premium` 이 아닐
  가능성이 가장 크다. 서버는 그 문자열만 본다.

## 아직 확인하지 못한 것

- 테스트 Cloud Run 서비스(`sinsin-api-test`)에 위 네 개 RC 환경변수가 실제로 들어가
  있는지는 확인하지 못했다 — `gcloud` 인증이 만료돼 있다(`gcloud auth login` 필요).
  `/webhooks/revenuecat` 이 서명 없는 요청에 403 을 주는 것까지는 확인했으므로
  **라우트는 살아 있다.**
- 스토어 대시보드는 계정 자격이 필요해 직접 들어가 확인하지 못했다. 위 절차는 공식
  문서 기준이고, 화면 문구는 콘솔 개편에 따라 조금씩 다를 수 있다.
