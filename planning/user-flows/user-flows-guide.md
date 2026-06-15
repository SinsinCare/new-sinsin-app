# AI 작업 지시서 1: 모바일 앱 프로젝트 내 User Flow 문서 작성 가이드

## 0. 목적

이 문서는 특정 모바일 앱 프로젝트 안에 유저플로우 문서를 체계적으로 작성하기 위한 AI 작업 지시서다.

목표는 앱의 모든 화면, 라우트, 유저 행동, 시스템 처리, 예외 경로, 에러 상태, 권한 처리, 분석 이벤트를 사람이 읽기 쉽고 AI가 구조적으로 해석할 수 있는 형태로 정리하는 것이다.

이 프로젝트의 user-flow 저장 루트는 반드시 다음 경로로 고정한다.

```txt
{project-root}/planning/user-flows
```

다른 경로를 사용하지 않는다.

---

## 1. 핵심 원칙

이 작업의 핵심 원칙은 다음과 같다.

```txt
1. Figma나 이미지가 원본이 아니다.
2. YAML / Markdown이 원본이다.
3. 모든 화면, 라우트, 이벤트, 권한, API는 registry에 먼저 등록한다.
4. 각 유저플로우는 flows/*.flow.yaml 파일로 작성한다.
5. Markdown 문서는 사람이 읽기 위한 설명 문서다.
6. YAML 파일은 AI와 시각화 도구가 읽는 source of truth다.
7. 모든 정상 경로뿐 아니라 예외 경로까지 반드시 포함한다.
```

이 문서 시스템은 단순 플로우차트가 아니라, 모바일 앱의 제품 설계 원본이다.

---

## 2. 고정 폴더 구조

앱 프로젝트 루트에 다음 폴더 구조를 만든다.

```txt
planning/
  user-flows/
    README.md

    registry/
      screens.yaml
      routes.yaml
      events.yaml
      permissions.yaml
      apis.yaml

    flows/
      auth.flow.yaml
      onboarding.flow.yaml
      home.flow.yaml
      profile.flow.yaml
      notification.flow.yaml
      error-recovery.flow.yaml

    docs/
      auth.md
      onboarding.md
      home.md
      profile.md

    generated/
      mermaid/
      json/
```

필요에 따라 `flows/`와 `docs/` 안의 파일은 앱 기능에 맞게 추가한다.

예시:

```txt
flows/
  food-record.flow.yaml
  intake-statistics.flow.yaml
  diet-guide.flow.yaml
  payment.flow.yaml
  subscription.flow.yaml
  settings.flow.yaml
```

---

## 3. 작성 순서

AI는 반드시 다음 순서로 작업한다.

```txt
1. 앱 프로젝트 구조를 파악한다.
2. 화면 목록을 추출한다.
3. 라우트 목록을 추출한다.
4. 주요 기능 단위의 유저플로우를 식별한다.
5. registry/*.yaml 파일을 먼저 작성한다.
6. flows/*.flow.yaml 파일을 작성한다.
7. docs/*.md 설명 문서를 작성한다.
8. 누락된 예외 경로를 점검한다.
9. 검증 체크리스트를 실행한다.
```

절대 처음부터 플로우차트 그림을 만들지 않는다.

---

## 4. Registry 작성 규칙

### 4.1 screens.yaml

모든 화면은 `registry/screens.yaml`에 등록한다.

```yaml
screens:
  - id: SCR_HOME
    name: 홈
    route: /home
    module: home
    description: 사용자의 주요 상태와 핵심 CTA를 보여주는 메인 화면
    auth_required: true
    states:
      - default
      - loading
      - empty
      - error

  - id: SCR_LOGIN
    name: 로그인
    route: /auth/login
    module: auth
    description: 사용자가 이메일 또는 소셜 계정으로 로그인하는 화면
    auth_required: false
    states:
      - default
      - loading
      - error
```

화면 ID 규칙:

```txt
SCR_{MODULE}_{SCREEN_NAME}
```

예시:

```txt
SCR_HOME
SCR_AUTH_LOGIN
SCR_AUTH_SIGNUP
SCR_FOOD_RECORD
SCR_FOOD_RECORD_RESULT
SCR_PROFILE_EDIT
SCR_SETTINGS_NOTIFICATION
```

