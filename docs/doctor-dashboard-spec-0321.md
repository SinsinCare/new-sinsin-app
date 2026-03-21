# 의사 대시보드 연동 스펙 — 2026-03-21

환자 iOS 앱의 실제 데이터 구조 기준으로 작성한 백엔드 + 대시보드 프론트 연동 스펙입니다.

---

## 전체 데이터 흐름

```
[환자 iOS 앱]                      [백엔드]                   [Doctor Dashboard]
    |                                  |                              |
    | POST /api/v1/doctor/enroll       |                              |
    | { doctorCode: "847293" }         |                              |
    |─────────────────────────────────>|                              |
    |                                  | doctor_patient_assignments에 |
    |                                  | (doctor_id, patient_id) 저장 |
    |                                  |                              |
    |                                  |<── GET /api/v1/doctor/patients ──────|
    |                                  |    Authorization: Bearer {doctor_jwt} |
    |                                  |    JWT에서 doctor_id 추출            |
    |                                  |    → 연결된 환자 목록 반환 ─────────>|
    |                                  |                              |
    |                                  |<── GET /api/v1/doctor/patients/{id}/summary ──|
    |                                  |    → 환자 상세 (프로필 + 최근 데이터) ───────>|
    |                                  |                              |
    | POST /api/v1/food-camera/analyze  |                              |
    | (식사 사진 AI 분석)               |                              |
    |─────────────────────────────────>|                              |
    | GET /api/v1/food-camera/date-analysis/{date} |                  |
    |<─────────────────────────────────|                              |
    |                                  |<── GET /api/v1/doctor/patients/{id}/food-logs ──|
    |                                  |    → 식사 기록 (영양소 포함) ───────────────>|
    |                                  |                              |
    | POST /api/v1/weight-records       |                              |
    | POST /api/v1/edema-records        |                              |
    |─────────────────────────────────>|                              |
    |                                  |<── GET /api/v1/doctor/patients/{id}/body-records ──|
    |                                  |    → 체중/부종 기록 ──────────────────────────>|
    |                                  |                              |
    | GET /api/v1/health-check/results  |                              |
    | (NHIS 건강검진 연동)              |                              |
    |<─────────────────────────────────|                              |
    |                                  |<── GET /api/v1/doctor/patients/{id}/lab-results ──|
    |                                  |    → 건강검진/검사 결과 ──────────────────────>|
```

---

## 1. DB 테이블

```sql
-- 의사 초대 코드 (6자리 숫자)
CREATE TABLE doctor_invite_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id  UUID NOT NULL REFERENCES users(id),
    code       CHAR(6) NOT NULL UNIQUE,
    is_active  BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 의사-환자 연결
CREATE TABLE doctor_patient_assignments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id  UUID NOT NULL REFERENCES users(id),
    patient_id UUID NOT NULL REFERENCES users(id),
    linked_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(doctor_id, patient_id)
);
```

---

## 2. 환자 앱이 보내는 요청 (이미 구현됨)

```
POST /api/v1/doctor/enroll
Authorization: Bearer {patient_jwt}
Body: { "doctorCode": "847293" }

처리 로직:
  1. doctor_invite_codes에서 code = "847293"인 doctor_id 조회
  2. doctor_patient_assignments에 INSERT
  3. 중복이면 무시 (ON CONFLICT DO NOTHING)
```

---

## 3. 의사 초대코드 API

```
GET /api/v1/doctor/me/invite-code
→ { "code": "847293" }

POST /api/v1/doctor/me/invite-code/regenerate
→ { "code": "019284" }   -- 기존 코드 비활성화 후 새 코드 발급
```

---

## 4. 대시보드가 호출하는 API 목록

### 4-1. 환자 목록

```
GET /api/v1/doctor/patients
Authorization: Bearer {doctor_jwt}
```

**응답:**

```json
[
  {
    "id": "uuid",
    "name": "김신장",
    "nickname": "콩팥지킴이",
    "email": "patient@example.com",
    "birthYear": 1975,
    "birthMonth": 3,
    "birthDay": 15,
    "gender": "male",
    "ckdStage": 3,
    "isDialysis": false,
    "weightKg": 68.5,
    "heightCm": 172.0,
    "linkedAt": "2026-03-10T09:00:00Z",
    "lastActivityAt": "2026-03-20T14:30:00Z"
  }
]
```

**`ckdStage` 허용값:** `1` `2` `3` `4` `5` `null`(미입력)

> `weightKg` / `heightCm` / `ckdStage` / `isDialysis`는 환자가 온보딩 또는 신장 프로필에서 입력한 값.
> 백엔드 TODO #1(2026-03-21 기준) 해결 시 정상 저장됨.

