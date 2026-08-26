/**
 * Floor plan lookup: block + exact area -> a specific layout image.
 * Pure function, no DOM access. Matching is deliberately strict — no
 * nearest-area fallback — because a wrong floor plan attached to a
 * client offer is worse than no floor plan at all.
 */

const FLOOR_PLAN_AREA_EPSILON = 1e-6;

/**
 * @param {string} blockNumber
 * @param {number} area
 * @returns {{area:number, rooms:number, block:?string, image:string}|null}
 */
function findFloorPlan(blockNumber, area) {
  if (!Number.isFinite(area)) return null;
  const plans = CONFIG.floorPlans || [];
  const block = blockNumber ? String(blockNumber).trim() : "";

  const sameArea = (plan) => Math.abs(plan.area - area) < FLOOR_PLAN_AREA_EPSILON;

  if (block) {
    const blockSpecific = plans.find((plan) => plan.block && String(plan.block) === block && sameArea(plan));
    if (blockSpecific) return blockSpecific;
  }

  const universal = plans.find((plan) => !plan.block && sameArea(plan));
  return universal || null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { findFloorPlan };
}
