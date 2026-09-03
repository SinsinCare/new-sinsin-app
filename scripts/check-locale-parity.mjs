// ko/en 로케일의 키 집합과 보간 변수가 같은지 본다 — 문구 교정이 키를 깨뜨리지 않았다는 증거.
import fs from "node:fs"
import path from "node:path"
const root = path.resolve(new URL(".", import.meta.url).pathname, "../src/i18n/locales")
const flat = (o, p = "", out = {}) => { for (const [k, v] of Object.entries(o)) { const key = p ? `${p}.${k}` : k; if (v && typeof v === "object" && !Array.isArray(v)) flat(v, key, out); else out[key] = v } return out }
// 한국어 쪽이 조사·접속사 변수({{conj}} 등)를 더 갖는 것은 허용한다. 영어 변수를 빠뜨린 것만 결함이다.
const varsCover = (koText, enText) => { const k = new Set((String(koText).match(/\{\{[^}]+\}\}/g) ?? [])); return (String(enText).match(/\{\{[^}]+\}\}/g) ?? []).every((v) => k.has(v)) }
const vars = (s) => (String(s).match(/\{\{[^}]+\}\}/g) ?? []).sort().join(",")
let bad = 0
for (const file of fs.readdirSync(path.join(root, "ko"))) {
  const ko = flat(JSON.parse(fs.readFileSync(path.join(root, "ko", file), "utf8")))
  const en = flat(JSON.parse(fs.readFileSync(path.join(root, "en", file), "utf8")))
  for (const k of Object.keys(ko)) if (!(k in en)) { bad++; console.log(`ko-only ${file} ${k}`) }
  // 한국어는 복수형이 없어 `key` 하나만 두고, 영어만 `key_one`/`key_other` 를 갖는 것이 정상이다.
  for (const k of Object.keys(en)) if (!(k in ko) && !(/_(one|other)$/.test(k) && k.replace(/_(one|other)$/, "") in ko)) { bad++; console.log(`en-only ${file} ${k}`) }
  // i18next 의 `_one`/`_zero` 는 영어에서 숫자를 글자로 쓰는 것이 관행(“1 hour”)이라 변수 대조에서 뺀다.
  for (const k of Object.keys(ko)) if (k in en && !/_(one|zero)$/.test(k) && typeof ko[k] === "string" && typeof en[k] === "string" && !varsCover(ko[k], en[k])) { bad++; console.log(`vars ${file} ${k} ko=${vars(ko[k])} en=${vars(en[k])}`) }
}
if (bad) { console.log(`LOCALE-PARITY-FAIL ${bad}`); process.exit(1) }
console.log("LOCALE-PARITY-OK")
