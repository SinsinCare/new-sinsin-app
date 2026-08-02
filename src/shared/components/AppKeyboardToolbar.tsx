/**
 * 앱 전역 키보드 툴바 — **키보드에서 빠져나올 유일한 보장된 길**.
 *
 * ## 왜 전역인가
 *
 * 숫자 키패드(`number-pad`·`decimal-pad`)에는 완료 키가 없다. 그래서 화면마다
 * `InputAccessoryView` 로 완료 바를 붙여 왔는데, **그 방식은 모달 안에서 렌더되지
 * 않는다.** 기록 시트(혈압·혈당·체중·물)는 전부 Tamagui Sheet = RN Modal 위에 살아서,
 * 붙였다고 믿은 완료 바가 실제로는 한 번도 그려지지 않았다 —
 * 2026-08-02 QA "혈압 심박수 입력 후 확인 버튼을 누를 수 없고, 스크롤도 안 되고,
 * 키보드도 안 내려감" 의 정체다. 탈출구가 0개였다.
 *
 * `KeyboardToolbar` 는 `KeyboardProvider`(루트) 위에서 네이티브 키보드에 직접 붙으므로
 * 모달·시트·바텀시트를 가리지 않는다. 한 곳에 한 번 달면 **앱의 모든 입력**이 덮인다.
 * 화면마다 다는 것과 달리 "이 화면은 빠뜨렸다" 가 구조적으로 불가능하다.
 *
 * ## 좌우 이동 화살표를 끄는 이유
 *
 * 기본 툴바는 `Prev`/`Next` 화살표를 함께 그린다. 이 앱의 입력은 대부분 한 칸(체중·혈당)
 * 이거나, 여러 칸이어도 세 자리를 채우면 자동으로 넘어간다(혈압). 쓸 일이 거의 없는
 * 화살표가 늘 회색으로 앉아 있으면 "누를 수 있는데 안 되는 것" 처럼 보인다.
 * 필요한 것은 완료 하나다.
 *
 * ## 안전영역
 *
 * 툴바 자체는 키보드 위에 붙으므로 하단 인셋을 계산할 필요가 없다 —
 * 키보드가 이미 홈 인디케이터 영역을 덮고 있다. 좌우 인셋만 넘긴다(가로 모드·노치 기기).
 */

import { KeyboardToolbar } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { tokens } from "@/src/theme/tokens"

export function AppKeyboardToolbar() {
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()

  return (
    <KeyboardToolbar
      insets={{ left: insets.left, right: insets.right }}
      showArrows={false}
      theme={{
        light: {
          primary: tokens.color.primary.val,
          disabled: tokens.color.grey3.val,
          background: "#F2F2F5",
          ripple: "rgba(254,113,57,0.16)",
        },
        dark: {
          primary: tokens.color.primary.val,
          disabled: tokens.color.grey3.val,
          background: tokens.color.cardBgDark.val,
          ripple: "rgba(254,113,57,0.24)",
        },
      }}
    >
      {/* 글자색은 위 theme.primary 가 정한다(style 은 ViewStyle 이라 색을 못 받는다). */}
      <KeyboardToolbar.Done text={t("action.done")} />
    </KeyboardToolbar>
  )
}
