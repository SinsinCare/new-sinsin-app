/**
 * 라벨 + 입력 한 칸. 글자 수 상한을 **입력에서** 막고(`maxLength`) 남은 수를 보여준다.
 *
 * 왜 상한을 앱이 막는가: 계약 §3.6 의 상한을 넘겨 보내면 서버가 400 을 준다. 그때
 * 사용자가 보는 것은 "등록 실패" 뿐이고, 어느 칸의 몇 번째 글자가 문제였는지는
 * 알 수 없다. 애초에 넘겨 적을 수 없게 하는 편이 정직하다.
 *
 * 카운터는 **상한에 가까워질 때만** 진해진다(`s.textMuted` → `s.textStrong`). 항상 진하면
 * 200자 중 3자를 쓴 사람에게도 경고처럼 보인다.
 *
 * 램프의 **바닥은 `s.textMuted`(= `label.alternative`, 51%)다.** 예전 바닥은
 * `s.textWeak`(= `label.assistive`, 28%)였는데, 그 값은 흰 카드/우물 위에서 대비가 약
 * 1.6:1 이라 상한의 90% 를 넘기기 전까지 카운터가 사실상 안 보였다. 여러 줄 칸의 카운터는
 * 늘 그리기로 해 놓고(아래 §) 첫 글자부터 읽히지 않으면 그 결정이 무효가 된다 —
 * 아래 §플레이스홀더가 같은 28% 를 같은 이유로 51% 로 올렸으므로, 한 파일 안에서 두 절이
 * 서로를 부정하고 있었다. 바닥만 올리면 두 상태가 같은 색이 되므로 **램프째 한 칸씩**
 * 올린다: 진해진 쪽은 `s.textMuted`(51%) 대신 `s.textStrong`(= `label.normal`, 불투명).
 *
 * ■ 한 줄 칸에서는 카운터를 **아예 늦게 그린다**
 * 제목·한줄 소개는 상한이 200 이고 사람이 거기까지 적는 일이 없다. 그런데도 칸마다
 * `0/200` 이 늘 붙어 있으면, 화면에 아무 일도 안 하는 숫자가 칸 수만큼 쌓인다.
 * 그렇다고 상한을 아예 숨기면 `maxLength` 에 걸린 사람은 글자가 사라지는 이유를 모른다.
 * 그래서 **한 줄 칸은 상한 근처에서만**, **여러 줄 칸은 늘** 그린다 — 문단을 쓰는
 * 칸에서는 남은 양이 곧 계획이라 처음부터 보여야 한다(시안의 `0/ 300` 도 그 자리다).
 *
 * ■ 카운터가 **서는 자리**는 줄 수에 따라 다르다
 * 시안(SPEC §2)의 설명 칸은 카운터가 **우물 안 오른쪽 아래**다. 화면 한 칸을 통째로 먹는
 * 우물에서 숫자를 상자 밖에 내놓으면, 우물과 다음 섹션 사이에 주인 없는 한 줄이 끼어
 * 우물이 두 번 끝나는 것처럼 보인다. 반대로 한 줄 칸은 상자가 낮아(56) 안쪽에 숫자가 설
 * 자리가 없고, 넣으면 값과 같은 줄에서 글자와 부딪힌다 — 그래서 한 줄 칸의 카운터는
 * 지금처럼 **상자 밖 오른쪽 아래**에 둔다. 같은 컴포넌트지만 두 자리 다 시안대로다.
 *
 * 우물 안 카운터는 absolute 라 **글자를 밀어내지 못한다.** 그냥 얹으면 문단이 길어질 때
 * 마지막 줄이 숫자 밑으로 흘러 둘이 겹쳐 읽힌다. 그래서 여러 줄 입력의 `paddingBottom`
 * 으로 카운터가 덮는 높이(`counterReserve`)를 미리 비운다 — 그 폭은 **글자 배율을 탄다**
 * (상수는 배율 1 기준이고, 곱하는 자리는 렌더의 `counterReserve` 주석에 있다).
 * 우물 자체의 `paddingVertical` 을 키우는 대안은 버렸다 — 그러면 쓰기 시작하는
 * **첫 줄까지** 같이 내려간다.
 *
 * ■ `singleLineInputText` 는 **한 줄 칸에만** 통과시킨다
 * 예전에는 `styles.input` 이 줄 수와 무관하게 그 헬퍼를 먹고 렌더에서 `lineHeight` 만
 * 되돌렸다. 그러면 여러 줄 칸에 `includeFontPadding: false` 가 남는다 — 그 함수 머리말대로
 * 그 값은 **한 줄 칸의 높이를 두 OS 에서 맞추려는 것**이고, 문단에서는 안드로이드가 줄
 * 위아래 여백을 떼 버려 행들이 서로 붙는다. 이제 렌더에서 줄 수로 갈라 준다.
 *
 * ■ 면(variant)이 세 갈래인 이유
 * 시안은 같은 화면에서 입력 칸을 두 가지로 그린다 — 기본 정보(제목·한줄 소개)는
 * **흰 카드 + 1px 보더**, 설명 작성은 **보더 없는 얕은 우물**이다. 둘은 장식 차이가
 * 아니라 위계 차이다: 위쪽은 "채워야 하는 칸"이고 아래쪽은 "펼쳐 쓰는 면"이다.
 * 한 컴포넌트가 면만 갈아입는 편이, 칸마다 다른 컴포넌트를 두는 것보다 라벨·카운터·
 * 상한 처리를 한 곳에 묶어 둔다.
 *
 * **보더는 언제나 그린다. 바뀌는 것은 색뿐이다.** 처음에는 `bordered` 일 때만
 * `borderWidth: 1` 을 붙였는데, 그러면 variant 를 바꾸는 순간 같은 칸의 높이가 1pt 씩
 * 밀린다(RN 은 보더를 박스 안쪽에 그린다). 같은 줄에 선 두 칸이 variant 만 다르면
 * 밑변이 어긋나 보인다. 그래서 두께는 고정하고 `transparent` ↔ `s.border` 로만 바꾼다.
 *
 * ■ 플레이스홀더를 한 단 올린 이유
 * 예전에는 `s.placeholder`(= `label.assistive`, 28%)였다. 시안 실측은 51%
 * (= `label.alternative` = `s.textMuted`)이고, **시안을 따른다** — 28% 는 흰 면 위에서
 * 읽히지 않아 "칸이 비어 있다"와 "칸에 안내가 적혀 있다"를 구별할 수 없었다.
 * 플레이스홀더는 안내문이지 흔적이 아니다.
 */

