/**
 * jest 용 `react-native-purchases` 스텁.
 *
 * 이 패키지는 네이티브 모듈(`NativeModules.RNPurchases`)을 부팅 시점에 붙잡아서,
 * 전이적으로라도 들여오는 스위트가 **통째로 죽는다** — `react-native` 를
 * `reactNativeStub.js` 로 바꾸는 것과 같은 벽이다.
 *
 * 실제로 그 사슬이 짧다: `services/core/sessionCleanup` → `features/billing` →
 * `purchases/purchasesClient` → 여기. 세션 정리는 결제와 무관한 스위트가 잔뜩
 * 들여오는 모듈이라, 스텁이 없으면 그 스위트들이 다 같이 넘어진다.
 *
 * **아무것도 흉내 내지 않는다.** 이 스텁으로 결제 동작을 검증할 수는 없고, 그래야
 * 한다 — 결제의 진실은 스토어와 서버에 있고 그 검증은 `sinsin-be-bun` 의
 * `tests/billing/*` 과 실기기가 한다. 여기서 그럴듯한 가짜를 만들면 "테스트는
 * 통과하는데 실제로는 안 되는" 자리가 하나 더 생긴다.
 */

const noop = () => undefined
const rejected = () => Promise.reject(new Error("purchases_not_available_in_tests"))

const Purchases = {
  configure: noop,
  logIn: rejected,
  logOut: rejected,
  getOfferings: rejected,
  purchasePackage: rejected,
  restorePurchases: rejected,
  getCustomerInfo: rejected,
  addCustomerInfoUpdateListener: noop,
  removeCustomerInfoUpdateListener: () => false,
  isConfigured: () => Promise.resolve(false),
}

module.exports = { __esModule: true, default: Purchases }
