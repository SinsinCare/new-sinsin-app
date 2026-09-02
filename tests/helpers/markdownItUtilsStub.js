/**
 * `markdown-it/lib/common/utils.mjs` 의 대역. 그 파일은 ESM 전용 `mdurl`·`uc.micro` 를
 * import 해서 jest 의 CJS 런타임이 읽지 못한다. CJS 빌드가 같은 헬퍼를 `utils` 로
 * 내보내므로 그것을 그대로 돌려준다 — `markdown-it-cjk-friendly` 가 쓰는
 * `isMdAsciiPunct` · `isPunctChar` · `isWhiteSpace` 가 여기 다 있다. (jest.config.ts)
 */
const MarkdownIt = require("markdown-it")

module.exports = new MarkdownIt().utils
