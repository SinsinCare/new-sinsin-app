/** A replaced or cancelled request must never update the active conversation. */
export class ConsultRequest {
  private current: AbortController | null = null

  get active() {
    return this.current !== null
  }

  begin() {
    this.cancel()
    const controller = new AbortController()
    this.current = controller
    return controller
  }

  owns(controller: AbortController) {
    return this.current === controller && !controller.signal.aborted
  }

  finish(controller: AbortController) {
    if (!this.owns(controller)) return false
    this.current = null
    return true
  }

  cancel() {
    this.current?.abort()
    this.current = null
  }
}
