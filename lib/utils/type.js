export function isSymbol(symbol) {
  return typeof symbol === "symbol";
}

export function isString(str) {
  return typeof str === "string";
}

export function isNonEmptyString(str) {
  return typeof str === "string" && str !== "";
}

export function isNumber(num) {
  return typeof num === "number";
}

export function isPositiveNumber(num) {
  return isNumber(num) && num > 0;
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
