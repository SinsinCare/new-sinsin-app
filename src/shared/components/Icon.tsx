/**
 * SVG 아이콘 래퍼. assets/icons/ 의 SVG는 stroke/fill에 "currentColor"를
 * 사용해야 color prop으로 런타임 색상 변경이 가능합니다.
 *
 * 캐릭터 일러스트는 벡터가 아니라 래스터입니다. SVG 래퍼에 base64 PNG로 들어 있던 것을
 * PNG 에셋으로 분리했습니다 — SVG로 두면 react-native-svg-transformer 가 JS 컴포넌트로
 * 컴파일해 base64 문자열이 번들에 그대로 실리고, Hermes가 콜드스타트마다 파싱합니다.
 * (character 3종 + circle-character = 2.2MB 였음)
 */
import { Image } from "expo-image"
import { SvgProps } from "react-native-svg"
import { tokens } from "@/src/theme/tokens"
import Chef from "@/assets/icons/chef.svg"
import Chat from "@/assets/icons/chat.svg"
import CheckColor from "@/assets/icons/check-color.svg"
import CheckEmpty from "@/assets/icons/check-empty.svg"
import CheckDark from "@/assets/icons/check-dark.svg"
import FireColor from "@/assets/icons/fire-color.svg"
import FireEmpty from "@/assets/icons/fire-empty.svg"
import FireDark from "@/assets/icons/fire-dark.svg"
import Copy from "@/assets/icons/copy.svg"
import ChevronRight from "@/assets/icons/chevron-right.svg"
import Cross from "@/assets/icons/cross.svg"
import Filter from "@/assets/icons/filter.svg"
import FlyChat from "@/assets/icons/fly-chat.svg"
import ForkKnife from "@/assets/icons/fork-knife.svg"
import Gallery from "@/assets/icons/gallery.svg"
import HandsClap from "@/assets/icons/hands-clap.svg"
import HeartText from "@/assets/icons/heart-text.svg"
import History from "@/assets/icons/history.svg"
import Home from "@/assets/icons/home.svg"
import Location from "@/assets/icons/location.svg"
import Magnifyingglass from "@/assets/icons/magnifyingglass.svg"
import Mail from "@/assets/icons/mail.svg"
import Message from "@/assets/icons/message.svg"
import MinusCircle from "@/assets/icons/minus-circle.svg"
import Menu from "@/assets/icons/menu.svg"
import Notification from "@/assets/icons/notification.svg"
import Paperclip from "@/assets/icons/paperclip.svg"
import Pill from "@/assets/icons/pill.svg"
import Plus from "@/assets/icons/plus.svg"
import Recipe from "@/assets/icons/recipe.svg"
import Reset from "@/assets/icons/reset.svg"
import Water from "@/assets/icons/water.svg"
import Pencil from "@/assets/icons/pencil.svg"
import Trashcan from "@/assets/icons/trashcan.svg"
import Upload from "@/assets/icons/upload.svg"
import X from "@/assets/icons/x.svg"
import WaterDrop from "@/assets/icons/water-drop.svg"
import Sodium from "@/assets/icons/sodium.svg"
import Potassium from "@/assets/icons/potassium.svg"
import Phosphorus from "@/assets/icons/phosphorus.svg"
import Protein from "@/assets/icons/protein.svg"
import Bookmark from "@/assets/icons/bookmark.svg"
import Hashtag from "@/assets/icons/hashtag.svg"
import Info from "@/assets/icons/info.svg"
import Keyboard from "@/assets/icons/keyboard.svg"
import Vote from "@/assets/icons/vote.svg"
import Morning from "@/assets/icons/morning.svg"
import Noon from "@/assets/icons/noon.svg"
import Evening from "@/assets/icons/evening.svg"
import Dessert from "@/assets/icons/dessert.svg"
import Edit from "@/assets/icons/edit.svg"
import Spot from "@/assets/icons/spot.svg"
import MorningFood from "@/assets/icons/morning_food.svg"
import NoonFood from "@/assets/icons/noon_food.svg"
import EveningFood from "@/assets/icons/evening_food.svg"
import DessertFood from "@/assets/icons/dessert_food.svg"
import CheckOrange from "@/assets/icons/check-orange.svg"
import Sparkle from "@/assets/icons/sparkle.svg"
import Profile from "@/assets/icons/profile.svg"
import ProfileDark from "@/assets/icons/profile-dark.svg"
import EllipsisHorizontal from "@/assets/icons/ellipsis-horizontal.svg"

const icons = {
  bookmark: Bookmark,
  chat: Chat,
  "check-color": CheckColor,
  "check-empty": CheckEmpty,
  "fire-color": FireColor,
  "fire-empty": FireEmpty,
  "check-orange": CheckOrange,
  chef: Chef,
  "chevron-right": ChevronRight,
  copy: Copy,
  cross: Cross,
  filter: Filter,
  "fly-chat": FlyChat,
  "fork-knife": ForkKnife,
  gallery: Gallery,
  "hands-clap": HandsClap,
  hashtag: Hashtag,
  "heart-text": HeartText,
  history: History,
  home: Home,
  info: Info,
  keyboard: Keyboard,
  loading: MorningFood,
  location: Location,
  magnifyingglass: Magnifyingglass,
  mail: Mail,
  menu: Menu,
  message: Message,
  "minus-circle": MinusCircle,
  notification: Notification,
  paperclip: Paperclip,
  pencil: Pencil,
  phosphorus: Phosphorus,
  pill: Pill,
  plus: Plus,
  potassium: Potassium,
  protein: Protein,
  recipe: Recipe,
  reset: Reset,
  sodium: Sodium,
  trashcan: Trashcan,
  upload: Upload,
  vote: Vote,
  water: Water,
  "water-drop": WaterDrop,
  morning: Morning,
  noon: Noon,
  evening: Evening,
  dessert: Dessert,
  edit: Edit,
  spot: Spot,
  x: X,
  sparkle: Sparkle,
  "morning-food": MorningFood,
  "noon-food": NoonFood,
  "evening-food": EveningFood,
  "dessert-food": DessertFood,
  profile: Profile,
  "profile-dark": ProfileDark,
  "fire-dark": FireDark,
  "check-dark": CheckDark,
  "ellipsis-horizontal": EllipsisHorizontal,
} as const

/** 래스터 일러스트. color prop은 적용되지 않습니다(벡터가 아님). */
const rasterIcons = {
  "character-excellent": require("@/assets/icons/character-excellent.png"),
  "character-good": require("@/assets/icons/character-good.png"),
  "character-caution": require("@/assets/icons/character-caution.png"),
  "circle-character": require("@/assets/icons/circle-character.png"),
} as const

export type IconName = keyof typeof icons | keyof typeof rasterIcons

function isRaster(name: IconName): name is keyof typeof rasterIcons {
  return name in rasterIcons
}

interface IconProps extends Omit<SvgProps, "width" | "height"> {
  name: IconName
  size?: number
  color?: string
}

export function Icon({
  name,
  size = 24,
  color = tokens.color.textLightSub.val,
  ...props
}: IconProps) {
  if (isRaster(name)) {
    return (
      <Image
        source={rasterIcons[name]}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={0}
      />
    )
  }
  const SvgComponent = icons[name]
  return <SvgComponent width={size} height={size} color={color} {...props} />
}
