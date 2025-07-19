import { isGetter, isSignal, useComputedSignal } from "../../state/signal";
import {
  isArray,
  isFunction,
  isNonEmptyString,
  isNonNullObject,
} from "../../utils/index";

export function formatSetupOptions(setup, options) {
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
  let source = isArray(src) ? [...src] : src;
  let key = "";
  let signals = [];
  const indexesMap = new Map();
  if (isNonEmptyString(src)) {
    key = src;
  } else if (isArray(src)) {
    key = src
      .filter((s, i) => {
        if (isNonEmptyString(s)) return true;
        if (scope) {
          if (isSignal(s)) {
            indexesMap.set(s, signals.length);
            signals.push(s);
          } else if (isGetter(s)) {
            source[i] = useComputedSignal(s);
            indexesMap.set(source[i], signals.length);
            signals.push(source[i]);
          }
        }
        return false;
      })
      .map((s, i) => (indexesMap.set(s, i), s))
      .join(",");
  } else if (scope) {
    if (isSignal(src)) {
      signals.push(src);
    } else if (isGetter(src)) {
      source = useComputedSignal(src);
      signals.push(source);
    }
  }
  return { source, key, signals, indexesMap };
}
