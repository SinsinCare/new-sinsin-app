/**
 * 전역 `AI 상담` 플로팅 필의 **좌표 상수만** 담은 순수 모듈.
 *
 * ## 왜 컴포넌트에서 뽑아냈나
 *
 * 이 두 값은 원래 `FloatingAiButton.tsx` 안에 있었다. 그런데 이 필은 **모든 탭 화면의
 * 오른쪽 아래를 영구히 점유**하므로, 각 화면은 "목록 맨 아래 카드가 필에 가리지 않도록"
 * 자기 바닥 여백을 이 값에서 계산해야 한다. 그 계산은 순수 산술이고 jest 로 못 박아야
 * 하는데 — `FloatingAiButton.tsx` 는 `react-native`·`react-native-reanimated` 를 들여오고
 * 이 저장소의 jest 는 `testEnvironment: "node"` 라 그 파일을 **파싱조차 못 한다.**
 *
 * 그래서 지금까지는 테스트가 소스를 `fs.readFileSync` 로 읽고 정규식으로 상수를 긁어
 * eval 했다(`tests/recipeFloatingStack.test.ts` 원본). 그 방식은 값이 바뀌면 잡지만
 * **상수 이름이나 선언 형태가 바뀌면 테스트가 스스로 죽는다** — 검사가 아니라 사본이다.
 *
 * 값을 순수 모듈로 내리면 화면도 테스트도 **같은 심볼을 import** 한다. 숫자를 박아 넣은
 * 코드는 컴파일은 되지만 이 상수를 참조하지 않으므로, 필을 옮기는 날 따라오지 않는다는
 * 사실이 테스트에서 드러난다.
 *
 * `FloatingAiButton.tsx` 는 이 파일을 re-export 한다 — 기존 import 경로
 * (`from "@/src/shared/components/FloatingAiButton"`)를 그대로 두기 위해서다.
 * 두 곳에 값을 적지 않는다.
 */

/** 탭바 위 여백. 화면 쪽 콘텐츠는 이 아래로 내려가면 안 된다. */
export const FLOATING_AI_BUTTON_BOTTOM = 16

/** 필의 높이. 지름이자 라디우스의 두 배다. */
export const FLOATING_AI_BUTTON_HEIGHT = 48

/**
 * 탭바 위를 원점으로 본 **필이 덮는 구간의 위쪽 끝**.
 *
 * 탭바는 절대 위치가 아니라 레이아웃 공간을 차지하므로 탭 화면의 바닥은 탭바 위에서
 * 끝난다. 그래서 `_layout.tsx` 가 필에 더해 주는 `insets.bottom + TAB_BAR_HEIGHT` 항은
 * 화면 안에서 보면 **상쇄된다** — 화면 기준으로 필은 언제나 `16 ~ 64` 를 쓴다.
 *
 * 이 상쇄가 눈에 보이지 않는 것이 사고의 원인이었다. 다음 사람이 화면 쪽 여백에
 * 탭바 높이나 안전영역을 한 번 더 더하면 **화면에서만** 어긋나고 어떤 타입도 깨지지 않는다.
 * 그래서 "필이 얼마를 덮는가" 를 여기서 한 번만 계산해 내보낸다.
 */
export const FLOATING_AI_BUTTON_COVERAGE =
  FLOATING_AI_BUTTON_BOTTOM + FLOATING_AI_BUTTON_HEIGHT
