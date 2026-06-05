# EAS Android 연결 가이드 (Play Console 권한 이전 후)

이 문서는 **Google Play Console 앱 권한(소유권) 이전이 끝난 뒤**, EAS로
Android 빌드 + Play Store 자동 제출을 연결하는 절차를 정리합니다.

> 참고: iOS 자동 배포 전체 흐름은 [`eas.md`](./eas.md) 참고.
> 이 문서는 **Android 전용 연결 작업**만 다룹니다.

---

## 0. 현재 상태 (2026-05-30 기준)

| 항목 | 상태 |
| --- | --- |
| `eas.json` submit.production.android | ✅ 설정 완료 (`serviceAccountKeyPath: ./google-play-key.json`, track `production`, releaseStatus `completed`) |
| `app.json` android.package | ✅ `com.mediology.sinsinapp` |
| 버전/빌드번호 | ✅ EAS remote 관리 (`appVersionSource: remote`, `autoIncrement: true`) → `versionCode` 자동 증가 |
| **Android EAS 빌드 이력** | ✅ **있음** (versionCode 3까지 `store` distribution으로 성공) → 빌드는 이미 정상 |
| **Android keystore (앱 서명 키)** | ✅ **이미 EAS에 등록됨** (빌드 이력이 있다는 건 keystore가 있다는 뜻) |
| **`google-play-key.json` (서비스 계정 키)** | ❌ **없음 — 이게 유일하게 빠진 부분. 2·3절에서 발급** |

➡️ **결론: 빌드는 이미 잘 됩니다. 권한 이전 후 빠진 단 하나는 "자동 *제출*용 Google Play 서비스 계정 JSON 키"입니다.**
이 키만 발급해서 `google-play-key.json`으로 저장하고 Play 권한을 부여하면 `npm run deploy:android` 한 줄로 빌드+제출이 끝납니다.

> 그 전까지는 **빌드만 하고 AAB를 콘솔에 수동 업로드**하는 것도 가능:
> `eas build --platform android --profile production` → 완료된 AAB 다운로드 → Play Console에 수동 업로드.

---

## 1. 사전 조건 — Play Console 권한 이전이 *먼저* 끝나야 함

서비스 계정 연결은 **앱이 최종 소유 계정(이전받는 쪽)에 귀속된 상태**에서 해야
꼬이지 않습니다. 따라서 순서는:

1. **Play Console 앱 권한(소유권) 이전 완료** ← 지금 진행 중
2. 이전받은 Play Console 계정으로 로그인되는지 확인
3. 그 계정에서 아래 2~3절 진행

> ⚠️ 이전 *중*에 서비스 계정을 만들면, 이전 후 프로젝트가 바뀌면서
> 키가 무효화될 수 있습니다. **이전 완료 후** 진행하세요.

---

## 2. Google Cloud 서비스 계정 + JSON 키 발급

`eas submit`이 Play Console에 **비대화형으로 AAB를 업로드**하려면 서비스 계정 키가 필요합니다.

### 2-1. Play Console ↔ Google Cloud 프로젝트 연결 확인
1. **Play Console** → 왼쪽 하단 **설정(Settings)** → **API 액세스(API access)**
   (또는 `사용자 및 권한`)
2. 연결된 **Google Cloud 프로젝트**가 있는지 확인.
   - 없으면 "프로젝트 연결/생성"으로 새 GCP 프로젝트 연결.
   - (참고: 기존 GCP 프로젝트는 `sinsin-486209` — 단, Play용은 별개일 수 있으니 화면 안내를 따를 것)

### 2-2. 서비스 계정 생성 + JSON 키 다운로드
1. **Play Console → 설정 → API 액세스** 화면에서
   **"새 서비스 계정 만들기(Create new service account)"** 클릭 →
   안내되는 **Google Cloud Console** 링크로 이동.
2. Google Cloud Console → **IAM 및 관리자 → 서비스 계정 → 서비스 계정 만들기**.
   - 이름 예: `eas-play-publisher`
   - 역할은 일단 비워도 됨(권한은 Play Console에서 따로 부여 — 3절).
3. 생성된 서비스 계정 → **키(Keys) 탭 → 키 추가 → 새 키 만들기 → JSON** → 다운로드.
   - 이 `.json` 파일이 업로드 인증 키입니다. **재다운로드 불가**이니 잘 보관.

### 2-3. 키 파일을 프로젝트에 배치
다운로드한 파일을 프로젝트 루트에 **정확히 이 이름**으로 저장:

```bash
# 다운로드 폴더의 키 파일을 프로젝트 루트로 이동 (파일명 예시는 상황에 맞게)
mv ~/Downloads/<다운로드된-키>.json \
   /Users/daeseongkim/mediology/sinsin-rn/google-play-key.json
```

- ✅ `.gitignore`에 **이미 등록**되어 있어 커밋되지 않습니다 (`google-play-key.json`).
  **절대 git에 커밋하지 마세요.**
- `eas.json`의 `submit.production.android.serviceAccountKeyPath`가
  이 경로(`./google-play-key.json`)를 가리킵니다 → **추가 설정 불필요.**

---

## 3. Play Console에서 서비스 계정에 권한 부여

키만으로는 안 되고, 그 서비스 계정 이메일에 **업로드/출시 권한**을 줘야 합니다.

1. **Play Console → 사용자 및 권한(Users and permissions) → 사용자 초대**
2. 2절에서 만든 서비스 계정 이메일
   (`...@....iam.gserviceaccount.com` 형태) 입력.
