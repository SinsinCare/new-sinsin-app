/**
 * **"더 보기" 한 줄 — 자동 backfill 예산이 끝난 자리.**
 *
 * 보이는 목록이 비었는데 다음 커서가 살아 있는 경우(차단 필터가 첫 페이지를 통째로
 * 접은 경우 등) 화면은 사람 대신 다음 장을 당긴다. 다만 상한이 있다
 * (`MAX_AUTO_BACKFILL_PAGES`) — 없으면 커서가 끝날 때까지 사람이 끼어들 자리 없이
 * 페이지가 넘어간다. 상한을 넘긴 뒤에는 "아직 글이 없어요"(더 받을 게 있으니 거짓말)
 * 도, 자동 페이징(사용자가 고르지 않은 요청)도 아닌 **선택지**를 준다.
 *
 * 실패 행(`NextPageErrorRow`)과 붙여 두지 않는 이유: 저쪽은 "실패했다 + 다시",
 * 여기는 "더 있다 + 볼래?" 다. 문구도 톤도 다른 말이라 컴포넌트를 나눠 둔다.
 */
import { Pressable, StyleSheet, View } from "react-native"

import { Text } from "@/src/shared/components/AppText"
import { useSurface } from "@/src/hooks/useSurface"

interface LoadMoreRowProps {
  /** 버튼 문구. 화면의 로케일 키를 호출부가 고른다. */
  label: string
  onPress: () => void
}

export function LoadMoreRow({ label, onPress }: LoadMoreRowProps) {
  const surface = useSurface()
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={[styles.label, { color: surface.brand }]}>{label}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    paddingVertical: 32,
  },
  label: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
})
