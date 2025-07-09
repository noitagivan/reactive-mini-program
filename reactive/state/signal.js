import {
  isArray,
  isFunction,
  isNonNullObject,
  mergeCallbacks,
} from "../utils/index";
import TrackingScope from "./TrackingScope";
import {
  isRunInSilentScope,
  offScopeDispose,
  onScopeDispose,
} from "./EffectScope";

const ProtectedSignal = Symbol("ProtectedSignal");
const ComputedSignal = Symbol("ComputedSignal");

const CONTEXT = {
  signalInfoMap: new WeakMap(),
  refMap: new WeakMap(),
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
  isTrackForCompute = false;
  constructor(effect, { isTrackForCompute, ...configs } = {}) {
    super({
      ...configs,
      isSync: isTrackForCompute,
      onSignal: ({ signal, value }) => {
        this.isEffectOccurring = true;
        this.runEffect({ signal, value });
        this.isEffectOccurring = false;
      },
    });
    this.isTrackForCompute = true;
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
  constructor(value) {
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
  isWatchableSignal(source) ||
  isWatchableSignal(CONTEXT.refMap.get(source)?.signal);

export const isComputedSignal = (signal) => !!signal[ComputedSignal];

export const updateSignal = (signal, newValue) =>
  CONTEXT.getSignalInfo(signal)?.state?.set(newValue);

export const subscribeSignal = (signalOrRef, handle) =>
  isWatchableSignal(signalOrRef)
    ? CONTEXT.getSignalInfo(signalOrRef).state.subscribe(handle)
    : isWatchableSignal(CONTEXT.refMap.get(signalOrRef)?.signal)
    ? CONTEXT.getSignalInfo(
        CONTEXT.refMap.get(signalOrRef).signal
      ).state.subscribe(handle)
    : () => {};

export function useSignal(value) {
  if (CONTEXT.getCurrentWatchingScope()) {
    console.log("defineProps", CONTEXT.getCurrentWatchingScope());
    throw new Error("cannot define state in effect");
  }
  let state;
  if (isSignal(value)) {
    if (value[ProtectedSignal]) {
      return [value, null];
    }
    state = CONTEXT.getSignalInfo(value).state;
  } else if (CONTEXT.refMap.has(value)) {
    const ref = CONTEXT.refMap.get(value);
    if (ref.protected) {
      return [ref.signal, null];
    }
    state = CONTEXT.getSignalInfo(value).state;
  } else {
    state = new State(value);
  }
  const { get, set } = state;
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
  signals = isWatchable(signals)
    ? [signals]
    : isArray(signals)
    ? signals.filter(isWatchable)
    : [];
  if (signals.length === 0) return TrackingScope.emptyWatchHandle;
  const invoke = (signal) =>
    isSignal(signal) ? signal() : CONTEXT.refMap.get(signal)?.signal();
  const effect = () => {
    const values = signals.map(invoke);
    cb(...values);
    if (once) scope.stop();
  };
  const scope = new WatchingScope(effect, { onTrack, onTrigger });
  scope.run(() => signals.forEach(invoke), {});
  scope.canTrack = (signal) => false;
  if (immediate) scope.runEffect({});
  return scope.exposeHanlde();
}

export function watchEffect(effect, { onTrack = null, onTrigger = null } = {}) {
  if (CONTEXT.getCurrentWatchingScope()) {
    throw new Error("cannot watch effect in effect");
  }
  if (isRunInSilentScope()) return TrackingScope.emptyWatchHandle;
  const scope = new WatchingScope(effect, {
    onTrack,
    onTrigger,
  });
  scope.runEffect({});
  return scope.exposeHanlde();
}

export function refSignal(target, signal) {
  if (CONTEXT.refMap.has(target)) return false;
  if (isSignal(target)) {
    console.warn("cannot ref signal to signals");
    return false;
  }
  if (!isNonNullObject(target) && !isFunction(target)) {
    throw new Error("cannot ref primitive-type-value to signals");
  }
  if (isSignal(signal)) {
    CONTEXT.refMap.set(target, {
      signal,
      protected: !!signal[ProtectedSignal],
    });
    return true;
  }
  return false;
}

export function protectedSignal(signal) {
  const [get, set] = useSignal(signal);
  get[ProtectedSignal] = true;
  return [get, set];
}

export function computedSignal(
  getter,
  { onTrack = null, onTrigger = null } = {}
) {
  if (CONTEXT.getCurrentWatchingScope()) {
    throw new Error("cannot define computed state in effect");
  }
  const { get, set, watchable, setterScopeSet } = new State(getter(), true);
  get[ProtectedSignal] = true;
  get[ComputedSignal] = true;
  if (watchable) {
    setterScopeSet.add(
      new WatchingScope(() => getter(), {
        onTrack,
        onTrigger,
        isSync: true,
        onResult: (result) => set(result),
      }).runEffect({})
    );
  }
  return get;
}
