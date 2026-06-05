import { useState } from "react"
import { View, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, useTheme } from "tamagui"
import { tokens } from "../../../../theme/tokens"
import { CIRCLE_SIZE } from "../../data/nutrientConstants"
import { clampTranslateX, fmt } from "../../utils/graphUtils"
import { ChipWithLine } from "./ChipWithLine"

interface NutrientBarSectionProps {
  isOver: boolean
  isEmpty: boolean
  atLimit: boolean
  fillPct: number
  limitPct: number
  current: number
  max: number
  unit: string
}

export function NutrientBarSection({
  isOver,
  isEmpty,
  atLimit,
  fillPct,
  limitPct,
  current,
  max,
  unit,
}: NutrientBarSectionProps) {
  const [intakeChipW, setIntakeChipW] = useState(0)
  const [limitChipW, setLimitChipW] = useState(0)
  const [currentValW, setCurrentValW] = useState(0)
  const [maxValW, setMaxValW] = useState(0)
  const [barWidth, setBarWidth] = useState(0)

  const theme = useTheme()
  const isDark = useAppColorScheme() === "dark"
  const colorFillNormal = theme.secondary.val
  const colorFillOver = theme.warning.val
  const colorTrack = theme.borderColor.val
  const colorLimitTick = tokens.color.grey7.val
  const circleBg = isDark ? tokens.color.appBgDark.val : "white"
  const separatorColor = isDark ? tokens.color.appBgDark.val : "white"

  const intakeAtRightEdge = isOver || atLimit
  const showLimitChip = !atLimit
  const limitChipAtRightEdge = !isOver
  const intakePctValue = isEmpty ? null : fillPct
  const circleColor = isOver ? colorFillOver : colorFillNormal

  return (
    <>
      {/* 칩 + 바를 묶어 gap 없이 바로 연결 (선이 bar에 닿도록) */}
      <View>
        {/* 라벨 칩 영역 */}
        <View
          style={styles.chipArea}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {/* 하루 섭취량 칩 */}
          {intakePctValue !== null &&
            (intakeAtRightEdge ? (
              // 초과/제한도달: 오른쪽 정렬
              <View style={[styles.absChip, { right: -10 }]}>
                <View
                  onLayout={(e) => setIntakeChipW(e.nativeEvent.layout.width)}
                >
                  <ChipWithLine label="하루 섭취량" isOver={isOver} />
                </View>
              </View>
            ) : (
              // 정상: fillPct 위치에 센터 정렬, 제한량 칩과 겹치지 않도록 클램프
              <View
                style={[
                  styles.absChip,
                  {
                    left: `${intakePctValue}%`,
                    transform: [
                      {
                        translateX: clampTranslateX(
                          intakePctValue!,
                          intakeChipW,
                          barWidth,
                          limitChipW,
                        ),
                      },
                    ],
                  },
                ]}
              >
                <View
                  onLayout={(e) => setIntakeChipW(e.nativeEvent.layout.width)}
                >
                  <ChipWithLine label="하루 섭취량" isOver={isOver} />
                </View>
              </View>
            ))}

          {/* 제한량 칩 */}
          {!isEmpty &&
            showLimitChip &&
            (limitChipAtRightEdge ? (
              // 비초과: 오른쪽 정렬
              <View style={[styles.absChip, { right: -10 }]}>
                <View
                  onLayout={(e) => setLimitChipW(e.nativeEvent.layout.width)}
                >
                  <ChipWithLine label="제한량" />
                </View>
              </View>
            ) : (
              // 초과: limitPct 위치에 센터 정렬, 하루섭취량 칩과 겹치지 않도록 클램프
              <View
                style={[
                  styles.absChip,
                  {
                    left: `${limitPct}%`,
                    transform: [
                      {
                        translateX: clampTranslateX(
                          limitPct,
                          limitChipW,
                          barWidth,
                          intakeChipW,
                        ),
                      },
                    ],
                  },
                ]}
              >
                <View
                  onLayout={(e) => setLimitChipW(e.nativeEvent.layout.width)}
                >
                  <ChipWithLine label="제한량" />
                </View>
              </View>
            ))}

          {/* 미섭취: 제한량 칩만 오른쪽 */}
          {isEmpty && (
            <View style={[styles.absChip, { right: 0 }]}>
              <ChipWithLine label="제한량" />
            </View>
          )}
        </View>

        {/* 바 영역 (원형 인디케이터 포함) */}
        <View style={styles.barWrapper}>
          {/* 트랙 */}
          <View style={[styles.track, { backgroundColor: colorTrack }]}>
            {isOver ? (
              // 초과: 제한량까지 녹색 + 흰 구분선 + 초과분만 주황
              <View style={styles.rowFill}>
                <View
                  style={{ flex: limitPct, backgroundColor: colorFillNormal }}
                />
                <View style={{ width: 2, backgroundColor: separatorColor }} />
                <View
                  style={{
                    flex: 100 - limitPct,
                    backgroundColor: colorFillOver,
                  }}
                />
              </View>
            ) : (
              !isEmpty && (
                <View
                  style={[
                    styles.fill,
                    { width: `${fillPct}%`, backgroundColor: colorFillNormal },
                  ]}
                />
              )
            )}
            {/* 제한량 틱 마크: 초과/제한도달 제외 */}
            {!isOver && !atLimit && (
              <View
                style={[styles.limitTick, { backgroundColor: colorLimitTick }]}
              />
            )}
          </View>

          {/* 원형 인디케이터 - 바 끝점에 센터 */}
          {!isEmpty &&
            (intakeAtRightEdge ? (
              // 오른쪽 끝: 반절 튀어나오게
              <View
                style={[styles.circleWrapper, { right: -(CIRCLE_SIZE / 10) }]}
              >
                <View
                  style={[
                    styles.barCircle,
                    { borderColor: circleColor, backgroundColor: circleBg },
                  ]}
                />
              </View>
            ) : (
              // fillPct 위치: 센터 정렬
              <View
                style={[
                  styles.circleWrapper,
                  {
                    left: `${fillPct}%`,
                    transform: [{ translateX: -CIRCLE_SIZE }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.barCircle,
                    { borderColor: circleColor, backgroundColor: circleBg },
                  ]}
                />
              </View>
            ))}
        </View>
      </View>

      {/* 스케일 수치 - 칩 위치와 동일하게 절대 위치로 정렬 */}
      <View style={styles.scaleRow}>
        {isEmpty ? (
          // 미섭취: 0 왼쪽, max 오른쪽
          <>
            <Text fontSize={11} color="$colorSubtle">
              {fmt(0)}
              {unit}
            </Text>
            <View style={styles.scaleAbsRight}>
              <Text fontSize={11} color="$colorSubtle">
                {fmt(max)}
                {unit}
              </Text>
            </View>
          </>
        ) : atLimit ? (
          // 제한도달: current만 오른쪽
          <View style={styles.scaleAbsRight}>
            <Text fontSize={11} color="$colorSubtle">
              {fmt(current)}
              {unit}
            </Text>
          </View>
        ) : isOver ? (
          // 초과: max를 limitPct% 중앙, current를 오른쪽, 겹침 방지
          <>
            <View
              style={[
                styles.scaleAbsCenter,
                {
                  left: `${limitPct}%`,
                  transform: [
                    {
                      translateX: clampTranslateX(
                        limitPct,
                        maxValW,
                        barWidth,
                        currentValW,
                      ),
                    },
                  ],
                },
              ]}
              onLayout={(e) => setMaxValW(e.nativeEvent.layout.width)}
            >
              <Text fontSize={11} color="$colorSubtle">
                {fmt(max)}
                {unit}
              </Text>
            </View>
            <View
              style={styles.scaleAbsRight}
              onLayout={(e) => setCurrentValW(e.nativeEvent.layout.width)}
            >
              <Text fontSize={11} color="$colorSubtle">
                {fmt(current)}
                {unit}
              </Text>
            </View>
          </>
        ) : (
          // 정상: current를 fillPct% 중앙, max를 오른쪽, 겹침 방지
          <>
            <View
              style={[
                styles.scaleAbsCenter,
                {
                  left: `${fillPct}%`,
                  transform: [
                    {
                      translateX: clampTranslateX(
                        fillPct,
                        currentValW,
                        barWidth,
                        maxValW,
                      ),
                    },
                  ],
                },
              ]}
              onLayout={(e) => setCurrentValW(e.nativeEvent.layout.width)}
            >
              <Text fontSize={11} color="$colorSubtle">
                {fmt(current)}
                {unit}
              </Text>
            </View>
            <View
              style={styles.scaleAbsRight}
              onLayout={(e) => setMaxValW(e.nativeEvent.layout.width)}
            >
              <Text fontSize={11} color="$colorSubtle">
                {fmt(max)}
                {unit}
              </Text>
            </View>
          </>
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  chipArea: {
    position: "relative",
    height: 40,
  },
  absChip: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
  },
  barWrapper: {
    position: "relative",
    paddingVertical: 3,
  },
  track: {
    height: 12,
    borderRadius: 5,
    overflow: "hidden",
    position: "relative",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
  },
  rowFill: {
    flexDirection: "row",
    height: "100%",
  },
  limitTick: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
  },
  circleWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: CIRCLE_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  barCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "white",
    borderWidth: 2,
  },
  scaleRow: {
    position: "relative",
    height: 16,
  },
  scaleAbsCenter: {
    position: "absolute",
  },
  scaleAbsRight: {
    position: "absolute",
    right: 0,
  },
})
