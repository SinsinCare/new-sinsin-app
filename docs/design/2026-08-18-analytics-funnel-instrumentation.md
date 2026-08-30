# 제품 분석 계측 설계 — 단계별 이탈 관측

2026-08-18 · 대상: `sinsin-rn`(SDK·호출부) · `sinsin-be-bun/src/domains/analytics`(인제스천·미러)

> ⚠️ **2026-08-26 갱신 — 이 문서의 대시보드 부분은 더 이상 유효하지 않다.**
> 자사 질의 계층(`/admin-api/v1/analytics/*` 18개)과 Pulse 대시보드(`sinsin-analytics`)는
> 은퇴했고 **Mixpanel 이 분석 정본**이다. 이 문서의 **계측 설계(이벤트 이름·속성·화면 축)는
> 그대로 유효하고**, 달라진 것은 그 이벤트를 어디서 보느냐뿐이다.
> 근거와 남은 계약: `sinsin-be-bun/docs/mixpanel-primary.md`.

> 이 문서는 "믹스패널식 단계별 계측"의 시스템 설계다. 실제 전송은 Mixpanel 이 아니라 자사 파이프라인으로 가지만
> (SDK 공개 API 는 Mixpanel 시절과 동일: `trackAnalyticsEvent(name, props)`), 퍼널·이탈을 읽는 방식은 같다.
> 코드 실사 기준이며, 인용한 파일:라인은 2026-08-18 기준으로 실재를 확인한 것이다.

---

## 0. 한 장 요약

현재 상태

| 축 | 지금 | 뜻 |
|---|---|---|
| 이벤트 카탈로그 | 61개 (`events.ts`) | 가입·식사기록·식당만 촘촘하다 |
| 호출부 | 91곳 / 19파일 | 레시피 · 커뮤니티 · 상담 · 검진 · 의사공유 · 설정 여정은 **0건** |
| 화면 축 | 라우트 77개 → 화면명 15개 | `(settings)` 38개 라우트가 3개 이름으로 눌린다 |
| 순서 축 | `server_ts`(초 절삭) 하나 | **배치당 한 값** — 15초 안에 끝난 여정은 퍼널이 2스텝에서 죽는다 |

설계는 6층이고, **아래층이 없으면 위층이 거짓말을 한다.**

```
L5  퍼널 등록 · 볼륨 · 보존          대시보드에서 읽는 법
L4  서버 발화 srv_*                  앱이 못 보는 이탈(비동기 완료·푸시·조용한 폴백)
L3  여정별 단계 이벤트 (7여정)        "어디서" 빠져나가는가
L2  가로지르는 공용 계측 (8개 통로)    실패·포기·빈상태·대기·시트를 한 이름으로
L1  화면 축 재설계 (라우트 키 표 70)   "어느 화면"이 단계와 1:1
L0  순서 축 수정 (서버 퍼널 엔진)      "무엇이 먼저인가" — 이게 없으면 전부 0
```

**L0 를 먼저 하지 않으면 L1~L5 의 이벤트 400여 개가 전부 무의미하다.** 이유는 §3.

---

## 1. 진단 — 지금 이탈이 안 보이는 네 가지 이유

### ① 순서 축이 없다 (가장 치명적)

`routes.ts:77` 이 요청 진입 시각 **하나**를 만들어(`naiveUtcTimestamp` = 초 단위 절삭) 그 배치의 모든 행에 그대로 박는다(`record.ts:186`).
클라이언트는 20건 누적 또는 15초마다 flush 한다(`transport.ts:37-38`). 즉 **한 flush 창 안의 모든 이벤트가 완전히 같은 타임스탬프**를 갖는다.

퍼널 엔진은 스텝 간 비교가 엄격 부등호다(`funnel.ts:99` `sc.ts > p.t`). 결과:

- 15초 안에 끝나는 모든 동작(시트 열기→입력→저장, 사진 확인→분석→결과, 카드 열기→스크롤)은 **2스텝 이후가 0에 수렴**한다.
- 순번 퍼널(가입 6질문, 온보딩 8스텝)은 **산술적으로 3스텝부터 무조건 0**이다.
- `medianSecFromPrev`(`funnel.ts:112`)와 세션 길이(`overview.ts:44`, `sessions.ts:95`)는 체류가 아니라 **flush 주기의 배수**를 재고 있다. 한 배치에서 끝난 세션의 길이는 정확히 0초다.
- 네트워크 실패 시 백오프가 최대 150초(`transport.ts:43`)라 그때는 2.5분치가 한 점으로 뭉친다.

### ② 화면 축이 뭉개져 있고, 게다가 이벤트가 아예 안 나간다

- `(settings)` 38개 라우트 → `notifications`(2) · `health`(9) · **`profile`(27)**. `(tabs)/all` 도 `profile` 이라 마이페이지 탭과 설정 27화면이 같은 값이다.
- `getAnalyticsScreenName` 에 `recipe` 그룹 분기가 없어 레시피 스택 3화면과 루트 7화면이 통째로 `other` 다.
- `(write)` 5개(자유글 신규·수정·스토리·레시피 신규·수정)가 전부 `community_write` 하나다. 커뮤니티 글쓰기 전환율과 레시피 작성 전환율이 **지금 같은 숫자**다.
- 결정타: `useAnalyticsLifecycle.ts:51` 이 이름이 같으면 return 한다. `all → checkup-list → checkup-auth → doctor-search` 를 연달아 이동해도 `screen_viewed` 는 **0건**이다. 이 여정은 화면 축에서 누락이 아니라 **존재하지 않는다.**

### ③ 여정의 절반에 이벤트가 없다

레시피 · 커뮤니티/스토리 · AI 상담 · 통계 리포트 · 건강검진 · 의사 공유 · 설정/탈퇴 — `trackAnalyticsEvent` 호출 0건.
남는 것은 라우트 전환이 만드는 `screen_viewed` 뿐이고 그마저 ②로 뭉개진다.

### ④ 실패·포기의 단일 통로가 놀고 있다

`src/lib/errorMessage/present.ts:46` 은 **57개 호출부**에서 불리며 호출 시점에 `{kind, code, retryable, silent, surface, action}` 을 이미 계산해 둔다(`resolve.ts`, kind 11종).
`useGoBack`(12파일)·`ConfirmExitModal`(6파일)·`V2EmptyState`(20파일)·`V2ErrorState`(23파일)·`V2BottomSheet`(28파일)·`useLoadingVisible`(15파일)도 마찬가지로 단일 계보다.
여정마다 `*_load_failed`·`*_retry_pressed`·`*_empty_viewed`·`*_sheet_dismissed` 를 새로 발명하면 **같은 사건이 여정 수만큼 다른 이름으로 흩어진다.**

---

## 2. 설계 원칙 여섯 (이 문서 전체를 지배한다)

**P1. 단계는 이름에, 세그먼트는 속성에.**
퍼널 stepMatch 는 `sc.name = ?` 뿐이고 속성 조건이 없다(`funnel.ts:55-59`). "한 이름 + 구분 속성"은 스텝이 될 수 없다.
따라서 *퍼널 스텝으로 불릴 구분은 반드시 이름이 갈라져 있어야 한다.* 반대로 스코프 필터(`prop:key=value`)는 존재하지만(`scope.ts:119-134`)
`funnel.ts:80-84` 가 그걸 `scoped` CTE 전체에 걸기 때문에 **그 키를 안 싣는 스텝이 통째로 사라진다.** 속성 스코프 퍼널은 전 스텝이 같은 키를 실을 때만 성립한다.

**P2. 단계마다 네 종을 갖춘다 — 진입 / 진행 / 성공 / 실패·포기.**
이탈은 "진입은 있는데 성공이 없는" 차이로만 보인다. 성공만 찍는 이벤트는 이탈을 못 만든다.

**P3. 발화는 항상 `useEffect` + 전이 가드.**
렌더 함수 본문·`ListEmptyComponent`·조기 반환 블록에서 쏘면 리렌더마다 중복 발화한다. 검증 단계에서 이 유형의 결함이 서로 다른 여정에서 3건 잡혔다
(레시피 상세·식당 상세 실패·커뮤니티 목록 빈 상태).

**P4. 밀리초 원값 금지, 버킷만.**
서버 질의 계층에 백분위·히스토그램이 **없다** — `breakdown.ts:36-46` 은 `group by 1 order by events desc limit N` 하나뿐이고
`percentile_cont` 은 퍼널 스텝 간 소요시간에만 쓰인다. `wait_ms` 로 브레이크다운하면 값마다 events=1 인 행이 limit 만큼 잘려 나올 뿐이다.
→ `wait_bucket: 'instant'(<300ms) | 'fast'(<1s) | 'ok'(<3s) | 'slow'(<10s) | 'very_slow'`.

**P5. 속성 키는 클라+서버 정규식의 합집합을 피한다.**
새니타이저가 **두 벌**이고 목록이 다르다.

| | 금지 단어 |
|---|---|
| 클라 `events.ts:205` | email name phone birth address health diagnosis disease ckd food meal text message query image uri url token title date error content answer description value |
| 서버 `record.ts:16` | email phone password token secret address birth name query **search** text title content message url |
| **합집합(=쓰면 안 되는 것)** | `email name phone birth address health diagnosis disease ckd food meal text message query search image uri url token title date error content answer description value password secret` |

키가 걸리면 **조용히 사라진다**(예외도, 로그도 없다). 실제로 초안에서 `answered_count`(→`answer`)와 `is_search`(→서버에서만 탈락) 두 개가 이 검사에 걸렸다.
안전한 대안: `item_count` `picked_count` `fail_kind` `slot` `source` `step_index` `mode` `entry` `result_count` `code`.
값은 필터되지 않으므로 **구분은 키가 아니라 값으로 옮긴다**(`is_search: true` ✕ → `entry: 'search'|'feed'` ○).

**P6. 화면명은 4관문을 전부 통과할 때만 준다.**
① `app/` 에 라우트 파일이 있어 `useSegments()` 가 바뀌는가(= `ROUTE_PARENT` 에 항목이 있는가) ② presentation 은 기준이 아니다
(`restaurant/[id]/photos` 는 모달이지만 라우트라 화면명을 준다) ③ 한 체류 안에서 반복되면 화면명으로는 1회로 뭉개지므로 이벤트여야 한다
④ 변형이 5개를 넘으면 화면 축이 아니라 이벤트 축이다.
시트/모달(V2BottomSheet·V2Modal·MealSheet·건강기록 5종)에 **화면명을 수동 주입하면 안 된다** — `analyticsClient.ts:101-104` 의 `currentScreen` 이 오염돼
그 뒤 모든 track 행의 "어디서 눌렀나"가 틀어진다.

---

## 3. L0 — 순서 축 수정 (서버, 선행 조건)

### 무엇을 고치나

`queries/funnel.ts` 의 순서 판정을 `server_ts` 단독에서 **`(server_ts, id)` 행 비교**로 바꾼다.

```
scoped:  select ..., e.server_ts as ts, e.id as ord
sN:      join scoped sc on sc.person = p.person
           and (sc.ts, sc.ord) > (p.ts, p.ord)      -- 기존: sc.ts > p.t
           and sc.ts <= p.t0 + make_interval(mins => ?)   -- 창 판정은 server_ts 그대로
```

- **왜 `id` 인가**: `analytics_event.id` 는 BigInt autoincrement 이고 `createMany` 는 배열 순서대로 넣는다 → 배치 내부 순서 = id 순서.
  같은 tiebreak 을 `queries/paths.ts:63,70,71` 이 **이미 `order by server_ts, id` 로 쓰고 있다.** 새 규약이 아니다.
- **`client_ts` 는 쓰지 않는다**: 컬럼이 `String?` 이고(`schema.prisma`) 클라 시계라 조작·시차에 열려 있다. 창·스코프 판정은 server_ts 라야 한다.
- **`seq` 는 보조**: `seq Int?` 가 이미 저장된다(세션별 단조 증가). 같은 세션 안의 순서 검산에는 쓸 수 있지만 세션마다 1로 리셋되므로
  **정렬 키로 단독 사용하면 안 된다**(한 배치에 이전 세션 끝과 새 세션 앞이 같이 들어오면 순서가 뒤집힌다). `id` 가 그 경우까지 맞는다.

### 같이 고칠 것

1. `routes.ts:77` 의 초 절삭 제거(밀리초 포함). 컬럼이 이미 문자열/DateTime 이라 마이그레이션 불필요. 서로 다른 배치가 같은 초에 겹치는 경우가 즉시 풀린다.
2. 세션 길이도 같은 문제다 — `overview.ts:44-47`, `sessions.ts:95-97` 의 `max−min`. **지금 대시보드의 '평균 세션 길이'는 체류가 아니라 flush 횟수다.**
3. 퍼널 질의에 **스텝 이름 술어를 밀어 넣는다**. `funnel.ts:82-83` 의 `scoped` 는 지금 기간 내 **전 이벤트**를 뽑고 2회 이상 참조돼 materialize 된다.
   `and (e.name in (…) or (e.type='screen' and e.screen_name in (…)))` 한 줄이면 `ix_analytics_event_name_time` 을 탄다.
   **이벤트를 4배로 늘리기 전에** 넣어야 하는 변경이다.

### 검증

`bun test`(테스트 DB `sinsin_test`)에 시드 하나: **한 배치·같은 server_ts 로 3스텝이 다 들어온 사람이 3스텝을 통과하는가.**
지금은 통과하지 않는다. 이 테스트가 초록이 되기 전에는 순번 퍼널을 대시보드에 올리지 않는다.

---

## 4. L1 — 화면 축 재설계

### 구현 방식

`getAnalyticsScreenName(segments)` 의 if 체인을 **라우트 키 표 조회**로 바꾼다.

1. `src/shared/navigation/routeGraph.ts:260` 의 `toRouteKey(segments)` 로 키를 만든다(그룹·`[id]` 유지, 꼬리 `index` 절단).
2. `const ROUTE_SCREEN: Record<RouteKey, AnalyticsScreenName>` 에서 찾는다.
3. 없으면 `other`.

**그룹 단위 폴백을 두지 않는다**(`(auth)` 는 전부 signup 같은 것). 폴백이 지금 사고의 원인이다 — 새 라우트가 조용히 잘못된 이름으로 들어간다.
대신 `tests/routeGraph.test.ts:33-60` 의 `collectRouteKeys`(app/ 파일 트리를 실제로 훑는다)를 재사용해
**"모든 라우트 키가 `ROUTE_SCREEN` 에 있다"** 테스트를 추가한다. 새 화면은 CI 가 이름을 요구한다.
같은 PR 에서 `tests/analytics.test.ts:23` 의 `["post","patient-post-id"]` 를 `["post","[id]"]` 로 고치고, 표 조회 전 마지막 세그먼트를 `[id]` 로 치환해 재조회하는 정규화 한 줄을 넣는다.

### 화면명 70개

| 영역 | 라우트 → 화면명 |
|---|---|
| 루트 7 | `/`→`entry` · `onboarding`→`onboarding` · `consult`→`consult` · `statistics`→`statistics` · `stories`→`community_story` · `community-library`→`community_library` · `v2-showcase`→`dev_showcase` · `+not-found`→`not_found` |
| (auth) 10→9 | `login`→`login` · `email-login`→`login_email` · `forgot-password`→`password_reset` · `social-link-email`·`email-login-link-password`→`account_link` · `terms-agreement`→`signup_terms` · `signup-email`→`signup_email` · `signup-password`→`signup_password` · `profile-setup`→`signup_profile` · `signup-complete`→`signup_complete` |
| (tabs) 5 | `home`→`home` · `community`→`community` · `recipe`→`recipe` · `restaurant`→`restaurant_map` · `all`→`my_page` |
| post 1 | `post/[id]`→`community_post` |
| recipe 3→2 | `recipe/[id]`→`recipe_detail` · `recipe/saved`·`recipe/recent`→`recipe_archive` |
| restaurant 8 | `restaurant_detail` · `restaurant_photos` · `restaurant_review_write` · `restaurant_reviewer` · `restaurant_search` · `restaurant_list` · `restaurant_bookmarks` · `restaurant_report` |
| (write) 5 | `free/new`→`free_write` · `free/[id]`→`free_edit` · `story/new`→`story_write` · `recipe/new`→`recipe_write` · `recipe/edit/[id]`→`recipe_edit` |
| (settings) 38→31 | `settings` · `profile_edit` · `profile_field_edit`(닉네임·이름·전화·비밀번호 4:1) · `kidney_profile` · `notification_settings` · `notification_inbox` · `announcements`(2:1) · `inquiry` · `ask_doctor` · `medical_reference` · `privacy_settings` · `app_info` · `legal_document` · `withdrawal` · `withdrawal_terms` · `withdrawal_complete` · `checkup_list` · `checkup_auth` · `checkup_detail` · `checkup_calendar` · `doctor_connections` · `doctor_intro` · `doctor_search` · `doctor_preview` · `doctor_sharing` · `exam_upload` · `exam_ocr_review` · `health_hub` · `health_dashboard` · `health_results`(2:1) · `nhis_legacy`(3:1) |

접은 자리 6곳(14라우트→6이름)의 공통 판정: **퍼널 스텝으로 불릴 일이 없는 잎사귀만 접었다.** 접힌 구분이 필요해지면 화면명이 아니라 이벤트 속성으로 낸다.
탈퇴 3화면은 **절대 접지 않는다**(그 자체가 퍼널이다).

### 배포·호환

- 화면명은 서버에서 자유 문자열이다(`routes.ts:43` 은 `maxLength:120` 뿐, enum·체크제약·조인 없음). **앱 배포만으로 끝난다** — 서버 배포·alembic·프리즈마 마이그레이션 전부 불필요.
- 대시보드도 무변경이다 — 당시엔 Pulse 의 퍼널 화면이 자유 텍스트 입력이었고, **지금은 Mixpanel 의 퍼널이 같은 성질이다**(이벤트 이름을 그대로 넣으면 된다. 등록·화이트리스트가 없다).
- **소급 복원은 불가능하다.** 행에 남는 것은 `screen_name` 값 하나뿐이고 라우트 경로는 어디에도 저장되지 않는다. 이미 쌓인 `other`/`profile` 은 영구히 혼합 버킷이다. 백필 시도 금지.
- **의미가 좁아지는 토큰은 유지하지 말고 은퇴시킨다.** 1:1 인 `home`·`community`·`recipe`·`consult`·`onboarding`·`community_post` 6개만 문자열을 그대로 쓴다.
  `profile`·`health`·`signup`·`notifications`·`community_write`·`restaurant` 는 새 문자열로 갈아탄다 — 같은 이름의 숫자가 배포일에 조용히 절반으로 줄어드는 것보다,
  옛 이름이 0으로 수렴하고 새 이름이 올라오는 편이 **눈에 보인다.**
- 신구 혼재 구간은 **버전이 아니라 기간(from/to)으로 자른다.** `scope.ts:43` 의 `FILTER_OPS` 에 범위 연산자가 없어 "1.2.0 이상"을 만들 수 없다.
  배포일을 대시보드 앵커로 적고, 채택률이 평평해질 때까지(보통 2~4주) 신구 토큰을 함께 표시한 뒤 그 앞뒤를 한 그래프에 겹쳐 읽지 않는다.
- 배포 즉시 0이 되는 저장 퍼널을 먼저 점검한다 — `profile`·`health`·`signup`·`community_write`·`restaurant` 를 스텝에 쓴 것들(`funnels.tsx:32` 의 기본값 포함).

### 화면명이 생겨도 퍼널 인접 스텝으로 쓰면 안 되는 자리

`entry`(리다이렉트라 다음 화면과 같은 순간) · `signup_complete`→`onboarding`(replace 직후) · `exam_ocr_review` 같은 자동 전진 구간.
**화면명이 생겼다는 것과 퍼널 스텝으로 쓸 수 있다는 것은 별개다.**

---

## 5. L2 — 가로지르는 공용 계측 여덟 (여정보다 **먼저** 넣는다)

이 여덟을 먼저 넣으면 여정 스펙에서 지울 수 있는 이름이 수십 개다. 전부 이미 단일 통로가 있다.

| # | 이벤트 | 넣을 자리 | 속성 | 대체하는 것 |
|---|---|---|---|---|
| 1 | `app_error_presented` | `src/lib/errorMessage/present.ts:52` (57개 호출부의 단일 통로) | `kind`(canceled/offline/timeout/sessionExpired/rateLimited/server/forbidden/notFound/conflict/badRequest/unknown) · `code` · `surface` · `retryable` · `silent` | 여정마다 손으로 지은 `fail_kind` 전부 |
| 2 | `app_error_action_pressed` | `src/lib/errorMessage/actions.ts:44` (액션 10종 실행 지점) | `action`(retry/refresh/resendCode/goBack/goHome/goLogin/goSignup/resetPassword/completeProfile/openInquiry) · `kind` | 여정별 `*_retry_pressed` 4종 |
| 3 | `nav_back` | `src/shared/navigation/useGoBack.ts` (맨 `router.back()` 은 `tests/navigationBackGuard.test.ts` 가 금지 → 유일한 경로) | `from_screen` · `used_fallback` | 여정별 `*_abandoned` 의 안드 하드웨어 백·iOS 엣지 스와이프 구멍 |
| 4 | `compose_exit_prompted` / `compose_exit_confirmed` | `ConfirmExitModal`(6파일: 레시피 작성·자유글 신규/수정 등) | `surface` · `has_draft` | "작성 중 이탈"의 단일 정본 |
| 5 | `empty_state_viewed` | `V2EmptyState`(20파일) 내부 `useEffect` + 1회 가드 | `surface` | 여정별 `*_empty_viewed`. **단, 퍼널 스텝에 쓸 자리는 개별 이름이 여전히 필요하다**(P1) |
| 6 | `error_state_viewed` | `V2ErrorState`(23파일) 동일 | `surface` · `retryable` | 여정별 `*_load_failed` 의 화면 표시분 |
| 7 | `wait_perceived` | `useLoadingVisible`(15파일)의 false→true 전이 = "사용자가 기다림을 인지한 순간" | `surface` · `wait_bucket` | 여정별 손계산 `wait_ms` |
| 8 | `sheet_opened` / `sheet_dismissed` | `V2BottomSheet`(28파일) | `surface` · `dwell_bucket` | 시트마다 발명한 `*_sheet_viewed`/`*_sheet_dismissed` |

추가로 폼 유효성은 `src/shared/utils/formValidationState.ts` 가 이미 공용이다 → `form_validation_failed{form, first_fail, fail_count}` 하나로 통일한다
(지금은 J1·J7 에만 있고 닉네임·이름·전화·비밀번호 변경·문의·후기·글쓰기·건강기록 시트에는 없다).

**react-query 의 조용한 재시도를 잊지 말 것**: `shouldRetryQuery` 가 offline/5xx/unknown 을 2회까지 재시도하고 지연이 1s·2s 다(`tests/queryRetryPolicy.test.ts`).
즉 모든 `*_load_failed` 는 첫 실패보다 약 3초 늦다. `wait_bucket` 해석에 이 3초를 포함해서 읽는다.

---

## 6. L3 — 여정별 단계 이벤트

7개 여정 × (단계표 · 이벤트표 · 퍼널 정의 · 주의) 는 **부록**에 있다. 각 여정 머리에 검증 단계가 잡은 정정을 함께 실었다.

| 여정 | 단계 | 제안 이벤트(신규) | 퍼널 |
|---|---|---|---|
| [J1 진입·로그인·가입·온보딩](#j1-진입--로그인--회원가입--온보딩) | 32 | 61 (36) | 8 |
| [J2 홈·식사기록·건강기록·통계](#j2-홈--식사기록--건강기록--통계) | 25 | 45 (23) | 7 |
| [J3 레시피](#j3-레시피) | 32 | 59 (58) | 7 |
| [J4 식당 지도](#j4-식당-지도) | 32 | 50 (37) | 8 |
| [J5 커뮤니티·스토리](#j5-커뮤니티--스토리) | 35 | 67 (66) | 8 |
| [J6 AI 상담·리포트·알림](#j6-ai-상담--리포트--알림) | 32 | 51 (49) | 7 |
| [J7 건강검진·의사공유·설정/탈퇴](#j7-건강검진--의사공유--설정탈퇴) | 63 | 85 (83) | 7 |

합계 418개(신규 352)는 **상한이지 목표가 아니다.** L2 를 먼저 넣으면 중복 발명한 이름 수십 개가 사라지고,
L1 이 끝나면 초안이 "이벤트로 대체"해 둔 진입 단계(`recipe_detail`·`statistics`·`checkup_*`·`doctor_*`)의 상당수를 `screen` 스텝으로 되돌릴 수 있다.
**순서를 뒤집으면 지울 이벤트를 먼저 만들게 된다.**

---

## 7. L4 — 서버가 발화하는 이벤트 (`srv_*`)

### 규칙

- **user_id 는 반드시 채운다.** 사람 축이 `coalesce(user_id::text, 'anon:'||anonymous_id)`(`scope.ts:180`)라 이것만으로 사람 축이 정확하다.
- `anonymous_id` 는 NOT NULL 이므로 상수 센티널 `server_backend`(`ANON_ID_PATTERN` 통과)를 쓰고, **`analytics_device` upsert 는 절대 하지 않는다** — 하면 `new_devices` KPI(`overview.ts:53-59`)와 기기 대장이 오염된다. `writer` 에 device/identity 경로를 건너뛰는 `submitServer(rows)` 진입점을 하나 판다.
- **session_id**: 앱 요청에서 파생된 것은 앱이 `X-Analytics-Session` 헤더로 현재 세션 id 를 실어 보내게 한다(transport 에 게터 하나 + apiClient 인터셉터 한 줄). 세션 지표를 안 깨는 유일한 방법이다.
  배경 작업(푸시 발송·크론·internal)은 세션이 없다 — 가짜 세션 id 를 만들면 `sessions`/`avgSessionSec` 이 즉시 오염되므로, 세션 KPI 질의에서 제외하거나 analytics 에 넣지 않는다. **결정이 필요한 갈림길이다.**
- **HTTP 4xx/5xx 는 analytics 에 옮기지 않는다.** `http/middleware/errorLog.ts` 가 이미 전건 적재한다. 넣을 기준은 하나 — **"HTTP 오류가 아닌데 사용자가 볼 수 없는 결과"**(비동기 완료, 푸시 발송, 조용한 폴백/강등, 지연 보정).
- `type` 판별의 `error` 는 현재 완전한 사문이다(생산자 0줄·소비자 0곳). 의미를 확정한다: **클라이언트가 겪은 제품 실패는 `track` 유지**(성공과 나란히 비율·퍼널에 세야 한다), **`error` 는 서버 발화 실패 전용.** 퍼널은 이름만 보므로(`funnel.ts:58`) 어느 쪽이든 안전하다.

### 이벤트

| 이벤트 | 자리 | 속성 |
|---|---|---|
| `srv_food_analysis_finished` | `foodcamera/service.ts:304`(사진) · `:332`(글) | `source` `status` `dur_bucket` `item_count` `pending` |
| `srv_food_analysis_failed` (error) | `service.ts:286` provider 미설정 분기 · analyzer catch | `source` `stage`(provider_off/upload/provider/persist) `fail_kind` |
| `srv_food_nutrition_reanalyzed` | `foodcamera/routes.ts:183` `/internal/reanalyze-pending` | `reanalyzed` |
| `srv_push_sent` / `srv_push_failed`(error) | `service.ts:407-419` (**지금은 warn 으로 삼킨다**) | `kind` · `fail_kind` |
| `srv_chat_stream_finished` | `chat/service.ts:869` done 직전 | `first_chunk_bucket` `stream_bucket` `retry` |
| `srv_chat_stream_abandoned` | `chat/service.ts:836` — "화면을 떠났다"고 판단해 **아무 프레임도 안 보내고 조용히 return** 하는 자리 | `streamed` |
| `srv_chat_stream_failed` (error) | `chat/service.ts:880` catch | `code` `partial` |

`srv_push_*` 없이는 J6 의 "푸시 동의 → 다음 날 복귀" 퍼널의 분모가 허구다(보냈는지를 모른다).
`srv_chat_stream_abandoned`/`_failed` 가 J6 의 "전송은 있는데 완료가 없는 구간"의 서버측 정본이다.

---

## 8. L5 — 퍼널 등록 · 볼륨 · 보존

### 퍼널 등록

저장 퍼널은 `analytics_insight`(kind/name/config JSON)에 넣는다 — `POST /admin-api/v1/analytics/insights`. 서버는 config 모양을 검증하지 않고 질의 시점에 `funnelBody` 로 다시 검증한다.
제약: **스텝 2~8개**(하드 리밋, `adminRoutes.ts:56`), `windowMinutes` 기본 **7일** · 최대 90일.

퍼널 정의 규칙 셋:

1. **window 를 반드시 명시한다.** 기본 7일은 "언젠가 했나"가 된다. 식사 기록·레시피 읽기·후기 작성 15~60분, 가입·온보딩 1~3일, 저장→회수 같은 습관 퍼널만 7~30일.
2. **앵커를 희소한 의도 이벤트로 옮긴다.** 퍼스트터치 앵커(`min(ts)`)라 `screen:home`·`screen:community` 처럼 매일 찍히는 화면을 스텝1로 두면
   "기간 내 첫 방문"이 앵커가 되어 코호트 지표로 변한다. `food_record_sheet_viewed`·`recipe_write_started`·`doctor_search_viewed` 같은 것을 앵커로 쓴다.
   세션 단위로 보고 싶으면 `app_opened{from_background:false}` 가 좋은 앵커다(이미 나가고 있다).
3. **속성 스코프 퍼널은 전 스텝이 그 키를 실을 때만** (P1).

### 볼륨

제안 카탈로그 기준 세션당: 일반 열람 25~40 · 식사 1건 기록 45~70 · 레시피/식당 탐색 40~80 · 스토리 포함 최대 150~200 · 가입+온보딩 당일 120~160.
**1인 60~90 이벤트/일**(1.2세션 가정). 행당 0.7~1.0KB(heap 400B + 인덱스 7개 350B).

| DAU | 행/일 | 디스크/일 | 90일 |
|---|---|---|---|
| 1,000 | 6~9만 | 50~70MB | ~5GB |
| 5,000 | 30~45만 | ~300MB | ~27GB |
| 10,000 | 60~90만 | ~700MB | ~60GB |

**환자 기록과 같은 Postgres 다.**

### 먼저 깨지는 곳 (쓰기가 아니다)

| 순위 | 어디 | 왜 |
|---|---|---|
| 1 | **퍼널/경로 질의** | `scoped` CTE 가 기간 내 전 이벤트를 materialize 한다. 이벤트 4~6배면 수백만~수천만 행. → §3 의 이름 술어 푸시다운이 선행 |
| 2 | **IP 레이트리밋** | `/api/v1/analytics/batch` IP당 5분 60회(`rateLimit.ts:204`, Valkey 전역). 국내 CGNAT 은 다수가 한 공인 IP 를 쓴다. 429 → 백오프 150초 → 큐 500 초과 → **오래된 것부터 폐기**(`transport.ts:252`) = 하필 세션 앞머리 = 퍼널 1스텝 |
| 3 | **소급 귀속 UPDATE** | `writer.ts:105` 의 중복 방지 Set 이 **프로세스 메모리**다. Cloud Run 인스턴스 교체·스케일아웃마다 전 활성 기기에 UPDATE 폭풍 |

처방: (a) flush 임계값 20→**50**(`transport.ts:38`, 배치 상한 100이라 계약 무변경, 요청 수 2.5배 감소, 서버 0줄)
(b) `writer.ts:97-100` 의 `updateMany` 가 돌려주는 count 가 0이면 그 기기는 이미 연결된 것이므로 `backfillIdentity` 를 부르지 않는다(영속 정본 사용)
(c) 필요하면 IP 한도 60→200/5분. 최종 방어선은 writer 의 초당 2,000행이라 적재 폭주는 여전히 막힌다.

### 관측의 관측 (이벤트 400개를 붙이는 동안 반드시)

지금은 "안 찍힌 것"과 "서버가 버린 것"이 구분되지 않는다. `routes.ts:94-98` 은 reserve 실패 시 조용히 버리고 200/accepted:0 을 주며,
클라이언트는 응답 본문을 **읽지도 않는다**(`transport.ts:359-370` 은 `response.ok` 만 본다). `writer` 의 `droppedCount`/`queuedCount` 는 전 저장소에서 참조 0건이다.

1. `routes.ts` 에서 `rejected > 0` 이면 이름 표본과 함께 warn 로그
2. `writer` 의 dropped/queued 를 `/admin-api/v1/analytics/live/summary` 나 헬스 지표에 노출
3. 클라이언트도 응답의 `accepted`/`rejected` 를 `logger.debug` 로 남긴다

### 보존

원본 **90일**(퍼널 최대 window 와 같게) + 일별 롤업.

- `analytics_event` 를 `server_ts` 월 단위 RANGE 파티션으로(마이그레이션 085). 인덱스 7개짜리 표에서 대량 DELETE 는 파티션 DROP 보다 훨씬 비싸다.
- 야간 롤업표 `analytics_event_daily(day_kst, app_env, name, screen_name, users, sessions, events)` → timeseries/breakdown 이 이걸 읽는다.
  **탈퇴 CASCADE 로 원본이 사라져도 지표가 살아남는 유일한 방법**이다(084 가 users FK 에 의도적으로 CASCADE 를 걸었다 — 탈퇴 퍼널은 시간이 지나면 자기 분자를 지운다).
- `props` 에는 인덱스가 하나도 없다. 속성 축 분석(mode·slot·fail_kind 별 비교)을 계속 쓸 거면 GIN(jsonb_path_ops) 또는 고빈도 키 표현식 인덱스를 붙인다.

### 고빈도 이벤트 8개는 구현 규약으로 상한을 건다

`community_story_viewed` · `recipe_ingredient_checked` · `restaurant_detail_scrolled` · `restaurant_list_paged` · `food_analysis_progressed` ·
`health_entry_input_started` · `kidney_profile_field_changed` · `exam_ocr_item_edited`
— **세션/대상당 1회 ref 가드 + 순번 상한** 필수. 이 8개가 세션당 이벤트를 80에서 200으로 밀어 올리는 전부다.

---

## 9. 사각지대 — 여정 스펙에 안 잡히는 이탈 다섯

### ① 정책 게이트: 갇힌 사람은 이벤트를 **한 개도** 안 남긴다

`app/_layout.tsx:263-265` 는 `<AppPolicyGate><RootLayoutNav/></AppPolicyGate>` 이고, `useAnalyticsLifecycle`·`initAnalyticsLifecycle()`·`app_launch_started` 는 **전부 `RootLayoutNav` 안**이다(`:39,:53`).
게이트가 `checking`(첫 실행·캐시 없음, 10초 × 2회)이거나 `isBlocking`(force_update·maintenance·unsupported_contract)이면 `RootLayoutNav` 가 마운트되지 않는다.
강제 업데이트 화면은 안드로이드 뒤로가기까지 막고 나가는 길이 스토어 버튼 하나뿐인 **100% 이탈 지점**인데 구조적으로 관측 불가다.
동시에 **DAU·`app_launch_started` 분모가 조용히 줄어든다** — 차단된 사람과 "실행하지 않은 사람"이 구분되지 않는다.

→ `useAppPolicyGate` 안에서 `initAnalyticsLifecycle()` 을 직접 부르고 `app_policy_evaluated{decision, source, blocked}` · `app_policy_store_opened` · `app_policy_check_slow` 를 쏜다. **코드 구조 변경이 선행 조건이다.**
(`__DEV__` 에서는 게이트가 통째로 비활성이라 개발 중에는 이 코호트가 재현되지 않는다.)

### ② 식당 탭은 피처 플래그 뒤에 있다

`isRestaurantTabEnabled` 의 fallback 이 **false** 이고, 꺼져 있으면 `RestaurantComingSoon` 을 그린다(`app/(tabs)/restaurant.tsx:67-69`).
정책 응답이 실패해 폴백으로 내려간 사용자는 **항상 꺼진 쪽**이다. `restaurant_coming_soon_viewed`/`restaurant_report_*` 가 없으면
식당 지표가 0에 가까울 때 "기능이 안 팔린다"와 "플래그가 꺼져 있다"를 구분할 수 없다.

### ③ 딥링크 진입이 관측되지 않는다

`app/+native-intent.tsx` → `entryIntent.ts` 가 URL 을 셋으로 판정하는데(라우팅 / 우리 것인데 없는 라우트 / 남의 스킴) 뒤 둘은 null 반환으로 조용히 버려지고,
못 맞춘 나머지는 `app/+not-found.tsx:45` 에서 `logger.debug` 한 줄로 끝난다.
→ `app_entry_from_link{verdict:'routed'|'unknown_route'|'foreign_scheme'}`. 공유(`src/shared/utils/share.ts`, 5개 화면 통합)가 돌아왔는지 볼 유일한 방법이다.

### ④ 홈을 덮는 인터스티셜 셋

공지 팝업(`home.tsx:58-62`, '오늘 하루 안 보기') · 식사분석 복구 시트(포그라운드 복귀마다, TTL 10분) · 권장 업데이트 오버레이 — 셋이 같은 순간 홈 위에 겹칠 수 있다.
J2 의 "홈 → 식사 기록" 퍼널 1→2 하락이 "기록할 마음이 없었다"인지 "팝업 닫느라 나갔다"인지 지금은 구분 불가다.
특히 **복구 경로 자체(recoveredCount / remainingCount / TTL 만료 폐기)에 이벤트가 하나도 없다.**

### ⑤ 로그아웃 두 종 — 그중 하나는 이탈 해석을 통째로 왜곡한다

명시적 로그아웃(`SettingsScreen.tsx:319`)과 **자동 로그아웃**(`useAuth.ts:272-276`: `sessionPersistence==='ephemeral'` 계정은 백그라운드 진입 즉시 `signOut("automatic")`).
자동 로그아웃 계정군은 앱을 잠깐 내렸다 올리면 로그인 화면이므로 **모든 여정이 백그라운드에서 절단되고** `screen:login` 재방문이 부풀며 로그인 퍼널 분모에 재로그인이 섞인다.
→ `auth_signed_out{reason:'explicit'|'automatic'}`.
덧붙여 로그아웃 시 `resetAnalyticsIdentity()` 는 익명 id 를 유지하므로(`analyticsClient.ts:126-129`), 로그아웃 후 익명 이벤트는 **같은 기기에서 다음에 로그인한 사람에게 소급 귀속된다.**

### 확인 결과 없어서 안 해도 되는 것

결제·구독(IAP/RevenueCat 의존성 없음) · 위젯 · OTA 업데이트(expo-updates 미설치) · 오프라인 감지(NetInfo 미설치).
웹뷰 표면은 카카오 지도 하나뿐이고 `restaurant_map_degraded{reason}` 로 부분 계측돼 있다.

---

## 10. 구현 순서 (이 순서를 바꾸면 지울 이벤트를 먼저 만들게 된다)

| 단계 | 무엇 | 범위 | 검증 |
|---|---|---|---|
| **0** | 퍼널 순서 축 `(server_ts, id)` + 스텝 이름 술어 푸시다운 + backfill 조건화 + server_ts 초 절삭 제거 | 서버 3파일, **앱 변경 0** | `bun test`(sinsin_test): 한 배치·같은 server_ts 로 3스텝이 들어온 사람이 3스텝을 통과 |
| **1** | `ROUTE_SCREEN` 표 + `AnalyticsScreenName` 교체 + 라우트 트리 대조 테스트 | 앱만(서버·DB 무변경) | `collectRouteKeys` 재사용 테스트가 누락 시 CI 실패. `tests/analytics.test.ts` 동적 세그먼트 케이스 수정 |
| **2** | L2 가로지르는 8개 + `form_validation_failed` | 단일 통로 8곳 | `tests/errorGuidance.test.ts` · `tests/navigationBackGuard.test.ts` · `tests/formValidationState.test.ts` · `tests/analytics.test.ts`·`analyticsFlow.test.ts`. **새 키는 전부 `sanitizeAnalyticsProperties` 테스트에 케이스 추가**(클라+서버 합집합 정규식) |
| **3** | §9 사각지대 5종(정책 게이트·로그아웃·딥링크·인터스티셜·식당 플래그) + 관측의 관측 2줄 | 앱 + 서버 로그 | `tests/mobilePolicy.test.ts` · `tests/entryIntent.test.ts` · `tests/deepLinkFormat.test.ts` · `tests/announcement.test.ts` · `tests/sessionCleanup.test.ts` · `tests/foodCameraRecovery.test.ts` |
| **4** | **J1·J2 만** 켜고 실측 | 앱 | 세션당 실제 이벤트 수 · CGNAT 뒤 429 발생 · 퍼널 형태. 실측 전에 7여정을 한꺼번에 켜지 않는다 |
| **5** | 파티셔닝·일별 롤업(085) → 그 다음 J3·J4·J6 → 마지막 J5·J7 | 서버/DB | 롤업 전에 커뮤니티·검진을 켜지 않는다(볼륨 상위 두 여정) |

---

## 11. 한계 — 약속하면 안 되는 것 넷

1. **오프라인 이탈은 측정할 수 없다.** NetInfo 가 없어 오프라인은 요청이 실패한 뒤 `resolve.ts:216` 이 사후 판정하는 것뿐이다. "오프라인이라 시도조차 못 한 사람"은 관측 불가능하다. (분석 큐 자체는 AsyncStorage 영속이라 이벤트는 안 잃는다.)
2. **`locale` 차원은 앱 언어가 아니다.** `deviceContext.ts:47` 은 OS 로케일이고 모듈 수준에서 한 번 캐시된다 — 앱에서 언어를 바꿔도 그 실행 내내 안 바뀐다.
3. **`app_version` 은 JS 번들 버전**(`Constants.expoConfig.version`)이라 정책 게이트가 판정에 쓰는 네이티브 버전과 **다른 축**이다.
4. **"이탈 = 사용자가 떠났다"가 아니다.** 사용자 의사와 무관하게 여정을 끊는 장치가 최소 셋 있다 — (a) ephemeral 계정의 백그라운드 자동 로그아웃, (b) `resolveGuard` 의 관문 리다이렉트가 떠 있는 모달을 전부 접고(`router.dismissAll()`, `app/_layout.tsx:145`) 목적지 하나로 갈아끼우는 동작(상담·스토리 모달 안에서 진행 중이던 퍼널이 통째로 사라진다), (c) 푸시 리스너 관문(`app/_layout.tsx:93-96`)에 걸린 계정은 라우팅이 버려진다.
   셋 다 이벤트가 없으면 모든 `*_abandoned` 와 중간 하락은 **"사람의 포기"와 "시스템의 절단"을 섞어서 센다.**

---

## 12. 실제 적용된 것 (2026-08-18, 0~3단계)

설계의 **0~3단계가 코드에 들어갔다.** 4단계(J1·J2 여정 이벤트)와 5단계(파티셔닝·롤업)는 아직이다 —
그 순서는 §10 그대로이고, 4단계는 실측(세션당 이벤트 수·429 발생·퍼널 형태)을 보고 켜는 것이 설계의 전제다.

### 서버 (`sinsin-be-bun`)

| 무엇 | 어디 |
|---|---|
| 퍼널 순서 축 `(server_ts, id)` 행 비교 + 앵커 `distinct on` | `queries/funnel.ts` |
| 스텝 이름 술어 푸시다운(event-only·screen-only 모두 성립) | `queries/funnel.ts` `stepNamePredicate` |
| `server_ts` 밀리초 유지(파일 안에서만 — `naiveUtcTimestamp` 는 안 건드린다) | `routes.ts` `batchServerTimestamp` |
| `rejected > 0` 이면 이름 표본 5개로 warn (값은 안 싣는다) | `routes.ts` |
| 소급 귀속을 기기 대장 count 로 조건화 — 인스턴스 교체마다 돌던 UPDATE 폭풍 제거 | `writer.ts` |
| 서버 발화 `srv_*` 8종 + `submitServer`(기기 대장·소급 귀속 우회) | `serverEvents.ts` · `writer.ts` · foodcamera 5 · chat 3 |
| 센티널 세션을 세션 KPI 전부에서 제외 | `scope.ts` `SESSION_COUNT` · `overview.ts` · `sessions.ts` |
| **센티널을 무인증 수집 경로에서 예약** — 누구나 보내면 자기 이벤트를 KPI 에서 숨길 수 있었다 | `record.ts` |
| 세션 체류를 `SPAN_TS` 로 — client_ts 는 server_ts 와 1시간 안일 때만 믿고, span 은 0~24시간으로 조인다 | `scope.ts` · `overview.ts` · `sessions.ts` |
| 사람 화면의 기기 스냅샷에서 센티널 제외(폴백 포함) | `queries/people.ts` |
| 라이브 게이지의 `activeUsers` 에서 센티널 제외 | `queries/live.ts` |

`bun test` 8,300+ 통과 · `tsc --noEmit` 클린.

### 앱 (`sinsin-rn`)

| 무엇 | 어디 |
|---|---|
| 화면 축 70개(라우트 키 표 조회 + `[id]` 정규화, 그룹 폴백 없음) | `features/analytics/events.ts` |
| 라우트 트리 대조 회귀 테스트(스캐너는 `routeGraph` 테스트와 공유) | `tests/analyticsScreenTable.test.ts` · `tests/helpers/appRouteKeys.ts` |
| 가로지르는 공용 계측 9개(§5 여덟 + `form_validation_failed`) | `present.ts` · `actions.ts` · `useGoBack` · `ConfirmExitModal` · `V2EmptyState` · `V2ErrorState` · `useLoadingVisible` · `V2BottomSheet` · `formValidationState` |
| 사각지대 5종 — 정책 게이트 · 로그아웃 2종 · 딥링크 · 홈 인터스티셜 3 · 식당 플래그 오프 | `useAppPolicyGate` · `+native-intent` · `+not-found` 등 |
| 전송기: flush 임계값 20→50, 응답 `accepted`/`rejected` 읽기 | `transport.ts` |
| 새 속성 키를 **클라+서버 정규식 합집합**으로 못 박는 테스트(서버 정규식 사본 포함) | `tests/analyticsCrossCutting.test.ts` |

`tsc --noEmit` 클린 · eslint 오류 0.

### 적대적 리뷰에서 잡혀 고친 것

1. **세션 KPI 를 기기 하나가 삼킬 수 있었다.** `client_ts` 를 행 단위로 무조건 믿어서, 부팅 직후 시계가
   2001년인 안드로이드 행 하나가 세션 하나를 25년짜리로 만들었다(실측 `durationSec` 808,117,230).
   한 세션에 시계가 다른 두 행이 섞이면 10초가 3시간이 됐다. → `SPAN_TS` + span 상한, 두 케이스 모두 테스트로 박제.
2. **서버 발화가 사람의 기기 정보를 덮었다.** 사람 목록·상세가 `max(id)` 로 최신 행을 잡는데 그게 `srv_push_sent`
   면 앱 버전·OS·기기가 빈칸이 되고 상세의 anonymousId 가 `server_backend` 로 표시됐다. 분석 완료 푸시는 앱이
   닫힌 뒤에 나가므로 드문 경우가 아니다. → 센티널 제외 + 폴백(서버 발화만 있는 사람이 목록에서 사라지지 않게).
3. `app_policy_check_slow` 가 스테일 가드보다 먼저 나가 **버려진 검사까지** 세고 있었다. → 가드 뒤로 이동.
4. 스토어 열기 계측이 `try` 안에 있어, 발화가 던지면 스토어는 열렸는데 오류 문구가 뜨고 이벤트가 두 번 나갔다. → 밖으로.
5. `compose_exit_*` 가 **죽은 v1 에디터**를 근거로 "넷"을 단정했다. → 살아 있는 셋으로 고치고, 그 파일이 마운트되지
   않는다는 사실 자체를 별도 테스트로 못 박았다.
6. `toFormValidationFailure` 가 커버리지 0 이었다(`first_fail` 은 이 이벤트의 유일한 구분축이다). → 5케이스 추가.

### 이번 적용으로 새로 생긴 한계 (§11 에 더한다)

- **`avgSessionSec`·`durationSec` 의 정의가 2026-08-18 부로 바뀌었다.** 시계열이 이 날 꺾인다 — 전후를 같은 자로 비교하면 안 된다.
- **`medianSecFromPrev` 는 여전히 0초가 대량으로 나온다.** 인원은 정확하다(순서 축을 고쳤다). 소요 시간만 배치 단위로 양자화된 채다 — 대시보드에 그 문구가 필요하다.
- **사람 축(리텐션·인게이지먼트·브레이크다운)에는 `srv_*` 가 섞인다.** 세션 축만 걷어냈다. 리텐션은 "앱을 안 켰지만 서버 이벤트가 있는 날"을 복귀로 세고, os·app_version 브레이크다운에서 `srv_*` 는 전부 null 버킷이다.
- **레이트리밋은 완전히 해소되지 않았다.** flush 임계값 상향은 버스트에만 듣고, 꾸준한 세션은 15초 주기가 지배해 기기당 5분에 최대 20요청이다. CGNAT 뒤 3대 이상이 동시에 활발하면 여전히 429 → 백오프 → 큐 머리(=퍼널 1스텝) 유실이다. 5단계에서 IP 한도 또는 신원 축을 손봐야 한다.
- **`[id]` 정규화의 그럴듯한 오답**: 동적 부모 아래 새 정적 라우트(`app/restaurant/nearby.tsx` 같은)는 `other` 가 아니라 `restaurant_detail` 이라는 틀린 이름을 받는다. 유일한 방어선이 `tests/analyticsScreenTable.test.ts` 이므로 이 스위트는 CI 에 반드시 남아야 한다.
- **발화 계약(마운트당 1회·열림/닫힘 짝)은 소스 텍스트 검사로만 증명된다.** 이 저장소에는 컴포넌트 렌더 테스트 도구가 없다(새 의존성 금지). 구조적 보장일 뿐 실행으로 검증된 것은 아니다.

### 4단계 — J1·J2 여정 계측 (2026-08-19)

초안 106개(J1 61 · J2 45)를 그대로 만들지 않았다. **J1 은 20개만, J2 는 26개만 새로 만들고 나머지는 뺐다** —
공용 통로(L2)와 화면 축(L1)이 이미 덮기 때문이다. 뺀 목록과 "무엇이 대신 덮는가"는 J1-5 · J2-5 절에 있다.
대표적으로 화면 진입 이벤트는 전부 `screen:` 스텝으로, `*_load_failed`·`*_retry_pressed`·시트 열림/닫힘·
폼 유효성은 공용 이름으로 대체했다.

**남긴 것 중 핵심** — 공용 통로가 구조적으로 못 덮는 자리다:
- `auth_social_login_cancelled` — 지금까지 취소가 실패로 찍혀 **소셜 실패율이 부풀어 있었다.** 이 여정 최대의 이탈.
- 가입 6질문의 **완료 축**(`auth_signup_step_completed/reverted/blocked`) — 한 라우트라 화면 축으로는 못 가른다.
  닉네임 중복은 서버 200 응답이라 어떤 오류 통로도 안 지나간다.
- OTP 3종을 네 표면이 공유하는 한 가족으로(`auth_code_requested/verify_failed/expired` + `source`).
  `requested` 를 **발송 성공 뒤**로 옮겨 초안의 `*_code_send_failed` 가 통째로 필요 없어졌다.
- `food_record_consult_started/failed` — 결과 화면에서 상담으로 빠지는 **네 번째 문**. 없으면 "결과를 봤는데 안 담았다"에
  이 여정 최대의 전환이 섞인다(§J2-0 정정 2).

**인증 화면의 실패는 공용 통로로 대체할 수 없었다**: `presentAuthFailure` 는 카탈로그가 `surface:'dialog'` 로
판정한 것만 `presentError` 로 넘기고 나머지는 인라인으로 직접 그린다 — 즉 가장 흔한 실패들(틀린 비밀번호·미가입·
OTP 오타·닉네임 중복)은 `app_error_presented` 에 한 행도 안 남는다. 그래서 그것들만 남기고, 분류는 새로 짓지 않도록
`toAnalyticsFailKind`(= `resolveError` 의 `code ?? kind`) 한 벌을 다섯 호출부가 공유한다.

#### 적대적 리뷰에서 고친 것 (코드 1 · 퍼널 정의 8)

**코드**: `auth_code_expired` 가 **인증에 성공한 사람에게서** 나갔다. 이메일 연결 모드의 성공 분기가 `setTimer(0)` 을
부르면서 `codeSent` 는 true 로 남기는데, 화면은 그 값을 `awaitingCode` 블록 안에서만 읽어 눈에 안 띄었고 계측은
블록 밖이었다. 게다가 이 화면은 성공 뒤 `router.push` 라 마운트된 채다 — 지표가 정확히 뒤집히는 자리였다.
`awaitingCode` 를 판정에 넣고, **모양이 아니라 술어**를 검사하는 테스트로 못 박았다.

**퍼널 정의 8건** — 전부 "그대로 등록하면 거짓 이탈을 그리는" 것들이다:
1. J2 F1·F3·F7 이 `screen:home` 을 앵커로 썼다. 퍼스트터치 앵커 + 30~60분 창이라 **7일 대시보드에서 3일째 기록한 사람은
   전원 1→2 하락**이 된다. 설계 §8 규칙 2 가 이름까지 지목해 둔 것을 어긴 자리다 → 의도 이벤트를 앵커로.
2. J1 F3 의 스텝1 `auth_signup_started` 는 **소셜 가입에서도** 나간다 → `screen:signup_email`.
3. F1 의 항등식이 거짓이었다(신규 소셜 가입자는 `succeeded` 를 안 쏘고 early return 한다) → 항을 하나 더한다.
4. F7 이 지목한 `app_error_presented{code:'TOKEN_ERROR_006'}` 행은 **영원히 0**이다(그 catch 는 `presentError` 를 안 부른다).
5. J2 F5·F4 의 스텝1 `food_record_result_viewed` 는 **저장본 열람**에서도 나가는데, 저장본은 확인창·담기 경로를
   구조적으로 못 탄다 → `food_analysis_succeeded` 로 분모를 좁힌다.
6. J2 F2 의 검산식에서 `replaced` 를 뺐다(사진을 다시 골라도 시트가 안 닫혀 accepted/cancelled 를 또 쏜다).
7. J2 F1 의 분모에서 `food_record_skipped` 를 뺀다(건너뛰기는 성공한 기록인데 사진 파이프라인의 이탈로 세어졌다).
8. J1 F5 의 앵커를 화면으로(네 표면이 `auth_code_requested` 를 공유해 다른 표면이 앵커를 선점했다).

검증: 앱 계측 스위트 13파일 **320 통과** · `tsc --noEmit` 클린 · eslint 오류 0.

---

# 부록 — 여정별 상세 스펙

각 여정은 **정정(검증에서 확정) → 단계 → 이벤트 → 퍼널 → 주의** 순이다.
"정정" 표에 있는 항목이 그 아래 이벤트·퍼널 표보다 **우선한다**(초안이 코드와 어긋난 자리를 적대적 검증으로 잡은 것이다).

---

## J1. 진입 · 로그인 · 회원가입 · 온보딩

> 진입 · 로그인 · 회원가입 · 온보딩

### J1-0. 검증에서 확정된 정정 (3건)

| 대상 | 종류 | 무엇이 틀렸나 | 어떻게 고치나 |
|---|---|---|---|
| `퍼널 F6 '약관 화면 통과' (auth_terms_item_toggled → auth_signup_started)` | funnel_constraint | 소셜 모드에서는 auth_signup_started 가 약관 화면보다 **먼저** 나간다 — src/hooks/useAuth.ts:171 이 소셜 로그인 응답이 consent_required 일 때 쏘고, 그 다음에야 terms-agreement 로 push 된다(useSocialLogin.ts:33-41). 약관 화면의 '다음'(useTermsAgreement.ts:80 handleSocialNext)은 auth_signup_started 를 쏘지 않는다. 그런데 제안된 auth_terms_item_toggled 는 method:'social' 을 포함하므로 소셜 사용자도 스텝1에 들어오고, 스텝2는 엄격 부등호라 절대 매칭되지 않는다. 소셜 가입자 전원이 이탈로 계산된다. | F6 스코프를 prop:method=email 로 잡거나(단 auth_signup_started 는 method 를 갖고 있어 이건 가능), 소셜 모드용 스텝2를 auth_signup_completed{social}/auth_signup_failed{stage:'consent'} 로 분리한 별도 퍼널로 세울 것. |
| `notes '[profile-setup 은 세 모드가 한 라우트다]' — mode='signup' 스코프 권고` | funnel_constraint | '대시보드 퍼널은 mode="signup" 스코프에서 읽어야 한다' 는 권고가 엔진상 역효과다. scope.ts:130 의 prop 필터는 `(e.props->>'mode') = 'signup'` 이고, funnel.ts:82-86 은 그 scopeWhere 를 `scoped` CTE 에 통째로 건다. mode 를 안 싣는 이벤트는 props->>'mode' 가 NULL 이라 전부 탈락한다 — F4 의 마지막 스텝 auth_signup_completed(props: method 뿐)는 0이 되고, F3 은 6스텝 중 5스텝(signup_started·code_requested·email_verified·password_submitted·signup_completed)이 통째로 사라진다. (스코프가 속성 단위로 되는지 확인 필요하다고 적힌 부분의 답: 된다. 그래서 더 위험하다.) | mode 를 auth_signup_completed·auth_signup_failed·auth_signup_code_requested·auth_signup_password_submitted 에도 함께 실어야 그 스코프가 성립한다. 아니면 스코프 권고를 지우고 F4 를 backfill 포함 상한으로 읽는다고 명시할 것. |
| `auth_withdrawal_prompt_viewed vs auth_social_login_blocked{fail_kind:'withdrawal_pending'}` | duplicate | 둘 다 useSocialLogin.ts 의 같은 분기에서 나간다 — :50 이 action.type==='withdrawal_pending' 를 판정하고 :51 이 setWithdrawalPending 하는 연속 두 줄이라 같은 틱·같은 초다. 같은 사람의 같은 사건을 두 이름으로 세게 되어 '소셜 막힘' 총량과 '탈퇴 모달 노출' 총량이 서로를 중복 포함한다(이메일 경로 useEmailLogin.ts:34 는 blocked 이벤트가 없어 source 축도 비대칭이다). | auth_social_login_blocked 의 fail_kind 에서 'withdrawal_pending' 을 빼고 그 갈래는 auth_withdrawal_prompt_viewed{source} 하나로 셀 것. blocked 는 provider_email_required·link_required·generic 세 값만 남긴다. |

### J1-1. 단계 (32)

| # | 단계 | 표면/라우트 | 코드 | 여기서 왜 빠져나가나 | 현재 계측 |
|---|---|---|---|---|---|
| 1 | 앱 시작 · 세션 복구 대기 | `/ (app/index.tsx)` | `app/index.tsx:23` | 복구가 느리거나 오프라인이면 스플래시(LoadingScreen)에서 그대로 종료. 복구 실패해도 화면은 조용히 로그인으로 떨어져 사용자는 '왜 로그아웃됐지'만 남는다 | app_launch_started, auth_session_restore_started, auth_session_restore_failed |
| 2 | 진입 분기 착지(로그인/프로필/온보딩/홈) | `resolveEntryRoute 결과로 Redirect` | `src/shared/navigation/entryRoute.ts:25 (호출: app/index.tsx:26)` | 복귀자가 profile-setup·onboarding 으로 되돌려 보내지면 '또 이거야?' 하고 나간다. 어느 관문으로 몇 명이 떨어지는지 자체가 안 보인다 | 없음 (뒤따르는 screen_viewed 로 간접 추정만 가능) |
| 3 | 로그인 랜딩(이메일 · 구글 · 카카오 · 애플 · 가입 링크) | `/(auth)/login` | `src/features/auth/views/LoginScreen.tsx:104` | 버튼 5개 중 고르지 못함. '가입하기'가 하단 13px 밑줄 텍스트라(LoginScreen.tsx:251) 신규 사용자가 못 찾고 소셜을 누르는 경로로 샌다 | auth_login_viewed, screen_viewed{screen:'login'} |
| 4 | 소셜 로그인 시작 · 네이티브 시트 · 전면 로딩 | `/(auth)/login (오버레이)` | `src/features/auth/hooks/useSocialLogin.ts:25 → src/hooks/useAuth.ts:154 (오버레이 LoginScreen.tsx:266)` | 구글/카카오 시트에서 계정 선택을 망설이다 닫음. 서버 왕복이 길면 전면 로딩에 갇힌 것처럼 보인다 | auth_social_login_started{provider} |
| 5 | 소셜 시트 취소(사용자가 닫음) | `/(auth)/login` | `src/features/auth/hooks/useSocialLogin.ts:49` | 이 여정에서 가장 흔한 조용한 이탈. 코드는 아무 것도 안 하고 return 한다 | 없음 — 다만 useAuth.ts:180 이 취소까지 auth_social_login_failed 로 찍어서 실패율을 오염시키는 중 |
| 6 | 소셜 로그인 막힘 갈래(탈퇴대기 · 이메일 미제공 · 구계정 연결 · 기타) | `/(auth)/login` | `src/features/auth/hooks/useSocialLogin.ts:50 / :54 / :63 / :78` | 네 갈래가 각각 다른 막다른 길(모달·7초 토스트·다른 화면으로 push·다이얼로그). 토스트 갈래는 안내가 사라지면 아무 흔적도 안 남는다 | auth_social_login_failed (갈래 구분 없음) |
| 7 | 탈퇴 대기 계정 확인 모달 | `/(auth)/login 또는 /(auth)/email-login (모달)` | `src/features/auth/views/LoginScreen.tsx:177, src/features/auth/hooks/useSocialLogin.ts:88 / src/features/auth/hooks/useEmailLogin.ts:34` | 모달을 닫으면 갈 곳이 없다(로그인도 가입도 막힘). 취소 실패 시 재시도 다이얼로그에서 다시 이탈 | auth_withdrawal_cancelled (성공만). 노출·닫힘은 없음 |
| 8 | 소셜–이메일 연결(이메일 입력 → 코드 발송 → OTP → 검증) | `/(auth)/social-link-email` | `src/features/auth/views/SocialLinkEmailScreen.tsx:113 / :131 / :171(만료)` | 파라미터가 유실되면 진입 즉시 로그인으로 튕긴다(:88). 이미 다른 계정이 쓰는 이메일이면 이 화면에서 고칠 수 없다 | 없음. 화면 축에서는 'signup' 으로 뭉개짐 |
| 9 | 이메일 로그인 폼 | `/(auth)/email-login` | `src/features/auth/views/EmailLoginScreen.tsx:91` | 비밀번호가 기억나지 않아 '비밀번호 재설정'(:163)으로 새거나 그냥 나간다 | screen_viewed{'login'} 뿐 — login 라우트와 구분되지 않는다 |
| 10 | 이메일 로그인 제출 · 인라인 실패 | `/(auth)/email-login` | `src/features/auth/hooks/useEmailLogin.ts:18 (실패 표시 :41)` | 미가입·정지·오타가 전부 필드 아래 한 줄로 나온다. 반복 실패 후 포기 | auth_email_login_started / succeeded / failed (실패 사유 없음) |
| 11 | 비밀번호 재설정 3단(이메일 → OTP → 새 비밀번호) | `/(auth)/forgot-password` | `src/features/auth/views/ForgotPasswordScreen.tsx:98 / :117 / :142` | 미가입 이메일, 3분 타이머 만료(:159), 재설정 토큰 만료(:149) 세 곳에서 각각 끊긴다 | 없음. 화면 축은 'signup' 으로 오분류(events.ts:234) |
| 12 | 약관 동의 화면 진입(이메일 모드 / 소셜 모드) | `/(auth)/terms-agreement` | `src/features/auth/views/TermsAgreementScreen.tsx:48 (모드 판정 app/(auth)/terms-agreement.tsx:13)` | 가입 여정의 첫 관문. 소셜 모드는 이미 로그인을 마친 사람이 다시 붙잡히는 자리라 체감 비용이 크다 | auth_signup_step_viewed{step:'terms'} (모드 구분 없음) |
| 13 | 약관 개별/전체 토글 · 문서 열람 | `/(auth)/terms-agreement` | `src/features/auth/hooks/useTermsAgreement.ts:53(toggleAll) / :65(toggleItem), 문서: TermsAgreementScreen.tsx:107` | 필수 2개를 안 채우면 CTA 가 잠긴 채로 남는다(:51 canSubmit). '내용보기'로 /legal-document 에 나갔다 안 돌아온다 | 없음 |
| 14 | 약관 '다음' — 이메일 가입 시작 / 소셜 가입 서버 제출 | `/(auth)/terms-agreement` | `src/features/auth/hooks/useTermsAgreement.ts:69(email) / :80(social, 실패 :116)` | 소셜은 여기서 서버 왕복이 있고 만료된 가입 토큰·이미 가입한 계정은 다시 눌러도 안 풀린다. 뒤로 가면 소셜 모드는 로그인으로 replace 되어 진행이 사라진다(:143) | auth_signup_started{method}, auth_signup_completed{social}, auth_signup_failed{stage:'consent'} |
| 15 | 이메일 인증 — 번호 발송 요청 · 발송 실패 | `/(auth)/signup-email` | `src/features/auth/hooks/useSignupEmail.ts:108 (실패 :135, 소셜가입 이메일 :130)` | 이미 가입된 주소(SIGNUP_ERROR_001)·쿨다운(OTP_ERROR_001)·메일 발송 불가(MAIL_ERROR_001)에서 각각 다르게 막힌다 | 없음 (성공한 인증만 뒤에서 찍힘) |
| 16 | 소셜로 가입된 이메일 안내 모달(본인확인 / 다른 이메일) | `/(auth)/signup-email (모달)` | `src/features/auth/views/SignupEmailScreen.tsx:191, src/features/auth/hooks/useSignupEmail.ts:211 / :213` | '가입하려는데 이미 소셜로 있다'는 가장 헷갈리는 자리. 두 선택지 모두 여정이 길어져 여기서 포기 | 없음 |
| 17 | OTP 입력 · 재전송 · 3분 만료 · 검증 | `/(auth)/signup-email` | `src/features/auth/views/SignupEmailScreen.tsx:148(입력) / :181(재전송) / :79(만료), 검증 useSignupEmail.ts:156` | 메일이 안 오거나 늦어서 타이머가 0 이 된다. 오타/만료는 토스트로만 알려 사라진다. 인증되면 자동 전진(SignupEmailScreen.tsx:67)이라 사용자가 멈출 틈은 없다 | auth_signup_email_verified (성공만) |
| 18 | 이메일↔소셜 연결 비밀번호 설정 | `/(auth)/email-login-link-password` | `src/features/auth/views/EmailLoginLinkPasswordScreen.tsx:52 (실패 :67)` | 연결 토큰 만료(TOKEN_ERROR_005)가 가장 흔하고 기다릴수록 더 안 된다. 토큰이 없으면 진입 즉시 되돌려 보낸다(:47) | 없음 |
| 19 | 비밀번호 생성(6~18자 · 2종 조합 · 확인 일치) | `/(auth)/signup-password` | `src/features/auth/views/SignupPasswordScreen.tsx:44, 통과 시 src/features/auth/hooks/useSignupPassword.ts:9` | 규칙을 못 맞추면 CTA 가 계속 disabled 라 '눌렀는데 안 된다'는 신호조차 안 생긴다. 조건은 화면에 회색 한 줄(PasswordCriteriaText)뿐 | auth_signup_step_viewed{step:'password'} (진입만, 성공 축 없음) |
| 20 | 필수정보 Q1 닉네임(+ 넘어갈 때 중복확인 서버 왕복) | `/(auth)/profile-setup` | `src/features/auth/views/SignupStepsScreen.tsx:101, 중복확인 src/features/auth/hooks/useSignupSteps.ts:220 (중복 :230)` | 2~12자·한글/영문/숫자 제한 + 중복은 '다음'을 누른 뒤에야 알려준다. 여러 번 튕기면 여기서 끝 | auth_signup_step_viewed{step:'nickname'} |
| 21 | 필수정보 Q2 생년월일(한 칸 입력) | `/(auth)/profile-setup` | `src/features/auth/views/SignupStepsScreen.tsx:119 (검증 src/features/auth/data/signupSteps.ts:169)` | YYYY.MM.DD 한 칸 자유입력이라 형식·미래날짜에서 막힌다. 피커가 없어 오타 비용이 크다 | auth_signup_step_viewed{step:'birth'} |
| 22 | 필수정보 Q3 성별(기타 포함) | `/(auth)/profile-setup` | `src/features/auth/views/SignupStepsScreen.tsx:138` | 고르기만 하면 되는 가장 가벼운 스텝. 여기서 떨어지면 질문 자체에 대한 거부감(민감 정보 요구)이 원인 | auth_signup_step_viewed{step:'gender'} |
| 23 | 필수정보 Q4 실명 | `/(auth)/profile-setup` | `src/features/auth/views/SignupStepsScreen.tsx:152` | 실명 요구는 이 여정에서 가장 민감한 두 질문 중 하나. 목업에 없던 서버 필수 필드라 사용자 기대와 어긋난다 | auth_signup_step_viewed{step:'name'} |
| 24 | 필수정보 Q5 휴대폰 번호 | `/(auth)/profile-setup` | `src/features/auth/views/SignupStepsScreen.tsx:169 (검증 src/features/auth/data/phoneNumber.ts)` | 연락처 제공 거부가 이 여정 최대 이탈 후보. 인증 목적도 아닌데 번호를 요구한다는 인상 | auth_signup_step_viewed{step:'phone'} |
| 25 | 필수정보 Q6 유입경로 — 시트 열기 · 다이얼 · '기타' 직접입력 · 확정 | `/(auth)/profile-setup (바텀시트)` | `src/features/auth/views/SignupStepsScreen.tsx:190, 시트 src/features/auth/components/AcquisitionSourceField.tsx:160(open) / :211(confirm) / :187(close)` | 필드를 눌러 시트를 열고 → 다이얼을 돌리고 → 확정까지 3동작이 필요하다. '기타'를 고르면 같은 시트가 이유 입력으로 바뀌고 비워두면 확정이 잠긴다(:224). 마지막 관문이라 여기 손실이 곧 가입 손실 | auth_signup_step_viewed{step:'acquisition'} (시트 내부는 전부 무계측) |
| 26 | 스텝 내 뒤로가기 / 가입 포기(첫 스텝에서 뒤로) | `/(auth)/profile-setup` | `src/features/auth/hooks/useSignupSteps.ts:272 (뒤로) / :284 (화면 밖으로 = 가입 중단)` | 6질문 중 어디서 되돌아가는지, 어디서 아예 나가는지가 지금 완전히 안 보인다. 소셜 completion 모드에서는 하드웨어 백이 삼켜져 갇힌 느낌을 준다(SignupStepsScreen.tsx:56) | 없음 |
| 27 | 가입 제출(이메일 signup / 소셜 profile complete) | `/(auth)/profile-setup → /onboarding` | `src/features/auth/hooks/useSignupSteps.ts:123 (submit) / :152 (signup) / :140 (completeProfile)` | 중복 닉네임·중복 이메일·만료 토큰·잘못된 생년월일 네 가지가 여기서 터지고, 앞 스텝이 비면 조용히 그 스텝으로 되돌린다(:130) | auth_signup_completed{method}, auth_signup_failed{method,stage} |
| 28 | 온보딩 진입 — 진단 여부 선택(welcome) | `/onboarding` | `src/features/onboarding/views/OnboardingScreen.tsx:73, 선택 src/features/onboarding/hooks/useOnboarding.ts:193 / 확정 :197` | 가입 직후 또 질문이 시작된다. 뒤로가기가 막혀 있고(:437) 홈으로 건너뛸 출구가 없다 | onboarding_started (welcome 진입·선택·확정은 구분 안 됨) |
| 29 | 질문 목록 로딩 · 로딩 실패 · 재시도/진단 다시 선택 | `/onboarding` | `src/features/onboarding/hooks/useOnboarding.ts:126 (실패 :137 / :160), 실패 화면 OnboardingScreen.tsx:123, 재시도 :161` | 여기서 막히면 그 사람은 앱 기능을 한 번도 못 본다. 실패 화면의 두 버튼(다시 불러오기 / 진단 다시 선택) 중 어느 것도 안 누르고 이탈 | onboarding_steps_loaded{step_count}, onboarding_steps_load_failed (0건과 5xx 가 같은 이벤트) |
| 30 | 온보딩 질문 진행(질문당 진입 → 답변 → 다음 / 뒤로) | `/onboarding` | `src/features/onboarding/hooks/useOnboarding.ts:232(viewed) / :386(completed) / :406(뒤로)` | 질문 수가 8~12개로 길다. 입력형(체중·수치)과 날짜형에서 키보드·형식 때문에 멈춘다. 앞 답을 바꾸면 뒤 질문이 사라져(예방 목적 분기) 인덱스가 사람마다 다른 질문을 가리킨다 | onboarding_step_viewed{step_index,step_count}, onboarding_step_completed{...} (질문 유형·정체는 없음) |
| 31 | 온보딩 제출(답변 저장 + 세션 승격) | `/onboarding` | `src/features/onboarding/hooks/useOnboarding.ts:338 (성공 :359 / 실패 :368)` | ONBOARDING_ERROR_003(이미 마침)은 재시도해도 영원히 실패라 '홈으로' 버튼이 유일한 출구다. 마지막 질문까지 답하고 저장에서 잃는 가장 아까운 이탈 | onboarding_submitted, onboarding_submit_failed (사유 없음) |
| 32 | 온보딩 완료 화면 → '시작하기' → 홈 | `/onboarding (phase='complete') → /(tabs)/home` | `src/features/onboarding/views/OnboardingScreen.tsx:119, src/features/onboarding/hooks/useOnboarding.ts:417` | 완료 화면이 끝으로 안 읽히면 CTA 를 안 누르고 앱을 끈다. 이때 세션은 이미 승격돼 있어 다음 실행은 홈으로 들어오지만, 첫 인상은 잃는다 | onboarding_completion_viewed, onboarding_completion_cta_pressed |

### J1-2. 이벤트 (61 = 신규 36 · 변경 6 · 유지 19)

| 이벤트 | 상태 | 종류 | 속성 | 발화 지점 | 없으면 못 보는 이탈 |
|---|---|---|---|---|---|
| `app_entry_routed` | new | lifecycle | `gate: string — 'login'\|'profile'\|'onboarding'\|'home' (resolveEntryRoute 결과)` | app/index.tsx:26 — Redirect 직전, resolveEntryRoute 결과를 한 번 찍는다 | 복구된 세션이 어느 관문으로 떨어졌는지가 안 보인다. '가입은 끝났는데 매번 profile-setup 으로 되돌아가는 사람' 이 몇 명인지 지금은 셀 수 없다 |
| `auth_acquisition_sheet_confirmed` | new | success | `option: string — APP_STORE\|HOSPITAL\|BLOG\|NAVER_CAFE\|DANGGEUN_COMMUNITY\|KAKAO\|YOUTUBE\|INSTAGRAM\|FRIEND\|OTHER`<br>`has_reason: boolean — OTHER 직접입력을 실제로 채웠는지` | src/features/auth/components/AcquisitionSourceField.tsx:211 — confirm() 의 확정 분기(‘reason’ 단계로 넘어가는 분기는 제외) | 유입경로 자체가 마케팅 지표이면서, 이 시트가 마지막 관문이라 확정률이 곧 가입 완주율이다 |
| `auth_acquisition_sheet_dismissed` | new | abandon | `phase: string — 'list'\|'reason' (어느 단계에서 닫았는지)` | src/features/auth/components/AcquisitionSourceField.tsx:187 — close() 가 confirm 경유가 아닐 때(백드롭/취소) | '기타(직접입력)'로 넘어갔다가 이유를 못 써서 닫는 사람 — 마지막 질문의 숨은 벽 |
| `auth_acquisition_sheet_opened` | new | screen | — | src/features/auth/components/AcquisitionSourceField.tsx:160 — open() | 마지막 질문은 필드를 눌러 시트를 열어야 답이 된다. 시트를 못 연 사람과 열고 못 고른 사람이 다르다 |
| `auth_email_link_completed` | new | success | — | src/features/auth/views/EmailLoginLinkPasswordScreen.tsx:56 — completeEmailLoginLink 성공 | 소셜 계정에 이메일 로그인을 붙이는 곁길의 완주율 |
| `auth_email_link_failed` | new | failure | `fail_kind: string — ApiError.code('TOKEN_ERROR_005' 만료가 대부분) 또는 'network'` | src/features/auth/views/EmailLoginLinkPasswordScreen.tsx:67 — setError 자리 | 연결 토큰 만료는 기다릴수록 더 안 된다 — 빈도를 알아야 유효시간을 손댈지 정한다 |
| `auth_email_link_prompt_resolved` | new | progress | `choice: string — 'verify'(본인확인 진행) \| 'other'(다른 주소로 되돌아감)` | src/features/auth/hooks/useSignupEmail.ts:213 (confirm) / :211 (dismiss) | 이 모달이 사람을 구하는지 내보내는지 |
| `auth_email_link_prompt_viewed` | new | screen | — | src/features/auth/hooks/useSignupEmail.ts:130 — setEmailLoginLinkRequired 직후 | 소셜로 이미 가입된 주소로 가입을 시도한 사람 수. 지금은 0 으로 보인다 |
| `auth_password_reset_completed` | new | success | — | src/features/auth/views/ForgotPasswordScreen.tsx:147 — changePassword 성공 직후, router.replace 전 | 로그인 못 하는 사람이 스스로 복구에 성공한 비율 |
| `auth_password_reset_failed` | new | failure | `stage: string — 'send'\|'verify'\|'reset'`<br>`fail_kind: string — ApiError.code 또는 'mismatch'\|'network'\|'other'` | src/features/auth/views/ForgotPasswordScreen.tsx:111 / :135 / :151 | 3단 중 어디서 끊기는지(미가입 이메일·OTP 만료·재설정 토큰 만료) |
| `auth_password_reset_started` | new | intent | — | src/features/auth/views/ForgotPasswordScreen.tsx:98 — handleSendCode 진입 | 비밀번호 재설정은 라우트가 화면축에서 'signup' 으로 오분류되어(events.ts:234) 지금 완전히 안 보인다 |
| `auth_signup_abandoned` | new | abandon | `step: AnalyticsSignupStep`<br>`step_index: number`<br>`mode: string` | src/features/auth/hooks/useSignupSteps.ts:284 — 첫 스텝에서 뒤로(exitSignup) | '가입 그만두기'의 유일한 명시 신호. 지금은 로그인 화면 재진입으로만 추측한다 |
| `auth_signup_code_expired` | new | abandon | `source: string — 'signup'\|'link'\|'social_link'\|'reset'` | src/features/auth/views/SignupEmailScreen.tsx:79 — codeExpired 가 false→true 로 바뀌는 순간 1회(useEffect) | 3분 타이머가 끝날 때까지 번호를 못 넣은 사람. 메일 지연의 직접 증거 |
| `auth_signup_code_requested` | new | progress | `source: string — 'initial'\|'resend'\|'link'`<br>`attempt_no: number — 이 화면에서 몇 번째 발송 시도인지(1부터)` | src/features/auth/hooks/useSignupEmail.ts:108 (sendCode) / :90 (sendEmailLoginLinkCode) | 인증 화면 진입과 '실제로 번호를 보낸 것' 사이의 격차. 재전송 횟수는 메일 도달 문제의 유일한 신호다 |
| `auth_signup_code_send_failed` | new | failure | `source: string — 'initial'\|'resend'\|'link'`<br>`fail_kind: string — ApiError.code('OTP_ERROR_001' 쿨다운 / 'MAIL_ERROR_001' 발송불가 / 'SIGNUP_ERROR_001' 이미가입 / 'AUTH_ERROR_009' 소셜가입) 또는 'network'` | src/features/auth/hooks/useSignupEmail.ts:135 (reportSendFailure) / :130 (AUTH_ERROR_009 갈래) | '이미 가입된 이메일'로 막힌 사람과 메일이 안 나간 사람을 나눠야 고칠 대상이 갈린다 |
| `auth_signup_code_verify_failed` | new | failure | `fail_kind: string — 'mismatch'(서버 200 + verified:false) \| ApiError.code('OTP_ERROR_002' 만료 / 'OTP_ERROR_003' 오타) \| 'network'` | src/features/auth/hooks/useSignupEmail.ts:145 (showCodeMismatch) / :188 (presentError) | 인증번호 입력 실패 횟수. auth_signup_email_verified 하나만으로는 '한 번에 통과'와 '다섯 번 틀리고 포기'가 같아 보인다 |
| `auth_signup_password_rejected` | new | failure | `fail_kind: string — 'too_short'\|'too_long'\|'combination'\|'mismatch'`<br>`field_slot: string — 'primary'\|'confirm'` | src/features/auth/views/SignupPasswordScreen.tsx:55 / :76 — 각 Controller 의 field.onBlur 에서 값이 있고 규칙 위반일 때 1회(같은 fail_kind 연속 중복은 억제) | CTA 가 disabled 라 '눌렀는데 안 됐다' 이벤트가 존재할 수 없다. 6~18자·2종 조합 중 무엇이 사람을 세우는지 blur 로만 볼 수 있다 |
| `auth_signup_password_submitted` | new | progress | — | src/features/auth/hooks/useSignupPassword.ts:9 — handleNext(=profile-setup 으로 replace 하기 직전) | 비밀번호 화면의 성공 축이 아예 없다. auth_signup_step_viewed{password} 만 있어서 '들어왔는데 못 나간 사람'을 못 센다 |
| `auth_signup_step_blocked` | new | failure | `step: AnalyticsSignupStep`<br>`fail_kind: string — 'invalid_input'(CTA/엔터를 눌렀는데 형식 미달) \| 'taken'(닉네임 중복) \| 'server' \| 'network'`<br>`mode: string` | src/features/auth/hooks/useSignupSteps.ts:230(taken) / :235(network) / :239(server) 및 src/features/auth/views/SignupStepsScreen.tsx:74(hapticInvalid 자리) | 닉네임 중복은 서버 왕복 뒤에야 알려 주는 유일한 실패다. 몇 번 튕기고 포기하는지가 여기서만 보인다 |
| `auth_signup_step_completed` | new | progress | `step: AnalyticsSignupStep — 방금 끝낸 질문`<br>`step_index: number — 0~5`<br>`mode: string — 'signup'(신규) \| 'completion'(소셜 마무리) \| 'backfill'(추가정보)` | src/features/auth/hooks/useSignupSteps.ts:253 (전진 확정) 및 :247 (마지막 스텝, submit 호출 직전) | 필수정보 6질문의 성공 축. 지금은 viewed 만 있어 어느 질문에서 멈췄는지 계산이 불가능하다. 이 이벤트가 없으면 이 여정의 가장 긴 구간이 통째로 깜깜하다 |
| `auth_signup_step_reverted` | new | progress | `step: AnalyticsSignupStep — 되돌아가기 전 질문`<br>`step_index: number`<br>`mode: string` | src/features/auth/hooks/useSignupSteps.ts:277 — stepIndex > 0 인 goBack | 뒤로가기가 몰리는 질문 = 답을 잘못 이해했거나 앞 답을 고치고 싶은 질문 |
| `auth_social_link_code_requested` | new | progress | `provider: string`<br>`attempt_no: number` | src/features/auth/views/SocialLinkEmailScreen.tsx:113 — handleSendCode | 구계정 소셜 연결 경로. 이 화면 전체가 지금 무계측이고 화면축에서는 'signup' 으로 섞인다 |
| `auth_social_link_completed` | new | success | `provider: string` | src/features/auth/views/SocialLinkEmailScreen.tsx:137 — verifySocialLinkEmailCode 성공 | 연결 성공률 |
| `auth_social_link_failed` | new | failure | `provider: string`<br>`stage: string — 'send'\|'verify'`<br>`fail_kind: string — ApiError.code 또는 'network'\|'expired_params'` | src/features/auth/views/SocialLinkEmailScreen.tsx:125 / :165 (+ :88 파라미터 유실로 로그인으로 튕기는 경우) | 토큰 없이 들어와 바로 로그인으로 튕기는 사람(:88)이 있는데 지금 흔적이 없다 |
| `auth_social_login_blocked` | new | failure | `provider: string`<br>`fail_kind: string — 'withdrawal_pending'\|'provider_email_required'\|'link_required'\|'generic'` | src/features/auth/hooks/useSocialLogin.ts:50 / :54 / :63 / :78 — 네 갈래 각각 | 각 갈래의 다음 걸음이 완전히 다르다(모달·토스트·연결화면·다이얼로그). 어느 막다른 길이 실제로 붐비는지 모르면 고칠 순서를 못 정한다 |
| `auth_social_login_cancelled` | new | abandon | `provider: string` | src/features/auth/hooks/useSocialLogin.ts:49 — action.type === 'cancelled' 분기 | 소셜 이탈의 최대 구간. 지금은 useAuth.ts:180 이 취소까지 failed 로 찍어서 소셜 실패율이 통째로 부풀어 있다 |
| `auth_terms_abandoned` | new | abandon | `method: string — email\|social`<br>`required_met: boolean — 필수 두 개를 다 켠 상태였는가`<br>`marketing_on: boolean` | src/features/auth/hooks/useTermsAgreement.ts:143 — handleBack | 약관까지 왔다가 되돌아간 사람. 소셜 모드에서는 로그인으로 replace 되어 흔적이 지워진다 |
| `auth_terms_document_opened` | new | progress | `item: string — 'service'\|'privacy'` | src/features/auth/views/TermsAgreementScreen.tsx:107 — openLegalDocument | /legal-document 로 나갔다가 안 돌아오는 이탈. 그 라우트는 화면축에서 'other' 라 지금 흔적이 없다 |
| `auth_terms_item_toggled` | new | progress | `item: string — 'service'\|'privacy'\|'marketing'\|'all'`<br>`agreed: boolean — 켠 것인지 끈 것인지`<br>`method: string — email\|social` | src/features/auth/hooks/useTermsAgreement.ts:65 (toggleItem) / :53 (toggleAll → item:'all') | 약관 화면 이탈은 '아무것도 안 눌렀다'와 '누르다 말았다'가 다르다. 마케팅 동의율도 여기서만 나온다 |
| `auth_withdrawal_prompt_dismissed` | new | abandon | `source: string` | src/features/auth/hooks/useSocialLogin.ts:124(dismissWithdrawalPending) / src/features/auth/hooks/useEmailLogin.ts:46 | 모달을 닫으면 갈 곳이 없다 — 여기서 앱을 뜨는 사람 |
| `auth_withdrawal_prompt_viewed` | new | screen | `source: string — 'social'\|'email'` | src/features/auth/hooks/useSocialLogin.ts:51(setWithdrawalPending) / src/features/auth/hooks/useEmailLogin.ts:34 | 탈퇴 대기 계정이 로그인을 시도한 횟수. 지금은 취소에 성공한 사람만 보인다 |
| `onboarding_step_reverted` | new | progress | `step_index: number`<br>`step_count: number` | src/features/onboarding/hooks/useOnboarding.ts:406 — currentStepIndex > 0 인 뒤로가기 | 뒤로 가서 앞 답을 바꾸면 뒤 질문이 사라질 수 있다(예방 목적 분기). 순번 퍼널 해석의 보정치 |
| `onboarding_steps_retry_pressed` | new | progress | — | src/features/onboarding/hooks/useOnboarding.ts:202 — retrySteps (OnboardingScreen.tsx:161 의 '다시 불러오기') | 실패 화면에서 재시도한 사람 대 그냥 나간 사람 |
| `onboarding_welcome_confirmed` | new | progress | — | src/features/onboarding/hooks/useOnboarding.ts:197 — handleWelcomeConfirm(질문 로딩을 태우는 자리) | 온보딩 첫 관문의 통과. 선택값(진단 여부)은 건강정보라 싣지 않는다 — 통과 여부만 센다 |
| `onboarding_welcome_returned` | new | abandon | — | src/features/onboarding/hooks/useOnboarding.ts:399 — 첫 질문/실패 화면에서 welcome 으로 되돌아가며 resetProgress 하는 분기 | 진행이 초기화되는 유일한 자리. 여기를 왕복하는 사람은 사실상 갇힌 사람이다 |
| `onboarding_welcome_viewed` | new | screen | — | src/features/onboarding/views/OnboardingScreen.tsx:73 — phase==='welcome' 로 처음 그려질 때 1회 | 복원된 진행이 있으면 welcome 을 건너뛰고 바로 질문으로 간다(useOnboarding.ts:178). started 만으로는 '첫 질문을 본 사람'과 '복귀자'가 섞인다 |
| `auth_email_login_failed` | change | failure | `fail_kind: string — ApiError.code('AUTH_ERROR_001' 미가입 / 'AUTH_ERROR_007' 정지 / 'LOGIN_ERROR_001' 비번불일치) 또는 'network'\|'other'` | src/hooks/useAuth.ts:148 | '비밀번호가 틀렸다'와 '가입한 적이 없다'는 완전히 다른 이탈인데 지금 한 숫자다 |
| `auth_social_login_failed` | change | failure | `provider: string`<br>`fail_kind: string — 서버 오류코드 계열('AUTH_ERROR_002'/'AUTH_ERROR_007') 또는 'network'\|'native'\|'other'. ApiError.code 를 그대로 넣되 코드가 없으면 범주로 접는다` | src/hooks/useAuth.ts:180 — catch 에서 error 분류를 붙인다 | 지금은 취소·정지계정·네트워크가 한 숫자다. 무엇도 고칠 수 없다 |
| `onboarding_step_completed` | change | progress | `step_index: number`<br>`step_count: number`<br>`step_kind: string — 'only'\|'multi'\|'input'\|'date'` | src/features/onboarding/hooks/useOnboarding.ts:386 | 질문별 통과. step_kind 없이는 왜 막히는지 추측만 남는다 |
| `onboarding_step_viewed` | change | screen | `step_index: number`<br>`step_count: number`<br>`step_kind: string — 'only'\|'multi'\|'input'\|'date' (질문 유형. 질문 내용·번호는 싣지 않는다)` | src/features/onboarding/hooks/useOnboarding.ts:232 | index 는 분기에 따라 같은 번호가 다른 질문이다. 유형이라도 있어야 '입력형에서만 막힌다' 같은 판정이 된다 |
| `onboarding_steps_load_failed` | change | failure | `fail_kind: string — ApiError.code 또는 'empty'(0건) \| 'network' — 지금은 0건과 5xx 가 같은 이벤트다` | src/features/onboarding/hooks/useOnboarding.ts:137(0건) / :160(예외) | 가입 직후 뜨는 화면이라 여기서 막히면 그 사람은 앱을 한 번도 못 쓴다 |
| `onboarding_submit_failed` | change | failure | `fail_kind: string — ApiError.code('ONBOARDING_ERROR_001~003') 또는 'network'` | src/features/onboarding/hooks/useOnboarding.ts:368 | 003(이미 마침)은 재시도해도 영원히 실패다 — 나머지와 섞이면 '재시도 버튼이 잘 안 듣는다'로만 보인다 |
| `app_launch_started` | keep | lifecycle | — | src/features/analytics/useAnalyticsLifecycle.ts:46 (isAuthLoading 해제 직후 1회) | 세션 복구 대기 중 이탈의 분모 |
| `auth_email_login_started` | keep | intent | — | src/hooks/useAuth.ts:140 | 이메일 로그인 제출 |
| `auth_email_login_succeeded` | keep | success | — | src/hooks/useAuth.ts:145 | 이메일 로그인 완주 |
| `auth_login_viewed` | keep | screen | — | src/features/analytics/useAnalyticsLifecycle.ts:63 | 로그인 랜딩 도달 |
| `auth_session_restore_failed` | keep | failure | — | src/hooks/useAuth.ts:115 | 스플래시에서 로그인으로 떨어진 사람 중 '토큰이 살아 있었어야 하는' 몫 |
| `auth_signup_completed` | keep | success | `method: string — email\|social` | src/features/auth/hooks/useSignupSteps.ts:168 / src/features/auth/hooks/useTermsAgreement.ts:106 / src/hooks/useAuth.ts:229 | 가입 완주 |
| `auth_signup_email_verified` | keep | success | — | src/features/auth/hooks/useSignupEmail.ts:175 | 이메일 인증 통과 |
| `auth_signup_failed` | keep | failure | `method: string`<br>`stage: string — consent\|account\|profile` | src/features/auth/hooks/useSignupSteps.ts:173 / src/features/auth/hooks/useTermsAgreement.ts:116 / src/hooks/useAuth.ts:234 | 제출 단계 실패. fail_kind(서버 코드) 추가를 권하지만 이번엔 keep |
| `auth_signup_started` | keep | intent | `method: string — email\|social` | src/features/auth/hooks/useTermsAgreement.ts:71 (email) / src/hooks/useAuth.ts:171 (social consent required) | 가입 퍼널의 앵커 |
| `auth_signup_step_viewed` | keep | screen | `step: AnalyticsSignupStep — terms\|email_verification\|password\|nickname\|birth\|gender\|name\|phone\|acquisition\|complete` | src/features/auth/hooks/useSignupSteps.ts:87 (필수정보 6질문) / src/features/analytics/useAnalyticsLifecycle.ts:76 (라우트 스텝) | 각 질문의 진입. 성공 축이 없어서 지금은 이 값만으로 이탈을 못 읽는다 |
| `auth_social_login_started` | keep | intent | `provider: string — google\|apple\|kakao` | src/hooks/useAuth.ts:154 | 소셜 버튼 누름 = 네이티브 시트 진입 |
| `auth_social_login_succeeded` | keep | success | `provider: string` | src/hooks/useAuth.ts:177 | 소셜 로그인 완주 |
| `auth_withdrawal_cancelled` | keep | success | — | src/hooks/useAuth.ts:248 | 탈퇴 취소 후 복귀 성공 |
| `onboarding_completion_cta_pressed` | keep | success | — | src/features/onboarding/hooks/useOnboarding.ts:418 | 홈 진입 = 여정의 끝 |
| `onboarding_completion_viewed` | keep | screen | — | src/features/onboarding/hooks/useOnboarding.ts:241 | 완료 화면 도달 |
| `onboarding_started` | keep | lifecycle | — | src/features/onboarding/hooks/useOnboarding.ts:119 | 온보딩 화면 마운트 |
| `onboarding_steps_loaded` | keep | progress | `step_count: number` | src/features/onboarding/hooks/useOnboarding.ts:143 | 질문 목록 수신 |
| `onboarding_submitted` | keep | success | — | src/features/onboarding/hooks/useOnboarding.ts:359 | 온보딩 저장 + 세션 승격 성공 |
| `screen_viewed` | keep | screen | `screen: AnalyticsScreenName — 화면 축(type='screen' + screen_name 으로 저장)` | src/features/analytics/useAnalyticsLifecycle.ts:53 | 퍼널의 screen 스텝 재료. 단 (auth) 하위는 login/signup 둘로만 뭉개진다 |

### J1-3. 퍼널 (8) — **구현된 이름 기준 (2026-08-19 갱신)**

> 아래는 초안이 아니라 **실제로 코드에 들어간 이름**이다. 초안과 다른 자리는 각 퍼널
> 아래 "초안과 다른 점" 에 이유를 적었다. 초안 61개 중 21개는 만들지 않았다 —
> 공용 계측(L2) 또는 화면 축(L1)이 이미 덮기 때문이고, 그 목록은 §J1-5 에 있다.

**F1. 소셜 로그인 완주** — window 15분

1. `screen:login`
2. `event:auth_social_login_started`
3. `event:auth_social_login_succeeded`

읽는 법: 1→2 하락 = 로그인 화면에서 아무 것도 못 고른 사람. 2→3 하락은 이제 **순수 실패가 아니다** —
`auth_social_login_cancelled`(네이티브 시트 닫음) + `auth_social_login_failed`(그 밖) 의 합이고,
둘은 `useAuth` 의 같은 catch 에서 **배타적으로** 갈린다. 즉 항등식은 `started = succeeded + cancelled + failed + auth_signup_started{method:'social'}` 다 —
**신규 가입자는 `succeeded` 를 안 쏜다**(consent_required 분기가 `auth_signup_started` 만 남기고 early return 한다).
그 항을 빼고 세면 이 퍼널이 성공으로 세야 할 코호트가 통째로 2→3 하락에 들어오고,
합이 안 맞는 것을 보고 있지도 않은 계측 누수를 쫓게 된다. 이 넷의 합이 안 맞을 때만 분류가 샌 것이다. 실패 쪽의 갈래는 `auth_social_login_blocked{fail_kind}` 로 다시 나뉜다
(`provider_email_required` · `link_required` · `generic` 셋. `blocked` 는 `failed` 를 **나누는** 것이지 더하는 것이 아니다).

**2026-08-19 이전 데이터와 겹쳐 읽지 말 것.** 그날 이전의 `auth_social_login_failed` 에는 취소가 섞여 있다.

**F2. 이메일 로그인 완주** — window 15분

1. `screen:login`
2. `event:auth_email_login_started`
3. `event:auth_email_login_succeeded`

읽는 법: 1→2 는 폼 도달·입력 완료율, 2→3 은 자격 실패율. 2→3 사이에는 네트워크 왕복뿐이라 빠른 회선에서
같은 초로 떨어질 수 있다 — 이 스텝의 `medianSecFromPrev` 가 0 이면 퍼널 대신 succeeded ÷ started 로 읽는다.
하락의 사유는 `auth_email_login_failed{fail_kind}` 로 브레이크다운한다(`LOGIN_ERROR_001` 비번불일치 /
`AUTH_ERROR_001` 미가입 / `AUTH_ERROR_007` 정지 / `AUTH_ERROR_008` 탈퇴대기).
`AUTH_ERROR_008` 행 수는 `auth_withdrawal_prompt_viewed{source:'email'}` 와 같아야 한다.

**F3. 이메일 회원가입 큰 줄기** — window 60분

1. `screen:signup_email`
2. `event:auth_code_requested`
3. `event:auth_signup_email_verified`
4. `event:auth_signup_password_submitted`
5. `event:auth_signup_step_completed`
6. `event:auth_signup_completed`

읽는 법: 인증 화면 도달 → 인증번호 발송 → 인증 → 비밀번호 → 첫 필수정보 → 가입.

**스텝 1 이 `auth_signup_started` 가 아닌 이유(2026-08-19 정정)**: 그 이벤트는 **소셜 가입에서도** 나간다
(소셜 응답이 consent_required 인 순간). 스텝 2~5 는 소셜 가입자가 절대 쏘지 않는 이름이라, 스텝1을 그것으로 두면
소셜 가입자 **전량**이 1→2 하락에 들어와 "이메일 가입 완주율"이 소셜 유입 비중에 따라 임의로 움직인다.
`prop:method=email` 스코프로도 못 거른다 — 스텝 2~5 가 `method` 를 안 실어서 스코프를 걸면 그 스텝들이 통째로 0이 된다.
`(auth)/signup-email` 라우트는 이메일 모드에서만 push 되므로 화면 축이 그 구분을 이미 갖고 있다. 모든 인접 스텝 사이에 사람의 입력이
끼어 있어 초 정밀도 tie 를 피한다. 2→3 이 가장 크게 떨어지면 메일 도달 문제(`auth_code_expired` ·
`auth_code_verify_failed` 로 확인), 4→5 가 떨어지면 필수정보 첫 질문(닉네임 중복 = `auth_signup_step_blocked{fail_kind:'taken'}`)이 범인이다.

초안과 다른 점: 스텝 2 의 이름이 `auth_signup_code_requested` → **`auth_code_requested`** 다. 같은 3분 타이머·같은
재전송 문법을 쓰는 네 화면(가입 인증 · 이메일 연결 · 소셜 연결 · 비밀번호 재설정)을 한 이름 + `source` 로 모았다.
`auth_signup_started` 로 앵커가 잡히므로 다른 표면의 행이 이 퍼널에 섞이지 않는다.
또한 이 이벤트는 **발송이 성공한 뒤**에 나간다 — 그래서 1→2 하락이 곧 발송 실패이고, 초안의
`auth_signup_code_send_failed` 를 만들 필요가 없어졌다.

**F4. 필수정보 6질문 순번** — window 30분 · **스코프 `prop:mode=signup`**

1. `event:auth_signup_step_completed`
2. `event:auth_signup_step_completed`
3. `event:auth_signup_step_completed`
4. `event:auth_signup_step_completed`
5. `event:auth_signup_step_completed`
6. `event:auth_signup_step_completed`

읽는 법: 퍼널 엔진은 '직전 시각 이후 최초' 를 잡으므로 같은 이름을 여섯 번 놓으면
닉네임→생년월일→성별→이름→휴대폰→유입경로의 순번 퍼널이 된다. n→n+1 하락이 곧 그 질문의 이탈률이다
(실명·휴대폰이 4·5번째라 여기가 떨어지면 예상대로 민감도 문제). 뒤로 갔다 다시 완료하면 순번이 밀리므로
**상한 추정치**이며, 오차는 `auth_signup_step_reverted` 량으로 가늠한다.
질문별 브레이크다운은 같은 이벤트의 `step` · `step_index` 로 본다(스텝 매칭에는 못 쓰지만 브레이크다운에는 쓴다).

초안과 다른 점 두 가지.
① **7번째 스텝(`auth_signup_completed`)을 뺐다.** 속성 스코프는 `scoped` CTE **전체**에 걸리므로
`mode` 를 안 싣는 이벤트가 한 스텝이라도 있으면 그 스텝이 통째로 0 이 된다(§J1-0 정정 2).
`auth_signup_completed` 는 `method` 만 싣는다 — 여섯 질문 뒤의 전환은 F3 의 5→6 이 이미 답한다.
② 그래서 이 퍼널의 **여섯 스텝이 전부 같은 한 이벤트**이고, 그 이벤트는 항상 `mode` 를 싣는다.
스코프를 안 걸면 이미 가입한 사람의 추가정보 입력(`mode:'backfill'`)과 소셜 마무리(`'completion'`)가
같은 퍼널에 섞여 완주율이 왜곡된다.

**F5. 인증번호 수신·입력** — window 10분 · **스코프 없음**

1. `screen:signup_email`
2. `event:auth_code_requested`
3. `event:auth_signup_email_verified`

읽는 법: 메일이 실제로 도착해 사람이 6자리를 넣기까지. 하락분은 `auth_code_verify_failed{fail_kind}` 와
`auth_code_expired` 로 나뉘어 설명된다. 3분 타이머 대비 10분 창을 잡아 재전송 1회까지 포함한다.
재전송 압력은 `auth_code_requested` 의 `attempt_no` 브레이크다운으로 본다(10 에서 클램프).

**스텝 1 이 화면인 이유(2026-08-19 정정)**: `auth_code_requested` 는 네 표면(가입 인증·이메일 연결·소셜 연결·
비밀번호 재설정)이 **한 이름을 공유**한다. 앵커가 퍼스트터치라 그것을 스텝1로 두면, 비밀번호 재설정을 먼저 시도한
사람은 앵커를 그 행에 뺏기고 스텝2를 영원히 못 채운다 — "메일 도달률"이 다른 표면 사용량만큼 깎인 숫자가 된다.
화면을 앞세우면 앵커가 가입 인증 화면에 고정된다.

주의 둘: (a) `auth_signup_email_verified` 는 `source` 를 **안 싣는다** — `prop:source` 스코프를 걸면 마지막 스텝이
통째로 사라지므로 **쓰면 안 된다.** (b) 같은 화면의 **이메일 연결 모드**는 스텝2를 쏘지만 스텝3을 절대 안 쏜다
(그쪽 성공은 `auth_account_link_completed{mode:'email_password'}` 다) — 그만큼이 2→3 하락에 상시 섞여 있다.
표면별로 갈라 보려면 `auth_code_requested` 단독 브레이크다운(`source`)을 나란히 읽는다.

**F6-a. 약관 화면 통과 (이메일)** — window 10분 · **스코프 `prop:method=email`**

1. `event:auth_terms_item_toggled`
2. `event:auth_terms_submitted`

**F6-b. 약관 화면 통과 (소셜)** — window 10분 · **스코프 `prop:method=social`**

1. `event:auth_terms_item_toggled`
2. `event:auth_terms_submitted`

읽는 법: 체크를 하나라도 누른 사람 중 실제로 다음으로 넘어간 비율. 하락이 크면 필수/선택 위계가 안 읽히는 것이고,
문서로 나갔다 안 돌아온 몫은 `screen:signup_terms → screen:legal_document` 전이로 본다.
소셜 모드는 이미 로그인을 마친 사람이 다시 붙잡히는 자리라 두 퍼널의 하락 폭이 다를 것으로 본다 — **그것이 이 분리의 목적이다.**

초안과 다른 점: 초안의 스텝 2 는 `auth_signup_started` 였는데, 소셜 모드에서는 그 이벤트가 **약관 화면보다 먼저**
나간다(소셜 로그인 응답이 consent_required 인 순간). 엄격 부등호라 소셜 가입자 전원이 이탈로 계산됐을 것이다(§J1-0 정정 1).
그래서 두 모드가 **같은 걸음에서 같은 이름**을 쏘도록 `auth_terms_submitted{method}` 를 새로 두고,
두 스텝이 모두 `method` 를 실어 스코프가 성립하게 했다.

**F7. 비밀번호 재설정 완주** — window 30분

1. `screen:password_reset`
2. `event:auth_code_requested`
3. `event:auth_password_reset_completed`

읽는 법: 1→2 는 "가입한 적 없는 이메일" 벽(`AUTH_ERROR_001`), 2→3 은 OTP 만료 + 재설정 토큰 만료의 합이다.
2→3 하락의 사유는 `auth_code_verify_failed{source:'password_reset'}` 와 `auth_code_expired{source:'password_reset'}`
둘로 갈리고, **나머지 잔여분이 재설정 토큰 만료다.**

**그 자리에는 이름이 없다(2026-08-19 정정).** `handleResetPassword` 의 catch 는 `setError` 로 필드 아래 문구만
그리고 `presentError` 를 부르지 않는다 — 즉 `app_error_presented{code:'TOKEN_ERROR_006'}` 행은 **영원히 0**이다.
그 행으로 브레이크다운하면 "토큰 만료로 막히는 사람은 없다"는 반대 결론이 나온다. 보고 싶다면 그 catch 를
카탈로그 그릇(`presentError`)으로 돌려야 하고, 그건 문구 위치가 바뀌는 UX 결정이라 별도 과제다.

이 여정은 **화면 축이 갈라진 덕분에** 진입 스텝이 이벤트일 필요가 없어졌다(초안의 `auth_password_reset_started` 를
만들지 않은 이유). 단 스텝 2 는 다른 표면의 `auth_code_requested` 도 매칭할 수 있다 — 앵커가 `screen:password_reset`
이므로 실무상 섞이지 않지만, 한 사람이 10분 안에 가입 인증과 재설정을 오가면 상한이 된다.

**F8. 온보딩 완주** — window 60분

1. `event:onboarding_welcome_viewed`
2. `event:onboarding_welcome_confirmed`
3. `event:onboarding_step_completed`
4. `event:onboarding_submitted`
5. `event:onboarding_completion_cta_pressed`

읽는 법: 1→2 는 진단 여부 선택 관문, 2→3 은 질문 로딩 실패까지 포함한 첫 답변 도달, 3→4 는 나머지 질문 전체,
4→5 는 완료 화면에서 홈으로. 4→5 가 떨어지면 완료 화면이 끝으로 안 읽히는 것이다.
2→3 하락의 사유는 `onboarding_steps_load_failed{fail_kind}` 로 갈린다(`empty` = 서버가 0건을 준 것,
그 밖 = 코드/범주). 되돌아간 사람은 `onboarding_welcome_returned` 가 센다 — 그 수가 크면 사람들이 여기 갇혀 있다.

초안과 다른 점: 1번 스텝을 `onboarding_started` → **`onboarding_welcome_viewed`** 로 바꿨다. started 는 마운트마다
나가는데, 저장된 진행이 있으면 welcome 을 **건너뛰므로** 복귀자가 분모에 섞인다. `onboarding_started` 는 여전히
나가고 세션 축의 분모로 쓴다.

**F9. 온보딩 질문 순번** — window 60분

1~8. `event:onboarding_step_completed` (여덟 번)

읽는 법: 같은 이름 반복으로 몇 번째 질문에서 멈추는지 본다(엔진 상한 8스텝이라 앞 8문항까지).
특정 순번에서 급락하면 그 자리의 `step_kind` 를 브레이크다운으로 확인한다 — 보통 `input`/`date` 형에서 떨어진다.
뒤로가기 보정치는 `onboarding_step_reverted` 다.

---

### J1-4. 주의

[퍼널 엔진의 결정적 제약] queries/funnel.ts 의 stepMatch 는 `sc.name = 이름`(또는 screen_name)만 본다 — **속성은 매칭에 안 쓴다**. 따라서 auth_signup_step_viewed{step} 하나로는 질문별 퍼널을 만들 수 없다. 질문별 이탈은 (a) viewed/completed 쌍의 비율표, (b) 같은 이벤트명을 반복 배치한 '순번 퍼널'(위 F4·F8) 두 가지로만 읽는다. 순번 퍼널은 first-touch 앵커 + '직전 시각 이후 최초' 규칙 덕에 성립하지만, 뒤로가기 후 재완료가 섞이면 순번이 밀리는 상한 추정치다.

[같은 초 tie 회피] server_ts 는 초 정밀도이고 비교가 엄격(>)이라 다음 쌍은 절대 인접 스텝으로 두면 안 된다: app_launch_started↔screen_viewed(같은 커밋), auth_signup_completed↔onboarding_started(replace 직후 마운트), onboarding_welcome_confirmed↔onboarding_steps_loaded(네트워크만), auth_signup_email_verified↔auth_signup_step_viewed{password}(SignupEmailScreen.tsx:67 의 자동 전진). 위 퍼널은 전부 사람의 조작이 끼는 자리만 인접시켰고, 유일한 예외(이메일 로그인 started→succeeded)는 해당 퍼널 설명에 적어 두었다.

[새니타이저 통과 확인] 제안한 키는 전부 events.ts:205 의 정규식을 피한다: fail_kind, step, step_index, step_count, step_kind, mode, method, provider, source, stage, item, agreed, marketing_on, required_met, option, has_reason, phase, choice, gate, attempt_no, field_slot. 반대로 흔히 쓰고 싶어지는 step_name·field_name·error_code·screen_name·nickname_length·birth_year·update_kind(‘date’ 포함!)·answer_kind·meal_slot 은 **조용히 떨어진다** — 리뷰 시 이 목록을 먼저 대조할 것.

[화면 축이 이 여정을 못 담는다 — **2026-08-18 해소**] 라우트 키 표 70개가 들어가면서 login·login_email·password_reset·account_link·signup_terms·signup_email·signup_password·signup_profile·signup_complete 로 갈라졌다. 그래서 비밀번호 재설정은 이제 `screen:password_reset` 으로 보이고(F7 의 1번 스텝), 초안이 그 창으로 제안한 auth_password_reset_started 는 만들지 않았다(§J1-5). **아직 안 갈리는 것 둘**: profile-setup 의 여섯 질문(한 라우트라 이벤트 축이 유일하다)과 signup-email 의 두 모드(가입 인증 / 이메일 연결 — auth_code_* 의 source 가 가른다). 아래는 해소 전의 기록이다. getAnalyticsScreenName(events.ts:233)은 (auth) 하위에서 login/email-login 만 'login', **나머지 전부를 'signup'** 으로 접는다. 그래서 forgot-password·social-link-email·email-login-link-password 가 회원가입과 한 화면으로 섞인다. 비밀번호 재설정 여정은 화면 축으로는 절대 안 보이고 위 auth_password_reset_* 이벤트가 유일한 창이다. 화면 축으로도 보려면 AnalyticsScreenName 에 'password_reset'(그리고 원하면 'signup_profile') 추가와 매핑 분기가 필요하다 — 이건 카탈로그 변경이라 별도 결정 사항.

[지금 대시보드 숫자가 틀린 곳 — **2026-08-19 해소, 단 과거 데이터는 그대로다**] useAuth 의 catch 가 이제 isUserCancelledError 로 갈라 취소를 auth_social_login_cancelled 로 보낸다(두 이름은 배타적이다). **그 날짜 이전의 auth_social_login_failed 에는 취소가 섞여 있고 소급 분해는 불가능하다** — 앞뒤를 한 그래프에 겹쳐 읽지 말 것. 아래는 해소 전의 기록이다. useAuth.ts:180 의 auth_social_login_failed 는 catch 전부에서 발화하므로 **사용자가 소셜 시트를 닫은 취소까지 실패로 센다**(useSocialLogin.ts:49 는 그 뒤에 조용히 return). 현재 표시되는 소셜 실패율은 실패가 아니라 '취소+실패'다. auth_social_login_cancelled 를 넣기 전까지는 이 값을 장애 지표로 쓰면 안 된다.

[건강정보는 일부러 안 싣는다] 온보딩 welcome 의 CKD 여부, 진단 시기(PREVENTIVE), 진단자 전용 스텝(useOnboarding.ts:30 의 9·10)은 어떤 키로도 싣지 않았다. 새니타이저가 ckd·diagnosis·disease·health 키를 막는 것과 같은 판단이며, branch 같은 중립적 키로 우회하는 것도 같은 우회라 하지 않았다. 질문 식별도 step_no(서버 질문번호) 대신 step_kind(유형)만 제안한다 — step_no 는 9·10 의 존재 자체가 진단 여부를 함의한다. 다만 **이미 나가고 있는** onboarding_steps_loaded 의 step_count 는 두 분기의 질문 수가 달라 사실상 분기를 드러낸다. 이번 스펙에서 건드리지 않았지만 별도 검토 대상이다.

[profile-setup 은 세 모드가 한 라우트다] useSignupSteps.ts:72-78 에서 신규가입 / 소셜 마무리(completion) / 추가정보 채우기(backfill)가 갈린다. mode 를 안 실으면 '가입 퍼널'에 이미 가입한 사람의 backfill 이 섞여 완주율이 왜곡된다 — 그래서 auth_signup_step_completed·reverted·blocked 에 mode 를 필수로 넣었다(abandoned 는 만들지 않았다 — §J1-5). 스코프 필터는 속성 단위로 **된다**, 그래서 더 위험하다: mode 를 안 싣는 스텝이 하나라도 섞이면 그 스텝이 통째로 0 이 된다. F4 를 여섯 스텝 전부 auth_signup_step_completed 하나로 만든 것이 그 답이다(§J1-3 F4).

[볼륨·카디널리티] 가입 1건당 새 이벤트가 대략 30~45개 늘어난다(약관 토글 4~8, 필수정보 6~12, 온보딩 8~24). 값은 전부 열거형이라 카디널리티 폭발은 없지만, fail_kind 에 서버 코드를 그대로 넣으므로 서버가 새 코드를 추가하면 값이 늘어난다. **구현은 'other' 로 접지 않았다** — 접으면 되돌릴 수 없고, 새 코드가 늘어난 사실 자체가 신호이기 때문이다. 카디널리티가 문제가 되면 대시보드에서 접는다. 값 판정은 toAnalyticsFailKind(resolveError 의 code ?? kind) 한 곳이다. attempt_no 는 10 에서 클램프했다(세 인증 화면이 같은 상수를 쓴다).

[구현 시 주의 두 가지] (1) auth_signup_step_viewed 는 이미 useSignupSteps.ts:87 의 useEffect([step]) 라서 뒤로가기로 되돌아가도 다시 찍힌다 — 새로 넣는 completed 와 짝지어 비율을 낼 때 분모가 부풀 수 있으니 '사람당 최초 1회' 기준으로 집계할 것. (2) auth_code_expired(초안의 auth_signup_code_expired) 는 타이머가 매초 갱신되므로 반드시 false→true 전이에서만 1회 쏠 것 — 세 화면(SignupEmail·ForgotPassword·SocialLinkEmail)이 같은 useEffect + expiredTrackedRef 규약을 쓰고 tests/analyticsJourneyAuth.test.ts 가 세 파일 모두에서 그 모양을 검사한다.

---


### J1-5. 초안에서 **만들지 않은** 이름 21개와 그 대체 (2026-08-19)

| 초안 이름 | 무엇이 대신 덮는가 |
|---|---|
| `auth_signup_abandoned` | `nav_back{from_screen:'signup_profile'}` — `exitSignup` 이 `useGoBack` 이고 그 화면에서 그 통로가 불리는 자리는 첫 스텝 뒤로가기 하나뿐이라 두 수가 같다 |
| `auth_signup_code_requested` · `_verify_failed` · `_expired` | 이름만 `auth_code_*` 로 넓혔다(네 표면 공용 + `source`). 기능은 그대로 남았다 |
| `auth_signup_code_send_failed` | `auth_code_requested` 를 **성공 뒤**에 쏘므로 화면 진입 → 요청의 하락이 곧 발송 실패다. 다이얼로그 갈래는 `app_error_presented{code}` |
| `auth_signup_password_rejected` | `form_validation_failed{form:'signup_password'}` — 이미 `SignupPasswordScreen` 에 붙어 있다 |
| `auth_terms_abandoned` | 이메일 모드는 `nav_back{from_screen:'signup_terms'}`, 소셜 모드는 `screen_viewed` 전이(`signup_terms`→`login`). 동의 상태는 `auth_terms_item_toggled` 가 이미 남긴다 |
| `auth_terms_document_opened` | `screen:legal_document` — 그 라우트가 화면 축 70개에서 자기 이름을 받았다 |
| `auth_withdrawal_prompt_dismissed` | `auth_withdrawal_prompt_viewed` − `auth_withdrawal_cancelled` 가 곧 "복귀하지 못한 사람" 이다. 그 안에서 닫기/이탈을 더 가르지 않는다 |
| `auth_acquisition_sheet_opened` · `_confirmed` · `_dismissed` | 마지막 질문의 손실은 `auth_signup_step_viewed{acquisition}` − `auth_signup_step_completed{acquisition}` 로 이미 보인다. 시트 내부는 공용 통로(`sheet_opened`/`sheet_dismissed`)의 관할인데 이 시트가 `V2BottomSheet` 가 아니라 `AppModal` 이라 통로 밖이다 — **통로를 늘리는 대신 그 시트를 옮기는 것**이 옳고, 그건 별도 과제다 |
| `auth_email_link_prompt_resolved` | '본인확인 진행' 을 고르면 곧바로 `auth_code_requested{source:'email_link'}` 가 나간다. 안 고르면 아무 것도 안 나간다 — 두 값이 이미 갈린다 |
| `auth_email_link_completed` · `auth_social_link_completed` | `auth_account_link_completed{mode}` 하나로 합쳤다. 화면명도 둘 다 `account_link` 로 접혀 있어 방향은 속성이 진다 |
| `auth_email_link_failed` · `auth_social_link_failed` | `app_error_presented{kind,code}` + `auth_code_verify_failed{source}` |
| `auth_social_link_code_requested` | `auth_code_requested{source:'social_link'}` |
| `auth_password_reset_started` | `screen:password_reset` (화면 축이 갈라졌다) + `auth_code_requested{source:'password_reset'}` |
| `auth_password_reset_failed` | 앞 두 단은 `auth_code_verify_failed`/`auth_code_expired`, 마지막 단(재설정 토큰 만료)은 F7 의 3번 스텝 부재로만 보인다 — **여기는 인정하는 사각지대다** |
| `onboarding_steps_retry_pressed` | 실패 뒤에 오는 **두 번째** `onboarding_steps_loaded`/`_load_failed` 가 곧 재시도다 |
| `auth_social_login_failed{fail_kind}` (속성 추가) | `auth_social_login_blocked{fail_kind}` 가 같은 갈래를 이미 진다 |
| `onboarding_submit_failed{fail_kind}` (속성 추가) | 이 실패는 `presentError` 를 지나가므로 `app_error_presented{code, screen_name:'onboarding'}` 가 코드를 이미 갖고 있다 |

**남은 사각지대 셋** — 인정하고 적어 둔다.
① 유입경로 시트 **내부**(다이얼을 돌렸지만 확정 안 함, '기타' 이유를 못 씀)는 무계측이다.
② 비밀번호 재설정 마지막 단의 실패는 이름이 없다.
③ 탈퇴 확인 모달을 **닫은 것**과 **앱을 끈 것**은 구분되지 않는다(모달을 닫아도 화면이 안 바뀐다).

## J2. 홈 · 식사기록 · 건강기록 · 통계

> 홈(기록) → 오늘기록 타일/식사 타임라인 → 식사기록 파이프라인(식사 시트 → 카메라·앨범·글 → 사진 확인 → AI 분석 대기 → 결과 → 수정 → 기록에 담기) → 건강기록 바텀시트(물·혈압·혈당·체중·부종) → 통계. 실사 대상 파일: app/(tabs)/home.tsx, app/statistics.tsx, src/features/home/components/record/RecordView.tsx, sheets/*, src/features/home/hooks/useFoodAnalysis.ts, src/features/home/components/FoodAnalysisResult.tsx·FoodResultEdit.tsx·FoodAnalysisConfirmation.tsx·LoadingOverlay.tsx, src/features/food-analysis/hooks/useMealPersistenceActions.ts, src/features/recipe/services/imagePickerService.ts.

### J2-0. 검증에서 확정된 정정 (2건)

| 대상 | 종류 | 무엇이 틀렸나 | 어떻게 고치나 |
|---|---|---|---|
| `food_analysis_confirm_deferred.picked_count` | sanitizer_drop | events.ts:204-205 의 PROHIBITED_PROPERTY_KEY 에 `answer` 가 들어 있다. `picked_count` 는 /answer/i 에 걸려 sanitizeAnalyticsProperties 가 조용히 떨군다. 이 여정 notes 1) 은 '제안한 모든 키(… picked_count …)는 정규식을 통과한다' 고 단언하는데 사실이 아니다. 제안된 122개 키를 클라이언트·서버(sinsin-be-bun/src/domains/analytics/record.ts:16 의 별도 정규식, `search`·`password`·`secret` 추가) 양쪽 정규식에 전부 대조했고 탈락은 이 한 개뿐이다. | `picked_count` → `picked_count`(또는 `filled_count`). question_count 는 그대로 통과한다. 서버 정규식이 클라이언트와 다르다는 사실도 스펙에 적어 둘 것 — 앞으로 `search`·`secret` 이 들어간 키를 고르면 클라이언트는 통과하고 서버에서 사라진다. |
| `식사 결과 → 상담 시작 (FoodAnalysisResult.tsx:444 handleAskAboutMealPress → useMealPersistenceActions.ts:78 startConsultation)` | missing | 결과 화면에서 나가는 길이 세 개(기록에 담기·저장 없이 닫기·삭제)로 적혀 있는데 네 번째인 '이 식사에 대해 물어보기'가 32단계 어디에도 없다. 이건 이탈이 아니라 이 여정 최대의 전환(기록 → 상담)이고, 실패 경로도 실재한다(useMealPersistenceActions.ts:85-90 catch — ensureMealDiary 가 아직 저장 안 된 결과를 서버에 먼저 만들어야 해서 여기서 400/5xx 가 난다). 식당 여정은 같은 성격의 restaurant_diagnose_tap{menu_count} 를 이미 갖고 있는데 식사 기록 쪽만 비어 있어, '결과를 봤는데 안 담았다'(food_record_result_abandoned)에 상담으로 빠져나간 사람이 섞인다. | food_record_consult_started{source: fresh\|recovered\|saved} / food_record_consult_failed{fail_kind} 를 추가하고, F5 '결과를 저장하지 않고 나가는 길'의 해석에 이 분모를 빼서 읽는다고 적을 것. |

### J2-1. 단계 (25)

| # | 단계 | 표면/라우트 | 코드 | 여기서 왜 빠져나가나 | 현재 계측 |
|---|---|---|---|---|---|
| 1 | 홈 기록 화면 진입 | `/(tabs)/home` | `app/(tabs)/home.tsx:29-31` | 진입 후 아무것도 안 누르고 탭 이동. 기록 진입의 분모라 여기가 흔들리면 아래 전 구간의 해석이 흔들린다. | screen_viewed(screen=home) + home_record_viewed |
| 2 | 날짜 바꾸기(월 캘린더 시트) | `sheet:MonthCalendarSheet` | `app/(tabs)/home.tsx:39-48` | 과거 날짜를 열어 놓고 그 날짜에는 기록 버튼이 의미가 없어 그냥 나간다. 지금은 '오늘을 보다 이탈' 과 '과거를 보다 이탈' 이 구분되지 않는다. | 없음 |
| 3 | 식사 시트 열기(타일·타임라인 빈칸·기록 CTA) | `sheet:MealSheet` | `src/features/home/components/record/RecordView.tsx:347-350, 855, 989-991` | 시트만 열고 사진·앨범·글·건너뛰기 중 아무것도 안 고른 채 닫는다. food_record_started 는 방법을 고른 뒤에야 찍히므로(RecordView.tsx:504-510) 이 이탈이 통째로 안 보인다. | 없음 |
| 4 | 기록 방법 고르기(사진·앨범·글·건너뛰기) | `sheet:MealSheet` | `src/features/home/components/record/RecordView.tsx:512-598, 615-635` | 끼니 칩만 바꾸다 닫기. 이미 기록된 끼니로 자동 선택돼 '결과 보기' 만 보이는 상태(MealSheet.tsx:134-140)도 기록 시도로 이어지지 않는다. | food_record_started{slot} + food_record_method_selected{method,slot} |
| 5 | 사진 권한 관문(카메라/앨범) | `native:permission` | `src/features/recipe/services/imagePickerService.ts:34-60 (호출부 RecordView.tsx:519-524, 546-552)` | 거부하면 설정 안내 다이얼로그 뒤 아무 일도 안 일어난다. 지금은 거부만 찍혀 거부율의 분모(허용 횟수)가 없다. | food_photo_permission_denied{source} (거부만) |
| 6 | 카메라 촬영 / 앨범에서 사진 고르기 | `native:camera\|gallery` | `src/features/home/components/record/RecordView.tsx:519-533, 546-562` | 권한은 있는데 촬영·선택을 취소한다(uri null). 코드는 시트로 되돌리지만 이벤트가 없어 '권한 거부'와 '그냥 취소'가 같은 침묵으로 보인다. | 없음(취소 경로) |
| 7 | 앨범 사진 확인 시트 | `sheet:MealPhotoConfirmSheet` | `src/features/home/components/record/RecordView.tsx:1014-1022 (핸들러 574-588)` | 고른 사진이 마음에 안 들어 다른 사진으로 바꾸거나 취소. 이 관문이 앨범 오탭을 얼마나 막고 있는지가 여기서만 보인다. | food_photo_confirm_viewed / _accepted / _replaced / _cancelled{source} |
| 8 | 글로 기록 입력(TextRecord 모달) | `modal:TextRecord` | `src/features/home/components/record/TextRecord.tsx:35-48, 144-160 (호출부 RecordView.tsx:1082-1091)` | 입력 화면까지 왔지만 한 글자도 안 쓰고 닫거나, 쓰다가 '버리고 나가기' 확인창에서 버린다. 진입도 폐기도 안 찍힌다. | 없음 |
| 9 | AI 분석 대기(로딩 오버레이) | `overlay:LoadingOverlay` | `src/features/home/hooks/useFoodAnalysis.ts:164-222, 224-256 / LoadingOverlay.tsx:116-118` | 폴링이 길어지면 3초 뒤 X가 뜨고 사람이 나간다. 상태 전이(QUEUED→PERCEIVING→RESOLVING)와 대기 시간이 없어 '얼마나 기다리다 포기하는가'를 못 본다. | food_analysis_started{method} 만 |
| 10 | 분석 중 X 로 나가기 | `overlay:LoadingOverlay` | `src/features/home/components/LoadingOverlay.tsx:150-171 → src/features/home/hooks/useFoodAnalysis.ts:311-318` | 나간 뒤 결과는 pending 으로 남아 알림/복구로 돌아온다. 나간 시점의 대기 시간과 마지막 상태가 없어 '너무 느려서'인지 '실수'인지 못 가른다. | food_analysis_dismissed{method} |
| 11 | 분석 실패(잡 FAILED · 서버 4xx/5xx · 타임아웃 · 확인 UI 없음) | `overlay:LoadingOverlay → toast` | `src/features/home/hooks/useFoodAnalysis.ts:199-202, 242-252, 291-305` | 실패 뒤 재시도 토스트를 안 누르고 끝난다. reason 이 confirmation_unavailable 하나뿐이라 400/500/타임아웃/오프라인이 한 덩어리다. | food_analysis_failed{method, reason?} |
| 12 | 확인 질문 화면(사진이 불명확할 때) | `modal:FoodAnalysisConfirmation` | `src/features/home/components/FoodAnalysisConfirmation.tsx:80-204 (호출부 RecordView.tsx:1145-1159)` | 질문에 답하다 '건너뛰기'(deferConfirmation, useFoodAnalysis.ts:355-358)로 나가면 분석이 미완으로 남는다. 진입·제출·건너뛰기 모두 미계측이라 이 기능을 켤지 말지 판단할 근거가 없다. | 없음 |
| 13 | 분석 결과 화면 진입(신규·복구·저장본) | `modal:FoodAnalysisResult` | `src/features/home/hooks/useFoodAnalysis.ts:161, 290 / RecordView.tsx:167-178, 662` | 결과는 봤는데 '기록에 담기'를 안 누른다 — 이 여정에서 가장 값비싼 이탈(서버 분석 한 번을 이미 태웠다). | food_record_result_viewed{source: fresh\|recovered\|saved} |
| 14 | 결과 수정(메뉴·먹은 양·끼니·이름) | `overlay:FoodResultEdit` | `src/features/home/components/FoodResultEdit.tsx:155-157, 204-214, 216-315` | 수정 화면까지 갔다가 취소로 나간다. handleCancel 은 이름을 고쳤을 때만 succeeded 를 쏘므로(FoodResultEdit.tsx:204-214) 순수 취소가 안 보인다. | food_record_edit_started / _succeeded / _failed(변경 축 4종) |
| 15 | 기록에 담기(저장) | `modal:FoodAnalysisResult` | `src/features/home/components/FoodAnalysisResult.tsx:433-442 → useFoodAnalysis.ts:360-388 / RecordView.tsx:444-476` | foodAnalysisResultId<=0 이면 토스트만 뜨고 저장이 아예 시도되지 않는다(useFoodAnalysis.ts:365-371). 서버 4xx/5xx 실패는 save_failed 로 뭉개진다. | food_record_saved{source} / food_record_save_failed{source} |
| 16 | 저장 안 하고 결과 닫기(확인창) | `dialog:showConfirm` | `src/features/home/components/FoodAnalysisResult.tsx:414-427` | 바로 이 여정의 종착 이탈. 확인창을 띄운 사람 중 몇이 되돌아오는지(문구가 붙잡는지)가 전혀 안 보인다. | 없음 |
| 17 | 저장된 끼니 다시 열기(타임라인 카드) | `modal:FoodAnalysisResult(저장본)` | `src/features/home/components/record/RecordView.tsx:637-669` | fetchDiaryResult 실패(FOOD_CAMERA_013 지워진 기록 등)면 화면이 안 열리고 토스트만 뜬다 — 실패가 미계측이라 '카드를 눌러도 안 열린다' 가 집계에 없다. | food_record_result_viewed{source:saved} (성공만) |
| 18 | 저장된 끼니 삭제 | `sheet:MealDeleteConfirmSheet` | `src/features/home/components/FoodAnalysisResult.tsx:455-461 → src/features/food-analysis/hooks/useMealPersistenceActions.ts:96-112` | 확인 시트에서 취소하거나 삭제가 서버에서 실패한다(재시도 버튼 없음). 저장 뒤 되돌리는 비율은 기록 품질 신호인데 지금은 0 이다. | 없음 |
| 19 | 끼니 건너뛰기 | `sheet:MealSheet` | `src/features/home/components/record/RecordView.tsx:615-635` | skipMeal 이 서버에서 실패하면 아무것도 안 남는다 — 성공만 찍혀서 '건너뛰기를 눌렀는데 반영이 안 됨'이 안 보인다. | food_record_method_selected{method:skip} + food_record_skipped{slot} (성공만) |
| 20 | 오늘기록 타일 탭 → 건강 시트 열기(물·혈압·혈당·체중·부종) | `sheet:Water\|BloodPressure\|BloodGlucose\|Weight\|Edema` | `src/features/home/components/record/RecordView.tsx:866, 880, 902, 911, 920 (마운트 1024-1079)` | 타일은 누르는데 시트에서 아무 값도 안 넣고 닫는다. 시트 열림 자체가 미계측이라 다섯 지표 중 어디가 새는지 못 본다. | 없음 |
| 21 | 시트에서 값 입력(키패드·스테퍼·프리셋·선택 카드) | `sheet:*` | `BloodGlucoseSheet.tsx:188-201 / BloodPressureSheet.tsx:152-199 / WeightSheet.tsx:196-217 / EdemaSheet.tsx:66-77 / WaterSheet.tsx:152-189` | 입력 도중 이탈. 혈당은 시점·끼니 칩을 만지다 값이 갈리는 계열의 QA 이력이 있고(BloodGlucoseSheet.tsx:97-118), 혈압은 두 칸을 다 못 채우면 CTA 가 계속 꺼져 있다. | 없음 |
| 22 | 시트 CTA 저장 | `sheet:RecordSheetShell CTA` | `src/features/home/components/record/sheets/RecordSheetShell.tsx:204-214 → RecordView.tsx:722-762 → useBloodMetricsRecord.ts:16-52 / useWeightEdemaRecord.ts:13-48 / useExtraWater.ts:8-27` | 서버 400/500(예: KST 경계·유니크 충돌)로 실패해도 시트가 열린 채 남는다. 성공·실패 이벤트에 지표가 없어 다섯 시트가 한 숫자로 뭉개진다. | health_entry_save_succeeded{} / health_entry_save_failed{} (속성 없음) |
| 23 | 시트를 저장 없이 닫기(✕·배경 탭·스와이프) | `sheet:RecordSheetShell` | `src/features/home/components/record/sheets/RecordSheetShell.tsx:141-161, 122 / RecordView.tsx:1000, 1038, 1050, 1062, 1073` | 값을 넣다 만 채 닫기와 열자마자 닫기를 구분하지 못한다 — 전자는 입력 UI 문제, 후자는 타일 문구/기대 불일치로 처방이 정반대다. | 없음 |
| 24 | 복구된 분석 이어받기(앱 재진입·폴링) | `modal:FoodAnalysisResult(pending)` | `src/features/home/components/record/RecordView.tsx:120, 167-178, 444-476 / hooks/useFoodAnalysisRecoveryPolling.ts:8-46` | 분석 중 나간 사람이 복구된 결과를 열고도 저장하지 않는다. 이 경로의 저장률이 '기다리다 포기' 의 실제 손실액이다. | food_record_result_viewed{source:recovered} / food_record_saved{source:recovered} |
| 25 | 통계로 이동 | `/statistics` | `src/features/home/components/record/RecordHomeBar.tsx:72 → app/(tabs)/home.tsx:55 → app/statistics.tsx:42-44` | 기록 대신 통계만 보고 나간다. getAnalyticsScreenName(['statistics']) 이 'other' 로 떨어져 화면 축으로는 통계가 존재하지 않는다 — 퍼널에서는 event 스텝으로만 쓸 수 있다. | home_statistics_viewed (screen_viewed 는 'other') |

### J2-2. 이벤트 — **구현된 이름 기준 (2026-08-19 갱신)**

초안 45개 중 **26개만 만들고 5개는 뺐다**(뺀 것은 J2-5). 나머지는 이미 있던 것이고, 초안에 없던 통계 3개를 더했다.

신규 24 · 변경 6 · 유지 16.

| 이벤트 | 상태 | 종류 | 속성 | 발화 지점 | 없으면 못 보는 이탈 |
|---|---|---|---|---|---|
| `home_date_selected` | new | intent | `is_today: boolean`<br>`days_back: '0'\|'1_7'\|'8_30'\|'over_30'` | app/(tabs)/home.tsx MonthCalendarSheet onSelectDate | '홈에 왔는데 기록 안 함' 에서 **과거 조회**를 빼야 기록 진입률이 사실이 된다 |
| `food_record_sheet_viewed` | new | screen | `slot`<br>`entry: 'tile'\|'timeline_empty'\|'timeline_cta'`<br>`recorded: boolean` | RecordView `openMealSheetFrom` (세 문에서만. 취소 뒤 **재개는 안 쏜다**) | 파이프라인의 진짜 시작점. `recorded:true` 는 '결과 보기' 모드라 기록 시도가 일어날 수 없는 열림이다 |
| `food_photo_permission_granted` | new | progress | `source: 'camera'\|'gallery'` | imagePickerService `ensurePermission` granted 분기 → RecordView 콜백 | 거부율의 분모 |
| `food_photo_picker_cancelled` | new | abandon | `source`<br>`replacing: boolean` | RecordView 카메라 uri null · 앨범 picked null (**권한 통과한 경우만**) | 권한 거부와 구분되지 않던 침묵 |
| `food_analysis_progressed` | new | progress | `method`<br>`status: 'PERCEIVING'\|'RESOLVING'` | useFoodAnalysis `resolveJob` — `analysisId:status` 당 1회 | 분석이 어디서 오래 걸리는지. QUEUED 는 started 와 같은 틱이라 안 쏜다 |
| `food_analysis_confirm_viewed` | new | screen | `question_count` | FoodAnalysisConfirmation — analysisId 당 1회 | 확인 질문 기능(플래그 오프)을 켤지 판단할 숫자 |
| `food_analysis_confirm_submitted` | new | success | `question_count` | FoodAnalysisConfirmation `handleSubmit` | 답을 끝까지 채운 비율 |
| `food_analysis_confirm_deferred` | new | abandon | `question_count`<br>`picked_count` | FoodAnalysisConfirmation `handleDefer` (건너뛰기 + 안드 하드웨어 백) | 질문 몇 개까지 답하다 포기하는가 |
| `food_text_record_viewed` | new | screen | `slot` | TextRecord 닫힘→열림 전이 | '입력창까지 왔다가 한 글자도 안 씀' |
| `food_text_record_discarded` | new | abandon | `filled: boolean` | TextRecord `handleClose` (빈 입력 즉시 닫기 + 확인창 confirmed) | 글 경로의 포기. 원문도 길이도 안 싣는다 |
| `food_record_leave_prompted` | new | intent | `source: 'fresh'\|'recovered'`<br>`edited: boolean` | FoodAnalysisResult `handleClosePress` (확인창 띄우기 직전) | 문구가 붙잡는지 보려면 '띄운 수' 가 필요하다 |
| `food_record_result_abandoned` | new | abandon | `source`<br>`edited` | FoodAnalysisResult `handleClosePress` (confirmed 안) | 가장 비싼 이탈 — 서버 분석을 태우고 기록이 안 남는다 |
| `food_record_consult_started` | new | success | `source: fresh\|recovered\|saved` | FoodAnalysisResult `handleAskAboutMealPress` | **J2-0 정정 2.** 결과에서 나가는 네 번째 문. 없으면 abandoned 에 섞인다 |
| `food_record_consult_failed` | new | failure | `fail_kind` | useMealPersistenceActions `startConsultation` catch | `ensureMealDiary` 가 먼저 서버에 만들다 나는 400/5xx |
| `food_record_deleted` | new | success | `source: 'saved'` | FoodAnalysisResult `handleDeleteDiaryPress` (지워진 뒤) | 저장 뒤 되돌림 = 기록 품질 신호 |
| `food_record_delete_failed` | new | failure | `fail_kind` | useMealPersistenceActions `deleteSavedMeal` catch | 재시도 버튼이 없는 경로다 |
| `food_record_edit_cancelled` | new | abandon | `source`<br>`changed: boolean` | FoodResultEdit `handleCancel` (titleChanged 가 아닌 갈래) | '고치다 말고 취소' 와 '열어만 보고 닫음' 을 가른다 |
| `health_entry_input_started` | new | progress | `metric`<br>`input_kind: keypad\|stepper\|preset\|card` | useHealthEntryInput — **시트 열림당 1회** (시트 5종이 `markInput()` 만 부른다) | `sheet_opened` 와의 차 = 열자마자 닫음 |
| `health_entry_context_adjusted` | new | progress | `metric: 'blood_glucose'`<br>`timing`<br>`auto: boolean` | BloodGlucoseSheet 시점·끼니 칩 | 추론 기본값이 얼마나 자주 틀리는가. `auto` 는 **열릴 때의 기본값과 같은가** |
| `health_entry_save_started` | new | intent | `metric`<br>`item_count` | RecordView 네 handler + WaterSheet `commit`(잔 수를 시트만 안다) | CTA 는 눌렀는데 결과 이벤트가 없는 구간 |
| `stats_report_requested` | new | intent | `period`<br>`entry: 'enter'\|'period'\|'shift'` | StatsReportScreen 기간 전이 이펙트 (**queryFn 아님**) | staleTime 5분이라 queryFn 에 두면 캐시 히트에서 분모가 깨진다 |
| `stats_report_viewed` | new | screen | `period`<br>`reliability: LOW\|MEDIUM\|HIGH` | StatsReportScreen data 도착 전이 — 기간당 1회 | `requested − viewed` 가 못 본 몫 |
| `stats_report_failed` | new | failure | `period`<br>`fail_kind` | StatsReportScreen isError 전이 | 이 화면은 `presentError` 도 `V2ErrorState` 도 안 쓴다 — 여기서 안 세면 어디에도 안 남는다 |
| `food_analysis_failed` | change | failure | `method`<br>`fail_kind`<br>`wait_bucket`<br>`reason?`(옛 키, 전환 기간용) | useFoodAnalysis 세 자리 | 400·500·타임아웃·오프라인이 한 숫자였다 |
| `food_analysis_dismissed` | change | abandon | `method`<br>`status: QUEUED\|PERCEIVING\|RESOLVING\|NONE`<br>`wait_bucket` | useFoodAnalysis `dismissAnalysis` | 몇 초 기다리다 포기하는가. `NONE` 은 느린 분석이 아니라 **느린 업로드**다 |
| `food_record_save_failed` | change | failure | `source`<br>`fail_kind` (`not_ready` 포함) | useFoodAnalysis `registerDiary` · RecordView `handlePendingAddToRecord` | 요청이 나가지도 않은 실패는 `presentError` 를 안 지난다 |
| `food_record_edit_started` | change | intent | `source` | FoodResultEdit 마운트 | 신규 결과 다듬기와 저장본 교정은 다른 행동이다 |
| `health_entry_save_succeeded` | change | success | `metric`<br>`existing` | 훅 3개. `existing` 은 **화면이 판정해 넘긴다**(혈당은 그 칸=끼니×시점) | 다섯 시트가 한 숫자였다. 합계는 그대로라 옛 대시보드가 안 깨진다 |
| `health_entry_save_failed` | change | failure | `metric`<br>`fail_kind` | 훅 3개 | 400(KST 경계·유니크)과 5xx 는 대응이 갈린다 |
| `food_analysis_started` / `_succeeded` / `food_photo_confirm_*` / `food_photo_permission_denied` / `food_record_started` / `_method_selected` / `_result_viewed` / `_saved` / `_skipped` / `_edit_succeeded` / `_edit_failed` / `home_record_viewed` / `home_statistics_viewed` | keep | — | 그대로 | 그대로 | — |

### J2-3. 퍼널 (7) — **구현된 이름 기준 (2026-08-19 갱신)**

**F1. 식사 기록 전 구간(기록 진입 → 저장)** — window 60분

1. `event:food_record_sheet_viewed`
2. `event:food_record_method_selected`
3. `event:food_analysis_started`
4. `event:food_record_result_viewed`
5. `event:food_record_saved`

**앵커가 `screen:home` 이 아닌 이유(2026-08-19 정정)**: 앵커는 퍼스트터치(`min(ts)`)이고 창은 60분이다.
`screen:home` 을 스텝1로 두면 스텝1이 "조회 기간 안의 **최초** 홈 방문"이 되고 나머지 스텝은 그 방문으로부터
60분 안에 일어나야 한다 — 7일 대시보드에서 3일째 점심에 기록한 사람은 **전원 1→2 하락**으로 계산된다.
설계 §8 퍼널 규칙 2 가 "앵커를 희소한 의도 이벤트로" 라며 이 이름을 지목해 둔 그대로다.
"홈 방문 → 기록 진입"은 퍼널이 아니라 `home_record_viewed` 대 `food_record_sheet_viewed` 의 **비율**로 읽는다
(과거 날짜 조회는 `home_date_selected{is_today:false}` 로 차감).

읽는 법: 이 여정의 정본 퍼널. 1→2 는 시트에서 방법을 못 고르는 것, 2→3 은 권한·촬영·앨범 취소,
3→4 는 분석 실패·대기 포기, 4→5 는 가장 비싼 이탈.
**2→3 의 분모에서 `food_record_skipped{slot}` 을 뺀다** — `method:'skip'`(끼니 건너뛰기)은 같은 스텝2에 들어오지만
분석을 절대 태우지 않는다. 성공한 기록 행동인데 빼지 않으면 "카메라가 사람을 떨군다"는 잘못된 결론이 커진다
(퍼널 엔진은 스텝에 속성 필터를 못 걸어서 이 방법뿐이다). **2 의 분모에는 `recorded:true`(결과 보기 모드) 열림이 섞여 있다** — 기록 시도가 일어날 수 없는 열림이라, 2→3 을 절대값으로 읽으려면 그 몫을 속성 분해로 빼고 봐야 한다. `food_record_started` 는 method_selected 와 같은 틱이라 일부러 뺐다.

**F2. 앨범 경로 — 사진 확인 관문** — window 30분

1. `event:food_photo_confirm_viewed`
2. `event:food_photo_confirm_accepted`
3. `event:food_analysis_succeeded`
4. `event:food_record_saved`

읽는 법: 1→2 하락이 관문이 되돌린 오탭이다. **검산식은 `viewed = accepted + cancelled + (미해결 이탈)`** 이고,
`replaced` 는 여기 더하지 않는다(2026-08-19 정정) — 사진을 다시 고르면 `_replaced` 가 나가지만 확인 시트는
닫히지 않아 그 사람이 이어서 accepted 또는 cancelled 를 또 쏜다. 한 번 바꾸고 수락한 사람은
viewed 1 · replaced 1 · accepted 1 이다. `replaced ÷ viewed` 는 하락이 아니라 **사진 재선택률**로 따로 읽는다. accepted 직후 `food_analysis_started` 는 같은 틱이라 succeeded 로 건너뛴다.

**F3. 카메라 권한·촬영 관문** — window 30분

1. `event:food_record_sheet_viewed`
2. `event:food_photo_permission_granted`
3. `event:food_analysis_started`
4. `event:food_record_result_viewed`
5. `event:food_record_saved`

읽는 법: 1→2 가 권한 벽, 2→3 이 촬영/선택 취소(`food_photo_picker_cancelled` 와 합이 맞는다), 3→4 가 분석 실패·포기. `method_selected` 바로 다음에 `permission_granted` 를 두면 이미 허용된 사용자에게서 같은 초에 찍혀 통과하지 못하므로 `sheet_viewed` 를 앵커로 쓴다.

**F4. 결과 화면 — 수정하고 저장까지** — window 30분

1. `event:food_analysis_succeeded`
2. `event:food_record_edit_started`
3. `event:food_record_edit_succeeded`
4. `event:food_record_saved`

읽는 법: 2→3 하락은 수정 UI 에서의 포기(`food_record_edit_cancelled` 와 합이 맞는다), 3→4 는 고쳐 놓고도 안 담는 경우. 모든 전이가 사람의 탭이라 초 단위 충돌이 없다.

**스텝 1 이 `food_record_result_viewed` 가 아닌 이유(2026-08-19 정정)**: 그 이름은 **저장본 열람**에서도 나가는데
(`source:'saved'`), 저장본을 수정하면 `food_record_edit_succeeded` 까지는 정상으로 나가고 스텝4 `food_record_saved` 는
**구조적으로 못 나간다**(이미 저장돼 있어 담기 경로 자체가 없다). 그대로 두면 3→4 하락이 "고쳐 놓고 안 담은 사람"이
아니라 대부분 "저장본을 교정한 사람"이 된다. `food_analysis_succeeded` 는 신규·복구에서만 나가 분모가 자연히 좁혀진다.

**F5. 결과를 저장하지 않고 나가는 길** — window 30분

1. `event:food_analysis_succeeded`
2. `event:food_record_leave_prompted`
3. `event:food_record_result_abandoned`

읽는 법: 1→2 는 저장 없이 나가려 한 비율, 2→3 은 확인창이 붙잡지 못한 비율.

**스텝 1 이 `food_record_result_viewed` 가 아닌 이유(2026-08-19 정정)**: 그 이름은 저장본 열람(`source:'saved'`)에서도
나가는데, 저장본은 확인창 분기를 아예 타지 않아 `food_record_leave_prompted` 를 **구조적으로 못 쏜다**.
기록을 다시 열어 보는 것은 흔한 행동이라 1→2 가 저장본 열람량만큼 상시 과소로 나온다. **분모에서 `food_record_consult_started` 를 빼고 읽는다**(J2-0 정정 2) — 상담으로 빠져나간 사람은 이탈이 아니라 이 여정 최대의 전환이고, 그들은 확인창을 아예 안 본다. 2와 3 사이는 다이얼로그를 읽는 시간이라 통상 1초를 넘지만, 같은 초 tie 로 일부가 빠질 수 있으니 절대값보다 추세로 읽는다.

**F6. 분석 대기 포기 → 복구 저장** — window 120분

1. `event:food_analysis_dismissed`
2. `event:food_record_result_viewed`
3. `event:food_record_saved`

읽는 법: 기다리다 나간 사람이 복구된 결과로 돌아와 저장까지 가는 비율.
스텝2 `food_record_result_viewed` 는 저장본 열람이 선점할 수 있으므로 **상한 추정치**로 읽는다(2026-08-19 정정). 회수되지 않는 몫이 '분석이 느려서 잃은 기록' 의 크기다. `dismissed` 의 `wait_bucket`·`status` 와 함께 보면 몇 초부터 손실이 시작되는지, 그리고 그게 분석이 느린 것인지 업로드가 느린 것인지(`status:'NONE'`)가 나온다.

**F7. 건강기록 시트(물·혈압·혈당·체중·부종)** — window 30분

1. `event:health_entry_input_started`
2. `event:health_entry_save_succeeded`

**`screen:home` 을 앵커에서 뺐다(2026-08-19 정정)** — F1 과 같은 이유다: 기간 내 최초 홈 방문이 앵커가 되면
30분 창 밖의 모든 기록이 이탈로 계산된다. 홈 도달 대비 입력 시작은 퍼널이 아니라 비율로 읽는다.

읽는 법: 초안의 4스텝에서 `health_entry_sheet_viewed` 를 뺐다(J2-5). 대신 넣을 수 있는 `sheet_opened` 는 **홈의 모든 시트**(식사·사진 확인·삭제 확인 포함)를 세므로 스텝 2 에 두면 분모가 부풀어 2→3 하락이 통째로 거짓이 된다 — 퍼널 엔진은 스텝에 속성 필터를 못 건다(설계 §2 P4). 그래서 '열자마자 닫음' 은 이 퍼널이 아니라 **`sheet_dismissed{surface, dwell_bucket}` 분해**로 읽는다: `dwell_bucket:'instant'` 가 곧 그것이고, 다섯 surface 가 metric 과 1:1 이라 지표별로 바로 갈린다. 남은 2→3 은 순수하게 '입력하다 이탈 또는 저장 실패' 다. `save_started` 는 `save_succeeded` 와 같은 초에 겹칠 수 있어 인접 스텝으로 두지 않았다.

**(참고) 통계 리포트** — window 30분: `event:home_statistics_viewed` → `event:stats_report_requested` → `event:stats_report_viewed`. 상한 8스텝 안이고, `screen:statistics` 도 이제 화면 축에 있다(J2-4 3 갱신). 실패는 `stats_report_failed{fail_kind}` 로 따로 읽는다 — 이 화면에서 가장 흔한 실패는 장애가 아니라 **기록이 없는 기간**이다.

### J2-4. 주의

1) 새니타이저에 걸려 못 쓰는 키를 피해 고른 이름: meal_slot→slot, food_count→item_count, error_code→fail_kind, value/has_value→filled, image_uri→(아예 싣지 않음), date→days_back/is_today, title/name/text/content→(원문은 싣지 않고 boolean 또는 count 로만). **J2-0 정정 1 은 반만 맞다** — `picked_count` 는 `/answer/i` 에 걸리지 않는다(그 문자열이 안 들어 있다). 걸렸을 이름은 `answered_count` 쪽이고, 초안이 그걸 골랐다면 조용히 사라졌을 것이다. 정정이 지목한 위험(제안 키를 두 정규식에 대조하지 않는 것)은 옳으므로 결론 대신 **대조 자체**를 테스트로 남겼다(`tests/analyticsJourneyHome.test.ts`). 서버 정규식은 클라이언트와 다르다(`search`·`password`·`secret` 이 더 있다).

2) 같은 틱에 연속으로 나가 퍼널 인접 스텝으로 쓸 수 없는 쌍(초 정밀도·엄격 부등호):
 - food_record_started ↔ food_record_method_selected
 - food_photo_confirm_accepted ↔ food_analysis_started
 - food_analysis_succeeded ↔ food_record_result_viewed
 - food_analysis_started ↔ food_analysis_progressed(QUEUED) — 그래서 progressed 는 QUEUED 를 쏘지 않는다
 - health_entry_save_started ↔ health_entry_save_succeeded
 - food_record_method_selected ↔ food_photo_permission_granted (권한이 이미 허용이면 즉시 resolve)

3) 화면 축: `/statistics` 는 **이제 `screen_name='statistics'` 다**(1~3단계에서 라우트 키 표가 70개로 늘며 추가됐다) — 초안이 적은 'other' 는 옛 사실이다. 다만 시트·모달(MealSheet, MealPhotoConfirmSheet, 건강 시트 5종, FoodAnalysisResult, FoodResultEdit, TextRecord, FoodAnalysisConfirmation)은 라우트가 아니라 전부 `screen_name='home'` 아래에 묻힌다. 이 여정의 퍼널이 screen 스텝을 home 하나만 쓰고 나머지를 event 스텝으로 세운 이유가 이것이다. 시트까지 화면으로 세는 것은 축의 의미를 흐리므로 권하지 않는다 — 그 자리는 `sheet_opened{surface}` 가 이미 센다.

4) 볼륨/카디널리티: 고빈도 후보 둘에 1회 가드를 **테스트로 못 박았다**. `food_analysis_progressed` 는 `analysisId:status` 당 1회(분석 1건당 최대 2행) — "직전 상태와 다른가" 로는 모자란다: 확인 질문에 답하고 다시 폴링에 들어가면 같은 분석이 PERCEIVING 을 두 번 지난다. `health_entry_input_started` 는 시트 열림당 1회이고 가드는 **닫힐 때 풀린다**(같은 사람이 물을 두 번 기록하면 두 번 세는 것이 맞다. 기록 시트는 한 번 열린 뒤 계속 마운트를 유지하므로 마운트 1회로 잠그면 두 번째 기록이 안 보인다). 물 시트의 addPending 은 잔마다 쏘지 않고 저장 때 `item_count` 로 접는다. id 류는 새로 늘리지 않았다. wait_bucket·days_back 은 4구간 범주형이다.

5) 개인정보: 혈당·혈압·체중 수치, 자유 입력 글(길이도), 사진 URI, 음식명, 확인 질문 문구와 선택지는 어떤 이벤트에도 싣지 않았다. filled/existing/item_count/question_count/picked_count 같은 **모양**만 남는다.

6) 기존 대시보드 호환: change 6건은 모두 속성 추가이며 이벤트명은 그대로다 — 기존 카운트 시계열은 끊기지 않는다. `food_analysis_failed` 의 옛 `reason` 은 `fail_kind` 로 흡수되지만 **전환 기간에는 두 키를 같이 싣는다**(confirmation_unavailable 갈래에서만 `reason` 이 나간다 — 그것이 옛 질의가 보던 유일한 값이다).

7) 구현 메모: `health_entry_input_started` 는 시트 5종의 컨트롤이 제각각이라 한 자리에서 못 잡는다. **잡는 자리는 시트마다 두되 가드와 이벤트 모양은 훅 하나**(`useHealthEntryInput`)로 모았다 — 가드가 다섯 벌로 흩어지면 하나만 빠져도 그 지표가 통계를 지배한다. `existing` 은 훅이 아니라 **화면이 판정해 넘긴다**: 훅이 다시 조회하면 시트가 열려 있는 동안의 refetch 와 어긋나 같은 저장이 어떤 때는 새 기록, 어떤 때는 수정으로 세어진다. 혈당만은 그 **칸**(끼니×시점)을 본다 — 하루에 여러 번 재는 지표라 "그날 기록이 있다" 로 보면 두 번째 측정이 전부 수정이 된다.

### J2-5. 초안에서 **만들지 않은** 이름 5개와 그 대체 (2026-08-19)

공용 통로(L2)와 화면 축(L1)이 이미 덮는 것을 여정 이름으로 다시 지으면, 같은 사건이 여정 수만큼 다른 이름으로 흩어진다. `tests/analyticsJourneyHome.test.ts` 가 이 다섯이 되살아나지 않는 것을 CI 에서 막는다.

| 만들지 않은 이름 | 무엇이 대신 덮는가 |
|---|---|
| `health_entry_sheet_viewed` | `sheet_opened{surface}`. 다섯 surface(`home_water_record`·`home_blood_pressure`·`home_blood_glucose`·`home_weight`·`home_edema`)가 `metric` 과 **1:1** 이라 축이 그대로 산다. 잃은 것은 `existing`·`is_today` 뿐이고, 그 둘은 저장 이벤트(`health_entry_save_succeeded.existing`)와 날짜 이벤트(`home_date_selected.is_today`)가 이미 말한다. |
| `health_entry_sheet_dismissed` | `sheet_dismissed{surface, dwell_bucket}`. `dwell_bucket:'instant'` 가 초안의 '열자마자 닫음' 이고, 이건 초안의 `filled` 보다 **더 정확하다**(값을 넣다 나간 것은 `health_entry_input_started` 와의 차로 나온다). 물 시트의 '담아 두고 저장 안 함' 은 `input_started` 있음 + `save_started` 없음으로 읽는다. |
| `food_record_delete_prompted` | `sheet_opened{surface:'home_meal_delete'}`. 삭제 확인이 `V2BottomSheet` 라 공용 통로가 이미 센다 — 그것과 `food_record_deleted` 의 차가 곧 확인 시트가 되돌린 오조작이다. |
| `food_record_open_failed` | `app_error_presented`. 저장된 끼니를 여는 `fetchQuery` 의 catch 가 `presentError` 를 부른다 — `FOOD_CAMERA_013`(지워진 기록)은 `code` 로 갈리고 `screen_name='home'` 이 자리를 말한다. |
| `food_record_skip_failed` | `app_error_presented`. 건너뛰기 catch 도 `presentError` 를 지나간다. `slot` 축을 잃지만, 그건 `food_record_method_selected{method:'skip', slot}` 과 `food_record_skipped{slot}` 의 차로 이미 보인다. |

반대로 **남긴** 실패 넷은 공용 통로가 구조적으로 닿지 않는 자리다(J1 과 같은 판정): `food_record_save_failed{fail_kind:'not_ready'}`(토스트를 직접 띄운다) · `food_record_delete_failed`(재시도 버튼이 없어 실패하면 그대로 끝난다) · `food_record_consult_failed`(오류가 boolean 으로 접혀 호출부에 안 온다) · `stats_report_failed`(`presentError` 도 `V2ErrorState` 도 안 쓰고 자기 카드를 그린다). 넷 다 `toAnalyticsFailKind` 를 써서 갈래 판정을 새로 짓지 않는다.

---

## J3. 레시피

> 레시피 탭 → 검색·필터로 좁히기 → 레시피 상세(영양·재료·조리 단계·리뷰) → 저장/보관함 회수 → 레시피 작성(등록·이탈)·수정 스텁. 코드 실사 결과 이 여정 전체에 trackAnalyticsEvent 호출이 **0건**이다(grep: src/features/recipe/**, app/recipe/**, app/(write)/recipe/** 에 단 한 건도 없음). 지금 남는 것은 useAnalyticsLifecycle 이 라우트에서 자동으로 쏘는 screen_viewed 뿐이고, 그마저도 레시피 탭만 screen='recipe' 이고 상세·보관함은 'other', 작성은 'community_write' 로 뭉개진다.

### J3-0. 검증에서 확정된 정정 (2건)

| 대상 | 종류 | 무엇이 틀렸나 | 어떻게 고치나 |
|---|---|---|---|
| `퍼널 F1 '레시피 탐색 → 조리까지 읽음' / F7 '리뷰까지 남기는가'` | funnel_constraint | recipe_ingredients_viewed → recipe_steps_viewed 를 인접 스텝으로 뒀다. 두 이벤트는 스펙 자신이 지정한 구현(app/recipe/[id]/index.tsx:397 onScroll 에 각 Block 의 onLayout y 를 물려 발화)상 **같은 onScroll 콜백 한 번에 둘 다 임계선을 넘을 수 있다** — 짧은 레시피나 플릭 스크롤에서 흔하다. server_ts 는 초 정밀도이고 funnel.ts:97 의 조인이 `sc.ts > p.t`(엄격)이라 그 사용자는 3→4 에서 통째로 빠진다. F7 의 steps_viewed → reviews_viewed 도 같다. notes 6) 의 '같은 틱 회피 쌍' 목록에 이 조합만 빠져 있다. | 섹션 노출 이벤트끼리는 인접 스텝으로 두지 말 것. F1 은 recipe_card_opened → recipe_steps_viewed → recipe_save_toggled 로 줄이고 ingredients 는 비율로 읽거나, 발화 시 이전 섹션 이벤트와 같은 초면 다음 섹션을 1초 미루는 대신 '가장 깊게 도달한 섹션' 한 이벤트(depth 속성)로 접을 것. |
| `recipe_detail_viewed (fireAt: app/recipe/[id]/index.tsx:375)` | bad_path | index.tsx:375 는 컴포넌트 render 본문의 `return (` 이다(로딩 343·오류 362 조기 반환 뒤). 이 화면은 스크롤할 때마다 setTitleInBar(:399) 로 리렌더되므로 render 자리에서 쏘면 상세 1회가 아니라 스크롤마다 나간다. 같은 파일 :169 의 useEffect([recipeId]) 는 detail 도착 전에 돌아 step_count·ingredient_count 등 제안된 속성을 채울 수 없다(:176-182 주석이 그 시점 차이를 명시한다). 같은 계열로 recipe_list_empty_viewed(:768)·recipe_list_load_failed(:711)도 FlashList 의 ListEmptyComponent 렌더식 안이라 리렌더마다 중복 발화한다 — 식당 여정 notes 4) 는 이 함정을 자기 목록에 대해 명시했는데 레시피 여정에는 그 경고가 없다. | detail!=null 로 전이할 때 도는 useEffect + recipeId 별 ref 가드에서 쏠 것(빈 결과·실패도 list.isError/list.items.length 전이 이펙트로). fireAt 을 렌더 라인이 아니라 이펙트로 다시 적을 것. |

### J3-1. 단계 (32)

| # | 단계 | 표면/라우트 | 코드 | 여기서 왜 빠져나가나 | 현재 계측 |
|---|---|---|---|---|---|
| 1 | 레시피 탭 진입 | `/(tabs)/recipe` | `app/(tabs)/recipe.tsx:11 → src/features/recipe/views/RecipeHomeScreen.tsx:154` | 탭만 눌러 보고 아무것도 안 누른 채 다른 탭으로 나간다. 지금은 '들어왔다'만 알고 '뭘 하다 나갔는지'를 전혀 모른다. | screen_viewed { screen: 'recipe' } (useAnalyticsLifecycle.ts:53 이 자동 발화) |
| 2 | 첫 진입 기능 안내 시트 | `/(tabs)/recipe · FeatureIntroSheet 모달` | `src/features/recipe/views/RecipeHomeScreen.tsx:547 → src/features/coach/useFeatureIntro.ts:22` | 처음 온 사람에게만 뜨는 시트다. 여기서 닫지 않고 백으로 나가면 '끼니 슬롯이 뭔지, 수치가 한 명 기준인지'를 영원히 모른 채 목록을 쓴다. 첫 세션 이탈이 여기 숨는다. | 없음 |
| 3 | 오늘의 끼니 섹션 로딩(스켈레톤) | `/(tabs)/recipe · ②층` | `src/features/recipe/hooks/useRecipeHome.ts:69 · RecipeHomeScreen.tsx:441` | GET /recipes/home 이 느리면 화면 위쪽이 카드 실루엣만 남는다. 스켈레톤을 보다 나간 사람은 '레시피가 없다'로 읽는다. | 없음 |
| 4 | 끼니 섹션 로드 실패 → 재시도 줄 | `/(tabs)/recipe · ②층 오류` | `src/features/recipe/views/RecipeHomeScreen.tsx:370-399 (refetchHome L385)` | 목록(③층)은 살아 있는데 섹션만 죽은 상태. 재시도를 누르는 사람이 몇 %인지, 실패 자체가 얼마나 자주인지 지금 관측 불가. | 없음 |
| 5 | 끼니 섹션 노출(currentSlot·'왜 이 끼니부터인가' 한 줄) | `/(tabs)/recipe · ②층` | `src/features/recipe/views/RecipeHomeScreen.tsx:408-440 · src/features/recipe/components/list/RecipeMealSection.tsx:75` | 서버가 고른 끼니가 사용자 의도와 다르면(아침을 기록해 점심부터 뜸) 훑지도 않고 아래로 스크롤하거나 나간다. currentSlot 이 맞았는지 아닌지가 지금 전혀 안 보인다. | 없음 |
| 6 | 카테고리 캐러셀 선택(한 번에 하나) | `/(tabs)/recipe · ②층 캐러셀` | `src/features/recipe/views/RecipeHomeScreen.tsx:290-300 (handleToggleCategory)` | 카테고리를 고르면 끼니 섹션이 통째로 사라지고 목록만 남는다(설계 의도). 이 순간 '화면이 깨졌다'고 읽고 나가는 사람이 있고, 어느 카테고리가 실제로 쓰이는지도 모른다. | 없음 |
| 7 | 검색창 포커스(제안 패널 진입) | `/(tabs)/recipe · ①층 검색` | `src/features/recipe/views/RecipeHomeScreen.tsx:646 → src/features/recipe/hooks/useRecipeSearch.ts:93` | 검색창을 눌렀는데 한 글자도 안 치고 닫는다 = '뭘 검색해야 할지 모른다'. 검색 퍼널의 진짜 1단계는 커밋이 아니라 여기다. | 없음 |
| 8 | 자동완성 제안 노출/선택 | `/(tabs)/recipe · RecipeSuggestPanel` | `src/features/recipe/components/list/RecipeSuggestPanel.tsx:29,66,114 · useRecipeSearch.ts:56-67` | 400ms 디바운스 뒤 제안 0건이면(패널 L93 분기) 사용자는 그대로 포기한다. 제안이 비는 빈도와 '제안을 골랐나 직접 엔터쳤나'가 검색 품질 판정의 유일한 축인데 지금 없다. | 없음 |
| 9 | 검색 확정(커밋) → 목록 질의 | `/(tabs)/recipe` | `src/features/recipe/views/RecipeHomeScreen.tsx:254-260 (handleCommitSearch) → useRecipeSearch.ts:69` | 확정했는데 결과가 안 온다/느리다. 커밋과 결과 노출을 따로 안 찍으면 '검색이 안 먹는다'는 민원을 재현할 수 없다. | 없음 |
| 10 | 필터 시트 열기 → 적용 또는 그냥 닫기 | `/(tabs)/recipe · RecipeFilterSheet` | `RecipeHomeScreen.tsx:648(open) · src/features/recipe/components/list/RecipeFilterSheet.tsx:197-201(apply+close)` | 시트를 열고 아무것도 안 고르고 닫는 것이 가장 흔한 이탈이다. 지금은 '연 사실'조차 없으니 시트 자체가 쓸모없는지 옵션이 안 맞는지 구분 불가. | 없음 |
| 11 | 정렬 변경(추천/최신/별점/저장순/빠른 조리) | `/(tabs)/recipe · ③층` | `RecipeHomeScreen.tsx:519 → src/features/recipe/components/list/RecipeSortRow.tsx:90` | '빠른 조리'는 시안에 없이 우리가 넣은 축이다. 아무도 안 쓰면 칩 한 칸을 낭비하는 것이고, 많이 쓰면 기본 정렬을 바꿔야 한다. 현재 판단 근거 0. | 없음 |
| 12 | 결과 목록·결과 수 노출 | `/(tabs)/recipe · ③층` | `RecipeHomeScreen.tsx:497-511 · src/features/recipe/hooks/useRecipeListV2.ts:105-113` | 결과가 왔는데 한 장도 안 누르고 나간다. '몇 건 나왔을 때 안 누르는가'(0건인가, 3건인가, 200건인가)가 검색·필터 품질의 답인데 관측 불가. | 없음 |
| 13 | 목록 빈 결과 / 목록 조회 실패 | `/(tabs)/recipe · ListEmptyComponent` | `RecipeHomeScreen.tsx:711-767(실패·재시도) · 768-798(빈 결과)` | 여정의 벽. 좁혀서 0건인 것과 서버가 죽은 것이 사용자에겐 같은 빈 화면인데, 지금 둘 다 안 찍혀서 어느 쪽이 얼마나 나는지 모른다. | 없음 |
| 14 | 목록 다음 페이지(무한 스크롤) | `/(tabs)/recipe · ③층` | `RecipeHomeScreen.tsx:705(onEndReached) → useRecipeListV2.ts:115-119` | 1페이지에서 못 고르고 계속 내리는 사람 = 추천 순서가 틀렸다는 신호. 몇 페이지째에서 포기하는지가 랭킹 판정치인데 없다. | 없음 |
| 15 | 카드 탭 → 상세로 push | `/(tabs)/recipe → /recipe/[id]` | `RecipeHomeScreen.tsx:313-318 (handleOpenRecipe)` | 어느 문(끼니 섹션 캐러셀 / 카탈로그 목록 / 자동완성 / 보관함)으로 들어왔는지가 안 남는다. 문마다 이탈률이 다른데 상세만 보면 구분이 안 된다. | 없음 |
| 16 | 상세 로딩 / 상세 실패(404·네트워크·거부) | `/recipe/[id]` | `app/recipe/[id]/index.tsx:343-352(로딩) · 362-373(실패, classifyFetchFailure)` | 딥링크(sinsin://recipe/:id)로 들어와 404 를 맞는 경로가 실재한다(파일 머리말 실측). 실패 화면에서 '다시 시도'와 '목록으로' 중 뭘 누르는지, 아니면 그냥 나가는지가 안 보인다. | screen_viewed { screen: 'other' } 만 — 상세인지 아닌지 구분 불가 |
| 17 | 상세 본문 진입(사진·제목·저장/공유 줄) | `/recipe/[id] · 첫 블록` | `app/recipe/[id]/index.tsx:405-436 (RecipeHeroImage·RecipeTitleBlock·RecipeActionRow)` | 레시피 사진이 dev DB 175건 전부 null 이다. 첫 화면이 카테고리 일러스트뿐이라 '내용이 없어 보여' 바로 뒤로 가는 이탈이 여기서 난다. | 없음 |
| 18 | 영양 카드 도달 · 출처(provenance) 시트 | `/recipe/[id] · 두 번째 블록` | `app/recipe/[id]/index.tsx:438-446 · ProvenanceSheet L444/482` | '내 남은 양 대비 %'를 보고 '나한테 안 맞네' 하고 나가는 정당한 이탈이 있다. 이걸 못 세면 영양 카드가 이탈을 만드는지 신뢰를 만드는지 판단할 수 없다. | 없음 |
| 19 | 재료 섹션: 인분 조절 · 준비 체크 | `/recipe/[id] · 세 번째 블록` | `app/recipe/[id]/index.tsx:448-458 · handleToggleChecked L184 · IngredientSection.tsx:134-152(스테퍼)` | 이 화면에서 가장 쓸모 있다고 설계한 컨트롤인데(파일 머리말) 아무도 안 만질 수 있다. 체크를 시작만 하고 조리 단계까지 못 간 사람이 '레시피를 보다 만 사람'의 정체다. | 없음 |
| 20 | 조리 단계 도달 · 단계 타이머 사용 | `/recipe/[id] · 네 번째 블록` | `app/recipe/[id]/index.tsx:460-462 · src/features/recipe/components/detail/StepTimerButton.tsx:28-56` | 여정의 목적지. 여기 도달률이 곧 '레시피를 실제로 썼나'이고, 타이머 시작 대비 완주율은 '조리 중 앱을 계속 켜 두는가'다. 지금 둘 다 0. | 없음 |
| 21 | 저장 토글(상세) | `/recipe/[id] · RecipeActionRow` | `app/recipe/[id]/index.tsx:233-240 (handleToggleSave) → useRecipeDetailV2.ts:144` | 저장은 '나중에 하겠다'는 유일한 신호다. 실패 시 낙관 갱신을 되돌리는데(useRecipeDetailV2 onError) 실패율이 관측 안 돼, 사용자는 저장했다고 믿고 보관함에서 못 찾는다. | 없음 |
| 22 | 공유 | `/recipe/[id] · RecipeActionRow` | `app/recipe/[id]/index.tsx:204-231 (handleShare)` | 공유 시트가 뜨지 않는 사고 이력이 있다(네이티브 present 는 모달 전환 뒤). 호출만 하고 결과를 안 보면 조용히 아무 일도 안 일어난 것을 못 잡는다. | 없음 |
| 23 | 리뷰: 목록 도달 → 작성 열기 → 제출/실패/취소 | `/recipe/[id] · 다섯 번째 블록 + ReviewComposer 전체화면 모달` | `app/recipe/[id]/index.tsx:464-478(섹션·onWrite L473) · handleSubmitReview L242 · ReviewComposer.tsx:29` | 컴포저를 열고 별점만 고르다 닫는 이탈이 크다(별점 전엔 버튼이 '별점을 골라 주세요'). 열기-제출 차이가 그대로 포기율이다. | 없음 |
| 24 | 보관함 진입(저장/최근) · 탭 전환 | `/recipe/saved · /recipe/recent` | `RecipeHomeScreen.tsx:598(헤더 칩) → src/features/recipe/archive/RecipeArchiveScreen.tsx:148 · handleChangeTab L197` | 헤더 칩이 생기기 전엔 딥링크로만 도달 가능했던 화면이다. 저장한 사람이 실제로 회수하러 오는지(저장→보관함→다시 열기)가 이 기능의 존재 이유인데 지금 0. | screen_viewed { screen: 'other' } |
| 25 | 보관함 빈 상태 / 좁혀서 0건 / 조회 실패 | `/recipe/saved · /recipe/recent` | `src/features/recipe/archive/RecipeArchiveScreen.tsx:401-443 (resolveArchiveEmpty L406)` | 보관함은 처음 오면 거의 항상 비어 있다. '비어서 나갔다'와 '검색해서 0건이라 나갔다'와 '실패해서 나갔다'가 지금 한 덩어리다. | 없음 |
> ⚠ 2026-08-21: 레시피 작성 화면이 `components/write/RecipeWriteForm.tsx` →
> `views/RecipeWriteScreen.tsx` 로, 그 로직이 `hooks/useRecipeWriteScreen.ts` 로 옮겨졌다.
> 아래 표의 **줄 번호는 이동으로 무효**라 떼어 냈다 — 계측을 붙일 때 다시 확인할 것.

| 26 | 레시피 작성 진입 | `/(write)/recipe/new` | `RecipeHomeScreen.tsx:622(헤더 '쓰기' 칩) → app/(write)/recipe/new.tsx:10 → src/features/recipe/views/RecipeWriteScreen.tsx` | 플로팅에서 헤더 칩으로 올린 뒤 진입 자체가 줄었을 수 있다(스크롤을 따라오지 않는다). 진입 수를 모르면 그 결정이 옳았는지 되돌아볼 근거가 없다. | screen_viewed { screen: 'community_write' } — 커뮤니티 글쓰기와 같은 화면명으로 뭉개진다 |
| 27 | 작성 필수 진행(제목·한줄소개·음식종류·재료·조리순서) | `/(write)/recipe/new` | `writeFormState.ts(evaluateRecipeWriteForm — `missing` 이 곧 버튼 위 한 줄)` | **아코디언은 2026-08-20 에 없어졌다(평면 스크롤).** 이제 좌표는 섹션이 아니라 `missing[0]` — 어느 필수에서 손을 놓았나다. | 없음 |
| 28 | 작성 사진 첨부 · 업로드 실패/재시도 | `/(write)/recipe/new · PhotoPickerRow` | `hooks/useRecipeWriteScreen.ts(addPhotos · uploadPhoto — 실패 시 status:'failed' · retryPhoto)` | 업로드 중이면 등록 버튼이 잠긴다(evaluation.photosUploading). 업로드가 실패해 status:'failed' 로 남으면 사용자는 왜 등록이 안 되는지 모른 채 나간다. | 없음 |
| 29 | 영양 미리보기 계산(이 갈래의 핵심 가치) | `/(write)/recipe/new · 재료 섹션` | `RecipeWriteScreen.tsx(NutritionPreviewCard) · src/features/recipe/hooks/useNutritionPreview.ts:52-60` | 400ms 뒤 POST /recipes/nutrition/preview 가 실패하면 수치 대신 오류가 뜬다. '재료를 적었는데 영양이 안 나온다'가 작성 포기의 큰 원인인데 실패율·미매칭 재료 수를 아무도 모른다. | 없음 |
| 30 | 등록 제출 → 성공(토스트+닫힘) / 실패 | `/(write)/recipe/new · WriteSubmitBar` | `RecipeWriteScreen.tsx` | 실패는 대부분 400 이고 서버만 이유를 안다. 재시도 없이 나가면 작성한 것이 통째로 사라진다 — 제출/성공/실패를 나눠 찍지 않으면 이 손실이 안 보인다. | 없음 |
| 31 | 작성 이탈 확인 모달(계속 쓰기 / 나가기) | `/(write)/recipe/new · ConfirmExitModal` | `RecipeWriteScreen.tsx(handleClose) · 589-600(모달, onConfirm L596)` | 여정에서 가장 값비싼 이탈이다. '어디까지 채운 채로 버렸나'(필수 N/5, 재료·단계 수)를 같이 안 남기면 폼의 어느 칸이 사람을 쫓아내는지 영원히 모른다. | 없음 |
| 32 | 레시피 수정 시도 → '수정 불가' 스텁 | `/recipe/edit/[id]` | `app/(write)/recipe/edit/[id].tsx:33-75` | 서버에 PUT /recipes/{id} 가 없어 화면이 '왜 없는지'만 말한다. 여기 도달 횟수가 곧 수정 기능의 수요치인데 지금 0건으로 보인다(= 수요가 없다고 오독하게 된다). | 없음 |

### J3-2. 이벤트 (59 = 신규 58 · 변경 0 · 유지 1)

| 이벤트 | 상태 | 종류 | 속성 | 발화 지점 | 없으면 못 보는 이탈 |
|---|---|---|---|---|---|
| `recipe_archive_empty_viewed` | new | failure | `tab: 'saved'\|'recent'`<br>`narrowed: boolean`<br>`kind: 'empty'\|'narrowedEmpty'\|'loadError' — resolveArchiveEmpty 의 판정` | src/features/recipe/archive/RecipeArchiveScreen.tsx:406 resolveArchiveEmpty 호출부 | 보관함 첫인상. 비어서 나간 사람과 실패해서 나간 사람을 가른다. |
| `recipe_archive_tab_changed` | new | intent | `tab: 'saved'\|'recent'` | src/features/recipe/archive/RecipeArchiveScreen.tsx:197 handleChangeTab | '최근 본 기록'이 실제로 쓰이는 축인지. 안 쓰이면 탭 하나를 접을 수 있다. |
| `recipe_archive_viewed` | new | screen | `tab: 'saved'\|'recent'`<br>`entry: 'header'\|'deep_link'`<br>`item_count: number — 첫 조회 결과 수` | src/features/recipe/archive/RecipeArchiveScreen.tsx:148 마운트 시(initialTab 기준, 첫 응답 도착 후) | 저장한 사람이 회수하러 오는지. 이 화면은 최근까지 어떤 화면에서도 도달 불가였다 — 진입 수가 헤더 칩의 성적표다. |
| `recipe_card_opened` | new | intent | `source: 'home_section'\|'list'\|'suggestion'\|'archive_saved'\|'archive_recent'\|'deep_link'`<br>`slot: string — home_section 일 때만 그 섹션의 끼니, 아니면 'none'`<br>`position: number — 0-19, 20 이상은 20 으로 클램프(카디널리티 상한)`<br>`saved: boolean — 카드가 이미 저장된 상태였는가` | src/features/recipe/views/RecipeHomeScreen.tsx:313 handleOpenRecipe · src/features/recipe/archive/RecipeArchiveScreen.tsx:247 | 어느 문이 실제로 쓰이는지. 문마다 이탈률이 달라서 이게 없으면 상세 지표를 해석할 수 없다. id 대신 source·position 범주형으로 접었다. |
| `recipe_category_selected` | new | intent | `category: string — 옵션 키 enum(korean/chinese/… 서버 표기가 아니라 필터 모델 키)`<br>`selected: boolean — 켠 것인지 끈 것인지`<br>`source: 'carousel'\|'sheet'` | src/features/recipe/views/RecipeHomeScreen.tsx:290 handleToggleCategory / 298 handleClearCategories | 카테고리를 고르면 끼니 섹션이 통째로 사라진다. 그 직후 이탈이 몰리면 그 설계를 되돌려야 한다. |
| `recipe_detail_load_failed` | new | failure | `fail_kind: string — classifyFetchFailure 결과 범주(NOT_FOUND/NETWORK/REQUEST_REJECTED/BAD_PARAM)`<br>`source: string` | app/recipe/[id]/index.tsx:362-373 (recipeId==null 인 L333 분기는 fail_kind='BAD_PARAM') | 딥링크 404 가 실제로 얼마나 나는지. 지금은 사용자만 안다. |
| `recipe_detail_retried` | new | intent | `fail_kind: string` | app/recipe/[id]/index.tsx:368 onRetry={() => void detailQuery.refetch()} | 실패 화면에서 되살아나는 비율 대 그냥 나가는 비율. |
| `recipe_detail_viewed` | new | screen | `source: string — recipe_card_opened 와 같은 enum`<br>`step_count: number`<br>`ingredient_count: number`<br>`adjustable: boolean — 인분 조절 가능한 레시피인가`<br>`saved: boolean`<br>`authored: boolean — 내가 쓴 레시피인가`<br>`has_photo: boolean — heroImageUrl 이 있는가` | app/recipe/[id]/index.tsx:375 본문 렌더 진입(detail != null 이 된 첫 프레임). 파라미터만 바뀌는 재진입은 L169 useEffect([recipeId]) 로 다시 쏜다 | 상세의 분모. has_photo=false 가 100%인 지금, 사진 유무가 이탈에 얼마나 걸리는지 나중에 대조할 기준선이 된다. |
| `recipe_edit_unavailable_viewed` | new | screen | — | app/(write)/recipe/edit/[id].tsx:33 마운트 | 서버에 수정 엔드포인트가 없어 스텁만 뜬다. 이 도달 수가 곧 수정 기능의 수요치인데, 안 찍으면 수요가 0 인 것처럼 보인다. |
| `recipe_filter_applied` | new | success | `filter_count: number — 적용 후 총 개수`<br>`group_count: number — 몇 개 축(그룹)에 걸었는가`<br>`changed: boolean — 열 때와 달라졌는가`<br>`surface: 'home'\|'archive'` | src/features/recipe/components/list/RecipeFilterSheet.tsx:199 onApply(draft) 직전 | 필터 시트가 실제로 결과를 좁히는 데 쓰이는지. changed:false 가 많으면 시트가 확인용으로만 열린다. |
| `recipe_filter_sheet_dismissed` | new | abandon | `filter_count: number`<br>`surface: 'home'\|'archive'` | src/features/recipe/components/list/RecipeFilterSheet.tsx:73 V2BottomSheet onClose(적용 버튼을 거치지 않은 닫힘만) | opened − applied 를 추론이 아니라 실측으로 확정한다. |
| `recipe_filter_sheet_opened` | new | intent | `filter_count: number — 열 때 이미 걸려 있던 수`<br>`surface: 'home'\|'archive'` | src/features/recipe/views/RecipeHomeScreen.tsx:648 onOpenFilters · RecipeArchiveScreen.tsx:470 | applied 와의 차이가 곧 '열었다가 그냥 닫은' 비율이다. |
| `recipe_home_sections_failed` | new | failure | `fail_kind: 'network'\|'server'\|'rejected'\|'other'` | src/features/recipe/views/RecipeHomeScreen.tsx:370 homeIsError 가 true 로 전이할 때 | ②층만 죽고 ③층은 사는 반쪽 화면의 빈도. 지금은 사고가 나도 지표가 조용하다. |
| `recipe_home_sections_loaded` | new | progress | `section_count: number — 서버가 준 끼니 섹션 수`<br>`item_count: number — 전체 카드 수`<br>`slot: 'breakfast'\|'lunch'\|'dinner'\|'snack' — 서버가 고른 currentSlot`<br>`slot_reason: string — SlotDecision.reason 범주형(시계 그대로면 'clock')` | src/features/recipe/hooks/useRecipeHome.ts:69 useQuery 성공 시 1회(화면단이면 RecipeHomeScreen.tsx:186-192 에서 isLoading→false 전이) | 섹션이 실제로 뜬 세션과 스켈레톤만 보고 나간 세션을 가른다. slot 이 맞았는지도 여기서만 볼 수 있다. |
| `recipe_home_sections_retried` | new | intent | — | src/features/recipe/views/RecipeHomeScreen.tsx:385 onPress={() => void refetchHome()} | 실패 화면에서 되살리려 시도한 비율. 0 에 가까우면 재시도 줄이 안 읽히는 것이다. |
| `recipe_ingredient_checked` | new | progress | `checked_count: number`<br>`ingredient_count: number` | app/recipe/[id]/index.tsx:184 handleToggleChecked — **첫 체크 1회**와 **전부 체크 완료 1회**만 쏜다(매 체크마다 쏘지 않는다) | 장을 보거나 조리를 시작했다는 유일한 신호. 볼륨 때문에 두 경계만 남긴다. |
| `recipe_ingredients_viewed` | new | progress | `ingredient_count: number`<br>`adjustable: boolean` | app/recipe/[id]/index.tsx:448-458 재료 블록 첫 노출(상세 1회) | 레시피를 '읽기 시작한' 지점. 여기까지 왔는데 조리 단계로 못 간 사람이 이 여정의 핵심 이탈이다. |
| `recipe_intro_dismissed` | new | abandon | — | src/features/recipe/views/RecipeHomeScreen.tsx:550 onClose → src/features/coach/useFeatureIntro.ts:47 dismiss | viewed 는 있는데 dismissed 가 없는 사람 = 안내 시트를 띄운 채 앱을 나간 사람. |
| `recipe_intro_viewed` | new | screen | — | src/features/recipe/views/RecipeHomeScreen.tsx:547 FeatureIntroSheet 가 visible 로 바뀔 때(useFeatureIntro.ts:37 setVisible(true) 시점) | 첫 세션 사용자만 보는 관문. 이걸 안 세면 아래 dismiss 율의 분모가 없다. |
| `recipe_list_empty_viewed` | new | failure | `narrowed: boolean — 검색어나 필터가 걸린 상태인가`<br>`q_length: number`<br>`filter_count: number`<br>`surface: 'home'\|'archive'` | src/features/recipe/views/RecipeHomeScreen.tsx:768 (빈 결과 분기) · src/features/recipe/archive/RecipeArchiveScreen.tsx:401 emptyBody | 여정의 벽. '좁혀서 0건'과 '원래 아무것도 없다'를 narrowed 로 가른다. |
| `recipe_list_load_failed` | new | failure | `fail_kind: 'network'\|'server'\|'rejected'\|'other'`<br>`surface: 'home'\|'archive'` | src/features/recipe/views/RecipeHomeScreen.tsx:711 (list.isError 분기) · RecipeArchiveScreen.tsx:357(목록이 있는 채로 실패한 경우 포함) | 빈 화면의 원인이 우리 쪽인지 사용자 회선인지 구분. 문구는 이미 원인별인데 지표만 없었다. |
| `recipe_list_page_loaded` | new | progress | `page_index: number — 0부터`<br>`item_count: number — 그 페이지로 늘어난 누적 수`<br>`surface: 'home'\|'archive'` | src/features/recipe/views/RecipeHomeScreen.tsx:705 onEndReached → useRecipeListV2.ts:115 loadMore 의 성공 콜백 | 몇 페이지째까지 내려도 못 고르는가 = 추천 순서가 틀렸다는 가장 값싼 증거. |
| `recipe_nutrition_viewed` | new | progress | `provenance: string — 'reference_estimate'\|'computed_from_ingredients'`<br>`percent_shown: boolean — 내 남은 양 대비 %가 그려졌는가`<br>`servings: number — 기준 인분` | app/recipe/[id]/index.tsx:438-446 영양 블록이 뷰포트에 처음 들어올 때(onLayout+onScroll 로 상세 1회) | '수치를 보고 나갔다'와 '수치를 못 보고 나갔다'는 다른 이탈이다. 퍼널 스텝으로 쓸 수 있게 섹션별로 이름을 나눴다. |
| `recipe_provenance_opened` | new | intent | `provenance: string` | app/recipe/[id]/index.tsx:444 onOpenProvenance | 수치를 의심한 사람의 수. 신뢰 문제인지 아닌지의 대리 지표. |
| `recipe_review_dismissed` | new | abandon | `rating_picked: boolean — 별점을 골랐다가 닫았는가`<br>`has_body: boolean` | app/recipe/[id]/index.tsx:490 ReviewComposer onClose(제출 성공으로 닫히는 L248 은 제외) | '별점만 고르고 닫는' 이탈이 실제로 큰지 확인. 크면 별점만으로 제출되게 바꿔야 한다. |
| `recipe_review_started` | new | intent | `has_mine: boolean — 고치는 것인가 처음 쓰는 것인가` | app/recipe/[id]/index.tsx:473 onWrite={() => setComposerOpen(true)} | 컴포저 진입. 아래 submitted 와의 차이가 그대로 작성 포기율. |
| `recipe_review_submit_failed` | new | failure | `rating: number`<br>`has_body: boolean` | app/recipe/[id]/index.tsx:242 upsert 의 onError(현재 ReviewComposer 가 hasError 로만 표시) | 별점을 고르고 눌렀는데 안 올라간 경우. 지금은 화면에만 뜨고 지표에는 없다. |
| `recipe_review_submitted` | new | success | `rating: number — 1-5`<br>`has_body: boolean`<br>`body_length: number — 길이만(본문은 절대 싣지 않는다)`<br>`has_mine: boolean` | app/recipe/[id]/index.tsx:242-252 handleSubmitReview 의 onSuccess | 리뷰가 실제로 붙는 유일한 지점(PUT /recipes/{id}/reviews/mine). |
| `recipe_reviews_more_loaded` | new | progress | `page_index: number` | app/recipe/[id]/index.tsx:472 onLoadMore → reviewsQuery.fetchNextPage 성공 | 리뷰를 계속 읽는 사람의 존재 여부. 없으면 첫 페이지 크기만 손대면 된다. |
| `recipe_reviews_viewed` | new | progress | `review_count: number`<br>`has_mine: boolean` | app/recipe/[id]/index.tsx:464-478 리뷰 블록 첫 노출(상세 1회) | 끝까지 읽은 사람. 리뷰 작성 퍼널의 분모다. |
| `recipe_save_failed` | new | failure | `saved: boolean — 시도한 목표 상태`<br>`source: 'detail'\|'archive'\|'list'` | app/recipe/[id]/index.tsx:238 onError(presentError 자리) · RecipeArchiveScreen 의 active.saveError 발생 시(useSavedRecipes/useRecentRecipes 롤백 경로) | 낙관 갱신이 되돌아간 횟수. 사용자는 저장했다고 믿고 보관함에서 못 찾는다. |
| `recipe_save_toggled` | new | success | `saved: boolean — 바뀐 뒤 상태`<br>`source: 'detail'\|'archive'\|'list'`<br>`authored: boolean` | app/recipe/[id]/index.tsx:233 handleToggleSave · src/features/recipe/archive/RecipeArchiveScreen.tsx:260 handleToggleSave | '나중에 하겠다'의 유일한 신호이자 보관함 회수 퍼널의 1단계. |
| `recipe_search_committed` | new | intent | `q_length: number`<br>`source: 'submit'\|'suggestion' — 엔터로 확정했는지 제안을 골랐는지` | src/features/recipe/views/RecipeHomeScreen.tsx:254 handleCommitSearch(제안 선택은 L658 onSelect 경유) | 자동완성이 실제로 확정을 만들어 주는지, 아니면 사람들이 늘 직접 치는지. |
| `recipe_search_focused` | new | intent | — | src/features/recipe/views/RecipeHomeScreen.tsx:646 onFocus={search.focus} → useRecipeSearch.ts:93 | 검색 퍼널의 진짜 1단계. 눌렀는데 한 글자도 안 친 사람이 검색 이탈의 절반이다. |
| `recipe_search_results_viewed` | new | success | `q_length: number`<br>`result_count: number`<br>`exact: boolean — resultCount.kind==='exact' 인가('N개 이상'이 아닌가)`<br>`filter_count: number`<br>`sort: string — RecipeSortKey enum` | src/features/recipe/views/RecipeHomeScreen.tsx:497-511 showResultCount 가 참이 되는 첫 렌더(useRecipeListV2.ts:105 resultCount 확정 시) | 확정은 했는데 결과를 못 본 구간(로딩·실패)을 커밋과의 차이로 잘라낸다. |
| `recipe_search_suggested` | new | progress | `q_length: number — 검색어 길이만(문자열은 절대 싣지 않는다)`<br>`suggestion_count: number` | src/features/recipe/hooks/useRecipeSearch.ts:56-62 suggestQuery 성공 시(디바운스 확정 1회) | 제안 0건이 반복되면 사람은 그대로 포기한다. 검색어 원문 없이도 '길이 대비 제안 수'로 실패 구간이 보인다. |
| `recipe_servings_changed` | new | progress | `servings: number — 바뀐 뒤 값`<br>`direction: 'up'\|'down'` | app/recipe/[id]/index.tsx:454 onChangeServings → IngredientSection.tsx:138/151 StepperButton | '이 화면에서 가장 쓸모 있는 컨트롤'이라고 설계한 것의 실사용률. 0 에 가까우면 자리를 잘못 잡은 것이다. |
| `recipe_shared` | new | success | `has_summary: boolean — 요약이 있어 shareMessage 를 쓴 경우인가` | app/recipe/[id]/index.tsx:221 shareContent 호출 뒤 성공 분기 | 네이티브 공유가 조용히 안 뜨는 사고 이력이 있다. 호출과 성공을 나눠 봐야 그게 잡힌다. |
| `recipe_sort_changed` | new | intent | `sort: string — RecipeSortKey enum(recommended/latest/rating/saved/quick)` | src/features/recipe/views/RecipeHomeScreen.tsx:519 onChange → RecipeSortRow.tsx:90 | '빠른 조리'처럼 우리가 추가한 축이 실제 질의인지 장식인지 판정. |
| `recipe_step_timer_completed` | new | success | `step_index: number`<br>`seconds: number` | src/features/recipe/components/detail/StepTimerButton.tsx:44-46 left===0 분기 | started − completed = 조리 중에 앱을 떠난 비율. 알림을 붙일지 말지의 근거가 된다. |
| `recipe_step_timer_started` | new | progress | `step_index: number`<br>`seconds: number` | src/features/recipe/components/detail/StepTimerButton.tsx setEndAt 이 걸리는 onPress | 실제로 불 앞에 서 있는 사람. 이 앱에서 가장 진한 사용 신호다. |
| `recipe_steps_viewed` | new | progress | `step_count: number`<br>`has_timer: boolean — timerSeconds 가 붙은 단계가 하나라도 있는가` | app/recipe/[id]/index.tsx:460-462 조리 순서 블록 첫 노출(상세 1회) | 여정의 목적지 도달률. 상세 진입 대비 이 비율이 곧 '레시피가 실제로 쓰였나'다. |
| `recipe_write_abandoned` | new | abandon | `done_count: number`<br>`total_count: number`<br>`ingredient_count: number`<br>`step_count: number`<br>`photo_count: number` | src/features/recipe/views/RecipeWriteScreen.tsx ConfirmExitModal onConfirm(나가기 확정) | 확정 포기. started − succeeded 의 대부분이 여기로 흘러야 정상이고, 안 그러면 조용한 이탈(앱 종료)이 따로 있다는 뜻이다. |
| `recipe_write_exit_asked` | new | abandon | `done_count: number`<br>`total_count: number`<br>`ingredient_count: number`<br>`step_count: number` | src/features/recipe/views/RecipeWriteScreen.tsx setExitVisible(true) | '어디까지 채운 채로 나가려 했나'. 폼의 어느 칸이 사람을 쫓아내는지의 좌표. |
| `recipe_write_failed` | new | failure | `fail_kind: 'network'\|'server'\|'rejected'\|'other'`<br>`ingredient_count: number`<br>`step_count: number`<br>`photo_count: number` | src/features/recipe/views/RecipeWriteScreen.tsx catch(presentError 자리) | 대부분 400 이다. 실패 뒤 재시도 없이 나가면 작성물이 통째로 사라진다. |
| `recipe_write_ingredients_filled` | new | progress | `ingredient_count: number` | `writeFormState.ts::isFilledIngredient` (2026-08-21: 화면이 안 읽어 `filledIngredientCount` 는 지웠다 — 계측을 붙일 때 이 순수 함수를 직접 부를 것)| 작성 퍼널의 중간 관문이자 영양 미리보기가 켜지는 지점. |
| `recipe_write_nutrition_preview_failed` | new | failure | `ingredient_count: number`<br>`fail_kind: 'network'\|'server'\|'rejected'\|'other'` | src/features/recipe/hooks/useNutritionPreview.ts 의 error 경로(RecipeWriteScreen.tsx:471 onRetry 자리) | '재료를 적었는데 영양이 안 나온다'의 빈도. 작성 포기의 큰 원인 후보. |
| `recipe_write_nutrition_previewed` | new | success | `ingredient_count: number`<br>`unmatched_count: number — 식품표에서 못 찾은 재료 수`<br>`percent_shown: boolean — 내 남은 양 대비 %가 나왔는가` | src/features/recipe/hooks/useNutritionPreview.ts:52 쿼리 성공 시(RecipeWriteScreen.tsx:467 카드가 수치를 그리는 시점) | 이 갈래의 핵심 가치가 실제로 배달됐는지. unmatched 가 많으면 작성자가 자기 레시피를 못 믿는다. |
| `recipe_write_photo_added` | new | progress | `added_count: number`<br>`photo_count: number — 추가 후 총 장수` | src/features/recipe/views/RecipeWriteScreen.tsx handleAddPhotos(uris.length>0) | 사진이 없는 카탈로그가 현재 최대 약점이다. 작성자가 사진을 붙이는 비율이 그 해결 속도다. |
| `recipe_write_photo_retried` | new | intent | `photo_count: number` | src/features/recipe/views/RecipeWriteScreen.tsx handleRetryPhoto | 실패 후 되살리는 비율. 낮으면 재시도 버튼이 안 읽히는 것이다. |
| `recipe_write_photo_upload_failed` | new | failure | `photo_count: number` | src/features/recipe/views/RecipeWriteScreen.tsx uploadPhoto 의 catch(status:'failed') | 업로드 실패는 등록 버튼을 잠근다 — 이유를 모른 채 나가는 이탈의 숨은 원인. |
| `recipe_write_ready` | new | progress | `done_count: number`<br>`ingredient_count: number`<br>`step_count: number`<br>`photo_count: number` | src/features/recipe/views/RecipeWriteScreen.tsx evaluation.canSubmit 가 처음 false→true 가 될 때(폼당 1회) | '다 적었는데 안 눌렀다'를 잡는 유일한 이벤트. ※ 마지막 칸을 채운 틱과 같은 초라 퍼널의 인접 스텝으로 쓰지 말 것(진단 전용). |
| `recipe_write_resumed` | new | intent | `done_count: number` | src/features/recipe/views/RecipeWriteScreen.tsx onCancel(계속 쓰기) | 이탈 확인 모달이 실제로 구제하는 비율. 낮으면 모달이 마찰만 만드는 것이다. |
| `recipe_write_section_opened` | new | progress | `section: 'basic'\|'classify'\|'ingredients'\|'steps'\|'description'`<br>`done_count: number — 필수 충족 수(evaluation.doneCount)`<br>`total_count: number` | src/features/recipe/views/RecipeWriteScreen.tsx sectionProps().onToggle 의 펼침 방향만 | 다섯 섹션 중 어디까지 열어 봤는가. 이탈의 좌표를 섹션 단위로 준다. |
| `recipe_write_started` | new | intent | `entry: 'header'\|'deep_link'` | src/features/recipe/views/RecipeWriteScreen.tsx 마운트(진입점은 RecipeHomeScreen.tsx:622) | 작성 퍼널의 분모. 플로팅→헤더 칩 이동이 진입을 줄였는지 판정한다. |
| `recipe_write_steps_filled` | new | progress | `step_count: number` | src/features/recipe/views/RecipeWriteScreen.tsx filledStepCount 가 처음 0→1 이 될 때(폼당 1회) | 가장 귀찮은 칸. 여기서 멈추는 사람이 얼마나 되는지가 폼 개편의 근거다. |
| `recipe_write_submitted` | new | intent | `ingredient_count: number`<br>`step_count: number`<br>`photo_count: number`<br>`servings: number` | src/features/recipe/views/RecipeWriteScreen.tsx handleSubmit 진입(setSubmitting(true) 직후) | 눌렀다는 사실. succeeded 와의 차이가 서버 거절률이다. ※ 성공과 같은 초에 끝날 수 있어 인접 스텝 금지. |
| `recipe_write_succeeded` | new | success | `ingredient_count: number`<br>`step_count: number`<br>`photo_count: number`<br>`unmatched_count: number`<br>`servings: number` | src/features/recipe/views/RecipeWriteScreen.tsx createRecipe 성공 직후(onClose 전) | 작성 여정의 유일한 성공 정의. |
| `screen_viewed` | keep | screen | `screen: AnalyticsScreenName — 레시피 탭은 'recipe'` | src/features/analytics/useAnalyticsLifecycle.ts:53 (자동). 단 상세·보관함은 'other', 작성은 'community_write' 로 떨어진다 — notes 참고 | 탭 진입 자체는 이미 보인다. 이 여정에서 유일하게 살아 있는 신호다. |

### J3-3. 퍼널 (7)

**레시피 탐색 → 조리까지 읽음** — window 60분

1. `screen:recipe`
2. `event:recipe_card_opened`
3. `event:recipe_ingredients_viewed`
4. `event:recipe_steps_viewed`
5. `event:recipe_save_toggled`

읽는 법: 탭에 들어온 사람 중 실제로 레시피를 '쓴' 사람의 비율. 1→2 하락은 목록/추천이 안 먹힌다는 뜻, 2→3 하락은 상세 첫 화면(사진 없음)이 쫓아냈다는 뜻, 3→4 하락은 재료를 보고 포기했다는 뜻(양·수치·인분), 4→5 는 '읽었지만 남길 만큼은 아니었다'. ※ recipe_card_opened 와 recipe_detail_viewed 는 캐시 히트 시 같은 초라 인접 스텝에서 일부러 뺐다.

**검색으로 원하는 레시피 찾기** — window 15분

1. `event:recipe_search_focused`
2. `event:recipe_search_committed`
3. `event:recipe_card_opened`
4. `event:recipe_ingredients_viewed`

읽는 법: 1→2 하락 = 검색창을 눌러 놓고 뭘 칠지 몰라 접었다(자동완성/추천 검색어 부재). 2→3 하락 = 결과가 왔는데 고를 게 없다(랭킹·커버리지). 3→4 하락 = 골랐는데 아니었다(카드가 내용을 잘못 약속). recipe_search_results_viewed 는 커밋과 같은 초에 끝날 수 있어 스텝에서 뺐고, 대신 recipe_list_empty_viewed 를 별도 지표로 본다.

**필터가 실제로 좁혀 주는가** — window 15분

1. `event:recipe_filter_sheet_opened`
2. `event:recipe_filter_applied`
3. `event:recipe_card_opened`

읽는 법: 1→2 하락은 시트의 옵션이 사용자의 질문과 다르다는 뜻(열었다가 그냥 닫음). 2→3 하락은 필터를 걸었더니 결과가 못 쓸 만하다는 뜻 — recipe_list_empty_viewed(narrowed=true)와 겹쳐 읽는다.

**오늘의 끼니 섹션이 일하는가** — window 30분

1. `event:recipe_home_sections_loaded`
2. `event:recipe_card_opened`
3. `event:recipe_ingredients_viewed`

읽는 법: 서버가 고른 currentSlot 이 맞았는지의 대리 지표. 1→2 를 slot 별로 나눠 보면 어느 끼니의 추천이 죽어 있는지 보인다. 섹션이 실패한 세션(recipe_home_sections_failed)은 분모에서 자연히 빠진다.

**저장한 사람이 회수하러 오는가** — window 10080분

1. `event:recipe_save_toggled`
2. `event:recipe_archive_viewed`
3. `event:recipe_card_opened`

읽는 법: 저장 기능의 존재 이유. 1→2 하락이 크면 보관함 진입점(헤더 칩)이 안 보이는 것이고, 2→3 하락이 크면 보관함 목록에서 자기가 뭘 저장했는지 알아보지 못하는 것이다(카드가 이름만 있고 사진이 없다).

**레시피 작성 완주** — window 120분

1. `event:recipe_write_started`
2. `event:recipe_write_ingredients_filled`
3. `event:recipe_write_steps_filled`
4. `event:recipe_write_succeeded`

읽는 법: 1→2 하락 = 기본 정보(제목·요약·분류)에서 지쳤다. 2→3 하락 = 재료까지 적고 조리 순서에서 손을 놨다(가장 비싼 이탈). 3→4 하락 = 다 적고도 못 올렸다 — recipe_write_ready·recipe_write_failed·recipe_write_abandoned 를 그 구간의 해설로 함께 본다. ready/submitted 는 앞 이벤트와 같은 초에 발생할 수 있어 스텝으로 넣지 않았다.

**리뷰까지 남기는가** — window 60분

1. `event:recipe_steps_viewed`
2. `event:recipe_reviews_viewed`
3. `event:recipe_review_started`
4. `event:recipe_review_submitted`

읽는 법: 1→2 = 끝까지 스크롤했는가. 2→3 = 쓰기 버튼이 눌리는가. 3→4 = 컴포저에서 포기했는가(별점만 고르고 닫는 이탈은 recipe_review_dismissed 의 rating_picked=true 로 확인).

### J3-4. 주의

1) **화면명 축이 이 여정에서 사실상 못 쓴다.** getAnalyticsScreenName(events.ts:221) 실측: `/recipe/[id]` 와 `/recipe/saved`·`/recipe/recent` 는 첫 세그먼트가 `recipe` 인데 (tabs) 분기 밖이라 어느 조건에도 안 걸려 **'other'** 로 떨어진다. 더 나쁜 것은 작성이다 — `app/(write)/recipe/new.tsx` 는 group==='(write)' 라 **'community_write'** 로 찍혀 커뮤니티 글쓰기와 한 통에 섞인다. 그래서 위 퍼널은 1단계(screen:recipe)를 빼면 전부 event 스텝이다. 권고: AnalyticsScreenName 에 `recipe_detail`·`recipe_archive`·`recipe_write` 를 추가하고 매핑에 `if (group === "recipe") return route === "saved" || route === "recent" ? "recipe_archive" : "recipe_detail"`, `(write)` 분기에서 route === "recipe" 를 먼저 갈라 주는 것. 이 셋을 넣으면 screen 스텝만으로도 굵은 퍼널이 서고, 넣기 전까지는 event 스텝을 정본으로 둔다.

2) **screen_viewed 는 화면명 중복 제거를 한다**(useAnalyticsLifecycle.ts:51). 목록↔상세를 오가면 'recipe'/'other' 가 번갈아 찍혀 왕복은 세지지만, 상세 안에서의 이탈은 전혀 안 보인다 — recipe_*_viewed 섹션 이벤트가 그 자리를 메운다.

3) **속성 키는 전부 sanitizeAnalyticsProperties(events.ts:204) 정규식을 통과하도록 골랐다.** 자연스러운 이름 중 아래는 **금지**라 대체했다: screen_name→(쓰지 않음, screen 만), meal_slot→`slot`, food_count→`item_count`, error_code/error_kind→`fail_kind`, image_count→`photo_count`, recipe_name/category_name→(안 실음), search_query→`q_length`, review_body→`body_length`, step_name→`step_index`, date→(안 실음), title/description/content/value→(안 실음). 검색어·리뷰 본문·재료명 원문은 **길이와 개수로만** 싣는다(신장 환자의 검색어는 건강 상태를 드러낸다).

4) **카디널리티**: 새 id 를 하나도 늘리지 않았다. recipe_id 를 넣지 않은 대신 `source`·`slot`·`position`(0-20 클램프)·`category`(옵션 키 enum)·`sort`(RecipeSortKey enum)로 접었다. 레시피 단위 성적표가 필요하면 그건 서버 쪽 recipes 테이블 조인으로 볼 일이지 이벤트 속성으로 늘릴 일이 아니다.

5) **볼륨 주의 두 곳**: (a) recipe_ingredient_checked 는 매 체크마다 쏘면 레시피 하나에 20건이 나온다 — 첫 체크와 전부 완료 두 경계만 쏘도록 명시했다. (b) recipe_search_suggested 는 디바운스당 1회라 한 번의 타이핑 세션에 3~5건이 나온다. 볼륨이 문제되면 q_length>=2 로 하한을 두면 된다.

6) **퍼널 엔진 제약 준수**: 같은 틱/같은 초에 연달아 나가는 쌍은 인접 스텝에서 전부 뺐다 — (card_opened, detail_viewed), (search_committed, search_results_viewed), (steps_filled, write_ready), (write_submitted, write_succeeded), (detail_viewed, nutrition_viewed: 영양 카드가 첫 뷰포트에 들어올 수 있다). 이 쌍들은 퍼널이 아니라 단순 비율로 읽는다.

7) **레시피→식사 기록 연결이 코드에 없다.** events.ts:85 의 food_record_method_selected 는 method 에 `'recipe'` 를 갖고 있는데, 실제로 그 값을 쏘는 호출부가 저장소 전체에 0건이다(RecordView.tsx:515·567·593·617 은 camera/gallery/text/skip 만). 즉 "이 레시피를 먹었다"로 이어지는 경로 자체가 앱에 없다. 이 여정의 마지막 마디가 비어 있는 것이므로, 상세에 그 진입점을 만들 때 새 이벤트를 만들지 말고 기존 food_record_method_selected(method:'recipe', slot) 를 쏘면 된다(그래서 그 이벤트를 새로 제안하지 않았다).

8) **수정은 서버에 엔드포인트가 없다**(app/(write)/recipe/edit/[id].tsx:11-20, 계약 §2 에 PUT /recipes/{id} 없음). 그래서 수정 여정은 '스텁 도달' 한 단계뿐이고 recipe_edit_unavailable_viewed 가 수요 계측의 전부다. 서버에 수정이 생기면 작성 이벤트를 그대로 재사용하되 `mode: 'create'|'edit'` 속성을 더하는 쪽이 이벤트 수를 안 늘린다.

9) 섹션 노출 이벤트(recipe_nutrition_viewed / ingredients_viewed / steps_viewed / reviews_viewed)는 **하나의 파라미터형 이벤트로 만들지 않았다.** 퍼널 스텝이 {type,name} 로만 매칭되어 속성으로 섹션을 가를 수 없기 때문이다 — 이름을 나눠야 "재료까지 왔는데 조리에서 나갔다"가 퍼널에 그려진다. 구현은 app/recipe/[id]/index.tsx:390-403 의 onScroll 에 각 Block 의 onLayout y 를 물려 상세 1회씩 발화하면 된다(이미 titleInBar 판정으로 onScroll 이 살아 있다).

---

## J4. 식당 지도

> 식당 지도 · 검색 · 필터 · 상세 · 리뷰 · 북마크 (sinsin-rn `app/(tabs)/restaurant.tsx` → `app/restaurant/**`)

### J4-0. 검증에서 확정된 정정 (1건)

| 대상 | 종류 | 무엇이 틀렸나 | 어떻게 고치나 |
|---|---|---|---|
| `restaurant_detail_load_failed (fireAt: RestaurantDetailScreen.tsx:479-503)` | bad_path | 해당 라인은 `if (isError && !detail)` 렌더 조기 반환 블록이다(:468 의 restaurantId===null 도 마찬가지). 이 화면은 탭 전환·스크롤(:328 setShowTitle, :332 setActionsPinned)·refetch 로 계속 리렌더되므로 렌더 자리에서 쏘면 실패 1건이 수십 건으로 부풀고, 특히 retryable=true 에서 재시도 버튼을 누를 때마다 곱절이 된다. 이 여정 notes 4) 가 '0건 이벤트는 반드시 이펙트에서' 라고 못 박고 detail_tab_viewed·detail_scrolled 에 1회 가드를 요구했으면서 이 이벤트만 예외로 남았다. | isError 가 false→true 로 전이할 때 도는 useEffect + restaurantId 별 ref 가드로 옮길 것. |

### J4-1. 단계 (32)

| # | 단계 | 표면/라우트 | 코드 | 여기서 왜 빠져나가나 | 현재 계측 |
|---|---|---|---|---|---|
| 1 | 식당 탭 진입 · 기능 플래그 판정 | `/(tabs)/restaurant` | `app/(tabs)/restaurant.tsx:68` | `isRestaurantTabEnabled(policy)` 가 false 면 지도 대신 `RestaurantComingSoon` 이 뜬다(mobile_app_policy 4행 전부 feature_flags=NULL). 사용자는 탭을 눌렀는데 기능이 없다 → 즉시 이탈. 지금은 지도를 본 사람과 준비중 화면을 본 사람이 같은 screen_viewed(restaurant) 하나로 뭉개진다. | screen_viewed { screen: 'restaurant' } (useAnalyticsLifecycle.ts:53) + restaurant_map_open (지도가 켜졌을 때만) |
| 2 | 첫 진입 안내 시트(FeatureIntroSheet) | `(tabs)/restaurant 위 바텀시트` | `app/(tabs)/restaurant.tsx:75, src/features/coach/useFeatureIntro.ts:36` | 진입 450ms 뒤 시트가 지도를 덮는다. 기기당 1회라 신규 사용자 전원이 첫 화면에서 이걸 먼저 만난다 — 여기서 닫고 바로 나가는 사람이 곧 '식당 기능을 한 번도 안 써 본 사람'이다. | 없음 |
| 3 | 지도 WebView·카카오 SDK 로드 | `/(tabs)/restaurant` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1481 (성공 콜백 handleMapReady:558)` | SDK 마감이 12초다. 로드가 느리면 사용자는 흰 화면 앞에서 기다리다 나간다. 지금은 실패(restaurant_map_degraded)만 보이고 '성공까지 몇 초 걸렸나'와 '실패도 성공도 없이 나간 사람'이 안 보인다. | restaurant_map_open (RestaurantMapScreen.tsx:355) · 실패 시 restaurant_map_degraded (:391) |
| 4 | 지도 실패 화면(리스트 모드) 체류·재시도 | `/(tabs)/restaurant (mapError 분기)` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1406-1472, retryMap:925` | 지도가 죽으면 오류 카드 + 전국 목록만 남는다. 다시 시도(재마운트)를 누르는 사람, 목록에서 그냥 카드로 들어가는 사람, 아무것도 안 하고 나가는 사람 셋이 전부 같은 restaurant_map_degraded 한 발로 끝난다 — 키 만료 사고가 오래 안 보인 자리다. | restaurant_map_degraded { reason } 만 |
| 5 | 최초 자동 뷰포트 검색(idle → commitSearch) | `/(tabs)/restaurant` | `src/features/restaurant/views/RestaurantMapScreen.tsx:675 (handleIdle) · commitSearch:658` | 컨테이너가 0×0 인 첫 idle 은 bbox 대각 상한(200km)에 걸려 `searchThisArea()` 가 거절한다. 거절되면 아무 이벤트도 없고 화면은 '마커 없는 지도'다. 사용자에게는 지도가 고장 난 것으로 보인다. | 성공 시 restaurant_map_viewport_search { automatic:true } (:371) · 거절은 무이벤트(:660-663) |
| 6 | 결과 0건 → 시트 자동 상승 + 빈 상태 안내 | `/(tabs)/restaurant 시트 MID 스냅` | `src/features/restaurant/views/RestaurantMapScreen.tsx:429-451, components/MapEmptyState.tsx:60-118` | 데이터가 강남 한 블록뿐이라 연속 0건이 기본값이다. 0건의 이유(NO_DATA_HERE / FILTERED_TO_ZERO / 4갈래 실패)에 따라 사람의 다음 행동이 완전히 다른데, 지금은 viewport_search 의 result_count=0 으로만 간접 추정되고 리스트 모드·검색 결과·저장한 곳의 0건은 아예 안 보인다. | 지도 경로만 restaurant_map_viewport_search { result_count:0 } 로 간접 추정. 실패(isError)일 때는 아예 안 쏜다(:370) |
| 7 | 0건 탈출 행동(지도 넓히기 / 필터 초기화 / 다시 시도) | `/(tabs)/restaurant 빈 상태 CTA` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1168(handleWidenMap)/1180(handleResetFilters)/1185(handleRetry), components/MapEmptyState.tsx:118` | '지도 넓혀서 다시 찾기' 는 줌 상한·면적 상한에 닿으면 아무 것도 안 바뀐다(widenLevel 이 현재 레벨 반환). 눌렀는데 화면이 그대로인 경험이고, 그 순간이 이탈 지점이다. | 없음 |
| 8 | 위치 권한 배너 · 내 위치 버튼 | `/(tabs)/restaurant 상단 배너 / FAB` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1354-1362, handleMyLocation:989` | 권한이 없으면 거리순 정렬이 조용히 기본값으로 되돌아가고(:348-350), 커버리지 밖 좌표는 토스트만 뜨고 지도가 안 움직인다. 배너를 그냥 닫아 버린 사람은 이후 거리 기반 가치를 영영 못 받는다. | restaurant_location_permission { result } (:995) — 버튼을 누른 사람만. 배너 노출·닫기는 없음 |
| 9 | 지도 팬 → `현재 지도에서 찾기` pill | `/(tabs)/restaurant floating pill` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1513, handleSearchThisArea:704` | pendingViewport 가 없거나 뷰포트가 상한을 넘으면 눌러도 아무 일이 없다(:705-707, 660). 'pill 을 눌렀는데 결과가 안 바뀐다' 가 여기서 나온다. | 성공 시 restaurant_map_viewport_search { automatic:false }. 거절·무반응은 무이벤트 |
| 10 | 카테고리(음식 종류) 칩 레일 선택 | `/(tabs)/restaurant 상단 칩 레일 · /restaurant/list` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1028(handleSelectCuisine)/1345, views/RestaurantListScreen.tsx:180-186` | 가장 가벼운 필터 조작인데 `저당`·`샐러드` 처럼 오늘 데이터가 0건인 칩이 섞여 있다. 칩을 누르고 빈 화면을 본 뒤 되돌리지 않고 나가는 흐름이 통째로 안 보인다. | 없음 (restaurant_filter_apply 는 필터 시트 확인에서만 쏜다) |
| 11 | 필터 시트 열기(축별 진입) | `필터 바텀시트 (FilterSheet)` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1299(onPressAxis)/1380, components/FilterSheet.tsx:132-143` | 시트는 지역 2단 + 영양 + 음식 + 트레이로 길다. 열었다가 압도돼 닫는 사람이 실제 이탈인데, 지금은 확인을 누른 사람만 기록된다. | 없음 |
| 12 | 필터 확정 / 취소 | `필터 바텀시트 푸터` | `src/features/restaurant/components/FilterSheet.tsx:177(handleApply)/324(닫기), views/RestaurantMapScreen.tsx:1114(handleApplyFilters)` | restaurant_filter_apply 는 **선택이 있는 축만** 쏜다(:1144-1145). 선택을 다 지우고 확인을 누르면 이벤트가 하나도 안 나가서 '확인을 눌렀다'는 사실 자체가 사라진다. 닫기·백드롭 취소도 무기록. | restaurant_filter_apply { axis, selected_count, options } (축별, 선택 있을 때만) |
| 13 | 정렬 시트 열기 → 확정 | `정렬 바텀시트 (SortSheet)` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1298/1373, handleSubmitSort:1098` | 거리순은 위치 권한이 없으면 비활성(distanceDisabledReason)이다. 거리순을 고르러 열었다가 못 고르고 닫는 흐름이 안 보인다. | restaurant_sort_change { sort } (확정만) |
| 14 | AI 검색 시트: 입력 → 결과 → 적용 | `AI 검색 바텀시트 (AiSearchSheet)` | `src/features/restaurant/components/AiSearchSheet.tsx:122(submit)/174-185(로딩·실패)/287(적용)` | LLM 왕복이라 대기가 길고, 실패하면 재시도 버튼만 남는다. 결과가 나와도 appliedCount 가 0 이면 적용 CTA 자체가 렌더되지 않는다(:280) — 사용자는 답을 받고도 갈 곳이 없다. | restaurant_ai_search { fallback, filter_count, unmatched_count } — 적용을 누른 사람만 (:294) |
| 15 | 검색 화면 진입(지도 검색바 / 리스트 헤더 탭) | `/restaurant/search` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1339-1344, views/RestaurantListScreen.tsx:150-178` | 검색을 열었다는 사실이 어디에도 안 남는다. 지도에서 못 찾아 검색으로 간 사람의 규모를 모른다. | 없음 (라우트가 바뀌어도 screen_name 은 계속 'restaurant' 라 screen_viewed 도 안 뜬다) |
| 16 | 검색어 입력 → 자동완성 결과(0건 포함) | `/restaurant/search` | `src/features/restaurant/views/RestaurantSearchScreen.tsx:90-95, 315-332` | 2글자 이상이면 최근 검색어가 사라지고 제안 목록으로 바뀐다. 제안 0건(`noSuggestion`)이면 화면에 한 줄만 남아 사용자는 그대로 뒤로 간다. 검색 결과 0건이 통째로 안 보이는 자리다. | 없음 |
| 17 | 검색 확정 3갈래(지역 좌표 / 식당 상세 / 텍스트 리스트) | `/restaurant/search → /(tabs)/restaurant \| /restaurant/[id] \| /restaurant/list` | `src/features/restaurant/views/RestaurantSearchScreen.tsx:97-128, app/restaurant/search.tsx:27-82` | 세 갈래가 완전히 다른 화면으로 간다. 어느 갈래가 실제로 쓰이는지 모르면 자동완성 랭킹을 못 고친다. 지역 제안은 좌표가 없으면 조용히 리스트 검색으로 강등된다(search.tsx:60). | 식당 갈래만 간접: restaurant_detail_open { source:'search' }. 지역·텍스트 갈래는 무기록 |
| 18 | 리스트 전용 모드 결과 / 0건 | `/restaurant/list` | `src/features/restaurant/views/RestaurantListScreen.tsx:198-223, ListEmpty:263-329` | 여기는 bbox 가 없어 조건만으로 찾는다. 0건이 FILTERED_TO_ZERO 면 '필터 초기화' 를 주지만 NO_DATA_HERE 면 행동을 아예 안 준다(막다른 길). 실패 4갈래도 여기서 처음 보이는데 전부 무기록이다. | 없음 |
| 19 | 결과 목록 스크롤 · 다음 쪽 로드 | `/(tabs)/restaurant 시트 · /restaurant/list · /restaurant/bookmarks` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1539(onEndReached), views/RestaurantListScreen.tsx:203` | 첫 쪽에서 아무 카드도 안 누르고 끝나는지, 2~3쪽까지 뒤지고도 못 고르는지가 갈린다. 후자는 카드 정보가 부족하다는 신호인데 지금은 둘이 구분되지 않는다. | 없음 |
| 20 | 마커·클러스터 탭 → 시트 카드 선택 | `/(tabs)/restaurant` | `src/features/restaurant/views/RestaurantMapScreen.tsx:748(handleMarkerPress)/821(handleClusterPress)/1064(handlePressCard)` | 마커를 눌러 카드를 띄우고도 상세로 안 들어가는 비율이 곧 '카드로 판단이 끝났다/실망했다'. 카드 탭 자체는 이벤트가 없고 상세 진입으로만 보인다. | restaurant_marker_tap { restaurant_id } (:751) · restaurant_cluster_tap { marker_count } (:824) |
| 21 | 상세 진입 | `/restaurant/[id]` | `src/features/restaurant/views/RestaurantDetailScreen.tsx:424-432` | 진입 자체는 잘 잡힌다. 문제는 진입 이후 아무 액션 없이 되돌아가는 사람이 성공한 사람과 구분되지 않는다는 것. | restaurant_detail_open { restaurant_id, source } |
| 22 | 상세 로딩 실패 · 없는 식당 | `/restaurant/[id]` | `src/features/restaurant/views/RestaurantDetailScreen.tsx:468-514` | detail_open 은 이미 쏜 뒤라, 404(문 닫은 식당 링크)·네트워크 실패도 '상세를 봤다' 로 집계된다. retryable 이 아니면 다시 불러오기 버튼도 없어 100% 이탈이다. | 없음 (detail_open 만 남고 실패는 안 남는다) |
| 23 | 상세 탭 전환 · 스크롤 깊이(홈/메뉴/사진/후기/정보) | `/restaurant/[id] 탭` | `src/features/restaurant/views/RestaurantDetailScreen.tsx:354(handleTabChange)/321-333(handleScroll)` | '스크롤만 하고 이탈' 의 본체. 히어로만 보고 나갔는지, 메뉴 탭까지 열었는지, 후기까지 갔는지가 전혀 안 보인다. 메뉴 탭은 안전도 판정의 핵심 화면이라 여기 도달률이 곧 기능 가치다. | 없음 |
| 24 | 아웃바운드: 길찾기 시트 → 지도 앱 열기 | `/restaurant/[id] 길찾기 바텀시트` | `src/features/restaurant/views/RestaurantDetailScreen.tsx:545, components/RouteAppSheet.tsx:60-73` | 이 여정의 실질 전환(간다)이다. 시트를 열고 앱을 안 고르는 경우, 앱 딥링크가 실패해 웹으로 내려간 경우, 둘 다 실패한 경우(조용히 닫힘, :68-70)가 전부 무기록이다. | 없음 |
| 25 | 아웃바운드: 전화 · 공유 | `/restaurant/[id] 액션 pill / 하단 고정 바` | `src/features/restaurant/views/RestaurantDetailScreen.tsx:556(전화 Linking)/378(handleShare)` | 전화 pill 은 phone 이 있을 때만 렌더된다 — 전화번호 결손률이 전환을 얼마나 깎는지 모른다. 공유는 앱 밖으로 나가는 유입 경로인데 집계가 없다. | 없음 |
| 26 | 상세 액션: 진단 · 북마크 토글 | `/restaurant/[id] → /consult` | `src/features/restaurant/views/RestaurantDetailScreen.tsx:389(handleDiagnose)/404(handleToggleBookmark)` | menu_count=0 인 식당에서 진단을 누르면 상담에 빈 컨텍스트가 간다. 북마크는 해제도 같은 이벤트라 순저장수를 뺄셈으로 구한다. | restaurant_diagnose_tap { restaurant_id, menu_count } · restaurant_bookmark_toggle { restaurant_id, bookmarked, source } |
| 27 | 후기 탭 진입 · 후기 0건 · 사진 뷰어 | `/restaurant/[id] 후기 탭 · /restaurant/[id]/photos` | `src/features/restaurant/components/detail/ReviewTab.tsx:152-176/271, app/restaurant/[id]/index.tsx:62-75` | 후기 0건이면 `ReviewWritePrompt` 만 남는다 — 읽으러 온 사람에게는 막다른 길이고, 쓰러 갈 사람에게는 유일한 문이다. 이 둘의 비율을 모른다. | 없음 |
| 28 | 후기 작성 화면 열기 | `/restaurant/[id]/review` | `app/restaurant/[id]/review.tsx:21-45, views/RestaurantReviewWriteScreen.tsx:44-84` | 딥링크로 이름 없이 들어오면 상세를 다시 받는 동안 스켈레톤만 보이고, 실패하면 폼 대신 오류 화면이다(:60-70). 작성 화면에 도달한 사람 수 자체가 없어서 제출률의 분모가 없다. | 없음 (restaurant_review_submit 만 성공 시) |
| 29 | 후기 초안 작성(별점 → 키워드 → 사진 → 본문) | `/restaurant/[id]/review` | `src/features/restaurant/views/ReviewWriteScreen.tsx:122-128(상태)/194(키워드)/335(별점), utils/reviewDraft.ts:54-72` | 등록 버튼은 별점 + 본문이 채워져야 열린다. 별점만 찍고 본문 앞에서 멈추는 사람이 가장 많을 자리인데, 어느 칸에서 멈췄는지 전혀 안 보인다. | 없음 |
| 30 | 후기 제출: 사진 업로드 → 등록 | `/restaurant/[id]/review` | `src/features/restaurant/views/ReviewWriteScreen.tsx:207-256` | 사진은 제출 시점에 전부 올리고 하나라도 실패하면 등록 자체를 안 한다(FOOD_CAMERA_001/002). 사용자는 같은 사진으로 계속 다시 누른다. 사진 색인만 실패한 반쪽 성공(:237)도 성공으로 집계된다. | 성공만 restaurant_review_submit { restaurant_id, rating, photo_count, keyword_count } (app/restaurant/[id]/review.tsx:33) |
| 31 | 후기 작성 중단(닫기 → 확인 다이얼로그) | `/restaurant/[id]/review` | `src/features/restaurant/views/ReviewWriteScreen.tsx:169-187` | 입력이 있으면 '그만 쓸까요' 확인이 뜬다. 여기서 계속 쓰기를 고른 사람과 버린 사람이 갈리는데 둘 다 무기록 — 폼 이탈의 크기와 회복률을 모른다. | 없음 |
| 32 | 저장한 곳 목록 | `/restaurant/bookmarks` | `src/features/restaurant/views/RestaurantMapScreen.tsx:1086(handlePressBookmarks), views/RestaurantBookmarksScreen.tsx:93-131` | 진입점이 목록 맨 끝의 MapUtilityFooter 하나뿐이다(FAB 은 필터 토글이라 목록이 아니다). 저장은 하는데 다시 보러 오는지가 안 보이고, 빈 목록/오류도 무기록이다. | 없음 (저장 자체는 restaurant_bookmark_toggle) |

### J4-2. 이벤트 (50 = 신규 37 · 변경 0 · 유지 13)

| 이벤트 | 상태 | 종류 | 속성 | 발화 지점 | 없으면 못 보는 이탈 |
|---|---|---|---|---|---|
| `restaurant_ai_search_failed` | new | failure | `attempt_index: number` | src/features/restaurant/components/AiSearchSheet.tsx:178 (ai.isError 전이 이펙트) | LLM 실패로 끝난 세션. 대기 후 실패는 이 여정에서 가장 비싼 이탈이다. |
| `restaurant_ai_search_opened` | new | screen | `surface: string — map\|list` | src/features/restaurant/views/RestaurantMapScreen.tsx:1350 (onPressAiSearch) · views/RestaurantListScreen.tsx:183 | AI 검색의 분모. 지금은 적용까지 간 사람만 존재해서 이탈률이 계산 불가. |
| `restaurant_ai_search_submitted` | new | progress | `attempt_index: number — 이 시트에서 몇 번째 질의인가(1부터)` | src/features/restaurant/components/AiSearchSheet.tsx:122 (submit) | 질의를 던졌지만 적용하지 않은 사람. 질의 문자열은 병기를 드러내므로 절대 싣지 않고 횟수만 센다. |
| `restaurant_bookmarks_opened` | new | screen | `(없음)` | src/features/restaurant/views/RestaurantMapScreen.tsx:1086 (handlePressBookmarks) → app/restaurant/bookmarks.tsx | 저장한 곳의 유일한 문(목록 끝 MapUtilityFooter)이 실제로 발견되는지. 저장은 하는데 다시 오지 않으면 북마크는 죽은 기능이다. |
| `restaurant_call_tapped` | new | success | `restaurant_id: number` | src/features/restaurant/views/RestaurantDetailScreen.tsx:556 (call 액션 onPress) | 길찾기와 나란한 아웃바운드 전환. 전화번호 결손률과 함께 보면 데이터 보강의 우선순위가 나온다. |
| `restaurant_cuisine_selected` | new | intent | `cuisine: string — CuisineType enum (해제는 'none')`<br>`surface: string — map\|list` | src/features/restaurant/views/RestaurantMapScreen.tsx:1028 (handleSelectCuisine) · views/RestaurantListScreen.tsx:182 (onSelect) | 가장 가벼운 필터 경로인데 무기록이었다. 오늘 0건이 확정인 칩(저당·샐러드)을 누른 뒤의 이탈을 이 이벤트 + results_emptied 로 잡는다. |
| `restaurant_degraded_list_used` | new | progress | `reason: string`<br>`item_count: number` | src/features/restaurant/views/RestaurantMapScreen.tsx:1440 (mapError 분기의 RestaurantCard onPress) — 카드당 첫 탭 1회 | 지도 실패 후 행동 2. 목록으로 목적을 달성한 사람과 그냥 나간 사람을 가른다(둘 다 지금은 degraded 한 발로 끝난다). |
| `restaurant_detail_load_failed` | new | failure | `fail_kind: string — not_found\|network\|server\|rejected\|malformed`<br>`retryable: boolean` | src/features/restaurant/views/RestaurantDetailScreen.tsx:479-503 (isError && !detail 분기 진입 시 1회) 및 :468 (restaurantId 파싱 실패) | restaurant_detail_open 이 이미 나간 뒤라 실패가 '상세를 봤다' 로 집계된다. retryable=false(404) 는 100% 이탈이 확정인 자리다. |
| `restaurant_detail_scrolled` | new | progress | `depth: string — title\|actions (히어로 통과 / 액션바 고정 지점 통과)`<br>`restaurant_id: number` | src/features/restaurant/views/RestaurantDetailScreen.tsx:326-332 (showTitle·actionsPinned 상승 에지, 각 1회) | '스크롤만 하고 이탈' 을 실제로 보이게 하는 유일한 신호. detail_open 은 있고 이것도 액션도 없으면 히어로만 보고 나간 것이다. |
| `restaurant_detail_tab_viewed` | new | screen | `tab: string — home\|menu\|photo\|review\|info`<br>`restaurant_id: number` | src/features/restaurant/views/RestaurantDetailScreen.tsx:354 (handleTabChange, 탭당 첫 진입 1회) | 메뉴 탭 도달률이 곧 안전도 기능의 실사용률이다. 홈 탭만 보고 나간 사람과 구분되지 않으면 상세 개선의 방향을 못 정한다. |
| `restaurant_empty_action_tapped` | new | intent | `empty_kind: string`<br>`action: string — widen\|reset\|retry`<br>`surface: string` | src/features/restaurant/views/RestaurantMapScreen.tsx:1168(widen)/1180(reset)/1185(retry) · components/MapEmptyState.tsx:118 의 CTA 경유 | 0건에서 빠져나오려는 시도. emptied 대비 이 비율이 낮으면 빈 화면 문구가 실패한 것이다. |
| `restaurant_filter_confirmed` | new | success | `axis_count: number — 값이 실린 축 수(0 가능)`<br>`chip_count: number — 확정된 칩 총수`<br>`region_moved: boolean — 지역 선택으로 카메라를 옮겼는가` | src/features/restaurant/views/RestaurantMapScreen.tsx:1114 (handleApplyFilters 진입 직후, 축 루프 앞) | restaurant_filter_apply 는 선택이 있는 축만 쏘므로 '전부 지우고 확인' 이 무기록이다. 확인 자체를 한 번 세야 퍼널이 닫힌다. |
| `restaurant_filter_opened` | new | screen | `axis: string — 눌러 들어온 축`<br>`chip_count: number — 이미 걸린 칩 수`<br>`surface: string — map\|list` | src/features/restaurant/views/RestaurantMapScreen.tsx:1299 (onPressAxis) · views/RestaurantListScreen.tsx:192 | 필터 시트를 열고 취소한 사람 = opened − confirmed. 지금은 확인을 누른 사람만 존재한다. |
| `restaurant_intro_dismissed` | new | abandon | `(없음)` | app/(tabs)/restaurant.tsx:78 (onClose) → src/features/coach/useFeatureIntro.ts:47 dismiss | 닫은 뒤 지도 조작(viewport_search·marker_tap)이 이어지는가로 안내의 효과를 본다. |
| `restaurant_intro_viewed` | new | screen | `(없음)` | app/(tabs)/restaurant.tsx:75 — intro.visible 이 true 로 바뀌는 이펙트 (src/features/coach/useFeatureIntro.ts:37 이 세운 상태) | 신규 사용자 전원이 지도보다 먼저 만나는 시트. 여기서 끝난 사람이 '식당 기능 미사용자' 의 정체다. |
| `restaurant_list_paged` | new | progress | `surface: string — map_sheet\|list\|bookmark`<br>`page_index: number — 몇 번째 추가 쪽인가` | src/features/restaurant/views/RestaurantMapScreen.tsx:1539 (onEndReached) · views/RestaurantListScreen.tsx:203 · views/RestaurantBookmarksScreen.tsx:123 | 첫 쪽에서 포기했는지, 여러 쪽을 뒤지고도 못 골랐는지를 가른다. 후자는 카드 정보 부족 신호다. |
| `restaurant_location_banner_dismissed` | new | abandon | `(없음)` | src/features/restaurant/views/RestaurantMapScreen.tsx:1359 (onDismiss) | 권한 배너를 닫은 사람은 이후 거리순·내 위치를 영영 못 쓴다. 거부(denied)와 '아예 묻지도 않음' 을 구분한다. |
| `restaurant_map_rendered` | new | progress | `wait_ms: number — restaurant_map_open 이후 경과(100ms 단위로 반올림)` | src/features/restaurant/views/RestaurantMapScreen.tsx:558 (handleMapReady 첫 호출 1회만) | restaurant_map_open 은 있고 이것도 degraded 도 없는 사람 = 로딩 중에 나간 사람. 지금은 그 구간이 통째로 안 보인다(마감 12초). |
| `restaurant_map_retried` | new | intent | `reason: string — degradedReason(mapError) 그대로` | src/features/restaurant/views/RestaurantMapScreen.tsx:925 (retryMap) | 지도 실패 후 행동 1. 재시도조차 안 하고 나가는 비율이 실패 화면의 진짜 비용이다. |
| `restaurant_photo_viewer_opened` | new | intent | `source: string — hero\|photo_tab\|review`<br>`item_count: number — 넘긴 사진 수` | app/restaurant/[id]/index.tsx:62 (openPhotos) — 호출부에서 source 를 인자로 받아 전달 | 사진이 판단 근거로 쓰이는지. 사진 탭 도달과 뷰어 진입의 차이가 곧 격자 품질이다. |
| `restaurant_results_emptied` | new | failure | `empty_kind: string — NO_DATA_HERE\|FILTERED_TO_ZERO\|NETWORK_FAILURE\|SERVER_ERROR\|REQUEST_REJECTED\|RESPONSE_MALFORMED`<br>`surface: string — map\|list\|bookmark\|suggest`<br>`filter_count: number — 걸린 필터 축 개수(0~3)` | src/features/restaurant/views/RestaurantMapScreen.tsx:445-451 (0건 확정 이펙트) · views/RestaurantListScreen.tsx:211 은 렌더가 아니라 emptyReason 변화 이펙트로 · views/RestaurantBookmarksScreen.tsx:110 | 검색 결과 0건이 전 표면에서 한 자로 보인다. '데이터가 없다' 와 '내가 필터를 잘못 걸었다' 와 '앱이 400 을 보냈다' 는 뒤 행동이 전혀 다르다. |
| `restaurant_review_draft_progressed` | new | progress | `step: string — rating\|keyword\|photo\|body (각 1회)`<br>`photo_count: number` | src/features/restaurant/views/ReviewWriteScreen.tsx:335-345(별점) · :194(toggleKeyword) · :126 photoUris 증가 · content 입력 첫 1회 | 등록 버튼은 별점+본문이 있어야 열린다. 어느 칸에서 멈췄는지를 이 한 이벤트의 step 분포로 읽는다. |
| `restaurant_review_photos_unindexed` | new | failure | `photo_count: number` | src/features/restaurant/views/ReviewWriteScreen.tsx:237 (photosIndexed === -1) | 후기는 저장됐는데 사진만 사라진 반쪽 성공. 지금은 restaurant_review_submit 성공에 그대로 섞인다. |
| `restaurant_review_submit_failed` | new | failure | `fail_stage: string — upload\|save`<br>`photo_count: number` | src/features/restaurant/views/ReviewWriteScreen.tsx:243-253 (catch) | 사진 실패(FOOD_CAMERA_001/002)면 같은 사진으로 계속 다시 누르게 된다. 단계를 나눠야 사진 규격 안내를 고칠지 서버를 볼지 정해진다. |
| `restaurant_review_submit_started` | new | progress | `rating: number`<br>`photo_count: number`<br>`keyword_count: number` | src/features/restaurant/views/ReviewWriteScreen.tsx:207-211 (submit 진입 직후, 업로드 루프 앞) | 업로드·등록 실패로 사라지는 사람을 보려면 '눌렀다' 를 따로 세야 한다. restaurant_review_submit 은 성공만 남는다. |
| `restaurant_review_write_dismissed` | new | abandon | `dirty: boolean — 한 칸이라도 채웠는가`<br>`confirmed: boolean — 확인 다이얼로그에서 버리기를 골랐는가` | src/features/restaurant/views/ReviewWriteScreen.tsx:169-187 (handleClose, 확인 결과 확정 후) | 작성 중단의 크기와 회복률(계속 쓰기 선택)을 한 번에 잰다. |
| `restaurant_review_write_opened` | new | screen | `restaurant_id: number` | app/restaurant/[id]/review.tsx:21 (라우트 마운트 이펙트) | 후기 제출률의 분모. 지금은 성공만 있어서 '쓰러 왔다가 그만둔 사람' 이 존재하지 않는 것으로 집계된다. |
| `restaurant_route_app_failed` | new | failure | `app: string` | src/features/restaurant/components/RouteAppSheet.tsx:68-70 (앱·웹 둘 다 reject) | 지금은 조용히 닫힌다 — 사용자에게는 '길찾기를 눌렀는데 아무 일도 없다'. 무음 실패를 세는 유일한 방법이다. |
| `restaurant_route_app_opened` | new | success | `app: string — kakao\|naver\|apple\|google`<br>`web_fallback: boolean — 앱 딥링크 실패로 웹으로 내려갔는가` | src/features/restaurant/components/RouteAppSheet.tsx:62-67 (openLink 의 두 갈래) | 이 여정의 실질 전환. 시트를 열고 아무 앱도 안 고른 비율이 곧 앱 목록의 실패다. |
| `restaurant_route_sheet_opened` | new | intent | `restaurant_id: number` | src/features/restaurant/views/RestaurantDetailScreen.tsx:545 (route 액션 onPress) | '간다' 의사의 시작. 좌표가 없으면 pill 자체가 없으므로 좌표 결손이 전환에 미치는 영향도 이 수로 잰다. |
| `restaurant_search_committed` | new | success | `pick_kind: string — typed\|recent\|suggest_restaurant\|suggest_region\|suggest_menu`<br>`item_count: number — 화면에 떠 있던 제안 수` | src/features/restaurant/views/RestaurantSearchScreen.tsx:97 (commit) 및 :111-128 (pickSuggestion 갈래별) | 검색이 어디로 흘렀는지. 세 갈래가 서로 다른 화면으로 가므로 갈래를 모르면 랭킹도 문구도 못 고친다. |
| `restaurant_search_dismissed` | new | abandon | `typed: boolean — 한 글자라도 쳤는가`<br>`picked: boolean — 확정한 적 있는가` | src/features/restaurant/views/RestaurantSearchScreen.tsx:145 (onBack) → app/restaurant/search.tsx:90 | 검색을 열고 아무것도 못 찾고 나간 사람. 제안 0건 뒤의 이탈과 짝지어 본다. |
| `restaurant_search_opened` | new | screen | `source: string — map\|list` | src/features/restaurant/views/RestaurantMapScreen.tsx:1341 (MapSearchBar onPress) · views/RestaurantListScreen.tsx:156 (헤더 필드) | 검색 여정의 분모. 라우트가 바뀌어도 screen_name 이 계속 'restaurant' 라 화면 축으로는 절대 안 보인다. |
| `restaurant_search_suggested` | new | progress | `item_count: number — 제안 수(0 포함)`<br>`typed_len: number — 입력 길이(글자 수만, 내용 아님)` | src/features/restaurant/views/RestaurantSearchScreen.tsx:90 (useSearchSuggest 결과 확정 이펙트, 질의당 1회) | 검색 결과 0건의 첫 지점. item_count=0 이 반복되면 자동완성 사전이 부족한 것이고, 지금은 그 사실이 어디에도 없다. |
| `restaurant_share_tapped` | new | success | `restaurant_id: number` | src/features/restaurant/views/RestaurantDetailScreen.tsx:378 (handleShare) | 앱 밖 유입을 만드는 행동. 딥링크(sinsin://restaurant/:id) 유입과 짝지어 본다. |
| `restaurant_sort_opened` | new | screen | `surface: string — map\|list`<br>`distance_blocked: boolean — 거리순이 잠겨 있는가` | src/features/restaurant/views/RestaurantMapScreen.tsx:1298 (onPressSort) · views/RestaurantListScreen.tsx:191 | 열었는데 restaurant_sort_change 가 없으면 원하는 정렬이 없었다는 뜻. distance_blocked 로 그 이유를 바로 읽는다. |
| `restaurant_viewport_search_rejected` | new | failure | `reason: string — too_large\|no_viewport`<br>`automatic: boolean` | src/features/restaurant/views/RestaurantMapScreen.tsx:660-663 (commitSearch 거절) 및 :705-706 (pendingViewport 없음) | 눌렀는데 아무 일도 안 일어나는 유일한 자리. 최초 idle 이 상한에 걸려 '지도가 영원히 빈' 상태로 가던 회귀도 여기서 보인다. |
| `restaurant_ai_search` | keep | success | `fallback: boolean`<br>`filter_count: number`<br>`unmatched_count: number` | src/features/restaurant/components/AiSearchSheet.tsx:294 | AI 해석 결과를 실제로 적용한 사람. 폴백 비율이 곧 AI 경로 품질이다. |
| `restaurant_bookmark_toggle` | keep | success | `restaurant_id: number`<br>`bookmarked: boolean`<br>`source: string` | src/features/restaurant/views/RestaurantDetailScreen.tsx:409 | 저장/해제. 순저장수는 뺄셈으로 구한다. |
| `restaurant_cluster_tap` | keep | intent | `marker_count: number` | src/features/restaurant/views/RestaurantMapScreen.tsx:824 | 클러스터를 파고드는 깊이. 클러스터 임계값 조정 근거. |
| `restaurant_detail_open` | keep | screen | `restaurant_id: number`<br>`source: string — map\|list\|bookmark\|search\|deep_link` | src/features/restaurant/views/RestaurantDetailScreen.tsx:426 | 여정의 중간 목표. 어느 문(지도/리스트/검색/북마크)이 실제로 쓰이는지. |
| `restaurant_diagnose_tap` | keep | success | `restaurant_id: number`<br>`menu_count: number` | src/features/restaurant/views/RestaurantDetailScreen.tsx:394 | 상세 → 상담 전환. menu_count=0 이면 빈 컨텍스트 진단이라 실패로 읽어야 한다. |
| `restaurant_filter_apply` | keep | success | `axis: string — region\|nutrition\|cuisine`<br>`selected_count: number`<br>`options: string — enum 값 쉼표 연결` | src/features/restaurant/views/RestaurantMapScreen.tsx:1146 (축별 루프) | 어떤 축이 실제로 쓰이는지. 축별로 쏘므로 원인 축을 되짚을 수 있다. |
| `restaurant_location_permission` | keep | success | `result: string — granted\|denied\|undetermined` | src/features/restaurant/views/RestaurantMapScreen.tsx:995 | 권한 요청의 결과. 거리순·내 위치 기능의 상한선. |
| `restaurant_map_degraded` | keep | failure | `reason: string — config\|sdk_load\|sdk_timeout\|webview_crash\|other` | src/features/restaurant/views/RestaurantMapScreen.tsx:391 | 지도가 죽은 사실. 키/도메인 사고를 조용히 넘기지 않는 유일한 신호. |
| `restaurant_map_open` | keep | screen | `(없음)` | src/features/restaurant/views/RestaurantMapScreen.tsx:355 (마운트 이펙트) | 지도면 진입의 분모. 준비중 화면과 지도를 구분해 주는 유일한 신호다. |
| `restaurant_map_viewport_search` | keep | progress | `bbox_diagonal_km: number`<br>`zoom: number`<br>`mode: string — MARKER\|CLUSTER`<br>`result_count: number`<br>`truncated: boolean`<br>`automatic: boolean` | src/features/restaurant/views/RestaurantMapScreen.tsx:371 (결과 도착 시 flush) | 검색이 실제로 결과를 냈는지. 0건 지역의 규모도 여기서 나온다. |
| `restaurant_marker_tap` | keep | intent | `restaurant_id: number` | src/features/restaurant/views/RestaurantMapScreen.tsx:751 | 지도에서 관심을 표한 지점. 상세 진입과의 차이가 카드 설득력이다. |
| `restaurant_review_submit` | keep | success | `restaurant_id: number`<br>`rating: number — 없으면 -1`<br>`photo_count: number`<br>`keyword_count: number` | app/restaurant/[id]/review.tsx:33 | 후기 등록 성공. 새로 만드는 write_opened/draft_progressed 의 최종 분자. |
| `restaurant_sort_change` | keep | success | `sort: string` | src/features/restaurant/views/RestaurantMapScreen.tsx:1101 | 정렬 확정. 거리순 선택률은 위치 권한 효과의 대리 지표다. |

### J4-3. 퍼널 (8)

**지도 진입 → 상세 도달** — window 30분

1. `screen:restaurant`
2. `event:restaurant_map_viewport_search`
3. `event:restaurant_marker_tap`
4. `event:restaurant_detail_open`

읽는 법: 식당 탭을 연 사람 중 몇 %가 결과를 받고, 마커를 눌러 보고, 상세까지 가는가. 1→2 하락 = 지도가 안 뜨거나 검색이 거절됐다(restaurant_map_rendered·restaurant_viewport_search_rejected 로 원인 분기). 2→3 하락 = 결과가 0건이거나 마커가 관심을 못 끌었다. 3→4 하락 = 시트 카드 정보가 부족하다.

**지도 실패 후 회복** — window 30분

1. `event:restaurant_map_degraded`
2. `event:restaurant_map_retried`
3. `event:restaurant_detail_open`

읽는 법: 지도가 죽은 세션에서 재시도를 누르는 비율과, 그럼에도 목적(상세)까지 간 비율. 1→2 하락이 크면 오류 화면이 '다시 해 볼 만하다' 로 안 읽히는 것이고, 2→3 하락이 크면 재시도가 실제로 안 낫는 것(키·도메인 문제)이다. 목록으로 우회한 사람은 restaurant_degraded_list_used 로 따로 본다.

**검색: 열기 → 자동완성 → 확정** — window 15분

1. `event:restaurant_search_opened`
2. `event:restaurant_search_suggested`
3. `event:restaurant_search_committed`

읽는 법: 검색을 연 사람 중 2글자 이상 쳐서 제안을 받은 비율, 그중 확정한 비율. 2→3 하락은 제안이 쓸모없다는 뜻이며, restaurant_search_suggested 의 item_count=0 비중과 restaurant_search_dismissed{typed:true} 로 사전 부족인지 랭킹 문제인지 가른다.

**필터 시트: 열기 → 확인 → 상세** — window 30분

1. `event:restaurant_filter_opened`
2. `event:restaurant_filter_confirmed`
3. `event:restaurant_detail_open`

읽는 법: 1→2 의 하락이 곧 '필터 시트를 열고 취소한 비율'(지금은 전혀 안 보이는 수). 2→3 하락은 필터를 건 결과가 0건이었거나(restaurant_results_emptied{FILTERED_TO_ZERO}) 결과가 마음에 안 들었다는 뜻이다.

**AI 검색: 열기 → 질의 → 적용** — window 15분

1. `event:restaurant_ai_search_opened`
2. `event:restaurant_ai_search_submitted`
3. `event:restaurant_ai_search`

읽는 법: AI 검색 진입 대비 질의율과 적용률. 2→3 하락은 결과가 설득력이 없거나(appliedCount=0 이면 적용 버튼 자체가 없다) 실패한 것 — restaurant_ai_search_failed 와 restaurant_ai_search{fallback:true} 비중으로 나눈다.

**0건에서 빠져나오기** — window 30분

1. `event:restaurant_results_emptied`
2. `event:restaurant_empty_action_tapped`
3. `event:restaurant_detail_open`

읽는 법: 빈 화면을 만난 사람 중 탈출 버튼을 누른 비율과, 결국 상세까지 간 비율. 1→2 가 낮으면 빈 상태 문구·CTA 가 실패한 것이고, empty_kind 별로 쪼개면 '데이터 없음' 과 '필터 과다' 중 어느 쪽이 실제 문제인지 나온다.

**상세 체류 → 아웃바운드(길찾기)** — window 30분

1. `event:restaurant_detail_open`
2. `event:restaurant_detail_scrolled`
3. `event:restaurant_route_sheet_opened`
4. `event:restaurant_route_app_opened`

읽는 법: 상세에서 '스크롤만 하고 이탈' 을 직접 읽는 퍼널. 1→2 하락 = 히어로만 보고 나갔다. 2→3 하락 = 읽고도 갈 마음이 안 생겼다. 3→4 하락 = 지도 앱 목록에서 멈췄다(restaurant_route_app_failed 로 무음 실패도 확인).

**후기 작성 이탈** — window 60분

1. `event:restaurant_detail_tab_viewed`
2. `event:restaurant_review_write_opened`
3. `event:restaurant_review_draft_progressed`
4. `event:restaurant_review_submit_started`

읽는 법: 후기 탭을 본 사람 중 작성 화면을 연 비율, 한 칸이라도 채운 비율, 등록을 누른 비율. 3→4 하락이 폼 이탈의 본체이며 draft_progressed 의 step 분포(rating만 vs body까지)로 어느 칸에서 멈추는지 본다. 등록 성공률(submit_started → restaurant_review_submit)은 같은 초에 끝날 수 있어 퍼널이 아니라 두 이벤트 수의 비로 계산한다.

### J4-4. 주의

1) 화면 축이 이 여정에서 사실상 무용하다. getAnalyticsScreenName(events.ts:231)이 group==='restaurant' 를 전부 'restaurant' 로 접기 때문에 /restaurant/search, /restaurant/list, /restaurant/[id], /restaurant/[id]/review, /restaurant/bookmarks 가 같은 값이고, useAnalyticsLifecycle.ts:51 이 '값이 바뀔 때만' 쏘므로 여정 전체에 screen_viewed 는 **한 발**뿐이다. 그래서 위 퍼널은 첫 스텝을 제외하고 전부 event 스텝이다. 화면 축으로 보고 싶다면 AnalyticsScreenName 에 restaurant_search / restaurant_detail / restaurant_review_write 를 추가하고 매핑을 세분해야 한다(이 작업은 별건).

2) 속성 키는 전부 sanitizeAnalyticsProperties(events.ts:205)의 금지 정규식을 피해서 골랐다. 특히 쓰면 안 되는 것들: screen_name·query·keyword_text·error_code·menu_name·address·image_url·title·date. 실수하기 쉬운 함정 — 'candidate'·'update'·'validate' 는 date 를 포함하고, 'has_value'·'revalue' 는 value 를 포함해 조용히 떨어진다. 검색어·AI 질의·후기 본문은 **길이/개수만** 싣는다(typed_len, item_count, photo_count).

3) 퍼널 엔진의 초 정밀도 엄격 부등호 때문에 같은 틱에 연달아 나가는 쌍은 인접 스텝으로 두지 않았다. 피한 조합: map_rendered→viewport_search(ready 직후 idle), search_committed→detail_open(제안 탭이 곧바로 push), filter_confirmed→viewport_search(적용 즉시 refetch), review_submit_started→review_submit(사진 없는 후기는 1초 안에 끝난다), empty_action_tapped→viewport_search. 이 쌍들은 퍼널 대신 이벤트 수의 비로 읽어야 한다.

4) 발화 위치 주의 — 0건 이벤트는 반드시 이펙트에서 쏜다. RestaurantListScreen 의 ListEmpty(:263)는 렌더 함수라 거기서 쏘면 리렌더마다 중복 발화한다. 지도 쪽은 이미 '검색이 끝난 순간' 판정이 있으므로(RestaurantMapScreen.tsx:429-451) 그 이펙트 안에 얹는다. restaurant_detail_tab_viewed·restaurant_detail_scrolled 도 탭/깊이당 1회 가드가 필요하다(handleScroll 은 16ms 마다 불린다).

5) 카디널리티: 새 id 축은 하나도 늘리지 않았다. restaurant_id 는 이미 카탈로그에 있는 이벤트에서만 쓰고, 새 이벤트 중 restaurant_id 를 싣는 것은 상세 계열(detail_load_failed 제외)·후기 계열뿐이다. 지역·음식·정렬·앱 이름은 전부 enum 문자열이고, 자유 문자열은 어디에도 없다. wait_ms 는 100ms 반올림, typed_len 은 글자 수라 값 공간이 작다.

6) 볼륨 주의 두 곳: restaurant_list_paged 는 무한 스크롤마다 나가므로 surface 별 상한(예: page_index 5까지만)을 두는 편이 안전하다. restaurant_detail_scrolled 는 depth 2값 × 상세 진입 수라 detail_open 의 최대 2배다.

7) 기존 restaurant_filter_apply 는 status='keep' 이지만 축별 루프(:1144)가 '선택 0으로 확인' 을 못 잡는 구멍이 있어 restaurant_filter_confirmed 를 새로 넣었다. 둘은 대체 관계가 아니라 보완이다 — apply 는 무엇을 골랐나, confirmed 는 확인을 눌렀나."

---

## J5. 커뮤니티 · 스토리

> 커뮤니티 탭 → 글 상세 → 글쓰기/수정 → 댓글 → 신고·차단 → 스토리(뷰어·작성) → 내 활동. 코드 기준: app/(tabs)/community.tsx · src/features/recipe/components/FreePostTab.tsx · app/post/[id].tsx · src/features/recipe/components/FreePostEditor.tsx (app/(write)/free/new.tsx 가 감싸기만 함) · app/(write)/free/[id].tsx · app/stories.tsx · app/(write)/story/new.tsx · app/community-library.tsx. 현재 이 여정에 trackAnalyticsEvent 호출은 **한 줄도 없다** (grep: src/features/recipe/** · app/post/** · app/(write)/** · app/stories.tsx · app/community-library.tsx 전부 0건). 잡히는 것은 useAnalyticsLifecycle.ts:53 이 쏘는 screen_viewed 4종(community · community_post · community_write · other)뿐이다.

### J5-0. 검증에서 확정된 정정 (8건)

| 대상 | 종류 | 무엇이 틀렸나 | 어떻게 고치나 |
|---|---|---|---|
| `community_feed_loaded.entry(=search\|feed 값으로)` | sanitizer_drop | 서버에도 두 번째 새니타이저가 있고 정규식이 클라이언트와 다르다. sinsin-be-bun/src/domains/analytics/record.ts:16 의 FORBIDDEN_PROP_KEY = /(email\|phone\|password\|token\|secret\|address\|birth\|name\|query\|search\|text\|title\|content\|message\|url)/i 에는 클라이언트에 없는 search·password·secret 가 들어 있다. entry(=search\|feed 값으로) 는 events.ts:205 의 클라이언트 정규식은 통과하지만 서버 record.ts:39 의 `if (FORBIDDEN_PROP_KEY.test(key)) continue` 에서 조용히 떨어진다. 스펙은 클라이언트 정규식만 대조했다(주석에도 '새니타이저(events.ts:204-219)에서 떨어질 뻔한 이름들' 이라고만 적혀 있다). | entry(=search\|feed 값으로) → is_query_mode 가 아니라(query 도 양쪽 금지어다) is_filtered_view 또는 mode:'browse'\|'find' 로 바꾼다. 그리고 앞으로 모든 키는 클라이언트+서버 두 정규식의 합집합(email\|name\|phone\|birth\|address\|health\|diagnosis\|disease\|ckd\|food\|meal\|text\|message\|query\|image\|uri\|url\|token\|title\|date\|error\|content\|answer\|description\|value\|password\|secret\|search)으로 대조해야 한다. |
| `community_story_viewed (app/stories.tsx:99)` | bad_path | 스펙은 'viewedRef dedupe 안쪽 — recordView 와 같은 자리, 같은 1회 보장' 이라고 했는데 실제 조건은 app/stories.tsx:99 `if (story && !story.isMine && !viewedRef.current.has(story.id))` 다. **!story.isMine 이 함께 걸려 있어 내가 올린 스토리는 이 블록에 절대 안 들어온다.** 여기에 이벤트를 넣으면 내 스토리를 지나칠 때마다 열람이 누락되고, community_story_viewer_closed.seen_count·stop_index 와도 어긋난다. 특히 '스토리 뷰어 → 나도 올리기 퍼널'의 3번 스텝은 두 번째 이후의 community_story_viewed 에 기대는데, 2번째 컷이 내 스토리면 그 사람은 통째로 퍼널에서 탈락한다(스토리를 올려 본 사람 = 생산자 후보가 정확히 그 사람들이다). | 조회수 기록(recordView)의 isMine 게이트와 분석 이벤트를 분리한다. viewedRef dedupe 는 공유하되 `if (story && !viewedRef.current.has(story.id))` 로 바깥을 열고, 안에서 `if (!story.isMine) void communityStoryService.recordView(...)` 로 서버 기록만 접는다. is_mine 을 이벤트 속성으로 실어 두면 나중에 갈라 볼 수도 있다. |
| `community_story_viewer_opened.source` | missing | app/stories.tsx:52 는 `useLocalSearchParams<{ index?: string; sort?: string }>()` 만 읽는다 — source 파라미터가 없다. 호출부로 지목된 StoryRail.tsx:102 는 `router.push(`/stories?index=${index}`)` 로 index 하나만 넘긴다(sort 도 안 넘겨서 항상 'recommended' 로 굳는다). 게다가 'rail_empty' 값은 **발생 자체가 불가능**하다: StoryRail.tsx:61-63 의 빈 레일 카드는 /stories 가 아니라 `/story/new` 로 보낸다(뷰어를 안 연다). 즉 이 속성은 라우트 파라미터 추가 없이는 'deep_link' 와 'rail' 을 못 가르고, 열거값 하나는 죽은 값이다. 스펙 notes 의 '코드가 먼저 바뀌어야 하는 곳' 목록에도 이 건이 빠져 있다. | StoryRail.tsx:102 를 `/stories?index=N&sort=recommended&from=rail` 로 바꾸고 stories.tsx:52 의 파라미터 타입에 from 을 추가한다. source 열거는 'rail'\|'deep_link' 둘로 줄인다('rail_empty' 는 community_story_compose_started 쪽에만 남긴다 — 거기서는 실제로 맞다). |
| `community_write_photo_blocked{reason:'permission'} / community_write_photo_dismissed` | bad_path | 스펙은 'imagePickerService.ts:42 onPermissionDenied 훅 경유' 라고 했지만, 자유글 에디터가 부르는 함수는 그 훅을 받지 않는다. imagePickerService.ts:93-96 `export async function pickMultipleImages(selectionLimit: number)` 는 인자가 숫자 하나뿐이고 내부에서 `ensurePermission("photo", {})` 로 **빈 옵션 객체를 하드코딩**한다(옵션 인자를 받는 것은 takePhoto:112 쪽이다). 따라서 reason:'permission' 은 절대 안 찍힌다. 더 나쁜 것은 FreePostEditor.tsx:154 의 반환값으로 갈라 보려는 community_write_photo_dismissed 다 — pickMultipleImages 는 권한 거부(:96 return [])와 사용자 취소(:105-107 return [])를 **똑같이 빈 배열**로 돌려주므로, 이 이벤트가 갈라내겠다고 선언한 두 원인이 코드 상 구별 불가다. | pickMultipleImages 시그니처를 `(selectionLimit: number, options: ImagePickerTrackingOptions = {})` 로 열고 :96 의 `{}` 를 options 로 바꾼다. 취소를 따로 보려면 반환 타입을 `{ uris: string[]; outcome: 'picked'\|'cancelled'\|'denied' }` 로 넓히는 편이 확실하다. 어느 쪽이든 이 건을 스펙의 '코드 선행 변경' 목록에 올려야 한다. |
| `community_comment_started (app/post/[id].tsx:1125)` | missing | kind:'new' 의 발화 지점으로 '입력창 onFocus' 를 지목했는데, app/post/[id].tsx 전체에 onFocus 가 **한 군데도 없다**(grep 결과 0건). :1125 는 댓글 TextInput 선언부가 맞지만 props 는 ref/value/onChangeText/onSelectionChange/placeholder/multiline/maxLength/style 뿐이다. 나머지 두 갈래(startReplyTo :238, startEdit :486)는 실재하는 핸들러라 대비가 더 크다 — 이 상태로 구현하면 '댓글 작성 이탈 퍼널'의 2번 스텝이 답글·수정만 담고 신규 댓글 시도는 통째로 빠진 채, 1→2 하락이 '읽기만 함' 으로 잘못 읽힌다. | TextInput(:1125)에 onFocus 를 새로 붙이고 세션당 1회 ref 가드를 건다. 스펙의 '구현상 주의' 에 이 코드 선행 변경을 명시할 것(다른 두 여정은 같은 성격의 목록을 갖고 있는데 이 여정만 없다). |
| `community_feed_loaded / 피드 로드 실패` | missing | 이 여정에는 글 상세·댓글·라이브러리 실패 이벤트는 있는데 **피드 자체의 실패 이벤트가 없다**. 게다가 src/features/recipe/hooks/useCommunityPosts.ts:18-27 은 `{ data: posts = [], isLoading, refetch }` 만 돌려주고 isError 를 노출하지 않는다 — 쿼리가 실패해도 posts=[] · isLoading=false 가 되어 community_feed_loaded 가 result_count:0 으로 찍힌다. 즉 이 이벤트가 갈라내겠다고 선언한 '빈 피드'와 '서버 실패'가 그대로 한 값으로 합쳐진다(스텝 2의 dropoffRisk 가 정확히 이 혼동을 문제로 지목해 놓고 처방이 그 혼동을 재생산한다). 같은 훅 반환값에 캐시 여부도 없어 from_cache 도 지금은 못 채운다. | useCommunityPosts 반환에 isError·isFetched(또는 dataUpdatedAt)를 추가하고, community_feed_load_failed{fail_kind, retryable} 를 새로 두거나 community_feed_loaded 에 status:'ok'\|'error' 를 실어 0건과 실패를 가른다. |
| `funnel: 내 활동 보관함 퍼널 (screen:community → community_library_viewed → community_post_opened)` | funnel_constraint | 퍼널 엔진은 스텝을 **이름으로만** 매칭한다(sinsin-be-bun/src/domains/analytics/queries/funnel.ts stepMatch: `sc.name = ${step.name}`, props 조건 없음). community_post_opened 는 feed·popular·related·library·search·deep_link 여섯 문에서 전부 같은 이름으로 나가므로, 보관함을 본 뒤 **피드에서** 글을 열어도 3번 스텝을 통과한다. reads 의 '거기서 글을 다시 여는 비율' 은 이 퍼널로 절대 안 나온다. 스펙은 스토리 퍼널에서는 이 제약을 정확히 인지해 놓고('퍼널 엔진은 스텝을 이름으로만 매칭해 속성별로 못 가른다') 여기서는 같은 실수를 한다. | 보관함 재열람을 세려면 별도 이름이 필요하다 — community_library_post_opened 를 따로 두거나(app/community-library.tsx:200), 이 퍼널을 2스텝(screen:community → community_library_viewed)으로 줄이고 3번째는 source='library' 로 필터한 이벤트 카운트 비율로 읽는다고 reads 에 명시한다. |
| `글/댓글 케밥 시트 dismiss (app/post/[id].tsx:373, :515)` | missing | 스텝 15·16 이 'showActionSheet 를 열고 아무것도 안 고르는 비율(picked == null)이 곧 메뉴가 기대와 다르다는 신호인데 안 잡힌다' 고 이탈 지점으로 지목해 놓고, 이벤트 목록에는 그 자리를 덮는 이벤트가 하나도 없다. 실제 코드에서 두 자리가 확인된다: 내 글 케밥 app/post/[id].tsx:373-381(`if (picked != null) await handlers[picked]()` — null 갈래 무처리), 댓글 케밥 :515(showActionSheet, 남의 댓글이면 답글/신고 2지선다). 신고 사유 시트만 community_report_dismissed 로 덮여 있어 '수정/삭제 시트를 열고 닫은 사람' 과 '답글/신고 시트를 열고 닫은 사람' 은 여전히 관측 불가다. | community_post_menu_opened / community_post_menu_dismissed 를 target:'post'\|'comment' 로 한 쌍 추가하거나(각각 :373·:515 와 그 null 갈래), 최소한 스텝의 dropoffRisk 문구를 '이번 범위에서는 계측하지 않는다' 로 낮춰 스펙이 스스로 약속을 어기지 않게 한다. |

### J5-1. 단계 (35)

| # | 단계 | 표면/라우트 | 코드 | 여기서 왜 빠져나가나 | 현재 계측 |
|---|---|---|---|---|---|
| 1 | 커뮤니티 탭 도착 | `/(tabs)/community` | `app/(tabs)/community.tsx:29` | 탭만 찍고 나간다. 헤더 세 아이콘(내 활동·북마크·공지)으로 새어 나가는 사람과 피드를 보는 사람이 구분되지 않는다. | screen_viewed{screen:'community'} (useAnalyticsLifecycle.ts:53) |
| 2 | 피드 로딩(스켈레톤) → 목록 도착 또는 빈 피드 | `/(tabs)/community (FreePostTab)` | `src/features/recipe/components/FreePostTab.tsx:175,300,485` | showSkeleton 중 이탈, 또는 feed.emptyTitle 만 보고 나감. 서버 지연·차단 필터로 visiblePosts 가 0이 된 경우도 같은 화면이라 지금은 구분 불가. | 없음 |
| 3 | 검색어 입력 → 최근검색 → 결과 0건 | `/(tabs)/community (검색 인풋 + 최근검색 칩)` | `src/features/recipe/components/FreePostTab.tsx:104,160,164,485` | 서버 검색 API가 없어 **이미 받은 피드만** 클라이언트 필터한다(주석 :210). 최신 글이 목록에 없으면 검색해도 안 나오고, 사용자는 '그 글이 없다'로 읽고 나간다. | 없음 |
| 4 | 카테고리 칩 · 정렬(최신/인기) · 태그 필터 | `/(tabs)/community (헤더 칩 행)` | `src/features/recipe/components/FreePostTab.tsx:133,142,444` | 카테고리를 고르면 글이 확 줄어 빈 목록이 되는 조합이 있다(카테고리 6종 × 태그). 어느 조합이 0을 만드는지 안 보인다. | 없음 |
| 5 | 스토리 레일 노출(있음/비어 있음) | `/(tabs)/community (StoryRail)` | `src/features/recipe/components/StoryRail.tsx:25,61` | 24시간짜리 콘텐츠라 시간대에 따라 레일이 통째로 비고, 그때는 '스토리 만들기' 카드 하나만 남는다. 레일이 비어 있던 세션 비율을 모른다. | 없음 |
| 6 | 글 카드 탭(목록/인기글/연관글/보관함) | `/(tabs)/community → /post/[id]` | `src/features/recipe/components/FreePostTab.tsx:190,341` | 인기글 캐러셀(가로)과 목록(세로) 중 어느 문이 실제로 쓰이는지 모른 채 둘 다 유지 중이다. | 없음 |
| 7 | 글 상세 로딩(스켈레톤) | `/post/[id]` | `app/post/[id].tsx:673` | usePostDetail 은 목록 캐시를 initialData 로 쓰므로(usePostDetail.ts:47) 목록 경유는 즉시, 딥링크는 네트워크 대기다. 딥링크 진입의 대기 이탈이 안 보인다. | screen_viewed{screen:'community_post'} |
| 8 | 글 상세 실패(삭제된 글·네트워크) / 글 없음 | `/post/[id]` | `app/post/[id].tsx:636,682` | COMMUNITY_ERROR_001(지워진 글) 딥링크는 재시도 버튼도 없는 막다른 화면이다. 공유 링크가 얼마나 죽은 글을 가리키는지 측정할 방법이 없다. | 없음 |
| 9 | 본문 열람 → 좋아요 · 북마크 · 공유 | `/post/[id] (앱바 + engagementRow)` | `app/post/[id].tsx:276,337,749` | 읽고 아무 반응 없이 나가는 것이 기본값. 반응 3종을 하나도 구분해 세지 않는다. | 없음 |
| 10 | 투표(PollCard) 참여 · 실패 | `/post/[id] (PollCard)` | `app/post/[id].tsx:383,392` | 실패 갈래가 넷인데(004 삭제·005 이미 참여·006 사라진 항목·007 단일선택) 전부 토스트로 흩어진다. 투표 붙은 글의 참여율 자체를 모른다. | 없음 |
| 11 | 댓글 구역 도착 — 로딩 / 조회 실패 / 0개 | `/post/[id] (commentsSection)` | `app/post/[id].tsx:938,945,965` | isCommentsError 는 '댓글을 불러오지 못했어요'로 따로 그리지만(usePostDetail.ts:250 머리말), 그 비율을 아무도 안 본다. 0개 화면에서 첫 댓글로 넘어가는 전환이 이 여정의 핵심 병목이다. | 없음 |
| 12 | 댓글 작성 시작 — 입력 포커스 / 답글 / 수정 | `/post/[id] (inputBar · MentionSuggestions)` | `app/post/[id].tsx:238,486,1125` | 세 시작점이 같은 입력창 하나를 공유한다. 답글 시드('@닉네임 ')만 남긴 채 포기하는 사람이 가장 흔한 이탈인데 흔적이 없다. | 없음 |
| 13 | 댓글 전송 → 성공 / 실패 | `/post/[id] (sendButton)` | `app/post/[id].tsx:406,423,430` | 010(답글 대상 없음)·001(글 삭제)·008/009(댓글 수정 대상) 실패는 재시도로 안 풀린다. 쓴 사람은 실패 뒤 대개 다시 안 쓴다. | 없음 |
| 14 | 댓글 컨텍스트 바 취소(답글/수정 포기) | `/post/[id] (inputContext 닫기)` | `app/post/[id].tsx:1077` | 답글을 시작했다가 접는 지점. 지금은 성공한 댓글만 서버에 남으므로 '시작했지만 안 쓴 사람'이 통째로 안 보인다. | 없음 |
| 15 | 댓글 케밥 → 답글/수정/삭제(내 것) · 답글/신고(남의 것) | `/post/[id] (showActionSheet)` | `app/post/[id].tsx:484,462,437` | 시트를 열고 아무것도 안 고르는 비율(picked == null)이 곧 '메뉴가 기대와 다르다'는 신호인데 안 잡힌다. | 없음 |
| 16 | 글 케밥 → 내 글(수정/삭제 시트) · 삭제 확인 | `/post/[id] (showActionSheet → showConfirm)` | `app/post/[id].tsx:359,372,293` | 삭제 확인에서 되돌아가는 비율. 그리고 수정 진입 후 저장 없이 돌아오는 비율(단계 20과 이어짐). | 없음 |
| 17 | 글 케밥 → 남의 글: 신고 사유 시트(5지선다) | `/post/[id] (showActionSheet 신고사유)` | `app/post/[id].tsx:308,313,320,330` | 케밥이 곧바로 사유 시트로 열린다(주석 :363). 사유 5개를 보고 닫는 사람이 신고 포기의 실체인데, 지금은 접수 성공만 서버에 남는다. | 없음 |
| 18 | 목록 카드 케밥 → 신고 / 차단 확인 | `/(tabs)/community · /community-library (PostListItem)` | `src/features/recipe/components/PostListItem.tsx:103,117,124` | 차단은 확인 다이얼로그 한 겹이 더 있고 낙관 갱신이라(useBlockedUsers.ts:16) 실패해도 화면상 성공처럼 보인다. 차단 시도 → 확정 사이의 하락이 안 보인다. | 없음 |
| 19 | 글쓰기 에디터 진입(빈 폼) | `/(write)/free/new → FreePostEditor` | `src/features/recipe/components/FreePostEditor.tsx:83 (app/(write)/free/new.tsx:6)` | 여기부터가 글쓰기 깔때기 입구다. screen_viewed{community_write} 는 신규·수정·스토리·레시피 글쓰기를 전부 한 이름으로 묶어 버려 입구 인원 자체를 못 센다. | screen_viewed{screen:'community_write'} (신규/수정/스토리 구분 불가) |
| 20 | 카테고리 시트 열기 → 고르기 | `PostCategorySheet (V2BottomSheet)` | `src/features/recipe/components/FreePostEditor.tsx:122 · src/features/recipe/components/PostCategorySheet.tsx:51` | 기본값이 첫 카테고리(diet)라 아무도 안 고르면 전부 '식단'으로 발행된다. 시트를 연 뒤 안 고르고 닫는 비율이 분류 품질 문제의 근원. | 없음 |
| 21 | 제목·본문 입력 | `/(write)/free/new (titleInput · bodyInput)` | `src/features/recipe/components/FreePostEditor.tsx:332,346` | canSubmit 은 제목+본문이 모두 차야 켜진다(:119). 제목만 쓰고 멈춘 사람이 가장 큰 무리인데, 본문 원문은 절대 실을 수 없어 길이 구간으로만 봐야 한다. | 없음 |
| 22 | 사진 첨부 — 권한 거부 / 5장 제한 / 앨범 취소 / 첨부 완료 | `/(write)/free/new (툴바 image-outline → 시스템 앨범)` | `src/features/recipe/components/FreePostEditor.tsx:144,147,154,156 · src/features/recipe/services/imagePickerService.ts:32,42` | 권한 거부는 설정 안내 다이얼로그로 끝나고(imagePickerService.ts:56) 사용자는 사진 없이 계속 쓰거나 나간다. 5장 초과는 토스트뿐. 세 갈래가 전부 같은 '아무 일도 안 일어남'으로 보인다. | 없음 |
| 23 | 투표 첨부(VoteSheet) · 태그 입력 | `VoteSheet · TagInput` | `src/features/recipe/components/FreePostEditor.tsx:164,171,186,357` | 투표 시트는 옵션 2개를 채워야 완료된다. 열었다가 못 채우고 닫는 비율이 곧 시트 난이도. | 없음 |
| 24 | 콘텐츠 책임 동의 체크(발행 게이트) | `/(write)/free/new (ContentResponsibilityCheck)` | `src/features/recipe/components/FreePostEditor.tsx:359 · src/features/recipe/components/ContentResponsibilityCheck.tsx:30` | **다 써 놓고 등록이 안 되는 유일한 이유.** canSubmit 이 responsibilityAgreed 를 요구하는데(:120) 체크박스는 본문 아래에 있어 키보드에 가려진다. 여기서 막힌 사람은 '등록 버튼이 죽었다'고 읽는다. | 없음 |
| 25 | 등록 누름 → 사진 업로드 진행 → 발행 성공/실패 | `/(write)/free/new (submitPill)` | `src/features/recipe/components/FreePostEditor.tsx:200,209,223,233,241` | 사진을 한 장씩 순차 업로드하고 한 장이라도 실패하면 글 전체를 안 올린다(:204 주석). 5장이면 대기가 길고, 실패 대부분은 FOOD_CAMERA_001/002(형식·5MB)라 재시도해도 같은 사진으로 또 실패한다. | 없음 |
| 26 | 에디터 나가기 확인 → 초안 폐기 | `ConfirmExitModal` | `src/features/recipe/components/FreePostEditor.tsx:135,513,520` | 쓰던 글을 버리는 최종 지점. 얼마나 쓴 상태에서 버리는지(본문 유무·사진 수)가 곧 이탈의 무게다. | 없음 |
| 27 | 글 수정 화면 — 진입 / 저장 / 실패 / 포기 | `/(write)/free/[id]` | `app/(write)/free/[id].tsx:115,193,231,234,436` | 남의 글 id 로 들어오면 한 프레임 스켈레톤 뒤 back() 된다(:111). 저장 실패는 002(남의 글)·001(삭제됨)이라 재시도가 무의미하다. | screen_viewed{screen:'community_write'} (신규 글쓰기와 같은 이름) |
| 28 | 스토리 뷰어 진입(추천/최신) | `/stories` | `app/stories.tsx:47,262,267` | **screen_viewed 가 'other' 로 떨어진다** (getAnalyticsScreenName 에 stories 분기 없음, events.ts:221-252). 전체화면 검은 화면 + 점 로더에서 나가는 사람이 화면 축에서 아예 안 보인다. | screen_viewed{screen:'other'} — 사실상 미계측 |
| 29 | 스토리 n번째 열람(세로 페이징) | `/stories (FlatList pagingEnabled)` | `app/stories.tsx:93,289` | onViewableItemsChanged 가 이미 서버에 조회수만 기록한다(communityStoryService.recordView, :101). 그 기록은 스토리별 카운터라 '사람이 몇 번째에서 멈췄나'는 못 뽑는다. | 없음(recordView 는 분석 이벤트가 아님) |
| 30 | 스토리 뷰어 종료 — 몇 번째에서 닫는가 | `/stories (topBar chevron-back / 스택 pop)` | `app/stories.tsx:296-305` | 이 여정에서 가장 값나가는 숫자. 지금은 닫는 순간에 아무 신호가 없어 1번째 컷 이탈과 끝까지 본 사람이 같아 보인다. | 없음 |
| 31 | 스토리 케밥 — 내 것 삭제 / 남의 것 신고·차단 | `/stories (showActionSheet → showConfirm)` | `app/stories.tsx:107,120,133,143` | 삭제 실패의 대부분은 012(24시간 만료)다(useCommunityStories.ts:42 주석). 신고는 글이 아니라 **작성자 신고**(reportService.reportUser)로 나가서 글 신고와 다른 표에 쌓인다. | 없음 |
| 32 | 스토리 작성 진입 → 후보 사진 0장 | `/(write)/story/new` | `app/(write)/story/new.tsx:59,109,371` | 오늘·어제 식사 기록 사진이 없으면 후보가 갤러리 타일 하나뿐이고 '올릴 사진이 없어요' 한 줄이 뜬다. 식사 기록을 안 하는 사람에겐 사실상 막힌 문인데 그 비율을 모른다. | screen_viewed{screen:'community_write'} (자유글 글쓰기와 구분 불가) |
| 33 | 스토리 사진 선택(끼니 사진 / 갤러리) → 캡션 | `/(write)/story/new` | `app/(write)/story/new.tsx:130,342,388` | 선택 전에는 등록 버튼이 꺼져 있다(:229). 갤러리 경로는 권한 거부 시 빈손으로 돌아오고 화면은 그대로다. | 없음 |
| 34 | 스토리 등록 → 성공 / 실패 / 폐기 확인 | `/(write)/story/new` | `app/(write)/story/new.tsx:149,164,181,191` | 원격(끼니) 사진은 업로드를 건너뛰어 즉시 끝나고, 갤러리 사진은 업로드가 붙는다. 403(온보딩 미완료)·014(사진 없음)·FOOD_CAMERA_002 가 서로 다른 실패인데 지금은 전부 토스트 한 줄로 사라진다. | 없음 |
| 35 | 내 활동 보관함 — 진입 · 탭 전환 · 빈 상태 | `/community-library` | `app/community-library.tsx:45,57,151,211` | 세 탭 모두 **이미 받아 둔 피드만** 필터한다(:57). 오래된 내 글은 목록에 없어 '쓴 글'이 비어 보인다 — 사용자에겐 글이 사라진 것으로 읽힌다. 여기도 screen_viewed 는 'other' 다. | screen_viewed{screen:'other'} — 사실상 미계측 |

### J5-2. 이벤트 (67 = 신규 66 · 변경 0 · 유지 1)

| 이벤트 | 상태 | 종류 | 속성 | 발화 지점 | 없으면 못 보는 이탈 |
|---|---|---|---|---|---|
| `community_block_confirmed` | new | success | `surface: string — 'feed'\|'story'` | src/features/recipe/components/PostListItem.tsx:124 · app/stories.tsx:140 (blockUser 호출 직전) | 차단은 낙관 갱신이라(useBlockedUsers.ts:16) 실패해도 화면은 성공처럼 보인다. 확정 시점을 앱에서 세 두지 않으면 서버 기록과 대조할 짝이 없다. |
| `community_block_dismissed` | new | abandon | `surface: string — 'feed'\|'story'` | src/features/recipe/components/PostListItem.tsx:117 (confirmed === false 분기) · app/stories.tsx:133 | 차단 확인에서 물러나는 비율. 높으면 '이 사람 글을 다시 안 볼래' 보다 가벼운 선택지가 필요하다는 뜻이다. |
| `community_block_started` | new | intent | `surface: string — 'feed'\|'story'` | src/features/recipe/components/PostListItem.tsx:117 (showConfirm 호출 직전) · app/stories.tsx:133 | 차단은 확인 한 겹이 더 있다. 시도 대비 확정 하락이 문구가 겁을 주는지 알려 준다. |
| `community_comment_cancelled` | new | abandon | `kind: string — 'reply'\|'edit'`<br>`had_input: boolean — 시드 말고 실제로 더 쳤는가` | app/post/[id].tsx:1077 (inputContext 의 닫기 Pressable) | 답글을 열었다가 접는 순간. started 와 짝지어야 '답글은 시작이 쉬운데 완주가 어렵다'를 숫자로 말할 수 있다. |
| `community_comment_delete_failed` | new | failure | `fail_kind: string — 'comment_gone'\|'not_mine'\|'network'\|'other'` | app/post/[id].tsx:477 (presentCommunityError 직전) | not_mine(009)이 잡히면 소유자 판정이 화면과 서버 사이에서 어긋나고 있다는 신호다. |
| `community_comment_deleted` | new | success | `is_reply: boolean` | app/post/[id].tsx:473 (deleteComment 성공 직후) | 쓴 지 얼마 안 된 댓글의 삭제율이 높으면 작성 UI 가 실수를 유발하고 있다는 뜻이다. |
| `community_comment_failed` | new | failure | `kind: string — 'new'\|'reply'\|'edit'`<br>`fail_kind: string — 'post_gone'\|'parent_gone'\|'comment_gone'\|'not_mine'\|'network'\|'other'` | app/post/[id].tsx:430 (presentCommunityError 직전) | parent_gone(010) 처럼 재시도가 무의미한 실패를 따로 세야 '다시 시도' 버튼을 걷어낼 근거가 생긴다. |
| `community_comment_liked` | new | success | `liked: boolean`<br>`is_reply: boolean` | app/post/[id].tsx:522 handleToggleCommentLike | 댓글을 안 쓰는 사람의 유일한 참여 신호. 글 좋아요와 나눠 봐야 한다. |
| `community_comment_started` | new | intent | `kind: string — 'new'\|'reply'\|'edit'`<br>`has_mention: boolean — 답글 시드로 @태그가 들어갔는가` | app/post/[id].tsx:238 startReplyTo · :486 startEdit · :1125 입력창 onFocus(신규, 세션당 1회 디바운스) | 시작은 했는데 안 보낸 사람 = 이 이벤트는 있고 succeeded 가 없는 사람. 지금은 성공한 댓글만 남아 그 무리가 통째로 안 보인다. |
| `community_comment_submitted` | new | intent | `kind: string — 'new'\|'reply'\|'edit'`<br>`mention_count: number — 실제 전송될 태그 수(닉네임은 싣지 않는다)`<br>`char_bucket: string — 'short'\|'medium'\|'long' (본문 원문 금지)` | app/post/[id].tsx:406 handleSubmitComment 진입부(content 확정 직후) | 전송을 눌렀는데 서버에 안 남은 건수 = submitted − succeeded. 실패 토스트만으로는 셀 수 없다. |
| `community_comment_succeeded` | new | success | `kind: string — 'new'\|'reply'\|'edit'`<br>`mention_count: number` | app/post/[id].tsx:423 (resetCommentDraft 직전) | 여정의 최종 성공 중 하나. 퍼널 마지막 스텝으로 쓴다. |
| `community_comments_load_failed` | new | failure | `fail_kind: string — 'network'\|'gone'\|'other'` | app/post/[id].tsx:945 (isCommentsError && comments.length === 0 분기 진입) | 글쓴이 눈에는 달렸던 댓글이 사라진 것으로 보이는 화면이다. 빈도를 모르면 우선순위도 못 매긴다. |
| `community_comments_loaded` | new | progress | `item_count: number — 최상위 댓글 수`<br>`reply_count: number — 답글 총수`<br>`is_empty: boolean` | app/post/[id].tsx:938 (isCommentsLoading false 전이 useEffect) | '댓글 0개' 화면에서 첫 댓글로 넘어가는 전환이 이 여정의 병목이다. 분모가 없으면 전환도 없다. |
| `community_feed_filtered` | new | intent | `axis: string — 'category'\|'tag'\|'sort'`<br>`option: string — 카테고리 키(diet 등) 또는 정렬 키(recent\|hot). axis='tag' 면 'custom' 고정(태그 문자열은 자유입력·고카디널리티라 싣지 않는다)`<br>`result_count: number — 필터 적용 후 남은 글 수` | src/features/recipe/components/FreePostTab.tsx:133 handleCategoryPress · :142 handleTagPress · :444 정렬 Pressable | 어떤 필터 조합이 목록을 0으로 만드는지가 안 보인다. 6개 카테고리 중 죽은 칸을 이걸로만 찾는다. |
| `community_feed_loaded` | new | progress | `result_count: number — 차단 필터 뒤 실제로 그려진 글 수`<br>`has_tag_filter: boolean — 태그 딥링크로 들어왔는가`<br>`entry(=search\|feed 값으로): boolean — 검색 결과 목록인가`<br>`from_cache: boolean — react-query 캐시로 즉시 그렸는가` | src/features/recipe/components/FreePostTab.tsx:85 — useCommunityPosts 의 isLoading 이 false 로 떨어지는 첫 순간(useEffect) | 빈 피드와 로딩 이탈이 지금은 같은 화면이다. result_count=0 세션 비율이 곧 '들어왔는데 볼 게 없었다'. |
| `community_feed_searched` | new | intent | `result_count: number — 클라이언트 필터 결과 수`<br>`from_recent: boolean — 최근검색 칩을 눌렀는가`<br>`char_bucket: string — 'short'\|'medium'\|'long' (검색어 원문은 절대 싣지 않는다)` | src/features/recipe/components/FreePostTab.tsx:160 handleSubmitSearch · :164 handleRecentPress | 서버 검색이 없어 이미 받은 피드만 뒤진다. result_count=0 비율이 '검색이 고장 났다'는 체감의 크기다. |
| `community_library_tab_changed` | new | progress | `tab: string — 'mine'\|'liked'\|'bookmarked'`<br>`item_count: number` | app/community-library.tsx:151 (세그먼트 onPress) | 어느 탭이 비어 있어서 다음 탭으로 넘어가는지가 보인다. 빈 탭을 연속으로 밟고 나가는 사람이 이 화면의 주 이탈이다. |
| `community_library_viewed` | new | screen | `tab: string — 'mine'\|'liked'\|'bookmarked'`<br>`item_count: number — 그 탭에 실제로 걸린 글 수` | app/community-library.tsx:45 (initialTab 확정 직후 1회) | /community-library 도 screen_viewed 에서 'other' 다. item_count=0 비율이 곧 '내 글이 사라졌다' 체감의 크기 — 세 탭 모두 이미 받은 피드만 거르기 때문이다(:57). |
| `community_post_bookmarked` | new | success | `bookmarked: boolean` | app/post/[id].tsx:749 (앱바 북마크 Pressable) | 북마크는 '내 활동' 탭의 유일한 공급원이다. 여기가 안 눌리면 보관함은 영원히 비어 있다. |
| `community_post_delete_prompted` | new | intent | — | app/post/[id].tsx:294 (showConfirm 호출 직전) | 삭제 확인에서 되돌아가는 비율. 확인 문구가 겁을 주는지, 케밥에서 잘못 눌렀는지를 가른다. |
| `community_post_deleted` | new | success | — | app/post/[id].tsx:302 (deletePost 호출 직전) | 발행 대비 삭제율이 높은 카테고리는 글쓰기 안내가 잘못됐다는 신호다. |
| `community_post_edit_abandoned` | new | abandon | `body_changed: boolean`<br>`photo_changed: boolean` | app/(write)/free/[id].tsx:436 (ConfirmExitModal onConfirm) | 고치러 들어왔다가 그냥 나온 사람. 수정 진입 대비 저장률이 편집 UI 의 성적표다. |
| `community_post_edit_failed` | new | failure | `stage: string — 'photo'\|'post'`<br>`fail_kind: string — 'not_mine'\|'gone'\|'format'\|'too_large'\|'network'\|'other'` | app/(write)/free/[id].tsx:214(사진) · :234(저장) | not_mine(002)·gone(001)은 재시도가 무의미한 실패다. 빈도가 잡혀야 '다시 시도' 를 걷어낼 수 있다. |
| `community_post_edit_started` | new | intent | `photo_count: number — 기존 사진 수`<br>`tag_count: number` | app/(write)/free/[id].tsx:115 (post 로 폼을 채우는 useEffect, initialized 전이 시) | screen_viewed{community_write} 로는 신규와 수정이 같은 이름이라 수정 진입 자체를 못 센다. |
| `community_post_edit_succeeded` | new | success | `body_changed: boolean`<br>`photo_changed: boolean`<br>`tag_changed: boolean`<br>`category_changed: boolean` | app/(write)/free/[id].tsx:231 (updatePost onSuccess) | 무엇을 고치러 들어오는지 알면 편집 화면에서 무엇을 위로 올릴지 정할 수 있다. food_record_edit_succeeded 와 같은 계보의 불리언 조합. |
| `community_post_liked` | new | success | `liked: boolean — 켠 것인가 끈 것인가`<br>`is_mine: boolean` | app/post/[id].tsx:276 handleToggleLike | 읽고 아무것도 안 하는 사람과 반응한 사람을 가르는 첫 축. |
| `community_post_load_failed` | new | failure | `fail_kind: string — 'gone'\|'network'\|'other' (resolveError 의 범주. 원문 문구는 싣지 않는다)`<br>`retryable: boolean — 재시도 버튼을 그렸는가` | app/post/[id].tsx:643 (isError 분기의 resolveError 직후) · :682 (post 없음) | 공유 링크가 죽은 글을 가리키는 빈도. gone 이 많으면 공유 문구가 아니라 만료 정책 문제다. |
| `community_post_opened` | new | intent | `source: string — 'feed'\|'popular'\|'related'\|'library'\|'search'\|'deep_link'`<br>`position_bucket: string — 'top3'\|'top10'\|'deep' (인덱스 원값 대신 구간)`<br>`has_photo: boolean`<br>`is_mine: boolean` | src/features/recipe/components/FreePostTab.tsx:190(목록)·:341(인기글) · app/community-library.tsx:200 · app/post/[id].tsx:1009(연관글) | 인기글 캐러셀·연관글·보관함 세 문이 실제로 쓰이는지 모른 채 유지 중이다. 화면 이벤트만으로는 어느 문으로 들어왔는지 영원히 알 수 없다. |
| `community_post_poll_vote_failed` | new | failure | `fail_kind: string — 'gone'\|'already_voted'\|'option_gone'\|'single_only'\|'network'\|'other'` | app/post/[id].tsx:392 (presentCommunityError 직전) | 실패 갈래 넷 중 셋은 인터넷과 무관하다. already_voted 가 많으면 실패가 아니라 UI 가 상태를 못 보여 주는 것이다. |
| `community_post_poll_voted` | new | success | `option_count: number — 고른 항목 수(문항 문구는 싣지 않는다)` | app/post/[id].tsx:385 (castVoteAsync 성공 직후) | 투표 붙은 글의 참여율을 지금은 서버 집계로만 알 수 있고, 본 사람 대비 비율이 안 나온다. |
| `community_post_shared` | new | success | `has_photo: boolean` | app/post/[id].tsx:341 handleShare (shareContent 호출 직전) | 딥링크 유입(community_post_opened.source='deep_link')의 분모. 공유 대비 재유입을 이 둘로만 잇는다. |
| `community_report_dismissed` | new | abandon | `target: string — 'post'\|'comment'\|'author'\|'story'`<br>`surface: string — 'feed'\|'detail'\|'story'` | app/post/[id].tsx:313·:442 · src/features/recipe/components/PostListItem.tsx:85 · app/stories.tsx:170 (showActionSheet 이 null 을 돌려준 자리) | 사유 5개를 보고 닫는 사람이 신고 이탈의 실체다. 사유 목록이 실제 신고 이유를 못 담고 있다면 여기 쌓인다. |
| `community_report_failed` | new | failure | `target: string`<br>`surface: string`<br>`fail_kind: string — 'gone'\|'already_reported'\|'network'\|'other'` | app/post/[id].tsx:330·:455 · src/features/recipe/components/PostListItem.tsx:99 · app/stories.tsx:184 | already_reported(003·011)는 실패가 아니라 '접수 여부가 화면에 안 남는다'는 설계 결함의 지표다. |
| `community_report_started` | new | intent | `target: string — 'post'\|'comment'\|'author'\|'story'`<br>`surface: string — 'feed'\|'detail'\|'story'` | app/post/[id].tsx:309(글)·:438(댓글) · src/features/recipe/components/PostListItem.tsx:81 · app/stories.tsx:166 | 신고는 지금 접수 성공만 서버에 남는다. 시도 자체를 세지 않으면 포기율을 영원히 못 본다. |
| `community_report_succeeded` | new | success | `target: string — 'post'\|'comment'\|'author'\|'story'`<br>`surface: string — 'feed'\|'detail'\|'story'`<br>`reason: string — SPAM\|HARASSMENT\|INAPPROPRIATE_CONTENT\|FALSE_INFORMATION\|OTHER (고정 enum)` | app/post/[id].tsx:320·:449 · src/features/recipe/components/PostListItem.tsx:92 · app/stories.tsx:177 | OTHER 비중이 크면 사유 목록 자체를 다시 짜야 한다. 그 판단의 유일한 근거. |
| `community_story_candidates_shown` | new | progress | `item_count: number — 고를 수 있는 사진 수(끼니 + 갤러리)`<br>`has_recent: boolean — 오늘·어제 식사 기록 사진이 하나라도 있는가` | app/(write)/story/new.tsx:109 (candidates 확정 후 1회) | item_count=0 이면 갤러리 타일 하나만 남는 사실상 막힌 문이다. 식사 기록을 안 하는 사람에게 스토리가 닫혀 있다는 것을 이 값으로만 증명할 수 있다. |
| `community_story_compose_abandoned` | new | abandon | `has_photo: boolean`<br>`has_caption: boolean` | app/(write)/story/new.tsx:161 (showConfirm 이 true 를 돌려준 자리) | 사진까지 고르고 버리는 비율. 캡션 입력이 부담이면 여기 쌓인다. |
| `community_story_compose_started` | new | intent | `source: string — 'rail_pill'\|'rail_empty'\|'viewer_bar'` | app/(write)/story/new.tsx:59 (화면 마운트) — 호출부는 StoryRail.tsx:45·:63, app/stories.tsx:338 | 스토리 작성도 screen_viewed{community_write} 로 자유글과 섞인다. 세 입구 중 어느 것이 실제로 스토리를 만들게 하는지 지금은 알 수 없다. |
| `community_story_create_failed` | new | failure | `source: string — 'recent_slot'\|'gallery'`<br>`fail_kind: string — 'forbidden'\|'no_photo'\|'too_large'\|'network'\|'other'` | app/(write)/story/new.tsx:191 (presentCommunityError 직전) | forbidden(온보딩 미완료 403)이 2026-08-02 '스토리 동작 안 함'의 실체였다(:184 주석). 그 갈래를 세지 않으면 같은 오진을 또 한다. |
| `community_story_create_succeeded` | new | success | `source: string — 'recent_slot'\|'gallery'`<br>`has_caption: boolean` | app/(write)/story/new.tsx:181 (createStoryAsync await 직후, router.back 전) | 스토리 공급의 최종 전환. 레일이 자주 비는 원인이 진입 부족인지 실패인지 여기서 갈린다. |
| `community_story_delete_failed` | new | failure | `fail_kind: string — 'expired'\|'network'\|'other'` | src/features/recipe/hooks/useCommunityStories.ts:48 (deleteStoryMutation onError) | 여기 오는 대부분이 012(24시간 만료)다(:42 주석). expired 가 많으면 만료된 스토리를 화면에서 먼저 치워야 한다. |
| `community_story_deleted` | new | success | — | app/stories.tsx:116 (deleteStory 호출 직전) | 올린 뒤 곧 지우는 비율이 높으면 작성 화면이 실수를 유발한다는 뜻이다. |
| `community_story_liked` | new | success | `liked: boolean`<br>`index: number — 20 상한` | app/stories.tsx:84 handleToggleLike | 어느 순번에서 반응이 나오는지 보면 '앞 두세 장만 본다'가 사실인지 확인된다. |
| `community_story_photo_selected` | new | progress | `source: string — 'recent_slot'\|'gallery'`<br>`slot: string — 'breakfast'\|'lunch'\|'dinner'\|'snack'\|'none' (끼니 사진일 때만; 날짜·URL 은 싣지 않는다)` | app/(write)/story/new.tsx:142(갤러리) · :342(끼니 타일 onPress) | 선택 전에는 등록 버튼이 꺼져 있다(:229). 여기를 못 넘으면 스토리는 절대 안 만들어진다. |
| `community_story_rail_viewed` | new | progress | `item_count: number — 레일에 걸린 스토리 수(0 이면 만들기 카드만 뜬 상태)` | src/features/recipe/components/StoryRail.tsx:25 (stories 확정 후 1회) — 빈 분기는 :61 | 24시간짜리라 시간대에 따라 레일이 통째로 빈다. 뷰어 진입률의 분모가 매번 달라지는 것을 이 값 없이는 보정할 수 없다. |
| `community_story_sort_changed` | new | progress | `sort: string — 'recommended'\|'recent'` | app/stories.tsx:313 (정렬 탭 Pressable, viewedRef.clear 직전) | 추천을 신뢰하지 않고 최신으로 도망가는 비율. 추천 셔플 품질의 대리 지표다. |
| `community_story_submitted` | new | intent | `source: string — 'recent_slot'\|'gallery'`<br>`has_caption: boolean (캡션 원문 금지)` | app/(write)/story/new.tsx:164 handleSubmit 진입부(setIsUploading 직후) | 갤러리 경로만 업로드가 붙는다. 눌렀는데 안 올라간 건수를 source 별로 갈라야 업로드 문제인지 서버 문제인지 안다. |
| `community_story_viewed` | new | progress | `index: number — 0부터, 20 이상은 20 으로 접는다(카디널리티 상한)`<br>`sort: string — 'recommended'\|'recent'` | app/stories.tsx:99 (handleViewableChanged 의 viewedRef dedupe 안쪽 — recordView 와 같은 자리, 같은 1회 보장) | '몇 번째까지 봤나' 의 원자료. 서버 recordView 는 스토리별 카운터라 사람 축의 깊이를 못 준다. |
| `community_story_viewer_closed` | new | abandon | `stop_index: number — 닫을 때 보고 있던 순번(20 상한)`<br>`seen_count: number — 그 세션에서 실제로 본 스토리 수`<br>`item_count: number — 전체 수`<br>`sort: string — 'recommended'\|'recent'` | app/stories.tsx:296-305 (뒤로가기 Pressable) + 화면 언마운트 cleanup 양쪽 — 제스처 뒤로가기가 버튼을 안 거치므로 둘 다 필요(중복은 ref 로 막는다) | **이 여정에서 가장 값나가는 숫자.** stop_index 분포가 곧 '몇 번째에서 닫는가' 이고, seen_count/item_count 가 소진율이다. 지금은 1번째 컷 이탈과 완주가 구별되지 않는다. |
| `community_story_viewer_opened` | new | intent | `source: string — 'rail'\|'rail_empty'\|'deep_link'`<br>`sort: string — 'recommended'\|'recent'`<br>`item_count: number — 뷰어에 실린 스토리 수` | app/stories.tsx:47 (화면 마운트, params.sort/index 확정 후) — 호출부는 StoryRail.tsx:102 | /stories 는 getAnalyticsScreenName 에서 'other' 로 떨어져(events.ts:221-252) 화면 축으로는 존재하지 않는 화면이다. 이 이벤트가 사실상 그 화면의 screen_viewed 다. |
| `community_write_abandoned` | new | abandon | `has_body: boolean`<br>`photo_count: number` | src/features/recipe/components/FreePostEditor.tsx:520 (ConfirmExitModal onConfirm) | 초안이 실제로 버려진 순간. prompted − abandoned 가 '한 번 더 물어봐서 살린 글' 수다. |
| `community_write_category_opened` | new | progress | — | src/features/recipe/components/FreePostEditor.tsx:122 handleOpenCategorySheet | 카테고리 기본값이 첫 항목(diet)이라, 시트를 연 사람 수를 모르면 '아무도 안 바꾼다'와 '못 바꾼다'를 구별할 수 없다. |
| `community_write_category_selected` | new | progress | `category: string — diet\|numbers\|symptoms\|medicine\|dining-out\|daily (고정 6종)` | src/features/recipe/components/PostCategorySheet.tsx:51 handleSelect | opened 대비 selected 하락 = 시트에서 원하는 칸을 못 찾았다는 뜻. 분류 품질 문제의 출발점. |
| `community_write_consent_toggled` | new | progress | `agreed: boolean`<br>`has_body: boolean — 그 시점에 본문이 차 있었는가` | src/features/recipe/components/FreePostEditor.tsx:359 (ContentResponsibilityCheck onChange) — 체크 자체는 ContentResponsibilityCheck.tsx:30 | **다 써 놓고 등록이 안 되는 유일한 이유.** canSubmit 이 이 값을 요구하는데(:120) 체크박스는 본문 아래·키보드 뒤에 있다. 여기서 멈춘 사람은 '등록 버튼이 죽었다'고 읽고 나간다. |
| `community_write_exit_prompted` | new | abandon | `has_body: boolean`<br>`photo_count: number`<br>`tag_count: number`<br>`has_poll: boolean` | src/features/recipe/components/FreePostEditor.tsx:137 (hasContent 참이라 ConfirmExitModal 을 띄우는 자리) | 얼마나 쓴 상태에서 나가려 했는지가 곧 이탈의 무게다. 빈 폼 이탈과 다 쓴 글 폐기를 같은 값으로 세면 안 된다. |
| `community_write_failed` | new | failure | `stage: string — 'photo'\|'post' (사진 업로드 중인지 글 등록 중인지)`<br>`photo_count: number`<br>`fail_kind: string — 'format'\|'too_large'\|'forbidden'\|'network'\|'other'` | src/features/recipe/components/FreePostEditor.tsx:241 (presentError 직전) · app/(write)/free/[id].tsx:214 | 한 장이라도 실패하면 글 전체를 안 올린다(:204 주석). stage='photo' 가 대부분이면 순차 업로드 정책부터 손대야 한다. |
| `community_write_photo_attached` | new | success | `added_count: number — 이번에 고른 장 수`<br>`photo_count: number — 붙인 뒤 총 장 수` | src/features/recipe/components/FreePostEditor.tsx:156 (setImages 직전) · app/(write)/free/[id].tsx:179 | started → attached 하락이 앨범 이탈의 크기다. |
| `community_write_photo_blocked` | new | failure | `reason: string — 'permission'\|'limit' (limit 은 5장 초과)` | src/features/recipe/services/imagePickerService.ts:42 onPermissionDenied 훅 경유 · 제한은 src/features/recipe/components/FreePostEditor.tsx:147 | 권한 거부는 설정 안내로 끝나고 사용자는 사진 없이 계속 쓰거나 나간다. 이 갈래를 안 세면 '사진 첨부가 안 된다'는 문의를 재현할 수 없다. |
| `community_write_photo_dismissed` | new | abandon | `photo_count: number` | src/features/recipe/components/FreePostEditor.tsx:154 (pickMultipleImages 가 빈 배열을 돌려준 자리) | 앨범을 열고 아무것도 안 고르고 나온 경우. 권한 거부와 같은 '아무 일도 안 일어남'으로 보이지만 원인이 다르다. |
| `community_write_photo_started` | new | intent | `photo_count: number — 지금까지 붙인 사진 수` | src/features/recipe/components/FreePostEditor.tsx:144 handlePickImages 진입부 · app/(write)/free/[id].tsx:168 | 사진 첨부는 시스템 앨범으로 나갔다 오는 구간이라 앱이 통째로 백그라운드가 된다. 돌아오지 않는 사람을 이 이벤트 하나로만 셀 수 있다. |
| `community_write_poll_attached` | new | progress | `option_count: number — 채운 보기 수`<br>`allow_multiple: boolean` | src/features/recipe/components/FreePostEditor.tsx:186 handleVoteComplete | 투표 시트는 보기 2개를 채워야 완료된다. 툴바 탭(=열기) 대비 완료율이 시트 난이도를 말해 준다. |
| `community_write_poll_opened` | new | intent | `is_edit: boolean — 이미 붙인 투표를 다시 여는가` | src/features/recipe/components/FreePostEditor.tsx:164 handleOpenVoteSheet · :176 handleEditVote | attached 의 분모. 이 둘이 없으면 투표 기능이 안 쓰이는 건지 못 쓰는 건지 구분이 안 된다. |
| `community_write_started` | new | intent | `origin: string — 'feed_fab'\|'deep_link'` | src/features/recipe/components/FreePostEditor.tsx:83 (컴포넌트 최초 마운트) — 호출부는 app/(write)/free/new.tsx:6 | screen_viewed{community_write} 가 신규·수정·스토리·레시피 글쓰기를 한 이름으로 묶어 버려서 글쓰기 깔때기의 입구 인원 자체를 못 센다. 이 이벤트가 그 분모다. |
| `community_write_submitted` | new | intent | `category: string — 고정 6종`<br>`photo_count: number`<br>`tag_count: number`<br>`has_poll: boolean`<br>`body_bucket: string — 'short'\|'medium'\|'long' (본문 원문 금지)` | src/features/recipe/components/FreePostEditor.tsx:200 handleSubmit 진입부(setIsSubmitting 직후) | 누른 사람 − 성공한 사람 = 업로드 구간에서 죽은 글. 지금은 그 수가 어디에도 안 남는다. |
| `community_write_succeeded` | new | success | `category: string`<br>`photo_count: number`<br>`tag_count: number`<br>`has_poll: boolean` | src/features/recipe/components/FreePostEditor.tsx:233 (createPostAsync await 직후, onClose 전) | 이 여정의 최종 전환. 사진 수별 성공률을 나눠 보면 '5장은 못 올린다'가 보인다. |
| `community_write_tag_added` | new | progress | `tag_count: number — 붙인 태그 수(태그 문자열은 자유입력이라 싣지 않는다)` | src/features/recipe/components/FreePostEditor.tsx:357 TagInput onChangeTags (길이가 늘어난 경우만) | 태그는 피드 태그필터·연관글 랭킹의 재료다. 공급이 0이면 그 두 기능이 죽는다. |
| `screen_viewed` | keep | screen | `screen: AnalyticsScreenName — 화면 축. community · community_post · community_write 만 이 여정에 닿는다` | src/features/analytics/useAnalyticsLifecycle.ts:53 (라우트 세그먼트 변화 시 자동) | 탭·상세·글쓰기 3화면 경계는 이미 잡힌다. 다만 /stories 와 /community-library 는 'other' 로 뭉개지고, (write) 그룹은 신규·수정·스토리가 한 이름이라 여기서 더 못 쪼갠다. |

### J5-3. 퍼널 (8)

**글쓰기 발행 퍼널 (에디터 → 동의 → 발행)** — window 60분

1. `screen:community`
2. `event:community_write_started`
3. `event:community_write_consent_toggled`
4. `event:community_write_succeeded`

읽는 법: 커뮤니티 탭에 온 사람 중 몇 명이 글을 실제로 올리는가. 2→3 하락은 '쓰다 말았다'(제목만 쓰고 멈춤 포함), 3→4 하락은 **책임 동의를 켠 뒤에도 발행이 안 된 사람** = 등록 버튼 활성 이후의 실패(사진 업로드·서버)다. community_write_submitted 는 스텝으로 넣지 않았다 — succeeded 와 같은 초에 찍힐 수 있어(텍스트만 있는 글은 왕복이 1초 미만) 엄격 부등호에 걸린다. 대신 submitted÷consent_toggled 와 succeeded÷submitted 를 퍼널 밖 비율로 따로 읽는다.

**사진 첨부 이탈 퍼널** — window 60분

1. `event:community_write_started`
2. `event:community_write_photo_started`
3. `event:community_write_photo_attached`
4. `event:community_write_succeeded`

읽는 법: 2→3 하락이 시스템 앨범에서 돌아오지 않은 사람(권한 거부·앱 이탈·아무것도 안 고름)이다. 그 하락분의 성격은 community_write_photo_blocked.reason 과 community_write_photo_dismissed 로 갈라 읽는다. 3→4 하락은 사진을 붙인 뒤 업로드에서 죽은 글 — 순차 업로드 정책(한 장 실패 = 전체 실패)의 대가가 여기 나온다. 앨범 왕복이 초 단위라 인접 스텝 동시각 위험이 없다.

**댓글 작성 이탈 퍼널** — window 30분

1. `screen:community_post`
2. `event:community_comment_started`
3. `event:community_comment_succeeded`

읽는 법: 글을 연 사람 중 몇 명이 댓글 쓰기를 시작하고, 그중 몇 명이 실제로 남기는가. 1→2 는 '읽기만 함', 2→3 이 이 여정의 진짜 이탈 — 입력창을 잡았다가 접은 사람이다. 그 안의 갈래는 community_comment_cancelled(스스로 접음)와 community_comment_failed.fail_kind(서버가 막음)로 나눠 읽는다. submitted 는 succeeded 와 같은 초가 될 수 있어 인접 스텝으로 두지 않았다.

**피드 → 상세 → 반응 퍼널** — window 30분

1. `screen:community`
2. `event:community_post_opened`
3. `event:community_post_liked`
4. `event:community_comment_started`

읽는 법: 1→2 는 피드에서 글을 여는 비율(어느 문인지는 community_post_opened.source 로 쪼갠다), 2→3 은 읽고 반응하는 비율, 3→4 는 반응에서 대화로 넘어가는 비율이다. screen:community_post 를 스텝으로 쓰지 않은 이유는 community_post_opened 직후 같은 초에 화면 이벤트가 찍혀 엄격 부등호에 걸리기 때문이다.

**스토리 뷰어 → 나도 올리기 퍼널** — window 60분

1. `screen:community`
2. `event:community_story_viewer_opened`
3. `event:community_story_viewed`
4. `event:community_story_compose_started`
5. `event:community_story_create_succeeded`

읽는 법: 2→3 은 **한 장 이상 실제로 넘겨 본 사람**이다(뷰어 진입 직후 자동으로 찍히는 첫 community_story_viewed 는 opened 와 같은 초라 엄격 부등호에 걸려 떨어지고, 스와이프로 생긴 두 번째 이후만 통과한다 — 첫 컷만 보고 닫은 사람이 자연히 걸러진다). 3→4→5 는 소비자가 생산자가 되는 비율. **'몇 번째에서 닫는가'는 이 퍼널이 아니라 community_story_viewer_closed.stop_index 분포로 읽는다** — 퍼널 엔진은 스텝을 이름으로만 매칭해 속성별로 못 가른다.

**스토리 작성 퍼널** — window 30분

1. `event:community_story_compose_started`
2. `event:community_story_photo_selected`
3. `event:community_story_create_succeeded`

읽는 법: 1→2 하락은 고를 사진이 없어서 막힌 사람이다(community_story_candidates_shown.item_count=0 과 대조). 2→3 하락은 등록 실패 — community_story_create_failed.fail_kind 로 forbidden(온보딩 미완료 403)과 나머지를 가른다. submitted 는 원격 끼니 사진일 때 업로드를 건너뛰어 succeeded 와 같은 초가 될 수 있으므로 스텝에서 뺐다.

**신고 접수 퍼널** — window 15분

1. `event:community_report_started`
2. `event:community_report_succeeded`

읽는 법: 신고 의사를 밝힌 사람 중 실제 접수까지 간 비율. 하락분은 사유 5지선다에서 닫은 사람(community_report_dismissed)과 서버가 막은 사람(community_report_failed.fail_kind='already_reported' 포함)으로 갈린다. dismissed 비중이 크면 사유 목록이 실제 신고 이유를 못 담고 있다는 뜻이다. 사유 시트를 읽고 고르는 데 초 단위가 걸려 두 스텝의 동시각 위험은 낮다.

**내 활동 보관함 퍼널** — window 30분

1. `screen:community`
2. `event:community_library_viewed`
3. `event:community_post_opened`

읽는 법: 헤더 아이콘으로 보관함에 가는 비율과, 거기서 글을 다시 여는 비율. 2→3 이 낮으면 원인은 대개 '탭이 비어 있어서'다 — community_library_viewed.item_count=0 과 community_library_tab_changed 를 겹쳐 보면 세 탭을 연속으로 밟고 나간 패턴이 드러난다(세 탭 모두 이미 받은 피드만 필터하므로 오래된 내 글은 아예 안 나온다).

### J5-4. 주의

화면 축의 구멍(가장 먼저 고칠 것): getAnalyticsScreenName(events.ts:221-252)에 stories·community-library 분기가 없어 두 화면이 'other' 로 떨어진다. 스토리 뷰어와 내 활동은 화면 이벤트로는 존재하지 않는 화면이다. AnalyticsScreenName(events.ts:1-15)에 'community_story'·'community_library' 를 추가하고 각각 group==='stories', group==='community-library' 분기를 넣기를 권한다. 그 전까지는 위 퍼널처럼 screen 스텝 대신 community_story_viewer_opened / community_library_viewed 를 앵커로 써야 한다. 같은 이유로 group==='(write)' 는 자유글 신규·자유글 수정·스토리·레시피 글쓰기를 전부 'community_write' 하나로 묶는다 — community_write_started / community_post_edit_started / community_story_compose_started 로 갈라야 입구 인원이 분리된다.

새니타이저(events.ts:204-219)에서 떨어질 뻔한 이름들 — 대안으로 바꿔 실었다: image_count→photo_count, screen_name→screen, error_code/error_kind→fail_kind, title_len/description_len→body_bucket·char_bucket, comment_content→char_bucket, meal_slot→slot, image_uri→(안 실음), created_at→(안 실음). 특히 'date' 는 부분 문자열이라 updated·validated·candidate 계열이 통째로 탈락한다(u-p-**date**-d, vali-**date**-d) — edit 결과 플래그를 body_changed/photo_changed/tag_changed/category_changed 로 지은 이유다. 값은 string|number|boolean 만 실리므로 배열은 전부 개수로 접었다(mentions→mention_count, tags→tag_count, imageObjectPaths→photo_count).

개인정보: 검색어·댓글/본문 원문·캡션·닉네임·태그 문자열·서명 이미지 URL 은 어떤 이벤트에도 싣지 않았다. 신장 환자의 검색어와 본문은 그 자체로 건강 상태를 드러낸다. 길이는 3구간(short/medium/long)으로만, 태그는 개수로만 본다. community_feed_filtered 의 axis='tag' 는 option 을 'custom' 으로 고정한다 — 태그는 자유 입력이라 값을 실으면 고카디널리티인 동시에 준식별자가 된다. 신고 사유(reason)만 예외적으로 원값을 싣는데 서버 고정 enum 5종이라 안전하다.

카디널리티/볼륨: 새로 늘린 id 는 없다. 순번은 전부 구간으로 접었다 — community_post_opened.position_bucket(top3/top10/deep), community_story_viewed.index 와 community_story_viewer_closed.stop_index 는 20 상한. community_story_viewed 만 볼륨이 크다(스와이프마다 1건, 세션당 수십 건 가능) — 반드시 stories.tsx:99 의 viewedRef dedupe **안쪽**에 두어 스토리당 1회로 묶고, 상한 20 을 지킬 것. 나머지는 사람이 손으로 누르는 지점이라 건당 볼륨이 작다.

퍼널 엔진 제약 때문에 뺀 조합: server_ts 가 초 정밀도이고 스텝 간 비교가 엄격 부등호라 '누름 → 서버 응답' 쌍을 인접 스텝에 둘 수 없다. community_write_submitted→succeeded, community_comment_submitted→succeeded, community_story_submitted→create_succeeded, community_post_opened→screen:community_post, screen:community→community_feed_loaded(캐시면 같은 초) 가 전부 그 경우다. 이 쌍들은 퍼널이 아니라 단순 비율로 읽어야 한다.

구현상 주의 둘: (1) community_write_started 는 FreePostEditor 마운트에서 쏘므로 screen_viewed{community_write} 와 같은 틱이다 — 인접 퍼널 스텝으로 쓰지 말 것(위 퍼널은 screen:community 를 앵커로 써서 피했다). (2) community_story_viewer_closed 는 상단 뒤로가기 버튼(stories.tsx:296-305)만으로는 안드로이드 하드웨어 백·iOS 엣지 스와이프를 놓친다. 버튼 핸들러와 언마운트 cleanup 양쪽에서 쏘고 ref 로 중복을 막아야 stop_index 분포가 진짜가 된다.

---

## J6. AI 상담 · 리포트 · 알림

> AI 상담(consult) · 통계 리포트 프로즈 · 알림 — "묻고 · 기다리고 · 다시 불러들이기" 한 줄기. 전역 플로팅 필(FloatingAiButton)로 상담을 열어 첫 질문을 보내고 스트리밍 답변을 끝까지 받는 구간, 통계 화면에서 서버가 프로즈 결론을 만들어 줄 때까지 기다리는 구간, 그리고 알림 권한·푸시 동의를 켜서 다음 날 다시 앱으로 돌아오는 구간.

### J6-0. 검증에서 확정된 정정 (5건)

| 대상 | 종류 | 무엇이 틀렸나 | 어떻게 고치나 |
|---|---|---|---|
| `stats_report_requested (useStatsReport.ts:28 queryFn)` | bad_path | React Query 의 queryFn 은 **캐시 미스일 때만** 실행된다. useStatsReport.ts:23-30 은 staleTime 5분이라, 5분 안에 같은 기간으로 되돌아오거나 기간을 앞뒤로 오갔다가 돌아오면 queryFn 이 호출되지 않는다. 그래서 (a) from_cache 속성은 **구조적으로 항상 false** 이고, (b) 캐시 히트 때는 stats_report_requested 없이 stats_report_rendered 만 남아 스펙이 처방한 비율(requested 대비 rendered)이 1을 넘는다. 스펙 notes 는 오히려 '캐시 히트면 같은 초라 인접 배치 불가' 라고 적어 두어, 캐시 히트에도 requested 가 찍힐 것으로 전제하고 있다. | stats_report_requested 를 queryFn 이 아니라 화면 쪽(StatsReportScreen 의 period/anchorDate 변경 이펙트)에서 쏘고, from_cache 는 그 시점의 `query.isLoading === false && query.data != null` 로 판정한다. 그러면 대기 이탈의 분모가 실제 '요청한 사람' 과 일치한다. |
| `consult_answer_aborted.stop_kind = 'history_opened' (useChat.ts:349)` | bad_path | 스펙은 stop_kind 를 abort 호출부가 세팅한다며 ':349(loadConversation)' 을 지목했는데, useChat.ts:347-349 의 loadConversation 은 abort 를 하지 않는다. 첫 줄이 `if (inFlightRef.current \|\| isSending) return` 이라 **스트리밍 중이면 아무 일도 안 하고 빠져나간다** — AbortController 를 건드리는 곳은 언마운트(:99)와 resetChat(:377) 둘뿐이다. 따라서 stop_kind:'history_opened' 는 발생 불가능한 값이고, 반대로 '스트리밍 중에 기록 시트에서 지난 대화를 눌렀는데 아무 일도 안 일어난' 실제 이탈(사용자 눈에는 목록이 죽은 것)은 여전히 관측되지 않는다. | stop_kind 열거에서 'history_opened' 를 빼고 'screen_closed'\|'new_chat'\|'unmounted' 로 줄인다(app/consult.tsx:207 새 대화 → resetChat, :602 닫기 → resetChat/언마운트). 스트리밍 중 기록 선택이 무시되는 건은 consult_history_conversation_opened 가 안 따라붙는 것으로 보거나, useChat.ts:349 의 조기 반환 자리에 별도 이벤트를 둔다. |
| `consult_opened.intro_pending` | bad_path | consult_opened 는 화면 마운트에서 쏘는데(app/consult.tsx:116 ConsultScreen 선언부), 안내 시트의 visible 은 그 시점에 무조건 false 다. src/features/coach/useFeatureIntro.ts:24 `useState(false)` → :36 `featureIntroStorage.hasSeen()` 비동기 해석 → :38 `setTimeout(..., 450)` 을 거쳐야 true 가 된다. 즉 intro_pending 은 **항상 false** 로 실려 '안내를 본 코호트' 를 가르지 못한다. | intro_pending 을 consult_opened 에서 빼고, 이미 정의해 둔 consult_intro_viewed(app/consult.tsx:594 visible 전이)로만 코호트를 가른다. 굳이 진입 시점에 알아야 하면 featureIntroStorage.hasSeen('consult') 를 마운트에서 직접 읽어 seen_intro 로 싣는다. |
| `notification_push_opened (app/_layout.tsx:77)` | bad_path | why 에 '관문 조건(_layout.tsx:91-95)에 걸려 라우팅이 통째로 버려지는 계정도 여기서만 보인다' 고 적었는데 사실은 정반대다. 실제 코드는 관문 미통과 시 :93-96 에서 **effect 가 return 되고**, 리스너 등록(:99 addNotificationResponseReceivedListener)과 콜드스타트 경로(:101-103 getLastNotificationResponseAsync)가 **둘 다 그 뒤에** 있다. 즉 관문에 걸린 계정은 handleResponse 자체가 실행되지 않아 :77 의 이벤트가 영영 안 찍힌다 — 그 계정들은 이 이벤트로 '보이는' 게 아니라 정확히 안 보이는 쪽이다. | why 를 사실대로 고치고(관문 통과 계정만 관측된다), 관문 탈락을 정말 세고 싶으면 :93 의 조기 반환 직전에 notification_push_dropped{reason:'gate'} 를 따로 쏜다. cold_start 는 :99 경로와 :101 경로가 같은 handleResponse 를 공유하므로 인자로 플래그를 넘겨야 채워진다. |
| `wait_ms · dwell_ms · elapsed_ms · first_chunk_ms · stream_ms` | cardinality | 스펙은 '순번은 전부 구간으로 접었다' 며 카디널리티를 관리했다고 선언했지만 밀리초 원값 속성을 5종 남겼다. 서버 질의 계층에는 props 값에 대한 백분위·평균·히스토그램이 **없다** — sinsin-be-bun/src/domains/analytics/queries/breakdown.ts:36-46 은 `group by 1 order by events desc limit N` 하나뿐이고, percentile_cont 은 queries/funnel.ts 의 스텝 간 소요시간에만 쓰인다(queries/* 전수 grep 확인). 따라서 prop:wait_ms 로 브레이크다운하면 값마다 events=1 인 행이 limit 만큼 잘려 나올 뿐이라, 'wait_ms 분포가 3초 예산이 지켜지는지 말해 준다'·'dwell_ms 로 겁을 주는지 본다' 는 대시보드에서 읽을 방법이 없다. | 밀리초는 구간으로 접어 싣는다(예: wait_bucket 'instant'(<300ms)\|'fast'(<1s)\|'ok'(<3s)\|'slow'(<10s)\|'very_slow'). 원값이 정말 필요하면 버킷과 함께 싣되, 대시보드에 백분위 집계가 생기기 전까지는 버킷만 읽는다고 notes 에 못 박는다. |

### J6-1. 단계 (32)

| # | 단계 | 표면/라우트 | 코드 | 여기서 왜 빠져나가나 | 현재 계측 |
|---|---|---|---|---|---|
| 1 | 상담 열기 (전역 플로팅 필 탭) | `/consult (루트 모달 라우트, screen_name='consult')` | `src/shared/components/FloatingAiButton.tsx:56` | 탭바 위 필을 눌렀다가 모달이 뜨는 순간 '무엇을 물어야 하지'로 멈춘다. 주입 진입(식사·검진·식당의 '질문하기')은 반대로 열자마자 질문이 자동 발사돼, 빈손 진입과 한 통에 섞인다. | screen_viewed { screen:'consult' } (useAnalyticsLifecycle.ts:53). 진입 경로 구분 없음 |
| 2 | 첫 진입 안내 시트 노출·닫기 (기기당 1회, 450ms 지연) | `/consult 위 FeatureIntroSheet` | `app/consult.tsx:594 (표시), app/consult.tsx:597 → src/features/coach/useFeatureIntro.ts:49 (dismiss)` | 진료 한계 고지를 읽다가 '내가 물어도 되는 게 아니구나'로 그대로 닫고 나간다. 지금은 안내를 본 사람과 못 본 사람(2회차 이후)이 뒤 단계에서 구분되지 않는다. | 없음 |
| 3 | 빈 상담 화면 체류 (인사·추천 질문 카드·주제 칩) | `/consult (isIdle)` | `app/consult.tsx:162 (isIdle), app/consult.tsx:608-738` | 가장 큰 이탈 구간. 추천 질문을 넘겨보다 아무것도 안 누르고 닫는다. 화면 이벤트만으론 '들어와서 아무것도 안 한 사람'이 안 보인다. | 없음 (screen_viewed 뿐, 상담 시작 여부와 구분 불가) |
| 4 | 주제 칩 선택/해제 | `/consult 컴포저 상단 칩 줄` | `app/consult.tsx:834 (setCategory)` | 분류를 고르고도 질문을 못 만들어 멈춘다. 분류는 대화 생성 시점에 확정되므로(useChat.createChat) 여기서 멈춘 사람은 서버에 흔적이 하나도 안 남는다. | 없음 |
| 5 | 추천 질문(FAQ) 카드 탭 | `/consult FaqCarousel` | `app/consult.tsx:378 (handleFaqPress), src/features/consultation/components/FaqCarousel.tsx:75` | 탭하면 분류 설정 → 다음 렌더에 자동 전송이라 사람이 되돌릴 틈이 없다. 추천 질문이 실제로 첫 질문을 대신하는지, 아니면 '한 번 눌러보고 끝'인지 지금은 모른다. | 없음 |
| 6 | 직접 입력 시작 (첫 타이핑) | `/consult 컴포저 TextInput` | `app/consult.tsx:894 (onChangeText)` | 쓰다가 지우고 나가는 사람. 전송 전 이탈은 이 단계와 전송 단계의 차이로만 보인다. | 없음 |
| 7 | 첨부 메뉴 열기 (클립 버튼) | `/consult 화면 내 오버레이 메뉴` | `app/consult.tsx:284 (handlePlusPress), app/consult.tsx:976-1037` | 메뉴만 열고 배경 탭으로 닫는다. 키보드가 오르내리면 코드가 메뉴를 강제로 닫아서(consult.tsx:566) 사용자가 취소한 것처럼 보인다. | 없음 |
| 8 | 사진/카메라 권한 요청 결과 | `/consult → OS 권한 다이얼로그` | `app/consult.tsx:303 (미디어 라이브러리), app/consult.tsx:324 (카메라)` | 거부하면 첨부 상담이 그 자리에서 끝난다. 지금은 거부율도, 안내를 보고 설정으로 갔는지도 모른다. | 없음 (food_photo_permission_denied 는 홈 식사기록 경로 전용: RecordView.tsx:521,549) |
| 9 | 권한 거부 후 '설정 열기' 안내 | `/consult 확인 다이얼로그 (showConfirm)` | `app/consult.tsx:305-311, app/consult.tsx:326-332` | 설정으로 보내면 앱을 떠난다 — 돌아오는 비율이 이 기능의 실질 상한이다. | 없음 |
| 10 | 사진 고르기 (선택 완료 / 취소) → 인풋에 첨부 얹힘 | `/consult → 시스템 피커 → 컴포저 미리보기` | `app/consult.tsx:314-321, app/consult.tsx:335-339, app/consult.tsx:292 (attachImage), app/consult.tsx:297 (clearAttachedImage)` | 피커에서 취소하거나, 얹어놓고 X로 뺀 뒤 아무것도 안 보낸다. 사진은 바로 전송되지 않으므로 여기서 멈추면 서버에 아무 기록이 없다. | 없음 |
| 11 | 질문 전송 (전송 버튼 또는 자동 주입 발사) | `/consult` | `app/consult.tsx:525 (handleSend) → src/features/consultation/hooks/useChat.ts:274-279` | 전송 자체는 낙관 UI라 항상 성공처럼 보인다. 여기서부터는 '보냈는데 답이 없다'가 이탈 원인이 된다. | 없음 |
| 12 | 대화 생성 (첫 턴에만 일어나는 서버 왕복) | `/consult (POST /chat/conversations)` | `src/features/consultation/hooks/useChat.ts:299-323` | 여기서 실패하면 질문 버블만 남고 폴백 말풍선이 붙는다(createChatUnavailableMessage). 만료된 로그인·CHAT_ERROR_004 가 대표. 첫 상담이 통째로 무산되는 자리인데 지금은 로그만 남는다(useChat.ts:111). | 없음 |
| 13 | 첫 토큰 도착 (타이핑 인디케이터 → 답변 말풍선) | `/consult 스트리밍` | `src/features/consultation/hooks/useChat.ts:139-152 (전송), :213-226 (재생성)` | 첫 글자까지의 침묵이 길면 사람은 고장으로 읽고 화면을 닫는다. 지금은 '보냄'과 '완료' 사이가 통째로 암흑이라 얼마나 기다리다 나갔는지 못 본다. | 없음 |
| 14 | 답변 완료 (스트림 정상 종료·서버 메시지로 리컨사일) | `/consult` | `src/features/consultation/hooks/useChat.ts:167-170, :241-244` | 완료가 없는 전송이 곧 이탈이다. 완료까지의 시간이 길수록 다음 질문이 안 나간다. | 없음 |
| 15 | 답변 실패 (타임아웃·불완전 스트림·토큰 상한) | `/consult 실패 말풍선 + '답변 다시 받기'` | `src/features/consultation/hooks/useChat.ts:171-180, :245-259, src/features/consultation/utils/chatFailureCopy.ts:17-50` | 의료 답변이 중간에 끊기면 제한 고지가 빠진 채 남는다. 원인별(MAX_TOKENS/TIMEOUT/INCOMPLETE_STREAM) 빈도를 모르면 무엇을 고칠지 못 정한다. | 없음 |
| 16 | 답변 중단 (스트리밍 도중 화면 닫기·새 대화·다른 대화 열기) | `/consult` | `src/features/consultation/hooks/useChat.ts:97-103 (언마운트 abort), :376-386 (resetChat abort), :173 (code==='ABORTED' 은 화면에 아무것도 안 남긴다)` | 정확히 '스트리밍 응답 중단'. ABORTED 는 말풍선도 에러도 남기지 않아 지금은 존재 자체가 관측 불가다. 답이 길어 지루해 나간 것인지, 답이 틀려 새 대화를 판 것인지 구분이 필요하다. | 없음 |
| 17 | 답변 다시 받기 (재생성) | `/consult 마지막 답변 하단 버튼` | `src/features/consultation/hooks/useChat.ts:396-439` | 재생성은 '답이 쓸모없었다'의 유일한 신호다. 재생성 뒤에도 완료가 없으면 그 사람은 상담을 버린다. | 없음 |
| 18 | 답변 활용 (복사) 또는 이어서 두 번째 질문 | `/consult` | `app/consult.tsx:341 (handleCopy), app/consult.tsx:363 (AssistantBubble onCopy), 이어 질문은 app/consult.tsx:525` | 한 턴만 하고 닫는 상담은 '답은 받았지만 도움은 안 됐다'일 수 있다. 두 번째 질문이 나가는 비율이 실제 유용성 지표다. | 없음 |
| 19 | 대화 기록 시트 열기 → 지난 대화 불러오기 | `/consult 위 ChatHistorySheet (바텀시트)` | `app/consult.tsx:203 (handleHistoryPress), :212 (handleSelectHistory) → useChat.ts:347-374` | 빈 목록(ChatHistorySheet.tsx:250 isEmpty)이면 그대로 닫는다. 불러오기 실패(CHAT_ERROR_001 지워진 상담·002 남의 상담)는 다이얼로그만 뜨고 아무 데도 안 남는다. | 없음 |
| 20 | 상담 닫기 (X 또는 모달 스와이프) | `/consult → 이전 화면` | `app/consult.tsx:602 (onClosePress → router.back())` | 질문 없이 닫음/답 없이 닫음/스트리밍 중 닫음이 전부 같은 뒤로가기로 보인다. 이 셋을 갈라야 어느 이탈을 고칠지 정해진다. | 없음 |
| 21 | 통계 화면 진입 → 리포트 요청 | `/statistics (screen_name 은 'other' 로 떨어진다)` | `app/statistics.tsx:43 (이벤트), src/features/stats-report/hooks/useStatsReport.ts:26-30 (queryFn)` | 홈에서 눌러 들어온 사람이 리포트를 받기 전에 나간다. 지금 이벤트는 '진입'만 있고 '받았다'가 없어 대기 실패가 성공처럼 집계된다. | home_statistics_viewed (app/statistics.tsx:43) |
| 22 | 리포트 대기 (스켈레톤) — 서버가 프로즈 결론을 만드는 동안 | `/statistics 로딩 상태` | `src/features/stats-report/components/StatsReportScreen.tsx:188-189 (isLoading → LoadingSkeleton), :375` | 정확히 '리포트 대기 중 이탈'. 프로즈 예산(동기 3초)에 서버 왕복이 얹히면 체감이 길다. 캐시 히트(staleTime 5분)면 즉시라, 대기 시간 분포 없이는 무엇이 정상인지도 모른다. | 없음 |
| 23 | 리포트 도착 — 결론 카드(프로즈) 노출 | `/statistics 본문` | `src/features/stats-report/components/StatsReportScreen.tsx:197 (ReportSections), :221 (ConclusionCard), src/features/stats-report/components/ConclusionCard.tsx:38` | LOW 신뢰도(기록 부족) 리포트를 받은 사람은 볼 게 없어 바로 나간다. 배지 등급별 체류·재방문이 갈리는데 지금은 한 덩어리다. | 없음 |
| 24 | 리포트 실패 → 재시도 | `/statistics 에러 카드` | `src/features/stats-report/components/StatsReportScreen.tsx:190-195 (ErrorCard), :430 (onRetry)` | 재시도를 눌렀는지, 눌러서 성공했는지 모른다. 실패 후 재진입 없이 사라지는 사람이 진짜 손실이다. | 없음 |
| 25 | 기간 전환(일/주/월 세그먼트, ‹ ›) 및 리포트 끝(면책)까지 스크롤 | `/statistics 상단 컨트롤 + 본문 스크롤` | `src/features/stats-report/components/StatsReportScreen.tsx:145 (PeriodSegment), :151/:175 (‹ ›), :183 (ScrollView), :263-264 (DisclaimerFooter)` | 프로즈만 읽고 스크롤을 안 한다면 아래 섹션들은 존재 이유가 없다. 기간을 바꿨는데 또 대기가 걸리면 두 번째에서 나간다. | 없음 (ScrollView 에 onScroll 자체가 없다) |
| 26 | 알림 설정 화면 진입 | `/(settings)/notification-settings (screen_name='notifications')` | `app/(settings)/notification-settings.tsx:1 → src/features/settings/views/NotificationSettingsScreen.tsx:38` | 설정만 훑고 아무것도 안 켜고 나간다. 알림함 화면과 화면명이 같아('notifications') 화면 축으로는 두 화면이 구분되지 않는다. | screen_viewed { screen:'notifications' } — 알림함과 동일 값 |
| 27 | 카테고리 토글 ON (아침 체크·수분·식사) → OS 권한 요청 | `/(settings)/notification-settings → OS 권한 다이얼로그` | `src/features/settings/views/NotificationSettingsScreen.tsx:54/74/94 → src/hooks/useNotifications.ts:56-60 → src/services/notificationService.ts:77-85` | 정확히 '권한 거부'. 거부하면 토글이 원상복귀하고 저장도 안 된다(early return). 사용자 눈엔 '스위치가 안 켜지는 버그'다. | 없음 |
| 28 | 권한 거부 후 '설정 열기' 안내 | `/(settings)/notification-settings 알럿` | `src/features/settings/views/NotificationSettingsScreen.tsx:58-62 (showOpenSettingsAlert), src/features/settings/views/SettingsScreen.tsx:80-83` | OS 설정으로 나간 사람이 돌아와 다시 토글을 켜는 비율이 알림 기능의 실질 천장이다. 지금은 0% 인지 80% 인지 모른다. | 없음 |
| 29 | 시간 선택 (시간 피커 열기 → 시각 고르기 → 저장·스케줄 재등록) | `/(settings)/notification-settings 위 AppModal 시트` | `src/features/settings/views/NotificationSettingsScreen.tsx:285/397/417/501 (열기), :114-172 (선택), :527/542 (닫기) → src/hooks/useNotifications.ts:50-54` | 켜기만 하고 기본 시각(새벽 등)을 안 바꾸면 엉뚱한 시간에 알림이 가고 다음 날 통째로 꺼진다. 저장은 try/catch 가 없어 실패해도 화면이 성공처럼 남는다. | 없음 |
| 30 | 푸시 마스터 동의 토글 (설정) → 토큰 등록 | `/(settings)/index (설정) 스위치` | `src/features/settings/views/SettingsScreen.tsx:76-92 → src/hooks/useNotifications.ts:62-82 → src/services/notificationService.ts:92-104` | 권한은 줬는데 토큰 등록(POST /user/push-token)이 실패하면 '켰다고 표시되는데 푸시는 안 오는' 상태가 된다. 이 조합은 지금 어디에도 안 남는다. | 없음 |
| 31 | 알림함 확인 (읽음·전체 비우기) | `/(settings)/notifications (screen_name='notifications')` | `src/features/settings/views/NotificationHistoryScreen.tsx:19, :114 (markAsRead), :66-75 (clearAll), :86 (빈 상태)` | 빈 알림함을 본 사람은 다시 안 온다. 전체 비우기는 '알림이 성가시다'의 신호다. | screen_viewed { screen:'notifications' } — 알림설정과 동일 값 |
| 32 | 푸시 탭 → 앱 복귀·라우팅 | `OS 알림 → routeFromPushData 목적지(홈/공지)` | `app/_layout.tsx:72-83 (addNotificationResponseReceivedListener), src/services/notificationRoutingService.ts:5-31` | 알림을 켠 목적(다음 날 다시 오게 하기)의 결승선. 관문 조건(_layout.tsx:91-95)에 안 맞는 계정은 라우팅이 통째로 버려지는데 그 사실도 안 보인다. | 없음 |

### J6-2. 이벤트 (51 = 신규 49 · 변경 0 · 유지 2)

| 이벤트 | 상태 | 종류 | 속성 | 발화 지점 | 없으면 못 보는 이탈 |
|---|---|---|---|---|---|
| `consult_answer_aborted` | new | abandon | `stop_kind: string — 'screen_closed' \| 'new_chat' \| 'history_opened' \| 'unmounted'`<br>`had_partial: boolean`<br>`elapsed_ms: number` | src/features/consultation/hooks/useChat.ts:173 (ABORTED 분기). stop_kind 는 abort 를 부른 쪽이 세팅: :99(언마운트), :377(resetChat ← app/consult.tsx:207 새 대화 / :602 닫기), :349(loadConversation) | 정확히 '스트리밍 중단'. ABORTED 는 말풍선도 에러도 남기지 않아 지금은 관측 자체가 불가능하다. |
| `consult_answer_completed` | new | success | `first_chunk_ms: number`<br>`stream_ms: number — 첫 토큰에서 완료까지`<br>`is_first_turn: boolean`<br>`regenerated: boolean`<br>`has_attachment: boolean`<br>`length_bucket: string — 답변 길이 버킷(원문 금지)` | src/features/consultation/hooks/useChat.ts:167-170 (reconcileStreamedMessage 직후), 재생성은 :241-244 | 상담의 성공 정의. 전송 대비 완료 격차가 곧 스트리밍 이탈률이다. |
| `consult_answer_copied` | new | success | `is_last: boolean — 마지막 답변이었나` | app/consult.tsx:341 (useCopyToClipboard.handleCopy), 호출은 :363 AssistantBubble onCopy | 복사는 답을 실제로 들고 나간다는 뜻 — 완료보다 강한 유용성 신호다. |
| `consult_answer_failed` | new | failure | `fail_kind: string — 'timeout' \| 'incomplete_stream' \| 'max_tokens' \| 'too_long' \| 'unauthorized' \| 'other' (ChatStreamError.code 를 범주로 접는다)`<br>`had_partial: boolean — 부분 답변이 있었나`<br>`elapsed_ms: number`<br>`is_first_turn: boolean`<br>`regenerated: boolean` | src/features/consultation/hooks/useChat.ts:172-179 (code!=='ABORTED'), 재생성은 :246-257 | 의료 답변이 중간에 끊기면 제한 고지가 빠진다. 원인별 빈도 없이는 타임아웃을 늘릴지 토큰 상한을 올릴지 못 정한다. |
| `consult_answer_regenerate_pressed` | new | intent | `had_conversation: boolean — 대화 생성부터 실패한 경우(false)면 처음 보내던 경로로 되탄다`<br>`after_fail: boolean — 실패 말풍선에서 눌렀나` | src/features/consultation/hooks/useChat.ts:396-413 | '답이 쓸모없었다'의 유일한 명시 신호. 재생성 후에도 완료가 없으면 그 사람은 상담을 버린다. |
| `consult_answer_streaming_started` | new | progress | `first_chunk_ms: number — 전송에서 첫 토큰까지`<br>`is_first_turn: boolean`<br>`regenerated: boolean` | src/features/consultation/hooks/useChat.ts:140-145 (placeholderAdded false→true), 재생성은 :214-219 | '보냄'과 '완료' 사이의 암흑을 가른다. 첫 글자까지의 침묵이 중단의 직접 원인이다. |
| `consult_attachment_added` | new | success | `source: string — 'gallery' \| 'camera'` | app/consult.tsx:292 (attachImage) | 사진은 즉시 전송되지 않는다 — 얹힌 뒤 전송까지가 별도 이탈 구간이다. |
| `consult_attachment_menu_opened` | new | intent | — | app/consult.tsx:284 (handlePlusPress) | 사진 상담의 깔때기 입구. 키보드 이동 시 코드가 메뉴를 강제로 닫으므로(consult.tsx:566) 열림 대비 선택 비율이 UI 결함 지표가 된다. |
| `consult_attachment_permission_resulted` | new | progress | `source: string — 'gallery' \| 'camera'`<br>`result: string — 'granted' \| 'denied'` | app/consult.tsx:303 (requestMediaLibraryPermissionsAsync 직후), app/consult.tsx:324 (requestCameraPermissionsAsync 직후) | 거부율을 모르면 사진 상담이 안 쓰이는 이유가 권한인지 수요인지 못 가른다. 기존 food_photo_permission_denied 는 홈 식사기록 전용이고 granted 를 못 센다. |
| `consult_attachment_picker_cancelled` | new | abandon | `source: string — 'gallery' \| 'camera'` | app/consult.tsx:318 (result.canceled), app/consult.tsx:336 | 권한은 줬는데 사진을 못 고르고 나온 경우. 권한 거부와 전혀 다른 처방이 필요하다. |
| `consult_attachment_removed` | new | abandon | — | app/consult.tsx:297 (clearAttachedImage) | 얹었다 뺀 행위 = 잘못 골랐거나 마음이 바뀐 것. 갤러리 확인 단계(홈의 food_photo_confirm_*)가 상담에는 없다는 증거가 된다. |
| `consult_attachment_settings_prompted` | new | failure | `source: string — 'gallery' \| 'camera'`<br>`opened_settings: boolean — 안내에서 '설정 열기'를 눌렀나` | app/consult.tsx:305-311, app/consult.tsx:326-332 (showConfirm 결과 반영) | 거부한 사람이 실제로 OS 설정까지 가는지. 여기서 앱을 떠나므로 복귀율의 기준점이 된다. |
| `consult_closed` | new | abandon | `had_question: boolean — 질문을 하나라도 보냈나`<br>`got_reply: boolean — 답변을 하나라도 완료했나`<br>`was_streaming: boolean — 스트리밍 도중 닫았나`<br>`dwell_ms: number — 상담 체류 시간`<br>`entry: string — 진입 경로` | app/consult.tsx:602 (onClosePress) 및 화면 언마운트 정리 | 빈손 이탈·답 없는 이탈·중단 이탈이 지금은 전부 같은 뒤로가기다. 이 셋을 갈라야 어디를 고칠지 정해진다. |
| `consult_compose_started` | new | intent | `has_attachment: boolean — 첨부를 얹은 상태로 쓰기 시작했나`<br>`from_topic: boolean — 주제 칩을 먼저 골랐나` | app/consult.tsx:894 (onChangeText) — 빈 상담 세션당 1회만(ref 가드) | '첫 메시지 전송 전 이탈'을 보려면 진입과 전송 사이에 사람 박자의 중간점이 하나 필요하다. 쓰다 지운 사람은 이 이벤트에만 남는다. |
| `consult_conversation_create_failed` | new | failure | `category: string`<br>`entry: string`<br>`fail_kind: string — 'unauthorized' \| 'invalid' \| 'network' \| 'other' (범주형, 서버 문자열 원문 금지)` | src/features/consultation/hooks/useChat.ts:313-323 (catch) | 지금은 logger.error(useChat.ts:111) 로만 남는다. 만료된 로그인이 첫 상담을 얼마나 죽이는지 보이지 않는다. |
| `consult_conversation_created` | new | success | `category: string`<br>`entry: string` | src/features/consultation/hooks/useChat.ts:310-312 (conversation.id 확정 직후) | 첫 턴에만 있는 서버 왕복. 여기서 끊기면 상담이 통째로 무산되는데 지금은 답변 실패와 구분이 안 된다. |
| `consult_history_conversation_opened` | new | success | `item_count: number — 불러온 메시지 수(0~99 캡)` | src/features/consultation/hooks/useChat.ts:357 (setMessages 직후) | 지난 상담으로 돌아오는 재방문 경로. 대화 id 는 싣지 않고 길이만 본다. |
| `consult_history_open_failed` | new | failure | `fail_kind: string — 'deleted' \| 'forbidden' \| 'network' \| 'other' (CHAT_ERROR_001/002 를 범주로)` | src/features/consultation/hooks/useChat.ts:370 (presentError 직전) | 목록에 보이는데 안 열리는 대화가 얼마나 되는지. 지금은 다이얼로그만 뜨고 아무 데도 안 남는다. |
| `consult_history_opened` | new | intent | `item_count: number — 목록 로딩 완료 시점의 대화 수`<br>`is_empty: boolean` | app/consult.tsx:203 에서 열고, 카운트는 src/features/consultation/components/ChatHistorySheet.tsx:250 (isEmpty 확정 시점)에서 1회 | 빈 목록을 본 사람은 그대로 닫는다. 기록 기능이 재방문을 만드는지 여기서 갈린다. |
| `consult_intro_dismissed` | new | progress | `dwell_ms: number — 시트가 떠 있던 시간` | app/consult.tsx:597 (onClose={consultIntro.dismiss}) | 읽고 닫았는지 즉시 튕겼는지(dwell_ms) 로 진료 한계 고지가 겁을 주는지 본다. |
| `consult_intro_viewed` | new | screen | — | app/consult.tsx:594 (FeatureIntroSheet visible 전이) — 판정은 src/features/coach/useFeatureIntro.ts:38 | 첫 진입 안내가 첫 질문을 돕는지 막는지 모른다. 기기당 1회라 신규 사용자 코호트 그 자체다. |
| `consult_new_chat_pressed` | new | intent | `got_reply: boolean — 지금 대화에서 답을 받은 상태였나`<br>`was_streaming: boolean — 스트리밍 도중이었나` | app/consult.tsx:207 (handleNewChat) | 답을 받는 도중에 새 대화를 파는 것은 '답이 틀렸다'의 신호다. 지루함(닫기)과 다른 처방이 필요하다. |
| `consult_opened` | new | screen | `entry: string — 'floating' \| 'record' \| 'checkup' \| 'prompt' \| 'deep_link' (useLocalSearchParams 로 판정)`<br>`intro_pending: boolean — 첫 진입 안내가 뜰 차례인가` | app/consult.tsx:116 마운트 이펙트 (파라미터 판정은 :125 useLocalSearchParams, :392/:438/:489 주입 경로와 같은 규칙) | screen_viewed 만으로는 '스스로 물으러 온 사람'과 '식사·검진 카드가 대신 보낸 질문'이 한 통에 섞인다. 주입 경로는 진입=전송이라 빈손 이탈률을 왜곡한다. |
| `consult_question_submitted` | new | intent | `entry: string — 'typed' \| 'suggestion' \| 'record' \| 'checkup' \| 'prompt'`<br>`category: string — ChatCategory 값`<br>`has_attachment: boolean`<br>`is_first_turn: boolean — 대화의 첫 질문인가`<br>`turn_index: number — 0~9 로 캡(그 이상은 9)`<br>`length_bucket: string — 's'(<40자) \| 'm'(<200자) \| 'l' — 원문은 싣지 않는다` | src/features/consultation/hooks/useChat.ts:279 (inFlight 가드 통과 직후, 전송 단일 관문). entry 는 호출부가 인자로 넘긴다: app/consult.tsx:527(handleSend), :388(FAQ), :422(식사), :468(검진), :520(범용 프롬프트) | 모든 퍼널의 허리. 질문 원문 대신 길이 버킷만 실어 검색어급 민감정보를 피한다. |
| `consult_suggestion_pressed` | new | intent | `category: string — FaqCardEntry.category`<br>`position: number — 페이지×4+행 인덱스(0~), 문구는 싣지 않는다` | app/consult.tsx:378 (handleFaqPress) — 인덱스를 넘기려면 src/features/consultation/components/FaqCarousel.tsx:75 onPress 시그니처에 index 추가 필요 | 추천 질문이 첫 질문을 실제로 대신하는지, 어느 자리 카드만 눌리는지. 질문 원문은 건강상태를 드러내므로 위치만 싣는다. |
| `consult_topic_selected` | new | intent | `category: string — ChatCategory 값 (NONE/FOOD_DIET/EXAM 등)`<br>`selected: boolean — 선택인가 해제인가` | app/consult.tsx:834 (Chip onPress) | 분류는 대화 생성 시점에야 서버로 간다. 칩만 고르고 나간 사람은 서버에 흔적이 0이다. |
| `notification_category_save_failed` | new | failure | `kind: string`<br>`enabled: boolean`<br>`fail_kind: string — 'network' \| 'unauthorized' \| 'schedule' \| 'other'` | src/hooks/useNotifications.ts:50-54 — 현재 try/catch 가 없어 감싸야 한다(실패해도 화면은 켜진 채 남는다) | 저장 실패가 지금은 아무 데도 안 남는다. 사용자는 켰다고 믿는데 알림이 안 온다. |
| `notification_category_saved` | new | success | `kind: string — 'morning' \| 'water' \| 'meal'`<br>`enabled: boolean`<br>`hour: number — 대표 시각(수분은 시작 시각)` | src/hooks/useNotifications.ts:50-54 (update + scheduleAll 완료 후) | 토글 누름 대비 저장 성공이 실제 전환이다. 시각 분포는 알림이 언제 갈지를 말해 준다. |
| `notification_category_toggle_pressed` | new | intent | `kind: string — 'morning' \| 'water' \| 'meal'`<br>`enabled: boolean — 켜기인가 끄기인가` | src/features/settings/views/NotificationSettingsScreen.tsx:54 / :74 / :94 (핸들러 진입 즉시, 권한 요청 이전) | 권한 거부로 되돌아간 토글은 화면상 흔적이 없다. 의도(누름)와 결과(저장)를 분리해야 거부가 보인다. |
| `notification_history_cleared` | new | abandon | `item_count: number — 지운 개수` | src/features/settings/views/NotificationHistoryScreen.tsx:74 (확인 후 clearAll) | 전체 비우기는 알림 피로의 신호다. 직후 알림 끄기와 이어지는지 봐야 한다. |
| `notification_history_item_read` | new | success | `unread_count: number — 누르기 직전 미읽음 수`<br>`bulk: boolean — 전체 읽음(markAllAsRead)인가` | src/features/settings/views/NotificationHistoryScreen.tsx:114 (markAsRead), :126 (markAllAsRead) | 알림이 실제로 열려서 행동으로 이어지는지. 전체 읽음은 '읽지 않고 치웠다'에 가깝다. |
| `notification_history_viewed` | new | screen | `item_count: number`<br>`unread_count: number`<br>`is_empty: boolean` | src/features/settings/views/NotificationHistoryScreen.tsx:19 마운트 | 알림함이 빈 채로 열리는 비율. 화면명이 알림설정과 같아서 screen_viewed 로는 분리 불가. |
| `notification_permission_resulted` | new | progress | `origin: string — 'category_toggle' \| 'push_consent'`<br>`result: string — 'granted' \| 'denied'`<br>`prompted: boolean — OS 다이얼로그가 실제로 떴나(이미 granted 면 false)` | src/services/notificationService.ts:80-85 (기존 granted 조기반환 포함) — 호출부 src/hooks/useNotifications.ts:57, :65 | 정확히 '권한 거부'. prompted 를 같이 봐야 '거부'와 '이미 허용'을 안 섞는다. |
| `notification_permission_settings_prompted` | new | failure | `origin: string — 'category_toggle' \| 'push_consent'` | src/features/settings/views/NotificationSettingsScreen.tsx:58 (showOpenSettingsAlert), src/features/settings/views/SettingsScreen.tsx:80 | 여기서 앱을 떠난다. 이 이벤트 뒤 재진입·재토글까지가 알림 회복 퍼널이다. |
| `notification_push_consent_failed` | new | failure | `enabled: boolean`<br>`fail_kind: string — 'permission_denied' \| 'register_failed' \| 'save_failed' \| 'other'` | src/hooks/useNotifications.ts:67 (권한 거부 return false), src/features/settings/views/SettingsScreen.tsx:84-91 (presentError catch) | '켜졌다고 표시되는데 푸시는 안 오는' 상태(POST /user/push-token 실패, notificationService.ts:99)를 잡는 유일한 자리다. |
| `notification_push_consent_succeeded` | new | success | `enabled: boolean` | src/hooks/useNotifications.ts:70-71 (켜기: 토큰 등록 + setPushConsent(true) 완료), :74-79 (끄기) | 푸시 복귀 퍼널의 출발점. 여기가 있어야 '켠 사람이 며칠 뒤 실제로 돌아왔나'를 이을 수 있다. |
| `notification_push_consent_toggled` | new | intent | `enabled: boolean` | src/features/settings/views/SettingsScreen.tsx:76 (handlePushToggle 진입) | 마스터 동의는 권한·토큰 등록·서버 저장 세 단계를 한 스위치에 묶는다. 의도와 결과를 분리해야 어디서 깨지는지 보인다. |
| `notification_push_opened` | new | lifecycle | `route_kind: string — 'home' \| 'announcement' \| 'announcement_list' \| 'fallback'`<br>`cold_start: boolean — getLastNotificationResponseAsync 경로인가`<br>`routed: boolean — routeFromPushData 가 목적지를 찾았나` | app/_layout.tsx:77 (routeFromPushData 직후), 판정은 src/services/notificationRoutingService.ts:5-31 | 알림을 켠 목적(다음 날 다시 오게 하기)의 결승선. 관문 조건(_layout.tsx:91-95)에 걸려 라우팅이 통째로 버려지는 계정도 여기서만 보인다. |
| `notification_settings_viewed` | new | screen | `push_on: boolean — 마스터 동의 상태`<br>`on_count: number — 켜져 있는 카테고리 수(0~3)` | src/features/settings/views/NotificationSettingsScreen.tsx:38 마운트 | screen_viewed 는 알림함과 값이 같아('notifications') 두 화면을 못 가른다. 진입 시 상태를 같이 실어야 '켜러 왔다 그냥 나감'이 보인다. |
| `notification_time_picker_dismissed` | new | abandon | `target: string` | src/features/settings/views/NotificationSettingsScreen.tsx:527 (onRequestClose), :532 (배경 탭), :542 (X) | 24개짜리 시간 목록에서 못 고르고 닫는 비율. 피커 자체가 장벽인지 여기서 드러난다. |
| `notification_time_picker_opened` | new | intent | `target: string — 'morning' \| 'water_start' \| 'water_end' \| 'breakfast' \| 'lunch' \| 'dinner'` | src/features/settings/views/NotificationSettingsScreen.tsx:285 / :397 / :417 / :501 (setPickerTarget) | 기본 시각을 그대로 두는 사람과 고쳐 쓰는 사람을 가른다 — 새벽에 울리는 알림은 다음 날 전부 꺼진다. |
| `notification_time_selected` | new | success | `target: string`<br>`hour: number — 0~23` | src/features/settings/views/NotificationSettingsScreen.tsx:114-172 (handleHourSelect) | 실제로 고른 시각 분포. 알림 도달률·복귀율과 함께 봐야 시간대 기본값을 고칠 수 있다. |
| `stats_period_changed` | new | intent | `period: string — 바꾼 뒤 기간`<br>`move: string — 'segment' \| 'prev' \| 'next'` | src/features/stats-report/components/StatsReportScreen.tsx:145 (세그먼트), :151 (‹), :175 (›) | 리포트를 실제로 탐색하는 사람과 한 장만 보고 나가는 사람을 가른다. |
| `stats_report_bottom_reached` | new | progress | `period: string`<br>`section_count: number` | src/features/stats-report/components/StatsReportScreen.tsx:183 ScrollView — 현재 onScroll 이 없어 계측 추가 필요(면책 푸터 :263-264 도달 기준) | 프로즈 결론만 읽히고 아래 섹션이 안 읽히면 그 섹션들은 만들 이유가 없다. |
| `stats_report_failed` | new | failure | `period: string`<br>`wait_ms: number`<br>`fail_kind: string — 'timeout' \| 'server' \| 'network' \| 'unauthorized' \| 'other'` | src/features/stats-report/components/StatsReportScreen.tsx:190-195 (ErrorCard 진입) | 리포트 실패는 조용하다 — 사용자는 통계가 원래 이런 줄 안다. |
| `stats_report_rendered` | new | success | `period: string`<br>`wait_ms: number — 요청에서 표시까지(프로즈 예산 포함)`<br>`reliability: string — 'HIGH' \| 'LOW' 등 StatsReliability.level`<br>`badge: string — 'OK' \| 'DANGER' \| 'LOW_DATA' (파생 등급만, 서버 문구 금지)`<br>`section_count: number — 실제로 그려진 섹션 수`<br>`from_cache: boolean` | src/features/stats-report/components/StatsReportScreen.tsx:197 (ReportSections 최초 렌더 이펙트), 등급 판정은 ConclusionCard.tsx:21-30/49-55 와 동일 규칙 | '기다림이 끝났다'의 정의. wait_ms 분포가 3초 예산이 실제로 지켜지는지 말해 준다. conclusion.headline 원문은 건강 서술이라 절대 싣지 않는다. |
| `stats_report_requested` | new | intent | `period: string — 'day' \| 'week' \| 'month'`<br>`is_current: boolean — 진행 중 기간인가(끝난 기간은 서버 저장본)`<br>`from_cache: boolean — React Query 캐시 히트인가` | src/features/stats-report/hooks/useStatsReport.ts:28 (queryFn 진입) — 기간 이동마다 다시 발생 | 대기 이탈의 분모. home_statistics_viewed 는 진입 1회뿐이라 기간을 넘겨가며 생긴 대기를 못 센다. |
| `stats_report_retry_pressed` | new | intent | `period: string` | src/features/stats-report/components/StatsReportScreen.tsx:193 (onRetry → refetch), 버튼은 :430 | 실패 뒤 재시도율이 0에 가까우면 에러 카드가 아니라 자동 재시도가 답이다. |
| `stats_report_wait_abandoned` | new | abandon | `period: string`<br>`wait_ms: number — 기다린 시간`<br>`exit_kind: string — 'left_screen' \| 'period_changed'` | src/features/stats-report/components/StatsReportScreen.tsx:188 로딩 상태에서의 언마운트/기간 변경 cleanup (app/statistics.tsx:43 화면 언마운트 포함) | 정확히 '리포트 대기 중 이탈'. 이 이벤트가 없으면 대기 이탈은 '진입은 있는데 아무 일도 없음'으로만 남아 실패와 구분되지 않는다. |
| `home_statistics_viewed` | keep | screen | — | app/statistics.tsx:43 | 통계 화면 진입의 유일한 신호(화면 축은 'other'). 대시보드 연속성 때문에 이름을 바꾸지 않는다. |
| `screen_viewed` | keep | screen | `screen: AnalyticsScreenName — 'consult' \| 'notifications' \| 'other'` | src/features/analytics/useAnalyticsLifecycle.ts:53 (라우트 변경 자동) | 화면 축의 정본. 다만 /statistics 는 'other', 알림함/알림설정은 둘 다 'notifications' 로 뭉갠다 — 아래 이벤트들이 그 구멍을 메운다. |

### J6-3. 퍼널 (7)

**상담: 진입 → 첫 질문 → 답변 (전송 전 이탈)** — window 30분

1. `screen:consult`
2. `event:consult_compose_started`
3. `event:consult_question_submitted`
4. `event:consult_answer_completed`

읽는 법: 1→2 하락 = 화면까지 왔는데 쓸 말을 못 찾은 사람(추천 질문·주제 칩이 일을 안 한다). 2→3 하락 = 쓰다 지운 사람(길이 제한·자신 없음·개인정보 우려). 3→4 하락 = 보냈는데 답을 못 받은 사람(대화 생성 실패·스트리밍 실패·중단). 주입 진입(식사/검진/식당)은 compose_started 를 거치지 않아 이 퍼널에서 자연히 빠진다 — 의도한 것이다.

**상담: 추천 질문으로 시작해 자기 질문까지** — window 30분

1. `screen:consult`
2. `event:consult_suggestion_pressed`
3. `event:consult_answer_completed`
4. `event:consult_question_submitted`

읽는 법: 1→2 = 추천 질문이 실제로 첫 발을 떼게 하는 비율. 3→4 = 추천 답변을 받은 뒤 자기 질문으로 넘어간 비율. 4단계가 얇으면 FAQ 는 데모일 뿐 상담의 입구가 아니다. (suggestion_pressed 와 question_submitted 는 같은 초에 붙으므로 인접 배치하지 않았다.)

**상담: 질문 → 답변 완주 → 활용** — window 15분

1. `event:consult_question_submitted`
2. `event:consult_answer_completed`
3. `event:consult_answer_copied`

읽는 법: 1→2 하락이 곧 스트리밍 이탈·실패의 총합이다(원인은 consult_answer_failed.fail_kind 와 consult_answer_aborted.stop_kind 로 쪼개 본다). 2→3 은 답을 실제로 들고 나간 비율 — 완료보다 강한 유용성 지표다. 첫 토큰(consult_answer_streaming_started)은 전송과 같은 초에 올 수 있어 스텝으로 넣지 않고 카운트 비로 본다.

**상담: 사진 첨부 질문 (권한 거부)** — window 20분

1. `event:consult_attachment_permission_resulted`
2. `event:consult_attachment_added`
3. `event:consult_question_submitted`
4. `event:consult_answer_completed`

읽는 법: 1→2 하락 = 권한 거부 + 피커 취소(둘은 consult_attachment_permission_resulted.result 와 consult_attachment_picker_cancelled 로 분리). 2→3 하락 = 사진을 얹어놓고 말을 못 붙여 안 보낸 사람 — 상담에는 홈의 사진 확인 단계가 없다는 증거다. 메뉴 열기는 항목 탭과 같은 초가 될 수 있어 스텝에서 뺐다.

**통계: 리포트를 읽고 기간을 넘기는가** — window 30분

1. `event:stats_report_rendered`
2. `event:stats_report_bottom_reached`
3. `event:stats_period_changed`
4. `event:stats_report_rendered`

읽는 법: 1→2 = 프로즈 결론 아래 섹션까지 읽는 비율(얇으면 결론 카드 하나만 남기는 게 맞다). 2→3 = 다른 기간을 보러 가는 탐색률. 3→4 = 기간을 바꿨는데 리포트가 실제로 도착한 비율 — 여기가 낮으면 두 번째 대기에서 사람이 나간다. 대기 이탈 자체는 퍼널이 아니라 stats_report_requested 대비 stats_report_rendered 비와 stats_report_wait_abandoned 로 읽는다(요청→표시가 캐시 히트 때 같은 초라 인접 배치 불가).

**알림: 설정 화면 → 카테고리 켜기 → 시간 고르기** — window 10분

1. `event:notification_settings_viewed`
2. `event:notification_category_toggle_pressed`
3. `event:notification_time_picker_opened`
4. `event:notification_time_selected`

읽는 법: 1→2 = 알림을 켜러 왔는데 실제로 손댄 비율. 2→3→4 = 켜긴 켰지만 시각은 기본값으로 둔 사람의 규모(새벽 알림 → 다음 날 전부 OFF 로 이어진다). 권한 거부는 이 퍼널의 스텝이 아니라 notification_category_toggle_pressed 대비 notification_category_saved 격차 + notification_permission_resulted.result 로 본다(권한 결과가 토글과 같은 초에 오기 때문).

**푸시: 동의 → 실제 복귀 → 기록** — window 2880분

1. `event:notification_push_consent_succeeded`
2. `event:notification_push_opened`
3. `event:food_record_saved`

읽는 법: 1→2 = 푸시를 켠 사람이 실제로 알림을 눌러 돌아오는 비율(48시간). 이 값이 낮으면 문제는 동의율이 아니라 알림 문구·시각이다. 2→3 = 돌아와서 실제로 기록까지 간 비율 — 알림의 존재 이유가 여기서 증명된다.

### J6-4. 주의

[화면 축의 구멍]
1) app/statistics.tsx 는 세그먼트가 ["statistics"] 라 getAnalyticsScreenName(events.ts:221-252)에서 어느 분기에도 안 걸리고 'other' 로 떨어진다. 통계는 화면 축으로 자를 수 없고 home_statistics_viewed / stats_report_* 이벤트로만 보인다. AnalyticsScreenName 에 'statistics' 추가를 권한다(퍼널 스텝을 screen:statistics 로 바꿀 수 있다).
2) (settings)/notifications(알림함)와 (settings)/notification-settings(알림설정)는 events.ts:246 의 route.includes("notification") 때문에 **둘 다 'notifications'** 다. 두 화면이 한 값으로 합쳐지므로 notification_settings_viewed / notification_history_viewed 를 따로 둘 수밖에 없다.
3) 알림함((settings)/notifications)으로 가는 인앱 진입점이 코드에 없다 — 발견된 참조는 src/shared/navigation/routeGraph.ts:166(뒤로가기 부모 매핑)뿐이고, 알림설정 화면으로 가는 링크는 SettingsScreen.tsx:237 과 NotificationHistoryScreen.tsx:38 에만 있다. notification_history_* 볼륨이 0에 가깝게 나와도 계측 버그가 아니라 진입점 부재일 수 있다.

[퍼널 엔진 제약 때문에 인접 배치를 피한 쌍] (초 정밀도·엄격 부등호)
- consult_question_submitted → consult_answer_streaming_started (첫 토큰이 1초 안에 올 수 있다)
- consult_suggestion_pressed → consult_question_submitted (FAQ 는 탭 → 다음 렌더에 자동 전송이라 같은 틱이다: app/consult.tsx:378 → :384-389)
- home_statistics_viewed → stats_report_requested (둘 다 마운트 시점)
- stats_report_requested → stats_report_rendered (React Query staleTime 5분 캐시 히트면 즉시)
- notification_category_toggle_pressed → notification_permission_resulted (이미 granted 면 notificationService.ts:81 에서 즉시 반환)
- notification_push_opened → screen:home (routeFromPushData 가 같은 틱에 push 한다)
이 쌍들은 퍼널 대신 이벤트 카운트 비율로 대시보드에 올린다.

[계측을 넣으려면 코드가 먼저 바뀌어야 하는 곳]
- src/hooks/useNotifications.ts:50-54 updateSettings 에 try/catch 가 없다 → notification_category_save_failed 를 쏘려면 감싸야 한다(지금은 저장 실패가 화면에도 로그에도 안 남는다).
- src/features/stats-report/components/StatsReportScreen.tsx:183 ScrollView 에 onScroll 이 없다 → stats_report_bottom_reached 는 계측 추가가 전제다.
- src/features/consultation/components/FaqCarousel.tsx:75 onPress 가 entry 만 넘긴다 → consult_suggestion_pressed.position 을 실으려면 index 를 함께 넘겨야 한다.
- consult_answer_aborted.stop_kind 는 useChat 안에서 알 수 없다 — resetChat(useChat.ts:376)·loadConversation(:349)·언마운트(:99) 호출부가 이유를 넘겨야 한다.
- consult_question_submitted.entry 는 sendMessage 인자로 받는 게 가장 싸다(호출부 5곳: app/consult.tsx:388, :422, :468, :520, :527).

[속성 이름 — 새니타이저를 피해 고른 대안]
had_answer→got_reply, error_code→fail_kind, content_length→length_bucket, meal_slot→kind/slot, conclusion title→badge(등급값만), message_count→item_count, image_attached→has_attachment, date/period 원문→period 열거값. 특히 'answer'·'content'·'error'·'meal'·'image'·'title'·'date'·'value' 는 키에 절대 넣지 않았다(events.ts:204-205).

[개인정보]
질문 원문·FAQ 문구·답변 본문·리포트 conclusion.headline/support·알림 body·NotificationItem.foodName 은 어느 이벤트에도 싣지 않았다. 신장 환자의 질문 문장은 그 자체로 병기·식이 제한을 드러낸다. 대신 길이 버킷(s/m/l), 등급(OK/DANGER/LOW_DATA), 개수, 불리언만 싣는다.

[카디널리티·볼륨]
새 id 축은 하나도 늘리지 않았다 — conversation_id 는 싣지 않고 is_first_turn + turn_index(0~9 캡)로 접었다. 다만 상담 한 턴마다 submitted/streaming_started/completed 3개가 나가므로 상담 이벤트 볼륨은 대략 (일 상담 턴 수 × 3 + 진입/이탈 2)다. 스트리밍 진행률을 chunk 단위로 쪼개는 이벤트는 일부러 만들지 않았다(턴당 수십 건이 된다).

[알아둘 동작 하나]
consult_answer_aborted 가 실제로 잡는 ABORTED 는 useChat.ts:173 에서 **화면에 아무 흔적도 남기지 않고** 삼켜진다. 지금 대시보드에서 "전송은 있는데 완료가 없는" 구간의 상당 부분이 실패가 아니라 이 중단일 가능성이 높다 — 이 이벤트가 붙기 전에는 실패율을 과대평가하게 된다.

---

## J7. 건강검진 · 의사공유 · 설정/탈퇴

> 건강검진 연동(NHIS/OCR) · 의사 공유 · 신장 프로필 · 설정/탈퇴 — 마이페이지(전체 탭) 아래 네 갈래 여정. 지금은 `(settings)` 하위 라우트가 getAnalyticsScreenName 에서 전부 'profile'(체크업·의사·신장·탈퇴) 또는 'health'(레거시 NHIS/OCR) 로 뭉개지고, 이 네 갈래 전체에 trackAnalyticsEvent 호출이 단 하나도 없다(analytics 를 부르는 20개 파일 중 health/settings/doctor-link/health-checkup 은 0개). 즉 "마이페이지에 들어왔다" 다음의 모든 이탈이 관측 불가다. 참고로 NHIS 인증은 두 계보가 공존한다 — 신형 CheckupAuthScreen(단일 화면, phase form→pending)과 구형 NhisAuth→NhisRequest→NhisConfirm(3화면). 마이페이지는 checkup-list 로만 보내므로 구형은 사실상 딥링크/routeGraph 로만 도달한다.

### J7-0. 검증에서 확정된 정정 (3건)

| 대상 | 종류 | 무엇이 틀렸나 | 어떻게 고치나 |
|---|---|---|---|
| `funnel: 건강검진 불러오기(NHIS 간편인증) 전 구간` | funnel_constraint | 4번 스텝(checkup_auth_submitted) → 5번(checkup_auth_pending_viewed) 하락을 reads 가 '공단 요청 실패(submit_failed/rejected)' 로만 설명하는데, 코드에는 세 번째 갈래가 있다. CheckupAuthScreen.tsx:173-174 `if (result.status === "SUCCESS") { await finish(); return }` — 즉시 성공하면 phase 가 'pending' 으로 안 가고 곧장 finish() 다(:177 의 PENDING 분기는 건너뛴다). 이 사람들은 5·6번 스텝을 통과할 수 없어 7번 checkup_auth_succeeded 에서도 빠진다. 결과적으로 이 퍼널의 최종 전환율은 **성공한 사람 중 즉시 성공분만큼 구조적으로 과소 집계**되고, 4→5 하락은 실패로 오독된다. 스펙 자신이 checkup_auth_succeeded.via:'submit'\|'confirm' 로 두 경로가 있음을 알고 있는데도 퍼널이 그 사실을 반영하지 않았다. | 퍼널을 submitted 까지 5스텝으로 끊고(screen:profile → list_viewed → auth_viewed → auth_submitted → auth_succeeded), 대기-확인 구간은 pending_viewed 를 앵커로 한 별도 퍼널(pending_viewed → confirm_pressed → succeeded)로 뗀다. reads 에 즉시 성공(via='submit') 비율을 함께 읽으라고 명시한다. |
| `exam_ocr_permission_result / checkup_auth_confirm_pending.outcome` | naming | 같은 개념의 이름이 여정마다 어긋난다. 권한 결과는 J2 가 consult_attachment_permission_resulted · notification_permission_resulted(과거분사)인데 J3 는 exam_ocr_permission_result(명사)다. 실패 원인 속성도 스펙 전반이 fail_kind 로 통일돼 있는데 checkup_auth_confirm_pending 만 outcome:'timeout'\|'failed' 를 쓴다. 접두사도 이 여정 안에서 checkup_* 과 exam_ocr_* 두 계보가 섞여 있는데(둘 다 검진/검사 데이터 유입), 어느 쪽이 상위인지 규칙이 없다. 사후에 이름을 고치면 대시보드 연속성이 끊긴다(events.ts:83 home_statistics_viewed 를 못 고치고 있는 것과 같은 이유). | 권한 이벤트는 *_permission_resulted 로, 실패 원인 키는 fail_kind 로 전면 통일한다(checkup_auth_confirm_pending → fail_kind:'timeout'\|'failed'). 검진 계보는 자동연동=checkup_*, 검사지 업로드=exam_ocr_* 로 쓴다는 한 줄 규칙을 notes 에 남긴다. |
| `checkup_question_asked (CheckupDetailScreen.tsx:243/:252)` | duplicate | 같은 사용자 행동 하나(검진 상세에서 '질문하기')가 세 이벤트를 만든다: J3 의 checkup_question_asked, 그리고 J2 의 consult_opened{entry:'checkup'} + consult_question_submitted{entry:'checkup'}. J2 는 주입 진입이 '진입=전송' 이라는 것을 이미 알고 entry 축으로 갈라 두었으므로, checkup_question_asked 의 고유 정보는 사실상 mode/metric_count/has_warning 세 속성뿐이다. 두 여정이 서로를 모른 채 설계돼 볼륨과 해석이 겹친다(위험 수치가 있는데 안 묻는 비율을 J3 는 checkup_question_asked 로, J2 는 consult_question_submitted 로 각각 세게 된다). | 둘 중 하나로 정한다. 검진 쪽 맥락(metric_count·has_warning)이 필요하면 checkup_question_asked 를 남기고 consult_opened 의 entry:'checkup' 은 유지하되 consult_question_submitted 의 entry 만으로 중복을 흡수한다고 양쪽 notes 에 교차 기록한다. |

### J7-1. 단계 (63)

| # | 단계 | 표면/라우트 | 코드 | 여기서 왜 빠져나가나 | 현재 계측 |
|---|---|---|---|---|---|
| 1 | 전체 탭(마이페이지) 진입 | `/(tabs)/all` | `sinsin-rn/src/features/settings/views/MyPageScreen.tsx:83` | 건강 메뉴 3줄이 스크롤 아래에 있어 프로필 카드만 보고 나간다 | screen_viewed { screen: 'profile' } |
| 2 | '검진 데이터' 메뉴 탭 | `/(settings)/checkup-list` | `sinsin-rn/src/features/settings/views/MyPageScreen.tsx:274` | 라벨이 무슨 기능인지 안 알려줘서 아예 안 눌린다 | 없음(라우트가 또 'profile' 로 접혀 screen_viewed 가 중복 제거된다) |
| 3 | 검진 목록 로딩/스켈레톤 | `/(settings)/checkup-list` | `sinsin-rn/src/features/health-checkup/views/CheckupListScreen.tsx:101` | 결과 목록 API 가 느리거나 401 이면 빈 화면에서 뒤로 나간다 | 없음 |
| 4 | 검진 목록 빈 상태(불러온 검진 0건) | `/(settings)/checkup-list` | `sinsin-rn/src/features/health-checkup/views/CheckupListScreen.tsx:176` | 빈 상태 CTA(불러오기)를 안 누르고 이탈 — 이 여정의 최대 깔때기 목 | 없음 |
| 5 | 검진 목록 로드 실패 | `/(settings)/checkup-list` | `sinsin-rn/src/features/health-checkup/views/CheckupListScreen.tsx:128` | 재시도 불가 실패(404·권한)는 버튼도 없어 100% 이탈 | 없음 |
| 6 | 본인인증 화면 진입(신형) | `/(settings)/checkup-auth` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:101` | 이름·전화·생년월일을 요구하는 순간 부담을 느끼고 뒤로 | 없음 |
| 7 | 간편인증 수단 목록 도착(카카오/PASS) | `/(settings)/checkup-auth` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:113` | 목록이 비거나 에러면 CTA 가 잠긴다(methods.length===0 → disabled) — 진행 자체가 불가 | 없음 |
| 8 | 인증수단 조회 실패 + 재시도 | `/(settings)/checkup-auth` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:230` | 재시도를 눌러도 같은 실패면 그대로 종료 | 없음 |
| 9 | 인증수단 선택(+ PASS면 통신사 선택) | `/(settings)/checkup-auth` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:363` | PASS 를 고르면 통신사 줄이 하나 더 생겨 여기서 멈춘다 | 없음 |
| 10 | 제출 시 클라이언트 검증 실패 | `/(settings)/checkup-auth` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:159` | 생년월일 실존 검증(19901399 류)에 걸려 이유를 못 찾고 포기 | 없음 |
| 11 | 인증 요청 전송(HYPHEN/CODEF 유료 트랜잭션) | `/(settings)/checkup-auth` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:165` | 수 초 대기 중 앱을 나간다 | 없음 |
| 12 | 요청 거절(status!=SUCCESS/PENDING) | `/(settings)/checkup-auth` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:183` | '인증이 거절되었어요' 한 줄만 남고 다음 행동이 없다 | 없음 |
| 13 | 요청 실패(공단 점검 HC_ERROR_005·인증만료 002 등) | `/(settings)/checkup-auth` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:184` | 사용자가 고칠 수 없는 실패라 재시도해도 같다 | 없음 |
| 14 | PENDING 단계 — 인증 앱으로 나갔다 돌아오기 | `/(settings)/checkup-auth (phase='pending')` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:177` | 카카오/PASS 로 이탈한 뒤 앱에 안 돌아온다 — 화면 축으로는 아예 안 보이는 단계 | 없음 |
| 15 | '인증 완료' 확인 누름(몇 번이든 재시도 가능) | `/(settings)/checkup-auth (phase='pending')` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:204` | 인증 앱에서 아직 안 눌렀는데 눌러 TIMEOUT/FAILED 를 받고 그만둔다 | 없음 |
| 16 | 확인 실패(TIMEOUT/FAILED) 후 재확인 | `/(settings)/checkup-auth (phase='pending')` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:216` | 몇 번째 시도에서 포기하는지가 이 기능 성공률의 핵심인데 지금은 시도 횟수 자체를 모른다 | 없음 |
| 17 | 불러오기 성공 → 목록으로 replace | `/(settings)/checkup-list` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:151` | - | 없음 |
| 18 | 인증 도중 뒤로가기(폼/대기 어느 쪽에서 나갔는지) | `/(settings)/checkup-auth` | `sinsin-rn/src/features/health-checkup/views/CheckupAuthScreen.tsx:237` | 이 여정의 실제 포기 지점. 진입만 있고 성공이 없는 차이로는 '어느 단계에서' 를 못 가른다 | 없음 |
| 19 | 회차 선택(체크박스) | `/(settings)/checkup-list` | `sinsin-rn/src/features/health-checkup/views/CheckupListScreen.tsx:105` | 하나도 안 고르면 '분석하기' 가 잠긴 채로 힌트만 보인다 | 없음 |
| 20 | 분석 요청(분석하기 / 줄 상세 열기) | `/(settings)/checkup-detail` | `sinsin-rn/src/features/health-checkup/views/CheckupListScreen.tsx:280` | 선택은 했지만 CTA 를 안 누른다 | 없음 |
| 21 | 분석 중(LLM, 수 초 스켈레톤) | `/(settings)/checkup-detail` | `sinsin-rn/src/features/health-checkup/views/CheckupDetailScreen.tsx:111` | LLM 지연으로 기다리다 나간다 — 비용은 이미 나갔는데 결과는 안 봤다 | 없음 |
| 22 | 분석 결과 열람(요약·타일·지표) | `/(settings)/checkup-detail` | `sinsin-rn/src/features/health-checkup/views/CheckupDetailScreen.tsx:263` | - | 없음 |
| 23 | 분석 실패 | `/(settings)/checkup-detail` | `sinsin-rn/src/features/health-checkup/views/CheckupDetailScreen.tsx:266` | 재시도가 또 LLM 비용이다 — 실패율을 모르면 예산 관리가 안 된다 | 없음 |
| 24 | 회차 전환 / 탭(검진↔검사기록) / 월별 캘린더 | `/(settings)/checkup-detail, /(settings)/checkup-calendar` | `sinsin-rn/src/features/health-checkup/views/CheckupDetailScreen.tsx:533` | 회차 드롭다운이 회차 1건이면 아예 안 나온다 — 다회차 사용자만 쓰는 기능인지 확인 불가 | 없음 |
| 25 | '질문하기' → 상담으로 컨텍스트 주입 | `/consult` | `sinsin-rn/src/features/health-checkup/views/CheckupDetailScreen.tsx:243` | 이 여정의 진짜 목적지. 분석까지 오고도 안 물어보면 검진 연동의 가치가 안 닫힌다 | 없음 |
| 26 | 검사지 업로드 화면 진입(OCR) | `/(settings)/health-data-upload` | `sinsin-rn/src/features/health/views/HealthDataUploadScreen.tsx:38` | 레거시 허브(health-data)에서만 열려서 진입 자체가 희박할 수 있다 | 없음(screen_viewed { screen:'health' } 로만 뭉개짐) |
| 27 | 카메라/앨범 권한 요청 결과 | `/(settings)/health-data-upload` | `sinsin-rn/src/features/health/views/HealthDataUploadScreen.tsx:49` | 거부하면 설정 이동 다이얼로그가 뜨고 대부분 여기서 끝난다 | 없음(food_photo_permission_denied 는 식사 기록 전용) |
| 28 | 파일 첨부(사진/앨범/PDF, 최대 5) | `/(settings)/health-data-upload` | `sinsin-rn/src/features/health/views/HealthDataUploadScreen.tsx:64` | 첨부 0개면 CTA 가 잠긴 채로 남는다 | 없음 |
| 29 | 첨부 삭제/전체 지우기 | `/(settings)/health-data-upload` | `sinsin-rn/src/features/health/views/HealthDataUploadScreen.tsx:130` | 잘못 고른 사진을 지우다 흐름을 놓는다 | 없음 |
| 30 | '결과 읽기' — OCR 분석 오버레이 | `/(settings)/health-data-upload` | `sinsin-rn/src/features/health/views/HealthDataUploadScreen.tsx:139` | 5장 붙여도 서버는 첫 파일 1건만 분석한다(주석 명시) — 기대와 결과가 어긋나는 자리 | 없음 |
| 31 | OCR 분석 실패(토스트) | `/(settings)/health-data-upload` | `sinsin-rn/src/features/health/views/HealthDataUploadScreen.tsx:150` | 사진 품질 문제라 재촬영을 해야 하는데 그 재시도율이 안 보인다 | 없음 |
| 32 | OCR 검토 화면 로딩 | `/(settings)/health-ocr-review` | `sinsin-rn/src/features/health/views/OcrReviewScreen.tsx:80` | reportId 유실/조회 실패 시 재시도 버튼 하나만 남는다 | 없음 |
| 33 | 추출 항목 검토(체크 해제·값 수정·삭제·직접 추가) | `/(settings)/health-ocr-review` | `sinsin-rn/src/features/health/views/OcrReviewScreen.tsx:111` | '검토 필요'(unmapped) 항목이 많을수록 손볼 게 많아 중도 포기 — 항목 수와 미매핑 수가 이탈의 설명변수 | 없음 |
| 34 | 저장 차단(검사일 형식 오류 / 유효 항목 0) | `/(settings)/health-ocr-review` | `sinsin-rn/src/features/health/views/OcrReviewScreen.tsx:142` | 검사일이 OCR 로 안 잡히면 직접 YYYY-MM-DD 를 쳐야 한다 — 가장 흔한 저장 실패 | 없음 |
| 35 | OCR 확정 저장 성공(화면 전부 닫힘) | `dismissAll → 이전 스택` | `sinsin-rn/src/features/health/views/OcrReviewScreen.tsx:171` | - | 없음 |
| 36 | 연결된 기관 목록(의사 기능의 홈) | `/(settings)/doctor-connections` | `sinsin-rn/src/features/doctor-link/views/ConnectedListScreen.tsx:129` | 빈 상태에서 '추가하기' 를 안 누른다 | 없음 |
| 37 | 의사 연결 온보딩 1·2·3 (매번 강제로 거침) | `/(settings)/doctor-intro` | `sinsin-rn/src/features/doctor-link/views/DoctorIntroScreen.tsx:44` | 재사용자에게도 매번 나오는 화면이라 여기 이탈률이 높으면 건너뛰기 근거가 된다 | 없음 |
| 38 | 의사 검색 폼(이름/병원/진료과) | `/(settings)/doctor-search` | `sinsin-rn/src/features/doctor-link/views/DoctorSearchScreen.tsx:52` | 셋 다 비면 CTA 가 잠긴다 — 무엇을 넣어야 하는지 몰라 멈춘다 | 없음 |
| 39 | 검색 실행 → 결과/빈 결과/실패 | `/(settings)/doctor-search` | `sinsin-rn/src/features/doctor-link/views/DoctorSearchScreen.tsx:83` | '검색 결과 없음' 이 반복되면 그대로 종료. 검색어는 절대 안 싣고 조건 개수·결과 수만 본다 | 없음 |
| 40 | 의사 카드 선택 | `/(settings)/doctor-preview` | `sinsin-rn/src/features/doctor-link/views/DoctorSearchScreen.tsx:200` | 결과는 봤는데 누가 내 담당인지 못 골라 이탈 | 없음 |
| 41 | 연결 확인 화면(고지 2줄) 열람 | `/(settings)/doctor-preview` | `sinsin-rn/src/features/doctor-link/views/DoctorPreviewScreen.tsx:29` | '내 건강데이터가 열린다' 를 읽고 되돌아간다 — 동의 문턱 | 없음 |
| 42 | 연결 요청 전송(PENDING 생성) | `/(settings)/doctor-preview` | `sinsin-rn/src/features/doctor-link/views/DoctorPreviewScreen.tsx:55` | - | 없음 |
| 43 | 연결 요청 실패(중복 요청·해지된 연결 등) | `/(settings)/doctor-preview` | `sinsin-rn/src/features/doctor-link/views/DoctorPreviewScreen.tsx:103` | 다시 눌러도 소용없는 실패라 재시도가 헛돈다 | 없음 |
| 44 | 승인 대기(며칠 단위) — 목록에서 '승인 대기' 배지 확인 | `/(settings)/doctor-connections` | `sinsin-rn/src/features/doctor-link/views/ConnectedListScreen.tsx:143` | 승인이 안 나면 사용자는 아무것도 못 한다. 요청→승인 사이의 실질 대기시간이 이 기능의 사망 구간 | 없음 |
| 45 | 공유 설정 화면 진입(잠김/편집가능) | `/(settings)/doctor-sharing` | `sinsin-rn/src/features/doctor-link/views/DataSharingScreen.tsx:150` | APPROVED 가 아니면 토글이 전부 잠긴 채라 그냥 나간다 | 없음 |
| 46 | 공유 범위 토글(검사결과/식단/바이탈/실시간) | `/(settings)/doctor-sharing` | `sinsin-rn/src/features/doctor-link/views/DataSharingScreen.tsx:154` | 만지긴 했는데 '공유하기' 를 안 눌러 아무것도 저장되지 않는다 — 가장 조용한 이탈 | 없음 |
| 47 | 공유 저장 성공/실패 | `/(settings)/doctor-sharing` | `sinsin-rn/src/features/doctor-link/views/DataSharingScreen.tsx:127` | 승인 전 저장은 서버가 DOCTOR_ERROR_004 로 막는다 | 없음 |
| 48 | 연결 해지(줄 롱프레스 → 확인 모달) | `/(settings)/doctor-connections` | `sinsin-rn/src/features/doctor-link/views/ConnectedListScreen.tsx:77` | 롱프레스라 발견성이 낮다 — 시도 자체가 있는지부터 봐야 개선 근거가 생긴다 | 없음 |
| 49 | 신장 프로필 수정 진입(프로필 카드/신장카드 편집) | `/(settings)/kidney-profile-edit` | `sinsin-rn/src/features/settings/views/MyPageScreen.tsx:406` | 화면이 길고 섹션이 6개라 스크롤 중간에서 나간다 | 없음 |
| 50 | 필드 편집(키/체중/병기/투석/진단시기/원인/동반질환) | `/(settings)/kidney-profile-edit` | `sinsin-rn/src/features/settings/utils/kidneyProfileValidation.ts` | 병기 미도착(undefined) 상태에서 저장하면 축이 안 나가는 설계 — 실제로 몇 명이 그 상태로 저장하는지 모른다 | 없음 |
| 51 | 저장 누름 → 클라이언트 검증 실패 | `/(settings)/kidney-profile-edit` | `sinsin-rn/src/features/settings/views/KidneyProfileEditScreen.tsx:193` | 키/체중 범위·기타원인 필수에 걸려 저장이 안 된 채 나간다 | 없음 |
| 52 | 저장 성공(PATCH kidney + 체중 upsert) / 실패 | `/(settings)/kidney-profile-edit` | `sinsin-rn/src/features/settings/views/KidneyProfileEditScreen.tsx:221` | PATCH 는 성공하고 체중 저장이 실패해도 화면은 한 덩어리로 실패로 보인다 | 없음 |
| 53 | 설정 화면 진입 | `/(settings)` | `sinsin-rn/src/features/settings/views/SettingsScreen.tsx:25` | - | screen_viewed { screen:'profile' } (마이페이지와 구분 안 됨) |
| 54 | '회원 탈퇴' 누름 | `/(settings)/withdrawal` | `sinsin-rn/src/features/settings/views/SettingsScreen.tsx:309` | 여기부터가 이탈 여정의 정본. 탈퇴 진입 자체가 지표다 | 없음 |
| 55 | 탈퇴 사유 선택(5지선다) | `/(settings)/withdrawal` | `sinsin-rn/src/features/settings/views/WithdrawalScreen.tsx:107` | 아무것도 안 고르면 '다음' 이 잠긴다 — 사유 분포는 제품 개선의 직접 신호 | 없음 |
| 56 | '기타' 상세 입력(최소 20자) | `/(settings)/withdrawal` | `sinsin-rn/src/features/settings/views/WithdrawalScreen.tsx:128` | 20자 최소 길이에 걸려 CTA 가 안 열린다(원문은 절대 이벤트에 싣지 않음) | 없음 |
| 57 | '내 글도 삭제' 토글 | `/(settings)/withdrawal` | `sinsin-rn/src/features/settings/views/WithdrawalScreen.tsx:159` | 커뮤니티 데이터 손실 인지 여부 | 없음 |
| 58 | '다음' → 약관 화면 | `/(settings)/withdrawal-terms` | `sinsin-rn/src/features/settings/views/WithdrawalScreen.tsx:52` | - | 없음 |
| 59 | 탈퇴 약관 열람 · 동의 체크 | `/(settings)/withdrawal-terms` | `sinsin-rn/src/features/settings/views/WithdrawalTermsScreen.tsx:110` | 약관 3줄을 읽고 되돌아간다 = 제품이 붙잡은 것 | 없음 |
| 60 | 최종 확인 다이얼로그(파괴적) | `/(settings)/withdrawal-terms` | `sinsin-rn/src/features/settings/views/WithdrawalTermsScreen.tsx:41` | 여기서 취소하는 비율이 '만류 성공률' 이다 — 지금은 전혀 안 보인다 | 없음 |
| 61 | 탈퇴 API 성공(세션 정리) / 실패 | `/(settings)/withdrawal-complete` | `sinsin-rn/src/features/settings/views/WithdrawalTermsScreen.tsx:51` | WITHDRAW_ERROR_001(이미 접수) 같은 실패는 재시도 핸들러를 일부러 안 준다 | 없음 |
| 62 | 탈퇴 완료 화면 → 로그인으로 | `/(settings)/withdrawal-complete` | `sinsin-rn/src/features/settings/views/WithdrawalCompleteScreen.tsx:13` | - | 없음 |
| 63 | 유예기간 내 탈퇴 철회 | `/(auth)/login 이후` | `sinsin-rn/src/hooks/useAuth.ts:248` | - | auth_withdrawal_cancelled (유일하게 이미 있는 이벤트) |

### J7-2. 이벤트 (85 = 신규 83 · 변경 1 · 유지 1)

| 이벤트 | 상태 | 종류 | 속성 | 발화 지점 | 없으면 못 보는 이탈 |
|---|---|---|---|---|---|
| `auth_withdrawal_agreed` | new | progress | `on: boolean — 체크 해제도 기록` | WithdrawalTermsScreen.tsx:110 | 약관 3줄을 읽고 동의를 안 하는 비율 = 제품이 붙잡은 지점 |
| `auth_withdrawal_completion_viewed` | new | screen | — | WithdrawalCompleteScreen.tsx:13 mount | 완료 화면 도달(성공 이벤트와의 차이 = replace 실패/즉시 종료) |
| `auth_withdrawal_confirm_dismissed` | new | abandon | — | WithdrawalTermsScreen.tsx:47 (confirmed===false) | 만류 성공률. 지금은 완전히 안 보이는 숫자이면서 가장 값싼 리텐션 레버다 |
| `auth_withdrawal_confirm_viewed` | new | progress | `delete_posts: boolean` | WithdrawalTermsScreen.tsx:41 (showConfirm 호출 직전) | 최종 다이얼로그 노출 |
| `auth_withdrawal_failed` | new | failure | `fail_kind: 'already_requested' \| 'network' \| 'server' \| 'unknown'` | WithdrawalTermsScreen.tsx:58 catch | 재시도 핸들러를 일부러 안 주는 자리라, 실패한 사람이 어디로 가는지 이벤트 말고는 알 길이 없다 |
| `auth_withdrawal_next_pressed` | new | progress | `reason_index: number`<br>`is_other: boolean`<br>`has_detail: boolean — 기타 상세를 20자 이상 썼나(내용은 안 실음)`<br>`delete_posts: boolean` | WithdrawalScreen.tsx:52 handleSubmit | '기타' 20자 최소 제한 때문에 다음으로 못 넘어가는 사람을 selected 대비 차이로 잡는다 |
| `auth_withdrawal_posts_toggled` | new | progress | `on: boolean` | WithdrawalScreen.tsx:159 | 커뮤니티 글 삭제까지 원하는 비율 = 이탈 강도의 대리 지표 |
| `auth_withdrawal_reason_selected` | new | progress | `reason_index: number — WITHDRAWAL_REASONS 인덱스(0~4, 고정 enum)`<br>`is_other: boolean` | WithdrawalScreen.tsx:107 (라디오) / :128 (기타 입력 포커스로 자동 선택) | 왜 떠나는지의 분포. 자유입력 원문은 절대 싣지 않고 인덱스만 남긴다 |
| `auth_withdrawal_reason_viewed` | new | screen | — | WithdrawalScreen.tsx:36 mount | 사유 화면 도달 |
| `auth_withdrawal_started` | new | intent | `from: 'settings'` | SettingsScreen.tsx:309 | 탈퇴 여정의 분모. 지금은 철회(auth_withdrawal_cancelled)만 있고 시작이 없어 비율 계산이 불가능하다 |
| `auth_withdrawal_succeeded` | new | success | `reason_index: number`<br>`is_other: boolean`<br>`delete_posts: boolean` | WithdrawalTermsScreen.tsx:51 (deleteAccount resolve 직후, clearClientSession 전) | 실제 탈퇴 확정. 세션이 지워지기 전에 쏴야 사용자 귀속이 남는다 |
| `auth_withdrawal_terms_viewed` | new | screen | `is_other: boolean` | WithdrawalTermsScreen.tsx:26 mount | 약관 화면 도달 |
| `checkup_add_pressed` | new | intent | `from: 'empty' \| 'cta' — 빈 상태 버튼인지 하단 '불러오기'인지`<br>`item_count: number` | CheckupListScreen.tsx:182(onAction) / :278(onSecondary) | 목록까지 왔는데 인증을 시작조차 안 하는 비율 |
| `checkup_analysis_failed` | new | failure | `retryable: boolean` | CheckupDetailScreen.tsx:266 | 실패한 LLM 호출도 비용이다 |
| `checkup_analysis_requested` | new | intent | `selected_count: number`<br>`entry: 'analyze_cta' \| 'row'` | CheckupListScreen.tsx:280(onAnalyze) / :249(onOpenDetail) | LLM 분석 호출의 분모. 다중 선택 분석이 실제로 쓰이는지도 같이 본다 |
| `checkup_analysis_viewed` | new | success | `round_count: number — timeline 에서 뽑은 회차 수`<br>`metric_count: number`<br>`warning_count: number`<br>`caution_count: number`<br>`normal_count: number` | CheckupDetailScreen.tsx:111 쿼리 성공 시(수치는 counts/visibleMetrics 에서, 값 원문 없음) | 분석 요청 대비 실제 열람. 위험 항목 수와 이후 '질문하기' 전환의 상관을 본다 |
| `checkup_auth_confirm_failed` | new | failure | `attempt_index: number`<br>`fail_kind: 'network' \| 'server' \| 'unknown'` | CheckupAuthScreen.tsx:221 catch | 확인 왕복 자체가 실패하는 비율 |
| `checkup_auth_confirm_pending` | new | failure | `outcome: 'timeout' \| 'failed'`<br>`attempt_index: number` | CheckupAuthScreen.tsx:216 | '아직 인증 앱에서 안 눌렀다' 와 진짜 실패를 나눠 본다 |
| `checkup_auth_confirm_pressed` | new | intent | `method: 'kakao' \| 'pass'`<br>`attempt_index: number — 이 세션의 몇 번째 확인 시도인가(1부터)` | CheckupAuthScreen.tsx:204 | confirm 은 몇 번이든 누를 수 있게 설계됐다. 몇 번째에 성공/포기하는지가 이 화면의 핵심 지표 |
| `checkup_auth_dismissed` | new | abandon | `phase: 'form' \| 'pending'` | CheckupAuthScreen.tsx:237 (V2ScreenHeader onBack) | '진입은 있고 성공이 없다' 를 폼 포기와 인증앱 미복귀로 가른다 — 처방이 완전히 다르다 |
| `checkup_auth_method_selected` | new | progress | `method: 'kakao' \| 'pass'`<br>`requires_telecom: boolean` | CheckupAuthScreen.tsx:363 | PASS 는 통신사 한 줄이 더 붙는다 — 수단별 완주율이 갈리는지 확인 |
| `checkup_auth_methods_load_failed` | new | failure | `empty_list: boolean — 에러가 아니라 빈 배열로 온 경우` | CheckupAuthScreen.tsx:230 (methodsFailed 진입 1회) | 구형 화면이 삼키던 실패. 여기서 막힌 사람은 100% 이탈이다 |
| `checkup_auth_methods_loaded` | new | progress | `option_count: number — 보통 2(카카오·PASS)` | CheckupAuthScreen.tsx:113 | 0이면 CTA 가 영구 잠김이다. 잠긴 화면을 본 사람 수를 세야 한다 |
| `checkup_auth_methods_retry_pressed` | new | intent | — | CheckupAuthScreen.tsx:351 | 재시도가 실제로 통하는지(다음 loaded 로 이어지는지) 본다 |
| `checkup_auth_pending_viewed` | new | progress | `method: 'kakao' \| 'pass'` | CheckupAuthScreen.tsx:177 (setPhase('pending')) | 인증 앱으로 나가는 순간. 같은 라우트라 화면 축으로는 절대 안 보이는 단계다 |
| `checkup_auth_rejected` | new | failure | `method: 'kakao' \| 'pass'` | CheckupAuthScreen.tsx:183 | SUCCESS/PENDING 이 아닌 제3상태. 지금은 문구 한 줄로 사라진다 |
| `checkup_auth_submit_failed` | new | failure | `method: 'kakao' \| 'pass'`<br>`fail_kind: 'network' \| 'server' \| 'unknown' — HTTP 계층 분류(원문 메시지 금지)` | CheckupAuthScreen.tsx:184 catch | 공단 점검(HC_ERROR_005) 시간대에 실패가 몰리는지 = 사용자가 아니라 외부 원인임을 증명 |
| `checkup_auth_submitted` | new | intent | `method: 'kakao' \| 'pass'`<br>`requires_telecom: boolean` | CheckupAuthScreen.tsx:165 (nhisService.healthCheckRequest 직전) | 유료 트랜잭션이 실제로 나간 횟수 = 비용의 분모 |
| `checkup_auth_succeeded` | new | success | `via: 'submit' \| 'confirm' — 즉시 SUCCESS 인지 PENDING→확인인지`<br>`attempt_index: number — confirm 경로면 성공한 시도 번호, submit 이면 0` | CheckupAuthScreen.tsx:151 finish() | 이 여정의 성공 정의. 즉시 성공/대기 후 성공의 비율이 UX 설계를 바꾼다 |
| `checkup_auth_telecom_selected` | new | progress | `carrier: string — 통신사 코드(고정 enum, 자유입력 아님)` | CheckupAuthScreen.tsx:404 | PASS 경로에서 통신사 선택이 추가 이탈을 만드는지 |
| `checkup_auth_validation_failed` | new | failure | `fail_count: number — 동시에 걸린 칸 수`<br>`first_fail: 'person' \| 'mobile' \| 'born' \| 'method' \| 'telecom' — 위에서부터 첫 오류 칸(값만, 원문 없음)` | CheckupAuthScreen.tsx:159 (setSubmitted 후 hasError 반환 지점) | 생년월일 실존 검증 등 어느 칸이 사람을 막는지. 배열은 새니타이저가 떨구므로 개수+첫 칸으로 접는다 |
| `checkup_auth_viewed` | new | screen | `entry: 'list' \| 'legacy' — 신형 checkup-auth 인지 구형 health-nhis-* 인지` | CheckupAuthScreen.tsx:101 mount(1회) | 인증 폼 진입 = 개인정보 입력 문턱의 시작점 |
| `checkup_calendar_opened` | new | intent | — | CheckupDetailScreen.tsx:506 | 월별보기 진입 — 안 쓰이면 유지비만 드는 화면 |
| `checkup_list_load_failed` | new | failure | `retryable: boolean — resolveError 판정` | CheckupListScreen.tsx:128 | 빈 상태와 실패가 화면상 비슷하게 읽히는데 대응이 정반대다 |
| `checkup_list_viewed` | new | screen | `item_count: number — 불러온 검진 회차 수`<br>`has_items: boolean — 0건이면 빈 상태 화면` | CheckupListScreen.tsx:101 쿼리 settled 시(성공 1회) | '검진 데이터' 메뉴를 눌렀는지, 그리고 0건 사용자가 몇 %인지 = 인증 퍼널의 분모 |
| `checkup_question_asked` | new | success | `mode: 'all' \| 'metric'`<br>`metric_count: number`<br>`has_warning: boolean — 보낸 수치에 warning 이 있나(값 자체는 안 보냄)` | CheckupDetailScreen.tsx:243 askAboutAll / :252 askAboutMetric | 검진 연동의 최종 목적지. 여기까지 안 오면 인증·분석 비용이 회수되지 않는다 |
| `checkup_result_selected` | new | progress | `selected_count: number — 토글 직후 선택 수` | CheckupListScreen.tsx:105 toggle | 고르긴 했는데 분석을 안 누르는 사람을 잡는다 |
| `checkup_round_changed` | new | progress | `round_count: number` | CheckupDetailScreen.tsx:551 (회차 시트 선택) | 회차 드롭다운이 다회차 사용자에게만 뜬다 — 실사용 여부 확인 |
| `checkup_tab_changed` | new | progress | `tab: 'checkups' \| 'records'` | CheckupDetailScreen.tsx:533 | 검사 기록 탭이 발견되는지 |
| `doctor_add_pressed` | new | intent | `from: 'empty' \| 'list'`<br>`item_count: number` | ConnectedListScreen.tsx:203(onAction) / :236(하단 버튼) | 빈 목록에서 추가로 넘어가는 전환율 |
| `doctor_connect_failed` | new | failure | `fail_kind: 'duplicate' \| 'revoked' \| 'network' \| 'server' \| 'unknown'` | DoctorPreviewScreen.tsx:103 (connect.isError) | 다시 눌러도 소용없는 실패(중복 요청 등)에 사람이 갇히는지 |
| `doctor_connect_requested` | new | intent | — | DoctorPreviewScreen.tsx:55 handleConnect (mutate 직전) | 연결 요청 전송 시도 |
| `doctor_connect_succeeded` | new | success | — | DoctorPreviewScreen.tsx:45 onSuccess | PENDING 생성 성공. 이후 승인까지의 대기 구간 측정 시작점 |
| `doctor_connections_load_failed` | new | failure | `retryable: boolean` | ConnectedListScreen.tsx:170 | 빈 상태와 실패의 혼동을 가른다 |
| `doctor_connections_viewed` | new | screen | `item_count: number — REVOKED 제외 목록 길이`<br>`pending_count: number`<br>`approved_count: number` | ConnectedListScreen.tsx:129 (목록 확정 시 1회) | 의사 기능의 홈. 승인 대기가 쌓인 채 방치되는 사용자를 여기서 센다 |
| `doctor_intro_completed` | new | progress | — | DoctorIntroScreen.tsx:140 (V2BottomCTA onPrimary) | 온보딩 통과율 |
| `doctor_intro_viewed` | new | screen | `item_count: number — 이미 연결된 수(0이면 첫 사용자)` | DoctorIntroScreen.tsx:44 mount | 재사용자도 매번 거치게 만든 화면이라, 여기 이탈이 크면 건너뛰기 도입 근거 |
| `doctor_preview_viewed` | new | screen | — | DoctorPreviewScreen.tsx:29 mount | 동의 고지 2줄을 읽는 자리 = 최종 문턱 |
| `doctor_revoke_confirmed` | new | success | `status: string` | ConnectedListScreen.tsx:261 (V2Modal onPrimary) | 요청 대비 확정 비율 = 실수로 롱프레스한 비율 |
| `doctor_revoke_dismissed` | new | abandon | — | ConnectedListScreen.tsx:257(onRequestClose) / :268(onSecondary) | 위와 같은 이유 — 오조작 판별 |
| `doctor_revoke_failed` | new | failure | `fail_kind: 'gone' \| 'network' \| 'server' \| 'unknown'` | ConnectedListScreen.tsx:113 onError | '언제든 중단할 수 있어요' 약속이 실제로 지켜지는지 |
| `doctor_revoke_requested` | new | intent | `status: string` | ConnectedListScreen.tsx:77 onLongPress | 롱프레스는 발견성이 낮다 — 시도 수가 0에 가까우면 상세 화면에 버튼을 붙일 근거 |
| `doctor_search_failed` | new | failure | `retryable: boolean` | DoctorSearchScreen.tsx:154 (searchFailure 분기) | 조건 오류(비재시도)와 통신 실패를 나눈다 |
| `doctor_search_result_selected` | new | intent | `result_count: number`<br>`rank_bucket: 'top3' \| 'rest' — 고른 카드의 순위 구간(id 는 안 싣는다)` | DoctorSearchScreen.tsx:200 (DoctorRow onPress) | 결과를 보고도 못 고르는 비율. 순위 구간만 남겨 카디널리티를 안 늘린다 |
| `doctor_search_results_viewed` | new | progress | `result_count: number`<br>`empty: boolean` | DoctorSearchScreen.tsx:94 (쿼리 성공 시) | 빈 결과 반복이 이 기능의 벽인지 확인 — 검색 사전/부분일치 개선 근거 |
| `doctor_search_submitted` | new | intent | `criteria_count: number — 채운 칸 수(1~3)`<br>`used_person: boolean`<br>`used_hospital: boolean`<br>`used_department: boolean` | DoctorSearchScreen.tsx:83 handleSearch | 검색어 원문은 절대 싣지 않고 '어느 축으로 찾는지' 만 본다. 셋 다 비면 서버가 400 이라 CTA 가 잠기는 구조 |
| `doctor_search_viewed` | new | screen | — | DoctorSearchScreen.tsx:52 mount | 검색 폼 도달 |
| `doctor_sharing_analyze_pressed` | new | intent | `can_edit: boolean` | DataSharingScreen.tsx:261 (onSecondary) | 공유 설정 → 검진 분석으로 이어지는 설계 의도가 실제로 작동하는지 |
| `doctor_sharing_load_failed` | new | failure | `status: string`<br>`retryable: boolean` | DataSharingScreen.tsx:152 | 해지된 연결/세션 만료를 구분 |
| `doctor_sharing_save_failed` | new | failure | `status: string`<br>`fail_kind: 'not_approved' \| 'network' \| 'server' \| 'unknown'` | DataSharingScreen.tsx:140 onError | 승인 전 저장(DOCTOR_ERROR_004)이 실제로 얼마나 시도되는지 = 잠금 안내가 안 읽힌다는 증거 |
| `doctor_sharing_saved` | new | success | `exam_on: boolean`<br>`diet_on: boolean`<br>`vitals_on: boolean`<br>`realtime_on: boolean`<br>`on_count: number` | DataSharingScreen.tsx:127 onSuccess | 실제로 무엇이 열렸는지의 분포. 아무도 안 켜는 축이 있으면 화면에서 뺄 근거 |
| `doctor_sharing_toggled` | new | progress | `scope: 'exam_results' \| 'diet_records' \| 'vitals' \| 'realtime'`<br>`on: boolean` | DataSharingScreen.tsx:154 setField | 토글은 만졌는데 저장을 안 누르는 조용한 이탈을 잡는 유일한 신호 |
| `doctor_sharing_viewed` | new | screen | `status: 'PENDING' \| 'APPROVED' \| 'REJECTED' \| 'REVOKED'`<br>`can_edit: boolean — status==='APPROVED'` | DataSharingScreen.tsx:150 (status/draft 확정 후 1회) | 잠긴 화면을 보고 나가는 사람 수. 승인 대기 체감시간의 대리 지표 |
| `exam_ocr_analysis_failed` | new | failure | `file_count: number`<br>`fail_kind: 'network' \| 'server' \| 'unreadable' \| 'unknown'` | HealthDataUploadScreen.tsx:150 catch | 사진 품질 문제인지 서버 문제인지에 따라 처방(가이드 강화 vs 백엔드)이 다르다 |
| `exam_ocr_analysis_started` | new | intent | `file_count: number`<br>`has_pdf: boolean` | HealthDataUploadScreen.tsx:139 | 서버는 첫 파일 1건만 분석한다 — file_count>1 비율이 곧 기대 불일치의 크기 |
| `exam_ocr_analysis_succeeded` | new | success | `file_count: number` | HealthDataUploadScreen.tsx:141 (uploadOcr resolve) | OCR 성공률 |
| `exam_ocr_file_added` | new | progress | `source: 'camera' \| 'gallery' \| 'pdf'`<br>`kind: 'image' \| 'pdf'`<br>`file_count: number — 추가 후 총 첨부 수` | HealthDataUploadScreen.tsx:64 / :101 / :118 | 진입은 했으나 첨부를 못 하는 사람을 가른다. 파일명·URI 는 절대 싣지 않는다 |
| `exam_ocr_file_removed` | new | progress | `mode: 'one' \| 'all'`<br>`file_count: number — 삭제 후 남은 수` | HealthDataUploadScreen.tsx:130 / :214(전체 지우기) | 전체 지우기 후 0으로 끝나는 세션 = 조용한 포기 |
| `exam_ocr_item_edited` | new | progress | `change_kind: 'toggled' \| 'removed' \| 'added' \| 'edited'`<br>`item_count: number — 편집 후 목록 길이` | OcrReviewScreen.tsx:111 updateItem / :117 removeItem / :121 addCustomItem | 검토를 실제로 하는지, 손대다가 지치는지. 입력한 검사명·값은 싣지 않는다 |
| `exam_ocr_permission_result` | new | failure | `source: 'camera' \| 'gallery'`<br>`granted: boolean`<br>`opened_settings: boolean — 거부 후 설정 이동을 눌렀나` | HealthDataUploadScreen.tsx:49(camera) / :80(gallery) | 권한 거부는 첨부 0으로 이어지고 CTA 가 영영 잠긴다 |
| `exam_ocr_review_load_failed` | new | failure | `missing_report: boolean — reportId 자체가 없는 경우` | OcrReviewScreen.tsx:82 / :95 | 분석은 성공했는데 검토를 못 여는 구간이 있는지 |
| `exam_ocr_review_loaded` | new | screen | `item_count: number`<br>`unmapped_count: number — mapped=false 항목 수`<br>`has_measure: boolean — 검사일이 OCR 로 잡혔나`<br>`confirmed: boolean — 이미 확정된 리포트인가` | OcrReviewScreen.tsx:90 (getOcrReport then) | 미매핑이 많고 검사일이 비면 사용자가 손볼 게 급증한다 — 저장 실패의 최대 설명변수 |
| `exam_ocr_save_blocked` | new | failure | `fail_kind: 'bad_day' \| 'no_items' — 검사일 형식 오류 / 유효 항목 0`<br>`included_count: number` | OcrReviewScreen.tsx:142 / :161 | 저장을 눌렀는데 토스트만 뜨고 안 되는 자리. 검토 화면 최대 이탈 지점 후보 |
| `exam_ocr_save_failed` | new | failure | `included_count: number`<br>`fail_kind: 'network' \| 'server' \| 'unknown'` | OcrReviewScreen.tsx:181 catch | 검토를 다 하고 마지막에 잃는 건 가장 비싼 실패다 |
| `exam_ocr_saved` | new | success | `saved_count: number — 서버가 돌려준 savedCount`<br>`included_count: number`<br>`custom_count: number — 사용자가 직접 추가한 항목 수` | OcrReviewScreen.tsx:171 (confirmOcr resolve) | OCR 경로의 성공 정의. 직접 추가 비율이 높으면 OCR 추출이 약한 것 |
| `exam_ocr_upload_viewed` | new | screen | — | HealthDataUploadScreen.tsx:38 mount | OCR 경로의 분모. 현재 진입점이 레거시 허브뿐이라 유입 자체가 있는지부터 확인해야 한다 |
| `kidney_profile_edit_viewed` | new | screen | `from: 'profile_card' \| 'kidney_card' \| 'other'`<br>`has_stage: boolean — 서버 프로필에서 병기를 읽어 왔나(undefined 면 false)`<br>`on_dialysis: boolean` | KidneyProfileEditScreen.tsx:127 (프로필 hydrate 완료 effect) | has_stage=false 로 진입한 세션이 저장까지 가면 병기 축이 통째로 빠진 저장이다(2026-08-05 사고의 관측 장치) |
| `kidney_profile_field_changed` | new | progress | `field: 'height' \| 'weight' \| 'stage' \| 'dialysis' \| 'diag_month' \| 'cause' \| 'comorbidity' \| 'other_cause'` | KidneyProfileEditScreen.tsx:264/:270/:276(입력) · :436(병기) · :510(투석) · :682(진단시기) · :172(원인) · :157(동반질환) | 긴 폼에서 어느 섹션까지 내려갔는지 = 스크롤 이탈 지점. 입력값 자체는 싣지 않는다 |
| `kidney_profile_save_failed` | new | failure | `fail_kind: 'field' \| 'server' \| 'network' \| 'unknown' — field 는 서버 fieldErrors 매핑`<br>`fail_count: number` | KidneyProfileEditScreen.tsx:243 catch (:248 서버필드 / :255 그 외) | PATCH 는 됐는데 체중 upsert 가 깨진 경우도 여기로 온다 — 부분 실패를 구분할 첫 단서 |
| `kidney_profile_save_pressed` | new | intent | `stage_axis: 'stage' \| 'dialysis' \| 'none' \| 'unknown' — 서버로 나갈 병기 축의 모양`<br>`cause_count: number`<br>`comorbidity_count: number` | KidneyProfileEditScreen.tsx:183 handleSave 진입 | 저장 시도. stage_axis='unknown' 이 잦으면 프로필 로딩 전에 저장하는 경로가 살아 있다는 뜻 |
| `kidney_profile_saved` | new | success | `stage_axis: string`<br>`on_dialysis: boolean`<br>`cause_count: number`<br>`comorbidity_count: number` | KidneyProfileEditScreen.tsx:240 (invalidate 직전) | 성공 정의. 병기 축 분포는 영양 제한 계산의 입력이라 데이터 품질 감시도 겸한다 |
| `kidney_profile_validation_failed` | new | failure | `fail_count: number`<br>`first_fail: 'height' \| 'weight' \| 'other_cause' \| 'diag_date'` | KidneyProfileEditScreen.tsx:193 | 어느 칸이 저장을 막는지. 화면 상단으로 스크롤도 안 되므로 사용자는 이유를 못 볼 수 있다 |
| `settings_viewed` | new | screen | — | SettingsScreen.tsx:25 mount | 마이페이지와 설정이 지금 같은 'profile' 로 접힌다. 탈퇴 퍼널의 상단 분모를 만들려면 분리가 필요 |
| `screen_viewed` | change | screen | `screen: string — AnalyticsScreenName. 'checkup' \| 'doctor_link' \| 'kidney_profile' \| 'withdrawal' \| 'settings' 5개 추가 필요` | sinsin-rn/src/features/analytics/useAnalyticsLifecycle.ts:53 (매핑은 events.ts:245 getAnalyticsScreenName 의 (settings) 분기) | 지금 (settings) 하위가 전부 profile/health 로 접혀서 화면 축 퍼널이 이 여정에선 무의미하다 |
| `auth_withdrawal_cancelled` | keep | success | — | sinsin-rn/src/hooks/useAuth.ts:248 | 이미 있다. auth_withdrawal_succeeded 가 생기면 비로소 '철회율' 이 계산된다 |

### J7-3. 퍼널 (7)

**건강검진 불러오기(NHIS 간편인증) 전 구간** — window 30분

1. `screen:profile`
2. `event:checkup_list_viewed`
3. `event:checkup_auth_viewed`
4. `event:checkup_auth_submitted`
5. `event:checkup_auth_pending_viewed`
6. `event:checkup_auth_confirm_pressed`
7. `event:checkup_auth_succeeded`

읽는 법: 마이페이지→목록 하락은 메뉴 라벨/위치 문제, 목록→인증 하락은 빈 상태 CTA 문제, 인증 진입→제출 하락은 개인정보 3칸 입력 문턱(= checkup_auth_validation_failed 와 대조), 제출→대기 하락은 공단 요청 실패(= submit_failed/rejected), 대기→확인 하락은 인증 앱에서 안 돌아온 사람(= dismissed{phase:'pending'}), 확인→성공 하락은 confirm 재시도 소진이다.

**검사지 OCR 업로드 → 저장** — window 30분

1. `event:exam_ocr_upload_viewed`
2. `event:exam_ocr_file_added`
3. `event:exam_ocr_analysis_started`
4. `event:exam_ocr_review_loaded`
5. `event:exam_ocr_saved`

읽는 법: 진입→첨부 하락은 권한 거부(= exam_ocr_permission_result{granted:false})가 설명한다. 첨부→분석 하락은 CTA 미발견, 분석→검토 하락은 OCR 실패(= analysis_failed), 검토→저장 하락은 검사일 미추출/미매핑 항목 손질 부담(= review_loaded 의 has_measure·unmapped_count 와 save_blocked 로 갈라 본다).

**의사 검색 → 연결 요청** — window 30분

1. `event:doctor_connections_viewed`
2. `event:doctor_intro_viewed`
3. `event:doctor_search_viewed`
4. `event:doctor_search_submitted`
5. `event:doctor_search_results_viewed`
6. `event:doctor_preview_viewed`
7. `event:doctor_connect_requested`

읽는 법: 목록→온보딩 하락은 빈 상태 CTA, 온보딩→검색 하락은 매번 강제로 거치는 3스텝 화면의 피로, 검색 진입→제출 하락은 '무엇을 입력해야 하는지 모름'(criteria_count 분포로 확인), 결과→확인 하락은 결과 0건(results_viewed{empty:true}) 또는 누가 내 담당인지 못 고름, 확인→요청 하락은 데이터 공개 고지 앞에서의 망설임이다.

**연결 요청 → 승인 대기 → 공유 범위 저장** — window 10080분

1. `event:doctor_connect_requested`
2. `event:doctor_sharing_viewed`
3. `event:doctor_sharing_toggled`
4. `event:doctor_sharing_saved`

읽는 법: 요청→공유설정 하락은 승인이 안 나거나(의사 측 문제) 승인 알림이 없어서 사용자가 다시 안 들어오는 것. 공유설정→토글 하락은 status!=APPROVED 로 잠긴 화면을 본 것(doctor_sharing_viewed{can_edit:false} 비율로 분리). 토글→저장 하락은 '켜 두면 저장된 줄 아는' 오해 — 이 기능에서 가장 조용한 손실이다. 7일 창은 승인이 사람 손에 달려 있기 때문.

**검진 분석 열람 → 상담 질문** — window 60분

1. `event:checkup_list_viewed`
2. `event:checkup_analysis_requested`
3. `event:checkup_analysis_viewed`
4. `event:checkup_question_asked`

읽는 법: 목록→분석요청 하락은 회차 선택 UI(체크박스+하단 CTA)를 못 찾은 것(checkup_result_selected 와 대조). 분석요청→열람 하락은 LLM 지연/실패로 기다리다 나간 것 — 비용은 이미 나갔다. 열람→질문 하락이 이 여정의 최종 손실이고, checkup_analysis_viewed 의 warning_count 로 쪼개면 '위험 수치가 있어도 안 묻는지'를 볼 수 있다.

**회원 탈퇴 확정** — window 30분

1. `event:auth_withdrawal_started`
2. `event:auth_withdrawal_terms_viewed`
3. `event:auth_withdrawal_confirm_viewed`
4. `event:auth_withdrawal_succeeded`

읽는 법: 시작→약관 하락은 사유 단계에서 되돌아간 사람(기타 20자 제한 포함), 약관→확인 하락은 동의 체크에서 멈춘 사람, 확인→성공 하락이 곧 '만류 성공'이다. 각 하락의 절대수가 곧 리텐션으로 되돌릴 수 있는 인원이고, 지금은 이 네 숫자 중 하나도 없다.

**신장 프로필 편집 도달률** — window 30분

1. `event:kidney_profile_edit_viewed`
2. `event:kidney_profile_field_changed`
3. `event:kidney_profile_save_pressed`

읽는 법: 진입→편집 하락은 긴 폼을 보고 그대로 나간 것, 편집→저장누름 하락은 스크롤 하단 저장 버튼(헤더 저장은 있으나 눈에 안 띔)에 도달하지 못한 것. 저장 성공률은 kidney_profile_saved ÷ save_pressed 비율로 따로 본다(퍼널에 넣지 않는 이유는 아래 notes).

### J7-4. 주의

[화면명 추가 필요 — 이게 첫 번째 처방이다]
events.ts:245 의 `(settings)` 분기는 route 가 'health' 로 시작하면 'health', 'notification' 포함이면 'notifications', 나머지는 전부 'profile' 이다. 그 결과 checkup-auth/list/detail/calendar · doctor-intro/search/preview/connections/sharing · kidney-profile-edit · withdrawal(3개) · 설정 인덱스가 **모두 'profile'** 로 접힌다. 게다가 useAnalyticsLifecycle.ts:51 이 직전과 같은 화면명이면 이벤트를 건너뛰므로, (tabs)/all 에서 (settings)/checkup-list 로 이동해도 screen_viewed 가 아예 한 번도 더 안 나간다. 즉 이 여정 전체가 화면 축에서 **투명하다**.
AnalyticsScreenName 에 최소 5개를 추가할 것: 'checkup'(checkup-* 전부), 'doctor_link'(doctor-* 전부), 'kidney_profile'(kidney-profile-edit), 'withdrawal'(withdrawal, withdrawal-terms, withdrawal-complete), 'settings'((settings) 인덱스·notification 제외 나머지). 여유가 되면 'health_upload'(health-data-upload, health-ocr-review)도 분리 — 지금은 레거시 NHIS 3화면과 한 덩어리다. 서버 대시보드의 화면 축 선택지(screen_name)에도 같은 값을 등록해야 퍼널 스텝으로 고를 수 있다.
다만 위 퍼널 정의는 화면명 추가를 **기다리지 않도록** 이벤트 축으로만 짰다(첫 퍼널의 screen:profile 하나만 기존 값). 화면명이 추가되면 각 *_viewed 를 screen: 스텝으로 바꿔도 같은 그림이 나온다.

[새니타이저를 피해 이름을 고른 자리]
- 'screen_name' · 'meal_slot' · 'error_code' · 'measured_date' · 'file_name' · 'doctor_name' · 'exam_name' 은 전부 정규식(name/meal/error/date/food…)에 걸려 **조용히 사라진다**. 대신 item_count / fail_kind / has_measure / first_fail / rank_bucket 을 썼다.
- 'birth' · 'phone' · 'name' 은 키로 못 쓰므로 checkup_auth_validation_failed 의 first_fail 은 **값**으로 표현했다(값은 필터되지 않는다). 'diagnosis_date' 도 같은 이유로 field:'diag_month' 라는 값으로 접었다.
- 배열·객체는 떨어지므로 다중 오류는 fail_count + first_fail, 다중 공유범위는 4개 불리언 + on_count 로 폈다.

[개인정보]
의사 검색어(이름·병원·진료과), 탈퇴 사유 자유입력, OCR 검사명/수치, NHIS 입력 3칸은 **한 글자도 싣지 않는다**. 대신 criteria_count/used_* 불리언, reason_index/has_detail, item_count/unmapped_count/saved_count 만 남긴다. checkup_analysis_viewed 도 수치 대신 상태별 개수(warning/caution/normal)만 보낸다.

[카디널리티]
connectionId · doctorId · reportId · resultId 는 새 속성으로 넣지 않았다. 의사 선택은 rank_bucket('top3'|'rest')으로, 검진 회차는 round_count/selected_count 로 접었다. 새로 도입한 문자열 속성의 값은 전부 고정 enum(method 2개, status 4개, scope 4개, fail_kind 4~5개, field 8개, reason_index 0~4)이다.

[퍼널 엔진 제약과 관련해 일부러 뺀 인접 쌍]
server_ts 는 초 정밀도이고 스텝 비교가 엄격 부등호라, 같은 초에 연달아 나가는 두 이벤트는 인접 스텝으로 두지 않았다.
- doctor_connect_requested → doctor_connect_succeeded (POST 왕복이 수백 ms) → 4번 퍼널은 requested 다음을 sharing_viewed 로 건너뛴다.
- doctor_connect_succeeded → doctor_connections_viewed (onSuccess 직후 router.replace) → 퍼널에서 뺐다.
- auth_withdrawal_succeeded → auth_withdrawal_completion_viewed (replace 직후) → 완료 화면은 퍼널 밖에서 본다.
- auth_withdrawal_reason_selected → auth_withdrawal_terms_viewed (라디오 탭 후 곧바로 '다음' 을 누르면 같은 초 가능) → 사유 단계는 next_pressed ÷ reason_selected 비율로 본다.
- kidney_profile_save_pressed → kidney_profile_saved (PATCH+체중 upsert 2회지만 빠르면 1초 안) → 저장 성공률은 퍼널이 아니라 비율로 읽는다.
- exam_ocr_analysis_succeeded → exam_ocr_review_loaded (afterModalTransitions + GET) → 퍼널에는 analysis_started 다음에 review_loaded 를 두어 OCR 처리 시간이 확실히 끼게 했다.
또 첫 퍼널의 screen:profile 은 (tabs)/all 과 (settings) 하위가 같은 화면명이라 **퍼스트 터치가 탭 진입 시각**으로 잡힌다 — 화면명을 분리하기 전까지는 이 스텝의 절대값을 '탭을 본 사람' 으로 읽어야 한다.

[볼륨]
가장 시끄러운 후보는 kidney_profile_field_changed(입력 한 글자마다 쏘면 폭발)와 exam_ocr_item_edited 다. 둘 다 **필드/항목 단위로 세션 내 1회만** 쏘도록 구현할 것(로컬 Set 으로 dedupe). doctor_sharing_toggled 는 토글이 4개뿐이라 그대로 둬도 된다.

[구현상 주의]
- auth_withdrawal_succeeded 는 clearClientSession(WithdrawalTermsScreen.tsx:56) **전에** 쏴야 한다. 세션이 지워지면 익명 신원으로 굴러가 그 이벤트가 탈퇴자에게 귀속되지 않는다. transport 큐가 flush 하기 전에 앱이 로그인으로 튕길 수 있으니, 탈퇴 성공 직후 강제 flush 를 한 번 넣는 것을 권한다.
- 구형 NHIS 3화면(health-nhis-auth/request/confirm)은 마이페이지에서 도달 경로가 없고 routeGraph·딥링크로만 남아 있다. 계측을 이중으로 붙이지 말고 checkup_auth_viewed 의 entry:'legacy' 로만 표시해서, 실제 트래픽이 0이면 화면을 지울 근거로 쓰는 편이 낫다. 같은 이유로 레거시 허브 (settings)/health-data 도 진입 이벤트 하나만 붙여 사망 확인용으로 쓸 것.
- HealthDataUploadScreen 은 파일을 5개까지 받아 놓고 서버는 첫 1개만 분석한다(:135 주석). exam_ocr_analysis_started 의 file_count>1 비율이 그 기대 불일치의 크기이므로, 이 숫자가 크면 계측보다 UI 수정이 먼저다.
