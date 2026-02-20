import { useState } from "react"
import { View, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Text, XStack, YStack, useTheme } from "tamagui"
import { tokens } from "../../../../theme/tokens"
import { CIRCLE_SIZE } from "../../data/nutrientConstants"

interface NutrientGraphProps {
  nutrient: string
  current: number
  max: number
  unit: string
}

function ChipWithLine({ label, isOver }: { label: string; isOver?: boolean }) {
  const color = isOver ? tokens.color.primary7.val : tokens.color.grey5.val
  return (
    <View style={{ alignItems: "center" }}>
      <XStack
        backgroundColor={isOver ? "$primaryLight" : "$borderColor"}
        borderRadius={4}
        paddingHorizontal={6}
        paddingVertical={2}
      >
        <Text fontSize="$3" color={isOver ? "$primary" : "$color"}>
          {label}
        </Text>
      </XStack>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <Ionicons name="chevron-down" size={10} color={color} />
    </View>
  )
}

function LimitLabel() {
  const color = tokens.color.grey5.val
  return (
    <View style={{ alignItems: "center" }}>
      <Text fontSize="$3" color="$colorSubtle">
        제한량
      </Text>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <Ionicons name="chevron-down" size={10} color={color} />
    </View>
  )
}

/**
 * left: `${centerPct}%` + transform: [{translateX: result}] 형태로 사용.
 * 아이템을 centerPct% 위치에 중앙 정렬하되, 오른쪽 아이템과 gap 이상 간격 유지.
 */
function clampTranslateX(
  centerPct: number,
  itemWidth: number,
  barWidth: number,
  rightItemWidth: number,
  gap: number = 6,
): number {
  const rawT = -(itemWidth / 2)
  if (barWidth === 0) return rawT
  const centerPx = barWidth * (centerPct / 100)
  const maxT = barWidth - rightItemWidth - gap - centerPx - itemWidth
  const minT = -centerPx
  return Math.max(minT, Math.min(rawT, maxT))
}

export function NutrientGraph({
  nutrient,
  current,
  max,
  unit,
}: NutrientGraphProps) {
  const [intakeChipW, setIntakeChipW] = useState(0)
  const [limitChipW, setLimitChipW] = useState(0)
  const [currentValW, setCurrentValW] = useState(0)
  const [maxValW, setMaxValW] = useState(0)
  const [barWidth, setBarWidth] = useState(0)

  const theme = useTheme()
  const colorFillNormal = theme.secondary.val
  const colorFillOver = theme.warning.val
  const colorTrack = theme.borderColor.val
  const colorLimitTick = tokens.color.grey7.val

  const isOver = current > max
  const isEmpty = current === 0
  const atLimit = current === max && current > 0

  const totalMax = Math.max(current, max)
  const fillPct = totalMax > 0 ? (current / totalMax) * 100 : 0
  const limitPct = totalMax > 0 ? (max / totalMax) * 100 : 100

  // 하루 섭취량 칩 위치 (null = 숨김)
  // 정상: fillPct, 초과/제한도달: 오른쪽 끝(right:0), 미섭취: 숨김
  const intakeAtRightEdge = isOver || atLimit
  const intakePctValue = isEmpty ? null : fillPct // fillPct는 isOver 시 100%

  // 제한량 칩 위치 (null = 숨김)
  // 제한도달: 숨김 (intake와 같은 위치), 초과: limitPct 센터, 미섭취: 오른쪽 끝, 정상: 오른쪽 끝
  const showLimitChip = !atLimit
  const limitChipAtRightEdge = !isOver // 비초과 시 right:0

  const circleColor = isOver ? colorFillOver : colorFillNormal

  return (
    <YStack backgroundColor="white" borderRadius={12} padding={16} gap={5}>
      {/* 헤더 */}
      <YStack gap={3}>
        <Text
          fontSize={17}
          fontWeight="600"
          color={isOver ? "$primary" : "$color"}
        >
          {nutrient}
        </Text>
        <XStack alignItems="baseline">
          <Text
            fontSize={19}
            fontWeight="600"
            color={isOver ? "$primary" : "$color"}
          >
            {fmt(current)}
            {unit}
          </Text>
          <Text fontSize={15} color="$colorSubtle">
            /{fmt(max)}
            {unit} 제한
          </Text>
        </XStack>
      </YStack>

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
              <View style={[styles.absChip, { right: 0 }]}>
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
              <View style={[styles.absChip, { right: 0 }]}>
                <View
                  onLayout={(e) => setLimitChipW(e.nativeEvent.layout.width)}
                >
                  <LimitLabel />
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
                  <LimitLabel />
                </View>
              </View>
            ))}

          {/* 미섭취: 제한량 칩만 오른쪽 */}
          {isEmpty && (
            <View style={[styles.absChip, { right: 0 }]}>
              <LimitLabel />
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
                <View style={{ width: 2, backgroundColor: "white" }} />
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
                  style={[styles.barCircle, { borderColor: circleColor }]}
                />
              </View>
            ) : (
              // fillPct 위치: 센터 정렬
              <View
                style={[
                  styles.circleWrapper,
                  {
                    left: `${fillPct}%`,
                    transform: [{ translateX: -(CIRCLE_SIZE / 2) }],
                  },
                ]}
              >
                <View
                  style={[styles.barCircle, { borderColor: circleColor }]}
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
            <View style={styles.scaleAbsRight}>
              <Text fontSize={11} color="$colorSubtle">
                {fmt(max)}
                {unit}
              </Text>
            </View>
          </>
        )}
      </View>
    </YStack>
  )
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR")
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
  indicator: {
    width: 1.5,
    height: 5,
  },
})
