import { isArray } from "./type";

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
