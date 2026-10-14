/** One down per live physical pointer. Click/touch compatibility events never enter this gate. */
export class PhysicalPointers {
  private active = new Map<number, string>();

  down(event: { pointerId: number; pointerType: string; button: number; isTrusted: boolean; emulatedMouse?: boolean }): boolean {
    if (!event.isTrusted || !Number.isInteger(event.pointerId) || this.active.has(event.pointerId)) return false;
    if (!["touch", "pen", "mouse"].includes(event.pointerType) || event.button !== 0) return false;
    if (event.pointerType === "mouse" && (event.emulatedMouse || [...this.active.values()].includes("touch"))) return false;
    this.active.set(event.pointerId, event.pointerType);
    return true;
  }

  up(pointerId: number) { this.active.delete(pointerId); }
  reset() { this.active.clear(); }
}
