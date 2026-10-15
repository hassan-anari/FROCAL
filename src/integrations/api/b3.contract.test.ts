import { expect, it } from "vitest";
import * as c from "./b3Contracts";
import fixture from "./fixtures/b3/earn-network.json";
import banners from "./fixtures/b3/banners.json";
import activeNetwork from "./fixtures/b3/creator-network-active.json";
import { validBanner } from "@/design-system/components/BasePromoBanner";
import { B3Error } from "./b3";
import { missionView } from "./useB3";

it("parses the real pinned Daily, Missions, Typing, Referral and Network fixtures", () => {
  c.dailySchema.parse(fixture.daily_available);
  c.dailyClaimSchema.parse(fixture.daily_claim.response);
  c.dailyClaimSchema.parse(fixture.daily_duplicate.response);
  fixture.mission_list.forEach((v) => c.missionSchema.parse(v));
  c.missionStartSchema.parse(fixture.mission_start.response);
  c.missionVerifySchema.parse(fixture.mission_verified.response);
  c.missionClaimSchema.parse(fixture.mission_claim.response);
  c.typingSchema.parse(fixture.typing_state);
  c.attemptSchema.parse(fixture.typing_start.response);
  c.typingSchema.parse(fixture.typing_resume);
  c.submitSchema.parse(fixture.typing_submit.response);
  c.submitSchema.parse(fixture.typing_duplicate_submit.response);
  c.typingClaimSchema.parse(fixture.typing_claim.response);
  c.referralSchema.parse(fixture.referral);
  c.inviteesSchema.parse(fixture.invitees_empty);
  c.networkSchema.parse(fixture.network_summary);
  c.groupsSchema.parse(fixture.network_groups_empty);
  c.canonicalSchema.parse(fixture.canonical_state);
  c.groupsSchema.parse(activeNetwork);
});
it("has no default or local banner and accepts only pinned versioned WebP assets", () => {
  expect(validBanner(c.bannerSchema.parse(banners.empty).banner)).toBeNull();
  expect(validBanner(c.bannerSchema.parse(banners.active).banner)).toEqual(
    banners.active.banner,
  );
  for (const image_url of [
    "javascript:alert(1)",
    "https://x.test/arbitrary.webp",
    "https://x.test/a.svg",
    banners.active.banner.image_url + "?v=1",
  ])
    expect(
      validBanner({
        ...banners.active.banner,
        destination_type: "TELEGRAM",
        width: 1200,
        height: 260,
        image_url,
      }),
    ).toBeNull();
});
it.each([
  "javascript:alert(1)",
  "data:text/html,unsafe",
  "//evil.test",
  "https://user:pass@evil.test",
  "https://evil.test/\\bad",
])("hides an unsafe banner destination %s", (destination) => {
  expect(
    validBanner({
      ...banners.active.banner,
      destination_type: "TELEGRAM",
      width: 1200,
      height: 260,
      destination,
    }),
  ).toBeNull();
});
it("does not render raw B3 error codes or details", () => {
  for (const code of [
    "TELEGRAM_VERIFICATION_UNAVAILABLE",
    "MISSION_NOT_READY",
    "QUOTA_EXHAUSTED",
    "new-internal-error-token",
  ])
    expect(new B3Error(code, 1).message).not.toContain(code);
});
it("maps unavailable published missions without claiming or inventing progress", () => {
  const mission = c.missionSchema.parse({
    ...fixture.mission_list[0],
    state: "UNAVAILABLE",
    available: false,
  });
  expect(missionView(mission)).toMatchObject({
    unavailable: true,
    progress: 0,
    rewardXp: mission.reward_amount,
  });
});
