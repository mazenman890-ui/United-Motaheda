/**
 * Idempotency key generation for loyalty mutations.
 *
 * Server requires key length >= 16. We generate 32-char hex (UUID v4 stripped
 * of dashes) so a collision over the 7-day key TTL is astronomically unlikely.
 *
 * NOT cryptographically signed — the server doesn't trust the key for
 * authentication, only for uniqueness across same-user requests.
 */

function rng(): number {
  // Hermes provides Math.random; this is fine for non-secret uniqueness.
  return Math.random();
}

/** RFC 4122 v4 UUID, dashes removed. */
export function newIdempotencyKey(): string {
  let out = "";
  for (let i = 0; i < 32; i++) {
    if (i === 12) {
      out += "4";
      continue;
    }
    if (i === 16) {
      out += ((Math.floor(rng() * 16) & 0x3) | 0x8).toString(16);
      continue;
    }
    out += Math.floor(rng() * 16).toString(16);
  }
  return out;
}
