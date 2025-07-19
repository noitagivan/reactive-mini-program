/**
 * @typedef {'px'|'rpx'|'em'|'rem'|'vh'|'vw'|'vmin'|'vmax'|'cm'|'mm'|'in'|'pt'|'pc'} unit
 */

/**
 * 检查是否是数组
 * @returns {arr is Array}
 */
export function isArray(arr) {
  return isObject(arr) && arr instanceof Array;
}

/**
 * 检查是否是非空数组
 * @returns {arr is Array}
 */
export function isNonEmptyArray(arr) {
  return isArray(arr) && arr.length > 0;
}

/**
 * 检查是否是布尔类型
 */
export function isBoolean(bool) {
  return typeof bool === "boolean";
}

/**
 * 检查是否是函数
 * @returns {fn is (...args:unknown[])=>unknown}
 */
export function isFunction(fn) {
  return typeof fn === "function";
}

/**
 * 检查是否是构造函数（类）
 * @returns {fn is new (...args:unknown[])=>InstanceType<typeof fn}
 */
export function isConstructor(fn) {
  return (
    isFunction(fn) &&
    Object.prototype.hasOwnProperty.call(fn, "prototype") &&
    fn.prototype.constructor === fn
  );
}

/**
 * 检查是否是函数
 * @returns {fn is ParamLessFunction}
 */
export function isParamLessFunction(fn) {
  console.error("isParamLessFunction", typeof fn.name, fn.name, fn.length, fn);
  return typeof fn === "function" && fn.length === 0;
}

/**
 * 检查是否是函数
 * @returns {fn is (...args)=>unknown}
 */
export function isNameLessFunction(fn) {
  return typeof fn === "function" && fn.name === "";
}

/**
 * 检查是否是数类型（不包括NaN和Infinity）
 * @returns {num is number}
 */
export function isNumber(num) {
  return typeof num === "number" && Number.isFinite(num);
}

/**
 * 检查是否是整数
 * @returns {num is number}
 */
export function isInteger(num) {
  return Number.isInteger(num);
}

/**
 * 检查是否是正整数
 * @returns {num is number}
 */
export function isPositiveNumber(num) {
  return isNumber(num) && num > 0;
}

/**
 * 检查是否是自然数（非负整数）
 * @returns {num is number}
 */
export function isNaturalNumber(num) {
  return isInteger(num) && num >= 0;
}

/**
 * 检查是否是正整数
 * @returns {num is number}
 */
export function isPositiveInteger(num) {
  return isInteger(num) && num > 0;
}

/**
 * 检查是否是浮点数
 * @returns {num is number}
 */
export function isFloat(num) {
  return isNumber(num) && !Number.isInteger(num);
}

/**
 * 检查是否是正浮点数
 * @returns {num is number}
 */
export function isPositiveFloat(num) {
  return isFloat(num) && num > 0;
}

/**
 * 检查是否是对象
 * @returns {obj is object}
 */
export function isObject(obj) {
  return typeof obj === "object";
}

/**
 * 检查是否是非null对象
 * @returns {obj is NonNullable<object>}
 */
export function isNonNullObject(obj) {
  return isObject(obj) && obj !== null;
}

/**
 * 检查是否是非空对象
 * @returns {obj is NonNullable<object>}
 */
export function isNonEmptyObject(obj) {
  return isPlainObject(obj) && Object.keys().length > 0;
}

/**
 * 检查是否是集合
 * @returns {arr is Set}
 */
export function isSet(set) {
  return isObject(set) && set instanceof Set;
}

/**
 * 检查是否是字典
 * @returns {arr is Map}
 */
export function isMap(map) {
  return isObject(map) && map instanceof Map;
}

/**
 * 检查是否是弱引用字典
 * @returns {arr is WeakMap}
 */
export function isWeakMap(map) {
  return isObject(map) && map instanceof WeakMap;
}

/**
 * 检查是否是基础纯对象
 * @returns {obj is Record<string, unknown>}
 */
export function isPlainObject(obj) {
  return (
    isObject(obj) && Object.prototype.toString.call(obj) === "[object Object]"
  );
}

/**
 * 检查是否是字符串类型
 */
export function isString(str) {
  return typeof str === "string";
}

/**
 * 检查是否是非空字符串类型
 * @returns {str is string}
 */
export function isNonEmptyString(str) {
  return typeof str === "string" && str !== "";
}

/**
 * 检查是否是有效的数字字符串（可转换为数字的字符串）
 * @returns {str is `${number}`}
 */
export function isNumericString(str) {
  if (typeof str !== "string") return false;
  return !isNaN(str) && !isNaN(parseFloat(str));
}

/**
 * 检查是否是有效的整数字符串
 * @returns {str is `${number}`}
 */
export function isIntegerString(str) {
  return typeof str === "string" && /^-?\d+$/.test(str.trim());
}

/**
 * 检查是否是有效的浮点数字符串
 * @returns {str is `${number}`}
 */
export function isFloatString(str) {
  if (typeof str !== "string") return false;
  const trimmed = str.trim();
  return /^-?\d*\.\d+$/.test(trimmed) || /^-?\d+\.\d*$/.test(trimmed);
}

/**
 * 检查是否是带单位的字符串（如"10px"、"5rem"等）
 * @returns {str is `${number}${unit}`}
 */
export function isDimensionString(str) {
  if (typeof str !== "string") return false;
  return /^-?\d+(\.\d+)?(px|rpx|em|rem|vh|vw|vmin|vmax|cm|mm|in|pt|pc)$/.test(
    str.trim()
  );
}

/**
 * 检查是否是百分比字符串
 * @returns {str is `${number}%`}
 */
export function isPercentageString(str) {
  if (typeof str !== "string") return false;
  return /^-?\d+(\.\d+)?%$/.test(str.trim());
}

/**
 * 检查是否是数字或数字字符串（不包含单位）
 * @returns {value is number|`${number}%`}
 */
export function isNumeric(value) {
  return isNumber(value) || isNumericString(value);
}

/**
 * 检查是否是数字或带单位/百分比的字符串
 * @returns {value is number|`${number}`|`${number}%`|`${number}${unit}`}
 */
export function isMeasurable(value) {
  return (
    isNumeric(value) || isDimensionString(value) || isPercentageString(value)
  );
}

/**
 * 检查是否是symbol类型
 */
export function isSymbol(symbol) {
  return typeof symbol === "symbol";
}
