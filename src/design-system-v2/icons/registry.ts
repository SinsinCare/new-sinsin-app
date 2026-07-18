// Design System v2 — 아이콘 레지스트리 (name → SVG 컴포넌트)
// SVG는 배경 제거 + fill/stroke를 currentColor로 정규화(V2Icon으로 색상 토큰 적용).
// 도메인 아이콘 22 + 시스템 글리프 4(chevronLeft/arrowBack/search/close, 세트 스타일로 authoring).
import type React from "react"
import type { SvgProps } from "react-native-svg"
import IconHeart from "./svg/icon-heart.svg"
import IconDoctor from "./svg/icon-doctor.svg"
import IconUpload from "./svg/icon-upload.svg"
import IconAnnouncement from "./svg/icon-annousment.svg"
import IconChat from "./svg/icon-chat.svg"
import IconBook from "./svg/icon-book.svg"
import IconTube from "./svg/icon-tube.svg"
import IconFork from "./svg/icon-fork.svg"
import IconHealth from "./svg/icon-health.svg"
import IconLetter from "./svg/icon-letter.svg"
import IconReport from "./svg/icon-report.svg"
import IconPlus from "./svg/icon_plus.svg"
import IconAlert from "./svg/icon-alert.svg"
import IconTheme from "./svg/icon-tema.svg"
import IconSafety from "./svg/icon-safety.svg"
import IconCamera from "./svg/icon-camera.svg"
import IconInfo from "./svg/icon-info.svg"
import IconFile from "./svg/icon-file.svg"
import IconCaution from "./svg/icon-caution.svg"
import IconDanger from "./svg/icon-danger.svg"
import IconMic from "./svg/icon-mic.svg"
import IconButtonUpload from "./svg/button-upload.svg"
import IconChevronLeft from "./svg/icon-chevron-left.svg"
import IconArrowBack from "./svg/icon-arrow-back.svg"
import IconSearch from "./svg/icon-search.svg"
import IconClose from "./svg/icon-close.svg"

export const iconRegistry = {
  heart: IconHeart,
  doctor: IconDoctor,
  upload: IconUpload,
  announcement: IconAnnouncement, // 파일명 오타 annousment
  chat: IconChat,
  book: IconBook,
  tube: IconTube,
  fork: IconFork,
  health: IconHealth,
  letter: IconLetter,
  report: IconReport,
  plus: IconPlus,
  alert: IconAlert,
  theme: IconTheme, // 파일명 오타 tema
  safety: IconSafety,
  camera: IconCamera,
  info: IconInfo,
  file: IconFile,
  caution: IconCaution,
  danger: IconDanger,
  mic: IconMic,
  buttonUpload: IconButtonUpload,
  chevronLeft: IconChevronLeft, // 시스템 글리프(신규)
  arrowBack: IconArrowBack, // 시스템 글리프(신규)
  search: IconSearch, // 시스템 글리프(신규)
  close: IconClose, // 시스템 글리프(신규)
} satisfies Record<string, React.FC<SvgProps>>

export type V2IconName = keyof typeof iconRegistry
export const iconNames = Object.keys(iconRegistry) as V2IconName[]
