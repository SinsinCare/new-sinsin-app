/**
 * jest 용 `expo-linear-gradient` 스텁.
 *
 * 이 패키지는 네이티브 뷰를 `codegenNativeComponent` 로 선언한 **Flow/ESM 원본**이라
 * 이 프리셋에서 파싱이 안 된다 — 전이적으로라도 들여오는 스위트가 **통째로 죽는다**
 * (`react-native` 를 `reactNativeStub.js` 로 바꾸는 것과 같은 벽이다).
 *
 * 호스트 컴포넌트는 **문자열 태그**로 둔다. 흉내 낸 구현을 두면 "렌더러 없이 렌더한"
 * 셈이 되고, 태그로 두면 `element.type === "LinearGradient"` 가 곧 "그라디언트를 그린다"
 * 는 뜻이 되어 트리를 읽는 테스트들이 그대로 성립한다. `colors`·`start`·`end` 같은
 * 계약은 프롭으로 남으므로 확인할 수 있는 것이 줄지 않는다.
 */
module.exports = { LinearGradient: "LinearGradient" }
