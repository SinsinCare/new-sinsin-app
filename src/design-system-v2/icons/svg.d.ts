// react-native-svg-transformer: `import Icon from "./x.svg"` → SVG React 컴포넌트.
declare module "*.svg" {
  import type React from "react"
  import type { SvgProps } from "react-native-svg"
  const content: React.FC<SvgProps>
  export default content
}
