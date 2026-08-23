// Design System v2 — 아이콘 레지스트리 (name → SVG 컴포넌트)
// SVG는 배경 제거 + fill/stroke를 currentColor로 정규화(V2Icon으로 색상 토큰 적용).
// 도메인 아이콘 22 + 시스템 글리프 4(chevronLeft/arrowBack/search/close, 세트 스타일로 authoring).
//
// 식당 지도 배치(30종)를 아래 블록으로 추가했다.
// - legacy `assets/icons/` 에 이미 있던 것은 **다시 그리지 않고 포팅**했다.
//   원본 viewBox 가 16/20/21×22/15×24 로 제각각이라 `<g transform="scale()">` 로
//   24×24 그리드에 맞췄다 — path 좌표를 손으로 재계산하면 형태가 미묘하게 틀어진다.
// - `location.svg` 를 `mapPin` 으로 옮길 때 `<mask id="...">` 를 버렸다. 그 마스크는
//   아이콘 전체를 흰색으로 덮는 no-op 인데, id 가 살아 있으면 같은 화면에 두 번
//   렌더될 때 충돌 위험만 남는다.
// - `profile.svg` 는 하드코딩 hex(#D9D9DF/#A5A5AF)와 clipPath 라 `color` prop 에
//   반응하지 않는다. 그래서 포팅하지 않고 currentColor 로 새로 그렸다.
// - `blog` 는 특정 브랜드 로고를 그리지 않았다. 상표를 임의로 재현하는 것보다
//   일반 '노트' 기호가 안전하고, 링크 라벨이 무엇인지 이미 말해 준다.
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
// 식당 지도 배치 — legacy 포팅
import IconSparkle from "./svg/icon-sparkle.svg"
import IconSparkleMono from "./svg/icon-sparkle-mono.svg"
import IconBookmark from "./svg/icon-bookmark.svg"
import IconCrosshair from "./svg/icon-crosshair.svg"
import IconRefresh from "./svg/icon-refresh.svg"
import IconClock from "./svg/icon-clock.svg"
import IconCopy from "./svg/icon-copy.svg"
import IconFilter from "./svg/icon-filter.svg"
import IconGallery from "./svg/icon-gallery.svg"
import IconTrash from "./svg/icon-trash.svg"
import IconChevronRight from "./svg/icon-chevron-right.svg"
import IconMapPin from "./svg/icon-map-pin.svg"
// 식당 지도 배치 — 신규 authoring
import IconBookmarkFilled from "./svg/icon-bookmark-filled.svg"
import IconChevronDown from "./svg/icon-chevron-down.svg"
import IconPhone from "./svg/icon-phone.svg"
import IconShare from "./svg/icon-share.svg"
import IconStar from "./svg/icon-star.svg"
import IconStarFilled from "./svg/icon-star-filled.svg"
import IconLink from "./svg/icon-link.svg"
import IconPlayCircle from "./svg/icon-play-circle.svg"
import IconProfile from "./svg/icon-profile.svg"
// 편의시설 (목업 §4.7)
import IconReservation from "./svg/icon-reservation.svg"
import IconRestroom from "./svg/icon-restroom.svg"
import IconWifi from "./svg/icon-wifi.svg"
import IconGroupSeat from "./svg/icon-group-seat.svg"
import IconBabyChair from "./svg/icon-baby-chair.svg"
import IconPrivateRoom from "./svg/icon-private-room.svg"
import IconParking from "./svg/icon-parking.svg"
// SNS
import IconInstagram from "./svg/icon-instagram.svg"
import IconYoutube from "./svg/icon-youtube.svg"
import IconBlog from "./svg/icon-blog.svg"

// ── 하단 탭 5종 — Figma `Tab Bar / Tab Item` 내보내기 (2026-08-18)
//
// 앱이 쓰던 `assets/icons/` 의 **외곽선** 글리프가 아니라 Figma 정본의 **채움** 글리프다.
// 파일명은 내보내기 그대로 읽힌다: icon-home/chat/recipe/location/line-three `-mono`.
//
// 내보내기는 `Selected=True/False` 두 벌인데 **path 가 완전히 같고 fill 만 다르다**(실측 md5 일치):
//   - False `#37383C @0.16` = `label.disable`  (0x29/255 = 0.161)
//   - True  `#2E2F33 @0.70` = `label.neutral`  (0xb3/255 = 0.702)
// 즉 두 상태는 색이고, 색은 이미 시맨틱 토큰에 있다. 그래서 **글리프는 한 벌만 들이고
// 박힌 fill 을 `currentColor` 로 바꿨다** — 그러면 라이트에서 Figma 와 정확히 같은 값이
// 나오고, 다크에서는 같은 토큰의 다크 값이 자동으로 따라온다(내보내기 색을 그대로 박으면
// 다크에서 어두운 글자가 어두운 바 위에 얹혀 안 보인다).
// ── 커뮤니티 재디자인 (6) — docs/design/community-redesign/00-MASTER.md §4 G1·G12·G19·G20
//
// `chevronUp` 은 **일부러 넣지 않았다**. 스펙(§4-G20)이 `chevronDown` 을 180° 돌려 쓰라고
// 못 박았다 — 같은 글리프를 두 벌 들이면 둘이 어긋나는 날이 온다.
//
// `heart`(하트+플러스, 건강) 와 `chat`(둥근사각 말풍선) 은 **그대로 둔다**:
// `chat` 은 시안과 일치하고(§4-G19), `heart` 는 다른 화면들이 쓰는 건강 글리프다.
// 커뮤니티의 좋아요는 **민 하트**라 별도 자산이 필요했다.
//
// filled ↔ outline 두 쌍은 **같은 컨투어**를 공유한다(`d` 가 같고 fill/stroke 만 다르다).
// 좋아요를 누르는 순간 글리프가 바뀌는데, 컨투어가 다르면 아이콘이 튄다.
//   - `icon-heart-filled` = `icon-heart` 의 하트 윤곽에서 **플러스 구멍만 뺀 것**.
//   - `icon-chat-outline` = `icon-chat` 과 같은 `d`, fill 대신 stroke.
// 아웃라인 획 2.67 은 실측이다(meal-169 frame 8: 12px 박스에서 1.33 ⇒ 24 박스에서 2.67).
import IconMore from "./svg/icon-more.svg"
import IconHeartFilled from "./svg/icon-heart-filled.svg"
import IconHeartOutline from "./svg/icon-heart-outline.svg"
import IconChatOutline from "./svg/icon-chat-outline.svg"
import IconArrowUp from "./svg/icon-arrow-up.svg"
import IconProfileFilled from "./svg/icon-profile-filled.svg"

