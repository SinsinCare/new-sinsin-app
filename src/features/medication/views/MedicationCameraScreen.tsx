import { useEffect, useRef, useState } from "react"
import { Linking, Pressable, StyleSheet, View } from "react-native"
import { CameraView, useCameraPermissions } from "expo-camera"
import * as ImagePicker from "expo-image-picker"
import { LinearGradient } from "expo-linear-gradient"
import Ionicons from "@expo/vector-icons/Ionicons"
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/shared/components/AppText"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { useGoBack } from "@/src/shared/navigation"
import { LAYOUT } from "@/src/theme/surface"
import {
  primitives,
  semanticLight,
  spacing,
  typography,
} from "@/src/design-system-v2/tokens"
import { showErrorToast } from "@/src/lib/toast"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
import { preparePillPhoto } from "../services/medicationPhotos"

/**
 * 알약 촬영(기획 M9 · AC-01~AC-10). 푸드 카메라와 같은 뼈대(전체 미리보기 · 제목/X ·
 * 네 모서리 괄호 · 흰 셔터)에 알약 전용 장치만 얹는다:
 *   - 앞면 1/2 → 뒷면 2/2 두 장이 기본이고, 뒷면은 건너뛸 수 있다(AC-01·02).
 *   - 프레임은 정사각에 가깝다 — 알약이 화면을 채워야 각인이 읽힌다(AC-03).
 *   - 플래시는 기본 꺼짐. 켜면 각인이 반사로 지워진다(AC-06). 어두우면 사용자가 켠다.
 *   - 하단에 "사진은 약 식별에만 쓴다"를 상시 표시한다(AC-10·RQ-59).
 *   - 왼쪽 아래 앨범 버튼(AC-09).
 * 찍은 사진은 `preparePillPhoto` 로 다듬어 플로우 스토어의 `photos[side]` 에 넣고, 두 장이
 * 모이거나 뒷면을 건너뛰면 사진 화면으로 돌아간다. 확인·전송은 그 화면이 한다(AC-19).
 */
