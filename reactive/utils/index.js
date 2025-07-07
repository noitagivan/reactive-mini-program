export function isString(str) {
  return typeof str === "string";
}

export function isNonEmptyString(str) {
  return str && typeof str === "string";
}

export function isNumber(num) {
  return typeof num === "number";
}

export function isPositiveNumber(num) {
  return isNumber(num) && num > 0;
}

export function formatPositiveInteger(num, def = 0) {
  return isPositiveNumber(num) ? Math.round(num) || def : def;
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

export function mergeCallbacks(cbs, thisArg = null, ...bindArgs) {
  return (...args) =>
    cbs
      .filter(isFunction)
      .forEach((cb) => cb.call(thisArg, ...bindArgs, ...args));
}

export function onceInvokable(fn, msg) {
  let invoked = false;
  return function (...args) {
    if (invoked) throw new Error(msg);
    invoked = true;
    return fn.call(this, ...args);
  };
}

export function isObject(obj) {
  return typeof obj === "object";
}

export function isNonNullObject(obj) {
  return obj && isObject(obj);
}

export function isArray(arr) {
  return isObject(arr) && arr instanceof Array;
}

// 优先使用 queueMicrotask，否则降级到 Promise
export const scheduleMicrotask =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (callback) => Promise.resolve().then(callback);
