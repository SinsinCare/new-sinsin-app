import { ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import {
  BackHandler,
  GestureResponderEvent,
  Modal,
  Pressable,
  ScrollView,
  type ScrollViewProps,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native"
import { Sheet } from "@tamagui/sheet"
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import {
  getBottomSheetContentPadding,
  getBottomSheetPalette,
  getTamaguiSheetPosition,
  getTamaguiSheetSnapPoints,
} from "@/src/shared/utils/appBottomSheet"

const HANDLE_ONLY_SPRING = {
  damping: 28,
  mass: 0.9,
  stiffness: 260,
}

const CLOSE_DRAG_DISTANCE = 96
const CLOSE_VELOCITY = 900

interface AppBottomSheetProps {
  visible: boolean
  onClose: () => void
  snapPoints: number[]
  children: ReactNode
  initialSnapIndex?: number
  contentContainerStyle?: StyleProp<ViewStyle>
  contentBottomPadding?: boolean
  dragHandleOnly?: boolean
  disableDrag?: boolean
  /**
   * 키보드가 올라오면 시트를 그만큼 밀어 올린다. **입력이 있는 시트는 반드시 켠다.**
   * 시트는 화면 바닥에 붙어 있어서, 끄면 키보드가 CTA 를 통째로 덮는다 — 값을 다 치고도
   * 저장 버튼에 닿을 수 없는 상태가 되고, 그 사실이 화면에 드러나지도 않는다.
   *
   * 기본값이 false 인 이유: 입력이 없는 시트에서는 키보드가 뜰 일이 없는데도 Tamagui 가
   * 키보드 리스너를 달고 위치를 다시 계산한다. 필요한 곳에서만 켠다.
   */
  adjustForKeyboard?: boolean
}

export function AppBottomSheet({
  visible,
  onClose,
  snapPoints,
  children,
  initialSnapIndex = 0,
  contentContainerStyle,
  contentBottomPadding = true,
  dragHandleOnly = false,
  disableDrag = false,
  adjustForKeyboard = false,
}: AppBottomSheetProps) {
  const insets = useSafeAreaInsets()
  const isDark = useAppColorScheme() === "dark"
  const palette = getBottomSheetPalette(isDark)
  const sheetSnapPoints = useMemo(
    () => getTamaguiSheetSnapPoints(snapPoints),
    [snapPoints],
  )
  const initialPosition = useMemo(
    () => getTamaguiSheetPosition(snapPoints, initialSnapIndex),
    [initialSnapIndex, snapPoints],
  )
  const [position, setPosition] = useState(initialPosition)

  useEffect(() => {
    if (visible) {
      setPosition(initialPosition)
    }
  }, [initialPosition, visible])

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
  }, [onClose, visible])

  if (dragHandleOnly) {
    return (
      <HandleOnlyBottomSheet
        visible={visible}
        onClose={onClose}
        snapPoints={sheetSnapPoints}
        initialPosition={initialPosition}
        palette={palette}
        contentContainerStyle={contentContainerStyle}
        contentBottomPadding={contentBottomPadding}
      >
        {children}
      </HandleOnlyBottomSheet>
    )
  }

  return (
    <Sheet
      modal
      open={visible}
      onOpenChange={(open: boolean) => {
        if (!open) onClose()
      }}
      snapPoints={sheetSnapPoints}
      snapPointsMode="percent"
      position={position}
      onPositionChange={setPosition}
      dismissOnSnapToBottom
      dismissOnOverlayPress
      disableDrag={disableDrag}
      moveOnKeyboardChange={adjustForKeyboard}
    >
      <Sheet.Overlay
        style={{ backgroundColor: palette.overlay }}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        backgroundColor={palette.background}
      >
        <Sheet.Handle
          marginHorizontal="auto"
          marginVertical={12}
          onPress={(event: GestureResponderEvent) => {
            event.preventDefault()
          }}
          style={[styles.handleIndicator, { backgroundColor: palette.handle }]}
        />
        <View
          style={[
            styles.content,
            contentBottomPadding
              ? { paddingBottom: getBottomSheetContentPadding(insets.bottom) }
              : null,
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      </Sheet.Frame>
    </Sheet>
  )
}

interface HandleOnlyBottomSheetProps {
  visible: boolean
  onClose: () => void
  snapPoints: number[]
  initialPosition: number
  palette: ReturnType<typeof getBottomSheetPalette>
  children: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
  contentBottomPadding: boolean
}

function HandleOnlyBottomSheet({
  visible,
  onClose,
  snapPoints,
  initialPosition,
  palette,
  children,
  contentContainerStyle,
  contentBottomPadding,
}: HandleOnlyBottomSheetProps) {
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()
  const sheetHeight = useSharedValue(0)
  const startHeight = useSharedValue(0)

  const snapHeights = useMemo(
    () => snapPoints.map((point) => screenHeight * (point / 100)),
    [screenHeight, snapPoints],
  )
  const minSnapHeight =
    snapHeights[snapHeights.length - 1] ?? snapHeights[0] ?? screenHeight
  const initialHeight = snapHeights[initialPosition] ?? minSnapHeight

  const closeWithAnimation = useCallback(() => {
    sheetHeight.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(onClose)()
      }
    })
  }, [onClose, sheetHeight])

  useEffect(() => {
    if (!visible) return

    sheetHeight.value = 0
    sheetHeight.value = withSpring(initialHeight, HANDLE_ONLY_SPRING)
  }, [initialHeight, sheetHeight, visible])

  const handleGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          startHeight.value = sheetHeight.value
        })
        .onUpdate((event) => {
          const nextHeight = startHeight.value - event.translationY
          sheetHeight.value = Math.min(screenHeight, Math.max(0, nextHeight))
        })
        .onEnd((event) => {
          const currentHeight = sheetHeight.value
          const projectedHeight = currentHeight - event.velocityY * 0.15
          const shouldClose =
            currentHeight < minSnapHeight - CLOSE_DRAG_DISTANCE ||
            (event.velocityY > CLOSE_VELOCITY &&
              currentHeight < minSnapHeight + 24)

          if (shouldClose) {
            sheetHeight.value = withTiming(0, { duration: 180 }, (finished) => {
              if (finished) {
                runOnJS(onClose)()
              }
            })
            return
          }

          let targetHeight = snapHeights[0] ?? currentHeight
          let targetDistance = Math.abs(projectedHeight - targetHeight)

          for (const snapHeight of snapHeights) {
            const distance = Math.abs(projectedHeight - snapHeight)
            if (distance < targetDistance) {
              targetHeight = snapHeight
              targetDistance = distance
            }
          }

          sheetHeight.value = withSpring(targetHeight, HANDLE_ONLY_SPRING)
        }),
    [
      minSnapHeight,
      onClose,
      screenHeight,
      sheetHeight,
      snapHeights,
      startHeight,
    ],
  )

  const animatedFrameStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }))

  return (
    <Modal
      animationType="none"
      transparent
      statusBarTranslucent
      visible={visible}
      onRequestClose={closeWithAnimation}
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          onPress={closeWithAnimation}
          style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}
        />
        <Animated.View
          style={[
            styles.handleOnlyFrame,
            {
              backgroundColor: palette.background,
            },
            animatedFrameStyle,
          ]}
        >
          <GestureDetector gesture={handleGesture}>
            <View accessibilityRole="adjustable" style={styles.handleTouchArea}>
              <View
                style={[
                  styles.handleIndicator,
                  { backgroundColor: palette.handle },
                ]}
              />
            </View>
          </GestureDetector>
          <View
            style={[
              styles.content,
              contentBottomPadding
                ? { paddingBottom: getBottomSheetContentPadding(insets.bottom) }
                : null,
              contentContainerStyle,
            ]}
          >
            {children}
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  )
}

export function AppBottomSheetScrollView({
  contentContainerStyle,
  ...props
}: ScrollViewProps) {
  const insets = useSafeAreaInsets()
  const flattenedContentStyle = StyleSheet.flatten(contentContainerStyle)
  const baseBottomPadding =
    typeof flattenedContentStyle?.paddingBottom === "number"
      ? flattenedContentStyle.paddingBottom
      : typeof flattenedContentStyle?.paddingVertical === "number"
        ? flattenedContentStyle.paddingVertical
        : typeof flattenedContentStyle?.padding === "number"
          ? flattenedContentStyle.padding
          : 0

  return (
    <ScrollView
      bounces={false}
      overScrollMode="never"
      {...props}
      showsVerticalScrollIndicator={props.showsVerticalScrollIndicator ?? false}
      contentContainerStyle={[
        contentContainerStyle,
        {
          paddingBottom:
            baseBottomPadding + getBottomSheetContentPadding(insets.bottom),
        },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  handleOnlyFrame: {
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
  },
  handleTouchArea: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
})
