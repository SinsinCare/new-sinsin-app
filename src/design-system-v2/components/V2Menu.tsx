import { Text } from "@/src/design-system-v2/primitives/NativeText"
// Design System v2 — Menu (앵커드 팝오버)
// Spec: docs/design/community-redesign/00-MASTER.md §2.6 · §4-G5 / 결정: 01-DECISIONS.md D3
//
// 트리거 **옆에** 뜨는 선택 목록이다. 딤이 없고, 바깥을 누르면 닫힌다.
//
// ■ D3 — "선택"만 온다. 파괴적 액션은 시트에 남는다
//   정렬(최신순·조회순·인기순)·앨범 고르기처럼 **되돌리기 쉬운 선택**만 이 표면을 쓴다.
//   수정·삭제·신고는 `V2BottomSheet` 계보에 그대로 둔다 — 오탭 비용이 큰 항목을
//   손가락에서 먼 팝오버에 두지 않기로 했다(01-DECISIONS D3).
//   그래서 이 컴포넌트는 **그 두 번째 쓰임을 부르는 어포던스를 아예 갖지 않는다**:
//   destructive 톤도, 리딩 아이콘도, 체크 표시도 없다. 항목은 `{ key, label, onSelect }`
//   뿐이고 전부 같은 색으로 그린다. 위험한 메뉴가 필요하면 `showActionSheet` 를 쓴다.
//
// ■ RN Modal 을 쓰지 않는다 — 그래서 `ModalOverlayHost` 규칙도 걸리지 않는다
//   집안 규칙은 "RN Modal 안이면 ModalOverlayHost 필수"다(sinsin-dialog-system).
//   그 규칙이 생긴 이유는 **네이티브 모달 경계** 자체다 — iOS 의 RN Modal 은 자기
//   뷰컨트롤러로 화면을 통째로 덮어서, 그 안에서 부른 루트 토스트·확인창이 뒤에
//   깔리거나 present 자체가 거부된다(ModalOverlayHost · AppModal 머리말).
//   드롭다운은 그 경계를 만들 이유가 하나도 없다:
//     - **딤이 없다.** 모달이 주는 것(전면 막·포커스 가둠)이 오히려 스펙 위반이다.
//     - **전이 게이트를 탈 이유가 없다.** 새 RN Modal 은 `AppModal` 의 직렬화 큐를
//       거쳐야 하고(앞 전이 완료 또는 800ms 폴백), 형제 모달이 떠 있으면 그것이
//       닫힐 때까지 기다린다. 정렬 필을 누르고 한 박자 뒤에 뜨는 메뉴는 고장이다.
//     - **모달 안에서 열릴 수도 있다.** 시트·모달 위에서 다시 네이티브 모달을
//       present 하면 iOS 가 조용히 거부한다.
//   대신 **이미 있는 루트 오버레이 호스트**(`PortalProvider`, app/_layout.tsx)로
//   텔레포트한다. 호스트가 `StyleSheet.absoluteFill` 이라 그 좌표계가 곧 **윈도**이고,
//   그것이 `measureInWindow` 가 주는 좌표계와 같다 — 앵커를 화면 좌표로 받는 이
//   컴포넌트에 필요한 성질이 바로 그거다(좌표계가 어긋나 겹친 사고는
//   tests/floatingCoordinateSpace.test.ts 머리말).
//
//   한계 하나를 적어 둔다: 포털 층은 `PortalProvider` 의 자식들 **위**에 그려지지만
//   네이티브 RN Modal **아래**다. 그래서 RN Modal 안(예: P3 의 앨범 드롭다운,
//   restaurant/MediaPicker)에서 이 컴포넌트를 열면 보이지 않는다. 그날이 오면
//   그 모달 안에 오버레이를 제자리로 그리는 선택지를 열고(`portal={false}` 류),
//   ModalOverlayHost 규칙은 **그 모달**이 지면 된다 — 이 컴포넌트가 아니라.
//
// ■ 접근성
//   카드는 `menu`, 항목은 `menuitem`. 카드에 `accessibilityViewIsModal` 을 줘서
//   VoiceOver 가 메뉴 밖으로 새지 않게 하고, **포인터 없이 닫는 길**을 둘 둔다:
//   iOS 는 `onAccessibilityEscape`(두 손가락 Z), 안드로이드는 하드웨어/제스처 뒤로가기
//   (`BackHandler`). 바깥 막에도 이름을 붙여 TalkBack 이 "닫기" 로 읽는다.