---

### 4-2. 환자 상세 요약

```
GET /api/v1/doctor/patients/{patientId}/summary
Authorization: Bearer {doctor_jwt}
```

**응답:**

```json
{
  "profile": {
    "id": "uuid",
    "name": "김신장",
    "nickname": "콩팥지킴이",
    "email": "patient@example.com",
    "birthYear": 1975,
    "gender": "male",
    "ckdStage": 3,
    "isDialysis": false,
    "weightKg": 68.5,
    "heightCm": 172.0,
    "comorbidities": ["당뇨병", "고혈압"]
  },
  "nutrientLimits": {
    "sodiumMg": 2000,
    "potassiumMg": 2000,
    "phosphorusMg": 1000,
    "proteinGPerKg": 0.8,
    "fluidMl": null
  },
  "recentLabValues": {
    "gfr": 42.0,
    "creatinine": 1.8,
    "potassium": 4.5,
    "bun": 22.0,
    "measuredAt": "2026-03-15T10:00:00Z"
  },
  "recentBodyRecord": {
    "weightKg": 68.5,
    "edemaLevel": "NONE",
    "recordedAt": "2026-03-20T08:00:00Z"
  },
  "todayNutrition": {
    "date": "2026-03-20",
    "totalSodiumMg": 1450,
    "totalPotassiumMg": 1200,
    "totalPhosphorusMg": 780,
    "totalProteinG": 38.5,
    "totalWaterMl": 900,
    "totalCalories": 1850,
    "mealCount": 3
  }
}
```

---

### 4-3. 식사/영양소 기록 (핵심)

환자 앱에서 `POST /food-camera/analyze` → AI가 식품별 영양소 분석 → 환자가 확인 후 다이어리에 저장하는 구조.

```
GET /api/v1/doctor/patients/{patientId}/food-logs
Authorization: Bearer {doctor_jwt}
Query: ?from=2026-03-14&to=2026-03-21&page=1&pageSize=20
```

**응답:**

```json
{
  "items": [
    {
      "diaryId": "uuid",
      "date": "2026-03-20",
      "mealType": "LUNCH",
      "title": "점심 식사",
      "imageUrl": "https://...",
      "recordedAt": "2026-03-20T12:30:00Z",
      "kidneySafetyScore": 78,
      "totalNutrition": {
        "calories": 620,
        "proteinG": 18.5,
        "sodiumMg": 890,
        "potassiumMg": 420,
        "phosphorusMg": 310,
        "waterMl": 200,
        "carbsG": 75,
        "fatG": 22
      },
      "foods": [
        {
          "name": "잡곡밥",
          "restrictionLevel": "safe",
          "servingSize": "210g",
          "nutrition": {
            "calories": 280,
            "sodiumMg": 5,
            "potassiumMg": 110,
            "phosphorusMg": 80
          }
        },
        {
          "name": "된장찌개",
          "restrictionLevel": "caution",
          "servingSize": "300ml",
          "cautionReason": "나트륨 함량이 높습니다",
          "nutrition": {
            "calories": 85,
            "sodiumMg": 780,
            "potassiumMg": 210,
            "phosphorusMg": 95
          }
        }
      ],
      "cautionFoods": [
        { "name": "된장찌개", "reason": "나트륨 함량이 높습니다" }
      ],
      "broth": {
        "hasBroth": true,
        "brothConsumed": false
      }
    }
  ],
  "dailySummaries": [
    {
      "date": "2026-03-20",
      "totalSodiumMg": 1450,
      "totalPotassiumMg": 1200,
      "totalPhosphorusMg": 780,
      "totalProteinG": 38.5,
      "totalWaterMl": 900,
      "totalCalories": 1850,
      "mealCount": 3,
      "limitExceeded": {
        "sodium": false,
        "potassium": false,
        "phosphorus": false,
        "protein": false
      }
    }
  ]
}
```

**`mealType`:** `BREAKFAST` | `LUNCH` | `DINNER` | `SNACK`
**`restrictionLevel`:** `safe` | `caution` | `warning`

---

### 4-4. 체중/부종 기록

```
GET /api/v1/doctor/patients/{patientId}/body-records
Authorization: Bearer {doctor_jwt}
Query: ?from=2026-03-14&to=2026-03-21
```

**응답:**

```json
{
  "records": [
    {
      "date": "2026-03-20",
      "weightKg": 68.5,
      "edemaLevel": "NONE",
      "recordedAt": "2026-03-20T08:00:00Z"
    },
    {
      "date": "2026-03-19",
      "weightKg": 68.8,
      "edemaLevel": "SLIGHT",
      "recordedAt": "2026-03-19T07:45:00Z"
    }
  ]
}
```

