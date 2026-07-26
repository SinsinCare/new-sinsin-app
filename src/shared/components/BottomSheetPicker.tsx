import { useEffect, useRef, useState } from "react"
import {
  Animated,
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  borderWidth,
  controlHeight,
  radius,
  spacing,
  typography,
  useV2Theme,
  V2BottomSheet,
} from "@/src/design-system-v2"
import {
  getWheelPickerIndex,
  getWheelPickerValueAtOffset,
  resolveWheelPickerValue,
  type WheelPickerOption,
} from "./bottomSheetPickerModel"

const WHEEL_ITEM_HEIGHT = 48
const WHEEL_VISIBLE_ITEM_COUNT = 5
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEM_COUNT
const WHEEL_VERTICAL_PADDING = (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2

interface BottomSheetPickerProps {
  label?: string
  value: string
  options: WheelPickerOption[]
  onSelect: (value: string) => void
  placeholder?: string
  required?: boolean
  onOpenChange?: (open: boolean) => void
}

export function BottomSheetPicker({
  label,
  value,
  options,
  onSelect,
  placeholder = "선택해주세요",
  required,
  onOpenChange,
}: BottomSheetPickerProps) {
  const { colors } = useV2Theme()
  const listRef = useRef<Animated.FlatList<WheelPickerOption>>(null)
  const scrollY = useRef(new Animated.Value(0)).current
  const [visible, setVisible] = useState(false)
  const [pendingValue, setPendingValue] = useState(() =>
    resolveWheelPickerValue(value, options),
  )

  const selectedOption = options.find((option) => option.value === value)
  const wheelTitle = label ? `${label} 선택` : "항목 선택"

  const scrollToValue = (nextValue: string, animated: boolean) => {
    const index = getWheelPickerIndex(nextValue, options)
    scrollY.setValue(index * WHEEL_ITEM_HEIGHT)
    listRef.current?.scrollToOffset({
      offset: index * WHEEL_ITEM_HEIGHT,
      animated,
    })
  }

  useEffect(() => {
    if (!visible) return
    const nextValue = resolveWheelPickerValue(value, options)
    setPendingValue(nextValue)

    const frame = requestAnimationFrame(() => {
      scrollToValue(nextValue, false)
    })
    return () => cancelAnimationFrame(frame)
    // options are static for each picker instance; reopening re-syncs the committed value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, visible])

  const open = () => {
    Keyboard.dismiss()
    const nextValue = resolveWheelPickerValue(value, options)
    setPendingValue(nextValue)
    setVisible(true)
    onOpenChange?.(true)
  }

  const close = () => {
    setVisible(false)
    onOpenChange?.(false)
  }

  const confirm = () => {
    if (pendingValue) onSelect(pendingValue)
    close()
  }

  const updatePendingValue = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const targetOffset =
      event.nativeEvent.targetContentOffset?.y ??
      event.nativeEvent.contentOffset.y
    const nextValue = getWheelPickerValueAtOffset(
      targetOffset,
      WHEEL_ITEM_HEIGHT,
      options,
    )
    if (nextValue) setPendingValue(nextValue)
  }

  const renderItem = ({
    item,
    index,
  }: {
    item: WheelPickerOption
    index: number
  }) => {
    const itemOffset = index * WHEEL_ITEM_HEIGHT
    const inputRange = [
      itemOffset - WHEEL_ITEM_HEIGHT * 2,
      itemOffset - WHEEL_ITEM_HEIGHT,
      itemOffset,
      itemOffset + WHEEL_ITEM_HEIGHT,
      itemOffset + WHEEL_ITEM_HEIGHT * 2,
    ]
    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [0.22, 0.58, 1, 0.58, 0.22],
      extrapolate: "clamp",
    })
    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [0.86, 0.94, 1, 0.94, 0.86],
      extrapolate: "clamp",
    })
    const rotateX = scrollY.interpolate({
      inputRange,
      outputRange: ["48deg", "24deg", "0deg", "-24deg", "-48deg"],
      extrapolate: "clamp",
    })
    const selected = item.value === pendingValue

    return (
      <Animated.View
        style={[
          styles.wheelItem,
          {
            opacity,
            transform: [{ perspective: 900 }, { rotateX }, { scale }],
          },
        ]}
      >
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel={item.label}
          accessibilityState={{ checked: selected }}
          style={styles.wheelItemPressable}
          onPress={() => {
            setPendingValue(item.value)
            scrollToValue(item.value, true)
          }}
        >
          <Text
            style={[
              selected
                ? typography.body.mediumStrong
                : typography.body.mediumWeak,
              {
                color: selected ? colors.label.normal : colors.label.neutral,
              },
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <View style={styles.root}>
      {label ? (
        <Text
          style={[
            typography.subtext.mediumStrong,
            { color: colors.label.normal },
          ]}
        >
          {label}
          {required ? (
            <Text style={{ color: colors.status.negative }}> *</Text>
          ) : null}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityHint="휠 피커를 엽니다"
        accessibilityState={{ expanded: visible }}
        onPress={open}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: colors.background.default,
            borderColor: colors.line.normal,
          },
          pressed && styles.triggerPressed,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            typography.body.mediumWeak,
            {
              color: selectedOption
                ? colors.label.normal
                : colors.label.alternative,
            },
            styles.triggerText,
          ]}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.label.neutral} />
      </Pressable>

      <V2BottomSheet
        visible={visible}
        onClose={close}
        title={wheelTitle}
        secondaryLabel="취소"
        onSecondary={close}
        primaryLabel="확인"
        onPrimary={confirm}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={wheelTitle}
          style={styles.wheelViewport}
          onLayout={() => scrollToValue(pendingValue, false)}
        >
          <View
            pointerEvents="none"
            style={[
              styles.selectionIndicator,
              {
                borderColor: colors.line.normal,
              },
            ]}
          />
          <Animated.FlatList
            ref={listRef}
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            snapToInterval={WHEEL_ITEM_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.wheelContent}
            getItemLayout={(_, index) => ({
              length: WHEEL_ITEM_HEIGHT,
              offset: WHEEL_ITEM_HEIGHT * index,
              index,
            })}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true },
            )}
            onScrollEndDrag={updatePendingValue}
            onMomentumScrollEnd={updatePendingValue}
            scrollEventThrottle={16}
          />
        </View>
      </V2BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: spacing[6],
  },
  trigger: {
    minHeight: 54,
    borderWidth: borderWidth.thin,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[16],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  triggerPressed: {
    opacity: 0.85,
  },
  triggerText: {
    flex: 1,
  },
  wheelViewport: {
    height: WHEEL_HEIGHT,
    marginTop: spacing[16],
    overflow: "hidden",
  },
  wheelContent: {
    paddingVertical: WHEEL_VERTICAL_PADDING,
  },
  selectionIndicator: {
    position: "absolute",
    zIndex: 0,
    top: WHEEL_VERTICAL_PADDING,
    left: spacing[24],
    right: spacing[24],
    height: WHEEL_ITEM_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
  },
  wheelItemPressable: {
    minHeight: controlHeight.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[24],
  },
})
