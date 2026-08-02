/**
 * 주소 블록 — 도로명 / 지번 / 우편번호 + **동작하는** `복사`.
 *
 * ## `복사` 는 죽은 텍스트가 아니다
 *
 * 프로토타입에는 링크처럼 스타일링된 `복사` 라벨이 네 곳 있었고 그 중 하나도 클립보드를
 * 부르지 않았다(`expo-clipboard` 가 설치돼 있지도 않았다). 지금은 설치돼 있으므로
 * (`package.json`) 실제로 쓴다. 그리고 **눌렀다는 사실을 화면이 말한다** — 클립보드는 눈에
 * 보이지 않아서 피드백이 없으면 사용자는 눌리지 않은 줄 안다.
 *
 * 피드백은 두 겹이다.
 * 1. 누른 자리에서 `복사 → 복사됨` 으로 1.6초 바뀐다.
 * 2. `showSuccessToast` 로 화면 전역 알림(시선이 다른 곳일 때·스크린리더).
 *    토스트는 legacy `react-native-toast-message` 전역 오버레이라 v2 서브트리 **밖에** 뜬다 —
 *    같은 서브트리에서 테마 훅을 섞는 문제가 아니므로 허용한다.
 *
 * ## 표기가 두 갈래다
 *
 * 카드(목업 -6)는 `도로명 : 값` 텍스트 접두어이고 세 줄을 한 번에 펼친다.
 * 상세(목업 -10)는 도로명만 보이고 셰브론을 눌러 `지번`·`우편번호` 를 펼친다.
 * 후자는 `onToggleExpanded` 를 넘겼을 때만 켜지는 **controlled 모드**다 — 확장 상태를
 * 여기서 들고 있으면 상세 화면이 스크롤 위치를 복원할 때 접힘이 초기화된다.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"
import * as Clipboard from "expo-clipboard"
import { useTranslation } from "react-i18next"
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated"

import {
  V2Icon,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import { showSuccessToast } from "@/src/lib/toast"

/** 라벨 → 값 표기. `text` = `도로명 : 값`(카드), `badge` = `[지번] 값`(상세). */
export type AddressLabelStyle = "text" | "badge"

/** `subtext.large` 의 줄높이. hitSlop 계산의 기준 높이다. */
const TEXT_HEIGHT = 20
const CHEVRON_SIZE = 16

export interface AddressBlockProps {
  roadAddress: string | null
  jibunAddress: string | null
  zipcode?: string | null
  /**
   * 우편번호 줄을 그릴지. controlled 모드(`onToggleExpanded` 있음)에서는 기본 `true` 다 —
   * 목업 §4.2 의 확장 내용이 `지번` + `우편번호` 두 줄이므로.
   */
  showZipcode?: boolean
  /** controlled 모드에서 펼침 여부. 접혀 있으면 도로명만 보인다. */
  expanded?: boolean
  /** 넘기면 도로명 줄 끝에 셰브론 토글이 붙는다(controlled 모드). */
  onToggleExpanded?: () => void
  labelStyle?: AddressLabelStyle
  /**
   * 복사 성공 알림을 직접 처리하고 싶을 때. 넘기면 기본 토스트를 띄우지 않는다
   * (같은 화면에 토스트가 두 개 뜨는 것을 막는다).
   */
  onCopied?: (value: string) => void
  style?: ViewStyle
}

