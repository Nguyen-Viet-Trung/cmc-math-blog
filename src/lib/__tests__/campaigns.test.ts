import { describe, expect, it } from "vitest";
import { formatDateVNLocal } from "../format";
import {
  findNewlyEligibleAwards,
  getCampaignPhase,
  slugifyCampaignTitle,
  validateCampaignAwardInput,
  validateCampaignInput,
} from "../campaign-rules";

describe("campaign-rules", () => {
  it("computes upcoming, active, and ended phases accurately", () => {
    const start = "2026-10-01T00:00:00.000Z";
    const end = "2026-10-15T23:59:59.000Z";

    expect(
      getCampaignPhase(start, end, new Date("2026-09-30T23:59:59.000Z").getTime())
    ).toBe("upcoming");
    expect(
      getCampaignPhase(start, end, new Date("2026-10-05T12:00:00.000Z").getTime())
    ).toBe("active");
    expect(
      getCampaignPhase(start, end, new Date("2026-10-16T00:00:00.000Z").getTime())
    ).toBe("ended");
  });

  it("validates campaign dates and title properly", () => {
    const invalidOrder = validateCampaignInput({
      title: "Giải Toán Mùa Thu",
      startsAt: "2026-11-10T00:00:00.000Z",
      endsAt: "2026-11-01T00:00:00.000Z",
    });
    expect(invalidOrder.ok).toBe(false);

    const valid = validateCampaignInput({
      title: "  Giải Toán Mùa Thu CMC  ",
      description: "Thi đấu trực tuyến",
      startsAt: "2026-11-01T00:00:00.000Z",
      endsAt: "2026-11-20T00:00:00.000Z",
      coverColor: "unknown-color",
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.title).toBe("Giải Toán Mùa Thu CMC");
      expect(valid.coverColor).toBe("blue");
    }
  });

  it("validates award thresholds, bonus points, and badge options", () => {
    expect(
      validateCampaignAwardInput({
        title: "Giải Nhất",
        requiredCompletedCount: 0,
        bonusPoints: 50,
        badgeName: "Vô Địch",
      }).ok
    ).toBe(false);

    const ok = validateCampaignAwardInput({
      title: "Chiến Binh Bất Đẳng Thức",
      requiredCompletedCount: 3,
      bonusPoints: 100,
      badgeName: "Bất Đẳng Thức Vàng",
      badgeIcon: "crown",
      badgeColor: "amber",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.badgeIcon).toBe("crown");
      expect(ok.badgeColor).toBe("amber");
      expect(ok.bonusPoints).toBe(100);
    }
  });

  it("unlocks only newly eligible awards and skips already granted ones", () => {
    const awards = [
      { id: "a1", requiredCompletedCount: 1 },
      { id: "a2", requiredCompletedCount: 2 },
      { id: "a3", requiredCompletedCount: 5 },
    ];
    const granted = new Set(["a1"]);

    const newly = findNewlyEligibleAwards(awards, 3, granted);
    expect(newly.map((a) => a.id)).toEqual(["a2"]);
    expect(findNewlyEligibleAwards(awards, 0, new Set())).toEqual([]);
  });

  it("slugifies Vietnamese campaign titles cleanly", () => {
    expect(slugifyCampaignTitle("Giải Đấu Toán Mùa Thu 2026!")).toBe(
      "giai-dau-toan-mua-thu-2026"
    );
  });

  it("formats campaign timestamps in Asia/Ho_Chi_Minh timezone", () => {
    expect(formatDateVNLocal("2026-10-31T17:00:00.000Z")).toBe("01/11/2026");
  });
});
