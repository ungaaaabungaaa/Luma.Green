import {
  PHOTO_PROMPT_VERSION,
  type PhotoEstimateReply,
} from "../../../convex/lib/photoEstimates";

const TTL_MS = 5 * 60 * 1000;
const CAPACITY = 3;

async function digest(value: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Per-form memory only. Keys are hashes; images, prices and identities are never retained. */
export function createPhotoEstimateCache(
  hash: (value: string) => Promise<string> = digest,
) {
  const entries = new Map<
    string,
    {
      promise: Promise<PhotoEstimateReply>;
      expires: number;
      timer?: ReturnType<typeof setTimeout>;
    }
  >();
  const state = { generation: 0 };
  function remove(key: string) {
    clearTimeout(entries.get(key)?.timer);
    entries.delete(key);
  }
  return {
    async run(
      image: string,
      catalogue: string,
      request: () => Promise<PhotoEstimateReply>,
    ): Promise<PhotoEstimateReply> {
      const generation = state.generation;
      // Hashing happens locally before any network call. A failed browser hash must not hide manual entry.
      const key = await hash(`${PHOTO_PROMPT_VERSION}:${catalogue}:${image}`);
      if (generation !== state.generation) return { status: "unavailable" };
      const previous = entries.get(key);
      if (previous && previous.expires > Date.now()) return previous.promise;
      remove(key);
      while (entries.size >= CAPACITY) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        remove(oldest);
      }
      async function requestOnce() {
        return request();
      }
      const entry = {
        promise: requestOnce(),
        expires: Date.now() + TTL_MS,
        timer: undefined as ReturnType<typeof setTimeout> | undefined,
      };
      entries.set(key, entry);
      entry.timer = setTimeout(() => {
        if (entries.get(key) === entry) remove(key);
      }, TTL_MS);
      try {
        const reply = await entry.promise;
        if (reply.status !== "ok" && entries.get(key) === entry) remove(key);
        return reply;
      } catch (error) {
        if (entries.get(key) === entry) remove(key);
        throw error;
      }
    },
    clear() {
      state.generation += 1;
      for (const key of entries.keys()) remove(key);
    },
  };
}
