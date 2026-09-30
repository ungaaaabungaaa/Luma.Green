"""RFC 6238 TOTP (SHA-1, 6 digits, 30 s) for the dev admin test account."""
import base64, hashlib, hmac, struct, sys, time

def totp(secret_b32: str, at: float | None = None) -> str:
    key = base64.b32decode(secret_b32 + "=" * (-len(secret_b32) % 8), casefold=True)
    counter = int((time.time() if at is None else at) // 30)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 1_000_000:06d}"

if __name__ == "__main__":
    secret = sys.argv[1]
    remaining = 30 - int(time.time()) % 30
    print(totp(secret), f"(valid ~{remaining}s)")
