/**
 * **비교용 소문자화에 기기 로케일이 끼면 안 된다.**
 *
 * 인자 없는 `toLocaleLowerCase()` 는 실행 기기의 로케일을 쓴다. 터키어·아제르바이잔어
 * 기기에서는 `I` 가 점 없는 `ı` 로 접혀서, **그 기기 사용자만** 다른 결과를 본다.
 * 화면에는 아무 예외도 안 뜨고, 재현하려면 기기 언어를 바꿔야 해서 버그 신고도
 * "가끔 안 돼요" 로만 온다.
 *
 * 처음 걸린 자리는 태그였다(`communityTags.test.ts` 의 T5). 같은 기법으로 같은 부류를
 * 두 자리 더 못 박는다 — 그 기법이란 `String.prototype.toLocaleLowerCase` 를 `tr` 로
 * 바꿔 끼워 **터키어 기기를 흉내 내는 것**이다. 고쳐진 코드는 `toLowerCase()` 를 쓰므로
 * 이 흉내에 영향을 받지 않는다. 되돌아가면 여기서 빨간불이 난다.
 *
 *  1. **투표 항목 중복**(`voteOptions.ts`) — 서버 `normalizePollOptions` 와 갈리면
 *     글이 다 올라간 뒤에 400 이 나거나(느슨할 때), 서로 다른 항목에 "같은 항목이 두 번
 *     있어요" 가 뜬 채 완료가 죽는다(빡셀 때).
 *  2. **의학 참고 자료 검색**(`referenceSearch.ts`) — 코퍼스만 `kdıgo` 로 접혀서
 *     `kdigo` 를 쳐도 목록이 통째로 빈다.
 *
 * 마지막에 **저장소 전체**를 훑는다. 두 자리를 고쳐도 다음 사람이 새로 쓰면 그만이라,
 * 이 부류가 다시 들어오는 것 자체를 막는 쪽이 본체다.
 */
import fs from "node:fs"
import path from "node:path"

import { hasDuplicateVoteOptions } from "@/src/features/recipe/utils/voteOptions"
import { matchesReferenceQuery } from "@/src/features/settings/utils/referenceSearch"

const ROOT = path.join(__dirname, "..")

describe("로케일 독립 소문자화 — 터키어 기기 흉내", () => {
  const original = String.prototype.toLocaleLowerCase

  beforeEach(() => {
    // 기법은 `communityTags.test.ts` 에서 그대로 가져왔다: 인자 없는 호출만 `tr` 로
    // 돌린다. 그 기기에서 `"DIET".toLocaleLowerCase()` 는 점 없는 `ı` 를 낸다.
    ;(String.prototype as { toLocaleLowerCase: unknown }).toLocaleLowerCase =
      function (this: string, ...args: unknown[]): string {
        return args.length === 0
          ? original.call(this, "tr")
          : original.call(this, args[0] as string)
      }
  })

  afterEach(() => {
    ;(String.prototype as { toLocaleLowerCase: unknown }).toLocaleLowerCase =
      original
  })

  it("흉내가 실제로 걸려 있는지부터 본다", () => {
    expect("DIET".toLocaleLowerCase()).toBe("dıet")
    // `toLowerCase()` 는 어느 기기에서도 흔들리지 않는다 — 고친 코드가 기대는 성질.
    expect("DIET".toLowerCase()).toBe("diet")
  })

  describe("투표 항목 중복 (VoteSheet)", () => {
    it("터키어 기기에서도 `DIET` 와 `diet` 는 같은 항목이다", () => {
      // 여기서 `false` 가 나오면 완료가 눌리고, 사진까지 다 올라간 뒤에 서버가
      // "중복된 투표 항목이 있습니다" 로 400 을 낸다.
      expect(hasDuplicateVoteOptions(["DIET", "diet"])).toBe(true)
      expect(hasDuplicateVoteOptions(["저염식", "DIET", "Diet"])).toBe(true)
    })

    it("터키어 대문자 `İ` 는 서버와 같이 **다른** 항목으로 둔다", () => {
      // 서버도 `toLowerCase()` 라 `"İ"` 는 `i` + 결합 점(U+0307)이 된다 — `diet` 와
      // 다르다. 기기 로케일을 타면 여기서만 `diet` 로 접혀, 서버가 받아 줄 투표를
      // 앱이 "같은 항목이 두 번 있어요" 로 막는다.
      expect(hasDuplicateVoteOptions(["DİET", "diet"])).toBe(false)
    })

    it("서로 다른 항목·빈 항목은 중복이 아니다", () => {
      expect(hasDuplicateVoteOptions(["저염식", "고단백"])).toBe(false)
      expect(hasDuplicateVoteOptions(["저염식", "  ", "", "고단백"])).toBe(
        false,
      )
      // 공백만 다른 것은 같은 항목이다(서버도 `trim()` 뒤에 본다).
      expect(hasDuplicateVoteOptions(["저염식", " 저염식 "])).toBe(true)
    })
  })

  describe("의학 참고 자료 검색 (MedicalReferenceScreen)", () => {
    // 실제 코퍼스에 있는 문구다(`i18n/locales/en/settings.json`).
    const item = { title: "KDIGO Guidelines", meta: "KDIGO · English" }

    it("터키어 기기에서도 `kdigo` 로 `KDIGO` 가 잡힌다", () => {
      expect(matchesReferenceQuery(item, "kdigo")).toBe(true)
      expect(matchesReferenceQuery(item, "KDIGO")).toBe(true)
      expect(matchesReferenceQuery(item, "Guidelines")).toBe(true)
    })

    it("메타 축도 같이 훑는다", () => {
      expect(matchesReferenceQuery(item, "english")).toBe(true)
    })

    it("한글 코퍼스는 어느 기기에서든 그대로다", () => {
      const ko = { title: "KDIGO 2024 진료지침", meta: "대한신장학회 · 한국어" }
      expect(matchesReferenceQuery(ko, "진료")).toBe(true)
      expect(matchesReferenceQuery(ko, "당뇨")).toBe(false)
    })

    it("빈 질의는 전부 통과한다 — 필터가 없는 것과 같다", () => {
      expect(matchesReferenceQuery(item, "")).toBe(true)
    })
  })
})

