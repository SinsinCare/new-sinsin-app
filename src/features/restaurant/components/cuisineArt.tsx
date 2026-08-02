/**
 * 음식 종류 일러스트 — 사진이 없을 때 그 자리에 놓는 그림.
 *
 * 자산은 `assets/images/*.svg` 로 레시피 카드가 쓰는 것과 **같은 파일**이다(한식 그릇 ·
 * 중식 만두 · 일식 주먹밥 · 양식 피자 · 샐러드 · 디저트). 두 기능이 서로를 import 하지
 * 않고 자산만 공유한다 — 기능 모듈끼리 의존하면 한쪽 리팩터가 다른 쪽을 깬다.
 *
 * `CategoryChipRail` 이 갖고 있던 표를 여기로 올렸다. 사진 자리(`PhotoStrip`)도 같은 표를
 * 봐야 지도 칩의 한식 그림과 카드의 한식 그림이 어긋나지 않는다.
 */
import type { SvgProps } from "react-native-svg"
import type React from "react"

import AmericanArt from "@/assets/images/american.svg"
import ChineseArt from "@/assets/images/chinese.svg"
import DessertArt from "@/assets/images/dessert.svg"
import JapaneseArt from "@/assets/images/japanese.svg"
import KoreanArt from "@/assets/images/korean.svg"
import SaladArt from "@/assets/images/salad.svg"

import type { CuisineType } from "../types"

export const CUISINE_ART: Partial<Record<CuisineType, React.FC<SvgProps>>> = {
  KOREAN: KoreanArt,
  CHINESE: ChineseArt,
  JAPANESE: JapaneseArt,
  WESTERN: AmericanArt,
  SALAD: SaladArt,
  DESSERT: DessertArt,
}