**`edemaLevel`:** `NONE` | `SLIGHT` | `SEVERE`

---

### 4-5. 건강검진/검사 결과

환자 앱에서 NHIS 건강검진 연동(`/health-check`) 또는 검사지 사진 업로드로 수집되는 데이터.

```
GET /api/v1/doctor/patients/{patientId}/lab-results
Authorization: Bearer {doctor_jwt}
```

**응답:**

```json
{
  "results": [
    {
      "resultId": "uuid",
      "sourceType": "NHIS",
      "measuredAt": "2026-03-15T10:00:00Z",
      "values": [
        {
          "name": "크레아티닌",
          "nameEn": "Creatinine",
          "value": 1.8,
          "unit": "mg/dL",
          "status": "warning",
          "normalRange": "0.7–1.2"
        },
        {
          "name": "GFR",
          "nameEn": "GFR",
          "value": 42.0,
          "unit": "mL/min/1.73m²",
          "status": "caution",
          "normalRange": ">60"
        },
        {
          "name": "칼륨",
          "nameEn": "Potassium",
          "value": 4.5,
          "unit": "mEq/L",
          "status": "normal",
          "normalRange": "3.5–5.0"
        },
        {
          "name": "BUN",
          "nameEn": "Blood Urea Nitrogen",
          "value": 22.0,
          "unit": "mg/dL",
          "status": "caution",
          "normalRange": "8–20"
        }
      ]
    }
  ]
}
```

**`sourceType`:** `NHIS` | `MANUAL_UPLOAD`
**`status`:** `normal` | `caution` | `warning`

---

## 5. 권한 검증 규칙

모든 `/api/v1/doctor/patients/{patientId}/...` 엔드포인트는 아래를 반드시 검증:

```
doctor_patient_assignments에서
(doctor_id = JWT의 doctor_id) AND (patient_id = {patientId})
인 row가 존재하는지 확인

없으면 → 403 Forbidden
```

---

## 6. 대시보드 프론트 연동 가이드

### 현재 mock 상태인 부분

의사 대시보드가 현재 mock 데이터로 표시하고 있는 항목:
- 환자 목록 (이름, 신장 단계, 마지막 활동)
- 식사 기록 및 영양소 차트
- 체중 추이 그래프

### mock → real 전환 방법

`src/environments/environment.ts` 에서:

```typescript
// 변경 전
useMockData: true,

// 변경 후
useMockData: false,
apiUrl: '<backend-api-base-url>',
```

### 환자 목록 화면에서 표시할 핵심 정보

| 필드 | 출처 |
|------|------|
| 이름, 이메일 | `GET /doctor/patients` |
| CKD 단계 | `ckdStage` (1~5, null이면 "미입력") |
| 투석 여부 | `isDialysis` |
| 마지막 활동일 | `lastActivityAt` |
| 오늘 나트륨 섭취 | `/summary` → `todayNutrition.totalSodiumMg` |

### 환자 상세 화면 탭 구성 제안

| 탭 | API |
|----|-----|
| 오늘 요약 | `/summary` |
| 식사 기록 | `/food-logs?from=&to=` |
| 체중/부종 | `/body-records?from=&to=` |
| 검사 결과 | `/lab-results` |

---

## 7. 기존 요청과의 차이점 요약

| 항목 | 기존 요청 | 수정 내용 |
|------|----------|----------|
| 식사 기록 엔드포인트 | `GET /food-intake?patientId=` | `GET /doctor/patients/{id}/food-logs` |
| 검사 결과 엔드포인트 | FHIR 표준 `/fhir/r4/Observation` | `GET /doctor/patients/{id}/lab-results` (자체 포맷) |
| 환자 연결 엔드포인트 | `POST /api/patients/link-doctor` | `POST /api/v1/doctor/enroll` (이미 구현됨) |
| 식사 데이터 내용 | 미정 | 식품별 `restrictionLevel`, 국/찌개 국물 섭취 여부, 부종 데이터 포함 |
| kidney_stage 값 | `stage3b` 등 문자열 | `ckdStage: 3` 숫자형 (앱 기존 스키마 통일) |
| 체중/부종 | 별도 언급 없음 | `edemaLevel: NONE/SLIGHT/SEVERE` 포함 |

> FHIR은 표준이지만 이 앱의 기존 데이터 모델과 맞지 않아 오버엔지니어링입니다.
> 자체 포맷으로 구현 후 필요 시 FHIR wrapper 추가하는 방향을 권장합니다.
