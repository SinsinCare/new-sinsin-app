import { useEffect, type ReactNode } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { KeyboardController } from "react-native-keyboard-controller"
import Ionicons from "@expo/vector-icons/Ionicons"
import { AppBottomSheet } from "@/src/shared/components/AppBottomSheet"
import { useSheetKeyboardLift } from "./useSheetKeyboardLift"
import { hapticStepAdvance } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, MOTION, TYPE } from "@/src/theme/surface"
import { V2DotLoader } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }
const TIMING = {
  duration: MOTION.duration.base,
  easing: EASE,
  reduceMotion: ReduceMotion.System,
}

interface RecordSheetShellProps {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** 화면 높이 대비 %. 입력 필드가 있으면 키보드 몫까지 크게 잡는다. */
  snapPoint: number
  /** 값이 담긴 CTA 라벨 — "저장" 대신 "200ml 기록하기". */
  ctaLabel: string
  ctaDisabled?: boolean
  ctaLoading?: boolean
  onCtaPress: () => void
  /** 본문에 숫자 직접 입력이 있으면 켠다 — 키보드가 CTA 를 덮지 않게 시트를 밀어 올린다. */
  adjustForKeyboard?: boolean
  children: ReactNode
}

/**
 * 기록 시트의 공통 뼈대 — 제목 17/700 + 보조 한 줄 + 닫기(✕), 본문, CTA h56 r16 17/700.
 * CTA 는 가입 스텝과 같은 문법으로 움직인다: 활성화되는 순간 회색 면이 브랜드색으로
 * 물들고, 누르면 살짝 눌린다. 시트 안에서도 주인공은 CTA 하나다.
 *
 * ## 키보드 — 왜 CTA 가 시트 안에서 떠오르는가
 *
 * 키보드 위에 바를 세우는 길은 하나뿐인 줄 알았다: 루트에 `KeyboardStickyView`(전역
 * 툴바·도크)를 두는 것. **그건 이 시트 위로 못 올라온다.** `KeyboardToolbar` 조차
 * 내부 구현이 `KeyboardStickyView` 라(react-native-keyboard-controller), 네이티브
 * 키보드가 아니라 앱 뷰 계층에 사는 평범한 뷰다. 기록 시트는 그보다 위에 그려지므로
 * 루트에 무엇을 두든 시트 뒤에 깔린다 — 2026-08-03 실측: 키패드를 올리면 CTA·판정·
 * 구간 바가 전부 덮이고, 주황 CTA 가 반투명 키패드 **뒤로** 비쳤다. 1.1.24·1.1.25 가
 * 연달아 "여전히 키보드가 가린다" 로 돌아온 이유가 이것이다.
 *
 * 그래서 CTA 를 시트 **안에** 두고, 본문 아래 여백을 키보드 높이만큼 키운다. 시트는
 * 한 픽셀도 안 움직이고(상단이 시계·배터리를 덮던 QA 2026-08-02 재발 방지), CTA 만
 * 키보드 위로 떠오른다. 눌린 만큼 좁아진 본문은 스크롤로 흡수한다 — 값·판정·칩 중
 * 어느 것도 닿을 수 없는 곳에 남지 않는다.
 *
 * 껍데기(`Sheet.Frame` 의 content)는 여전히 **View 여야 한다.** 거길 ScrollView 로
 * 바꿨다가 시트 12개가 백지가 됐다(AppBottomSheet 머리말). 스크롤은 여기, 높이가
 * 확정된 세로 열(머리 · 본문 · CTA) 안쪽에서만 연다.
 */
export function RecordSheetShell({
  visible,
  onClose,
  title,
  subtitle,
  snapPoint,
  ctaLabel,
  ctaDisabled = false,
  ctaLoading = false,
  onCtaPress,
  adjustForKeyboard = false,
  children,
}: RecordSheetShellProps) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const ctaActive = !ctaDisabled && !ctaLoading
  const activeness = useSharedValue(ctaActive ? 1 : 0)
  const press = useSharedValue(0)

  // 키보드 대응은 시트 안에서 — 왜 그런지는 useSheetKeyboardLift 머리말.
  const { bodyStyle, snapPoints, keyboardShown } =
    useSheetKeyboardLift(snapPoint)

  useEffect(() => {
    activeness.value = withTiming(ctaActive ? 1 : 0, TIMING)
  }, [activeness, ctaActive])

  const ctaStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeness.value,
      [0, 1],
      [surface.ctaOffBg, surface.brand],
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
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={snapPoints}
      adjustForKeyboard={adjustForKeyboard}
      /* 바닥 여백은 키보드에 맞춰 여기서 직접 준다 — 두 겹이면 CTA 가 두 번 밀린다. */
      contentBottomPadding={false}
    >
      <Animated.View style={[styles.body, bodyStyle]}>
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
                      : surface.surface,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={surface.textWeak} />
              </View>
            )}
          </Pressable>
        </View>

        {/*
          키보드가 눌러 온 만큼 본문이 좁아진다. 스크롤을 여기 두면 값·판정·칩이
          화면 밖으로 밀리는 대신 손이 닿는 곳에 남는다. `keyboardShouldPersistTaps`
          는 키패드가 떠 있는 채로 칩을 한 번에 고르기 위한 것 — 없으면 첫 탭이
          키보드 닫기에 먹힌다.
        */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>

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
                        : surface.surface,
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
                style={[styles.ctaLabel, ctaTextStyle]}
                numberOfLines={1}
              >
                {ctaLabel}
              </Animated.Text>
            </Animated.View>
          </Pressable>
        </View>
      </Animated.View>
    </AppBottomSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    // 프레임 높이를 채워야 머리·본문·CTA 의 세로 열이 성립한다(스크롤이 여기서 갈린다).
    flex: 1,
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 4,
    // 카드 간격 10 · 섹션 간격 28 사이 — 시트 안의 블록 간격
    gap: 18,
  },
  /*
    남는 높이를 본문이 먹는다 — 그래야 CTA 가 시트 바닥(키보드가 뜨면 키보드 바로 위)에
    붙는다. 본문이 넘치면 flexShrink 로 눌리고 그만큼 스크롤이 생긴다.
  */
  scroll: { flexGrow: 1, flexShrink: 1 },
  scrollContent: { gap: 18, paddingBottom: 2 },
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