import { PixelRatio, Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Text, TextInput } from "@/src/shared/components/AppText"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE, singleLineInputText } from "@/src/theme/surface"

/**
 * 우물의 안쪽 여백. 상수로 뺀 이유는 **카운터가 같은 값을 인셋으로 써야 하기 때문**이다.
 *
 * RN(Yoga 3)은 인셋이 있는 absolute 자식을 부모의 **보더 안쪽**부터 잰다 — padding 은
 * 더하지 않는다(`AbsoluteLayout.cpp` 의 `positionAbsoluteChild`, 인셋이 있는 갈래).
 * 그래서 `right: 16` 을 주면 카운터의 오른쪽 변이 보더(1)+16 에 서고, 본문 글자도
 * 보더(1)+padding(16) 에 서서 **두 변이 정확히 겹친다.** 여백을 따로 고르면 우물 안에서만
 * 오른쪽 정렬선이 어긋나 보이므로, 두 자리가 같은 수를 가리키게 묶어 둔다.
 */
const FIELD_PAD_X = 16
const FIELD_PAD_Y = 12

/**
 * 여러 줄 칸에서 카운터가 덮는 세로 폭의 **기준값**(글자 배율 1 일 때). 카운터는
 * `TYPE.caption`(13/18) 이라 한 줄 상자가 18 이고, 그만큼을 입력의 `paddingBottom` 으로
 * 비워 두면 마지막 줄이 숫자와 겹치지 않는다. 18 을 손으로 적지 않고 토큰에서 뽑는 이유:
 * SPEC §4 가 카운터 급을 바꾸면 비워 둘 폭도 같이 따라가야 하는데, 숫자를 베껴 두면
 * 둘 중 하나만 고쳐진다.
 * (`caption` 의 행간 18 은 글자 13 보다 5 커서 위쪽에 이미 여유가 들어 있다 — 정확히
 *  18 만 비워도 마지막 줄과 숫자가 붙어 보이지 않는다.)
 *
 * **그대로 쓰지 말고 `counterReserve` 를 쓴다.** 이 상수는 배율을 안 탄 값이다 —
 * 이유는 렌더의 `counterReserve` 주석.
 */
