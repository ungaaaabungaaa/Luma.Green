import { createHmac } from "node:crypto";

// RFC 6238 SHA-1 code from the manual enrollment key shown by the real UI.
export function currentCode(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of secret.toUpperCase().replaceAll(/\s|=/g, "")) {
    const digit = alphabet.indexOf(character);
    if (digit === -1) throw new Error("Invalid local authenticator key");
    bits += digit.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  const counter = Buffer.alloc(8);
  const interval = Math.floor(Date.now() / 30_000);
  counter.writeBigUInt64BE(BigInt(interval));
  const digest = createHmac("sha1", Buffer.from(bytes))
    .update(counter)
    .digest();
  const offset = digest.readUInt8(digest.length - 1) & 15;
  const integer = digest.readUInt32BE(offset) & 0x7f_ff_ff_ff;
  return String(integer % 1_000_000).padStart(6, "0");
}
