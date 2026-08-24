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

/*
  `StyleSheet.create` 는 컴포넌트가 아니라 **값**이다. RN 도 요즘은 넣은 객체를 그대로
  돌려주므로 항등 함수면 동작이 같다 — 흉내가 아니라 같은 계약이다. 모듈 최상단에서
  불리는 함수라, 이게 없으면 스타일을 쓰는 공용 컴포넌트를 **로드만 해도** 죽는다.
*/
const StyleSheet = {
  create: (styles) => styles,
  absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  get absoluteFillObject() {
    return this.absoluteFill
  },
  hairlineWidth: 1,
  flatten: (style) =>
    Array.isArray(style)
      ? style.flat(Infinity).filter(Boolean).reduce((a, s) => ({ ...a, ...s }), {})
      : (style ?? {}),
}

/*
  엘리먼트의 `type` 자리를 채우는 **표식**이다. 렌더하지 않고 props 만 읽는 테스트
  (터치 상자 치수 등)를 위해 둔다 — 눌림·접근성 같은 동작은 여기에 없고, 그것을
  검증하려는 테스트는 렌더러가 필요하다는 뜻이다(머리말).
*/
const Pressable = "Pressable"
const View = "View"

module.exports = { Platform, StyleSheet, Pressable, View }
