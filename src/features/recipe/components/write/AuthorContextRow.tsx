/**
 * "내 기준으로 적었어요" 한 줄. 신장질환 병기 칩 레일을 대신한다.
 *
 * 왜 칩이 아니라 한 문장인지는 `authorContextTags.ts` 머리말에 있다 — 요약하면
 * 이 줄은 **분류가 아니라 진술**이다. 고르는 것이 아니라 "맞다/아니다" 이므로
 * 컨트롤도 칩 레일이 아니라 체크 한 개다.
 *
 * 켜짐 표시는 이 화면의 다른 켜짐(선택된 칩, 눌린 `+` 줄)과 **같은 어휘**를 쓴다 —
 * 브랜드 틴트 면 + 브랜드 보더. 보더는 언제나 그리고 색만 바꾼다(꺼짐일 때
 * `transparent`), 안 그러면 누를 때마다 줄 높이가 1pt 씩 밀린다.
 */

import { StyleSheet, View, Pressable } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"

import { radius } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"

interface AuthorContextRowProps {
  /** 이미 만들어진 문장. 예: `내 기준(CKD 3기 · 고혈압 동반)으로 적었어요` */
  label: string
  /** 아래 붙는 안내(이 태그가 카드에 안 보인다는 사실). */
  notice?: string | null
  selected: boolean
  onToggle: () => void
}

export function AuthorContextRow({
  label,
  notice,
  selected,
  onToggle,
}: AuthorContextRowProps) {
  const s = useSurface()

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.row,
          selected
            ? { backgroundColor: s.surfaceBrand, borderColor: s.brand }
            : { backgroundColor: s.surfaceSunken, borderColor: "transparent" },
          /*
            **끄는 방향에도 눌림이 보여야 한다.** `pressed && !selected` 였는데,
            그러면 켜진 줄을 눌러 끌 때만 아무 반응이 없다 — 손가락이 닿았는지
            모른 채 한 번 더 누르면 다시 켜진다. 켜짐 표시(면·보더)와 눌림
            (투명도)은 서로 다른 축이라 겹쳐도 신호가 엉키지 않는다.
          */
          pressed ? { opacity: 0.7 } : null,
        ]}
      >
        {/*
          꺼진 상태에도 **빈 네모를 그린다.** 켜야 나타나는 표시는 "여기 켤 것이
          있다" 는 사실 자체를 숨긴다 — 그러면 이 줄이 그냥 안내문으로 읽힌다.
        */}
        <Ionicons
          name={selected ? "checkbox" : "square-outline"}
          size={20}
          color={selected ? s.brand : s.textWeak}
        />
        <Text
          style={[styles.label, { color: selected ? s.textStrong : s.text }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {label}
        </Text>
      </Pressable>
      {notice ? (
        <Text style={[styles.notice, { color: s.textMuted }]}>{notice}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  // 칩 글자(13)보다 크고 라벨(15/700)보다 가볍다 — 제목이 아니라 문장이기 때문이다.
  label: { ...TYPE.value, flex: 1 },
  /*
    바로 위에 붙는 `WriteChipRail` 의 `notice` 와 **같은 급**이다 — 분류 섹션에서 두
    안내가 세로로 이어 붙으므로 한쪽만 행간이 다르면 같은 12px 글자가 다른 밀도로 읽힌다.
    예전에는 둘 다 `caption`(13/18) 위에 `fontSize: 12`·`lineHeight: 17` 을 덮어썼는데,
    **12/17 은 v2 스케일에 없는 조합**이다. 12px 의 정본은 `cardSub`(12/16) 하나뿐이라
    그것을 가리킨다(보이는 글자 크기는 그대로).
  */
  notice: { ...TYPE.cardSub },
})
