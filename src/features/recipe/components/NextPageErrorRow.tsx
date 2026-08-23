/**
 * **목록 꼬리에서 다음 페이지가 실패했을 때 세우는 한 줄.**
 *
 * 무한 목록의 다음 페이지 실패(`isFetchNextPageError`)는 옵저버 상태로는 오류지만
 * 화면에는 **이미 받아 둔 20개가 그대로 서 있다.** 그래서 전면 오류(`V2ErrorState`)로
 * 덮으면 멀쩡한 목록을 지우는 더 큰 거짓말이 되고, 아무것도 안 그리면 사용자에게는
 * **목록이 그냥 거기서 끝난 것**으로 보인다 — 데이터에 대한 거짓 진술이다.
 * 그래서 꼬리에 실패를 말하는 줄 하나와 다시 시도만 둔다.
 *
 * 재시도는 항상 준다. 전면 오류와 달리 여기서 눌리는 것은 "같은 다음 페이지" 라서
 * 회선이 돌아오면 그대로 이어진다(`resolveError().retryable` 게이트는 첫 페이지의
 * 이야기다 — 지워진 태그처럼 몇 번을 눌러도 같은 실패인 경우를 막는 장치다).
 *
 * 글 상세의 "함께 보면 좋은 글" 도 같은 행을 쓴다. 목록의 꼬리는 아니지만 상황이
 * 같다 — 화면의 나머지는 멀쩡하고, 한 조각만 못 받았고, 다시 받을 수 있다.
 */
import { Pressable, StyleSheet, View } from "react-native"

import { Text } from "@/src/shared/components/AppText"
import { useSurface } from "@/src/hooks/useSurface"

interface NextPageErrorRowProps {
  /** 무엇이 실패했는지. 호출부가 `resolveError(error).title` 을 넘긴다. */
  title: string
  /** 재시도 라벨. 화면의 다른 재시도와 같은 문구를 쓴다. */
  retryLabel: string
  onRetry: () => void
}

export function NextPageErrorRow({
  title,
  retryLabel,
  onRetry,
}: NextPageErrorRowProps) {
  const surface = useSurface()
  return (
    <View style={styles.row}>
      <Text
        style={[styles.title, { color: surface.text }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {title}
      </Text>
      <Pressable
        onPress={onRetry}
        hitSlop={8}
        accessibilityRole="button"
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={[styles.retryLabel, { color: surface.brand }]}>
          {retryLabel}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  title: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontFamily: "Pretendard-Regular",
    textAlign: "center",
  },
  retryLabel: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
})
