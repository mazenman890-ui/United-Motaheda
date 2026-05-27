import { loyaltyKeys } from "../queryKeys";

describe("loyaltyKeys", () => {
  describe("history()", () => {
    it("includes filter opts in the key so different filters get separate cache slots", () => {
      const all      = loyaltyKeys.history();
      const earnOnly = loyaltyKeys.history({ kind: "earn" });
      const redeemOnly = loyaltyKeys.history({ kind: "redeem" });

      expect(all).not.toEqual(earnOnly);
      expect(earnOnly).not.toEqual(redeemOnly);
    });

    it("normalises missing opts to null (not undefined) so the key is stable", () => {
      const a = loyaltyKeys.history({});
      const b = loyaltyKeys.history();
      // Both should have the same serialised form.
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it("treats same opts as identical", () => {
      const a = loyaltyKeys.history({ kind: "earn", source: "order" });
      const b = loyaltyKeys.history({ kind: "earn", source: "order" });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it("includes the 'loyalty' and 'history' segments", () => {
      const key = loyaltyKeys.history({ kind: "earn" });
      expect(key[0]).toBe("loyalty");
      expect(key[1]).toBe("history");
    });
  });

  describe("balance()", () => {
    it("is prefixed with 'loyalty'", () => {
      expect(loyaltyKeys.balance()[0]).toBe("loyalty");
    });

    it("returns a stable reference shape", () => {
      expect(loyaltyKeys.balance()).toEqual(["loyalty", "balance"]);
    });
  });

  describe("validateCoupon()", () => {
    it("uppercases and trims the code so cache collisions don't occur on case variants", () => {
      const lower = loyaltyKeys.validateCoupon("  abc123  ");
      const upper = loyaltyKeys.validateCoupon("ABC123");
      expect(lower).toEqual(upper);
    });
  });
});
