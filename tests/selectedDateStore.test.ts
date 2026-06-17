describe("selected date store", () => {
  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("initializes to today on module load", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-06-17T09:00:00+09:00"))

    const { useSelectedDateStore } =
      await import("@/src/stores/selectedDateStore")

    expect(useSelectedDateStore.getState().selectedDate).toEqual(
      new Date("2026-06-17T00:00:00Z"),
    )
  })

  it("keeps the selected date until explicitly changed", async () => {
    const { useSelectedDateStore } =
      await import("@/src/stores/selectedDateStore")
    const selected = new Date("2026-06-10T00:00:00Z")

    useSelectedDateStore.getState().setSelectedDate(selected)

    expect(useSelectedDateStore.getState().selectedDate).toEqual(selected)
    expect(useSelectedDateStore.getState().selectedDate).not.toBe(selected)
  })

  it("resets to today only through the explicit reset action", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-06-17T09:00:00+09:00"))

    const { useSelectedDateStore } =
      await import("@/src/stores/selectedDateStore")

    useSelectedDateStore
      .getState()
      .setSelectedDate(new Date("2026-06-10T00:00:00Z"))
    useSelectedDateStore.getState().resetToToday()

    expect(useSelectedDateStore.getState().selectedDate).toEqual(
      new Date("2026-06-17T00:00:00Z"),
    )
  })
})
