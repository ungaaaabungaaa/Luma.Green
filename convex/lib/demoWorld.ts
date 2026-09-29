import type { Id } from "../_generated/dataModel";

/** What the base seed made, handed to every area's seed hook. */
export interface DemoWorld {
  now: number;
  /** YYYY-MM-DD in India. */
  today: string;
  /** Org ids by slug (see DEMO_ORGS in convex/lib/demo.ts). */
  orgs: Map<string, Id<"orgs">>;
  /** Demo people by role key (see DEMO_ACCOUNTS): profile id, name, phone. */
  profiles: Map<
    string,
    { profileId: Id<"profiles">; name: string; phone: string }
  >;
  files: {
    certificate: Id<"_storage">;
    photoA: Id<"_storage">;
    photoB: Id<"_storage">;
  };
}
