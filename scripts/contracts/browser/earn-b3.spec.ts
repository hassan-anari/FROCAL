import { expect, test, type Page } from "@playwright/test";
const api = "http://127.0.0.1:8792";
async function control(body: object) {
  const r = await fetch(`${api}/__b2_test__`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw Error("Isolated control failed");
  return r.json();
}
async function enter(
  page: Page,
  identity: { player: string; initData: string },
  path = "/earn",
) {
  await page.addInitScript(
    (player) =>
      localStorage.setItem(
        `dalexio-onboarding-v1:player:${player}`,
        JSON.stringify({
          version: 1,
          state: {
            status: "completed",
            step: "ready",
            guideIndex: 3,
            completedAt: "2026-01-01T00:00:00Z",
          },
        }),
      ),
    identity.player,
  );
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.fallback()
      : route.abort(),
  );
  await page.goto(
    `${path}#tgWebAppData=${encodeURIComponent(identity.initData)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`,
  );
}
test("production Daily and Missions settle real XP coherently across Earn, Profile and Base", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await control({ action: "flags" });
  const identity = await control({ action: "player", points: 150 });
  await enter(page, identity);
  await expect(
    page.getByRole("button", { name: "Claim daily core" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Claim daily core" }).click();
  await expect(
    page.getByRole("button", { name: "Claimed today" }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toContainText("+80 XP");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Earn summary")).toContainText("230");
  const mission = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Visit Dalexio", exact: true }),
  });
  await mission.getByRole("button", { name: "Start mission" }).click();
  await expect(
    mission.getByRole("button", { name: "Verify", exact: true }),
  ).toBeEnabled();
  await control({ action: "advance", seconds: 7 });
  await mission.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(
    mission.getByRole("button", { name: "Claim 120 XP" }),
  ).toBeEnabled();
  await mission.getByRole("button", { name: "Claim 120 XP" }).click();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toContainText("+120 XP");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  if (await page.getByRole("dialog", { name: "Dexo level up" }).count()) await page.getByRole("button", { name: "Return to Earn", exact: true }).click();
  await expect(page.getByLabel("Earn summary")).toContainText("350");
  await page
    .getByRole("navigation", { name: "Primary game navigation" })
    .getByRole("button", { name: "Profile", exact: true })
    .click();
  await expect(page.getByText("350", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("navigation", { name: "Primary game navigation" })
    .getByRole("button", { name: "Base", exact: true })
    .click();
  await expect(
    page.getByLabel("350 lifetime XP", { exact: true }),
  ).toBeVisible();
  expect(
    (await control({ action: "inspect", player: identity.player })).lifetime,
  ).toBe(350);
});
test("Typing uses a real issued phrase and server result, survives a lost submit response and claims only once", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await control({ action: "flags" });
  const identity = await control({ action: "player", points: 150 });
  await enter(page, identity, "/earn/typing");
  await page.getByRole("button", { name: "Start arena run" }).click();
  await expect(page.getByLabel("Typing challenge input")).toBeEnabled();
  const phrase = await page.getByLabel("Target phrase").innerText();
  expect(phrase).toBe("Dexo explorers share adventures");
  await control({
    action: "b3-attempt-time",
    player: identity.player,
    seconds: 8,
  });
  let lost = true;
  await page.route("**/api/v1/typing/attempts/*/submit", async (route) => {
    if (lost) {
      lost = false;
      await route.fetch();
      await route.abort();
    } else await route.fallback();
  });
  await page.getByLabel("Typing challenge input").fill(phrase);
  await expect(
    page.getByRole("button", { name: "Try Again", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Strong performance." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Claim \d+ XP$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to Typing tab", exact: true }).click();
  const claim = page.getByRole("button", { name: /^Claim \d+ XP$/ });
  await expect(claim).toBeVisible();
  const amount = Number((await claim.innerText()).match(/\d+/)![0]);
  await claim.click();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toContainText(`+${amount} XP`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  if (await page.getByRole("dialog", { name: "Dexo level up" }).count()) await page.getByRole("button", { name: "Return to Earn", exact: true }).click();
  await expect(claim).toHaveCount(0);
  expect(
    (await control({ action: "inspect", player: identity.player })).lifetime,
  ).toBe(150 + amount);
  await expect(page.getByLabel("Earn summary")).toContainText(
    String(150 + amount),
  );
});
test("Network shows canonical invite data, empty rosters and a real pending Creator registration", async ({
  page,
}) => {
  await control({ action: "flags" });
  const identity = await control({ action: "player", points: 150 });
  await enter(page, identity);
  await page.getByRole("button", { name: "Network", exact: true }).click();
  await expect(page.getByText(/t.me\/DexoPairedFixtureBot/)).toBeVisible();
  await expect(page.getByText("Aria Moon")).toHaveCount(0);
  await expect(page.getByText("Dexo Explorers", { exact: true })).toHaveCount(
    0,
  );
  const responsePromise = page.waitForResponse((r) =>
    r.url().endsWith("/network/groups/intents"),
  );
  await page.getByRole("button", { name: "Add bot to a group" }).click();
  const intentResponse = await responsePromise;
  expect(intentResponse.request().postDataJSON()).toEqual({});
  const intent = await intentResponse.json();
  await control({
    action: "b3-group",
    player: identity.player,
    token: new URL(intent.startgroup_url).searchParams.get("startgroup"),
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.reload();
  await page.getByRole("button", { name: "Network", exact: true }).click();
  await expect(
    page.getByText("Paired real community", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("REVIEW", { exact: true })).toBeVisible();
});

async function ownedBroadcastGroup(identity: {
  player: string;
  initData: string;
}) {
  await control({
    action: "b3-broadcast-verification",
    player: identity.player,
    mode: "allow",
  });
  const response = await fetch(`${api}/api/v1/network/groups/intents`, {
    method: "POST",
    headers: {
      Authorization: `tma ${identity.initData}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  expect(response.status).toBe(200);
  const intent = await response.json();
  return control({
    action: "b3-group",
    player: identity.player,
    token: new URL(intent.startgroup_url).searchParams.get("startgroup"),
  });
}
test("owned communities revalidate automatically without broadcast or manual status controls", async ({ page }) => {
  const consentRequests: string[] = [];
  page.on("request", request => { if (request.url().includes("/broadcast-consent")) consentRequests.push(request.url()); });
  await control({ action: "flags" });
  const identity = await control({ action: "player", points: 150 });
  await ownedBroadcastGroup(identity);
  await enter(page, identity);
  await page.getByRole("button", { name: "Network", exact: true }).click();
  await expect(page.getByText("Paired real community", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /broadcast|Check status/i })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Earn", exact: true }).click();
  await expect(page.getByText("Paired real community", { exact: true })).toBeVisible();
  expect(consentRequests).toEqual([]);
});
