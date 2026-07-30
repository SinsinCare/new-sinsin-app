import { LAYOUT, MOTION, TYPE } from "@/src/theme/surface"

/**
 * 가입 화면이 쓰는 표면 상수. 값은 전부 theme/surface.ts(구현 시트) 에서 온다 —
 * 여기서 새로 정하지 않는다. 이 파일은 가입 화면에서 쓰는 이름만 정리한다.
 */
export const AUTH_LAYOUT = {
  screenX: LAYOUT.screenX,
  headerHeight: LAYOUT.headerHeight,
  progressHeight: LAYOUT.progressHeight,
  questionTop: LAYOUT.questionTop,
  questionToField: LAYOUT.questionToField,
  fieldHeight: LAYOUT.field.height,
  ctaHeight: LAYOUT.cta.height,
  optionHeight: LAYOUT.field.height,
  radius: {
    field: LAYOUT.field.radius,
    cta: LAYOUT.cta.radius,
    option: LAYOUT.field.radius,
    sheet: LAYOUT.sheet.radius,
    pill: LAYOUT.chip.radius,
    selectCard: LAYOUT.selectCard.radius,
  },
  selectCardSize: LAYOUT.selectCard.size,
} as const

export const AUTH_TYPE = {
  question: TYPE.question,
  subtitle: TYPE.caption,
  label: TYPE.label,
  field: TYPE.value,
  option: TYPE.value,
  helper: TYPE.caption,
  cta: TYPE.cta,
} as const

export const AUTH_MOTION = {
  shift: MOTION.shift,
  duration: MOTION.duration,
  spring: MOTION.spring,
  stagger: 45,
} as const

export {
  getSurfacePalette as getAuthSurfacePalette,
  type SurfacePalette as AuthSurfacePalette,
} from "@/src/theme/surface"
