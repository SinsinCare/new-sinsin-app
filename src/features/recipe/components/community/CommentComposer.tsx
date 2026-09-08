import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
/**
 * **댓글 · 답글 입력 바** — 상세(S4) 하단 · 답글쓰기(S5) 하단 · 스토리 댓글 시트(S12) 푸터.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.9 · §5.6 (WBS 1.8).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 접힘 / 펼침은 **토글이 아니라 내용**이 정한다
 *
 * 시안의 주황 원은 chevron 이고 9프레임 어디에도 전송 수단이 없다. §5.6 이 두 가지를
 * 판정했다: 원은 **전송(`arrowUp`)** 이고, 펼침/접힘 **토글은 없앤다**(필드가 내용에 따라
 * 자란다). 그래서 여기서는 입력이 `onContentSizeChange` 로 알려 주는 실제 콘텐츠 높이만
 * 보고 두 기하 중 하나를 고른다(`isComposerExpanded`).
 *
 * 그 판정이 §2.9 의 마지막 항목 하나를 **의도적으로 지운다**: "접힘 상태에서 1줄 초과
 * 초안은 오른쪽 16px 페이드로 자른다". 필드가 자라면 1줄을 넘긴 초안이 접힌 채로 남는
 * 상태가 **존재하지 않는다** — 없는 상태를 위한 페이드는 그리지 않는다.
 *
 * ■ 기하가 두 벌인 이유와 그 합 (§2.9 · §3.11)
 *
 * ```
 * 접힘(화면)  바 80 = 14 + 필드 52  + 14      필드 r12 · 텍스트줄 28 을 위아래 12 가 감싼다
 * 접힘(시트)  바 72 = 14 + 필드 44  + 14      필드 r16 (§3.11 댓글 시트)
 * 펼침(공통)  바 146 = 14 + 필드 118 + 14
 *              필드 118 = 12(위) + 21×2(두 줄) + 18(간격) + 24(버튼) + 22(아래)
 * ```
 * 펼침에서 버튼은 텍스트 **옆이 아니라 아래** 우측에 있다(실측: 버튼 아래변이 필드
 * 아래변에서 22). 그래서 접힘은 `row + alignItems:center`, 펼침은 `column` 이다.
 * 두 벌 다 `composerFieldGeometry()` 한 곳에서 나온다 — 렌더러가 없는 이 저장소에서
 * "바가 정말 80 인가"를 물을 수 있는 유일한 방법이다(`communityLayout.ts` 머리말).
 *
 * ■ 입력 구현을 **받는다** (§4-G14)
 *
 * 시트 안에서 평범한 `TextInput` 을 쓰면 gorhom 이 포커스를 모르고 시트가 제자리에 남아
 * 키패드가 컴포저를 덮는다(경고 한 줄 없다 · `V2SheetTextInput` 머리말). 그래서 "시트냐"
 * 를 아는 **화면**이 `inputComponent={V2SheetTextInput}` 로 구현을 넘긴다. 여기서 gorhom 을
 * 직접 들이면 이 바를 쓰는 모든 화면이 시트 패키지를 끌고 온다.
 *
 * ■ 키보드 추종은 화면의 몫이다
 *
 * §2.9 는 `KeyboardStickyView(offset.opened = bottomInset)` 를 적어 두었지만 그것은
 * **화면 하단 바일 때만** 맞다 — 시트 안에서는 gorhom 의 `footerComponent` 가 같은 일을
 * 하고, 둘을 겹치면 바가 키보드 높이만큼 두 번 올라간다. 그래서 이 컴포넌트는 자기
 * 위치를 모르고, safe-area 도 `bottomInset` 으로 받기만 한다.
 *
 * ■ 컨텍스트 바 · 멘션 칩은 시안에 없다 (§6.3-18·19 보존)
 *
 * 시안은 해피패스만 그린다. `답글/수정 컨텍스트 + ×` 와 `@닉네임` 칩 행을 지우면 답글을
 * 취소할 수도, 누구에게 알림이 가는지 볼 수도 없다. 실측이 없는 자리라 상자 크기는 현행
 * 구현을 그대로 옮기고 **타이포·색만 v2 토큰으로 스냅**했다(현행은 12.5px·letterSpacing
 * −0.25 로 §0.2 를 어긴다).
 */