import { useEffect } from "react"
import {
  BackHandler,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import {
  useSafeAreaInsets,
  type EdgeInsets,
} from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

// 루트 오버레이 호스트. DS → shared 방향은 V2Modal(AppModal)이 이미 쓰는 길이다.
import { Portal } from "@/src/shared/components/Portal"
import { borderWidth, elevation, radius, spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

/** 카드 폭 — 시안 6곳이 전부 180 이다(§2.6). */
export const V2_MENU_WIDTH = 180
/** 항목 높이(§2.6). 44 는 최소 탭 타겟이기도 하다. */
export const V2_MENU_ITEM_HEIGHT = 44
/** 카드 상·하 패딩(§2.6). 항목 사이 간격은 0. */
const PADDING_VERTICAL = spacing[10]
/** 라벨 좌측 인셋 — **카드 바깥 모서리** 기준 20(§2.6). */
const LABEL_INSET = spacing[20]
const BORDER = borderWidth.thin
/**
 * 눌림 하이라이트 폭 174(§2.6).
 *
 * 스펙은 같은 칸에서 "174×44" 와 "좌우 인셋 4/4" 를 함께 적었는데 둘 다 참일 수 없다 —
 * Yoga 는 테두리를 레이아웃에 포함하므로 안쪽 폭은 180−1−1 = **178** 이고, 4/4 를 물리면
 * 170 이 된다. **측정값(174)이 정본이다**(같은 부류의 판정: 01-DECISIONS D10).
 * 그래서 안쪽에서 좌우 2 씩 물러난다: 178 − 2 − 2 = 174.
 */
const PRESSED_WIDTH = 174
const ITEM_INSET = (V2_MENU_WIDTH - BORDER * 2 - PRESSED_WIDTH) / 2
/** 화면 가장자리에서 카드가 유지하는 최소 여백(클램프에 쓴다). */
const EDGE_MARGIN = spacing[8]

/** 메뉴 한 줄. **선택**만 담는다 — D3(파괴적 액션은 시트). */
export type V2MenuItem = {
  /** React key 이자 항목 식별자 */
  key: string
  label: string
  onSelect: () => void
}

/**
 * 카드가 붙을 자리 — **윈도 좌표계**(`measureInWindow` 가 주는 값)로 준다.
 * 좌변 정렬이면 `left`, 우변 정렬이면 `right` 를 준다(§2.6 앵커 표).
 */
export type V2MenuAnchor =
  | { top: number; left: number }
  | { top: number; right: number }

export type V2MenuProps = {
  visible: boolean
  /** 윈도 좌표계의 앵커. 항목이 없으면 아무것도 그리지 않는다. */
  anchor: V2MenuAnchor
  items: V2MenuItem[]
  /** 바깥 탭·뒤로가기·항목 선택 뒤에 불린다. */
  onClose: () => void
  /** 메뉴 이름(예: "정렬 기준"). 스크린리더가 이 이름으로 메뉴를 알린다. */
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

/** 항목 수로 정해지는 카드 높이 — 10 + n×44 + 10 (§2.6·§5 앵커 표의 180×108). */
export function v2MenuHeight(itemCount: number): number {
  return PADDING_VERTICAL * 2 + itemCount * V2_MENU_ITEM_HEIGHT
}

/**
 * 앵커 + 화면 크기 → 카드의 최종 좌상단. **화면 밖으로 내보내지 않는다.**
 *
 * 오른쪽·아래로 넘치면 안쪽으로 끌어당기고, 노치·홈 인디케이터(안전영역)와
 * 가장자리 여백을 남긴다. 위·왼쪽도 같은 규칙이라 우변 앵커가 좁은 화면에서
 * 왼쪽으로 새는 경우까지 같은 식 하나로 잡힌다.
 */
export function resolveV2MenuPosition(args: {
  anchor: V2MenuAnchor
  itemCount: number
  windowWidth: number
  windowHeight: number
  insets: EdgeInsets
}): { top: number; left: number } {
  const { anchor, itemCount, windowWidth, windowHeight, insets } = args
  const height = v2MenuHeight(itemCount)

  const desiredLeft =
    "left" in anchor ? anchor.left : anchor.right - V2_MENU_WIDTH
  const minLeft = insets.left + EDGE_MARGIN
  // 화면이 카드보다 좁으면(접근성 확대·소형 기기) 최소값이 이긴다 — 최대가 최소보다
  // 작아지면 클램프가 뒤집혀 오히려 화면 밖으로 나간다.
  const maxLeft = Math.max(
    minLeft,
    windowWidth - insets.right - EDGE_MARGIN - V2_MENU_WIDTH,
  )

  const minTop = insets.top + EDGE_MARGIN
  const maxTop = Math.max(
    minTop,
    windowHeight - insets.bottom - EDGE_MARGIN - height,
  )

  return {
    left: Math.min(Math.max(desiredLeft, minLeft), maxLeft),
    top: Math.min(Math.max(anchor.top, minTop), maxTop),
  }
}

export function V2Menu({
  visible,
  anchor,
  items,
  onClose,
  accessibilityLabel,
  style,
}: V2MenuProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  // 포인터 없이 닫는 길 ①: 안드로이드 뒤로가기. 열려 있는 동안만 가로챈다.
  useEffect(() => {
    if (!visible) return
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose()
        return true
      },
    )
    return () => subscription.remove()
  }, [visible, onClose])

  if (!visible || items.length === 0) return null

  const { top, left } = resolveV2MenuPosition({
    anchor,
    itemCount: items.length,
    windowWidth: width,
    windowHeight: height,
    insets,
  })

  return (
    <Portal>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/*
          바깥 탭 — **딤이 아니다**(배경색을 주지 않는다, §2.6 "딤 없음").
          카드는 이 막의 **형제**여야 한다. 자식으로 넣으면 카드 여백을 누른 탭이
          여기까지 올라와 메뉴가 닫힌다.
        */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
        />
        <View
          style={[
            styles.card,
            elevation[3],
            {
              top,
              left,
              backgroundColor: colors.background.default,
              borderColor: colors.line.neutral,
            },
            style,
          ]}
          accessibilityRole="menu"
          accessibilityLabel={accessibilityLabel}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          {items.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="menuitem"
              onPress={() => {
                // 선택 처리에서 예외가 나도 전면 포인터 막은 반드시 내린다. 그렇지
                // 않으면 오류 경로에서 보이지 않는 포털이 아래 스크롤을 계속 먹는다.
                try {
                  item.onSelect()
                } finally {
                  onClose()
                }
              }}
              style={({ pressed }) => [
                styles.item,
                pressed && { backgroundColor: colors.fill.normal },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  typography.label.smallWeak,
                  { color: colors.label.neutral },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Portal>
  )
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: V2_MENU_WIDTH,
    paddingVertical: PADDING_VERTICAL,
    borderRadius: radius.lg,
    borderWidth: BORDER,
  },
  item: {
    height: V2_MENU_ITEM_HEIGHT,
    justifyContent: "center",
    marginHorizontal: ITEM_INSET,
    borderRadius: radius.lg,
    // 라벨은 카드 바깥 모서리에서 20 — 테두리와 항목 인셋만큼 덜어낸다.
    paddingLeft: LABEL_INSET - BORDER - ITEM_INSET,
  },
})
