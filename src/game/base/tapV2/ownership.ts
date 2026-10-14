/** Hold the Web Lock for the whole controller lifetime, not just each write. */
export interface TapOwnership { acquire(): Promise<boolean>; release(): void }
export function browserTapOwnership(player: string): TapOwnership {
  let release: (() => void) | undefined;
  let closed = false;
  return {
    acquire: () => new Promise<boolean>((resolve) => {
      if (!navigator.locks || closed) { resolve(false); return; }
      void navigator.locks.request(`dalexio-tap:${player}`, { ifAvailable: true }, async (lock) => {
        if (!lock || closed) { resolve(false); return; }
        await new Promise<void>((done) => { release = done; resolve(true); });
      }).catch(() => resolve(false));
    }),
    release: () => { closed = true; release?.(); },
  };
}
