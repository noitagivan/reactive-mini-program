import { isArray } from "./type";

/**
 * @template T
 * @param {T[] | any} existsEles
 * @param {(T | any)[] | any} newComeEles
 * @param {(el: any)=> el is T} check
 * @returns {T[]}
 */
export function mergeArrayOrderByExists(
  existsEles,
  newComeEles,
  check = () => true
) {
  const arr = isArray(existsEles)
    ? existsEles.filter((el) => !newComeEles.includes(el))
    : [];
  if (isArray(newComeEles)) {
    newComeEles.forEach((el) => check(el) && arr.push(el));
  }

  return arr;
}

/**
 * @template T
 * @param {T[] | any} existsEles
 * @param {(T | any)[] | any} newComeEles
 * @param {(el: any)=> el is T} check
 * @returns {T[]}
 */
export function mergeArrayOrderByNewCome(
  existsEles,
  newComeEles,
  check = () => true
) {
  const arr = isArray(existsEles) ? [...existsEles] : [];
  if (isArray(newComeEles)) {
    newComeEles.forEach((el) => check(el) && !arr.includes(el) && arr.push(el));
  }
  return arr;
}
