import { captureSignal, isWatchable, watch } from "../state/signal";
import { isArray, isNonEmptyString, get } from "../utils/index";

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
