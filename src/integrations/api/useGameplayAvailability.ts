import { useCallback, useEffect, useReducer, useRef } from "react";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { bootstrapServerNow, seasonAvailability } from "./seasonAvailability";

/** Read availability and earning eligibility are separate. Neither enables S2. */
export function useGameplayAvailability() {
  const { bootstrap, authorityReady } = useBootstrap();
  const remote = isRemoteDataSource();
  const latest = useRef(bootstrap.data);
  latest.current = bootstrap.data;
  const ready = useRef(authorityReady);
  ready.current = authorityReady;
  const [, tick] = useReducer(n => n + 1, 0);
  useEffect(() => {
    if (!remote) return;
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [remote]);
  const serverNow = useCallback(() => bootstrapServerNow(latest.current), []);
  const current = useCallback(() => seasonAvailability(latest.current?.remote, serverNow()), [serverNow]);
  const featureAvailable = useCallback((feature: string) => !remote || Boolean(latest.current?.featureFlags[feature]), [remote]);
  // Evaluate again at submission time, even before a throttled timer has rendered.
  const canEarn = useCallback((feature: string) => featureAvailable(feature) && (!remote || (ready.current && current().earning)), [remote, featureAvailable, current]);
  const canClaimVested = useCallback((feature: string, authorized: boolean) => featureAvailable(feature) && authorized && (!remote || (ready.current && current().vestedClaims)), [remote, featureAvailable, current]);
  const state = current();
  const seasonState = remote && !authorityReady && state.status === "EARNING ACTIVE" ? { ...state, earning: false, status: "EARNING UNAVAILABLE" } : state;
  return { rewardEarningAllowed: !remote || (authorityReady && state.earning), featureAvailable, canEarn, canClaimVested, serverNow, seasonState };
}
