# Xcode 로컬 디버깅 가이드 (iPhone)

EAS 빌드와 별개로, iPhone을 Mac에 연결하여 Xcode에서 직접 로그를 보며 디버깅하는 방법입니다.

## 1. 사전 준비

- **iPhone 연결**: Mac에 USB 또는 무선으로 iPhone을 연결합니다.
- **Xcode 설치**: 최신 버전의 Xcode가 설치되어 있어야 합니다.
- **개발자 모드**: iPhone 설정 > 개인정보 보호 및 보안 > **개발자 모드**가 '켬' 상태여야 합니다.

## 2. 프로젝트 열기 및 설정

1. **Xcode 워크스페이스 열기**:
   터미널에서 아래 명령어를 실행하거나, `ios/app.xcworkspace` 파일을 Xcode로 엽니다.
   ```bash
   open ios/app.xcworkspace
   ```

2. **서명(Signing) 설정**:
   - Xcode 왼쪽 사이드바 맨 위에서 프로젝트 이름(app)을 클릭합니다.
   - **TARGETS** 항목에서 `app`을 선택합니다.
   - **Signing & Capabilities** 탭으로 이동합니다.
   - **Team**에서 `Mediology Co., Ltd.` 팀을 선택합니다. (Bundle Identifier가 `com.mediology.sinsin-care`인 것을 확인하세요.)

## 3. 실행 및 로그 확인

1. **대상 기기 선택**:
   - Xcode 상단 툴바의 재생 버튼 옆에 있는 기기 선택 목록에서 연결된 자신의 iPhone을 선택합니다.

2. **앱 빌드 및 실행**:
   - `Command + R`을 누르거나 좌측 상단의 재생(Run) 버튼을 클릭합니다.
   - 앱이 빌드되고 iPhone에서 실행됩니다.

3. **로그 확인 (Console)**:
   - Xcode 하단에 **Console** 창이 나타납니다. 만약 보이지 않는다면 상단 메뉴에서 `View > Debug Area > Activate Console`을 선택하세요.
   - 모든 네이티브 로그 및 JavaScript 로그(Metro연결 시)를 실시간으로 확인할 수 있습니다.

## 4. Metro 서버 실행 (선택 사항)

JavaScript 코드 변경사항을 바로 확인(Hot Reload)하려면 Metro 서버가 켜져 있어야 합니다. 터미널에서 아래 명령을 실행한 상태로 유지하세요.
```bash
npx expo start --dev-client
```

---

> [!TIP]
> **네이티브 코드 변경 시**: `npx expo run:ios` 명령어를 사용하면 Xcode를 수동으로 만지지 않고도 터미널에서 기기로 직접 빌드하고 실행할 수 있어 편리합니다.
