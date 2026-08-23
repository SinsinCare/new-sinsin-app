/*
  `react-native` 는 Flow 문법의 미변환 ESM 이라 jest(`testEnvironment: "node"`, RN 프리셋
  없음)에서 **파싱 단계에서 죽는다.** SVG 변환기·에셋 스텁과 같은 이유의 같은 처방이다.

  공용 계측(L2)이 `trackAnalyticsEvent` 를 공유 모듈에 넣으면서 그 체인 끝에
  `deviceContext.ts` 의 `Platform` 이 딸려 오므로, 계측이 붙은 모듈을 하나라도 들여오는
  스위트가 전부 이 벽에 부딪힌다.

  **필요한 것만 둔다.** 여기에 컴포넌트를 흉내 내기 시작하면 "렌더러 없이 렌더한" 셈이
  되어 초록이 아무것도 보장하지 않게 된다 — 이 저장소에는 애초에 렌더러가 없다
  (`tests/helpers/hookHarness.ts` 머리말). 새 항목이 필요하면 그것이 정말 **로드만**
  되면 되는 값인지 먼저 따진다.
*/
const Platform = {
  OS: "ios",
  Version: "17.0",
  select: (spec) => (spec && "ios" in spec ? spec.ios : spec && spec.default),
}

module.exports = { Platform }
