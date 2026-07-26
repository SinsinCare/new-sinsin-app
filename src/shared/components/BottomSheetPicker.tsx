import { useState, useRef, useEffect } from "react"
import {
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tokens } from "@/src/theme/tokens"

const SCREEN_HEIGHT = Dimensions.get("window").height
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.5

interface PickerOption {
  label: string
  value: string
}

interface BottomSheetPickerProps {
  label?: string
  value: string
  options: PickerOption[]
  onSelect: (value: string) => void
  placeholder?: string
  required?: boolean
  onOpenChange?: (open: boolean) => void
}

export function getBottomSheetPickerColors(isDark: boolean) {
  return {
    label: isDark ? tokens.color.textDark.val : "#17191C",
    placeholder: isDark ? "#6B7280" : "#A0A4A8",
    inputBg: isDark ? "#2A2A32" : "white",
    inputBorder: isDark ? tokens.color.borderDark.val : "rgba(218,223,230,0.6)",
    chevron: isDark ? tokens.color.textDarkSub.val : "#787C83",
    sheetBg: isDark ? "#2A2A32" : "white",
    handle: isDark ? tokens.color.borderDark.val : "#E0E0E0",
    selectedBg: isDark ? `${tokens.color.sub8.val}20` : "#F0FDF4",
    selectedText: tokens.color.sub8.val,
    itemText: isDark ? tokens.color.textDark.val : "#17191C",
  }
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
  const [visible, setVisible] = useState(false)
  const insets = useSafeAreaInsets()
  const translateY = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current
  const isDark = useAppColorScheme() === "dark"

  const selectedOption = options.find((o) => o.value === value)

  const colors = getBottomSheetPickerColors(isDark)

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [backdropOpacity, translateY, visible])

  const close = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_MAX_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false)
      onOpenChange?.(false)
    })
  }

  const handleSelect = (v: string) => {
    onSelect(v)
    close()
  }

  const open = () => {
    Keyboard.dismiss()
    onOpenChange?.(true)
    setVisible(true)
  }

  return (
    <YStack>
      {label && (
        <XStack paddingBottom={10}>
          <Text
            fontSize={13}
            fontWeight="500"
            color={colors.label}
            letterSpacing={-0.3}
            lineHeight={18.2}
          >
            {label}
          </Text>
          {required && (
            <Text fontSize={13} fontWeight="500" color={tokens.color.error.val}>
              {" "}
              *
            </Text>
          )}
        </XStack>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityHint="선택 항목을 엽니다"
        accessibilityState={{ expanded: visible }}
        onPress={open}
      >
        <XStack
          backgroundColor={colors.inputBg}
          borderWidth={1}
          borderColor={colors.inputBorder}
          borderRadius={8}
          height={52}
          alignItems="center"
          paddingHorizontal={16}
          justifyContent="space-between"
        >
          <Text
            fontSize={16}
            color={selectedOption ? colors.label : colors.placeholder}
            letterSpacing={-0.3}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.chevron} />
        </XStack>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Backdrop */}
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="선택창 닫기"
              style={styles.backdropPress}
              onPress={close}
            />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                transform: [{ translateY }],
                paddingBottom: insets.bottom,
                backgroundColor: colors.sheetBg,
              },
            ]}
          >
            <YStack alignItems="center" paddingVertical={12}>
              <YStack
                width={40}
                height={4}
                backgroundColor={colors.handle}
                borderRadius={2}
              />
            </YStack>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={{ maxHeight: SHEET_MAX_HEIGHT - 60 }}
              initialScrollIndex={
                options.findIndex((o) => o.value === value) > 0
                  ? options.findIndex((o) => o.value === value)
                  : undefined
              }
              getItemLayout={(_, index) => ({
                length: 48,
                offset: 48 * index,
                index,
              })}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={item.label}
                  accessibilityState={{ checked: item.value === value }}
                  onPress={() => handleSelect(item.value)}
                >
                  <XStack
                    height={48}
                    paddingHorizontal={20}
                    backgroundColor={
                      item.value === value ? colors.selectedBg : "transparent"
                    }
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Text
                      fontSize={16}
                      color={
                        item.value === value
                          ? colors.selectedText
                          : colors.itemText
                      }
                      fontWeight={item.value === value ? "600" : "400"}
                      letterSpacing={-0.3}
                    >
                      {item.label}
                    </Text>
                    {item.value === value && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.selectedText}
                      />
                    )}
                  </XStack>
                </Pressable>
              )}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </YStack>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SHEET_MAX_HEIGHT,
  },
})