---

### 4.2 routes.yaml

앱의 실제 라우트는 `registry/routes.yaml`에 등록한다.

```yaml
routes:
  - path: /home
    screen: SCR_HOME
    module: home
    auth_required: true

  - path: /auth/login
    screen: SCR_LOGIN
    module: auth
    auth_required: false

  - path: /food/record
    screen: SCR_FOOD_RECORD
    module: food
    auth_required: true
```

라우트는 실제 코드의 라우팅 구조와 최대한 일치해야 한다.

Flutter, React Native, Expo Router, React Navigation, GoRouter 등 어떤 라우팅 시스템을 쓰든 실제 앱 경로를 기준으로 적는다.

---

### 4.3 events.yaml

분석 이벤트는 `registry/events.yaml`에 등록한다.

```yaml
events:
  - id: home_viewed
    description: 사용자가 홈 화면을 봄
    owner: product

  - id: food_record_started
    description: 사용자가 식사 기록 플로우를 시작함
    owner: product

  - id: food_record_saved
    description: 사용자가 식사 기록 저장에 성공함
    owner: product

  - id: food_record_save_failed
    description: 식사 기록 저장에 실패함
    owner: product
```

이벤트 ID 규칙:

```txt
{module}_{object}_{action}
```

예시:

```txt
auth_login_started
auth_login_succeeded
auth_login_failed
food_record_started
food_record_saved
profile_edit_submitted
notification_permission_denied
```

---

### 4.4 permissions.yaml

권한은 `registry/permissions.yaml`에 등록한다.

```yaml
permissions:
  - id: PERM_CAMERA
    name: 카메라 권한
    platform:
      - ios
      - android
    required_for:
      - photo_capture
    denied_behavior: 권한 안내 화면을 보여주고 설정으로 이동할 수 있게 한다

  - id: PERM_NOTIFICATION
    name: 알림 권한
    platform:
      - ios
      - android
    required_for:
      - daily_push
    denied_behavior: 알림 없이 앱 내 안내만 제공한다
```

권한 ID 규칙:

```txt
PERM_{PERMISSION_NAME}
```

---

### 4.5 apis.yaml

API는 `registry/apis.yaml`에 등록한다.

```yaml
apis:
  - id: API_CREATE_FOOD_RECORD
    method: POST
    path: /food-records
    description: 사용자의 식사 기록을 저장한다
    auth_required: true
    success_status:
      - 200
      - 201
    error_cases:
      - network_error
      - validation_error
      - unauthorized
      - server_error
```

API ID 규칙:

```txt
API_{ACTION}_{RESOURCE}
```

예시:

```txt
API_GET_USER_PROFILE
API_UPDATE_USER_PROFILE
API_CREATE_FOOD_RECORD
API_GET_INTAKE_SUMMARY
API_DELETE_ACCOUNT
```

---

## 5. Flow YAML 작성 규칙

각 유저플로우는 다음 경로에 작성한다.

```txt
planning/user-flows/flows/{flow-name}.flow.yaml
```

예시:

```txt
planning/user-flows/flows/auth.flow.yaml
planning/user-flows/flows/onboarding.flow.yaml
planning/user-flows/flows/food-record.flow.yaml
```

---

## 6. flow.yaml 기본 구조

