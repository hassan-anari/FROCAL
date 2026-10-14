import { useCallback } from "react";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";

/** Read availability and earning eligibility are separate. Neither enables S2. */
export function useGameplayAvailability() {
  const { bootstrap } = useBootstrap();
  const remote = isRemoteDataSource();
  const rewardEarningAllowed = !remote || (bootstrap.data?.remote?.gameplay?.reward_earning_allowed ?? true);
  const flags = bootstrap.data?.featureFlags;
  const featureAvailable = useCallback((feature: string) => !remote || Boolean(flags?.[feature]), [remote, flags]);
  const canEarn = useCallback((feature: string) => featureAvailable(feature) && rewardEarningAllowed, [featureAvailable, rewardEarningAllowed]);
  return { rewardEarningAllowed, featureAvailable, canEarn };
}
