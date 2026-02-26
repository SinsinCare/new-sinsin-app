# EAS 빌드 및 배포 가이드

이 문서는 Expo Application Services (EAS)를 사용하여 앱을 빌드하고 App Store 및 Play Store에 배포하는 방법을 설명합니다.

## 1. 사전 준비

- **EAS CLI 설치**: `npm install -g eas-cli`
- **Expo 로그인**: `eas login`
- **Apple/Google 개발자 계정**: 유료 등록 완료 상태여야 함

## 2. 주요 설정 파일

### `app.json`

앱의 기본 정보를 설정합니다.

- `ios.bundleIdentifier`: `com.mediology.sinsin-care`
- `android.package`: `com.mediology.sinsin_care`
- `version`: 앱 버전 (예: 1.0.0)
- `ios.buildNumber`: 빌드 번호 (업로드 시마다 증가 필요)

### `eas.json`

빌드 프로필을 정의합니다. 현재 설정:

- `development`: 개발팀 내부 테스트용 (Development Client)
- `preview`: 내부 공유 및 테스트용 (Ad-hoc)
- `production`: 스토어 배포용 (Release, `autoIncrement: true`로 버전 코드 자동 증가)

## 3. 핵심 명령어

### 프로젝트 초기 설정 (최초 1회)

```bash
eas build:configure
```

### 앱 빌드

플랫폼(`ios`, `android`, `all`)과 프로필(`production`, `preview` 등)을 선택합니다.

```bash
# iOS 프로덕션 빌드
eas build --platform ios --profile production

# Android 프로덕션 빌드
eas build --platform android --profile production
```

### 앱 제출 (App Store / Play Store)

빌드가 완료된 후 스토어 커넥트로 업로드합니다.

```bash
# 최신 iOS 빌드 제출
eas submit --platform ios --latest

# 최신 Android 빌드 제출
eas submit --platform android --latest
```

## 4. 자격 증명 (Credentials) 관리

EAS는 Apple의 배포 인증서 및 프로비저닝 프로필을 자동으로 생성하고 관리합니다.

- 빌드 과정에서 `Do you want to log in to your Apple account?` 질문에 `Yes`를 선택하고 로그인하면 EAS가 필요한 모든 설정을 자동으로 완료합니다.
- 관리되는 정보는 [Expo 대시보드](https://expo.dev)의 `Credentials` 메뉴에서 확인할 수 있습니다.

## 5. 유용한 팁

- **빌드 로그 확인**: 빌드가 시작될 때 출력되는 URL(expo.dev/...)을 통해 전 세계 어디서든 빌드 과정을 모니터링할 수 있습니다.
- **번들 ID 충돌**: 빌드 시 "Bundle identifier is not available" 에러가 발생하면, 선택한 Apple 팀에 해당 ID가 이미 등록되어 있는지 또는 다른 팀(Individual vs Company)을 선택했는지 확인하세요.
- **Node.js 버전**: `.nvmrc` 파일의 버전을 참고하여 EAS 빌드 환경이 구성됩니다.
