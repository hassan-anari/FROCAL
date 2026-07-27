import { describe, expect, it } from "vitest";

type ReferralRow = {
  id: string;
  name: string;
  level: number;
  status: "Active" | "Pending";
  invitedAt: string;
  tone: "cyan" | "violet" | "gold" | "blue" | "pink";
  earnedXp?: number;
  activation?: string;
  useTelegramPhoto?: boolean;
};

describe("referral row contract", () => {
  it("allows Telegram photo metadata to be optional", () => {
    const rows: readonly ReferralRow[] = [
      {
        id: "ref-1",
        name: "Aria Moon",
        level: 8,
        status: "Active",
        invitedAt: "Jul 25",
        tone: "cyan",
        useTelegramPhoto: true,
      },
      {
        id: "ref-2",
        name: "Nova Reed",
        level: 6,
        status: "Active",
        invitedAt: "Jul 24",
        tone: "violet",
      },
    ];

    expect(rows[0]?.useTelegramPhoto).toBe(true);
    expect(rows[1]?.useTelegramPhoto).toBeUndefined();
  });
});
