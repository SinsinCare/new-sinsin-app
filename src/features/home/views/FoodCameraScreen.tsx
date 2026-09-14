import { useEffect, useRef, useState } from "react"
import { Linking, Pressable, StyleSheet, View } from "react-native"
import { CameraView, useCameraPermissions } from "expo-camera"
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
import { useGoBack } from "@/src/shared/navigation"
import { V2DialogHost } from "@/src/design-system-v2"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { Text } from "@/src/shared/components/AppText"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import { useFoodCameraStore } from "@/src/features/home/stores/foodCameraStore"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import {
  primitives,
  semanticLight,
  radius,
  spacing,
  typography,
} from "@/src/design-system-v2/tokens"
import { showErrorToast } from "@/src/lib/toast"
import { pickImageAssetFromGallery } from "@/src/features/recipe/services/imagePickerService"

/**
 * 푸드 카메라 — 등록 절차 시안(2026-09-04, `camera.svg`).
 *
 * 화면 전체가 미리보기, 위에 "푸드 카메라" 제목과 X, 가운데 네 모서리 괄호(피사체를
 * 그 안에 두라는 안내), 아래에 흰 셔터. 찍으면 여는 쪽의 `onCapture`
 * 로 URI 를 넘기고 페이지를 내린다 — 확인 단계는 두지 않는다(예전 OS 카메라도 그랬다).
 *
 * 권한이 없으면 미리보기 자리에 이유와 "권한 허용" 버튼을 둔다. 조용히 빈 화면으로
 * 두면 "카메라가 고장났다" 로 읽힌다.
 */