export function AddressBlock({
  roadAddress,
  jibunAddress,
  zipcode = null,
  showZipcode,
  expanded = true,
  onToggleExpanded,
  labelStyle = "text",
  onCopied,
  style,
}: AddressBlockProps) {
  const controlled = onToggleExpanded !== undefined
  const isOpen = controlled ? expanded : true
  const withZipcode = showZipcode ?? controlled

  const rows: { key: string; labelKey: string; value: string }[] = []
  if (roadAddress) {
    rows.push({
      key: "road",
      labelKey: "restaurant.address.road",
      value: roadAddress,
    })
  }
  if (isOpen && jibunAddress) {
    rows.push({
      key: "jibun",
      labelKey: "restaurant.address.jibun",
      value: jibunAddress,
    })
  }
  if (isOpen && withZipcode && zipcode) {
    rows.push({
      key: "zipcode",
      labelKey: "restaurant.address.zipcode",
      value: zipcode,
    })
  }

  // 주소가 하나도 없으면 블록 자체를 그리지 않는다. 빈 `도로명 :` 은 정보가 아니다.
  if (rows.length === 0) return null

  return (
    /*
      높이 변화를 **이어서** 보여 준다.

      원래는 접힌 줄을 조건부로 mount/unmount 만 했다. 그러면 높이가 한 프레임에 튀고,
      이 블록이 카드 안에 있으므로 **아래 카드들이 통째로 밀린다** — 사용자 지적:
      "닫았다 열었다 하면서 레이아웃 시프트 생기는 거 별로인 듯".

      `LinearTransition` 이 컨테이너 높이를, `FadeIn`/`FadeOut` 이 늘고 주는 줄 자체를 맡는다.
      둘 다 UI 스레드에서 도는 reanimated 레이아웃 애니메이션이라, 가상화된 목록 안에서도
      JS 스레드를 붙잡지 않는다.

      지속시간은 짧게 잡았다(펼침 160ms / 접힘 120ms). 주소를 펼치는 것은 정보 확인이지
      연출이 아니라서, 길면 복사하려는 사람의 손을 기다리게 만든다.
    */
    <Animated.View
      layout={LinearTransition.duration(180)}
      style={[styles.root, style]}
    >
      {rows.map((row, index) => {
        const isToggleRow = index === 0
        const line = (
          <AddressRow
            labelKey={row.labelKey}
            value={row.value}
            labelStyle={labelStyle}
            onCopied={onCopied}
            // 토글은 첫 줄(도로명)에만 붙는다. 줄마다 있으면 무엇이 접히는지 알 수 없다.
            expanded={isToggleRow && controlled ? isOpen : undefined}
            onToggleExpanded={isToggleRow ? onToggleExpanded : undefined}
          />
        )

        // 항상 있는 첫 줄은 감싸지 않는다 — 들어오고 나가는 것이 없으니 애니메이션도 필요 없다.
        if (isToggleRow) return <View key={row.key}>{line}</View>

        return (
          <Animated.View
            key={row.key}
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
          >
            {line}
          </Animated.View>
        )
      })}
    </Animated.View>
  )
}

function AddressRow({
  labelKey,
  value,
  labelStyle,
  expanded,
  onToggleExpanded,
  onCopied,
}: {
  labelKey: string
  value: string
  labelStyle: AddressLabelStyle
  expanded?: boolean
  onToggleExpanded?: () => void
  onCopied?: (value: string) => void
}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const [justCopied, setJustCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const handleCopy = useCallback(() => {
    // 클립보드 쓰기는 비동기지만 실패해도 사용자가 할 수 있는 일이 없다. 화면 피드백은
    // 낙관적으로 먼저 준다 — 실패 시 조용히 두는 편이 정체불명의 에러 토스트보다 낫다.
    void Clipboard.setStringAsync(value)
    setJustCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setJustCopied(false), 1600)
    if (onCopied) onCopied(value)
    else showSuccessToast(t("restaurant.address.copied"))
  }, [onCopied, t, value])

  const label = t(dynamicKey(labelKey))

  return (
    <View style={styles.row}>
      {labelStyle === "badge" ? (
        <View style={[styles.badge, { backgroundColor: colors.fill.normal }]}>
          <Text
            style={[typography.caption.small, { color: colors.label.neutral }]}
          >
            {label}
          </Text>
        </View>
      ) : (
        <Text
          style={[
            typography.subtext.large,
            { color: colors.label.alternative },
          ]}
        >
          {`${label} : `}
        </Text>
      )}
      <Text
        style={[
          typography.subtext.large,
          styles.value,
          { color: colors.label.neutral },
        ]}
      >
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${t("restaurant.address.copy")}`}
        // 작은 컨트롤은 상자를 키우지 않고 hitSlop 으로 44 를 확보한다.
        hitSlop={Math.round((touchTarget.min - TEXT_HEIGHT) / 2)}
        onPress={handleCopy}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Text
          style={[
            typography.subtext.large,
            styles.copy,
            { color: colors.primary.primary },
          ]}
        >
          {justCopied
            ? t("restaurant.address.copiedShort")
            : t("restaurant.address.copy")}
        </Text>
      </Pressable>
      {onToggleExpanded && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={
            expanded
              ? t("restaurant.address.collapse")
              : t("restaurant.address.expand")
          }
          hitSlop={Math.round((touchTarget.min - CHEVRON_SIZE) / 2)}
          onPress={onToggleExpanded}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <V2Icon
            name={expanded ? "chevronDown" : "chevronRight"}
            size={CHEVRON_SIZE}
            color={colors.label.assistive}
          />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: spacing[4] },
  row: {
    flexDirection: "row",
    // 주소가 두 줄로 감기면 라벨·복사가 첫 줄에 붙어 있어야 읽힌다.
    alignItems: "flex-start",
    gap: spacing[4],
  },
  // 값이 긴 주소를 밀어내지 않고 남은 폭을 먹게 한다(복사 버튼이 밖으로 나가지 않는다).
  value: { flexShrink: 1 },
  badge: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: radius.xs,
  },
  copy: { textDecorationLine: "underline" },
  pressed: { opacity: 0.6 },
})
