import { useEffect, useRef } from "react"
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"
import { RecordSheetShell } from "./RecordSheetShell"
import type { MealType } from "../../../types"

export interface MealPhotoDraft {
  uri: string
  /** 앨범 원본 크기. 미리보기 비율에만 쓴다(0 이면 정사각으로 앉힌다). */
  width: number
  height: number
  mealType: MealType
}

/**
 * 파노라마·세로 스크린샷도 시트 안에 앉도록 비율을 가둔다. 벗어난 사진은 잘리지 않고
 * 좌우(또는 위아래) 여백을 두고 통째로 들어간다 — 확인 화면에서 잘라 보이면 안 된다.
 */
const MIN_RATIO = 0.72
const MAX_RATIO = 1.4
/**
 * 미리보기가 먹는 화면 높이 상한. 나머지는 제목·CTA·'다른 사진' 몫이다.
 *
 * 한때 이 위에 `SHEET_CHROME`(사진을 뺀 부속 높이 257pt) 이 있었다. 시트 높이가 화면
 * 대비 % 고정값이던 시절, 사진 비율마다 그 %를 되짚어 계산해야 했기 때문이다 — 70% 로
 * 고정했더니 가로 사진에서 버튼과 CTA 사이가 87pt 비었고, 60% 로 줄였더니 세로에서
 * '다른 사진 고르기'가 CTA 뒤로 잘렸다. 이제 시트가 콘텐츠 높이대로 서므로
 * (`RecordSheetShell` 머리말 §높이) 그 산수는 사라졌고, 남은 것은 **사진이 시트를
 * 다 먹지 않게 하는 상한** 하나다.
 */
const PHOTO_HEIGHT_RATIO = 0.38

/**
 * 앨범에서 고른 사진을 크게 띄우고 시작 여부를 묻는 시트.
 *
 * ## 왜 한 단계를 더 두는가
 *
 * iOS 앨범(PHPickerViewController)은 사진을 **탭하는 순간** 시트를 닫고 그 사진을
 * 돌려준다 — 미리보기도, 확인도 없다. 그래서 손이 스쳐 엉뚱한 사진을 눌러도 곧장
 * 분석이 시작됐다. 이 앱에서 그 대가는 단순한 되돌리기가 아니다: 서버 분석 한 번을
 * 태우고, 로딩 오버레이가 화면을 덮고, 끝나면 그 끼니의 기록으로 남는다. 사진 찍기
 * 경로에는 iOS 카메라가 원래 '다시 찍기 / 사진 사용' 을 물어 이 단계가 이미 있다 —
 * 없던 쪽은 앨범뿐이었고, 이 시트가 그 비대칭을 메운다.
 *
 * 그래서 이 화면은 **묻기만 한다.** 끼니 칩도, 편집 도구도 두지 않는다(그건 앞 시트와
 * 결과 화면의 몫이다). 사진 한 장, 시작 버튼 하나, 그리고 되돌아갈 길 두 개다.
 */
export function MealPhotoConfirmSheet({
  draft,
  onClose,
  onConfirm,
  onPickAgain,
}: {
  /** null 이면 닫힌다. 마지막 사진은 퇴장 애니메이션 동안 그대로 그린다. */
  draft: MealPhotoDraft | null
  onClose: () => void
  onConfirm: () => void
  onPickAgain: () => void
}) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const { height: screenHeight } = useWindowDimensions()

  /*
    닫히는 동안에도 사진이 남아 있어야 한다. `draft` 가 null 이 되는 순간 본문을 비우면
    시트가 **빈 채로** 내려가서, 시작을 누른 사람에게 사진이 먼저 사라진 것처럼 보인다.
    effect 로만 갱신하므로 null 이 된 렌더에서는 직전 값이 그대로 남는다.
  */
  const lastDraft = useRef<MealPhotoDraft | null>(null)
  useEffect(() => {
    if (draft) lastDraft.current = draft
  }, [draft])
  const photo = draft ?? lastDraft.current

  const ratio =
    photo && photo.width > 0 && photo.height > 0
      ? Math.min(MAX_RATIO, Math.max(MIN_RATIO, photo.width / photo.height))
      : 1

  return (
    <RecordSheetShell
      surface="home_meal_photo_confirm"
      visible={draft !== null}
      onClose={onClose}
      title={t("home.sheet.mealPhoto.title")}
      subtitle={
        photo
          ? t("home.sheet.meal.willRecordAs", {
              meal: t(`meal.${photo.mealType}`),
            })
          : undefined
      }
      ctaLabel={t("home.sheet.mealPhoto.confirm")}
      onCtaPress={onConfirm}
    >
      <View
        style={[
          styles.frame,
          {
            backgroundColor: surface.surface,
            aspectRatio: ratio,
            maxHeight: Math.round(screenHeight * PHOTO_HEIGHT_RATIO),
          },
        ]}
      >
        {photo ? (
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={t("home.sheet.mealPhoto.photoLabel")}
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            transition={140}
          />
        ) : null}
      </View>

      {/* 되돌아갈 길 하나 — 잘못 고른 사진을 취소 없이 바로 바꾼다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("home.sheet.mealPhoto.pickAgain")}
        onPress={() => {
          hapticSelection()
          onPickAgain()
        }}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.pickAgain,
              {
                backgroundColor: pressed
                  ? surface.surfacePressed
                  : surface.surface,
              },
            ]}
          >
            <Text style={[styles.pickAgainLabel, { color: surface.text }]}>
              {t("home.sheet.mealPhoto.pickAgain")}
            </Text>
          </View>
        )}
      </Pressable>
    </RecordSheetShell>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    /*
      세로 사진은 maxHeight 에 걸리는 순간 Yoga 가 aspectRatio 로 폭을 다시
      줄인다 — 그 좁아진 프레임이 부모 기본 정렬(flex-start)로 왼쪽에 붙어
      "사진이 쏠려 보인다"(QA 2026-08-06). 좁아질 때는 가운데로 온다.
    */
    alignSelf: "center",
    borderRadius: 16,
    overflow: "hidden",
  },
  pickAgain: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pickAgainLabel: { ...TYPE.cardTitle, fontWeight: "600" },
})
