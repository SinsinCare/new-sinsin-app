# Flow: 알림 설정 및 알림 진입

## 1. 목적

사용자가 알림 이력을 확인하고, 아침 확인, 물 알림, 식사 기록 알림을 설정하며, 식단 분석 완료 알림을 통해 홈으로 복귀하게 한다.

## 2. 진입 경로

- 홈 헤더 알림 아이콘 탭
- 알림함에서 알림 설정 탭
- 설정 화면에서 알림 설정 진입
- 식단 분석 완료 로컬 알림 탭

## 3. 선행 조건

- 알림함과 알림 설정은 로그인된 ACTIVE 사용자만 접근한다.
- 알림을 실제로 예약하려면 OS 알림 권한이 필요하다.
- 서버 알림 설정 API가 실패해도 로컬 설정 저장은 유지될 수 있다.

## 4. 정상 경로

1. 사용자가 알림 설정 화면에 진입한다.
2. 앱이 서버 알림 설정을 조회한다.
3. 서버 실패 시 로컬 캐시 또는 기본값을 사용한다.
4. 사용자가 알림을 켠다.
5. OS 알림 권한을 요청한다.
6. 권한이 허용되면 설정을 저장한다.
7. expo-notifications로 로컬 알림을 스케줄링한다.

## 5. 예외 경로

### A. 알림 권한 거부

- 알림 스케줄링을 하지 않는다.
- 설정 화면은 계속 사용할 수 있다.
- 권한 거부 이벤트를 남긴다.

### B. 서버 설정 조회 실패

- AsyncStorage 캐시가 있으면 캐시를 사용한다.
- 캐시가 없으면 기본 알림 설정을 사용한다.

### C. 서버 저장 실패

- 로컬 저장은 유지한다.
- 서버 동기화 실패는 오류 상태로 기록한다.

### D. 식단 분석 완료 알림 탭

- 앱은 `/(tabs)/home`으로 이동한다.
- 홈 기록 탭은 pending 분석 결과를 자동으로 모달에 표시한다.

## 6. 연결 정보

- Flow YAML: `flows/notification.flow.yaml`
- Main routes:
  - `/(settings)/notifications`
  - `/(settings)/notification-settings`
  - `/(tabs)/home`
- Main APIs:
  - `API_GET_NOTIFICATION_SETTINGS`
  - `API_UPDATE_NOTIFICATION_SETTINGS`
- Main permission:
  - `PERM_NOTIFICATION`
- Main events:
  - `notification_settings_viewed`
  - `notification_permission_requested`
  - `notification_permission_denied`
  - `notification_settings_saved`
  - `notification_opened`
