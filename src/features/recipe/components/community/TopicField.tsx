import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import { V2BottomSheet, V2Icon, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { RecordChoices } from "@/src/features/home/components/record/pages/RecordChoices"
import { borderWidth } from "@/src/design-system-v2/tokens/size"
import {
  FORM,
  MIN,
  PAGE_X,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"
import { FREE_POST_CATEGORIES } from "@/src/features/recipe/data/freePostCategories"

const POST_CATEGORY_LABEL_KEYS = {
  diet: "category.post.diet",
  numbers: "category.post.numbers",
  symptoms: "category.post.symptoms",
  medicine: "category.post.medicine",
  "dining-out": "category.post.dining-out",
  daily: "category.post.daily",
} as const

/**
 * 글 주제 — **당근 동네생활 글쓰기의 "맛집 ›" 행**(2026-09-12, Mobbin). 헤더 바로 아래
 * 가장자리까지 닿는 한 줄, 왼쪽에 고른 주제, 오른쪽에 chevron, 아래 hairline. 탭하면
 * 바텀시트에서 고른다(시트 안은 건강기록 키트의 `RecordChoices`, 고르면 바로 닫힌다 —
 * 당근과 같다). 페이지 위에 칩 여섯 개를 펼치지 않는다. 작성·수정 두 화면이 같이 쓴다.
 */
export function TopicField({
  value,
  onChange,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation("recipe")
  const s = useSurface()
  const [open, setOpen] = useState(false)

  const options = FREE_POST_CATEGORIES.map((category) => ({
    value: category.key,
    label: t(
      POST_CATEGORY_LABEL_KEYS[
        category.key as keyof typeof POST_CATEGORY_LABEL_KEYS
      ],
    ),
  }))
  const current = options.find((option) => option.value === value)

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t("freePost.topicAccessibility", {
          category: current?.label ?? "",
        })}
        style={({ pressed }) => [
          styles.row,
          {
            borderBottomColor: s.hairline,
            backgroundColor: pressed ? s.surfacePressed : s.canvas,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <V2Text style={styles.caption} color={s.textMuted}>
          {t("freePost.topicTitle")}
        </V2Text>
        <V2Text style={styles.value} color={s.textStrong} numberOfLines={1}>
          {current?.label ?? t("freePost.topicPlaceholder")}
        </V2Text>
        <V2Icon name="chevronRight" size={20} color={s.textMuted} />
      </Pressable>

      <V2BottomSheet
        surface="community_post_category"
        visible={open}
        onClose={() => setOpen(false)}
        title={t("freePost.topicSheetTitle")}
      >
        <View style={styles.sheetBody}>
          <RecordChoices
            value={value}
            options={options}
            onChange={(next) => {
              onChange(next)
              setOpen(false)
            }}
          />
        </View>
      </V2BottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  /* 당근의 주제 행 — 52 높이(44 + 8), 좌우 PAGE_X, 아래 hairline. */
  row: {
    minHeight: MIN.TOUCH + S[2],
    paddingHorizontal: PAGE_X,
    flexDirection: "row",
    alignItems: "center",
    gap: S[3],
    borderBottomWidth: borderWidth.thin,
  },
  /* "주제  식단  ›" — 캡션은 힌트 글자, 값은 라벨 글자. 값이 나머지 폭을 차지한다. */
  caption: FORM.hint,
  value: { ...FORM.label, flex: 1 },
  sheetBody: {
    paddingHorizontal: PAGE_X,
    paddingTop: S[2],
    paddingBottom: S[6],
  },
})
