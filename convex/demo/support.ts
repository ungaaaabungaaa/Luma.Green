import type { MutationCtx } from "../_generated/server";
import type { DemoWorld } from "../lib/demoWorld";

/**
 * Sample data for the "support" area, seeded after the base demo world. Runs
 * inside demo:seed and demo:reset; keep it idempotent for one run and only
 * write to this area's own tables (or link to what `world` provides).
 */
export function seedSupport(
  _ctx: MutationCtx,
  _world: DemoWorld,
): Promise<void> {
  return Promise.resolve();
}
