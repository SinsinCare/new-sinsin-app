import { useEffect, useRef, useState } from "react"
import { useV2Theme, V2Box, V2Text } from "@/src/design-system-v2"
import { BackHandler, StyleSheet, TouchableOpacity } from "react-native"
import { Portal } from "@/src/shared/components/Portal"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Icon } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import type { FoodAnalysisStatus } from "@/src/types"
import { useTranslation } from "react-i18next"
import {
  LOADING_TIP_INTERVAL_MS,
  LOADING_TIP_KEYS,
  createTipCycler,
} from "./loadingTips"

/**
 * 분석·저장 동안 화면 전체를 덮는 로딩 막.
 *
 * **RN Modal 이 아니다 — 일부러.** 이 오버레이는 다른 네이티브 모달과 같은 틱에
 * 열리고 닫힌다: 글 기록(pageSheet)을 닫으며 열리고, 결과(pageSheet)·확인 질문을
 * 열며 닫힌다. iOS 의 RN Modal 은 자기 뷰트리 VC 에서 present 하므로(V2DialogHost
 * 머리말) 두 모달의 present/dismiss 가 겹치면 UIKit 전환이 꼬이고, 전환이 끝내
 * 마무리되지 않으면 UITransitionView 가 남아 **앱 전체가 터치를 잃는다**. 분석이
 * 빠르게 실패하면(로컬 서버 즉시 오류) pageSheet dismiss → 오버레이 present →
 * 오버레이 dismiss 가 300ms 안에 다 겹쳐 이 멈춤이 그대로 재현됐다(2026-08-03).
 * fd797e0 이 Alert 변형을 고쳤지만 Modal-Modal 변형이 남아 있었다. JS 뷰로 그리면
 * UIKit 전환 자체가 없어 이 계열이 통째로 사라진다.
 *
 * 기본은 루트 `PortalProvider` 호스트로 텔레포트 — 탭바까지 덮는다(Tamagui Sheet
 * 와 같은 경로). 네이티브 Modal **안**에서 쓸 때는(FoodResultEdit) 루트 포털이
 * 그 모달 뒤에 깔려 보이지 않으므로 `inline` 으로 모달 뷰트리 안에 직접 그린다.
 */
interface LoadingOverlayProps {
  visible: boolean
  message: string
  onDismiss?: () => void
  status?: FoodAnalysisStatus | null
  /** 네이티브 Modal 안에서 띄울 때 켠다 — 루트 포털은 그 모달 아래 깔린다. */
  inline?: boolean
}

export function LoadingOverlay({
  visible,
  message,
  onDismiss,
  status,
  inline,
}: LoadingOverlayProps) {
  if (!visible) return null
  const body = (
    <LoadingOverlayBody
      message={message}
      onDismiss={onDismiss}
      status={status}
    />
  )
  return inline ? body : <Portal>{body}</Portal>
}

function LoadingOverlayBody({
  message,
  onDismiss,
  status,
}: Omit<LoadingOverlayProps, "visible" | "inline">) {
  const { colors } = useV2Theme()
  const { t } = useTranslation("common")
  const [dots, setDots] = useState(".")
  /*
    팁 순서는 마운트마다 새로 섞는다(`loadingTips` 머리말). ref 인 이유: 순환기는
    상태가 아니라 **다음 팁을 아는 장치**고, 렌더마다 다시 만들면 순서가 초기화된다.
  */
  const tipCycler = useRef(createTipCycler(LOADING_TIP_KEYS.length))
  const [tipIndex, setTipIndex] = useState(() => tipCycler.current.current())
  const [showDismiss, setShowDismiss] = useState(false)
  const floatY = useSharedValue(0)
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))
  const isDarkMode = useAppColorScheme() === "dark"
  const statusMessage =
    status === "QUEUED"
      ? t("foodLoading.status.QUEUED")
      : status === "PERCEIVING"
        ? t("foodLoading.status.PERCEIVING")
        : status === "RESOLVING"
          ? t("foodLoading.status.RESOLVING")
          : message

  // visible 일 때만 마운트되므로 타이머·애니메이션은 수명과 함께 간다.
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    )
    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."))
    }, 500)
    const tipInterval = setInterval(() => {
      setTipIndex(tipCycler.current.next())
    }, LOADING_TIP_INTERVAL_MS)
    const dismissTimer = setTimeout(() => {
      setShowDismiss(true)
    }, 3000)

    return () => {
      clearInterval(dotsInterval)
      clearInterval(tipInterval)
      clearTimeout(dismissTimer)
    }
  }, [floatY])

  // 네이티브 Modal 시절과 같게, 안드로이드 뒤로가기가 오버레이 밑 화면으로
  // 새지 않도록 여기서 삼킨다.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true)
    return () => sub.remove()
  }, [])

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={StyleSheet.absoluteFill}
      // 손잡이 없는 View 는 터치 타깃이 아니라 탭이 아래 화면으로 샌다 —
      // 떠 있는 동안 아래를 잠그는 게 이 막의 역할이므로 응답자를 자처한다.
      onStartShouldSetResponder={() => true}
    >
      <V2Box
        flex={1}
        align="center"
        justify="center"
        style={{ backgroundColor: colors.background.default }}
      >
        {/* X 버튼: 3초 후 표시 */}
        {showDismiss && onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={{
              position: "absolute",
              top: 56,
              right: 20,
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="close"
              size={26}
              color={
                isDarkMode ? tokens.color.textDark.val : tokens.color.grey3.val
              }
            />
          </TouchableOpacity>
        )}

        <Animated.View style={floatStyle}>
          <Icon name="loading" size={55} />
        </Animated.View>
        <V2Text
          color={colors.label.normal}
          lineBreakStrategyIOS="hangul-word"
          style={{ fontSize: 18, fontWeight: "600", marginTop: 16 }}
        >
          {`${statusMessage}${dots}`}
        </V2Text>
        {/*
          팁 한 장. 라벨은 "안내" 가 아니라 **읽을거리**라는 신호다 — 상태 문장(위)과
          같은 층으로 읽히면 "이것도 진행 상황인가" 로 오독한다. 문장은 `key` 로 갈아
          끼워 바뀔 때마다 새로 페이드인한다.
        */}
        <V2Text
          color={colors.label.assistive}
          style={{
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 1.2,
            marginTop: 20,
          }}
        >
          {t("foodLoading.tipLabel")}
        </V2Text>
        <Animated.View
          key={tipIndex}
          entering={FadeIn.duration(260)}
          style={{ marginHorizontal: 24 }}
        >
          <V2Text
            color={colors.label.alternative}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
            style={{
              fontSize: 14,
              fontWeight: "500",
              textAlign: "center",
              marginTop: 6,
              lineHeight: 21,
            }}
          >
            {t(LOADING_TIP_KEYS[tipIndex] ?? LOADING_TIP_KEYS[0])}
          </V2Text>
        </Animated.View>

        {showDismiss && onDismiss && (
          <V2Text
            color={colors.label.alternative}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
            style={{
              fontSize: 13,
              textAlign: "center",
              marginTop: 24,
              marginHorizontal: 24,
              lineHeight: 18,
            }}
          >
            {t("foodLoading.dismissHint")}
          </V2Text>
        )}
      </V2Box>
    </Animated.View>
  )
}