export function MedicationCameraScreen() {
  const { t } = useTranslation("medication")
  const insets = useSafeAreaInsets()
  const s = useSurface()
  const [permission, requestPermission] = useCameraPermissions()
  const goBack = useGoBack("/medication/photo")
  const cameraRef = useRef<CameraView>(null)
  const startPhotos = useMedicationFlowStore.getState().photos
  const [side, setSide] = useState<0 | 1>(startPhotos[0] ? 1 : 0)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [flash, setFlash] = useState(false)
  const [torch, setTorch] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const captureLock = useRef(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const askedRef = useRef(false)
  const finishedRef = useRef(false)
  const shutterPress = useSharedValue(0)
  const shutterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - shutterPress.value * 0.12 }],
  }))

  useEffect(() => {
    if (!permission || permission.granted || askedRef.current) return
    if (!permission.canAskAgain && permission.status === "denied") return
    askedRef.current = true
    void requestPermission()
  }, [permission, requestPermission])
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    [],
  )

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    goBack()
  }
  const store = (index: 0 | 1, uri: string) => {
    const next = [...useMedicationFlowStore.getState().photos]
    next[index] = { uri }
    if (index === 0 && next.length > 1 && !next[1]) next.length = 1
    useMedicationFlowStore.getState().setPhotos(next)
  }
  const accept = async (uri: string) => {
    const photo = await preparePillPhoto(uri)
    store(side, photo.uri)
    hapticSelection()
    if (side === 0) setSide(1)
    else finish()
  }
  const handleShutter = async () => {
    if (
      !isReady ||
      captureLock.current ||
      finishedRef.current ||
      !cameraRef.current
    )
      return
    captureLock.current = true
    setIsCapturing(true)
    setFlash(true)
    flashTimer.current = setTimeout(() => setFlash(false), 140)
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: false,
      })
      if (!photo?.uri) throw new Error("no photo")
      await accept(photo.uri)
    } catch {
      if (finishedRef.current) return
      showErrorToast(t("captureError"))
    } finally {
      captureLock.current = false
      setIsCapturing(false)
    }
  }
  const handleGallery = async () => {
    if (captureLock.current || finishedRef.current) return
    captureLock.current = true
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: false,
        exif: false,
      })
      if (picked.canceled || !picked.assets[0]) return
      await accept(picked.assets[0].uri)
    } catch {
      if (!finishedRef.current) showErrorToast(t("photoReadError"))
    } finally {
      captureLock.current = false
    }
  }
  const handleCancel = () => {
    hapticSelection()
    finish()
  }
  const granted = permission?.granted ?? false
  const live = granted && !cameraError

  return (
    <View style={styles.root}>
      {live ? (
        <CameraView
          key={cameraAttempt}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          onCameraReady={() => setIsReady(true)}
          onMountError={() => {
            setIsReady(false)
            setCameraError(true)
          }}
        />
      ) : (
        <View
          style={[
            styles.denied,
            { backgroundColor: s.canvas, paddingTop: insets.top + spacing[32] },
          ]}
        >
          <Ionicons name="camera-outline" size={40} color={s.textWeak} />
          <Text
            style={[styles.deniedTitle, { color: s.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t(cameraError ? "cameraError" : "cameraDenied")}
          </Text>
          <Text
            style={[styles.deniedBody, { color: s.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t(cameraError ? "captureError" : "cameraDeniedBody")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (cameraError) {
                setCameraError(false)
                setCameraAttempt((attempt) => attempt + 1)
                return
              }
              if (permission?.canAskAgain === false) {
                void Linking.openSettings()
                return
              }
              void requestPermission()
            }}
            style={({ pressed }) => [
              styles.deniedButton,
              { backgroundColor: s.brand, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.deniedButtonLabel, { color: s.onBrand }]}>
              {t(
                cameraError
                  ? "cameraRetry"
                  : permission?.canAskAgain === false
                    ? "openSettings"
                    : "cameraAllow",
              )}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.deniedLink,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.deniedBody, { color: s.brand }]}>
              {t("searchMethod")}
            </Text>
          </Pressable>
        </View>
      )}

      {flash ? (
        <Animated.View
          pointerEvents="none"
          entering={FadeIn.duration(40)}
          exiting={FadeOut.duration(160)}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: semanticLight.static.white },
          ]}
        />
      ) : null}

      {live && (
        <LinearGradient
          pointerEvents="none"
          colors={[primitives.opacityBlack[700], "transparent"]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + 120,
          }}
        />
      )}
      <Animated.View
        entering={FadeIn.duration(240).reduceMotion(ReduceMotion.System)}
        style={[styles.header, { marginTop: insets.top + 8 }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("cancel")}
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.headerSide,
            styles.headerButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Ionicons
            name="close"
            size={26}
            color={live ? semanticLight.static.white : s.textStrong}
          />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { color: live ? semanticLight.static.white : s.textStrong },
          ]}
        >
          {t("cameraTitle")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: torch }}
          accessibilityLabel={t("cameraTorch")}
          disabled={!live}
          onPress={() => setTorch((value) => !value)}
          style={({ pressed }) => [
            styles.headerSide,
            styles.headerButton,
            { opacity: !live ? 0 : pressed ? 0.5 : 1 },
          ]}
        >
          <Ionicons
            name={torch ? "flash" : "flash-off-outline"}
            size={22}
            color={semanticLight.static.white}
          />
        </Pressable>
      </Animated.View>

      {live && (
        <>
          {/* 진행 표시 — 앞면 촬영 1/2, 뒷면 촬영 2/2 (AC-01) */}
          <View style={[styles.stepWrap, { top: insets.top + 64 }]}>
            <View style={styles.step}>
              <Text style={styles.stepText}>
                {t(side === 0 ? "cameraStepFront" : "cameraStepBack")}
              </Text>
            </View>
          </View>
          {/* 정사각 점선 프레임 — 알약이 이 안을 채우게 한다(AC-03) */}
          <Animated.View
            pointerEvents="none"
            entering={FadeIn.delay(200)
              .duration(320)
              .reduceMotion(ReduceMotion.System)}
            style={[
              styles.frameWrap,
              { top: insets.top + 110, bottom: insets.bottom + 220 },
            ]}
          >
            <View style={styles.frame} />
          </Animated.View>
          <View style={[styles.bottom, { bottom: insets.bottom + 20 }]}>
            <Text style={styles.cameraHint} lineBreakStrategyIOS="hangul-word">
              {t("cameraGuide")}
            </Text>
            <Text
              style={styles.cameraHintSub}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("cameraGuideSub")}
            </Text>
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("gallery")}
                disabled={isCapturing}
                onPress={() => void handleGallery()}
                style={({ pressed }) => [
                  styles.sideButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Ionicons
                  name="images-outline"
                  size={24}
                  color={semanticLight.static.white}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("cameraShutter")}
                disabled={!isReady || isCapturing}
                onPress={() => void handleShutter()}
                onPressIn={() => {
                  shutterPress.value = withTiming(1, {
                    duration: 90,
                    reduceMotion: ReduceMotion.System,
                  })
                }}
                onPressOut={() => {
                  shutterPress.value = withSpring(0, {
                    damping: 12,
                    stiffness: 260,
                    reduceMotion: ReduceMotion.System,
                  })
                }}
              >
                <Animated.View
                  style={[
                    styles.shutter,
                    { opacity: isCapturing ? 0.7 : 1 },
                    shutterStyle,
                  ]}
                >
                  <View style={styles.shutterInner} />
                </Animated.View>
              </Pressable>
              {side === 1 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={finish}
                  style={({ pressed }) => [
                    styles.sideButton,
                    styles.skip,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={styles.skipText}>{t("cameraSkipBack")}</Text>
                </Pressable>
              ) : (
                <View style={styles.sideButton} />
              )}
            </View>
            <Text style={styles.purpose} lineBreakStrategyIOS="hangul-word">
              {t("cameraPurpose")}
            </Text>
          </View>
        </>
      )}
    </View>
  )
}

