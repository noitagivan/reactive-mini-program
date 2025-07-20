import { isPositiveNumber } from "./type";

/**
 *
 * @param {number} num
 * @param {number} def
 * @returns {number}
 */
export function formatPositiveInteger(num, def = 0) {
  return isPositiveNumber(num) ? Math.round(num) || def : def;
}