3. 권한 부여:
   - 앱 권한: 대상 앱(`com.mediology.sinsinapp`) 선택
   - 최소 권한: **"프로덕션 출시 관리(Release to production)"** + **"앱 정보 보기"**
   - (간단히 하려면 **"관리자(모든 권한)"**로 줘도 됨)
4. 저장 후 권한 반영까지 몇 분 걸릴 수 있음.

> ⚠️ **첫 AAB는 콘솔에 이미 올라가 있어야 API 업로드가 됩니다.**
> 이 앱(`com.mediology.sinsinapp`)은 이미 수동 업로드 이력이 있으므로
> (versionCode 11까지 출시) 이 조건은 **충족**된 상태입니다.
> → 권한 이전 후에도 앱이 그대로 남아 있으면 바로 API 업로드 가능.

---

## 4. Android 앱 서명 키(keystore) — 이미 EAS에 등록됨 ✅

이 프로젝트는 **이미 EAS로 Android 빌드를 성공**한 이력이 있으므로
(versionCode 3까지 `store` 빌드 완료), **업로드 keystore가 EAS 서버에 이미 있습니다.**
새로 만들 필요 없습니다.

확인/관리가 필요할 때만:
```bash
eas credentials -p android
# → production → Keystore 메뉴에서 현재 keystore SHA-1 등 확인 가능
```

> ⚠️ **권한 이전과 keystore의 관계 — 중요**
> Play Console 권한 이전을 하더라도 **앱 서명 키 자체는 그대로 유지**됩니다
> (소유 계정만 바뀜). 따라서:
> - 같은 앱(`com.mediology.sinsinapp`)이 이전 후에도 유지되면 → **기존 EAS keystore
>   그대로 사용 가능. 추가 작업 없음.**
> - 만약 이전이 아니라 **새 패키지로 신규 등록**하는 식이면 → Play App Signing
>   업로드 키 SHA-1을 콘솔과 맞춰야 함. 이땐 `eas credentials -p android`에서
>   현재 SHA-1을 확인해 Play Console(설정 → 앱 무결성 → 앱 서명)의 업로드 키와 비교.

---

## 5. 연결 검증 → 빌드 → 제출

키 배치(2절) + 권한 부여(3절)가 끝나면:

```bash
# 5-1. Android 프로덕션 빌드 + 자동 제출 (권장)
npm run deploy:android
# = eas build --platform android --profile production --auto-submit

# 또는 빌드만 먼저 (제출 분리)
eas build --platform android --profile production
# 빌드 성공 후 최신 빌드만 제출
npm run submit:android   # = eas submit --platform android --latest
```

- keystore는 이미 EAS에 등록돼 있어 빌드는 추가 프롬프트 없이 진행됩니다.
- 빌드 완료 후 EAS가 `google-play-key.json`으로 Play `production` 트랙에
  AAB를 자동 업로드 → 콘솔에서 출시 검토/롤아웃.

### iOS + Android 동시 배포 (연결 완료 후)
```bash
npm run deploy        # = eas build --platform all --profile production --auto-submit
```

---

## 6. 체크리스트 (권한 이전 후 순서대로)

- [ ] Play Console 앱 권한 이전 **완료** 확인
- [ ] (필요 시) Play ↔ Google Cloud 프로젝트 연결 확인
- [ ] 서비스 계정 생성 + **JSON 키 다운로드**
- [ ] 키를 `프로젝트루트/google-play-key.json`로 저장 (커밋 금지 — .gitignore 등록됨)
- [ ] Play Console에서 그 서비스 계정에 **출시 권한** 부여
- [ ] `npm run deploy:android` 실행 (keystore는 이미 등록돼 있어 그대로 진행됨)
- [ ] (이전이 아닌 신규 패키지일 때만) keystore SHA-1 ↔ Play 업로드 키 일치 확인 (4절)
- [ ] Play Console에서 프로덕션 출시 검토/롤아웃

---

## 7. 트러블슈팅

| 증상 | 원인 / 해결 |
| --- | --- |
| `The caller does not have permission` (제출 시) | 서비스 계정에 Play 권한 미부여/반영 지연 → 3절 재확인, 몇 분 대기 |
| `APK/AAB ... not allowed to be a downgrade` / `Version code already used` | `autoIncrement`로 **새 빌드를 먼저** 만들어야 함(같은 versionCode 재업로드 불가) |
| `Package not found` / 앱을 못 찾음 | 권한 이전이 미완료거나, 이전으로 패키지 귀속이 바뀜 → 이전 완료 후 재시도 |
| 첫 API 업로드 실패 (아직 콘솔에 빌드 없음) | 신규 앱은 최초 1개 AAB 수동 업로드 필요 (이 앱은 이미 출시 이력 있어 해당 없음) |
| keystore SHA-1 불일치로 Play가 거부 | 4절 — 기존 .jks를 EAS에 등록하거나 Play에서 업로드 키 재설정 |
| `serviceAccountKeyPath` 파일 없음 | `google-play-key.json`이 루트에 있는지, 파일명 정확한지 확인 |

---

## 부록. 참고 값

- Android package: `com.mediology.sinsinapp`
- Play Console 관리 계정(기존): `healthierwith@gmail.com`
- 기존 GCP 프로젝트: `sinsin-486209` (Play 연결 프로젝트는 화면 안내 기준으로 확인)
- EAS 프로젝트: `@sinsin-care/sinsin-rn` (projectId `40c02a9a-5bfa-42f1-84db-85faa562f011`)
- 제출 트랙/상태: `production` / `completed` (즉시 100% 롤아웃 — 단계적 출시 원하면
  `eas.json`의 `releaseStatus`를 `draft`/`inProgress`로 변경하고 `rollout` 조정)