import { useState, type ComponentType, type ReactElement } from "react"
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import { useTranslation } from "react-i18next"

import { V2Icon } from "@/src/design-system-v2/components/V2Icon"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { touchTarget } from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { typography } from "@/src/design-system-v2/tokens/typography"

import { CHIP_GAP } from "./communityLayout"

/** 화면 하단 바 / 시트 푸터. 다른 것은 **접힘 필드의 높이와 모서리뿐**이다(§2.9 · §3.11). */
export type CommentComposerVariant = "screen" | "sheet"

/** 바 위·아래 여백. §2.9 "패딩 14/14" — 스페이싱 사다리에 14 는 없다. */
const BAR_PAD_V = 14

/** 필드 좌우 마진 16. **화면 여백 20 이 아니다** — 컴포저는 목록 시작선을 안 따른다(§2.9). */
const FIELD_MARGIN_H = spacing[16]

/** 접힘 필드 높이 — 화면 52 / 시트 44. */
const COLLAPSED_HEIGHT: Record<CommentComposerVariant, number> = {
  screen: 52,
  sheet: 44,
}

/** 접힘 필드 모서리 — 화면 r12 / 시트 r16. 펼치면 둘 다 r12 가 된다(§3.11). */
const COLLAPSED_RADIUS: Record<CommentComposerVariant, number> = {
  screen: radius.lg,
  sheet: radius["2xl"],
}

/** 필드 안쪽 좌·상 여백. 접힘/펼침 통일 — §5.6 판정(접힘 쪽이 클립 프레임+캐럿으로 뒷받침). */
const FIELD_PAD_LEFT = spacing[10]
const FIELD_PAD_TOP = spacing[12]

/** 전송 원. 그리는 지름은 24, 닿는 크기는 44 (§2.9 "히트영역 44"). */
const SEND_DIAMETER = 24
/** 원의 우측 인셋 10 — 접힘·펼침 공통. */
const SEND_INSET_RIGHT = spacing[10]
/** 펼침에서 원 아래변 ↔ 필드 아래변 22. */
const SEND_INSET_BOTTOM = 22
/** 펼침에서 본문 ↔ 원 18. 118 = 12 + 42 + **18** + 24 + 22 을 맞추는 항이다. */
const SEND_GAP = 18
/** 흰 화살표 잉크. 24 원 안에서 ~18 (§2.9 "arrowUp 흰색 ~18"). */
const SEND_GLYPH = 18

/** 입력 한 줄의 높이(17 Medium / lh 21). */
const FIELD_LINE = typography.label.mediumWeak.lineHeight

/**
 * 콘텐츠 높이 → 펼침 여부. 한 줄(21)과 두 줄(42) 사이에서 자르므로 반올림·폰트 메트릭
 * 오차에 흔들리지 않는다. 판단이 여기 한 줄이라 테스트가 직접 물을 수 있다.
 */
export function isComposerExpanded(contentHeight: number): boolean {
  return contentHeight > FIELD_LINE * 1.5
}

/**
 * 접힘/펼침 **두 기하의 정본**. 필드 상자와 전송 원의 자리를 함께 돌려준다 —
 * 둘은 같은 실측(§2.9)에서 나오고 따로 두면 한쪽만 바뀐다.
 */
