import {
  applyMention,
  findMentionQuery,
  removeMention,
  retainedMentions,
  splitMentionSegments,
} from "@/src/features/recipe/utils/commentMentions"

describe("findMentionQuery", () => {
  it("커서 앞에서 입력 중인 멘션 토큰을 찾는다", () => {
    const text = "안녕하세요 @민"
    expect(findMentionQuery(text, text.length)).toEqual({
      start: 6,
      end: 8,
      query: "민",
    })
  })

  it("'@' 만 쳐도 전체 목록을 띄우도록 빈 검색어를 돌려준다", () => {
    expect(findMentionQuery("@", 1)).toEqual({ start: 0, end: 1, query: "" })
  })

  it("검색어에 공백이 들어가면 토큰이 끝난다", () => {
    expect(findMentionQuery("@민지 안녕", 6)).toBeNull()
  })

  it("이메일처럼 앞에 글자가 붙은 '@' 는 멘션이 아니다", () => {
    expect(findMentionQuery("me@mail", 7)).toBeNull()
  })

  it("커서 뒤의 '@' 는 보지 않는다", () => {
    expect(findMentionQuery("안녕 @민지", 2)).toBeNull()
  })
})

describe("applyMention", () => {
  it("입력 중인 토큰을 완성된 멘션으로 바꾸고 커서를 뒤로 보낸다", () => {
    const text = "@민 고마워요"
    const query = findMentionQuery("@민", 2)!
    expect(applyMention(text, query, "민지")).toEqual({
      text: "@민지  고마워요",
      cursor: 4,
    })
  })
})

describe("removeMention", () => {
  it("본문에서 멘션 토큰과 뒤따르는 공백까지 지운다", () => {
    expect(removeMention("@민지 고마워요", "민지")).toBe("고마워요")
  })

  it("여러 번 언급했어도 모두 지운다", () => {
    expect(removeMention("@민지 안녕 @민지", "민지")).toBe("안녕")
  })

  it("다른 사람 멘션은 건드리지 않는다", () => {
    expect(removeMention("@민지 @수민 안녕", "민지")).toBe("@수민 안녕")
  })
})

describe("retainedMentions", () => {
  it("본문에서 지운 멘션은 빠진다", () => {
    expect(retainedMentions("@민지 안녕", ["민지", "수민"])).toEqual(["민지"])
  })

  it("중복은 한 번만 남는다", () => {
    expect(retainedMentions("@민지 @민지", ["민지", "민지"])).toEqual(["민지"])
  })
})

describe("splitMentionSegments", () => {
  it("멘션과 일반 텍스트를 나눈다", () => {
    expect(splitMentionSegments("@민지 고마워요", ["민지"])).toEqual([
      { text: "@민지", isMention: true },
      { text: " 고마워요", isMention: false },
    ])
  })

  it("긴 닉네임을 먼저 맞춰 짧은 닉네임이 잘라먹지 않게 한다", () => {
    expect(splitMentionSegments("@민지현 님", ["민지", "민지현"])).toEqual([
      { text: "@민지현", isMention: true },
      { text: " 님", isMention: false },
    ])
  })

  it("멘션이 없으면 통짜 텍스트 하나다", () => {
    expect(splitMentionSegments("그냥 댓글", [])).toEqual([
      { text: "그냥 댓글", isMention: false },
    ])
  })

  it("목록에 없는 '@문자열'은 일반 텍스트로 남는다", () => {
    expect(splitMentionSegments("@없는사람 안녕", ["민지"])).toEqual([
      { text: "@없는사람 안녕", isMention: false },
    ])
  })
})
