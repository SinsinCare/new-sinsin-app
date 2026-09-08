/**
 * 결제·플랜 기능의 **임시 숨김 스위치.**
 *
 * 스토어 상품과 가격 정책이 확정되기 전까지 결제 화면(페이월·구독 카드·구독 설정 행)을
 * 아예 그리지 않고, 모든 기능을 플랜과 무관하게 열어 둔다. 서버도 같은 상태다 —
 * `BILLING_ENFORCE` 가 꺼져 있으면 아무것도 막지 않고 `/billing/me` 도 전부 open 으로
 * 답한다(`sinsin-be-bun/src/domains/billing/guard.ts`).
 *
 * **기본이 숨김이다.** 다시 보이게 하려면 빌드 프로파일에
 * `EXPO_PUBLIC_BILLING_HIDDEN=false` 를 **명시**해야 한다. 빠뜨리거나 애매한 값이면
 * 숨김 — 실수로 페이월이 나가는 쪽보다 실수로 안 보이는 쪽이 싸다.
 *
 * 값을 호출 시점에 읽는다(모듈 로드 시점이 아니라). 테스트가 파일 상단에서 환경변수를
 * 바꿔 두 상태를 모두 검증할 수 있어야 해서다.
 */
export function isBillingHidden(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return env["EXPO_PUBLIC_BILLING_HIDDEN"]?.trim().toLowerCase() !== "false"
}
