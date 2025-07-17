import { isWatchable } from "../../state/signal";
import {
  isArray,
  isFunction,
  isNonEmptyString,
  isNonNullObject,
} from "../../utils/index";

export function formatOptions(setup, options) {
  if (isFunction(setup)) {
    if (isNonNullObject(options)) return { ...options, setup };
    return { setup };
  } else if (isNonNullObject(setup)) {
    const { setup: setupFunc, ...opts } = setup;
    if (isFunction(setupFunc)) return { ...opts, setup: setupFunc };
    return { ...opts };
  }
  return {};
}

export function formatObserveSource(src, scope) {
  let key = "";
  let signals = [];
  const indexesMap = new Map();
  if (isNonEmptyString(src)) {
    key = src;
  } else if (isArray(src)) {
    key = src
      .filter((s) => {
        if (isNonEmptyString(s)) return true;
        if (scope && isWatchable(s)) {
          indexesMap.set(s, signals.length);
          signals.push(s);
        }
        return false;
      })
      .map((s, i) => (indexesMap.set(s, i), s))
      .join(",");
  } else if (scope && isWatchable(src)) {
    signals.push(src);
  }
  return { key, signals, indexesMap };
}
