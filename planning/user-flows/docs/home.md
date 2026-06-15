# Flow: 홈 식사 기록

## 1. 목적

사용자가 홈 기록 탭에서 식사, 수분, 체중, 혈압 관련 기록을 확인하고, 음식 사진 또는 텍스트 분석 결과를 식사 기록으로 저장하게 한다.

## 2. 진입 경로

- 하단 탭의 홈 선택
- 앱 실행 후 ACTIVE 세션 복원
- 식단 분석 완료 로컬 알림 탭
- 다른 화면에서 홈으로 복귀

## 3. 선행 조건

- 사용자는 ACTIVE 계정으로 로그인되어 있어야 한다.
- 홈 route는 RootLayout auth guard를 통과해야 한다.
- 식사 분석에는 네트워크 연결과 인증 토큰이 필요하다.

## 4. 정상 경로

1. 홈 기록 탭에 진입한다.
2. 앱이 선택 날짜의 식사 분석을 조회한다.
3. 사용자가 식사 버튼을 탭한다.
4. 기록 방식에서 카메라, 갤러리, 텍스트, 건너뛰기 중 하나를 선택한다.
5. 사진 또는 텍스트 분석 API를 호출한다.
6. 분석 결과 모달을 보여준다.
7. 사용자가 결과를 확인하고 기록에 추가한다.
8. 앱이 분석 결과를 날짜와 식사 유형에 저장한다.
9. 날짜별 분석과 기록 존재 여부를 다시 조회한다.

## 5. 예외 경로

### A. 비로그인 접근

- RootLayout guard가 로그인 화면으로 이동시킨다.
- 로그인 완료 후 계정 상태에 따라 홈 또는 온보딩으로 이동한다.

### B. 카메라 또는 사진 권한 거부

- 권한 요청 실패 후 API 호출을 하지 않는다.
- 사용자는 다시 기록 방식을 선택할 수 있다.

### C. 텍스트 입력 없음

- 분석 API를 호출하지 않고 입력 오류 상태를 유지한다.

### D. 분석 실패

- Alert로 실패 메시지를 보여준다.
- 사용자는 기록 방식 선택으로 돌아가 재시도할 수 있다.

### E. 분석 중 닫기

- 사용자가 로딩 화면을 닫아도 분석 작업은 계속될 수 있다.
- 완료 시 pending store에 결과를 저장하고 로컬 알림 이력을 남긴다.
- 사용자가 알림을 탭하면 홈으로 이동하고 pending 결과 모달을 연다.

### F. 기록 저장 실패

- 분석 결과 모달을 유지한다.
- 사용자는 다시 기록 추가를 시도할 수 있다.

### G. 식사 건너뛰기 실패

- 임시 기록 상태를 되돌리고 오류 Alert를 보여준다.

## 6. 연결 정보

- Flow YAML: `flows/home.flow.yaml`
- Main route: `/(tabs)/home`
- Main APIs:
  - `API_GET_DATE_ANALYSIS`
  - `API_ANALYZE_FOOD_IMAGE`
  - `API_ANALYZE_FOOD_TEXT`
  - `API_CREATE_FOOD_DIARY`
  - `API_SKIP_MEAL`
  - `API_GET_DIARY_ANALYSIS`
  - `API_UPDATE_FOOD_ANALYSIS`
- Main permissions:
  - `PERM_CAMERA`
  - `PERM_PHOTO_LIBRARY`
- Main events:
  - `home_record_viewed`
  - `food_record_started`
  - `food_analysis_started`
  - `food_analysis_succeeded`
  - `food_analysis_failed`
  - `food_record_saved`
  - `food_record_save_failed`
