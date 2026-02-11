import { ThemedText } from "@/components/themed-text"
import { Image } from "expo-image"
import { Pressable, StyleSheet } from "react-native"
import { View } from "tamagui"
import CharacterSection from "./CharacterSection"

interface RecordViewProps {
  selectedDate: Date
}

const RecordView = ({ selectedDate }: RecordViewProps) => {
  const isToday = selectedDate.toDateString() === new Date().toDateString()

  const dateLabel = isToday
    ? "오늘"
    : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`

  return (
    <>
      <View style={styles.characterContainer}>
        <CharacterSection />
        <ThemedText style={styles.welcomeText}>
          {isToday ? "오늘 하루도 건강하게!" : `${dateLabel}의 기록`}
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
    </>
  )
}

export default RecordView

const styles = StyleSheet.create({
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
