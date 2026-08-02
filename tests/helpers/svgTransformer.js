/**
 * `*.svg` 를 jest 에서 읽을 수 있게 만드는 최소 트랜스포머.
 *
 * 앱은 metro 의 `react-native-svg-transformer` 로 SVG 를 React 컴포넌트로 받는다.
 * jest 에는 그 트랜스포머가 없어서, SVG 를 (전이적으로라도) import 하는 모듈을 들여오면
 * **스위트가 통째로 죽는다** — `.svg` 를 JS 로 파싱하려 들기 때문이다.
 *
 * 자리표시자를 하나로 두지 않고 **파일 이름을 값으로** 돌려주는 이유: 모든 SVG 가 같은
 * 값이 되면 "카테고리마다 다른 그림이 붙어 있는가" 를 검증할 수 없다(같은 그림 두 개를
 * 붙여 놓아도 통과한다). 이름이 값이면 그 검사가 성립한다.
 *
 * 타입 쪽은 `src/types/svg.d.ts`(`declare module "*.svg"`)가 담당하고,
 * `tsconfig.test.json` 의 `include` 에 그 선언 파일이 들어 있어야 한다 — 없으면 TS2307 로
 * 죽는다(실측된 결함이다).
 */
const path = require("path")

module.exports = {
  process(_source, filename) {
    const name = JSON.stringify(path.basename(filename))
    return { code: `module.exports = { __esModule: true, default: ${name} };` }
  },
  // 파일 내용이 아니라 파일 이름만 쓰므로 캐시 키는 이름으로 충분하다.
  getCacheKey(_source, filename) {
    return `svg-name:${path.basename(filename)}`
  },
}
