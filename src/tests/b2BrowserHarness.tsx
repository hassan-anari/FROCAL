// Explicit dev-server import used only by Playwright. No app route or public flag.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DexoStage } from "@/design-system/components/DexoStage";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { BaseHeroStats } from "@/game/base/BaseHeroStats";
import { BaseTapFeedback } from "@/game/base/BaseTapFeedback";
import { TapController } from "@/game/base/tapV2/controller";
import { browserTapOwnership } from "@/game/base/tapV2/ownership";
import { internalSnapshot } from "@/game/base/tapV2/testing.fixture";
import { useTapView } from "@/game/base/tapV2/useTapView";
import type { TapSubmission } from "@/game/base/tapV2/model";
import type { VerifiedAvatar } from "@/integrations/api/avatarSource";

export async function mountB2Harness() {
  if (!import.meta.env.DEV) throw new Error("Development fixture only");
  document.getElementById("root")?.remove();
  let snapshot = internalSnapshot();
  snapshot.grant!.expiresAt = snapshot.serverTime + 120_000;
  const requests: TapSubmission[] = [];
  let respond: (() => void) | undefined;
  const controller = new TapController({
    player: snapshot.player, storage: () => localStorage, ownership: browserTapOwnership(snapshot.player),
    port: {
      synchronize: async () => structuredClone(snapshot),
      submit: async (batch) => {
        requests.push(structuredClone(batch));
        await new Promise<void>((resolve) => { respond = resolve; });
        snapshot = { ...snapshot, revision: snapshot.revision + 1,
          lifetime: snapshot.lifetime + batch.sequences.length, seasonPoints: snapshot.seasonPoints + batch.sequences.length,
          grant: { ...snapshot.grant!, remaining: snapshot.grant!.remaining - batch.sequences.length, sequenceCursor: batch.sequences[batch.sequences.length - 1] },
          acknowledgements: [{ scope: batch.scope, through: batch.sequences[batch.sequences.length - 1] }],
        };
        return structuredClone(snapshot);
      },
    },
  });
  await controller.start();
  function ProgressSubscriber({ name }: { name: string }) {
    const view = useTapView(controller);
    return <output aria-label={name}>{view.lifetime} / {view.progression?.level} / {view.progression?.stage}</output>;
  }
  function Interaction() {
    const view = useTapView(controller);
    const [taps, setTaps] = useState(0);
    return <section data-b2-harness>
      <BaseHeroStats lifetimeXp={view.lifetime} dlxReceived={0} />
      <DexoStage character={view.progression?.stage === "explorer" ? "dexo.level05" : "dexo.level01"} effect="base"
        interactive multiTouch ariaLabel="Physical Dexo fixture"
        onPress={() => { if (controller.touch()) setTaps((current) => current + 1); }} />
      <BaseTapFeedback tapCount={taps} />
      <ProgressSubscriber name="Base progression fixture" />
      <ProgressSubscriber name="Header progression fixture" />
      <ProgressSubscriber name="Profile progression fixture" />
    </section>;
  }
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host); root.render(<Interaction />);
  const api = { state: controller.getSnapshot, requests: () => requests,
    settle: () => respond?.(), flush: () => controller.flush(),
    stop: () => { root.unmount(); controller.close(); },
  };
  Object.assign(window, { b2Harness: api });
}

export function mountAvatarHarness(cached: VerifiedAvatar) {
  if (!import.meta.env.DEV) throw new Error("Development fixture only");
  document.getElementById("root")?.remove();
  const host = document.createElement("div"); document.body.append(host);
  createRoot(host).render(<ProfileAvatar firstName="Verified" owner={cached.owner} cachedAvatar={cached}
    photoUrl="https://telegram-photo-blocked.test/photo.jpg" frameId="standard" size="lg" />);
}
