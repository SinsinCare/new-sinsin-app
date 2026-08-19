/**
 * 명령형 다이얼로그(`showConfirm`/`showAlert`/`showActionSheet`)의 **라우팅 계약**을 고정한다.
 *
 * ## 실측된 결함 — 확인창이 두 개 떴다 (2026-08-19)
 *
 * 식사 결과의 `아직 이 식사를 저장하지 않았어요.` 가 **두 장 겹쳐** 뜨는 제보가 있었다.
 *
 * 원인은 문구도 애니메이션도 아니고 **호스트 개수**다:
 *
 *   `RecordView` 는 `FoodAnalysisResult` 를 **세 번** 세운다(fresh · saved · recovered).
 *   그 컴포넌트는 안쪽에 `<ModalOverlayHost/>`(= `V2DialogHost`)를 하나씩 들고 있는데,
 *   조기 반환 조건이 `if (!displayResult) return null` 뿐이라 **`open` 을 보지 않는다.**
 *   즉 결과 데이터가 남아 있으면 **닫힌 인스턴스도 호스트를 등록한 채로 산다.**
 *
 *   신규 분석을 한 번 하고(=`analysisResult` 가 남는다) 저장된 기록을 열면 호스트가
 *   둘이 되고, `showConfirm` 이 한 번 불려도 화면에는 두 장이 뜬다.
 *
 * ## 왜 이런 검사인가
 *
 * `dialog.ts` 의 계약은 **"마지막에 등록된 호스트 하나만 답한다"** 이다. 이 성질이
 * 깨져도 타입·린트·컴포넌트 테스트는 전부 통과한다 — 호스트가 몇 개인지는 런타임
 * 마운트 상태이기 때문이다. 그래서 레지스트리 동작을 직접 시험한다.
 *
 * 호스트를 **하나로 줄이는 것**(화면 쪽 수정)과 별개로, 레지스트리 자신이
 * "여러 개가 붙어도 하나만 답한다" 를 지켜야 같은 사고가 다른 화면에서 안 난다.
 */

import {
  registerDialogHost,
  showActionSheet,
  showConfirm,
  type DialogRequest,
  type DialogResult,
} from "@/src/lib/dialog"

/** 호스트 하나를 흉내 낸다. 받은 요청을 기록하고 지정한 답을 돌려준다. */
function fakeHost(log: DialogRequest[], answer: DialogResult) {
  return registerDialogHost((request) => {
    log.push(request)
    return Promise.resolve(answer)
  })
}

describe("dialog 라우팅 — 호스트가 여러 개여도 하나만 답한다", () => {
  it("마지막에 등록된 호스트만 요청을 받는다", async () => {
    const first: DialogRequest[] = []
    const second: DialogRequest[] = []
    const unregisterFirst = fakeHost(first, 0)
    const unregisterSecond = fakeHost(second, 0)

    await showConfirm({ title: "저장하지 않고 나갈까요?" })

    // 두 장이 뜨던 결함의 핵심: 요청이 **한 곳으로만** 가야 한다.
    expect(second).toHaveLength(1)
    expect(first).toHaveLength(0)

    unregisterSecond()
    unregisterFirst()
  })

  it("최상단 호스트가 사라지면 그 아래가 이어받는다", async () => {
    const outer: DialogRequest[] = []
    const inner: DialogRequest[] = []
    const unregisterOuter = fakeHost(outer, 0)
    const unregisterInner = fakeHost(inner, 0)

    await showConfirm({ title: "첫 번째" })
    unregisterInner() // 모달이 닫히면서 안쪽 호스트가 내려간다
    await showConfirm({ title: "두 번째" })

    expect(inner.map((r) => r.title)).toEqual(["첫 번째"])
    expect(outer.map((r) => r.title)).toEqual(["두 번째"])

    unregisterOuter()
  })

  it("같은 호스트를 두 번 등록해도 한 번만 답한다 — 중복 마운트 방어", async () => {
    const log: DialogRequest[] = []
    const handler = (request: DialogRequest) => {
      log.push(request)
      return Promise.resolve<DialogResult>(0)
    }
    const off1 = registerDialogHost(handler)
    const off2 = registerDialogHost(handler)

    await showConfirm({ title: "중복" })
    expect(log).toHaveLength(1)

    off2()
    off1()
  })

  it("해제 순서가 뒤바뀌어도 스택이 망가지지 않는다", async () => {
    const a: DialogRequest[] = []
    const b: DialogRequest[] = []
    const offA = fakeHost(a, 0)
    const offB = fakeHost(b, 0)

    // 바깥이 먼저 내려가는 경우(화면 전환 경합)
    offA()
    await showConfirm({ title: "여전히 B" })
    expect(b).toHaveLength(1)

    offB()
  })
})

