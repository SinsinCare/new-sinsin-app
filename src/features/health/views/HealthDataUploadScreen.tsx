import React, { useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
} from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import * as ImagePicker from "expo-image-picker"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { UPLOAD_TIPS } from "@/src/features/health/data/mock"

const MAX_FILES = 5

export function HealthDataUploadScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [files, setFiles] = useState<string[]>([])

  const pickFromCamera = async () => {
    if (files.length >= MAX_FILES) return
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") return

    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 })
    if (!result.canceled && result.assets[0]) {
      setFiles((prev) => [...prev, result.assets[0].uri])
    }
  }

  const pickFromGallery = async () => {
    if (files.length >= MAX_FILES) return
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") return

    const remaining = MAX_FILES - files.length
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.9,
    })
    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri)
      setFiles((prev) => [...prev, ...newUris].slice(0, MAX_FILES))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAnalyze = () => {
    router.replace("/(settings)/health-data-upload")
  }

  const canAdd = files.length < MAX_FILES

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="검사 결과 가져오기"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.title}>검사 결과를 가져올까요?</ThemedText>
        <ThemedText style={styles.subtitle}>
          정확한 건강 관리를 위해 검사지를 업로드 해주세요
        </ThemedText>

        {/* 첨부 파일 영역 (항상 표시) */}
        <View style={styles.attachSection}>
          <View style={styles.attachHeader}>
            <ThemedText style={styles.attachTitle}>
              첨부 파일{" "}
              <ThemedText style={styles.attachCount}>
                {files.length}/{MAX_FILES}
              </ThemedText>
            </ThemedText>
            {files.length > 0 && (
              <Pressable onPress={() => setFiles([])} hitSlop={8}>
                <ThemedText style={styles.clearAllText}>전체 삭제</ThemedText>
              </Pressable>
            )}
          </View>

          {/* 파일 썸네일 그리드 */}
          <View style={styles.thumbGrid}>
            {files.map((uri, index) => (
              // 썸네일 wrapper는 overflow:visible 명시 — X버튼은 내부에 위치
              <View key={`${uri}-${index}`} style={styles.thumbWrapper}>
                <Image
                  source={{ uri }}
                  style={styles.thumb}
                  contentFit="cover"
                />
                {/* X버튼을 썸네일 내부 우상단에 배치 (bounds 안) */}
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => removeFile(index)}
                  hitSlop={6}
                >
                  <View style={styles.removeBtnInner}>
                    <Ionicons name="close" size={11} color="#FFFFFF" />
                  </View>
                </Pressable>
              </View>
            ))}

            {/* 추가 슬롯 (최대치 미달 시) */}
            {canAdd && (
              <View style={styles.addSlot}>
                <Pressable
                  style={({ pressed }) => [
                    styles.addSlotButton,
                    pressed && styles.addSlotButtonPressed,
                  ]}
                  onPress={pickFromGallery}
                >
                  <Ionicons name="add" size={28} color="#94A3B8" />
                  <ThemedText style={styles.addSlotText}>파일 추가</ThemedText>
                </Pressable>
              </View>
            )}
          </View>

          {/* 첨부 방법 버튼 */}
          <View style={styles.pickRow}>
            <Pressable
              style={({ pressed }) => [
                styles.pickButton,
                !canAdd && styles.pickButtonDisabled,
                pressed && canAdd && styles.pickButtonPressed,
              ]}
              onPress={pickFromCamera}
              disabled={!canAdd}
            >
              <Ionicons
                name="camera-outline"
                size={18}
                color={canAdd ? "#44AF94" : "#C5C8CE"}
              />
              <ThemedText
                style={[
                  styles.pickButtonText,
                  !canAdd && styles.pickButtonTextDisabled,
                ]}
              >
                카메라로 촬영
              </ThemedText>
            </Pressable>

            <View style={styles.pickDivider} />

            <Pressable
              style={({ pressed }) => [
                styles.pickButton,
                !canAdd && styles.pickButtonDisabled,
                pressed && canAdd && styles.pickButtonPressed,
              ]}
              onPress={pickFromGallery}
              disabled={!canAdd}
            >
              <Ionicons
                name="images-outline"
                size={18}
                color={canAdd ? "#44AF94" : "#C5C8CE"}
              />
              <ThemedText
                style={[
                  styles.pickButtonText,
                  !canAdd && styles.pickButtonTextDisabled,
                ]}
              >
                갤러리에서 선택
              </ThemedText>
            </Pressable>
          </View>

          {!canAdd && (
            <ThemedText style={styles.maxReachedText}>
              최대 {MAX_FILES}개까지 첨부할 수 있어요. 파일을 삭제 후
              추가해주세요.
            </ThemedText>
          )}
        </View>

        {/* 안내사항 */}
        <View style={styles.tipsBox}>
          {UPLOAD_TIPS.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color="#44AF94"
                style={styles.tipIcon}
              />
              <ThemedText style={styles.tipText}>{tip}</ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomActionBar
        label="분석 시작하기"
        disabled={files.length === 0}
        paddingBottom={insets.bottom + 16}
        onPress={handleAnalyze}
      />

    </ThemedView>
  )
}

const THUMB_SIZE = 80

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    color: "#17191C",
    marginBottom: 8,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#94A3B8",
    marginBottom: 20,
  },
  // 첨부 영역
  attachSection: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  attachHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  attachTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  attachCount: {
    color: "#44AF94",
  },
  clearAllText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  // 썸네일 그리드
  thumbGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    minHeight: THUMB_SIZE,
  },
  thumbWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: "hidden", // 이미지 라운드 클리핑
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  // X버튼: 썸네일 내부 우상단 (overflow:hidden 내에서 position:absolute)
  removeBtn: {
    position: "absolute",
    top: 5,
    right: 5,
  },
  removeBtnInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  addSlot: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  addSlotButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "#F8FAFC",
  },
  addSlotButtonPressed: {
    backgroundColor: "#F0F2F5",
  },
  addSlotText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  // 첨부 방법 버튼 행
  pickRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
  },
  pickButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  pickButtonPressed: {
    backgroundColor: "#F0FDF4",
  },
  pickButtonDisabled: {
    opacity: 0.5,
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#44AF94",
  },
  pickButtonTextDisabled: {
    color: "#C5C8CE",
  },
  pickDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
  },
  maxReachedText: {
    fontSize: 12,
    color: "#F59E0B",
    textAlign: "center",
  },
  // 안내사항
  tipsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 24,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipIcon: {
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
  },
  // 로딩
  loadingOverlay: {
    flex: 1,
    backgroundColor: "#00000060",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#17191C",
    textAlign: "center",
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
})
