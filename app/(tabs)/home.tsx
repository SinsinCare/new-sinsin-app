import { Image } from "expo-image"
import { StyleSheet, Pressable, View } from "react-native"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function HomeScreen() {
  const insets = useSafeAreaInsets()

  return (
    <ThemedView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.characterContainer}>
        <Image
          source={require("@/assets/images/kidney-character.png")}
          style={styles.characterImage}
          contentFit="contain"
          transition={500}
        />
        <ThemedText style={styles.welcomeText}>
          오늘 하루도 건강하게!
        </ThemedText>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.mainButton,
            pressed && styles.mainButtonPressed,
          ]}
          onPress={() => console.log("식단 기록하기 pressed")}
        >
          <ThemedText style={styles.buttonText}>식단 기록하기</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  characterContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  characterImage: {
    width: 280,
    height: 280,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#333",
  },
  buttonContainer: {
    marginBottom: 40,
  },
  mainButton: {
    backgroundColor: "#0a7ea4",
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  mainButtonPressed: {
    backgroundColor: "#056182",
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
})
