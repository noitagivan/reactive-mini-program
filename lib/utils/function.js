import { isArray, isFunction } from "./type";

export function mergeCallbacks(callbacks, thisArg = null, ...bindArgs) {
  return (...args) => {
    isArray(callbacks) &&
      callbacks
        .filter(isFunction)
        .forEach((callback) => callback.call(thisArg, ...bindArgs, ...args));
    return thisArg;
  };
}

export function onceInvokable(fn, msg) {
  let invoked = false;
  return function (...args) {
    if (invoked) throw new Error(msg);
    invoked = true;
    return fn.call(this, ...args);
  };
}

// 优先使用 queueMicrotask，否则降级到 Promise
export const scheduleMicrotask =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (task) => Promise.resolve().then(task);

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
