import { expect, it } from "vitest";
import * as c from "./b6Schemas";
import applicants from "./fixtures/b6/applicants-http.json";
import standing from "./fixtures/b6/clan-standing-http.json";
import activity from "./fixtures/b6/activity-http.json";
import { clanApplicant, clanMission, clanSummary } from "./clanViews";
import { clanActivityRows, clanActivityView, clanRankLabel } from "./clanActivity";

it("consumes real rank/streak and distinguishes unranked from projection failures", () => {
  for (const rows of Object.values(applicants)) for (const row of rows) {
    const dto = c.ApplicantOut.parse(row), view = clanApplicant(dto);
    expect(view.currentStreak).toBe(row.current_streak);
    expect(clanRankLabel(view.globalRank, view.rankStatus)).toBe(row.rank_status === "RANKED" ? `#${row.rank}` : row.rank_status === "UNRANKED" ? "Unranked" : row.rank_status === "RECONCILING" ? "Updating" : "Unavailable");
  }
  expect(clanApplicant(c.ApplicantOut.parse(applicants.ready.at(-1))).currentStreak).toBe(0);
});
it("shows canonical #1 for score 3 while zero Treasury and HQ XP remain zero", () => {
  const home = c.ClanHomeOut.parse(standing.home), identity = clanSummary(c.ClanOut.parse(standing.detail));
  expect(clanRankLabel(identity.rank, identity.rankStatus)).toBe("#1");
  expect(home).toMatchObject({ rank: 1, rank_status: "RANKED", competitive_score: 3, hq_xp: 0, progress_to_next: 0, treasury_balance: 0 });
  expect(clanRankLabel(1, "RECONCILING")).toBe("Updating");
});
it("uses stable event identities and original source timestamps without duplicate accounting legs", () => {
  const pages = activity.map(page => c.ClanActivityPage.parse(page));
  const rows = clanActivityRows([...pages, pages[0]]);
  expect(rows).toHaveLength(pages.flatMap(p => p.items).length);
  expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
  for (const row of rows) {
    expect(clanActivityView(row).title).toBeTruthy();
    expect(row.occurred_at).not.toBe(pages[0].as_of);
    expect(JSON.stringify(clanActivityView(row))).not.toMatch(/https:|telegram_user_id|reward:/i);
  }
  expect(rows.some(row => row.event_type === "MEMBER_JOINED")).toBe(true);
  expect(rows.filter(row => row.event_type === "CLAN_REWARD_SETTLED")).toHaveLength(1);
});
it("displays Admin mission text, canonical zero payout, progress and availability without a claim", () => {
  const dto = c.ClanMissionOut.parse({ key: "admin-real", version: 2, title: "Build together", description: "Finish verified Clan activities.", kind: "GROUP", target_units: 5, reward_band: "GROUP", starts_at: "2026-10-17T00:00:00Z", ends_at: "2026-10-18T00:00:00Z", progress_units: 5, completed: true, requirement: "VALID_CLAN_ACTIVITY", availability: "AVAILABLE", blocked_reason: null, participant_gross_points: 100, direct_hq_xp: 20, reward_state: "SETTLED", own_player_reward: 0 });
  expect(clanMission(dto)).toMatchObject({ id: "admin-real:2", title: dto.title, description: dto.description, current: 5, target: 5, unit: "activities", status: "completed", rewardLabel: "0 XP · Settled" });
  expect(clanMission({ ...dto, availability: "UNAVAILABLE", completed: false, requirement: "INTERNAL" }).rewardLabel).toBe("Unavailable");
});
