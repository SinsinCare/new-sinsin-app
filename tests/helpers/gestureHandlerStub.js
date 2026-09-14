/**
 * `react-native-gesture-handler` 의 jest 스텁.
 *
 * 네이티브 모듈(`NativeRNGestureHandlerModule.getEnforcing`)이 없는 node 환경에서는 import 만
 * 해도 죽는다. 디자인 시스템 버튼(V2Button/V2ListRow)이 시트 안 opt-in 으로 RNGH Pressable 을
 * 들여오면서(2026-09-12) 커뮤니티 스위트 3개가 전이적으로 이 벽에 부딪혔다 — `expo-linear-gradient`
 * 와 같은 이유로 매퍼에 둔다. 소스 계약 테스트는 렌더하지 않으므로 이름만 있으면 된다.
 */
const passthrough = (props) => props?.children ?? null
module.exports = {
  Pressable: passthrough,
  ScrollView: passthrough,
  FlatList: passthrough,
  GestureHandlerRootView: passthrough,
  GestureDetector: passthrough,
  Gesture: { Pan: () => ({}), Native: () => ({}), Tap: () => ({}) },
  Directions: {},
  State: {},
}