const COUNTER_RESERVE_AT_1X = TYPE.caption.lineHeight

/**
 * `filled` — 기본 입력 면. 건강 기록·설정과 같은 옅은 면을 쓴다.
 * `bordered` — 흰 카드 + 1px 보더. 시안의 기본 정보 칸.
 * `sunken` — 설명 작성 칸의 기존 별칭. `filled`와 같은 면을 쓴다.
 */
export type WriteTextFieldVariant = "filled" | "bordered" | "sunken"

interface WriteTextFieldBaseProps {
  label: string
  /** 필수 입력 — 라벨 뒤에 브랜드색 * 를 붙인다(QA 2026-08-02 필수 강조). */
  required?: boolean
  /** "선택" 처럼 라벨 옆에 붙는 표시. */
  labelSuffix?: string | null
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  maxLength: number
  /** `{{length}}/{{max}}` 로 이미 만들어진 문구. 없으면 카운터를 안 그린다. */
  counterText?: string | null
  multiline?: boolean
  /** 여러 줄 칸의 최소 높이. 호출부가 주는 값을 그대로 쓴다(설명 입력은 186). */
  minHeight?: number
  keyboardType?: "default" | "number-pad"
  /** 오른쪽에 붙는 단위(분 등). */
  suffix?: string | null
  /** 면의 계보. 기본값은 현행 동작이다. */
  variant?: WriteTextFieldVariant
}

/**
 * 지우기 버튼을 켜면 **라벨을 반드시 받는다**. 이 컴포넌트는 i18n 을 직접 부르지 않는다 —
 * 문구는 언제나 호출부가 넘긴다(이 파일의 `label`·`placeholder` 와 같은 방식). 라벨을
 * 선택으로 두면 스크린 리더에 이름 없는 버튼이 하나 늘어날 뿐이라 타입으로 묶어 둔다.
 * `clearable` 을 안 주는 기존 호출부는 첫 갈래에 걸려 그대로 통과한다.
 */
type WriteTextFieldClearProps =
  | { clearable?: false; clearAccessibilityLabel?: never }
  | { clearable: true; clearAccessibilityLabel: string }

export type WriteTextFieldProps = WriteTextFieldBaseProps &
  WriteTextFieldClearProps

