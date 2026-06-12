/**
 * 공용 컴포넌트 카탈로그 메타데이터 (수동 관리).
 *
 * styled() variants가 raw hex(tokens.color.x.val)와 테마 문자열("$danger")을
 * 혼용하고 있어 자동 추출이 불가능하므로 여기서 직접 기술합니다.
 * preview 값은 가능한 한 tokens/themes에서 파생시켜 토큰 변경 시
 * `npm run design:export` 재실행만으로 카탈로그에 전파되게 합니다.
 *
 * export.ts가 각 variant 이름이 실제 소스에 존재하는지 검증하므로
 * 컴포넌트의 variant를 변경하면 이 파일도 함께 갱신해야 합니다.
 */
import { tokens } from "../../src/theme/tokens"
import { lightTheme, darkTheme } from "../../src/theme/themes"

const c = tokens.color
const light = lightTheme
const dark = darkTheme

const val = (token: { val: string | number } | string | number): string =>
  typeof token === "object" ? String(token.val) : String(token)

export interface ThemedPreview {
  light: Record<string, string | number>
  dark: Record<string, string | number>
}

export interface VariantValueMeta {
  name: string
  description?: string
  preview?: ThemedPreview | Record<string, string | number>
  tokensUsed?: string[]
}

export interface VariantAxisMeta {
  axis: string
  default?: string
  values: VariantValueMeta[]
}

export interface PropMeta {
  name: string
  type: string
  default?: string
  required: boolean
  description?: string
}

export interface ExampleMeta {
  title: string
  code: string
}

export interface ComponentMeta {
  id: string
  name: string
  category: "actions" | "inputs" | "display" | "layout" | "feedback" | "overlay"
  filePath: string
  description: string
  previewable: boolean
  variants?: VariantAxisMeta[]
  props: PropMeta[]
  tokensUsed?: string[]
  examples?: ExampleMeta[]
  notes?: string[]
}