export default function FoodCameraScreen() {
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const s = useSurface()
  const handlers = useFoodCameraStore((state) => state.handlers)
  const clear = useFoodCameraStore((state) => state.clear)
  const [permission, requestPermission] = useCameraPermissions()
  // 직접 `router.back()` 을 부르지 않는다(`tests/navigationBackGuard`).
  const goBack = useGoBack("/(tabs)/home")
  const cameraRef = useRef<CameraView>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [flash, setFlash] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const captureLock = useRef(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const askedRef = useRef(false)
  const finishedRef = useRef(false)
  // 셔터: 누르는 동안 움츠렸다가 놓으면 스프링 — 찍혔다는 손맛.
  const shutterPress = useSharedValue(0)
  const shutterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - shutterPress.value * 0.12 }],
  }))

  /*
    재료(콜백) 없이 이 주소로 오면(딥링크·재시작·스토어가 이미 비워짐) 찍어도 갈 곳이
    없다 — 셔터가 눌리고 사진이 조용히 버려진다. 리포트 페이지와 같은 규칙으로 바로
    되돌아간다(2026-09-05 검수).
  */
  const emptyRef = useRef(false)
  useEffect(() => {
    if (handlers !== null || emptyRef.current || finishedRef.current) return
    emptyRef.current = true
    goBack()
  }, [goBack, handlers])

  // 처음 들어오면 한 번 묻는다. 거부는 아래 화면이 설명한다.
  useEffect(() => {
    if (!permission || permission.granted || askedRef.current) return
    if (!permission.canAskAgain && permission.status === "denied") return
    askedRef.current = true
    void requestPermission().then((result) => {
      // 이름을 리터럴로 쏜다 — 계측 표(`tests/analyticsJourneyHome`)가 소스에서 이름을 센다.
      if (result.granted) {
        trackAnalyticsEvent("food_photo_permission_granted", {
          source: "camera",
        })
      } else {
        trackAnalyticsEvent("food_photo_permission_denied", {
          source: "camera",
        })
      }
    })
  }, [permission, requestPermission])

  const finish = (after: () => void) => {
    if (finishedRef.current) return
    finishedRef.current = true
    // 페이지를 먼저 내리고 여는 쪽 일을 한다 — 분석 오버레이가 이 페이지 위에서
    // 열렸다 닫히면 전환이 겹친다.
    goBack()
    clear()
    after()
  }

  /*
    셔터도 X 도 아닌 길(안드로이드 뒤로가기)로 사라지면 취소와 같다 — 시트로 되돌리고
    스토어를 비운다. 비우지 않으면 낡은 콜백이 남는다(코드리뷰 2026-09-04).
  */
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
      if (finishedRef.current) return
      finishedRef.current = true
      const current = useFoodCameraStore.getState().handlers
      useFoodCameraStore.getState().clear()
      current?.onCancel()
    },
    [],
  )

  const handleCancel = () => {
    hapticSelection()
    /*
      권한 벽에서 멈춘 것은 **취소가 아니다.** 갈라 두지 않으면 거부한 사람이 denied 와
      cancelled 두 이름에 동시에 세어져 두 비율이 같이 부풀어 오른다(RecordView 시절과
      같은 규칙). `replacing` 은 앨범 시절의 축이라 여기선 늘 false 다.
    */
    if (permission?.granted) {
      trackAnalyticsEvent("food_photo_picker_cancelled", {
        source: "camera",
        replacing: false,
      })
    }
    finish(() => handlers?.onCancel())
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
    // 찍히는 순간 흰 섬광 한 번 — 카메라 앱의 관습이라 설명 없이 "찍혔다" 로 읽힌다.
    setFlash(true)
    flashTimer.current = setTimeout(() => setFlash(false), 140)
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      })
      if (!photo?.uri) throw new Error("no photo")
      const uri = photo.uri
      finish(() => handlers?.onCapture(uri))
    } catch {
      if (finishedRef.current) return
      showErrorToast(t("foodCamera.captureError"))
      setIsCapturing(false)
    } finally {
      captureLock.current = false
    }
  }

  /**
   * 갤러리에서 가져오기 — 촬영과 **같은 출구**(`onCapture(uri)`)로 나간다. 예전 시트에는 이 길이
   * 있었는데 카메라 화면으로 바꾸면서 사라졌다(디자인 피드백 2026-09-11). 권한·취소는 헬퍼가 처리한다.
   */
  const handleGallery = async () => {
    if (captureLock.current || finishedRef.current) return
    captureLock.current = true
    try {
      const asset = await pickImageAssetFromGallery()
      if (!asset || finishedRef.current) return
      finish(() => handlers?.onCapture(asset.uri))
    } finally {
      captureLock.current = false
    }
  }

  const granted = permission?.granted ?? false

  return (
    <View style={styles.root}>
      {granted && !cameraError ? (
        <CameraView
          key={cameraAttempt}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
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
            {t(
              cameraError
                ? "foodCamera.cameraError"
                : "foodCamera.permissionTitle",
            )}
          </Text>
          <Text
            style={[styles.deniedBody, { color: s.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t(
              cameraError
                ? "foodCamera.captureError"
                : "foodCamera.permissionBody",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            /*
              영구 거부(`canAskAgain === false`)면 `requestPermission()` 은 즉시 거부로
              끝난다 — 버튼이 아무 일도 안 하는 것처럼 보였다(2026-09-05 검수). 그때는
              안내 문구가 가리키는 곳(설정)을 직접 연다.
            */
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
                  ? "foodCamera.cameraRetry"
                  : permission?.canAskAgain === false
                    ? "foodCamera.settings"
                    : "foodCamera.allow",
              )}
            </Text>
          </Pressable>
          {/* 카메라를 거부했어도 앨범은 별개 권한이다 — 여기서 막히면 사진 기록 자체가 닫힌다. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("foodCamera.gallery")}
            onPress={() => {
              hapticSelection()
              void handleGallery()
            }}
            style={({ pressed }) => [
              styles.deniedSecondary,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.deniedButtonLabel, { color: s.textStrong }]}>
              {t("foodCamera.gallery")}
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

      {/* 제목 줄 — 시안 y55 h34: 가운데 제목, 오른쪽 X */}
      {granted && !cameraError && (
        <LinearGradient
          pointerEvents="none"
          colors={[primitives.opacityBlack[700], "transparent"]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + 100,
          }}
        />
      )}
      <Animated.View
        entering={FadeIn.duration(240).reduceMotion(ReduceMotion.System)}
        style={[styles.header, { marginTop: insets.top + 8 }]}
      >
        <View style={styles.headerSide} />
        <Text
          style={[
            styles.headerTitle,
            {
              color:
                granted && !cameraError
                  ? semanticLight.static.white
                  : s.textStrong,
            },
          ]}
        >
          {t("foodCamera.title")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
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
            color={
              granted && !cameraError
                ? semanticLight.static.white
                : s.textStrong
            }
          />
        </Pressable>
      </Animated.View>

      {/* 네 모서리 괄호 — 시안 x22~353, y145~648 */}
      {granted && !cameraError && (
        <Animated.View
          pointerEvents="none"
          entering={FadeIn.delay(200)
            .duration(320)
            .reduceMotion(ReduceMotion.System)}
          style={[
            styles.frame,
            { top: insets.top + 95, bottom: insets.bottom + 164 },
          ]}
        >
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </Animated.View>
      )}

      {/* 셔터 — 시안 y712 지름 76 */}
      {granted && !cameraError && (
        <View style={[styles.shutterWrap, { bottom: insets.bottom + 24 }]}>
          <Text style={styles.cameraHint} lineBreakStrategyIOS="hangul-word">
            {t("foodCamera.guide")}
          </Text>
          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("foodCamera.gallery")}
              disabled={isCapturing}
              onPress={() => {
                hapticSelection()
                void handleGallery()
              }}
              style={({ pressed }) => [
                styles.galleryButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View style={styles.galleryIcon}>
                <Ionicons
                  name="images-outline"
                  size={24}
                  color={semanticLight.static.black}
                />
              </View>
              <Text style={styles.galleryLabel}>{t("foodCamera.gallery")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("foodCamera.shutter")}
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
          </View>
        </View>
      )}
      {/*
        이 페이지는 네이티브 스택의 fullScreenModal 이다. 루트 V2DialogHost 의 RN Modal 은
        루트 VC 에서 present 하는데, 화면 모달이 떠 있으면 iOS 가 present 를 거부해
        확인창이 **조용히 안 뜬다**(V2DialogHost 머리말). 사진 권한이 거부된 상태에서
        갤러리 버튼이 "설정 열기" 를 물어야 하는데 아무것도 안 보이던 이유(2026-09-12 제보).
        ReviewWriteScreen 과 같이 안쪽에 하나 더 둔다 — 호스트는 스택이라 이쪽이 가져간다.
      */}
      <V2DialogHost />
    </View>
  )
}

const CORNER = 28
const CORNER_WIDTH = 2
const CORNER_COLOR = primitives.opacityWhite[800]

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
  headerTitle: {
    ...typography.title.xSmallWeak,
    flex: 1,
    textAlign: "center",
  },
  frame: { position: "absolute", left: 22, right: 22 },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: CORNER_COLOR,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 4,
  },
  shutterWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: spacing[24],
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
  // 셔터는 가운데 고정, 갤러리는 왼쪽 여백에 절대 배치 — 셔터 위치가 버튼 유무로 흔들리지 않는다.
  controls: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryButton: {
    position: "absolute",
    left: spacing[32],
    alignItems: "center",
    gap: spacing[4],
  },
  galleryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    // §L4: 화면이 원시 팔레트를 직접 칠하지 않는다 — 촬영 안내 필과 같은 흰 필(약 카메라와 동일).
    backgroundColor: semanticLight.static.white,
  },
  galleryLabel: {
    ...typography.subtext.small,
    color: semanticLight.static.white,
    textShadowColor: primitives.opacityBlack[600],
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
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
  denied: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[32],
    gap: spacing[12],
  },
  deniedTitle: {
    ...typography.title.small,
    textAlign: "center",
    marginTop: 8,
  },
  deniedBody: {
    ...typography.subtext.large,
    textAlign: "center",
  },
  deniedButton: {
    marginTop: spacing[16],
    minHeight: 48,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  deniedSecondary: {
    minHeight: 44,
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[24],
    alignItems: "center",
    justifyContent: "center",
  },
  deniedButtonLabel: {
    ...typography.label.medium,
    textAlign: "center",
    flexShrink: 1,
  },
})
