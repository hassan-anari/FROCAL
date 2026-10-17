import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const origin = "https://api.dalexio.com";
const apiRules = config.rewrites.slice(0, -1);

// Local contract guard; it does not simulate Vercel's edge deployment.
// Named parameters follow Vercel path-to-regexp rewrite syntax.
function routeApi(path) {
  for (const rule of apiRules) {
    const params = [];
    const pattern = rule.source.replace(/:([A-Za-z][A-Za-z0-9_]*)(\*)?/g, (_, name, star) => {
      params.push(name);
      return star ? "(.+)" : "([^/]+)";
    });
    const found = new RegExp("^" + pattern + "$").exec(path);
    if (!found) continue;
    let destination = rule.destination;
    params.forEach((name, i) => {
      destination = destination.replace(":" + name + "*", found[i + 1]).replace(":" + name, found[i + 1]);
    });
    return destination;
  }
  return null;
}

test("API rewrites precede SPA and explicitly separate Clan root from other roots", () => {
  assert.deepEqual(config.rewrites.map(rule => rule.source), [
    "/api/v1/clans/", "/api/v1/clans", "/api/v1/", "/api/v1",
    "/api/v1/:section/", "/api/v1/:section", "/api/v1/:section/:path*/",
    "/api/v1/:path*", "/(.*)",
  ]);
  assert.deepEqual(config.rewrites.at(-1), { source: "/(.*)", destination: "/index.html" });
  for (const rule of apiRules) assert.ok(rule.destination.startsWith(origin + "/api/v1/"));
});

test("both forms of Clan root reach its exact Django Ninja /clans/ route", () => {
  for (const path of ["/api/v1/clans", "/api/v1/clans/"]) {
    assert.equal(routeApi(path), origin + "/api/v1/clans/", path);
  }
});

test("other API roots preserve their distinct no-slash Django Ninja routes", () => {
  for (const domain of [
    "network", "bootstrap", "daily", "missions", "typing", "referrals",
    "notifications", "rewards", "profile", "arena", "content", "base", "telegram",
  ]) {
    for (const ending of ["", "/"]) {
      const path = "/api/v1/" + domain + ending;
      assert.equal(routeApi(path), origin + "/api/v1/" + domain, path);
    }
  }
  // API namespace root is not a Clan operation and should remain unchanged.
  for (const path of ["/api/v1", "/api/v1/"]) {
    assert.equal(routeApi(path), origin + "/api/v1/", path);
  }
});

test("arbitrarily deep subpaths keep their backend canonical path without trailing slash", () => {
  for (const path of [
    "/api/v1/clans/state", "/api/v1/clans/eligible-groups",
    "/api/v1/clans/eligible-groups/4/verify", "/api/v1/clans/4/join-requests",
    "/api/v1/clans/join-requests/8/decision", "/api/v1/clans/shop/rally-beacon/purchase",
    "/api/v1/clans/inventory/rally-beacon/activate", "/api/v1/network/groups/intents",
    "/api/v1/network/groups/6/reverify", "/api/v1/base/v2/tap-batches",
    "/api/v1/typing/attempts/start", "/api/v1/rewards/history",
    "/api/v1/profile/group-avatar/example-id", "/api/v1/content/banner-assets/example/file.webp",
  ]) {
    for (const ending of ["", "/"]) assert.equal(routeApi(path + ending), origin + path, path + ending);
  }
});

test("SPA routes and static assets never hit the API origin", () => {
  for (const path of ["/", "/clan", "/arena", "/assets/app.js", "/api/v10/clans/"]) {
    assert.equal(routeApi(path), null, path);
  }
});
