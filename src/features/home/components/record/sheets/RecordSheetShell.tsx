import { FONT_SCALE } from "@/src/design-system-v2/tokens/fontScaling"
import { useEffect, type ReactNode } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import {
  KeyboardController,
  useKeyboardState,
} from "react-native-keyboard-controller"
import Ionicons from "@expo/vector-icons/Ionicons"
import { hapticStepAdvance } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, MOTION, TYPE } from "@/src/theme/surface"
import { V2BottomSheet, V2DotLoader } from "@/src/design-system-v2"
import type { AnalyticsSurface } from "@/src/features/analytics"
import { useTranslation } from "react-i18next"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }
const TIMING = {
  duration: MOTION.duration.base,
  easing: EASE,
  reduceMotion: ReduceMotion.System,
}

interface RecordSheetShellProps {
  /** 어느 기록 시트인가. 뼈대가 공용이라 이걸 안 받으면 5종이 한 칸에 뭉친다. */
  surface: AnalyticsSurface
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** 값이 담긴 CTA 라벨 — "저장" 대신 "200ml 기록하기". */
  ctaLabel: string
  ctaDisabled?: boolean
  ctaLoading?: boolean
  onCtaPress: () => void
  children: ReactNode
}

/**
 * 기록 시트의 공통 뼈대 — 제목 17/700 + 보조 한 줄 + 닫기(✕), 본문, CTA h56 r16 17/700.
 * CTA 는 가입 스텝과 같은 문법으로 움직인다: 활성화되는 순간 회색 면이 브랜드색으로
 * 물들고, 누르면 살짝 눌린다. 시트 안에서도 주인공은 CTA 하나다.
 *
 * ## 높이 — 고정 % 스냅을 버렸다
 *
 * 예전에는 소비처가 `snapPoint`(화면 대비 %)를 넘겼다. 사진 한 장의 비율마다 그 수를
 * 다시 계산해야 했고(MealPhotoConfirmSheet 의 `SHEET_CHROME` 산수), 큰 글씨나 작은
 * 기기에서는 마지막 줄이 스냅 밖으로 밀려 닿을 수 없었다. 지금은 시트가 **콘텐츠
 * 높이대로** 선다(`V2BottomSheet` = gorhom `enableDynamicSizing`) — 그래서 여기 본문은
 * `flex:1` 도, 안쪽 `ScrollView` 도 쓰지 않는다. 머리·본문·CTA 를 그냥 쌓으면 된다.
 *
 * ## 키보드 — 시트가 통째로 떠오른다
 *
 * 키보드 위에 바를 세우는 길은 하나뿐인 줄 알았다: 루트에 `KeyboardStickyView`(전역
 * 툴바·도크)를 두는 것. **그건 이 시트 위로 못 올라온다.** `KeyboardToolbar` 조차
 * 내부 구현이 `KeyboardStickyView` 라(react-native-keyboard-controller), 네이티브
 * 키보드가 아니라 앱 뷰 계층에 사는 평범한 뷰다. 기록 시트는 그보다 위에 그려지므로
 * 루트에 무엇을 두든 시트 뒤에 깔린다 — 2026-08-03 실측: 키패드를 올리면 CTA·판정·
 * 구간 바가 전부 덮이고, 주황 CTA 가 반투명 키패드 **뒤로** 비쳤다. 1.1.24·1.1.25 가
 * 연달아 "여전히 키보드가 가린다" 로 돌아온 이유가 이것이다. 그래서 키보드에서
 * 빠져나올 문(아래 ✓ 대신 v 버튼)은 지금도 이 시트 **안에** 있다.
 *
 * CTA 를 키보드 위로 올리는 일 자체는 이제 gorhom 이 한다 — 시트를 키보드 높이만큼
 * 밀어 올린다(`keyboardBehavior="interactive"`, 안드로이드는 `adjustResize` 로 창이
 * 줄면서 같은 결과). 자작 대응(`useSheetKeyboardLift`: 스냅을 90% 로 키우고 본문
 * 패딩으로 CTA 를 밀어올리기)은 걷어냈다. **단, 시트 안의 입력은 반드시
 * `V2SheetTextInput` 이어야 한다** — 평범한 `TextInput` 이면 gorhom 이 포커스를 모르고
 * 키보드 이벤트를 버려서 시트가 제자리에 남는다(V2SheetTextInput 머리말).
 */
