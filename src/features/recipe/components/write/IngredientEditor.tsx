/**
 * 재료 입력 — 한 줄이 **세 칸**(재료명 · 무게 · 개수)이다.
 *
 * ## 2칸으로 줄였던 것을 3칸으로 되돌렸다
 * 이 파일은 한동안 시안의 3칸을 2칸으로 줄여 놨었다. 그때 적은 이유는 "같은 양을 두 칸에
 * 적게 하면 어느 쪽이 계산에 쓰이는지 알 수 없다" 였고, 그 판단은 **합치는 규칙이 없을
 * 때만** 맞다. 지금은 규칙이 하나 있다(`joinIngredientAmount`) — 그램이 실리는 칸을
 * **항상 앞**에 두고 공백으로 잇는다.
 *
 *     [단위] "100g" + [수량] "1개"   →  "100g 1개"  → 서버 파서가 앞의 100g 를 읽는다
 *     [단위] ""     + [수량] "1큰술" →  "1큰술"     → 못 읽는다 → 그 줄 아래에서 말해 준다
 *
 * 즉 "어느 칸이 계산에 쓰이는가" 는 규칙으로 답이 정해져 있고, 답이 안 나오는 줄은 서버
 * 왕복 **전에** 이 화면이 짚어 준다. 반대로 한 칸으로 받으면 사용자는 `100g 1개` 를 한
 * 칸에 적게 되는데, 그건 "띄어쓰기로 서버 파서를 조작하라" 는 요구다 — 규칙을 아는 사람만
 * 통과하는 칸이 된다.
 *
 * ## 무게를 모르는 표기를 그 줄에서 말한다
 * `가지 1개` 는 계산에서 빠진다(계약 §4.3: 개수는 환산하지 않는다). 그 사실을 서버 왕복
 * 뒤 목록으로 보여주면 사용자는 어느 줄인지 다시 찾아야 한다. 같은 판정을 입력하는 순간
 * 그 줄 아래에 붙인다.
 *
 * 힌트는 **합친 뒤의 문자열**을 본다. 사용자가 실제로 서버에 보내는 것이 그 문자열이기
 * 때문이다. 단위 칸만 보고 판정하면 수량 칸에 `150g` 을 적은 줄에 "분량을 적어 주세요"
 * 가 떠서, 화면이 자기가 받아 놓고도 못 본 척하는 꼴이 된다.
 *
 * ## 플레이스홀더는 칸 이름이 아니라 **예시**다
 * 예전 두 칸은 `단위` · `수량/개수` 라고 자기 이름을 말했다. 라벨이 시킨 대로 적으면
 * `단위=g` · `수량=100` 이 되고, `joinIngredientAmount` 가 `"g 100"` 을 만들어 서버
 * 파서가 못 읽는다 — **말한 대로 따른 사람의 재료가 합산에서 빠졌다.** 지금 로케일 값은
 * `100g` · `1개` 라 위 규칙의 두 예시가 그대로 칸 안에 앉아 있다.
 *
 * 그 대가로 두 가지가 따라온다.
 *  1. 예시는 이름이 아니므로 `accessibilityLabel` 로 쓸 수 없다 → 다음 절.
 *  2. 80pt 칸에서 가장 넓은 내용이 더 이상 플레이스홀더가 아니다. 안쪽 여백을 이름
 *     칸(14)보다 좁은 10 으로 둔 원래 이유는 `수량/개수`(15px 한글 다섯 자)가 잘려도
 *     `TextInput` 플레이스홀더에는 말줄임이 없어 **잘린 티조차 안 난다**는 것이었는데,
 *     그 압력은 사라졌다. 그래도 10 을 유지한다 — 이제 이 칸에서 잘릴 수 있는 것은
 *     사용자가 적은 값(`1큰술`·`200ml`)이고, 고정 80 짜리 칸에서 여백을 14 로 올리면
 *     값이 쓸 수 있는 폭이 60 → 52 로 준다. 칸 폭은 시안 실측(80)이라 늘릴 값이 아니다.
 *
 * ## 세 칸 모두 이름을 읽어 준다 — 다만 그 이름이 플레이스홀더는 아니다
 * 이름 칸은 `namePlaceholder`(`재료명`)를 그대로 `accessibilityLabel` 로 쓴다. 그건
 * 예시가 아니라 **진짜 칸 이름**이라 값을 다 적은 뒤에 읽혀도 맞는 말이다.
 * 좁은 두 칸은 그럴 수 없다 — 예시(`100g`·`1개`)를 라벨로 박으면 스크린 리더가 값이
 * 있을 때 이름과 값을 나란히 읽어 "100g … 150g" 가 된다. 그래서 **이름 문구를 따로**
 * 뒀고(`ingredient.unitLabel`·`countLabel`, ko/en 양쪽에 있다) 세 칸이 전부
 * `accessibilityLabel` 을 든다.
 *
 * 좁은 두 칸의 라벨을 비워 두는 쪽은 버렸다. 플랫폼이 플레이스홀더를 이름 대신 읽어
 * 주는 것은 **빈 칸일 때뿐**이라, 한 자라도 적는 순간 그 칸은 이름 없는 입력 칸이 된다
 * — 같은 모양의 칸 셋이 나란히 선 행에서 지금 어디에 적고 있는지 되물을 곳이 사라진다.
 * 값이 있을 때야말로 이름이 필요하다.
 *
 * ## hitSlop 은 부모 프레임 밖으로 못 나간다
 * RN 이 `ViewPropTypes.d.ts` 에 적어 둔 문장이다 —
 * "The touch area never extends past the parent view bounds."
 * 이 파일의 과녁 두 개가 정확히 거기 걸린다: 삭제(×)는 행의 오른쪽 끝에, `+` 줄은 이
 * 블록의 맨 아래에 붙어 있어서 바깥쪽으로 넓힌 슬롭이 곧장 부모 밖이다. 그래서 **넓히려는
 * 만큼을 부모의 안쪽 여백으로 만들어 두고 같은 값의 음수 마진으로 바깥 배치를 되돌린다**
 * (`row` 의 `paddingRight/marginRight` · `wrap` 의 `paddingBottom/marginBottom`).
 * 보이는 자리는 1pt 도 안 움직이고 프레임만 넓어진다.
 *
 * 부모 체인이 넘겨주기를 기다리는 대안은 버렸다. 새 아키텍처는 자식의 hitSlop 을 부모의
 * overflow inset 에 얹어 주지만(`YogaLayoutableShadowNode::getContentBounds`), 그 통로는
 * 중간에 `overflow: hidden` 인 조상이 하나만 있어도 끊긴다. 지금 안 끊긴다는 사실이 다음
 * 사람이 이 블록을 카드 안에 넣는 순간까지 유지된다는 보장은 없다.
 *
 * ## 라디우스는 `LAYOUT.field.radius`(14)가 아니다
 * 이 칸은 높이 48 로 일반 입력 칸(56)보다 한 단 낮다. 같은 14 를 주면 낮은 상자에 큰
 * 곡률이 얹혀 알약처럼 부풀어 보인다. 시안 실측은 12 = v2 `radius.lg` 라 그 토큰을
 * 그대로 쓴다(`LAYOUT` 의 라디우스들은 v2 사다리를 손으로 베껴 둔 값이라, 사다리 자체를
 * 가리키는 편이 다음 사람이 값을 고를 때 헷갈리지 않는다).
 */

