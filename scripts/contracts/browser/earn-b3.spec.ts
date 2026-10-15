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
  const claim = page.getByRole("button", { name: /^Claim \d+ XP$/ });
  await expect(claim).toBeVisible();
  const amount = Number((await claim.innerText()).match(/\d+/)![0]);
  await claim.click();
  await expect(claim).toHaveCount(0);
  expect(
    (await control({ action: "inspect", player: identity.player })).lifetime,
  ).toBe(150 + amount);
  await page
    .getByRole("button", { name: "Back to Typing tab", exact: true })
    .click();
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
  const intent = await (await responsePromise).json();
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
test("owned group broadcasts require confirmation, stay unchanged while saving/refreshing, and support real revoke", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const identity = await control({ action: "player", points: 150 });
  await ownedBroadcastGroup(identity);
  await enter(page, identity);
  await page.getByRole("button", { name: "Network", exact: true }).click();
  const row = page.getByRole("article", {
    name: "Paired real community",
    exact: true,
  });
  await expect(
    row.getByText("Broadcasts disabled", { exact: true }),
  ).toBeVisible();
  const writes: unknown[] = [];
  let releasePost!: () => void;
  let releaseRead!: () => void;
  let readStarted = false;
  let holdRead = false;
  const postGate = new Promise<void>((resolve) => {
    releasePost = resolve;
  });
  const readGate = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  await page.route(
    "**/api/v1/network/groups/*/broadcast-consent",
    async (route) => {
      writes.push(route.request().postDataJSON());
      if (writes.length === 1) {
        const response = await route.fetch();
        await postGate;
        holdRead = true;
        await route.fulfill({ response });
      } else await route.fallback();
    },
  );
  await page.route("**/api/v1/network/groups?*", async (route) => {
    if (holdRead) {
      readStarted = true;
      await readGate;
    }
    await route.fallback();
  });
  await row
    .getByRole("button", { name: "Enable broadcasts", exact: true })
    .click();
  let dialog = page.getByRole("dialog", { name: "Enable group broadcasts?" });
  await expect(dialog).toContainText("Paired real community");
  expect(writes).toHaveLength(0);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(writes).toHaveLength(0);
  await row
    .getByRole("button", { name: "Enable broadcasts", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Enable group broadcasts?" });
  await dialog
    .getByRole("button", { name: "Enable broadcasts", exact: true })
    .click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(
    row.getByText("Broadcasts disabled", { exact: true }),
  ).toBeVisible();
  await expect(
    row.getByRole("button", { name: "Enable broadcasts", exact: true }),
  ).toBeDisabled();
  releasePost();
  await expect.poll(() => readStarted).toBe(true);
  await expect(
    row.getByText("Broadcasts disabled", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Broadcasts are enabled for this group.", { exact: true }),
  ).toHaveCount(0);
  holdRead = false;
  releaseRead();
  await expect(
    row.getByText("Broadcasts enabled", { exact: true }),
  ).toBeVisible();
  await control({
    action: "b3-broadcast-verification",
    player: identity.player,
    mode: "unavailable",
  });
  await row
    .getByRole("button", { name: "Revoke broadcast consent", exact: true })
    .click();
  await expect(
    row.getByText("Broadcasts disabled", { exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([{ enabled: true }, { enabled: false }]);
  await expect(
    page.getByText("Broadcast consent has been revoked.", { exact: true }),
  ).toBeVisible();
  expect(
    (await control({ action: "inspect", player: identity.player })).lifetime,
  ).toBe(150);
});
for (const mode of ["denied", "unavailable"]) {
  test(`broadcast consent ${mode} verification stays disabled and recovers through a new intentional confirmation`, async ({
    page,
  }) => {
    const identity = await control({ action: "player", points: 150 });
    await ownedBroadcastGroup(identity);
    await control({
      action: "b3-broadcast-verification",
      player: identity.player,
      mode,
    });
    await enter(page, identity);
    await page.getByRole("button", { name: "Network", exact: true }).click();
    const row = page.getByRole("article", {
      name: "Paired real community",
      exact: true,
    });
    const enable = async () => {
      await row
        .getByRole("button", { name: "Enable broadcasts", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Enable group broadcasts?" })
        .getByRole("button", { name: "Enable broadcasts", exact: true })
        .click();
    };
    await enable();
    await expect(page.getByRole("status")).toContainText(
      "We couldn't verify your permission to change broadcasts.",
    );
    await expect(
      row.getByText("Broadcasts disabled", { exact: true }),
    ).toBeVisible();
    await expect(
      row.getByRole("button", { name: "Enable broadcasts", exact: true }),
    ).toBeEnabled();
    expect(await page.locator("main").innerText()).not.toContain(
      "GROUP_AUTHORIZATION_UNAVAILABLE",
    );
    await control({
      action: "b3-broadcast-verification",
      player: identity.player,
      mode: "allow",
    });
    await enable();
    await expect(
      row.getByText("Broadcasts enabled", { exact: true }),
    ).toBeVisible();
  });
}
