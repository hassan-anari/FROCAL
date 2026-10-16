import { expect, it } from "vitest";
import fixture from "./fixtures/b4/profile-earn.json";
import history from "./fixtures/b4/typing-history.json";
import rankings from "./fixtures/b4/rankings.json";
import dlx from "./fixtures/b4/dlx-confirmed.json";
import * as c from "./b4Contracts";
import { arenaStateSchema, playerRankPageSchema } from "./arena";
import { dlxBalanceSchema } from "./dlx";

it("consumes the exact published B4 receipts and distinguishes duplicate and empty settlement", () => {
  for (const response of [fixture.daily_claim, fixture.daily_duplicate]) c.dailyClaimSchema.parse(response);
  c.missionClaimSchema.parse(fixture.mission_claim);
  c.submitSchema.parse(fixture.typing_result);
  for (const response of [fixture.typing_claim, fixture.typing_duplicate, fixture.typing_empty_claim]) c.typingClaimSchema.parse(response);
  expect(c.dailyClaimSchema.parse(fixture.daily_duplicate).reward?.created).toBe(false);
  expect(c.typingClaimSchema.parse(fixture.typing_empty_claim).reward).toBeNull();
});
it("preserves actual run identity, rejected runs and server score separately from credit", () => {
  const first = c.typingHistorySchema.parse(history.first_page);
  const last = c.typingHistorySchema.parse(history.last_page);
  expect(first.items[0].score).toBe(5700);
  expect(first.items[0].reward_amount).toBe(70);
  expect(last.items[0].status).toBe("REJECTED");
  expect(last.items[0].reward_amount).toBe(0);
});
it("types the published archive/DLX reads without enabling a new visual surface", () => {
  arenaStateSchema.parse(fixture.arena_state);
  expect(playerRankPageSchema.parse(rankings.archived).archived).toBe(true);
  expect(dlxBalanceSchema.parse(dlx)).toMatchObject({ claimable: 0, transferable: false, on_chain: false });
});