export function RecordSheetShell({
  // 이 파일의 `surface` 는 이미 디자인 토큰 묶음이다(`useSurface()`) — 계측 축은 이름을 비껴 준다.
  surface: analyticsSurface,
  visible,
  onClose,
  title,
  subtitle,
  ctaLabel,
  ctaDisabled = false,
  ctaLoading = false,
  onCtaPress,
  children,
}: RecordSheetShellProps) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const ctaActive = !ctaDisabled && !ctaLoading
  const activeness = useSharedValue(ctaActive ? 1 : 0)
  const press = useSharedValue(0)

  /*
    키패드 탈출구를 띄울지만 결정한다. 셀렉터를 주는 이유는 높이까지 구독하면 키보드가
    오르는 내내 매 프레임 리렌더되기 때문 — 시트를 움직이는 건 gorhom 이고 여기는
    버튼 하나의 유무만 안다.
  */
  const keyboardShown = useKeyboardState((state) => state.isVisible)

  useEffect(() => {
    activeness.value = withTiming(ctaActive ? 1 : 0, TIMING)
  }, [activeness, ctaActive])

  const ctaStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeness.value,
      [0, 1],
      [surface.surfaceSunken, surface.brand],
    ),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }))

  const ctaTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeness.value,
      [0, 1],
      [surface.ctaOffText, surface.onBrand],
    ),
  }))

  return (
    <V2BottomSheet
      surface={analyticsSurface}
      visible={visible}
      onClose={onClose}
    >
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text
              style={[styles.title, { color: surface.textStrong }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.subtitle, { color: surface.textWeak }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            onPress={onClose}
            hitSlop={10}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: pressed
                      ? surface.surfacePressed
                      : surface.surfaceSunken,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={surface.textWeak} />
              </View>
            )}
          </Pressable>
        </View>

        {/*
          본문은 그냥 쌓인다 — 시트가 콘텐츠 높이대로 서므로 스크롤로 흡수할 넘침이
          없다(머리말 §높이). 예전에는 여기 `ScrollView` 가 있었는데, 그건 키보드가
          고정 높이 프레임을 눌러 오던 시절의 완충재였다.
        */}
        <View style={styles.content}>{children}</View>

        <View style={styles.ctaRow}>
          {/*
            숫자 키패드에는 완료 키가 없다. 시트 위로 못 올라오는 전역 툴바 대신
            여기가 이 시트의 탈출구다 — 키보드가 떠 있을 때만 자리를 차지한다.
          */}
          {keyboardShown ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("keyboard.dismiss")}
              onPress={() => KeyboardController.dismiss()}
              hitSlop={6}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.dismiss,
                    {
                      backgroundColor: pressed
                        ? surface.surfacePressed
                        : surface.surfaceSunken,
                    },
                  ]}
                >
                  <Ionicons
                    name="chevron-down"
                    size={22}
                    color={surface.textStrong}
                  />
                </View>
              )}
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !ctaActive }}
            style={styles.ctaWrap}
            onPress={() => {
              if (!ctaActive) return
              hapticStepAdvance()
              // 저장이 이 입력의 끝 — 키보드도 같이 내린다.
              KeyboardController.dismiss()
              onCtaPress()
            }}
            onPressIn={() => {
              if (!ctaActive) return
              press.value = withTiming(1, { duration: 90, easing: EASE })
            }}
            onPressOut={() => {
              press.value = withSpring(0, SPRING)
            }}
            disabled={!ctaActive}
          >
            <Animated.View style={[styles.cta, ctaStyle]}>
              {ctaLoading ? (
                <V2DotLoader size="s" color={surface.ctaOffText} />
              ) : null}
              <Animated.Text
                maxFontSizeMultiplier={FONT_SCALE.body}
                style={[styles.ctaLabel, ctaTextStyle]}
                numberOfLines={1}
              >
                {ctaLabel}
              </Animated.Text>
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 4,
    // 카드 간격 10 · 섹션 간격 28 사이 — 시트 안의 블록 간격
    gap: 18,
  },
  // children 사이 간격은 본문이 준다(예전 scrollContent 와 같은 18).
  content: { gap: 18 },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ctaWrap: { flex: 1 },
  dismiss: {
    width: LAYOUT.cta.height,
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headText: { flex: 1, gap: 3 },
  title: { ...TYPE.sheetTitle, fontWeight: "700" },
  subtitle: TYPE.cardSub,
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaLabel: { fontSize: 17, lineHeight: 24, fontWeight: "700" },
})
