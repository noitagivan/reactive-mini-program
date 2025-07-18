export function isSymbol(symbol) {
  return typeof symbol === "symbol";
}

/**
 * 检查是否是数字类型（不包括NaN和Infinity）
 */
export function isNumber(num) {
  return typeof num === "number" && Number.isFinite(num);
}

/**
 * 检查是否是整数
 */
export function isInteger(num) {
  return Number.isInteger(num);
}

export function isPositiveNumber(num) {
  return isNumber(num) && num > 0;
}

/**
 * 检查是否是自然数（非负整数）
 */
export function isNaturalNumber(num) {
  return isInteger(num) && num >= 0;
}

/**
 * 检查是否是正整数
 */
export function isPositiveInteger(num) {
  return isInteger(num) && num > 0;
}

/**
 * 检查是否是浮点数
 */
export function isFloat(num) {
  return isNumber(num) && !Number.isInteger(num);
}

/**
 * 检查是否是正浮点数
 */
export function isPositiveFloat(num) {
  return isFloat(num) && num > 0;
}

export function isString(str) {
  return typeof str === "string";
}

export function isNonEmptyString(str) {
  return typeof str === "string" && str !== "";
}

/**
 * 检查是否是有效的数字字符串（可转换为数字的字符串）
 */
export function isNumericString(value) {
  if (typeof value !== "string") return false;
  return !isNaN(value) && !isNaN(parseFloat(value));
}

/**
 * 检查是否是有效的整数字符串
 */
export function isIntegerString(value) {
  return typeof value === "string" && /^-?\d+$/.test(value.trim());
}

/**
 * 检查是否是有效的浮点数字符串
 */
export function isFloatString(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return /^-?\d*\.\d+$/.test(trimmed) || /^-?\d+\.\d*$/.test(trimmed);
}

/**
 * 检查是否是带单位的字符串（如"10px"、"5rem"等）
 */
export function isDimensionString(value) {
  if (typeof value !== "string") return false;
  return /^-?\d+(\.\d+)?(px|rpx|em|rem|vh|vw|vmin|vmax|cm|mm|in|pt|pc)$/.test(
    value.trim()
  );
}

/**
 * 检查是否是百分比字符串
 */
export function isPercentageString(value) {
  if (typeof value !== "string") return false;
  return /^-?\d+(\.\d+)?%$/.test(value.trim());
}

/**
 * 检查是否是数字或数字字符串（不包含单位）
 */
export function isNumeric(value) {
  return isNumber(value) || isNumericString(value);
}

/**
 * 检查是否是数字或带单位/百分比的字符串
 */
export function isMeasurable(value) {
  return (
    isNumeric(value) || isDimensionString(value) || isPercentageString(value)
  );
}

export function isFunction(fn) {
  return typeof fn === "function";
}

export function isConstructor(fn) {
  return (
    isFunction(fn) &&
    fn.hasOwnProperty("prototype") &&
    fn.prototype.constructor === fn
  );
}

export function isObject(obj) {
  return typeof obj === "object";
}

export function isNonNullObject(obj) {
  return isObject(obj) && obj !== null;
}

export function isArray(arr) {
  return isObject(arr) && arr instanceof Array;
}

export function isNonEmptyArray(arr) {
  return isArray(arr) && arr.length > 0;
}

export function isSet(set) {
  return isObject(set) && set instanceof Set;
}

export function isMap(map) {
  return isObject(map) && map instanceof Map;
}

export function isWeakMap(map) {
  return isObject(map) && map instanceof WeakMap;
}

export function isPlainObject(obj) {
  return (
    isObject(obj) && Object.prototype.toString.call(obj) === "[object Object]"
  );
}

export function isNonEmptyObject(obj) {
  return isPlainObject(obj) && Object.keys().length > 0;
}