```yaml
id: FLOW_FOOD_RECORD
name: 식사 기록 플로우
description: 사용자가 식사 정보를 입력하고 저장하는 전체 경로
version: 1

entry_points:
  - screen: SCR_HOME
    trigger: tap_record_meal
  - source: push_notification
    trigger: tap_daily_record_push

preconditions:
  - id: PRE_AUTH_REQUIRED
    description: 사용자는 로그인되어 있어야 한다
    type: auth
    required: true

nodes:
  - id: N_START
    type: start
    label: 진입

  - id: SCR_FOOD_RECORD
    type: screen
    label: 식사 기록 화면
    screen: SCR_FOOD_RECORD
    route: /food/record
    states:
      - default
      - loading
      - error

  - id: ACT_SAVE_RECORD
    type: action
    label: 식사 기록 저장
    api: API_CREATE_FOOD_RECORD

  - id: D_SAVE_SUCCESS
    type: decision
    label: 저장 성공?

  - id: SCR_RECORD_RESULT
    type: screen
    label: 기록 완료 화면
    screen: SCR_RECORD_RESULT
    route: /food/record/result
    states:
      - success

  - id: SCR_ERROR_RETRY
    type: screen
    label: 저장 실패 안내
    states:
      - error

  - id: N_END
    type: end
    label: 완료

edges:
  - from: N_START
    to: SCR_FOOD_RECORD

  - from: SCR_FOOD_RECORD
    to: ACT_SAVE_RECORD
    trigger: tap_save

  - from: ACT_SAVE_RECORD
    to: D_SAVE_SUCCESS

  - from: D_SAVE_SUCCESS
    to: SCR_RECORD_RESULT
    condition: success

  - from: D_SAVE_SUCCESS
    to: SCR_ERROR_RETRY
    condition: failure

  - from: SCR_ERROR_RETRY
    to: ACT_SAVE_RECORD
    trigger: tap_retry

  - from: SCR_RECORD_RESULT
    to: N_END

analytics:
  - food_record_started
  - food_record_saved
  - food_record_save_failed

notes:
  - 저장 실패 시 사용자가 입력한 데이터는 유지되어야 한다.
  - 뒤로가기 시 입력 중인 데이터가 있으면 confirm dialog를 띄운다.
```

---

## 7. Node 타입

지원하는 node type은 다음과 같다.

```txt
start       : 플로우 시작점
end         : 플로우 종료점
screen      : 실제 앱 화면
decision    : 조건 분기
action      : API 호출, 저장, 계산 등 시스템 동작
external    : 외부 앱, 브라우저, 결제창 등
modal       : 모달 또는 바텀시트
error       : 오류 상태
permission  : 권한 요청
```

---

## 8. Edge 작성 규칙

각 edge는 화면 또는 상태 간 이동을 의미한다.

```yaml
edges:
  - from: SCR_FOOD_RECORD
    to: ACT_SAVE_RECORD
    trigger: tap_save
    condition: form_valid
    description: 사용자가 저장 버튼을 누르고 입력값이 유효한 경우
```

edge에서 사용할 수 있는 속성:

```txt
from          : 시작 노드 id
to            : 도착 노드 id
trigger       : 사용자 행동 또는 시스템 이벤트
condition     : 분기 조건
description   : 설명
analytics     : 해당 이동에서 발생하는 이벤트
```

---

## 9. 반드시 포함해야 하는 경로

각 플로우에는 가능한 한 다음 경로를 포함한다.

```txt
1. 정상 성공 경로
2. 뒤로가기 경로
3. 취소 경로
4. 비로그인 접근 경로
5. 권한 거부 경로
6. 네트워크 실패 경로
7. 서버 오류 경로
8. 입력값 검증 실패 경로
9. 빈 데이터 경로
10. 푸시 알림 진입 경로
11. 딥링크 진입 경로
12. 앱 종료 후 복귀 경로
13. 중복 제출 방지 경로
14. 로딩 상태
15. 재시도 경로
```

예외 경로를 나중에 추가하지 않는다. 처음부터 포함한다.

---

## 10. Markdown 문서 작성 규칙

사람이 읽기 위한 설명은 `docs/*.md`에 작성한다.

예시:

```txt
planning/user-flows/docs/food-record.md
```

문서 구조:

```md
# Flow: 식사 기록

## 1. 목적

사용자가 식사 정보를 입력하고 저장할 수 있게 한다.

## 2. 진입 경로

- 홈 > 식사 기록 CTA
- 푸시 알림 > 오늘 식사 기록
- 섭취량 통계 > 빈 상태 CTA

## 3. 선행 조건

- 사용자는 로그인되어 있어야 한다.
- 네트워크 연결이 필요하다.

## 4. 정상 경로

1. 사용자가 식사 기록 화면에 진입한다.
2. 식사 정보를 입력한다.
3. 저장 버튼을 누른다.
4. 앱이 API를 호출한다.
5. 저장에 성공하면 결과 화면으로 이동한다.

## 5. 예외 경로

### A. 저장 실패

- 오류 메시지를 보여준다.
- 사용자가 입력한 데이터는 유지한다.
- 다시 시도 버튼을 제공한다.

### B. 비로그인

- 로그인 화면으로 이동한다.
- 로그인 완료 후 원래 화면으로 복귀한다.

### C. 권한 거부

- 권한 안내 화면을 보여준다.
- 설정으로 이동할 수 있게 한다.

## 6. 연결 정보

- Flow YAML: `flows/food-record.flow.yaml`
- Main route: `/food/record`
- Main API: `API_CREATE_FOOD_RECORD`
- Main events:
  - `food_record_started`
  - `food_record_saved`
  - `food_record_save_failed`
```