export function composerFieldGeometry(
  expanded: boolean,
  variant: CommentComposerVariant,
): { field: ViewStyle; send: ViewStyle } {
  if (expanded) {
    return {
      field: {
        borderRadius: radius.lg,
        paddingLeft: FIELD_PAD_LEFT,
        paddingRight: SEND_INSET_RIGHT,
        paddingTop: FIELD_PAD_TOP,
        paddingBottom: SEND_INSET_BOTTOM,
      },
      // 본문 아래 우측. `alignSelf` 가 우측을, `marginTop` 이 18 을 만든다.
      send: { alignSelf: "flex-end", marginTop: SEND_GAP },
    }
  }

  return {
    field: {
      height: COLLAPSED_HEIGHT[variant],
      borderRadius: COLLAPSED_RADIUS[variant],
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: FIELD_PAD_LEFT,
      paddingRight: SEND_INSET_RIGHT,
      /*
        텍스트 ↔ 원 10. 실측이 이 값을 두 번 확인해 준다: 필드 343 에서
        10 + **10** + 24 + 10 을 빼면 입력 폭이 정확히 **289** 로, 시안의 클립 프레임
        폭과 같다. 0 으로 두면 마지막 글자가 원에 닿는다(시안은 그 자리를 페이드로 가렸다).
      */
      gap: SEND_INSET_RIGHT,
      // 세로 가운데정렬은 위아래 여백이 같을 때만 실측(텍스트줄 28 = 52 − 12 − 12)과 맞는다.
      paddingVertical: FIELD_PAD_TOP,
    },
    send: {},
  }
}

/** 답글/수정 컨텍스트 한 줄. 없으면 `null`. */
export type CommentComposerContext = {
  /** `{name}님에게 답글 쓰는 중` · `댓글 수정 중`. */
  label: string
  /** `×` — 답글/수정을 취소하고 초안을 비운다. */
  onDismiss: () => void
}

export type CommentComposerProps = {
  value: string
  onChangeText: (next: string) => void
  /** 전송. 초안이 비면 버튼 자체가 없으므로 빈 값으로는 절대 안 불린다. */
  onSubmit: () => void
  /** 기본 `community.postDetail.commentPlaceholder`. */
  placeholder?: string
  /** 기본 `screen`. 시트 푸터면 `sheet` (§3.11). */
  variant?: CommentComposerVariant
  /**
   * 입력을 그리는 구현. 기본 RN `TextInput`.
   * **시트 안에서는 반드시 `V2SheetTextInput`** 을 넘긴다(머리말 §입력 구현).
   */
  inputComponent?: ComponentType<TextInputProps>
  /** 입력에 그대로 넘길 나머지(`maxLength`·`onSelectionChange`·`autoFocus` …). */
  inputProps?: TextInputProps
  /** 답글/수정 중임을 알리는 줄 (§6.3-19). */
  context?: CommentComposerContext | null
  /** 확정된 `@닉네임` 들 (§6.3-18). 누르면 빠진다. */
  mentions?: readonly string[]
  onRemoveMention?: (nickName: string) => void
  /**
   * 전송이 진행 중(중복 제출 가드 · §6.3-23). 버튼은 **그대로 두고** 누름만 막는다 —
   * 사라지면 방금 누른 것이 먹혔는지 알 수 없다.
   */
  submitting?: boolean
  /** 바 아래 safe-area. 키보드가 닫혔을 때 화면이 계산해 넘긴다(머리말 §키보드). */
  bottomInset?: number
  style?: StyleProp<ViewStyle>
}

