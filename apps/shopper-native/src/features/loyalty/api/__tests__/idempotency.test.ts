import { newIdempotencyKey } from "../idempotency";

describe("newIdempotencyKey", () => {
  it("returns a string of exactly 32 characters", () => {
    expect(newIdempotencyKey()).toHaveLength(32);
  });

  it("contains only hexadecimal characters", () => {
    const key = newIdempotencyKey();
    expect(key).toMatch(/^[0-9a-f]{32}$/);
  });

  it("hard-codes position 12 to '4' (UUID v4 version nibble)", () => {
    // Generate multiple keys to rule out coincidence.
    for (let i = 0; i < 20; i++) {
      expect(newIdempotencyKey()[12]).toBe("4");
    }
  });

  it("constrains position 16 to the variant range 8–b", () => {
    for (let i = 0; i < 20; i++) {
      expect(["8", "9", "a", "b"]).toContain(newIdempotencyKey()[16]);
    }
  });

  it("produces unique keys on consecutive calls", () => {
    const keys = Array.from({ length: 100 }, () => newIdempotencyKey());
    const unique = new Set(keys);
    expect(unique.size).toBe(100);
  });

  it("never returns an empty string", () => {
    for (let i = 0; i < 10; i++) {
      expect(newIdempotencyKey().length).toBeGreaterThan(0);
    }
  });

  it("meets the minimum server key length of 16", () => {
    expect(newIdempotencyKey().length).toBeGreaterThanOrEqual(16);
  });
});
