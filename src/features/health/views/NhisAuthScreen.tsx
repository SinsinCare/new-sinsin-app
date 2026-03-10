import React from "react"
import { StyleSheet, View, Pressable } from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"

export function NhisAuthScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const handleStart = () => {
    // TODO: 건강보험공단 본인인증 연동
  }

  return (
    <ThemedView style={styles.container}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color="#374151" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>신신당부</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        {/* 일러스트 영역 */}
        <View style={styles.illustrationWrapper}>
          <LinearGradient
            colors={["#0F3D35", "#1A6B5A", "#0D4A3E"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.illustrationBg}
          >
            <Image
              source={require("@/assets/images/kidney-character.png")}
              style={styles.illustrationImage}
              contentFit="contain"
            />
          </LinearGradient>
          {/* 아이콘 배지 */}
          <View style={styles.iconBadge}>
            <Ionicons name="person-circle-outline" size={28} color="#FFFFFF" />
          </View>
        </View>

        {/* 텍스트 영역 */}
        <View style={styles.textSection}>
          <ThemedText style={styles.title}>
            {
              "건강보험공단의\n검사 결과를 불러오기 위해\n본인인증이 필요합니다."
            }
          </ThemedText>
          <ThemedText style={styles.description}>
            {
              "신신당부는 소중한 정보를 안전하게 보호하며,\n인증 데이터는 암호화됩니다."
            }
          </ThemedText>
        </View>

        {/* 본인인증 시작 버튼 */}
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.startButtonPressed,
          ]}
          onPress={handleStart}
        >
          <ThemedText style={styles.startButtonText}>본인인증 시작</ThemedText>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>

        {/* 보안 배지 */}
        <View style={styles.badgeRow}>
          <View style={styles.securityBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color="#44AF94"
            />
            <ThemedText style={styles.securityBadgeText}>
              보안 인증 완료
            </ThemedText>
          </View>
          <View style={styles.securityBadge}>
            <Ionicons name="lock-closed-outline" size={13} color="#44AF94" />
            <ThemedText style={styles.securityBadgeText}>
              데이터 암호화
            </ThemedText>
          </View>
        </View>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#17191C",
  },
  headerRight: {
    width: 24,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  // 일러스트
  illustrationWrapper: {
    position: "relative",
    width: "100%",
  },
  illustrationBg: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  illustrationImage: {
    width: "60%",
    height: "60%",
  },
  iconBadge: {
    position: "absolute",
    bottom: -16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#44AF94",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  // 텍스트
  textSection: {
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: "700",
    color: "#17191C",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
  },
  // 버튼
  startButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#44AF94",
    borderRadius: 14,
    paddingVertical: 18,
  },
  startButtonPressed: {
    backgroundColor: "#3A9E85",
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // 보안 배지
  badgeRow: {
    flexDirection: "row",
    gap: 12,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
  },
  securityBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0D896A",
  },
})
