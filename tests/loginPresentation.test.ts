import {
  getLoginHeroLayout,
  LOGIN_HERO_SOURCE,
} from "../src/features/auth/data/loginPresentation"

describe("login hero presentation", () => {
  it("keeps the source artwork at its native aspect ratio when space allows", () => {
    expect(
      getLoginHeroLayout({
        viewportWidth: 375,
        viewportHeight: 1000,
        topInset: 20,
        bottomInset: 0,
        showsAppleLogin: false,
      }),
    ).toEqual({
      width: LOGIN_HERO_SOURCE.width,
      height: LOGIN_HERO_SOURCE.height,
      naturalHeight: LOGIN_HERO_SOURCE.height,
      preserveAspectRatio: "xMidYMid meet",
    })
  })

  it("crops proportionally on a short iPhone before it can overlap the action stack", () => {
    const layout = getLoginHeroLayout({
      viewportWidth: 375,
      viewportHeight: 667,
      topInset: 20,
      bottomInset: 0,
      showsAppleLogin: true,
    })

    expect(layout).toMatchObject({
      width: 375,
      height: 303,
      naturalHeight: 530,
      preserveAspectRatio: "xMidYMin slice",
    })
  })

  it("uses the full viewport width without distorting a wide layout", () => {
    const layout = getLoginHeroLayout({
      viewportWidth: 430,
      viewportHeight: 1200,
      topInset: 47,
      bottomInset: 34,
      showsAppleLogin: true,
    })

    expect(layout).toMatchObject({
      width: 430,
      naturalHeight: (430 * 530) / 375,
      preserveAspectRatio: "xMidYMid meet",
    })
    expect(layout.height).toBe(layout.naturalHeight)
  })
})
