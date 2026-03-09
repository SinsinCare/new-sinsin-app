/**
 * SVG 아이콘 래퍼. assets/icons/ 의 SVG는 stroke/fill에 "currentColor"를
 * 사용해야 color prop으로 런타임 색상 변경이 가능합니다.
 */
import { SvgProps } from "react-native-svg"
import Chef from "@/assets/icons/chef.svg"
import Chat from "@/assets/icons/chat.svg"
import CheckColor from "@/assets/icons/check-color.svg"
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
import Loading from "@/assets/icons/loading.svg"
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
import Character1 from "@/assets/icons/character_1.svg"
import Character2 from "@/assets/icons/character_2.svg"
import Character3 from "@/assets/icons/character_3.svg"
import ShadowLight from "@/assets/icons/shadow_light.svg"
import ShadowDark from "@/assets/icons/shadow_dark.svg"

const icons = {
  bookmark: Bookmark,
  chat: Chat,
  "check-color": CheckColor,
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
  loading: Loading,
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
  x: X,
  character_1: Character1,
  character_2: Character2,
  character_3: Character3,
  shadow_light: ShadowLight,
  shadow_dark: ShadowDark,
} as const

export type IconName = keyof typeof icons

interface IconProps extends Omit<SvgProps, "width" | "height"> {
  name: IconName
  size?: number
  color?: string
}

export function Icon({
  name,
  size = 24,
  color = "#A5A5AF",
  ...props
}: IconProps) {
  const SvgComponent = icons[name]
  return <SvgComponent width={size} height={size} color={color} {...props} />
}
