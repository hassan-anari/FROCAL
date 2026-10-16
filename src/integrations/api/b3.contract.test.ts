import { remoteBootstrapSchema } from "./bootstrapContract";
import { tapStateSchema } from "./tapV2Contract";
import session from "./fixtures/b3/session-switch.json";
import { expect, it, vi } from "vitest";
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

it("accepts an approved same-origin HTTPS image without treating its asset path as a navigation route", () => {
  const b = c.bannerSchema.parse(banners.active).banner!;
  const image_url = new URL(b.image_url).pathname;
  vi.stubGlobal("window", {
    location: { origin: "https://game.example.test" },
  });
  try {
    expect(
      validBanner({ ...b, image_url: `https://game.example.test${image_url}` }),
    ).toBeTruthy();
    expect(
      validBanner({
        ...b,
        destination_type: "HTTPS",
        destination: "https://game.example.test/earn",
      }),
    ).toBeTruthy();
    expect(
      validBanner({
        ...b,
        destination_type: "HTTPS",
        destination: "https://unsafe.example.test:444/path",
      }),
    ).toBeNull();
  } finally {
    vi.unstubAllGlobals();
  }
});

it("accepts the published nullable additive Bootstrap and ownership fields for compatible deployed clients", () => {
  expect(
    remoteBootstrapSchema.parse({ ...fixture.bootstrap, canonical: null })
      .canonical,
  ).toBeNull();
  expect(
    tapStateSchema.parse({ ...session.initial, ownership: null }).ownership,
  ).toBeNull();
});

it.each([
  "https://campaign.example.org/welcome?utm_source=miniapp&target=%2Fseason%3Fid%3D5",
  "https://new-owner-approved-domain.example/offer?q=one%20two#terms",
])("keeps arbitrary approved HTTPS banner destinations including queries: %s", destination => {
  const banner = { ...banners.active.banner, destination_type: "HTTPS" as const, destination };
  expect(validBanner(c.bannerSchema.parse({ ...banners.active, banner }).banner)).toEqual(banner);
});
it.each([
  "javascript:alert(1)", "data:text/html,bad", "http://external.example", "//external.example",
  "https://user:pass@external.example/", "https://external.example:8443/", "https://external.example/%0aevil", "https://external.example/\\evil",
])("rejects malicious HTTPS-type banner destinations: %s", destination => {
  expect(validBanner({ ...banners.active.banner, width: 1200, height: 260, destination_type: "HTTPS", destination })).toBeNull();
});
