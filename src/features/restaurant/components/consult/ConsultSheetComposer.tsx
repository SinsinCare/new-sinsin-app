/**
 * 시트 바닥의 입력 알약.
 *
 * ## 반드시 `V2SheetTextInput` 이다 (되돌리면 조용히 고장난다)
 *
 * 평범한 RN `TextInput` 으로 바꾸면 gorhom 의 `useAnimatedKeyboard` 가 포커스 `target` 을
 * 못 받아 **키보드는 뜨고 시트는 제자리에 남는다.** 경고도 예외도 없다 — 그냥 입력창이
 * 키패드 밑에 깔린다(`V2SheetTextInput` 머리말).
 *
 * ## 키보드 대응은 여기서 하지 않는다
 *
 * `KeyboardAvoidingView`·`KeyboardStickyView`·`useReanimatedKeyboardAnimation` 이 이 파일에
 * 없다. gorhom 이 이미 (i) 시트 위치 (ii) 콘텐츠 상자 높이 (iii) `paddingBottom = 키보드
 * 높이` 셋을 움직인다. 여기에 한 겹 얹는 순간 `app/consult.tsx` 가 "되돌리지 말 것" 으로
 * 못 박은 두 겹 보정이 된다(2026-08-03 QA: 입력창이 화면 최상단으로 날아갔다).
 * 바닥 여백 하나만 호스트가 `bottomInset` 으로 넘긴다 — 위치가 아니라 여백이라 두 겹이 아니다.
 *
 * ## 시안의 `＋`·🎤 를 그리지 않은 이유
 *
 * 둘 다 **동작이 앱에 없다.**
 *  - 🎤 음성 입력: 구현이 어디에도 없다(전 저장소 확인).
 *  - `＋` 첨부: `/consult` 의 첨부 메뉴는 "iOS pageSheet 위에서 RN Modal 이 프레젠트되지
 *    않는다" 는 이유로 화면 내 오버레이다(`app/consult.tsx`). 시트 안은 그보다 더 좁고,
 *    시안 목업에도 첨부 흐름 자체가 없다.
 *
 * 눌러도 아무 일이 없는 버튼을 두 개 만드는 대신 **하나도 만들지 않았다**(`DetailSection`
 * 계열이 이 화면에서 이미 지키는 계약이다). 대신 그 자리에 **전송 버튼**이 선다 —
 * 시안에는 없지만 없으면 이 화면이 동작하지 않는다(키보드 리턴키는 `완료` 다).
 * 첨부·음성이 실제로 생기면 그때 왼쪽에 `＋`, 오른쪽에 🎤 를 되돌리면 된다.
 */

import { Pressable, StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2Box,
  V2HStack,
  V2Icon,
  V2SheetTextInput,
  useV2Theme,
} from "@/src/design-system-v2"
import {
  fontFamily,
  GUTTER,
  radius,
  spacing,
} from "@/src/design-system-v2/tokens"
import { MAX_CHAT_MESSAGE_CONTENT_LENGTH } from "@/src/types/chat"

/** 시안 실측: 알약 높이 52. 여러 줄을 치면 이 값에서부터 자란다. */
const PILL_MIN_HEIGHT = 52
/**
 * 입력이 자랄 수 있는 상한.
 *
 * 상한이 없으면 긴 질문을 붙여넣었을 때 컴포저가 대화 목록을 통째로 밀어낸다 —
 * 키보드까지 떠 있으면 남는 콘텐츠 상자가 432 뿐이라 답변이 한 줄도 안 보이게 된다.
 */
const INPUT_MAX_HEIGHT = 108
/** 전송 버튼 지름. 알약(52) 안에 위아래 6씩 남는다. */
const SEND_BUTTON = 40

export function ConsultSheetComposer({
  value,
  onChangeText,
  onSend,
  canSend,
  bottomInset,
}: {
  value: string
  onChangeText: (next: string) => void
  onSend: () => void
  /** 보낼 것이 있고 앞 턴이 끝났는가. 입력 자체는 **막지 않는다**(아래 `editable`). */
  canSend: boolean
  /** 알약 아래 여백. 키보드가 떠 있으면 14, 아니면 safe-area(최소 14). 호스트가 정한다. */
  bottomInset: number
}) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()

  return (
    <V2Box style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <V2HStack
        align="center"
        gap={spacing[8]}
        style={[styles.pill, { backgroundColor: colors.fill.normal }]}
      >
        {/*
          답변이 흘러나오는 동안에도 계속 쓸 수 있다. `editable={false}` 로 막으면 키보드는
          그대로인데 글자만 안 찍혀 고장으로 읽힌다(`app/consult.tsx` 의 같은 결정).
          막아야 할 것은 입력이 아니라 전송이고, 그건 아래 버튼이 한다.
        */}
        <V2SheetTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t("restaurant.consult.placeholder")}
          placeholderTextColor={colors.label.alternative}
          selectionColor={colors.primary.primary}
          multiline
          maxLength={MAX_CHAT_MESSAGE_CONTENT_LENGTH}
          style={[styles.input, { color: colors.label.normal }]}
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSend }}
          accessibilityLabel={t("consult.send")}
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: canSend
                ? colors.primary.primary
                : colors.fill.background,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <V2Icon
            name="arrowUp"
            size={20}
            color={canSend ? colors.static.white : colors.label.assistive}
          />
        </Pressable>
      </V2HStack>
    </V2Box>
  )
}

const styles = StyleSheet.create({
  // 알약 좌우 16(시안 실측 x 16–359). 버블 거터(20)·빈 상태(24)와 다른 것은 시안 그대로다.
  wrap: { paddingHorizontal: GUTTER, paddingTop: spacing[8] },
  pill: {
    minHeight: PILL_MIN_HEIGHT,
    borderRadius: radius.full,
    paddingLeft: 18,
    paddingRight: spacing[6],
    paddingVertical: spacing[6],
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    // 안드로이드 TextInput 의 기본 세로 패딩을 지운다 — 안 지우면 알약이 52 보다 커진다.
    paddingVertical: 0,
    maxHeight: INPUT_MAX_HEIGHT,
  },
  send: {
    width: SEND_BUTTON,
    height: SEND_BUTTON,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
})
