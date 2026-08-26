/**
 * Genplan (site plan) block lookup. Pure functions, no DOM access —
 * app.js decides how to render the result. The actual highlighting is
 * driven entirely by CONFIG.genplan, so adding/fixing a block's
 * position never requires touching this file.
 */

function hasGenplanImage() {
  return Boolean(CONFIG.genplan && CONFIG.genplan.image);
}

/**
 * Returns the highlight rectangle for a block number, or null if the
 * genplan isn't configured yet or this specific block has no known
 * position — callers must treat null as "don't show a highlight" rather
 * than guessing.
 *
 * @param {string} blockNumber
 * @returns {{x:number, y:number, width:number, height:number}|null}
 */
function getBlockRegion(blockNumber) {
  if (!hasGenplanImage() || !blockNumber) return null;
  const key = String(blockNumber).trim();
  if (!key) return null;
  return CONFIG.genplan.blocks[key] || null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { hasGenplanImage, getBlockRegion };
}
