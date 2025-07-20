import { isArray, isFunction } from "./type";

/**
 * @template {unknown} T
 * @template {any[]} A1
 * @template {any[]} A2
 * @param {CommonFunction<unknown, [...A1,...A2]>[]} callbacks
 * @param {T} [thisArg=null]
 * @param  {A1} bindArgs
 * @returns {CommonFunction<T, A2>}
 */
export function mergeCallbacks(callbacks, thisArg = null, ...bindArgs) {
  return (...args) => {
    isArray(callbacks) &&
      callbacks
        .filter(isFunction)
        .forEach((callback) => callback.call(thisArg, ...bindArgs, ...args));
    return thisArg;
  };
}

/**
 * @template {unknown} T
 * @template {unknown[]} A
 * @param {CommonFunction<T, A>} fn
 * @param {string} msg
 * @returns {CommonFunction<T, A>}
 */
export function onceInvokable(fn, msg) {
  let invoked = false;
  return function (...args) {
    if (invoked) throw new Error(msg);
    invoked = true;
    return fn.call(this, ...args);
  };
}

/**
 * scheduleMicrotask
 *
 * 优先使用 queueMicrotask，否则降级到 Promise
 */
export const scheduleMicrotask =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (task) => Promise.resolve().then(task);

/**
 * @template {unknown[]} T
 * @param {RMPVoidFunction<T>} fn
 * @param {RMPVoidFunction<T>} onTrigger
 * @returns {RMPVoidFunction<T>}
 */
export const debounceMicrotask = (fn, onTrigger) => {
  let pending = false;
  let latestArgs;

  return function (...args) {
    latestArgs = args;
    onTrigger?.(...args);

    if (!pending) {
      pending = true;
      scheduleMicrotask(() => {
        const applyArgs = latestArgs;
        latestArgs = undefined;
        pending = false;
        fn(...applyArgs);
      });
    }
  };
};