---

## 11. 작성 품질 기준

AI는 작성 후 다음 기준으로 자체 검토한다.

```txt
1. 모든 screen id가 screens.yaml에 등록되어 있는가?
2. 모든 route가 routes.yaml에 등록되어 있는가?
3. 모든 api가 apis.yaml에 등록되어 있는가?
4. 모든 analytics event가 events.yaml에 등록되어 있는가?
5. 모든 edge의 from/to node가 존재하는가?
6. start node가 존재하는가?
7. end node가 존재하는가?
8. decision node에는 최소 2개 이상의 분기 edge가 있는가?
9. API action에는 성공/실패 경로가 모두 있는가?
10. auth_required 화면에는 비로그인 경로가 있는가?
11. permission 관련 기능에는 denied 경로가 있는가?
12. 사용자가 취소하거나 뒤로 가는 경로가 있는가?
13. empty state가 필요한 화면에 empty 경로가 있는가?
14. 네트워크 실패 시 재시도 경로가 있는가?
```

---

## 12. AI 작업 요청 문장

이 프로젝트의 앱 유저플로우 문서를 작성할 때는 아래 요청을 사용한다.

```txt
이 모바일 앱 프로젝트를 분석해서 `{project-root}/planning/user-flows` 경로에 유저플로우 문서 시스템을 만들어줘.

반드시 다음 원칙을 지켜줘.

1. user-flow 저장 루트는 `{project-root}/planning/user-flows`로 고정한다.
2. 모든 화면, 라우트, 이벤트, 권한, API는 registry에 먼저 등록한다.
3. 각 주요 기능은 `flows/*.flow.yaml`로 작성한다.
4. 사람이 읽기 위한 설명은 `docs/*.md`에 작성한다.
5. 정상 경로뿐 아니라 비로그인, 권한 거부, 네트워크 오류, 서버 오류, 빈 데이터, 뒤로가기, 취소, 재시도 경로까지 포함한다.
6. Figma나 이미지가 아니라 YAML/Markdown을 source of truth로 삼는다.
7. AI와 시각화 도구가 읽기 쉬운 구조로 작성한다.

먼저 앱의 화면과 라우트 구조를 파악한 뒤, `registry` 파일들을 만들고, 그다음 핵심 플로우부터 `.flow.yaml` 파일을 작성해줘.
```

---

## 13. 완료 기준

작업 완료 기준은 다음과 같다.

```txt
1. `{project-root}/planning/user-flows` 폴더가 존재한다.
2. `registry/screens.yaml`이 존재한다.
3. `registry/routes.yaml`이 존재한다.
4. `registry/events.yaml`이 존재한다.
5. `registry/permissions.yaml`이 존재한다.
6. `registry/apis.yaml`이 존재한다.
7. 최소 1개 이상의 `flows/*.flow.yaml` 파일이 존재한다.
8. 최소 1개 이상의 `docs/*.md` 파일이 존재한다.
9. 각 flow에는 start/end node가 있다.
10. 각 flow에는 정상 경로와 예외 경로가 있다.
11. registry와 flow 간 참조가 일관된다.
```

---

## 14. 최종 정의

이 문서 시스템의 정체성은 다음과 같다.

> 모바일 앱 유저플로우를 위한 source of truth 기반 설계 문서 시스템

한 줄로 요약하면 다음과 같다.

> 앱의 모든 사용자 경로를 YAML/Markdown으로 정의하고, AI와 도구가 읽을 수 있게 만드는 구조다.
