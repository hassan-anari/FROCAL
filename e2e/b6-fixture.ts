import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { prepareB4, auth } from "./b4-fixture";
const pinned = JSON.parse(readFileSync("src/integrations/api/fixtures/b5/clan-http.json", "utf8"));
const lifecycle = JSON.parse(readFileSync("src/integrations/api/fixtures/b5/lifecycle-http.json", "utf8"));
/** Published B5/B6 response fields only. Mutable transport controls are isolated browser diagnostics. */
export async function prepareClan(page: Page) {
  const app = await prepareB4(page);
  app.bootstrap.features.clan = true;
  const data = { ...structuredClone(pinned), activity: { items: [], next_cursor: null, as_of: "2026-10-17T00:00:00Z" } };
  const member = data["membership/current"];
  const identity = { id: member.clan_id, name: member.clan_name, tag: "API", motto: "", level: data.home.hq_level, member_count: data.home.used_capacity, capacity: data.home.effective_capacity, accepting_members: true, rank: null, score: data.home.competitive_score, state: "ACTIVE", image_url: null };
  const gates = new Map<string, Promise<void>>();
  const failures = new Set<string>();
  const reads: string[] = [];
  const calls: { path: string; method: string }[] = [];
  let groups: unknown[] = [];
  let applicants: unknown[] = [];
  let own: unknown[] = [];
  let membership: unknown = member;
  let clans: unknown[] = [identity];
  const hold = (path: string) => { let done!: () => void; gates.set(path, new Promise(resolve => { done = resolve; })); return () => { gates.delete(path); done(); }; };
  await page.route("**/api/v1/clans{,/,/**,?*}", async route => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1/clans", "").replace(/\/$/, "") || "/";
    reads.push(path); calls.push({ path, method: route.request().method() });
    if (route.request().headers().authorization !== `tma ${auth}`) throw new Error("Clan read lacks authenticated context");
    await gates.get(path);
    if (failures.has(path)) return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", detail: "private diagnostic" } });
    if (route.request().method() !== "GET") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE" } });
    const response = path === "/membership/current" ? membership : path === "/eligible-groups" ? groups : path === "/applicants" ? applicants : path === "/join-requests/current" ? own : path === "/" ? clans : /^\/\d+$/.test(path) ? identity : data[path.slice(1)];
    return route.fulfill({ json: response ?? null });
  });
  return { app, data, identity, member, lifecycle, failures, reads, calls, hold,
    setGroups: (value: unknown[]) => { groups = value; }, setApplicants: (value: unknown[]) => { applicants = value; },
    setOwn: (value: unknown[]) => { own = value; }, setMembership: (value: unknown) => { membership = value; }, setClans: (value: unknown[]) => { clans = value; },
  };
}
