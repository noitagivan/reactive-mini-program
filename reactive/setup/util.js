import {
  isArray,
  isFunction,
  isNonEmptyString,
  isNonNullObject,
  get,
} from "../utils/index";
import {
  captureSignal,
  isWatchable,
  subscribeStateOfSignal,
  useSignal,
  watch,
} from "../state/signal";
import { isValueRefSignal } from "../state/index";

export const partialCLifetimes = ["ready", "moved", "error"];
export const cLifetimes = [
  "created",
  "attached",
  "detached",
  ...partialCLifetimes,
];
export const pLifetimes = ["show", "routeDone", "resize", "hide"];

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

export function createMixObserver(
  src,
  observer,
  { scope, signals, indexesMap }
) {
  const instanceDataObserver = (...values) => {
    observer(
      ...src.map((s) => {
        if (isWatchable(s)) return captureSignal(s, true);
        if (isNonEmptyString(s)) return values[indexesMap.get(s)];
        return undefined;
      })
    );
  };
  const signalsObserver = (...values) => {
    observer(
      ...src.map((s) => {
        if (isWatchable(s)) return values[indexesMap.get(s)];
        if (isNonEmptyString(s)) return get(scope.instance.data, s);
        return undefined;
      })
    );
  };
  const unwatchSignals = watch(signals, signalsObserver).stop;
  return { instanceDataObserver, unwatchSignals };
}

export function createDataBinder(instance) {
  let isSyncing = false;
  const signals = {};
  const unbinds = [];

  const instanceSetData = instance.setData.bind(instance);
  const updateData = (key, val) => isSyncing || instanceSetData({ [key]: val });
  const bind = (name, signal) => {
    const isValueRef = isValueRefSignal(signal);
    signals[name] = useSignal(signal);
    unbinds.push(
      subscribeStateOfSignal(signal, (payload) =>
        updateData(name, isValueRef ? payload.value.value : payload.value)
      )
    );
  };
  const sync = (dataKey) => {
    try {
      isSyncing = true;
      signals[dataKey]?.[1]?.(instance.data[dataKey]);
    } catch (error) {
      throw error;
    } finally {
      isSyncing = false;
    }
  };

  const setData = (data) => {
    if (data && typeof data === "object") {
      instanceSetData(data, () =>
        Object.keys(data).forEach((key) => sync(key.split(".")[0]))
      );
    }
  };

  return { setData, bind, unbinds };
}
