/** Hold the Web Lock for the whole controller lifetime, not just each write. */
export interface TapOwnership { acquire(): Promise<boolean>; release(): void; readonly unavailable?: boolean }
// Same-document controller replacement waits for the browser to finish releasing
// its previous lock. Other tabs still use ifAvailable and never queue for ownership.
const retiring = new Map<string, Promise<void>>();
export function browserTapOwnership(player: string): TapOwnership {
  let release: (() => void) | undefined;
  let closed = false;
  let completion = Promise.resolve();
  let unavailable = false;
  return {
    get unavailable() { return unavailable; },
    acquire: async () => {
      await retiring.get(player);
      return new Promise<boolean>((resolve) => {
        if (!navigator.locks || closed) { unavailable = !navigator.locks; resolve(false); return; }
        completion = navigator.locks.request(`dalexio-tap:${player}`, { ifAvailable: true }, async (lock) => {
          if (!lock || closed) { resolve(false); return; }
          await new Promise<void>((done) => { release = done; resolve(true); });
        }).then(() => undefined).catch(() => { unavailable = true; resolve(false); });
      });
    },
    release: () => {
      closed = true; release?.();
      retiring.set(player, completion);
      void completion.finally(() => { if (retiring.get(player) === completion) retiring.delete(player); });
    },
  };
}
