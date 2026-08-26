/**
 * Floor plan lookup: block + exact area -> a specific layout image.
 * Pure function, no DOM access. Matching is deliberately strict — no
 * nearest-area fallback — because a wrong floor plan attached to a
 * client offer is worse than no floor plan at all.
 */

const FLOOR_PLAN_AREA_EPSILON = 1e-6;

/**
 * A plan's `block` can be a single block number, a list of block numbers
 * (when the same layout is shared by a handful of blocks), or omitted
 * entirely for a layout that's genuinely the same in every block.
 */
function planAppliesToBlock(planBlock, block) {
  if (planBlock === null || planBlock === undefined) return true;
  if (!block) return false;
  const list = Array.isArray(planBlock) ? planBlock : [planBlock];
  return list.map(String).includes(block);
}

/**
 * @param {string} blockNumber
 * @param {number} area
 * @returns {{area:number, rooms:number, block:?(string|string[]), image:string}|null}
 */
function findFloorPlan(blockNumber, area) {
  if (!Number.isFinite(area)) return null;
  const plans = CONFIG.floorPlans || [];
  const block = blockNumber ? String(blockNumber).trim() : "";

  const sameArea = (plan) => Math.abs(plan.area - area) < FLOOR_PLAN_AREA_EPSILON;

  // A plan scoped to specific block(s) always wins over a universal one,
  // so a block that has its own dedicated layout for an area never falls
  // through to a generic plan for that same area.
  const scoped = plans.find(
    (plan) => plan.block !== null && plan.block !== undefined && planAppliesToBlock(plan.block, block) && sameArea(plan)
  );
  if (scoped) return scoped;

  const universal = plans.find((plan) => (plan.block === null || plan.block === undefined) && sameArea(plan));
  return universal || null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { findFloorPlan };
}
