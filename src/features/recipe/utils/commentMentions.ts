/**
 * 댓글 멘션(@닉네임) 파싱. 서버가 멘션 목록을 따로 들고 있으므로
 * 본문에서 "무엇이 멘션인지"를 추측하지 않고, 알려진 닉네임만 대조한다.
 */

export interface MentionQuery {
  /** 입력 중인 '@' 의 위치 */
  start: number
  /** 커서 위치(검색어 끝) */
  end: number
  /** '@' 뒤에 입력된 검색어 */
  query: string
}

/**
 * 커서 앞에서 입력 중인 멘션 토큰을 찾는다.
 * '@' 는 문장 처음이거나 공백 뒤에 있어야 하고, 검색어에 공백이 들어가면 종료된다.
 */
export function findMentionQuery(
  text: string,
  cursor: number,
): MentionQuery | null {
  if (cursor < 0 || cursor > text.length) return null

  for (let index = cursor - 1; index >= 0; index -= 1) {
    const char = text[index]
    if (/\s/.test(char)) return null
    if (char !== "@") continue

    const prev = index > 0 ? text[index - 1] : ""
    // 이메일(a@b)처럼 앞에 글자가 붙어 있으면 멘션이 아니다.
    if (prev && !/\s/.test(prev)) return null

    return { start: index, end: cursor, query: text.slice(index + 1, cursor) }
  }
  return null
}

/** 입력 중인 토큰을 완성된 '@닉네임 ' 으로 바꾼다. */
export function applyMention(
  text: string,
  mentionQuery: MentionQuery,
  nickName: string,
): { text: string; cursor: number } {
  const inserted = `@${nickName} `
  const next =
    text.slice(0, mentionQuery.start) + inserted + text.slice(mentionQuery.end)
  return { text: next, cursor: mentionQuery.start + inserted.length }
}

/**
 * 본문에 실제로 남아 있는 멘션만 추린다.
 * 태그해 놓고 '@닉네임' 을 지웠다면 서버에도 보내지 않는다.
 */
export function retainedMentions(text: string, candidates: string[]): string[] {
  const seen = new Set<string>()
  return candidates.filter((name) => {
    if (seen.has(name) || !text.includes(`@${name}`)) return false
    seen.add(name)
    return true
  })
}

/** 태그를 뗄 때 본문의 '@닉네임'도 같이 지운다 — 둘이 어긋나면 안 된다. */
export function removeMention(text: string, nickName: string): string {
  return text
    .split(`@${nickName} `)
    .join("")
    .split(`@${nickName}`)
    .join("")
    .replace(/ {2,}/g, " ")
    .trim()
}

export interface MentionSegment {
  text: string
  isMention: boolean
}

/** 렌더용 분할 — 긴 닉네임부터 맞춰 '@민지'가 '@민지현'을 잘라먹지 않게 한다. */
export function splitMentionSegments(
  text: string,
  mentions: string[],
): MentionSegment[] {
  if (mentions.length === 0) return [{ text, isMention: false }]

  const ordered = [...new Set(mentions)].sort((a, b) => b.length - a.length)
  const segments: MentionSegment[] = []
  let plainStart = 0
  let index = 0

  while (index < text.length) {
    if (text[index] === "@") {
      const matched = ordered.find((name) => text.startsWith(`@${name}`, index))
      if (matched) {
        if (index > plainStart) {
          segments.push({
            text: text.slice(plainStart, index),
            isMention: false,
          })
        }
        segments.push({ text: `@${matched}`, isMention: true })
        index += matched.length + 1
        plainStart = index
        continue
      }
    }
    index += 1
  }

  if (plainStart < text.length) {
    segments.push({ text: text.slice(plainStart), isMention: false })
  }
  return segments
}
