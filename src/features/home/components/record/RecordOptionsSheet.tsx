import {
  Animated,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useEffect, useRef, useState } from "react"
import { Text, View, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"

interface RecordOptionsSheetProps {
  open: boolean
  onClose: () => void
  onCameraPhoto: () => void
  onTextRecord: () => void
  onRecipeLoad: () => void
}

export function RecordOptionsSheet({
  open,
  onClose,
  onCameraPhoto,
  onTextRecord,
  onRecipeLoad,
}: RecordOptionsSheetProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const [isVisible, setIsVisible] = useState(false)
  const translateY = useRef(new Animated.Value(300)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (open) {
      setIsVisible(true)
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 25,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      // backdrop 탭으로 닫힐 때만 fade 애니메이션
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setIsVisible(false))
    }
  }, [open, backdropOpacity, translateY])

  // 옵션 선택 시 Modal을 즉시 닫고 콜백 호출 (다른 Modal과 충돌 방지)
  const handleSelect = (callback: () => void) => {
    backdropOpacity.setValue(0)
    translateY.setValue(300)
    setIsVisible(false)
    callback()
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY }] }}>
          <YStack
            style={[
              styles.sheet,
              {
                backgroundColor: isDarkMode
                  ? tokens.color.cardBgDark.val
                  : tokens.color.appBg.val,
              },
            ]}
          >
            <View style={styles.handle} />

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleSelect(onCameraPhoto)}
            >
              <XStack alignItems="center" gap="$4">
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={tokens.color.primary7.val}
                />
                <Text
                  fontSize="$4"
                  fontWeight="500"
                  color={isDarkMode ? "$textDark" : "$color"}
                >
                  카메라/사진으로 기록하기
                </Text>
              </XStack>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleSelect(onTextRecord)}
            >
              <XStack alignItems="center" gap="$4">
                <Icon
                  name="pencil"
                  size={24}
                  color={tokens.color.primary7.val}
                />
                <Text
                  fontSize="$4"
                  fontWeight="500"
                  color={isDarkMode ? "$textDark" : "$color"}
                >
                  글로 기록하기
                </Text>
              </XStack>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleSelect(onRecipeLoad)}
            >
              <XStack alignItems="center" gap="$4">
                <Icon
                  name="recipe"
                  size={24}
                  color={tokens.color.deleteBg.val}
                />
                <Text fontSize="$4" fontWeight="500" color="$colorSubtle">
                  레시피 불러오기
                </Text>
              </XStack>
            </TouchableOpacity>
          </YStack>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sheet: {
    backgroundColor: tokens.color.appBg.val,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.color.grey6.val,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  option: {
    paddingVertical: 18,
  },
})
