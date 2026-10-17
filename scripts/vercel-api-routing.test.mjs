import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const origin = "https://api.dalexio.com";
const apiRules = config.rewrites.slice(0, -1);

// Lightweight route intent and ordering checks using documented named path
// parameters. A Vercel Preview smoke test must still validate the actual edge.
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

test("API rewrite rules precede the SPA fallback and preserve the backend origin", () => {
  assert.deepEqual(config.rewrites.map(rule => rule.source), [
    "/api/v1/", "/api/v1", "/api/v1/:section/", "/api/v1/:section",
    "/api/v1/:section/:path*/", "/api/v1/:path*", "/(.*)",
  ]);
  assert.deepEqual(config.rewrites.at(-1), { source: "/(.*)", destination: "/index.html" });
  for (const rule of apiRules) assert.ok(rule.destination.startsWith(origin + "/api/v1/"));
});

test("API roots work with and without trailing slash without redirecting POST", () => {
  for (const path of ["/api/v1", "/api/v1/"]) assert.equal(routeApi(path), origin + "/api/v1/");
  for (const domain of [
    "clans", "network", "bootstrap", "daily", "missions", "typing", "referrals",
    "notifications", "rewards", "profile", "arena", "content", "base", "telegram",
  ]) {
    for (const ending of ["", "/"]) {
      const path = "/api/v1/" + domain + ending;
      assert.equal(routeApi(path), origin + "/api/v1/" + domain + "/", path);
    }
  }
});

test("nested API URLs of any depth preserve path, with optional final slash", () => {
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
