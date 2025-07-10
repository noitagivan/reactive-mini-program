import { isPositiveNumber } from "./type";

export function formatPositiveInteger(num, def = 0) {
  return isPositiveNumber(num) ? Math.round(num) || def : def;
}