/* ────────────────────────────────────────────────────────────────────────── */

const collectSources = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectSources(full, out)
    else if (/\.tsx?$/u.test(entry.name) && !entry.name.endsWith(".d.ts"))
      out.push(full)
  }
  return out
}

const SOURCES = ["app", "src"].flatMap((dir) =>
  collectSources(path.join(ROOT, dir)),
)

/** 주석 줄은 세지 않는다 — 왜 쓰면 안 되는지 적어 둔 자리가 이미 여럿이다. */
const isCommentLine = (line: string): boolean =>
  /^\s*(\/\/|\/\*|\*)/u.test(line)

/** 인자 **없는** 호출만 잡는다. `toLocaleLowerCase("tr")` 은 의도한 것이므로 통과. */
const BARE_LOCALE_CASING = /\.toLocale(?:Lower|Upper)Case\(\s*\)/u

describe("로케일 독립 소문자화 — 저장소 전체", () => {
  it("앱 코드에 인자 없는 `toLocale*Case()` 가 없다", () => {
    const offenders = SOURCES.flatMap((file) =>
      fs
        .readFileSync(file, "utf8")
        .split("\n")
        .map((line, index) => ({ line, index }))
        .filter(
          ({ line }) => !isCommentLine(line) && BARE_LOCALE_CASING.test(line),
        )
        .map(({ index }) => `${path.relative(ROOT, file)}:${index + 1}`),
    )
    // 비교·매칭에 기기 로케일이 끼면 그 기기 사용자만 다른 앱을 쓰게 된다.
    // 표시용으로 정말 필요하면 로케일을 **명시**해서 부르면 이 검사를 통과한다.
    expect(offenders).toEqual([])
  })
})

describe("두 화면이 규칙 모듈을 실제로 쓴다", () => {
  // 값이 같은지가 아니라 **자기 판정을 다시 만들지 않았는지**를 본다
  // (`bottomSafeArea.test.ts` 와 같은 이유의 같은 검사).
  it("VoteSheet 은 중복 판정을 다시 만들지 않는다", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "src/features/recipe/components/VoteSheet.tsx"),
      "utf8",
    )
    expect(source).toContain("hasDuplicateVoteOptions")
    expect(source).not.toMatch(/new Set\(filledOptions/u)
  })

  it("MedicalReferenceScreen 은 매칭 규칙을 다시 만들지 않는다", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "src/features/settings/views/MedicalReferenceScreen.tsx"),
      "utf8",
    )
    expect(source).toContain("matchesReferenceQuery")
    expect(source).not.toMatch(/\.includes\(searchQuery/u)
  })
})