import { StyleSheet, View, Pressable } from "react-native"
import { Text, TextInput } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"

import { radius } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE, singleLineInputText } from "@/src/theme/surface"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import { amountHintFor } from "@/src/features/recipe/utils/recipeAmountText"
import { joinIngredientAmount, type IngredientRow } from "./writeFormState"

interface IngredientEditorProps {
  rows: IngredientRow[]
  /** 세 칸이 모두 이 하나로 들어온다(`{ name }` / `{ amountText }` / `{ countText }`). */
  onChangeRow: (id: string, patch: Partial<Omit<IngredientRow, "id">>) => void
  onRemoveRow: (id: string) => void
  onAddRow: () => void
  copy: {
    namePlaceholder: string
    /** 가운데 칸. 그램이 실리는 쪽이다. **칸 이름이 아니라 예시**(`100g`). */
    unitPlaceholder: string
    /** 오른쪽 칸. 여기도 예시다(`1개`). */
    countPlaceholder: string
    /** 블록 머리의 라벨("재료 입력"). */
    label: string
    /**
     * 좁은 두 칸의 **이름**(화면에는 안 그린다). 플레이스홀더가 예시(`100g`·`1개`)로
     * 바뀌면서 그것을 `accessibilityLabel` 로 쓸 수 없게 됐다 — 값이 채워지면
     * 스크린 리더가 "100g … 150g" 처럼 예시와 값을 나란히 읽는다. 이름은 따로 준다.
     */
    unitLabel: string
    countLabel: string
    add: string
    removeLabel: (name: string) => string
    limitReached: string
    hintMissing: string
    hintUnmeasurable: string
  }
}