export const componentsMeta: ComponentMeta[] = [
  {
    id: "component.button",
    name: "Button",
    category: "actions",
    filePath: "src/shared/components/Button.tsx",
    description: "기본 액션 버튼. 로딩 스피너와 비활성 상태를 지원한다.",
    previewable: true,
    variants: [
      {
        axis: "variant",
        default: "primary",
        values: [
          {
            name: "primary",
            preview: {
              light: { bg: val(c.sub6), fg: "#FFFFFF" },
              dark: { bg: val(c.sub6), fg: "#FFFFFF" },
            },
            tokensUsed: ["color.sub6"],
          },
          {
            name: "secondary",
            preview: {
              light: { bg: val(light.secondary), fg: "#FFFFFF" },
              dark: { bg: val(dark.secondary), fg: "#FFFFFF" },
            },
            tokensUsed: ["theme.secondary"],
          },
          {
            name: "outline",
            preview: {
              light: {
                bg: "transparent",
                fg: val(light.primary),
                border: val(light.primary),
                borderWidth: 1,
              },
              dark: {
                bg: "transparent",
                fg: val(dark.primary),
                border: val(dark.primary),
                borderWidth: 1,
              },
            },
            tokensUsed: ["theme.primary"],
          },
          {
            name: "ghost",
            preview: {
              light: { bg: "transparent", fg: val(light.primary) },
              dark: { bg: "transparent", fg: val(dark.primary) },
            },
            tokensUsed: ["theme.primary"],
          },
          {
            name: "danger",
            preview: {
              light: { bg: val(light.danger), fg: "#FFFFFF" },
              dark: { bg: val(dark.danger), fg: "#FFFFFF" },
            },
            tokensUsed: ["theme.danger"],
          },
        ],
      },
      {
        axis: "buttonSize",
        default: "medium",
        values: [
          {
            name: "small",
            preview: { height: 36, paddingX: Number(tokens.space[3].val) },
            tokensUsed: ["space.3"],
          },
          {
            name: "medium",
            preview: { height: 48, paddingX: Number(tokens.space[4].val) },
            tokensUsed: ["space.4"],
          },
          {
            name: "large",
            preview: { height: 56, paddingX: Number(tokens.space[5].val) },
            tokensUsed: ["space.5"],
          },
        ],
      },
    ],
    props: [
      { name: "children", type: "ReactNode", required: true },
      {
        name: "variant",
        type: '"primary" | "secondary" | "outline" | "ghost" | "danger"',
        default: "primary",
        required: false,
      },
      {
        name: "buttonSize",
        type: '"small" | "medium" | "large"',
        default: "medium",
        required: false,
      },
      { name: "fullWidth", type: "boolean", default: "false", required: false },
      {
        name: "loading",
        type: "boolean",
        default: "false",
        required: false,
        description: "true면 스피너 표시 + 비활성화",
      },
      { name: "disabled", type: "boolean", default: "false", required: false },
      { name: "onPress", type: "() => void", required: false },
      { name: "flex", type: "number", required: false },
    ],
    tokensUsed: [
      "color.sub6",
      "radius.3",
      "space.3",
      "space.4",
      "space.5",
      "theme.primary",
      "theme.secondary",
      "theme.danger",
    ],
    examples: [
      {
        title: "기본",
        code: '<Button variant="primary" onPress={handleSave}>저장</Button>',
      },
      {
        title: "로딩 + 전체 너비",
        code: '<Button variant="danger" fullWidth loading={isPending}>탈퇴하기</Button>',
      },
    ],
    notes: [
      '내부 라벨 Text가 color="white"로 고정되어 있어 outline/ghost variant의 선언 색($primary)과 실제 라벨 색이 다르다 (앱 코드의 알려진 불일치).',
    ],
  },
  {
    id: "component.text-field",
    name: "TextField",
    category: "inputs",
    filePath: "src/shared/components/TextField.tsx",
    description:
      "라벨·에러·헬퍼 텍스트를 갖춘 기본 입력 필드. 포커스 시 라벨과 보더가 primary로 강조된다.",
    previewable: true,
    variants: [
      {
        axis: "state",
        default: "default",
        values: [
          {
            name: "default",
            preview: {
              light: {
                bg: val(light.cardBackground),
                border: val(light.borderColor),
                fg: val(light.color),
                height: 48,
              },
              dark: {
                bg: val(dark.cardBackground),
                border: val(dark.borderColor),
                fg: val(dark.color),
                height: 48,
              },
            },
            tokensUsed: ["theme.cardBackground", "theme.borderColor"],
          },
          {
            name: "focus",
            description: "focusStyle: 보더 $primary, 두께 2",
            preview: {
              light: {
                bg: val(light.cardBackground),
                border: val(light.primary),
                borderWidth: 2,
                height: 48,
              },
              dark: {
                bg: val(dark.cardBackground),
                border: val(dark.primary),
                borderWidth: 2,
                height: 48,
              },
            },
            tokensUsed: ["theme.primary"],
          },
          {
            name: "error",
            preview: {
              light: {
                bg: val(light.cardBackground),
                border: val(light.danger),
                fg: val(light.danger),
                height: 48,
              },
              dark: {
                bg: val(dark.cardBackground),
                border: val(dark.danger),
                fg: val(dark.danger),
                height: 48,
              },
            },
            tokensUsed: ["theme.danger"],
          },
        ],
      },
    ],
    props: [
      { name: "label", type: "string", required: false },
      {
        name: "error",
        type: "string",
        required: false,
        description: "있으면 에러 상태 + 메시지 표시",
      },
      { name: "helper", type: "string", required: false },
      {
        name: "...InputProps",
        type: 'Omit<InputProps, "size">',
        required: false,
        description: "Tamagui Input props 전달",
      },
    ],
    tokensUsed: [
      "radius.3",
      "space.3",
      "space.1.5",
      "theme.cardBackground",
      "theme.borderColor",
      "theme.primary",
      "theme.danger",
      "theme.colorSubtle",
    ],
    examples: [
      {
        title: "기본",
        code: '<TextField label="이메일" placeholder="email@example.com" />',
      },
      {
        title: "에러",
        code: '<TextField label="비밀번호" error="8자 이상 입력해주세요" />',
      },
    ],
  },
  {
    id: "component.form-text-field",
    name: "FormTextField",
    category: "inputs",
    filePath: "src/shared/components/FormTextField.tsx",
    description:
      "react-hook-form Controller 통합 입력 필드. 입력 타입 프리셋(email/password/number/phone), 클리어 버튼, 비밀번호 표시 토글, 유효성 상태 색상을 지원한다.",
    previewable: true,
    variants: [
      {
        axis: "validationState",
        default: "default",
        values: [
          {
            name: "default",
            preview: {
              light: {
                bg: "#FFFFFF",
                border: val(light.borderColor),
                height: 52,
                radius: 8,
              },
              dark: {
                bg: "#2A2A32",
                border: val(dark.borderColor),
                height: 52,
                radius: 8,
              },
            },
            tokensUsed: ["theme.borderColor"],
          },
          {
            name: "focused",
            preview: {
              light: {
                bg: "#FFFFFF",
                border: val(light.primary),
                height: 52,
                radius: 8,
              },
              dark: {
                bg: "#2A2A32",
                border: val(dark.primary),
                height: 52,
                radius: 8,
              },
            },
            tokensUsed: ["theme.primary"],
          },
          {
            name: "valid",
            preview: {
              light: {
                bg: "#FFFFFF",
                border: val(c.sub6),
                height: 52,
                radius: 8,
              },
              dark: {
                bg: "#2A2A32",
                border: val(c.sub6),
                height: 52,
                radius: 8,
              },
            },
            tokensUsed: ["color.sub6"],
          },
          {
            name: "invalid",
            preview: {
              light: {
                bg: "#FFFFFF",
                border: val(light.danger),
                height: 52,
                radius: 8,
              },
              dark: {
                bg: "#2A2A32",
                border: val(dark.danger),
                height: 52,
                radius: 8,
              },
            },
            tokensUsed: ["theme.danger"],
          },
        ],
      },
    ],
    props: [
      { name: "name", type: "Path<T>", required: true },
      { name: "control", type: "Control<T>", required: true },
      { name: "rules", type: "RegisterOptions<T>", required: false },
      { name: "label", type: "string", required: false },
      { name: "placeholder", type: "string", required: false },
      {
        name: "inputType",
        type: '"text" | "email" | "password" | "number" | "phone"',
        default: "text",
        required: false,
        description: "키보드 타입·자동 대문자·secure 입력 프리셋",
      },
      { name: "clearable", type: "boolean", default: "true", required: false },
      { name: "autoFocus", type: "boolean", default: "false", required: false },
      { name: "maxLength", type: "number", required: false },
      {
        name: "showPasswordToggle",
        type: "boolean",
        default: "false",
        required: false,
      },
      {
        name: "showValidState",
        type: "boolean",
        default: "false",
        required: false,
        description: "true면 유효 시 보더가 sub6로",
      },
    ],
    tokensUsed: [
      "color.sub6",
      "color.grey5",
      "theme.primary",
      "theme.danger",
      "theme.borderColor",
    ],
    examples: [
      {
        title: "비밀번호",
        code: '<FormTextField name="password" control={control} label="비밀번호" inputType="password" showPasswordToggle />',
      },
    ],
    notes: ["다크 모드 배경 #2A2A32는 토큰이 아닌 리터럴 값."],
  },
  {
    id: "component.chip",
    name: "Chip",
    category: "display",
    filePath: "src/shared/components/Chip.tsx",
    description:
      "아이콘 + 라벨의 pill 형태 선택 칩. 선택 상태에 따라 색이 바뀐다.",
    previewable: true,
    variants: [
      {
        axis: "isSelected",
        default: "false",
        values: [
          {
            name: "false",
            description: "기본 상태",
            preview: {
              light: { bg: val(c.borderLight), fg: "#3C3C43" },
              dark: { bg: val(c.cardBgDark), fg: val(c.textDarkSub) },
            },
            tokensUsed: [
              "color.borderLight",
              "color.cardBgDark",
              "color.textDarkSub",
            ],
          },
          {
            name: "true",
            description: "선택 상태",
            preview: {
              light: { bg: "#0D896C", fg: "#FFFFFF" },
              dark: { bg: "#42AF94", fg: val(c.inputBgDark) },
            },
            tokensUsed: ["color.inputBgDark"],
          },
        ],
      },
    ],
    props: [
      { name: "icon", type: "IconName", required: false },
      { name: "label", type: "string", required: true },
      {
        name: "isSelected",
        type: "boolean",
        default: "false",
        required: false,
      },
      { name: "onPress", type: "() => void", required: false },
    ],
    tokensUsed: [
      "color.borderLight",
      "color.cardBgDark",
      "color.textDarkSub",
      "color.inputBgDark",
      "radius.12",
      "space.3",
      "space.2",
      "space.1.5",
    ],
    examples: [
      {
        title: "기본",
        code: '<Chip icon="filter" label="저염식" isSelected onPress={toggle} />',
      },
    ],
    notes: [
      "선택 배경색 #0D896C(light)·#42AF94(dark)와 기본 텍스트 #3C3C43(light)은 tokens.ts에 없는 리터럴 hex (Chip.tsx 로컬 COLORS 상수).",
    ],
  },
  {
    id: "component.glassmorphic-card",
    name: "GlassmorphicCard",
    category: "layout",
    filePath: "src/shared/components/GlassmorphicCard.tsx",
    description:
      "글래스모픽 스타일의 섹션 컨테이너 카드. 화면의 섹션 단위 래퍼로 사용한다.",
    previewable: true,
    variants: [
      {
        axis: "variant",
        default: "default",
        values: [
          {
            name: "default",
            preview: {
              light: {
                bg: val(light.cardBackground),
                border: "rgba(255, 255, 255, 0.2)",
                shadow: "0 2px 8px rgba(0,0,0,0.10)",
              },
              dark: {
                bg: val(dark.cardBackground),
                border: "rgba(255, 255, 255, 0.2)",
                shadow: "0 2px 8px rgba(0,0,0,0.10)",
              },
            },
          },
          {
            name: "elevated",
            preview: {
              light: {
                bg: val(light.cardBackground),
                border: "rgba(255, 255, 255, 0.2)",
                shadow: "0 2px 12px rgba(0,0,0,0.15)",
              },
              dark: {
                bg: val(dark.cardBackground),
                border: "rgba(255, 255, 255, 0.2)",
                shadow: "0 2px 12px rgba(0,0,0,0.15)",
              },
            },
          },
          {
            name: "flat",
            preview: {
              light: {
                bg: val(light.cardBackground),
                border: "rgba(255, 255, 255, 0.2)",
                shadow: "none",
              },
              dark: {
                bg: val(dark.cardBackground),
                border: "rgba(255, 255, 255, 0.2)",
                shadow: "none",
              },
            },
          },
        ],
      },
    ],
    props: [
      {
        name: "variant",
        type: '"default" | "elevated" | "flat"',
        default: "default",
        required: false,
      },
      { name: "...YStackProps", type: "YStackProps", required: false },
    ],
    tokensUsed: ["theme.cardBackground", "radius.4", "space.4"],
    examples: [
      {
        title: "섹션 컨테이너",
        code: '<GlassmorphicCard variant="elevated">{children}</GlassmorphicCard>',
      },
    ],
  },
  {
    id: "component.checkbox",
    name: "Checkbox",
    category: "inputs",
    filePath: "src/shared/components/Checkbox.tsx",
    description: "라벨 옵션이 있는 체크박스. 체크 시 sub6(teal)로 채워진다.",
    previewable: true,
    variants: [
      {
        axis: "checked",
        values: [
          {
            name: "false",
            preview: {
              light: { bg: "#FFFFFF", border: "#C5C8CE", size: 22, radius: 4 },
              dark: {
                bg: val(c.cardBgDark),
                border: "#6B7280",
                size: 22,
                radius: 4,
              },
            },
            tokensUsed: ["color.cardBgDark"],
          },
          {
            name: "true",
            preview: {
              light: {
                bg: val(c.sub6),
                border: val(c.sub6),
                fg: "#FFFFFF",
                size: 22,
                radius: 4,
              },
              dark: {
                bg: val(c.sub6),
                border: val(c.sub6),
                fg: "#FFFFFF",
                size: 22,
                radius: 4,
              },
            },
            tokensUsed: ["color.sub6"],
          },
        ],
      },
    ],
    props: [
      { name: "checked", type: "boolean", required: true },
      { name: "onToggle", type: "() => void", required: true },
      { name: "label", type: "string", required: false },
      { name: "size", type: "number", default: "22", required: false },
      { name: "disabled", type: "boolean", default: "false", required: false },
    ],
    tokensUsed: ["color.sub6", "color.cardBgDark", "color.textDark"],
    examples: [
      {
        title: "약관 동의",
        code: '<Checkbox checked={agreed} onToggle={toggleAgreed} label="이용약관에 동의합니다" />',
      },
    ],
    notes: [
      "미체크 보더 #C5C8CE(light)·#6B7280(dark), 라벨 #3F444F(light)는 토큰 외 리터럴.",
    ],
  },
  {
    id: "component.toast",
    name: "Toast",
    category: "feedback",
    filePath: "src/shared/components/Toast.tsx",
    description:
      "react-native-toast-message 기반 전역 토스트. error/success/info 타입별 색상 프리셋.",
    previewable: true,
    variants: [
      {
        axis: "type",
        values: [
          {
            name: "error",
            preview: {
              light: { bg: val(c.primary1), fg: val(c.primary8) },
              dark: { bg: val(c.primary1), fg: val(c.primary8) },
            },
            tokensUsed: ["color.primary1", "color.primary8"],
          },
          {
            name: "success",
            preview: {
              light: { bg: val(c.sub1), fg: val(c.sub8) },
              dark: { bg: val(c.sub1), fg: val(c.sub8) },
            },
            tokensUsed: ["color.sub1", "color.sub8"],
          },
          {
            name: "info",
            preview: {
              light: { bg: val(c.grey8), fg: val(c.grey2) },
              dark: { bg: val(c.grey8), fg: val(c.grey2) },
            },
            tokensUsed: ["color.grey8", "color.grey2"],
          },
        ],
      },
    ],
    props: [],
    tokensUsed: [
      "color.primary1",
      "color.primary8",
      "color.sub1",
      "color.sub8",
      "color.grey8",
      "color.grey2",
      "radius.3",
      "space.4",
      "space.3",
    ],
    examples: [
      { title: "루트에 마운트", code: "<Toast />" },
      {
        title: "호출",
        code: 'Toast.show({ type: "success", text1: "저장되었습니다" })',
      },
    ],
    notes: ["토스트 색상은 라이트/다크 동일 (테마 미분기)."],
  },
  {
    id: "component.screen-header",
    name: "ScreenHeader",
    category: "layout",
    filePath: "src/shared/components/ScreenHeader.tsx",
    description: "뒤로가기 버튼·타이틀·우측 요소 슬롯을 갖춘 화면 상단 헤더.",
    previewable: false,
    props: [
      { name: "title", type: "string", required: true },
      { name: "paddingTop", type: "number", default: "0", required: false },
      {
        name: "onBack",
        type: "() => void",
        required: false,
        description: "있으면 뒤로가기 chevron 표시",
      },
      { name: "rightElement", type: "ReactNode", required: false },
    ],
    tokensUsed: ["color.textDark"],
  },
  {
    id: "component.icon",
    name: "Icon",
    category: "display",
    filePath: "src/shared/components/Icon.tsx",
    description:
      "assets/icons/의 SVG 65종을 감싸는 아이콘 컴포넌트. SVG가 currentColor를 쓰면 color prop으로 런타임 색상 변경 가능.",
    previewable: false,
    props: [
      { name: "name", type: "IconName (65종)", required: true },
      { name: "size", type: "number", default: "24", required: false },
      {
        name: "color",
        type: "string",
        default: "tokens.color.textLightSub",
        required: false,
      },
      {
        name: "...SvgProps",
        type: 'Omit<SvgProps, "width" | "height">',
        required: false,
      },
    ],
    tokensUsed: ["color.textLightSub"],
  },
  {
    id: "component.error-message",
    name: "ErrorMessage",
    category: "feedback",
    filePath: "src/shared/components/ErrorMessage.tsx",
    description:
      "에러 박스. dangerBackground 배경에 danger 텍스트, 선택적 재시도 버튼.",
    previewable: false,
    props: [
      { name: "message", type: "string", required: true },
      {
        name: "onRetry",
        type: "() => void",
        required: false,
        description: "있으면 '다시 시도' outline 버튼 표시",
      },
    ],
    tokensUsed: [
      "theme.dangerBackground",
      "theme.danger",
      "radius.3",
      "space.4",
      "space.3",
      "space.2",
    ],
  },
  {
    id: "component.loading-screen",
    name: "LoadingScreen",
    category: "feedback",
    filePath: "src/shared/components/LoadingScreen.tsx",
    description: "전체 화면 로딩 상태. primary 스피너 + 메시지.",
    previewable: false,
    props: [
      {
        name: "message",
        type: "string",
        default: '"로딩 중..."',
        required: false,
      },
    ],
    tokensUsed: ["theme.primary", "theme.colorSubtle", "space.4"],
  },
  {
    id: "component.confirm-modal",
    name: "ConfirmModal",
    category: "overlay",
    filePath: "src/shared/components/ConfirmModal.tsx",
    description: "취소/확인 2버튼 확인 모달 (RN Modal 기반).",
    previewable: false,
    props: [
      { name: "visible", type: "boolean", required: true },
      { name: "title", type: "string", required: true },
      { name: "description", type: "string", required: false },
      {
        name: "cancelText",
        type: "string",
        default: '"취소"',
        required: false,
      },
      {
        name: "confirmText",
        type: "string",
        default: '"확인"',
        required: false,
      },
      { name: "onCancel", type: "() => void", required: true },
      { name: "onConfirm", type: "() => void", required: true },
    ],
  },
  {
    id: "component.confirm-exit-modal",
    name: "ConfirmExitModal",
    category: "overlay",
    filePath: "src/shared/components/ConfirmExitModal.tsx",
    description:
      "이탈 확인 모달. 페이드 인/아웃 애니메이션과 다크 모드를 지원한다.",
    previewable: false,
    props: [
      { name: "visible", type: "boolean", required: true },
      { name: "title", type: "string", required: true },
      { name: "description", type: "string", required: true },
      { name: "cancelLabel", type: "string", required: true },
      { name: "confirmLabel", type: "string", required: true },
    ],
  },
  {
    id: "component.app-bottom-sheet",
    name: "AppBottomSheet",
    category: "overlay",
    filePath: "src/shared/components/AppBottomSheet.tsx",
    description:
      "Tamagui Sheet + gesture-handler 기반 공용 바텀시트. 스냅 포인트, 핸들 전용 드래그, 드래그 비활성화를 지원한다.",
    previewable: false,
    props: [
      { name: "visible", type: "boolean", required: true },
      { name: "onClose", type: "() => void", required: true },
      { name: "snapPoints", type: "number[]", required: true },
      { name: "children", type: "ReactNode", required: true },
      {
        name: "initialSnapIndex",
        type: "number",
        default: "0",
        required: false,
      },
      {
        name: "contentContainerStyle",
        type: "StyleProp<ViewStyle>",
        required: false,
      },
      {
        name: "contentBottomPadding",
        type: "boolean",
        default: "true",
        required: false,
      },
      {
        name: "dragHandleOnly",
        type: "boolean",
        default: "false",
        required: false,
      },
      {
        name: "disableDrag",
        type: "boolean",
        default: "false",
        required: false,
      },
    ],
  },
  {
    id: "component.bottom-sheet-picker",
    name: "BottomSheetPicker",
    category: "inputs",
    filePath: "src/shared/components/BottomSheetPicker.tsx",
    description:
      "바텀시트로 옵션을 고르는 셀렉트 입력. 라벨·필수 표시·플레이스홀더 지원.",
    previewable: false,
    props: [
      { name: "label", type: "string", required: false },
      { name: "value", type: "string", required: true },
      {
        name: "options",
        type: "{ label: string; value: string }[]",
        required: true,
      },
      { name: "onSelect", type: "(value: string) => void", required: true },
      {
        name: "placeholder",
        type: "string",
        default: '"선택해주세요"',
        required: false,
      },
      { name: "required", type: "boolean", required: false },
    ],
    tokensUsed: ["color.textDark", "color.textDarkSub", "color.borderDark"],
    notes: ["선택 강조색 #5464F2 등 다수 리터럴 hex 사용 (토큰 외)."],
  },
  {
    id: "component.bottom-action-bar",
    name: "BottomActionBar",
    category: "actions",
    filePath: "src/shared/components/BottomActionBar.tsx",
    description: "화면 하단 고정 CTA 바. 비활성 시 sub6의 35% 투명 배경.",
    previewable: false,
    props: [
      { name: "label", type: "string", required: true },
      { name: "onPress", type: "() => void", required: true },
      { name: "disabled", type: "boolean", default: "false", required: false },
      { name: "paddingBottom", type: "number", default: "16", required: false },
    ],
    tokensUsed: ["color.sub6"],
  },
  {
    id: "component.keyboard-aware-view",
    name: "KeyboardAwareView",
    category: "layout",
    filePath: "src/shared/components/KeyboardAwareView.tsx",
    description:
      "플랫폼별 behavior를 프리셋한 KeyboardAvoidingView 래퍼 (iOS padding / Android height).",
    previewable: false,
    props: [
      { name: "children", type: "ReactNode", required: true },
      {
        name: "iosBehavior",
        type: 'KeyboardAvoidingViewProps["behavior"]',
        default: '"padding"',
        required: false,
      },
      {
        name: "androidBehavior",
        type: 'KeyboardAvoidingViewProps["behavior"]',
        default: '"height"',
        required: false,
      },
      {
        name: "keyboardVerticalOffset",
        type: "number",
        default: "0",
        required: false,
      },
    ],
  },
]
