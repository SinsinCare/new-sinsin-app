// 내비게이션 — 진입 · 뒤로가기의 단일 출처.
//
//  entryRoute   : 인증 상태 → 앱을 어디서 시작할지
//  guard        : 지금 이 화면에 있어도 되는가 (루트 레이아웃이 실행한다)
//  routeGraph   : 화면 → 히스토리가 없을 때 뒤로 갈 곳
//  useGoBack    : 화면이 쓰는 유일한 뒤로가기
//  useAppRouter : `useRouter()` 자리에 들어가는 라우터 (back 만 다르다)
//  entryIntent  : 라우터에 넘기기 전 진입 URL 검사
//  useConsumeEntryUrl : 진입 URL 을 한 번만 쓰이게 한다 (리로드 재생 차단)

export * from "./entryRoute"
export * from "./guard"
export * from "./routeGraph"
export * from "./useGoBack"
export * from "./useAppRouter"
export * from "./entryIntent"
export * from "./useConsumeEntryUrl"