describe("dialog 계약 — 선택지 개수가 표면을 정한다", () => {
  it("항목이 하나면 시트가 아니라 확인 다이얼로그로 강등된다", async () => {
    const log: DialogRequest[] = []
    const off = fakeHost(log, 0)

    const picked = await showActionSheet({
      title: "하나뿐",
      actions: [{ label: "유일" }],
    })

    // 제목 아래 항목 한 줄 + 취소만 있는 시트는 미완성처럼 읽힌다(dialog.ts 주석).
    expect(log[0]?.kind).toBe("confirm")
    expect(log[0]?.confirmLabel).toBe("유일")
    // 반환 계약은 시트와 같다 — 골랐으면 인덱스 0.
    expect(picked).toBe(0)

    off()
  })

  it("항목이 둘 이상이면 시트로 간다", async () => {
    const log: DialogRequest[] = []
    const off = fakeHost(log, 1)

    const picked = await showActionSheet({
      title: "공유",
      actions: [
        { label: "카카오톡" },
        { label: "인스타그램" },
        { label: "기타" },
      ],
    })

    expect(log[0]?.kind).toBe("sheet")
    expect(log[0]?.actions).toHaveLength(3)
    expect(picked).toBe(1)

    off()
  })

  it("취소는 null 이다 — 0(첫 항목)과 헷갈리면 안 된다", async () => {
    const off = fakeHost([], null)
    expect(
      await showActionSheet({ actions: [{ label: "a" }, { label: "b" }] }),
    ).toBeNull()
    // showConfirm 은 boolean 으로 접는다.
    expect(await showConfirm({ title: "취소됨" })).toBe(false)
    off()
  })
})

/*
  V2Modal 의 버튼 배치 자동 판정. 컴포넌트와 **같은 식**을 여기 옮겨 고정한다.

  실측된 결함(2026-08-19): `기록하지 않고 나가기` 가 가로 분할에서
  **`기록하지 않고...`** 로 잘렸다. `V2Button` 이 `numberOfLines={1}` 이고
  가로 분할은 버튼 하나가 ≈140pt 뿐이라, 되돌릴 수 없는 액션인데 무엇을 하는
  버튼인지가 잘린 자리에 있었다.

  문구를 짧게 고치는 것만으로는 다음 호출부에서 재발하므로 컴포넌트가 스스로
  판단하게 했고, 그 판단을 여기서 잠근다.
*/
const HORIZONTAL_LABEL_LIMIT = 7

function resolveLayout(
  primaryLabel: string,
  secondaryLabel?: string,
  buttonLayout?: "horizontal" | "vertical",
): "horizontal" | "vertical" {
  const tooLong =
    primaryLabel.length > HORIZONTAL_LABEL_LIMIT ||
    (secondaryLabel?.length ?? 0) > HORIZONTAL_LABEL_LIMIT
  if (buttonLayout != null) return buttonLayout
  return tooLong ? "vertical" : "horizontal"
}

describe("V2Modal — 버튼 배치 자동 판정", () => {
  it("짧은 라벨은 가로로 나란히 — 기본 모양을 지킨다", () => {
    expect(resolveLayout("나가기", "계속 보기")).toBe("horizontal")
    expect(resolveLayout("삭제", "취소")).toBe("horizontal")
  })

  it("긴 라벨이 하나라도 있으면 세로로 쌓는다 — 잘리느니 쌓는다", () => {
    // 실제로 잘렸던 그 문구(11자).
    expect(resolveLayout("기록하지 않고 나가기", "결과로 돌아가기")).toBe(
      "vertical",
    )
    // 한쪽만 길어도 세로다 — 가로 분할은 둘이 같은 폭을 나눠 갖기 때문.
    // `결과로 돌아가기`(8자)는 실기에서 턱걸이였고, 한 칸 여유를 둔 기준에 걸린다.
    expect(resolveLayout("나가기", "결과로 돌아가기")).toBe("vertical")
  })

  it("호출부가 명시하면 그 뜻이 이긴다 — 자동 판정이 뒤집지 않는다", () => {
    expect(resolveLayout("나가기", "취소", "vertical")).toBe("vertical")
    expect(resolveLayout("아주 긴 라벨입니다", "취소", "horizontal")).toBe(
      "horizontal",
    )
  })

  it("경계값 — 7자는 가로, 8자부터 세로", () => {
    expect(resolveLayout("1234567", "취소")).toBe("horizontal")
    expect(resolveLayout("12345678", "취소")).toBe("vertical")
  })
})
