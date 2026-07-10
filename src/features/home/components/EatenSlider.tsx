import { useCallback, useEffect, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import Slider from "@react-native-community/slider"
import { Text, XStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { EATEN_STEPS } from "../data/foodEditConstants"

const MIN_STEP = 0
const MAX_STEP = EATEN_STEPS.length - 1

interface EatenSliderProps {
  value: number // 0 ~ MAX_STEP
  onChange: (step: number) => void
}

function clampStep(value: number): number {
  return Math.max(MIN_STEP, Math.min(MAX_STEP, value))
}

function getClosestStep(value: number): number {
  return clampStep(Math.round(value))
}

export function EatenSlider({ value, onChange }: EatenSliderProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const initialStep = useMemo(() => clampStep(value), [value])
  const [sliderValue, setSliderValue] = useState(initialStep)
  const [displayStep, setDisplayStep] = useState(initialStep)

  useEffect(() => {
    const nextStep = clampStep(value)
    setSliderValue(nextStep)
    setDisplayStep(nextStep)
  }, [value])

  const handleValueChange = useCallback((nextValue: number) => {
    setSliderValue(nextValue)
    setDisplayStep(getClosestStep(nextValue))
  }, [])

  const handleSlidingComplete = useCallback(
    (nextValue: number) => {
      const nextStep = getClosestStep(nextValue)
      setSliderValue(nextStep)
      setDisplayStep(nextStep)
      if (nextStep !== value) onChange(nextStep)
    },
    [onChange, value],
  )

  return (
    <>
      <View style={styles.sliderShell}>
        <Slider
          value={sliderValue}
          minimumValue={MIN_STEP}
          maximumValue={MAX_STEP}
          step={0}
          tapToSeek
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={tokens.color.sub6.val}
          maximumTrackTintColor={tokens.color.deleteBg.val}
          thumbTintColor={tokens.color.pureWhite.val}
          style={styles.slider}
        />
      </View>
      <XStack marginTop="$2">
        {EATEN_STEPS.map((label, i) => (
          <View key={i} style={styles.labelCell}>
            <Text
              fontSize={13}
              fontWeight={i === displayStep ? 500 : 400}
              color={
                i === displayStep
                  ? isDarkMode
                    ? "$textDark"
                    : "$color"
                  : "$colorSubtle"
              }
            >
              {label}
            </Text>
          </View>
        ))}
      </XStack>
    </>
  )
}

const styles = StyleSheet.create({
  labelCell: {
    alignItems: "center",
    flex: 1,
  },
  slider: {
    height: 44,
    width: "100%",
  },
  sliderShell: {
    justifyContent: "center",
    minHeight: 44,
  },
})