export function WriteTextField({
  label,
  required = false,
  labelSuffix,
  value,
  onChangeText,
  placeholder,
  maxLength,
  counterText,
  multiline = false,
  minHeight,
  keyboardType = "default",
  suffix,
  variant = "filled",
  clearable = false,
  clearAccessibilityLabel,
}: WriteTextFieldProps) {
  const s = useSurface()
  const nearLimit = value.length >= maxLength * 0.9
  // 위 머리말 참고. `counterText` 를 안 준 칸은 어느 쪽이든 안 그린다.
  const showCounter = counterText != null && (multiline || nearLimit)

  /*
    카운터가 덮는 폭을 **글자 배율만큼 같이 키운다.**

    비워 두는 쪽(`paddingBottom`)은 pt 라 고정인데 덮는 쪽(`Text`)은 배율을 탄다 —
    RN 은 `allowFontScaling`(기본 true)에서 `fontSize` 와 `lineHeight` 를 함께 곱한다.
    그래서 배율 1.5 면 카운터 상자가 27 인데 예약은 18 이라, 정확히 큰 글씨를 쓰는
    사람에게서만 문단의 **마지막 줄이 숫자 밑으로 들어간다**(작은 글씨에서는 안 보인다).

    버린 대안: 카운터에 `maxFontSizeMultiplier={1}` 을 물려 예약폭 쪽을 고정으로 만드는
    길. 겹침은 사라지지만 화면에서 이 숫자만 안 커진다 — 배율을 올린 이유가 작은 글자를
    못 읽어서인데 그 사람에게 13px 을 그대로 남기는 셈이라, 겹침을 접근성 후퇴와
    맞바꾸는 거래다. 이번 회차의 형제 결정들과도 반대 방향이다.

    배율은 매 렌더에 다시 읽는다. 모듈 상수로 굳히면 앱이 살아 있는 동안 OS 설정을
    바꾼 경우(안드로이드는 구성 변경으로 프로세스가 살아남는다) 예전 값이 남는다.
  */
  const counterReserve = COUNTER_RESERVE_AT_1X * PixelRatio.getFontScale()

  const fieldSurface = variant === "bordered" ? s.card : s.surfaceSunken
  // 두께는 위 머리말대로 고정이다. 색만 바뀐다.
  const fieldBorder = variant === "bordered" ? s.border : "transparent"

  // 여러 줄에는 그리지 않는다 — 문단을 쓰는 칸에서 한 번의 오터치가 몇 분치 글을 지운다.
  // 되돌리기가 없는 화면에서 실행 취소 없는 파괴적 버튼은 값보다 위험이 크다.
  const showClear = clearable && value.length > 0 && !multiline

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: s.textStrong }]}>
          {label}
          {required ? <Text style={{ color: s.brand }}> *</Text> : null}
        </Text>
        {labelSuffix ? (
          <Text style={[styles.labelSuffix, { color: s.textWeak }]}>
            {labelSuffix}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.field,
          {
            backgroundColor: fieldSurface,
            borderColor: fieldBorder,
            minHeight: minHeight ?? LAYOUT.field.height,
            /*
              여러 줄에서 `flex-start` 를 주면 **상자의 아랫부분이 죽는다.**
              이 상자는 `flexDirection: "row"` 라 세로가 교차축이고, `flex-start` 는
              교차축 stretch 를 끈다 — 그러면 안쪽 `TextInput` 이 글자 높이만큼만
              커져서, 186pt 우물의 아래 ~90pt 는 탭해도 아무 일이 없다.
              (`styles.input` 의 `flex: 1` 은 주축=가로라 세로를 못 늘린다.)
              큰 우물을 그려 놓고 첫 줄만 눌리는 칸이었다 — 사용자에게는 "가끔 안
              눌리는 칸" 으로 보인다. `stretch` 로 상자 전체가 입력이 되게 하고,
              글자를 위에 붙이는 일은 `textAlignVertical: "top"` 이 이미 하고 있다.
            */
            alignItems: multiline ? "stretch" : "center",
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={s.textMuted}
          maxLength={maxLength}
          multiline={multiline}
          keyboardType={keyboardType}
          accessibilityLabel={label}
          style={[
            styles.input,
            // 줄 수로 갈린다(머리말 참고). 여러 줄에서는 `lineHeight` 가 줄 간격이라는
            // 제 역할을 하고 `includeFontPadding` 은 폰트 기본값이어야 한다.
            // 한 줄에서는 정확히 예전과 같은 값이다 — 이 칸의 동작은 바뀌지 않는다.
            multiline ? { ...TYPE.value } : singleLineInputText(TYPE.value),
            {
              color: s.textStrong,
              textAlignVertical: multiline ? "top" : "center",
              // 카운터가 우물 안 오른쪽 아래에 겹쳐 눕는 만큼 미리 비운다
              // (`counterReserve` 주석 — 글자 배율을 탄다).
              ...(multiline && showCounter
                ? { paddingBottom: counterReserve }
                : null),
            },
          ]}
        />
        {/* 오른쪽에 둘 다 설 수 있다. 순서는 단위 → 지우기 — 단위는 값의 일부로 읽히므로
            숫자 바로 옆에 붙어야 하고, 버튼은 늘 가장자리에 있어야 손이 찾는다. */}
        {suffix ? (
          <Text style={[styles.suffix, { color: s.textMuted }]}>{suffix}</Text>
        ) : null}
        {showClear ? (
          <Pressable
            onPress={() => onChangeText("")}
            accessibilityRole="button"
            accessibilityLabel={clearAccessibilityLabel}
            /*
              20 짜리 과녁은 달리는 버스에서 못 맞춘다. 그래서 물려 주되 **왼쪽으로는
              조금만** 물린다. 사방 12 를 주면 왼쪽으로 넓힌 면이 상자의 `gap: 8` 을 4
              넘어 입력 글자 위에 눕고, 형제 중 나중에 그려진 이 버튼이 위에 있어서
              칸의 오른쪽 끝을 누르면 커서가 아니라 **실행 취소 없는 전체 삭제**가 잡힌다.
              왼쪽 4 는 gap(8) 안에 남는 값이라 입력에 닿지 않는다.

              위아래·오른쪽은 여백이라 12 를 그대로 둔다(세로는 20+12+12 = 44).
              가로는 20+4+12 = 36 으로 44 에 못 미치지만, 이 버튼은 세로로 44 를 채우고
              칸의 오른쪽 가장자리에 붙어 있어 손이 이미 찾아가는 자리다 — 되돌릴 수 없는
              오작동과 바꿀 4pt 가 아니다. `IngredientEditor` 의 삭제 버튼이 같은 이유로
              같은 방어를 한다(그쪽은 과녁이 28 이라 같은 인셋으로 44 가 나온다).
            */
            hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }}
          >
            <Ionicons name="close-circle" size={20} color={s.textWeak} />
          </Pressable>
        ) : null}
        {/* 여러 줄일 때만 우물 **안**에 눕는다(머리말 참고). `pointerEvents="none"` 이
            없으면 이 숫자가 우물 오른쪽 아래의 탭을 먹어서, 상자 전체가 입력이 되게 해 둔
            `alignItems: "stretch"` 의 효과가 그 구석에서만 사라진다. */}
        {showCounter && multiline ? (
          <Text
            pointerEvents="none"
            style={[
              styles.counter,
              styles.counterInWell,
              { color: nearLimit ? s.textStrong : s.textMuted },
            ]}
          >
            {counterText}
          </Text>
        ) : null}
      </View>
      {showCounter && !multiline ? (
        <Text
          style={[
            styles.counter,
            { color: nearLimit ? s.textStrong : s.textMuted },
          ]}
        >
          {counterText}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  labelRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  // 칸 라벨은 `WriteChipRail` 의 그룹 라벨과 **같은 급**이어야 한다. 한쪽만 올리면
  // 같은 섹션 안의 "조리 시간"(칸)과 "난이도"(칩)가 다른 크기로 서서 위계가 깨진다.
  label: { ...TYPE.cardTitle, fontWeight: "700" },
  // 라벨 옆의 "선택" 표시. 12px 은 스케일에 `cardSub`(12/16) 로 이미 있다 — 예전에는
  // `caption`(13/18) 위에 `fontSize: 12` 만 덮어써서, 12px 글자가 13px 용 행간 18 을
  // 끌고 다녔다. 스케일에 없는 조합(12/18)이라 `labelRow` 의 baseline 정렬에서 이 표시만
  // 필요 없는 2pt 를 더 차지했고, 무엇보다 **크기를 여기서 새로 정하지 말라**는 `TYPE` 표의
  // 규칙을 어긴 자리였다. 보이는 글자 크기(12)는 그대로고 이름만 정본을 가리킨다.
  labelSuffix: { ...TYPE.cardSub },
  field: {
    flexDirection: "row",
    borderRadius: LAYOUT.field.radius,
    // variant 와 무관하게 늘 1 이다(머리말 참고). 색은 위에서 정한다.
    borderWidth: 1,
    paddingHorizontal: FIELD_PAD_X,
    paddingVertical: FIELD_PAD_Y,
    gap: 8,
  },
  input: {
    flex: 1,
    // 글자 스타일은 **렌더에서** 줄 수에 따라 고른다(머리말 참고). 여기에 한 줄 규격을
    // 두면 여러 줄 칸에도 `includeFontPadding: false` 가 따라붙는다.
    padding: 0,
  },
  suffix: { ...TYPE.value },
  // 카운터만은 `caption`(13/18) 이다 — SPEC §4. 옆의 `labelSuffix` 와 달리 이건 라벨의
  // 부속이 아니라 사용자가 읽으라고 있는 값이라 한 단 위에 선다.
  counter: { ...TYPE.caption, textAlign: "right" },
  // 인셋은 우물의 안쪽 여백과 같은 값이어야 한다(`FIELD_PAD_X` 머리말 참고).
  counterInWell: {
    position: "absolute",
    right: FIELD_PAD_X,
    bottom: FIELD_PAD_Y,
  },
})