import TabHome from "./svg/icon-tab-home.svg"
import TabCommunity from "./svg/icon-tab-chat.svg"
import TabRecipe from "./svg/icon-tab-recipe.svg"
import TabRestaurant from "./svg/icon-tab-location.svg"
import TabAll from "./svg/icon-tab-line-three.svg"

export const iconRegistry = {
  tabHome: TabHome,
  tabCommunity: TabCommunity,
  tabRecipe: TabRecipe,
  tabRestaurant: TabRestaurant,
  tabAll: TabAll,

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

  // ── 식당 지도 (30) ──
  /*
    AI 표면(검색·상담·진단·추천)이 공유하는 반짝임. **두 톤 채움이고 색이 파일에 박혀 있다**
    — 브랜드 #FE7139 + 보조 #FF9200. 그래서 `color` prop 은 이 아이콘에 아무 영향이 없다
    (currentColor 를 쓰지 않는다). 톤을 바꾸려면 svg 를 고친다.
  */
  sparkle: IconSparkle,
  sparkleMono: IconSparkleMono, // 브랜드 fill CTA에서 foreground(currentColor)를 따른다
  bookmark: IconBookmark,
  bookmarkFilled: IconBookmarkFilled, // 저장 상태는 색이 아니라 면으로 구분한다
  crosshair: IconCrosshair, // 내 위치 FAB (legacy spot.svg)
  refresh: IconRefresh, // '현재 지도에서 찾기' (legacy reset.svg)
  clock: IconClock, // 영업시간 (legacy history.svg)
  mapPin: IconMapPin, // 주소 행 (legacy location.svg, mask 제거)
  phone: IconPhone,
  share: IconShare,
  star: IconStar,
  starFilled: IconStarFilled,
  link: IconLink,
  copy: IconCopy,
  chevronRight: IconChevronRight,
  chevronDown: IconChevronDown, // 정렬 칩의 캐럿 — `▾` 텍스트 글리프를 대체한다
  trash: IconTrash, // 필터 선택 트레이 전체 해제
  filter: IconFilter,
  gallery: IconGallery, // 미디어 피커
  playCircle: IconPlayCircle, // 영상 썸네일 배지
  profile: IconProfile, // 아바타 자리표시
  reservation: IconReservation,
  restroom: IconRestroom,
  wifi: IconWifi,
  groupSeat: IconGroupSeat,
  babyChair: IconBabyChair,
  privateRoom: IconPrivateRoom,
  parking: IconParking,
  instagram: IconInstagram,
  youtube: IconYoutube,
  blog: IconBlog,

  // ── 커뮤니티 재디자인 (6) ──
  /** 가로 점 3개(⋯). 24 박스, 점 ⌀2.67, 중심 간격 4.67 → 잉크 12.0×2.67 (§4-G1) */
  more: IconMore,
  /** 민 하트(좋아요 켜짐). `heart` 는 하트+플러스라 커뮤니티에 못 쓴다 (§4-G19) */
  heartFilled: IconHeartFilled,
  /** 민 하트 윤곽(좋아요 꺼짐). `heartFilled` 와 같은 컨투어 (§4-G19) */
  heartOutline: IconHeartOutline,
  /** 말풍선 윤곽. `chat` 과 같은 컨투어의 선 변형 (§4-G19) */
  chatOutline: IconChatOutline,
  /** 전송(컴포저 원형 버튼). `arrowBack` 을 90° 돌린 글리프 (§4-G20) */
  arrowUp: IconArrowUp,
  /** 채운 사람 글리프 — 아바타 자리표시. `profile` 은 선이라 시안과 다르다 (§4-G12) */
  profileFilled: IconProfileFilled,
} satisfies Record<string, React.FC<SvgProps>>

export type V2IconName = keyof typeof iconRegistry
export const iconNames = Object.keys(iconRegistry) as V2IconName[]
