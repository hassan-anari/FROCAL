import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
export const fixture = JSON.parse(readFileSync("src/integrations/api/fixtures/b3/earn-network.json", "utf8"));
const groupFixture = JSON.parse(readFileSync("src/integrations/api/fixtures/b3/creator-network-active.json", "utf8"));
const b4 = JSON.parse(readFileSync("src/integrations/api/fixtures/b4/profile-earn.json", "utf8"));
export const auth = `user=${encodeURIComponent(JSON.stringify({ id: 9001, first_name: "Explorer" }))}&auth_date=123&hash=isolated-b4-browser`;
export const launch = (path: string) => `${path}#tgWebAppData=${encodeURIComponent(auth)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`;
export async function prepareB4(page: Page) {
  const state = {
    bootstrap: structuredClone(fixture.bootstrap), canonical: structuredClone(fixture.canonical_state),
    daily: structuredClone(fixture.daily_available), missions: structuredClone(fixture.mission_list),
    typing: { ...b4.typing_result.typing, next_reset: fixture.typing_state.next_reset },
    history: { period: "current", period_key: "2026-10-15T00:00:00+00:00", period_start: "2026-10-15T00:00:00Z", period_end: "2026-10-16T00:00:00Z", items: b4.typing_history_unclaimed.items.map((run: any) => ({ ...run, reset_period: "2026-10-15T00:00:00+00:00", started_at: "2026-10-15T08:00:00Z", submitted_at: "2026-10-15T08:00:05Z" })), next_cursor: null as number | null },
    overview: structuredClone(fixture.profile_overview),
    customization: { active_frame: "standard", active_title: "explorer", featured_medal: null, featured_achievement: null },
    groups: structuredClone(groupFixture),
    invitees: { items: [{ name: "Start Invitee", photo_url: "", status: "PENDING", attributed_at: "2026-10-15T08:00:00Z", verified_at: null, activation: { level: 1, required_level: 5, required_account_age_hours: 24, eligible: false } }], next_offset: null },
    achievements: { achievements: [
      { key: "first-mission", available_s1: true, unlocked: true, unlocked_at: "2026-10-15T08:00:00Z", current_progress: 1, target: 1, point_reward: 0 },
      { key: "first-referral", available_s1: true, unlocked: false, unlocked_at: null, current_progress: 0, target: 1, point_reward: 0 },
      { key: "first-verified-activity", available_s1: true, unlocked: false, unlocked_at: null, current_progress: 5, target: 200, point_reward: 0 },
      { key: "first-contribution", available_s1: false, unlocked: false, unlocked_at: null, current_progress: 0, target: 1, point_reward: 0 },
    ], unlocked_count: 1 },
    collection: { frames: ["standard", "premium", "seasonal", "founder"].map(key => ({ key, available: true, entitled: ["standard", "premium"].includes(key), active: key === "standard" })), titles: [{ key: "explorer", available: true, entitled: true, active: true }], medals: [], owned_medal_count: 0 },
    notifications: [{ id: "00000000-0000-4000-8000-000000000001", deep_link: null as { path: string } | null, type: "MISSION", title: "Mission complete", body: "Your mission has been verified.", payload: {}, created_at: "2026-10-15T08:00:00Z", read_at: null as string | null, unread: true }],
    calls: [] as { path: string; method: string; query: string }[], dailyDelay: 0, missionDelay: 0, saveDelay: 0, saveError: false, failDaily: false, duplicate: false,
    historyPeriodChanged: false,
    rankingOverlap: false,
  };
  state.bootstrap.features = { ...state.bootstrap.features, base_tap: false, clan: false, profile: true, arena: true };
  await page.addInitScript(() => {
    localStorage.setItem("dalexio-onboarding-v1:player:9001", JSON.stringify({ version: 1, state: { status: "completed", step: "ready", guideIndex: 3, completedAt: "2026-01-01T00:00:00Z" } }));
    // Freeze the visual clock only. Synthetic launch credentials never leave localhost.
    Date.now = () => Date.parse("2026-10-15T08:12:22Z");
  });
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.fallback() : route.abort());
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/v1", "");
    const method = route.request().method();
    state.calls.push({ path, method, query: url.search });
    const send = (json: unknown, status = 200) => route.fulfill({ json, status });
    const adopt = (canonical: any) => {
      state.canonical = canonical;
      state.bootstrap = { ...state.bootstrap, canonical, progression: canonical.progression, season: { ...state.bootstrap.season, season_points: canonical.season_points } };
    };
    if (path === "/bootstrap") return send(state.bootstrap);
    if (path === "/rewards/state") return send(state.canonical);
    if (path === "/daily") return send(state.daily);
    if (path === "/daily/claim") {
      if (state.dailyDelay) await new Promise(done => setTimeout(done, state.dailyDelay));
      if (state.failDaily) return send({ code: "UNAVAILABLE", detail: "private diagnostic" }, 503);
      const result = structuredClone(fixture.daily_claim.response);
      result.created = !state.duplicate && !state.daily.already_claimed;
      // A coherent server-confirmed level boundary for the existing level reveal.
      result.canonical = { ...result.canonical, receipt_cursor: 4, season_points: 350, progression: { ...result.canonical.progression, lifetime_points: 350, level: 2, current_threshold: 300, next_threshold: 750, points_into_level: 50, points_remaining: 400 } };
      const reward = { ...b4.daily_claim.reward, created: result.created, amount: result.reward_amount, progression_before: state.canonical.progression, progression_after: result.canonical.progression };
      state.daily = result.daily; adopt(result.canonical); return send({ ...result, reward });
    }
    if (path === "/missions") return send(state.missions);
    if (/^\/missions\/.+\/claim$/.test(path)) {
      if (state.missionDelay) await new Promise(done => setTimeout(done, state.missionDelay));
      const result = fixture.mission_claim.response;
      state.missions = state.missions.map((m: any) => m.key === result.key ? { ...m, state: "CLAIMED" } : m);
      const reward = { ...b4.mission_claim.reward, amount: result.reward_amount, progression_before: state.canonical.progression, progression_after: result.canonical.progression };
      adopt(result.canonical); return send({ ...result, reward });
    }
    if (path === "/typing") return send(state.typing);
    if (path === "/typing/history") {
      if (state.historyPeriodChanged && url.searchParams.has("cursor")) { state.historyPeriodChanged = false; return send({ code: "TYPING_PERIOD_CHANGED", detail: "typing period changed", retryable: false, retry_after_seconds: null }, 409); }
      return send(state.history);
    }
    if (path === "/typing/claim") { const result = fixture.typing_claim.response; const reward = { ...b4.typing_claim.reward, amount: result.amount, progression_before: state.canonical.progression, progression_after: result.canonical.progression }; state.typing = result.typing; adopt(result.canonical); return send({ ...result, reward }); }
    if (path === "/typing/attempts/start") return send(fixture.typing_start.response);
    if (path.endsWith("/submit")) return send({ ...fixture.typing_submit.response, score: b4.typing_result.score });
    if (path === "/referrals") return send(fixture.referral);
    if (path === "/referrals/invitees") return send(state.invitees);
    if (path === "/network") return send(fixture.network_summary);
    if (path === "/network/groups") return send(state.groups);
    if (path === "/profile/overview") return send({ ...state.overview, canonical: state.canonical, progression: state.canonical.progression, customization: state.customization });
    if (path === "/profile/achievements") return send(state.achievements);
    if (path === "/profile/collection") return send(state.collection);
    if (path === "/profile/review") return send(state.customization);
    if (path === "/profile/customization") {
      if (state.saveDelay) await new Promise(done => setTimeout(done, state.saveDelay));
      if (state.saveError) return send({ detail: "not entitled" }, 422);
      state.customization = route.request().postDataJSON(); return send(state.customization);
    }
    if (path === "/notifications") return send({ items: state.notifications, next_cursor: null, unread_count: state.notifications.filter(row => row.unread).length });
    if (path === "/notifications/read-all") { const updated_count = state.notifications.filter(row => row.unread).length; state.notifications = state.notifications.map(row => ({ ...row, unread: false, read_at: "2026-10-15T08:12:22Z" })); return send({ updated_count, unread_count: 0 }); }
    if (path.endsWith("/read")) { state.notifications[0] = { ...state.notifications[0], unread: false, read_at: "2026-10-15T08:12:22Z" }; return send(state.notifications[0]); }
    if (path === "/arena/rankings/players") {
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const items = Array.from({ length: offset === 0 ? 30 : 2 }, (_, i) => ({ rank: offset + i + 1, player_id: offset + i + 1, first_name: `Explorer ${offset + i + 1}`, username: "", avatar_url: "", level: 2, season_points: 5000 - (offset + i) * 10, clan: null }));
      if (offset > 0 && state.rankingOverlap) items.unshift({ ...items[0], player_id: 30, first_name: "Explorer 30" });
      return send({ items, own_standing: { ...items[0], rank: 50, player_id: 9001, season_points: 270 }, offset, limit: 30 });
    }
    if (path === "/arena/rankings/clans") return send({ items: [{ rank: 1, clan_id: 1, name: "Verified Clan", tag: "VC", crest: null, hq_level: 1, member_count: 2, capacity: 10, competitive_score: 100 }], own_standing: null, offset: 0, limit: 30 });
    if (path === "/arena/dlx") return send({ season: "phase4-s1", confirmed: 1, net_confirmed: 1, claimable: 0, claimable_enabled: false, transferable: false, tradable: false, on_chain: false, price_status: "UNAVAILABLE" });
    return send({ code: "UNAVAILABLE" }, 503);
  });
  return state;
}
