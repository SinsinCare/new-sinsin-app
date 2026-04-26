# Backend TODO — 2026-03-21

프론트 구현 완료 기준, 백엔드 작업이 필요한 항목입니다.

---

## 🔴 긴급 (현재 기능 동작 안 함)

### 1. `PATCH /api/v1/user/profile/kidney` 필드 추가

**현황:** 앱 신장 프로필 수정 화면에서 CKD 병기·투석 여부·체중·키를 입력받지만, 현재 API가 영양소 제한값만 받아서 저장이 안 됨. 온보딩에서만 저장 가능한 상태.

**요청:** 아래 필드 추가

```json
{
  "ckdStage": 3,
  "isDialysis": false,
  "weightKg": 65.0,
  "heightCm": 172.0
}
```

---

### 2. `GET /api/v1/user/profile` 응답에 `gender` 필드 누락

**현황:** 온보딩·회원가입에서 성별을 입력받지만 프로필 조회 응답에 포함되지 않아 앱 마이페이지에 성별이 표시 안 됨.

**요청:** 응답 `result`에 `gender: "male" | "female"` 추가

```json
{
  "result": {
    "email": "...",
    "nickName": "...",
    "name": "...",
    "gender": "male",       // 추가 필요
    "birthYear": 1995,
    "birthMonth": 6,
    "birthDay": 15,
    "accountState": "ACTIVE"
  }
}
```

---

## 🟡 중요 (핵심 기능 미완성)

### 3. 건강검진 이미지 분석 API

**현황:** 검사 결과 사진 업로드 UI(최대 5장)가 완성돼 있지만, 이미지를 분석해서 수치를 추출하는 엔드포인트가 없음.

**요청:** 신규 엔드포인트 추가

```
POST /api/v1/user/exam-results/analyze
Content-Type: multipart/form-data

images: File[]

Response:
{
  "result": [
    { "examName": "크레아티닌", "examValue": "1.8", "unit": "mg/dL", "measuredAt": "2026-03-15" }
  ]
}
```

---

### 4. `GET /api/v1/restaurants/nearby` 필터 파라미터 추가

**현황:** 현재 `lat`, `lng`, `radius`, `cuisineType` 파라미터만 있음. 앱 필터 UI에서 지역·음식 종류·영양소(저염·저당·저칼륨 등) 3가지 필터를 지원하는데 백엔드 연동이 안 돼서 Mock 데이터로만 동작 중.

**요청:** 쿼리 파라미터 추가 및 응답 스키마 확정

```
GET /api/v1/restaurants/nearby
  ?lat=37.5
  &lng=127.0
  &radius=2000
  &cuisineType=한식        // 기존
  &region=마포구           // 추가
  &nutrientTag=저염        // 추가 (저염·저당·저칼륨·저인 등)
```

응답에 아래 필드 포함 필요:

```json
{
  "result": [
    {
      "id": "r1",
      "name": "초록김밥",
      "tags": ["한식", "저염", "저당"],
      "address": "마포구 성산동 123",
      "rating": 4.5,
      "reviewCount": 120,
      "distance": "350m",
      "latitude": 37.501,
      "longitude": 127.028,
      "images": ["https://..."]
    }
  ]
}
```

---

## 🟢 낮음 (추후 개선)

### 5. 신장 프로필 동반 질환 필드

**현황:** 앱 신장 프로필 카드에 동반 질환 표시 영역이 있지만 하드코딩("당뇨병", "고혈압", "사구체신염") 중.

**요청:** `GET /api/v1/user/profile/kidney` 응답에 `comorbidities: string[]` 추가, `PATCH`에도 수정 가능하도록 포함.

---

### 6. 1:1 문의 이미지 첨부

**현황:** 앱에서 문의 작성 시 사진 3장까지 첨부 가능한 UI가 있지만, `POST /api/v1/user/inquiries`가 텍스트만 받음 (`subject`, `content`).

**요청:** `multipart/form-data` 지원 또는 이미지 URL 배열 필드 추가

```json
{
  "subject": "...",
  "content": "...",
  "imageUrls": ["https://..."]   // 추가
}
```
