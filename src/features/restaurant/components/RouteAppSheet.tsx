/**
 * **길찾기 — 어느 지도 앱으로 열까.**
 *
 * ## 왜 앱을 고르게 하는가 (자동으로 하나 고르지 않는다)
 *
 * 국내 사용자는 카카오맵·네이버지도 중 쓰던 것이 있다. 한쪽으로 밀어 넣으면 안 쓰는 앱의
 * 로그인·설치 화면을 만나고, 되돌아오려면 앱을 나갔다 와야 한다. 그래서 목록을 준다 —
 * 다이닝코드·캐치테이블도 같은 방식이다.
 *
 * ## 앱이 없으면 웹으로 내려간다 (`canOpenURL` 을 믿지 않는다)
 *
 * iOS 는 `Info.plist` 의 `LSApplicationQueriesSchemes` 에 적힌 스킴만 조회할 수 있고,
 * 이 저장소의 `app.json` 에는 그 목록이 없다(실측). 즉 카카오맵이 깔려 있어도
 * `canOpenURL("kakaomap://…")` 은 **false** 다. 그 값을 믿고 "앱이 없다" 고 판단하면
 * 모든 사용자가 웹으로 떨어진다.
 *
 * 그래서 **먼저 열어 보고 실패하면 웹**이다. `Linking.openURL` 은 열 수 없을 때 reject
 * 하므로 그 자리에서 갈아탈 수 있고, 두 국내 서비스의 웹 주소는 앱이 깔려 있으면 앱으로
 * 넘어가므로 어느 쪽이든 사용자는 길찾기 화면을 본다.
 *
 * 링크 값 자체는 `utils/mapAppLinks` 의 순수 함수가 만든다(테스트가 그쪽에 있다).
 * 이 컴포넌트는 **여는 일**만 한다.
 */

import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  radius,
  spacing,
  V2BottomSheet,
  V2Option,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import { SHEET_GUTTER } from "../layout"
import { mapAppLinks, type MapAppTarget } from "../utils/mapAppLinks"

export interface RouteAppSheetProps {
  visible: boolean
  onClose: () => void
  /** 목적지. 좌표가 없으면 이 시트를 여는 버튼 자체가 없다(`canRouteTo`). */
  target: MapAppTarget
}

/** 목업의 옵션 행 높이와 같은 값(`SortSheet`). 두 시트의 행이 달라 보이면 안 된다. */
const OPTION_HEIGHT = 64

export function RouteAppSheet({
  visible,
  onClose,
  target,
}: RouteAppSheetProps) {
  const { t } = useTranslation("common")
  const links = mapAppLinks(
    target,
    Platform.OS === "android" ? "android" : "ios",
  )

  const openLink = async (appUrl: string, webUrl: string) => {
    // 앱을 먼저 열어 본다. 열 수 없으면 reject 되고 웹으로 내려간다(머리말 참고).
    try {
      await Linking.openURL(appUrl)
    } catch {
      try {
        await Linking.openURL(webUrl)
      } catch {
        // 둘 다 실패하는 경우는 브라우저조차 없는 기기다. 조용히 닫는다 —
        // 여기서 오류를 띄워도 사용자가 할 수 있는 일이 없다.
      }
    }
    onClose()
  }

  return (
    <V2BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("restaurant.route.title")}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.list}>
        <View style={styles.listInner}>
          {links.map((link) => (
            <V2Option
              key={link.key}
              label={t(dynamicKey(`restaurant.route.app.${link.key}`))}
              /*
                이 목록은 **고르는 곳이 아니라 여는 곳**이다. 누르면 그 자리에서 지도 앱이
                열리고 시트가 닫히므로 남는 선택 상태가 없다 — 그래서 항상 `false` 다.
                (`V2Option` 의 `selected` 는 필수 prop 이라 생략할 수 없다.)
              */
              selected={false}
              onPress={() => void openLink(link.appUrl, link.webUrl)}
              style={styles.option}
            />
          ))}
        </View>
      </ScrollView>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  list: { paddingTop: spacing[16], paddingBottom: spacing[8] },
  listInner: { gap: spacing[8], paddingHorizontal: SHEET_GUTTER },
  option: { minHeight: OPTION_HEIGHT, borderRadius: radius.lg },
})
