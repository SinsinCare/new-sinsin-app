/**
 * 헤더의 아이콘 버튼(✕ · ‹ · 기록 · +).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 왜 컴포넌트가 필요한가 — 손으로 적은 `hitSlop` 은 계속 모자랐다
 *
 * 앱의 헤더 아이콘은 대부분 이렇게 적혀 있었다:
 *
 * ```tsx
 * <Pressable onPress={onClose} hitSlop={8}>
 *   <Icon name="x" size={24} />
 * </Pressable>
 * ```
 *
 * 24 + 8×2 = **40pt**. iOS HIG 최소 44, Android 최소 48 **둘 다 밑**이다. 게다가
 * 이 버튼들은 화면 **맨 위 구석**에 있다 — 엄지가 가장 부정확한 자리이고, 한 손으로
 * 쥔 큰 화면에서는 손목을 꺾어 닿는 자리다. "눌러도 안 닫힌다" 는 대개 여기서 난다.
 *
 * ■ 왜 `hitSlop` 을 더 키우지 않고 상자를 키우나
 *
 * `hitSlop` 은 **부모의 경계를 넘어서면 안드로이드에서 무시된다**(부모 밖 터치는
 * 자식에게 전달되지 않는다). 헤더 행은 보통 54pt 라 세로로는 남지만, 가로로 키우면
 * 옆 버튼과 슬롭이 겹쳐 어느 쪽이 눌리는지가 렌더 순서에 달리게 된다. 실제 상자를
 * 키우고 **음수 마진으로 레이아웃 자리만 원래대로 되돌리면**, 보이는 모양은 한 픽셀도
 * 안 바뀌면서 터치 면적만 규격을 채운다.
 *
 * ■ 시각은 바뀌지 않는다
 *
 * 상자는 `SIZE`(iOS 44 / Android 48)이고 마진은 `-(SIZE - visual)/2` 다. 즉 이 버튼이
 * 차지하는 **레이아웃 폭은 아이콘 크기 그대로**이고, 넘치는 부분은 헤더 행 안쪽
 * (패딩·좌우 여백)으로 퍼진다. 헤더 행이 아이콘보다 낮으면(<44) 세로 슬롭이 잘리므로
 * 그때는 행 높이부터 고칠 것.
 */
import type { ReactNode } from "react"
import { Platform, Pressable, StyleSheet, type ViewStyle } from "react-native"

/** 헤더 버튼의 실제 터치 상자. 플랫폼 최소 규격(iOS 44 / Android 48). */
export const HEADER_TOUCH_SIZE = Platform.OS === "android" ? 48 : 44

export interface HeaderIconButtonProps {
  onPress: () => void
  /** 스크린리더가 읽을 이름. 아이콘만 있는 버튼이라 **필수**다. */
  accessibilityLabel: string
  /** 아이콘 노드. 색·크기는 호출부가 정한다(헤더마다 테마 출처가 다르다). */
  children: ReactNode
  /**
   * 아이콘의 **시각적** 한 변. 음수 마진 계산에만 쓴다 — 이 값이 실제 아이콘보다
   * 크면 버튼이 원래보다 안쪽으로 들어가 보인다. 기본 24(헤더 아이콘의 표준).
   */
  visualSize?: number
  disabled?: boolean
  style?: ViewStyle
}

export function HeaderIconButton({
  onPress,
  accessibilityLabel,
  children,
  visualSize = 24,
  disabled = false,
  style,
}: HeaderIconButtonProps) {
  const inset = -(HEADER_TOUCH_SIZE - visualSize) / 2
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.box,
        {
          width: HEADER_TOUCH_SIZE,
          height: HEADER_TOUCH_SIZE,
          margin: inset,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {children}
    </Pressable>
  )
}

/**
 * **아이콘만 담은 행**(앱바의 우측 액션 묶음 등)이 규격 상자를 받아 줄 자리를 만든다.
 *
 * 왜 필요한가: 안드로이드는 **부모 경계 밖의 터치를 자식에게 전달하지 않는다.**
 * 위의 음수 마진은 버튼을 부모의 여백 안쪽으로 넘치게 하는데, 부모가
 * `flexDirection: "row"` + 콘텐츠 높이(=아이콘 22pt)면 넘친 부분이 부모 **밖**이라
 * 그 영역은 안드로이드에서 죽는다 — 상자를 키운 의미가 절반 사라진다.
 *
 * 그래서 그런 행에는 이 스타일을 얹는다. 높이는 규격까지, 좌우로 넘칠 만큼 패딩을
 * 주고 **같은 크기의 음수 마진으로 바깥 자리를 되돌린다** — 행이 차지하는 자리와
 * 아이콘 위치는 한 픽셀도 안 바뀌고, 터치만 규격을 채운다.
 *
 * 부모가 이미 충분히 크면(패딩 있는 헤더 행, 높이 52~54의 앱바) 필요 없다.
 */
export function headerActionRowRoom(visualSize = 24): ViewStyle {
  const pad = Math.max(0, (HEADER_TOUCH_SIZE - visualSize) / 2)
  return {
    height: HEADER_TOUCH_SIZE,
    paddingHorizontal: pad,
    marginHorizontal: -pad,
  }
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
})
