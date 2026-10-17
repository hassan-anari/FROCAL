import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const upstream = "https://api.dalexio.com";
const apiRules = config.rewrites.slice(0, 3);

// These rules use the numeric regex captures documented by Vercel. Keeping all
// API routes ahead of the SPA catch-all is essential for POST/DELETE requests.
function rewriteApi(path) {
  for (const rule of apiRules) {
    const match = new RegExp(rule.source).exec(path);
    if (match) {
      return rule.destination.replace(/\$(\d+)/g, (_, index) => match[Number(index)] ?? "");
    }
  }
  return null;
}

test("API regex rewrites are ordered before both the old wildcard and SPA fallback", () => {
  assert.equal(config.rewrites[3].source, "/api/v1/:path*");
  assert.deepEqual(config.rewrites.at(-1), { source: "/(.*)", destination: "/index.html" });
  for (const rule of apiRules) {
    assert.match(rule.source, /^\^\/api\/v1/);
    assert.ok(rule.source.endsWith("$"));
    assert.ok(rule.destination.startsWith(upstream + "/api/v1/"));
  }
});

test("API root and domain roots work both with and without a trailing slash", () => {
  for (const path of ["/api/v1", "/api/v1/"]) {
    assert.equal(rewriteApi(path), upstream + "/api/v1/", path);
  }
  for (const domain of [
    "clans", "network", "bootstrap", "daily", "missions", "typing", "referrals",
    "notifications", "rewards", "profile", "arena", "content", "base", "telegram",
  ]) {
    for (const ending of ["", "/"]) {
      const path = "/api/v1/" + domain + ending;
      assert.equal(rewriteApi(path), upstream + "/api/v1/" + domain + "/", path);
    }
  }
});

test("nested API endpoints with either trailing-slash form keep their full path", () => {
  const nestedPaths = [
    "/api/v1/clans/state",
    "/api/v1/clans/eligible-groups",
    "/api/v1/clans/eligible-groups/4/verify",
    "/api/v1/clans/4/join-requests",
    "/api/v1/clans/join-requests/8/decision",
    "/api/v1/clans/shop/rally-beacon/purchase",
    "/api/v1/clans/inventory/rally-beacon/activate",
    "/api/v1/network/groups/intents",
    "/api/v1/network/groups/6/reverify",
    "/api/v1/base/v2/tap-batches",
    "/api/v1/typing/attempts/start",
    "/api/v1/rewards/history",
    "/api/v1/profile/group-avatar/example-id",
    "/api/v1/content/banner-assets/example/file.webp",
  ];
  for (const path of nestedPaths) {
    for (const ending of ["", "/"]) {
      assert.equal(rewriteApi(path + ending), upstream + path, path + ending);
    }
  }
});

test("non-API routes remain outside the API proxy", () => {
  for (const path of ["/", "/clan", "/arena", "/assets/app.js", "/api/v10/clans/"]) {
    assert.equal(rewriteApi(path), null, path);
  }
});