const FRAME_COLOR = primitives.opacityWhite[800]
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semanticLight.static.black },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: LAYOUT.screenX - 10,
  },
  headerSide: { width: 44, height: 44 },
  headerButton: { alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.title.xSmallWeak, flex: 1, textAlign: "center" },
  stepWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  step: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: primitives.opacityBlack[600],
  },
  stepText: { ...typography.caption.small, color: semanticLight.static.white },
  frameWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: FRAME_COLOR,
    borderRadius: 12,
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: spacing[12],
  },
  cameraHint: {
    ...typography.subtext.large,
    color: semanticLight.static.white,
    textAlign: "center",
    marginHorizontal: spacing[24],
    textShadowColor: primitives.opacityBlack[600],
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
  cameraHintSub: {
    ...typography.caption.small,
    color: primitives.opacityWhite[800],
    textAlign: "center",
    marginHorizontal: spacing[24],
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 280,
    marginTop: spacing[8],
  },
  sideButton: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  skip: { width: 72 },
  skipText: { ...typography.subtext.medium, color: semanticLight.static.white },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: semanticLight.static.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: semanticLight.static.white,
  },
  purpose: {
    ...typography.caption.small,
    color: primitives.opacityWhite[800],
    textAlign: "center",
    marginHorizontal: spacing[24],
  },
  denied: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[32],
    gap: spacing[12],
  },
  deniedTitle: { ...typography.title.small, textAlign: "center" },
  deniedBody: { ...typography.subtext.large, textAlign: "center" },
  deniedButton: {
    marginTop: spacing[8],
    paddingHorizontal: spacing[24],
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deniedButtonLabel: { ...typography.subtext.large },
  deniedLink: { minHeight: 44, justifyContent: "center" },
})
