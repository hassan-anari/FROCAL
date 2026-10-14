import { useSyncExternalStore } from "react";
import type { TapController } from "./controller";

/** One shared read model for Base, Header, Profile and progression consumers.
 * The reviewed backend adapter will own controller creation and account lifetime. */
export function useTapView(controller: TapController) {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}
