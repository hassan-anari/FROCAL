import { useTapSession } from "@/game/base/tapV2/TapSessionProvider";

/** Compatibility import for consumers; no legacy economic writer/queue exists. */
export function useBaseTapBatcher() {
  const session = useTapSession();
  return { queueTap: () => Boolean(session?.touch()), error: session?.view.error ?? null };
}