export function CommentComposer({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  variant = "screen",
  inputComponent,
  inputProps,
  context,
  mentions,
  onRemoveMention,
  submitting = false,
  bottomInset = 0,
  style,
}: CommentComposerProps): ReactElement {
  const { colors } = useV2Theme()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const Input = inputComponent ?? TextInput
  const geometry = composerFieldGeometry(expanded, variant)

  // 초안이 비면 **버튼 자체가 없다**(회색 비활성 아님 · §2.9).
  const canSend = value.trim().length > 0

  const handleContentSizeChange: TextInputProps["onContentSizeChange"] = (
    event,
  ) => {
    setExpanded(isComposerExpanded(event.nativeEvent.contentSize.height))
    inputProps?.onContentSizeChange?.(event)
  }

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.background.default,
          paddingBottom: BAR_PAD_V + bottomInset,
        },
        style,
      ]}
    >
      {context ? (
        <View style={[styles.context, { backgroundColor: colors.fill.normal }]}>
          <V2Text
            token="label.xSmallWeak"
            color={colors.label.neutral}
            numberOfLines={1}
            style={styles.contextLabel}
          >
            {context.label}
          </V2Text>
          <Pressable
            onPress={context.onDismiss}
            hitSlop={spacing[8]}
            accessibilityRole="button"
            accessibilityLabel={t("community.postDetail.cancelReply")}
          >
            <V2Icon name="close" size="xs" color={colors.label.neutral} />
          </Pressable>
        </View>
      ) : null}

      {mentions && mentions.length > 0 ? (
        <View style={styles.mentions}>
          {mentions.map((nickName) => (
            <Pressable
              key={nickName}
              onPress={() => onRemoveMention?.(nickName)}
              accessibilityRole="button"
              accessibilityLabel={t("community.postDetail.removeMention", {
                name: nickName,
              })}
              style={[
                styles.mention,
                { backgroundColor: colors.primary.primaryWeak },
              ]}
            >
              <V2Text
                token="label.xSmallWeak"
                color={colors.primary.primary}
                numberOfLines={1}
                style={styles.mentionLabel}
              >
                {`@${nickName}`}
              </V2Text>
              <V2Icon name="close" size="xs" color={colors.primary.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/*
        입력 면은 `fill.control` — 이 바의 바닥이 `background.default`(라이트는 흰색)라
        `fill.normal`(흰 면 위 ΔL* 3.79)로는 **흰 위의 흰 칸**이 된다. 위 `context` 띠는
        그대로 `fill.normal` 이다 — 그건 누르는 면이 아니라 "누구에게 답하는 중" 을
        말하는 표시라, 입력칸보다 조용해야 한다. 근거는 `fill.control` 머리말.
      */}
      <View style={[{ backgroundColor: colors.fill.control }, geometry.field]}>
        <Input
          multiline
          value={value}
          onChangeText={onChangeText}
          placeholder={
            placeholder ?? t("community.postDetail.commentPlaceholder")
          }
          placeholderTextColor={colors.label.neutral}
          // 캐럿·선택 = 브랜드(§2.9). 두 프롭 다 필요하다(iOS/Android).
          cursorColor={colors.primary.primary}
          selectionColor={colors.primary.primary}
          style={[styles.input, { color: colors.label.normal }]}
          {...inputProps}
          onContentSizeChange={handleContentSizeChange}
        />

        {canSend ? (
          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            // 24 원 + 사방 10 = 44. 원을 키우면 바 높이가 따라 커진다.
            hitSlop={(touchTarget.min - SEND_DIAMETER) / 2}
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
            accessibilityLabel={t("community.postDetail.postComment")}
            style={[
              styles.send,
              { backgroundColor: colors.primary.primary },
              geometry.send,
            ]}
          >
            <V2Icon
              name="arrowUp"
              size={SEND_GLYPH}
              color={colors.static.white}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /** 상단 보더 없음(§2.9). 필드 폭 343 = 375 − 16×2 는 이 패딩이 만든다. */
  bar: {
    paddingHorizontal: FIELD_MARGIN_H,
    paddingTop: BAR_PAD_V,
    gap: spacing[8],
  },
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    borderRadius: radius.md,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  contextLabel: { flex: 1 },
  mentions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CHIP_GAP,
  },
  mention: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    borderRadius: radius.sm,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
    // 닉네임이 길어도 한 줄을 통째로 먹지 않게.
    maxWidth: 180,
  },
  mentionLabel: { flexShrink: 1 },
  input: {
    flex: 1,
    // RN 기본 패딩을 걷어낸다 — 필드의 여백은 위에서 한 번만 준다.
    padding: 0,
    // 멀티행이라 lineHeight 를 유지한다(단일행이면 iOS 세로정렬이 깨진다 — `singleLineInputText`).
    ...typography.label.mediumWeak,
  },
  send: {
    width: SEND_DIAMETER,
    height: SEND_DIAMETER,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
})
