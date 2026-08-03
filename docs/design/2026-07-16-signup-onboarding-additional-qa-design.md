# 회원가입·온보딩 추가 QA 구현 설계

- Task: `DEV-20260716-012`
- 대상: `sinsin-rn`, `sinsin-be-legacy-py`
- 기준 브랜치: 각 저장소 `develop`
- 출시 순서: test 서버/테스트 앱 검증 후 production 별도 승인
- Figma: [신신당부 UIUX 6063:45631](https://www.figma.com/design/ZdI7n74n3PCudGT0nmYgCq/%EC%8B%A0%EC%8B%A0%EB%8B%B9%EB%B6%80-UIUX?node-id=6063-45631)
- 이 문서는 구현 승인 전 설계이며 앱·API 코드는 변경하지 않는다.

## 1. 결정 요약

1. 유입경로는 사용자가 지정한 10개 항목과 순서를 단일 상수로 고정한다. 새 저장값은 `HOSPITAL`, `DANGGEUN_COMMUNITY`를 사용하고 백엔드 허용 목록과 관리자 지표 한글 라벨도 함께 확장한다.
2. 이메일 인증번호 전송은 현재 두 번의 순차 요청을 한 번으로 줄인다. 기존 OTP 발송 API가 이미 이메일 중복·소셜 전용 계정을 검사하므로 백엔드 신규 API는 필요 없다.
3. 온보딩 질문 헤더는 빈 부제목을 렌더링하지 않고, 부제목 유무별 간격을 공통 컴포넌트에서 관리한다. 특정 질문 문자열을 기준으로 예외 처리하지 않는다.
4. 온보딩 제출 성공 직후 Figma 기반 완료 화면을 표시한다. 문구는 사용자의 확정대로 `회원가입이 완료되었습니다!`, CTA는 `신신당부 시작하기`를 사용한다.
5. 파티클은 `회원가입_파티클_2.gif`를 사용한다. 기존 `expo-image`로 iOS와 Android에서 동일하게 재생하고 새 비디오 의존성은 추가하지 않는다.

## 2. 유입경로 선택지

### 표시 순서와 저장 계약

| 순서 | 화면 표시       | 저장값               |
| ---: | --------------- | -------------------- |
|    1 | 앱스토어 검색   | `APP_STORE`          |
|    2 | 병원            | `HOSPITAL`           |
|    3 | 블로그          | `BLOG`               |
|    4 | 네이버 카페     | `NAVER_CAFE`         |
|    5 | 당근 커뮤니티   | `DANGGEUN_COMMUNITY` |
|    6 | 카카오톡        | `KAKAO`              |
|    7 | 유튜브          | `YOUTUBE`            |
|    8 | 인스타그램      | `INSTAGRAM`          |
|    9 | 지인추천        | `FRIEND`             |
|   10 | 기타(직접 입력) | `OTHER`              |

### 구현 범위

- RN
  - `src/features/auth/data/acquisitionSources.ts`의 옵션 순서를 위 표와 동일하게 변경한다.
  - `src/types/auth.ts`, `src/stores/signupStore.ts`에 두 저장값을 추가한다.
  - 이메일 가입과 소셜 가입의 `ProfileSetupScreen`이 같은 상수를 사용하므로 두 흐름이 동일한 목록을 보게 한다.
  - `OTHER`일 때만 직접 입력 필드를 표시하고 공백 제거 후 필수 검증한다.
- BE
  - `app/core/acquisition_source.py`의 허용값과 정규식에 두 저장값을 추가한다.
  - 관리자 `acquisitionSource` 분포의 한글 라벨에 `병원`, `당근 커뮤니티`를 추가한다.
  - DB 컬럼은 `String(20)`이며 `DANGGEUN_COMMUNITY`는 19자이므로 스키마 마이그레이션은 필요 없다.
  - 기존 저장값과 기존 사용자 행은 수정하지 않는다.

### 수용 기준

- 선택지는 표의 순서와 문구로만 표시된다.
- 신규 두 항목으로 이메일·소셜 가입을 각각 완료할 수 있다.
- `OTHER`는 직접 입력이 없으면 제출할 수 없고, 다른 값에서는 `acquisitionSourceOther=null`로 저장된다.
- 관리자 유입경로 지표에 신규 값이 영문 코드가 아닌 한글로 표시된다.

## 3. 이메일 인증번호 전송 지연

### 현재 원인

`useSignupEmail.sendCode()`는 다음 요청을 순차 실행하고 두 요청이 모두 끝난 뒤 인증번호 입력창을 표시한다.

1. `GET /api/v1/auth/signup/email/verify`
2. `POST /api/v1/auth/signup/email/otp/send`

인위적인 1초 타이머는 없다. 지연은 두 번의 네트워크 왕복과 동기식 메일 발송 대기 시간의 합이다. 백엔드의 `AuthService.send_code()`는 2번 요청 안에서 이미 `verify_email()`을 호출하므로 1번 사전 확인은 중복이다.

### 변경안

- RN은 `POST /signup/email/otp/send`만 호출한다.
- POST 결과를 다음과 같이 매핑한다.
  - 성공: 인증번호 입력창 표시 및 3분 타이머 시작
  - `AUTH_ERROR_009`: 기존 소셜 계정 연결 안내 모달 표시
  - `SIGNUP_ERROR_001`: 기존 중복 이메일 안내 표시
  - 기타 오류: 현재 전송 실패 메시지 유지
- 누르는 즉시 버튼을 disabled/loading 상태와 `전송 중...` 라벨로 바꿔 터치 반응은 한 프레임 안에 보이게 한다.
- 인증번호 입력창은 실제 발송 성공 응답 후 표시한다. 실패할 수 있는 발송을 성공처럼 낙관적으로 표시하지 않는다.

### 기대 효과와 한계

- 실제 요청 수가 2개에서 1개로 줄어 한 번의 RTT와 중복 DB 조회가 제거된다.
- SMTP 발송은 현재 백엔드 요청 안에서 동기 실행되므로 그 시간은 남는다.
- 이 변경 후에도 지연이 큰 경우에만 메일 큐/비동기 발송을 별도 백엔드 과제로 검토한다. 비동기화는 API가 성공했지만 실제 메일이 실패하는 계약을 새로 다뤄야 하므로 이번 QA에 섞지 않는다.

### 수용 기준

- 신규 이메일의 최초 전송 시 네트워크 요청은 OTP POST 한 건이다.
- 소셜 전용 이메일의 계정 연결 안내와 일반 중복 이메일 차단 동작은 기존과 같다.
- 연속 탭으로 중복 요청이 발생하지 않는다.
- test 서버에서 탭부터 loading 표시까지 100ms 이내이며, 기존 대비 전체 응답 시간이 한 번의 네트워크 왕복만큼 단축된다.

## 4. 온보딩 질문과 선택지 간격

### 현재 원인

백엔드 CKD 질문 6, 7, 8은 `subTitle=null`이다. RN은 부제목이 비어 있어도 부제목 `Text`와 `marginBottom={32}`를 항상 렌더링한다. 제목 자체의 `marginBottom={8}`까지 더해져 질문과 선택지 사이에 불필요한 빈 공간이 남는다.

### 변경안

- `src/features/onboarding/components/OnboardingQuestionHeader.tsx`를 추가해 제목과 선택지 사이 규칙을 한 곳에서 관리한다.
- `subTitle?.trim()`이 있을 때만 부제목을 렌더링한다.
- 간격 규칙은 v2 spacing token으로 고정한다.
  - 제목 → 부제목: `spacing[8]`
  - 부제목 → 선택지: `spacing[24]`
  - 부제목 없음: 제목 → 선택지 `spacing[24]`
- 질문 문구나 step 번호를 기준으로 한 특례는 만들지 않는다. 따라서 요청한 두 질문과 같은 형태의 `외식은 얼마나 자주 하시나요?`도 함께 일관되게 수정된다.

### 수용 기준

- 질문 6, 7, 8의 제목과 첫 선택지 간격이 모두 24px이다.
- 실제 부제목이 있는 질문은 제목-부제목 8px, 부제목-첫 선택지 24px이다.
- 빈 문자열, 공백 문자열, `null` 모두 부제목 없음으로 처리한다.

## 5. 회원가입 완료 화면

### 흐름

```text
마지막 온보딩 답변 완료
  -> POST /user/onboarding 성공
  -> accountState ACTIVE 반영
  -> onboarding phase = complete
  -> 회원가입 완료 화면 표시
  -> 사용자가 신신당부 시작하기 탭
  -> /(tabs)/home replace
```

- 제출 실패 시 완료 화면으로 넘어가지 않고 기존 오류 메시지와 재시도 경로를 유지한다.
- 완료 화면에서는 iOS 뒤로가기 제스처와 Android 하드웨어 뒤로가기를 모두 차단한다.
- 앱이 완료 화면에서 강제 종료된 경우 서버 계정 상태는 이미 `ACTIVE`이므로 다음 실행은 홈으로 진입한다. 완료 화면 재노출을 위한 별도 영속 플래그는 만들지 않는다.
- 이메일 가입의 기존 가입 완료 화면을 온보딩 앞에서 다시 보여주면 완료 화면이 두 번 노출된다. 구현 시 이메일 가입도 계정 생성 후 바로 온보딩으로 보내고, 완료 화면은 이메일·소셜 가입 모두 온보딩 뒤 한 번만 표시한다. 기존 `signup-complete` 라우트는 이전 버전/중단 세션 호환을 위해 즉시 삭제하지 않고 온보딩으로 연결한다.

### 화면 사양

- Figma node `6063:45631`의 구성을 따른다.
- 배경: v2 `background.default`
- 제목: `회원가입이\n완료되었습니다!`
- CTA: `신신당부 시작하기`
- 하단 CTA: `V2BottomCTA`, 단일 56px XL brand fill 버튼, 좌우 20px, safe-area 포함
- 제목과 CTA는 파티클보다 위 레이어에 둔다.
- 완료 화면은 onboarding feature가 소유한다.
  - `src/features/onboarding/components/OnboardingCompletionContent.tsx`
  - 상태·전환은 `src/features/onboarding/hooks/useOnboarding.ts`
  - `app/onboarding.tsx`는 현재처럼 얇은 route wrapper로 유지한다.

### 파티클 에셋 결정

| 항목      |                                                  MOV |                                  GIF |
| --------- | ---------------------------------------------------: | -----------------------------------: |
| 파일      |                              `회원가입_파티클_1.mov` |              `회원가입_파티클_2.gif` |
| 크기      |                                      8,194,079 bytes |                        877,324 bytes |
| 화면      |                                            1080×1080 |                            1080×1080 |
| 길이      |                                                3.0초 |                                2.7초 |
| 프레임    |                                            확인 불가 |              90프레임, 프레임당 30ms |
| 투명 배경 |                                  Animation 계열 원본 |                                 있음 |
| 앱 적합성 | Android 및 현재 AVFoundation 디코딩을 보장할 수 없음 | `expo-image`가 iOS/Android 모두 지원 |

GIF를 선택한다.

- `expo-image`의 local asset source로 로드하고 `pointerEvents="none"`인 absolute overlay로 배치한다.
- GIF 메타데이터가 무한 반복(`loop=0`)이므로 화면에서는 약 2.7초 한 번 재생 후 `stopAnimating()`으로 멈춘다.
- OS의 Reduce Motion이 켜져 있으면 `autoplay={false}`로 파티클을 재생하지 않는다.
- 이미지 로딩 실패가 CTA와 화면 진입을 막지 않게 한다.
- 새 `expo-video`/`expo-av` 의존성은 추가하지 않는다.
- 에셋은 현재 기준 브랜치 checkout에서 아직 untracked 상태이므로 구현 task가 해당 GIF만 명시적으로 포함한다. MOV는 사용자가 삭제하며 앱 코드와 번들에서 참조하지 않는다.

### 분석 이벤트

- `onboarding_completion_viewed`: 완료 화면이 실제 노출됨
- `onboarding_completion_cta_pressed`: 사용자가 `신신당부 시작하기`를 눌러 홈으로 이동함
- 이벤트 속성은 두 이벤트 모두 비워 개인정보 및 온보딩 답변이 전송되지 않게 한다.
- `src/features/analytics/events.ts`와 `planning/user-flows/registry/events.yaml`을 함께 갱신한다.

## 6. 구현 패키지와 순서

### A. sinsin-be-legacy-py

1. 유입경로 허용값·정규식 추가
2. 관리자 지표 한글 라벨 추가
3. auth/user schema 및 관리자 metric 테스트 보강
4. test 서버 배포와 health 확인

### B. sinsin-rn (A의 test 배포 후)

1. 유입경로 상수·타입·store 갱신
2. 이메일 OTP 사전 GET 제거 및 POST 오류 매핑
3. 공통 온보딩 질문 헤더 적용
4. 완료 phase·완료 content·GIF 파티클·이벤트 추가
5. 이메일/소셜 가입 완료 시점을 온보딩 뒤로 통일
6. test 환경 local Release 검증

두 저장소 구현은 별도 task/branch/PR로 진행한다. production 배포와 스토어 제출은 이 설계 승인이나 test 검증만으로 자동 진행하지 않는다.

## 7. 검증 계획

### 자동 검증

- BE
  - 신규 유입값 정상화 및 `OTHER` 검증 테스트
  - 이메일 OTP POST가 신규·중복·소셜 전용 이메일을 기존 계약대로 구분하는 테스트
  - 관리자 유입경로 bucket 한글 라벨 테스트
- RN
  - 유입경로 10개 문구·값·순서 스냅샷/단위 테스트
  - OTP 전송이 GET 없이 POST 한 번만 호출되는 hook 테스트
  - OTP 오류 코드별 화면 상태 테스트
  - 빈/공백/null 부제목의 질문 헤더 간격 테스트
  - 온보딩 submit 성공 → complete phase → CTA → home 전환 테스트
  - GIF asset resolve와 Reduce Motion 분기 테스트
  - TypeScript, scoped ESLint, 관련 Jest

### 런타임 검증

- test 서버 기준 이메일 가입 1회, Google/Kakao/Apple 소셜 가입 각 1회
- 기존 이메일 계정·소셜 전용 계정의 통합 안내 회귀 확인
- iPhone local Release에서 GIF 1회 재생, CTA, safe-area, 뒤로가기 차단 확인
- Android local Release에서 GIF 투명도·프레임, 시스템 뒤로가기 차단, 작은/큰 화면 확인
- 네트워크 로그에서 이메일 OTP 최초 전송이 POST 한 건인지 확인
- 관리자 test 환경 유입경로 분포에 신규 두 값이 한글로 표시되는지 확인

## 8. 구현 승인 후 수용 체크리스트

- [ ] 유입경로 문구와 순서가 요청과 정확히 일치한다.
- [ ] 병원·당근 커뮤니티가 test DB에 저장되고 관리자 지표에 한글로 보인다.
- [ ] 이메일 OTP 전송의 중복 사전 GET이 제거됐다.
- [ ] 질문 6·7·8의 제목-선택지 간격이 동일하다.
- [ ] 온보딩 성공 뒤 `회원가입이 완료되었습니다!` 화면이 표시된다.
- [ ] GIF가 iOS와 Android에서 투명 배경으로 한 번 재생된다.
- [ ] `신신당부 시작하기`를 눌러야 홈으로 이동한다.
- [ ] 기존 계정 데이터와 기존 가입·계정 통합 흐름이 유지된다.
- [ ] test 환경 통합 검증 전 production을 변경하지 않는다.