export function IngredientEditor({
  rows,
  onChangeRow,
  onRemoveRow,
  onAddRow,
  copy,
}: IngredientEditorProps) {
  const s = useSurface()
  const atLimit = rows.length >= RECIPE_WRITE_LIMITS.ingredientMax
  // 세 칸이 같은 면·같은 보더를 쓴다. 칸마다 고르면 한 행 안에서 갈린다.
  const cellFace = { backgroundColor: s.card, borderColor: s.border }

  return (
    <View style={styles.wrap}>
      {/* 다른 칸(`WriteTextField`·`WriteChipRail`)과 **같은 급의 라벨**이다. 없으면
          재료 줄만 머리 없이 시작해서, 위 섹션의 끝인지 새 블록인지 읽히지 않는다. */}
      {/* 재료도 필수 5개 중 하나다(`RECIPE_WRITE_REQUIREMENTS`). 별이 없으면
          별 붙은 칸을 다 채운 사람이 회색 버튼 앞에서 이유를 못 찾는다. */}
      <Text style={[styles.label, { color: s.textStrong }]}>
        {copy.label}
        <Text style={{ color: s.brand }}> *</Text>
      </Text>
      {rows.map((row) => {
        const hint = amountHintFor(
          row.name,
          joinIngredientAmount(row.amountText, row.countText),
        )
        return (
          <View key={row.id} style={styles.rowWrap}>
            <View style={styles.row}>
              <View style={[styles.cell, styles.nameCell, cellFace]}>
                <TextInput
                  value={row.name}
                  onChangeText={(text) => onChangeRow(row.id, { name: text })}
                  placeholder={copy.namePlaceholder}
                  placeholderTextColor={s.textMuted}
                  maxLength={RECIPE_WRITE_LIMITS.ingredientNameMax}
                  accessibilityLabel={copy.namePlaceholder}
                  style={[styles.input, { color: s.textStrong }]}
                />
              </View>
              {/* 단위·수량의 `maxLength` 는 **칸별 상한**이다. 합산 상한
                  (`ingredientAmountMax`)을 칸에 걸면 두 칸을 다 채웠을 때 합친
                  문자열이 상한을 넘어 등록 순간 조용히 잘린다.

                  두 칸의 `accessibilityLabel` 은 플레이스홀더가 아니라 **따로 둔
                  이름 문구**(`copy.unitLabel`·`countLabel`)다. 플레이스홀더는
                  예시라서 라벨로 쓰면 값과 나란히 읽힌다(머리말 "세 칸 모두"). */}
              <View style={[styles.cell, styles.sideCell, cellFace]}>
                <TextInput
                  value={row.amountText}
                  onChangeText={(text) =>
                    onChangeRow(row.id, { amountText: text })
                  }
                  placeholder={copy.unitPlaceholder}
                  placeholderTextColor={s.textMuted}
                  accessibilityLabel={copy.unitLabel}
                  maxLength={RECIPE_WRITE_LIMITS.ingredientUnitMax}
                  style={[styles.input, { color: s.textStrong }]}
                />
              </View>
              <View style={[styles.cell, styles.sideCell, cellFace]}>
                <TextInput
                  value={row.countText}
                  onChangeText={(text) =>
                    onChangeRow(row.id, { countText: text })
                  }
                  placeholder={copy.countPlaceholder}
                  placeholderTextColor={s.textMuted}
                  accessibilityLabel={copy.countLabel}
                  maxLength={RECIPE_WRITE_LIMITS.ingredientCountMax}
                  style={[styles.input, { color: s.textStrong }]}
                />
              </View>
              <Pressable
                onPress={() => onRemoveRow(row.id)}
                accessibilityRole="button"
                accessibilityLabel={copy.removeLabel(row.name)}
                /*
                  28 짜리 과녁을 44 로 올린다. 세로는 8+8, 가로는 4+12 — 둘 다 28 에
                  더해 44 가 되는 값이다. **왼쪽으로만 조금** 물리는 이유: 사방 8 을
                  주면 넓힌 영역이 바로 옆 수량 칸(간격 4) 위에 겹쳐 눕고, 형제 중
                  나중에 그려진 이 버튼이 위에 있어서 수량 칸의 오른쪽 끝을 누르면
                  글자가 아니라 삭제가 잡힌다. 4 는 그 간격을 정확히 채우고 멈춘다.

                  네 방향이 실제로 닿는 범위는 이 값이 아니라 **부모 프레임**이 정한다
                  (머리말 "hitSlop"). 여기서는
                   · 세로 8 — 행 높이 48, 버튼 28 이라 위아래로 각각 10 이 남는다. 부모 안.
                   · 왼쪽 4 — 위에서 말한 `gap: 4`. 그 4 도 행의 안쪽이다. 부모 안.
                   · 오른쪽 12 — 버튼이 행의 오른쪽 끝에 붙어 있어 **혼자 부모 밖**이었다.
                     그래서 `styles.row` 가 그 12 를 자기 안쪽 여백으로 들고 있다.
                */
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 12 }}
                style={({ pressed }) => [
                  styles.removeButton,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons name="close" size={18} color={s.textWeak} />
              </Pressable>
            </View>
            {/*
              색을 쓰지 않는다 — 계약 §6.4 는 프라이머리 하나 + 그레이스케일이다.
              고쳐야 하는 줄(무게를 못 읽음)은 본문색 + 굵기로, 아직 안 적은 줄은
              흐린 회색으로 구분한다. 힌트가 그 줄 바로 아래에 붙어 있어서
              색 없이도 어느 줄인지 헷갈리지 않는다.
            */}
            {hint === "ok" ? null : (
              <Text
                style={[
                  styles.hint,
                  hint === "unmeasurable"
                    ? { color: s.text, fontWeight: "600" }
                    : { color: s.textMuted },
                ]}
              >
                {hint === "unmeasurable"
                  ? copy.hintUnmeasurable
                  : copy.hintMissing}
              </Text>
            )}
          </View>
        )
      })}

      {atLimit ? (
        <Text style={[styles.limit, { color: s.textMuted }]}>
          {copy.limitReached}
        </Text>
      ) : (
        /*
          시안의 `+` 줄에는 글리프 하나뿐이다. **글자를 같이 둔다** — 30pt 짜리 회색 띠
          위의 `+` 는 "무엇을" 더하는지 말하지 않는다. 이 줄 바로 위가 재료 행이라
          문맥으로 짐작은 되지만, 짐작해야 하는 버튼은 스크린 리더에서도 이름이 없다.
          글자를 넣으면 `accessibilityLabel` 과 보이는 것이 같아진다.

          눌림은 투명도가 아니라 **면 + 보더**로 말한다. 30pt 띠에서 투명도 변화는
          거의 안 보이고(면 자체가 이미 8% 다), 대신 이 화면에서 브랜드 틴트가 붙는
          다른 자리(선택된 칩)와 같은 어휘가 된다.

          보더는 **항상 그리고 색만 바꾼다**. 눌렀을 때만 붙이면 RN 이 보더를 상자 안쪽에
          그리므로 누르는 순간 안쪽 내용이 1pt 씩 밀린다 — 손가락 아래에서 글자가 떠는 것으로
          보인다. `WriteTextField` 가 같은 이유로 같은 규칙을 쓴다.
        */
        <Pressable
          onPress={onAddRow}
          accessibilityRole="button"
          accessibilityLabel={copy.add}
          /*
            띠는 30 인데 손가락은 44 를 요구한다(HIG·Material 둘 다). 30+7+7 = 44.
            띠 자체를 44 로 키우는 대안은 버렸다 — 이 줄은 값이 아니라 조작부라
            재료 행(48)만큼 무거워지면 안 되고, 시안 실측도 30 이다.
             · 위 7 — 이 버튼 바로 위가 `wrap` 의 `gap: 8` 이라 7 은 그 안이다.
             · 아래 7 — 이 버튼이 `wrap` 의 마지막 자식이라 아래쪽은 곧 부모 밖이다.
               그래서 `styles.wrap` 이 그 7 을 자기 안쪽 여백으로 들고 있다.
          */
          hitSlop={{ top: 7, bottom: 7 }}
          style={({ pressed }) => [
            styles.addButton,
            pressed
              ? { backgroundColor: s.surfaceBrand, borderColor: s.brand }
              : { backgroundColor: s.surface, borderColor: "transparent" },
          ]}
        >
          <Ionicons name="add" size={16} color={s.text} />
          <Text style={[styles.addText, { color: s.text }]}>{copy.add}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // `WriteTextField`·`WriteChipRail` 의 라벨과 **같은 값**이다. 한쪽만 올리면
  // 같은 섹션 안에서 "조리 순서"(칸)와 "재료 입력"(여기)이 다른 크기로 선다.
  label: { ...TYPE.cardTitle, fontWeight: "700" },
  // 행과 행 사이 · 마지막 행과 `+` 줄 사이가 같은 8 이다. 시안 실측은 행→`+` 의 8
  // 하나뿐인데(행이 한 줄뿐이라 행→행은 찍히지 않았다), 둘을 다르게 두면 재료를
  // 두 줄 적는 순간 `+` 만 다른 리듬으로 떨어진다.
  //
  // `paddingBottom`/`marginBottom` 은 배치가 아니라 **과녁**이다. `+` 줄의 아래쪽
  // hitSlop 7 이 이 블록 밖으로 나가지 않게 프레임만 7 늘리고, 같은 값의 음수 마진으로
  // 바깥 배치를 되돌린다(머리말 "hitSlop"). 늘어난 7 은 섹션의 `gap: 20` 안이라
  // 다음 블록을 밟지 않는다.
  wrap: { gap: 8, paddingBottom: 7, marginBottom: -7 },
  rowWrap: { gap: 4 },
  // 오른쪽 12 도 같은 장치다 — 삭제 버튼의 `right: 12` 를 행 안쪽으로 들여놓는다.
  // 안쪽 여백이 12 늘고 바깥이 12 줄어 세 칸의 폭·위치는 그대로다. 늘어난 12 는
  // 섹션의 가로 여백(20) 안이라 화면 밖으로도 안 나간다.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 12,
    marginRight: -12,
  },
  cell: {
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
  },
  // 이름 칸이 남은 폭을 먹는다. 시안의 167 은 삭제 버튼이 없을 때의 값이라
  // 고정 폭으로 옮겨 적으면 삭제 버튼 폭만큼 행이 넘친다.
  nameCell: { flex: 1, paddingHorizontal: 14 },
  sideCell: { width: 80, paddingHorizontal: 10 },
  input: { ...singleLineInputText(TYPE.value), padding: 0 },
  removeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  // 12px 은 `TYPE.caption`(13/18)에 크기만 덮어써서 만들던 값이었다. 12 는 스케일에
  // 있는 크기(`TYPE.cardSub` = v2 `subtext.small`, 12/16)라 그 토큰을 그대로 가리킨다.
  // 행간이 손으로 적은 17 에서 16 으로 1 준다 — 스케일이 그 크기에 정해 둔 값이다.
  hint: { ...TYPE.cardSub, paddingLeft: 4 },
  addButton: {
    // 고정 높이였다. OS 큰 글씨에서 글자가 상자를 넘으면 위아래가 잘리는데, 상자는
    // 30 으로 그대로 서 있어서 **잘린 티가 안 난다**. 30 을 바닥값으로 내린다.
    //
    // 여백 4 는 "띠를 30 으로 유지하는 가장 큰 값"이다. RN 은 높이에 보더·여백이
    // 포함되므로 기본 크기의 내용(캡션 13/18 · 아이콘 16 중 큰 쪽 = 18~20)에
    // 여백 4+4 와 보더 1+1 을 더해도 30 을 넘지 않는다 → 띠는 지금과 같은 30 이다.
    // (여백을 6 으로 주면 18+12+2 = 32 가 되어 시안 실측 30 을 넘는다.)
    // 글자가 커지면 그때부터 상자가 따라 자라고, 이 4 가 글리프와 보더 사이를 띄운다.
    minHeight: 30,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  // 라벨(15/700)보다 한 단 아래다. 30pt 띠 안에서 15px 은 상자를 꽉 채워
  // 재료 칸의 값과 같은 급으로 읽힌다 — 이건 값이 아니라 조작부다.
  addText: { ...TYPE.caption, fontWeight: "600" },
  // 힌트와 같은 12px 자리다. 같은 토큰을 쓴다 — 예전엔 한쪽이 12/17, 한쪽이 12/18
  // 이라 같은 크기 글자가 줄마다 다른 높이로 앉았다.
  limit: { ...TYPE.cardSub },
})
