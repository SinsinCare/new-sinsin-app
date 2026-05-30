# EAS 빌드 및 배포 가이드

이 문서는 EAS(Expo Application Services)로 앱을 **CLI 명령어 하나로** 빌드하고
App Store / Play Store에 자동 제출하는 방법을 설명합니다.

> 기존: iOS는 로컬 빌드 → Xcode Archive → App Store Connect 수동 업로드,
> Android는 AAB 수동 업로드.
> 현재: 클라우드 빌드 + 스토어 자동 제출(`eas build --auto-submit`)로 전환.

---

## 0. TL;DR — 한 줄 배포

```bash
# iOS + Android 동시 빌드 후 각 스토어로 자동 제출
npm run deploy
# = eas build --platform all --profile production --auto-submit
```

- 버전(`version`)은 `app.json` 한 곳에서만 관리 → iOS/Android 동일하게 적용.
- 빌드번호(iOS `buildNumber`) / `versionCode`는 `eas.json`의
  `appVersionSource: "remote"` + `autoIncrement: true` 설정으로 **EAS가 자동 증가**.
  (`app.json`의 `ios.buildNumber` / `android.versionCode` 값은 무시됨 — 건드릴 필요 없음)

플랫폼별 개별 배포:

```bash
npm run deploy:ios       # iOS만 빌드 + 제출
npm run deploy:android   # Android만 빌드 + 제출
```

이미 만들어진 최신 빌드만 다시 제출:

```bash
npm run submit:ios       # eas submit --platform ios --latest
npm run submit:android   # eas submit --platform android --latest
```

---

## 1. 사전 준비 (최초 1회)

- EAS CLI: `npm install -g eas-cli` (현재 설치됨)
- 로그인: `eas login` (현재 `lemonaatree@gmail.com` 로그인됨)
- Apple Developer / Google Play 개발자 계정 유료 등록 완료
- **자동 제출용 인증키 2종** 발급 (아래 4·5절) — 이게 있어야 `--auto-submit`이
  중간에 멈추지 않고 완전 자동으로 끝납니다.

---

## 2. 현재 설정 요약

### `app.json`
- `version`: **1.0.12** (마케팅 버전 — 릴리스마다 여기만 올리면 됨)
- `ios.bundleIdentifier`: `com.mediology.sinsin-care`
- `android.package`: `com.mediology.sinsinapp`

### `eas.json`
- `cli.appVersionSource`: `remote` → 빌드번호를 EAS 서버가 관리
- `build.production.autoIncrement`: `true` → 빌드마다 번호 자동 +1
- `submit.production.ios`: `ascAppId` / `appleId` / `appleTeamId` 설정됨
- `submit.production.android`:
  - `serviceAccountKeyPath`: `./google-play-key.json`
  - `track`: `production`
  - `releaseStatus`: `completed`

---

## 3. 핵심 명령어 상세

```bash
# 빌드만 (제출 안 함)
eas build --platform ios     --profile production
eas build --platform android --profile production
eas build --platform all     --profile production

# 빌드 + 자동 제출 (권장)
eas build --platform all --profile production --auto-submit

# 원격 버전(빌드번호) 확인
eas build:version:get --platform ios
eas build:version:get --platform android
```

빌드 시작 시 출력되는 `https://expo.dev/...` URL에서 진행 상황·로그를 볼 수 있습니다.

---

## 4. Android 자동 제출 키 (Google Play 서비스 계정)

`eas submit`이 Play Console에 비대화형으로 업로드하려면 서비스 계정 JSON 키가 필요합니다.

1. **Google Play Console** → `Users and permissions`(또는 `설정 → API 액세스`)
   → Google Cloud 프로젝트 연결.
2. **Google Cloud Console** → `IAM 및 관리자 → 서비스 계정`에서 서비스 계정 생성
   → 키 추가 → **JSON** 다운로드.
3. 다운로드한 파일을 프로젝트 루트에 **`google-play-key.json`** 이름으로 저장.
   - 이미 `.gitignore`에 등록되어 있어 커밋되지 않습니다. (절대 커밋 금지)
   - `eas.json`의 `serviceAccountKeyPath`가 이 경로를 가리킵니다.
4. **Play Console → Users and permissions**에서 그 서비스 계정 이메일을 초대하고
   "프로덕션 출시(Release to production)" 권한 부여.
5. ⚠️ Play Console에 해당 앱(`com.mediology.sinsinapp`)이 이미 등록돼 있어야 API
   업로드가 됩니다. 신규 앱의 **최초 1개 AAB는 콘솔에서 수동 업로드** 필요
   (이미 수동 업로드 이력이 있으므로 통과).

설정 후:
```bash
npm run deploy:android
```

---

## 5. iOS 자동 제출 키 (App Store Connect API Key)

키 없이도 제출은 되지만, 그때마다 Apple ID 로그인/앱 암호를 **대화형으로 물어봅니다.**
완전 자동화하려면 ASC API 키를 등록하세요.

1. **App Store Connect** → `Users and Access → Integrations → App Store Connect API`
   → 키 생성 (역할: `App Manager` 이상).
2. **`.p8` 키 파일**(1회만 다운로드 가능) + **Key ID** + **Issuer ID** 확보.
3. EAS 서버에 등록 (권장 — 경로 노출 없이 안전):
   ```bash
   eas credentials --platform ios
   # → Build/Submit credentials → App Store Connect API Key → Set up new key
   ```
   등록해 두면 `eas submit`이 자동으로 이 키를 사용합니다.

> 키 등록 전에는 `npm run deploy:ios` 실행 시 Apple ID(`sht06202@naver.com`)
> 로그인 프롬프트가 한 번 뜹니다 — 거기서 로그인하면 그대로 제출 진행됩니다.

---

## 6. 릴리스 절차 (요약)

1. 코드 변경 완료.
2. `app.json`의 `version` 올리기 (예: 1.0.12 → 1.0.13). 빌드번호는 자동.
3. `npm run deploy` 실행.
4. 빌드 완료 후 EAS가 자동으로 양 스토어에 제출.
5. App Store Connect / Play Console에서 심사 제출 및 출시 확인.

---

## 7. 트러블슈팅

- **`appVersionSource: remote`라 `app.json`의 buildNumber/versionCode가 무시된다는 경고**
  → 정상입니다. EAS가 번호를 관리하므로 무시해도 됩니다.
- **Android "Version code already used"**
  → `autoIncrement`로 새 빌드를 먼저 만들어야 합니다(같은 빌드 재제출 불가).
- **"Bundle identifier is not available"**
  → 선택한 Apple 팀(`HJJNV9Y5W8`)에 `com.mediology.sinsin-care`가 맞는지 확인.
- **첫 Android API 업로드 실패**
  → 서비스 계정 권한/앱 등록 여부(4절 4·5번) 확인.
