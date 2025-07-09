import { isArray, isFunction, mergeCallbacks } from "../utils/index";
import TrackingScope from "./TrackingScope";
import {
  isRunInSilentScope,
  offScopeDispose,
  onScopeDispose,
} from "./EffectScope";

export const RefSignal = Symbol("RefSignal");
const CONTEXT = {
  signalInfoMap: new WeakMap(),
  setSignalInfo(signal, meta) {
    this.signalInfoMap.set(signal, meta);
  },
  getSignalInfo(signal) {
    return this.signalInfoMap.get(signal);
  },

  watchingScopes: [null],
  pushWatchingScope(scope) {
    this.watchingScopes.unshift(scope);
  },
  popWatchingScope() {
    if (this.watchingScopes.length > 1) {
      this.watchingScopes.shift();
    }
  },
  getCurrentWatchingScope() {
    return this.watchingScopes[0] || null;
  },
};

class WatchingScope extends TrackingScope {
  isEffectOccurring = false;
  constructor(effect, { onTrack, onTrigger, onComputed } = {}) {
    super({
      onTrigger,
      onTrack,
      onComputed,
      onSignal: ({ signal, value }) => {
        this.isEffectOccurring = true;
        this.runEffect({ signal, value });
        this.isEffectOccurring = false;
      },
    });
    this.runEffect = (triggerer) => (this.run(effect, triggerer), this);
  }
  run(fn, triggerer) {
    super.run(fn, {
      setScope: () => CONTEXT.pushWatchingScope(this),
      resetScope: () => CONTEXT.popWatchingScope(),
      triggerer,
    });
  }
}

class State {
  value = undefined;
  watchable = false;
  setterScopeSet = new Set();
  constructor(value, isComputed) {
    this.value = value;
    const watchable = !isRunInSilentScope();
    if (watchable) {
      this.watchable = true;
      this.get = this.get.bind(this);
      this.set = this.set.bind(this);
      this.subscribe = this.subscribe.bind(this);
    } else {
      this.get = this._get.bind(this);
      this.set = this._set.bind(this);
      this.subscribe = this._subscribe.bind(this);
    }

    CONTEXT.setSignalInfo(this.get, {
      state: this,
      isComputed,
      watchable,
      watchers: watchable ? new Set() : null,
    });
  }
  _get() {
    return this.value;
  }
  get() {
    CONTEXT.getCurrentWatchingScope()?.track({
      signal: this.get,
      value: this._get(),
    });
    return this._get();
  }
  _set(newValue) {
    this.value = newValue;
  }
  set(newValue) {
    const scope = CONTEXT.getCurrentWatchingScope();
    if (scope) {
      if (scope.isTrackForCompute) {
        throw new Error("cannot update state in computed scope");
      }
      if (scope.hasTracked(this.get)) {
        throw new Error("cannot update state in circular dependency scope");
      }
      this.setterScopeSet.add(scope);
    }
    const oldValue = this._get();
    if (newValue !== oldValue) {
      this._set(newValue);
      const { watchers } = CONTEXT.getSignalInfo(this.get) || {};
      if (watchers?.size) {
        mergeCallbacks(Array.from(watchers.values()), null, {
          signal: this.get,
          value: this._get(),
          oldValue,
        })();
      }
    }
  }
  _subscribe(cb) {
    return () => {};
  }
  subscribe(cb) {
    if (isRunInSilentScope()) return this._subscribe;
    const { watchers } = CONTEXT.getSignalInfo(this.get);
    const unsubscribe = () => {
      watchers.delete(cb);
      offScopeDispose(unsubscribe);
    };
    watchers.add(cb);
    onScopeDispose(unsubscribe);
    return unsubscribe;
  }
}

export const isSignal = (signal) =>
  isFunction(signal) && !!CONTEXT.getSignalInfo(signal);

export const isWatchableSignal = (signal) =>
  isSignal(signal) && CONTEXT.getSignalInfo(signal).watchable === true;

export const isWatchable = (source) =>
  isWatchableSignal(source) || isWatchableSignal(source?.[RefSignal]);

export const isComputed = (signal) =>
  isSignal(signal) && CONTEXT.getSignalInfo(signal).isComputed === true;

export const updateSignal = (signal, newValue) =>
  CONTEXT.getSignalInfo(signal)?.state?.set(newValue);

export const subscribeSignal = (signal, handle) =>
  CONTEXT.getSignalInfo(signal)?.state?.subscribe(handle) || (() => {});

export function useSignal(value) {
  if (CONTEXT.getCurrentWatchingScope()) {
    console.log("defineProps", CONTEXT.getCurrentWatchingScope());
    throw new Error("cannot define state in effect");
  }
  const { get, set } = isSignal(value)
    ? (() => {
        const { state, isComputed } = CONTEXT.getSignalInfo(value);
        return isComputed ? { get: value } : state;
      })()
    : new State(value);
  return [get, set];
}

export function watch(
  signals,
  cb,
  { immediate = false, onTrack = null, onTrigger = null, once = false } = {}
) {
  if (CONTEXT.getCurrentWatchingScope()) {
    throw new Error("cannot watch state in effect");
  }
  if (isFunction(cb) === false) {
    console.warn("watch callback must be a function");
    return TrackingScope.emptyWatchHandle;
  }
  if (isRunInSilentScope()) return TrackingScope.emptyWatchHandle;
  signals = isWatchable(signals[RefSignal])
    ? [signals]
    : isArray(signals)
    ? signals.filter(isWatchable)
    : [];
  if (signals.length === 0) return TrackingScope.emptyWatchHandle;
  const effect = () => {
    const values = signals.map((signal) =>
      isSignal(signal) ? signal() : signal[RefSignal]()
    );
    cb(...values);
    if (once) scope.stop();
  };
  const scope = new WatchingScope(effect, { onTrack, onTrigger });
  scope.run(mergeCallbacks(signals.filter(isSignal)), {});
  scope.canTrack = (signal) => false;
  if (immediate) scope.runEffect({});
  return scope.exposeHanlde();
}

export function watchEffect(effect, { onTrack = null, onTrigger = null } = {}) {
  if (CONTEXT.getCurrentWatchingScope()) {
    throw new Error("cannot watch effect in effect");
  }
  if (isRunInSilentScope()) return TrackingScope.emptyWatchHandle;
  const scope = new WatchingScope(effect, { onTrack, onTrigger });
  scope.runEffect({});
  return scope.exposeHanlde();
}

export function computed(computer, { onTrack = null, onTrigger = null } = {}) {
  if (CONTEXT.getCurrentWatchingScope()) {
    throw new Error("cannot define computed state in effect");
  }
  const { get, set, watchable, setterScopeSet } = new State(computer(), true);
  if (watchable) {
    setterScopeSet.add(
      new WatchingScope(() => computer(), {
        onTrack,
        onTrigger,
        onComputed: (result) => set(result),
      }).runEffect({})
    );
  }
  return get;
}
